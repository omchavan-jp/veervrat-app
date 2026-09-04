import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsRepository } from './chats.repository';
import { VmRelationshipsRepository } from '../vm-relationships/vm-relationships.repository';
import type { SessionUser } from '../auth/types/auth.types';
import { Role } from '@prisma/client';

function makeDoc(text: string) {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

describe('ChatsService', () => {
  let service: ChatsService;

  const mockRepository = {
    createMessage: vi.fn(),
    getMessagesByRoomAfterSeqNo: vi.fn(),
    getLastMessageSeqNo: vi.fn(),
  };

  const mockVmRepository = {
    hasActiveRelationshipBetween: vi.fn(),
  };

  const mockVaUser: SessionUser = {
    id: 'va-1',
    email: 'va@test.com',
    username: 'va_user',
    displayName: 'VA User',
    roles: [Role.VRATARTHI],
    avatarUrl: null,
    language: 'EN',
  } as SessionUser;

  const mockVmUser: SessionUser = {
    id: 'vm-1',
    email: 'vm@test.com',
    username: 'vm_user',
    displayName: 'VM User',
    roles: [Role.VRATMITRA],
    avatarUrl: null,
    language: 'EN',
  } as SessionUser;

  const mockRoom = `chat:${[mockVaUser.id, mockVmUser.id].sort().join(':')}`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: ChatsRepository, useValue: mockRepository },
        { provide: VmRelationshipsRepository, useValue: mockVmRepository },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
    // Default: an active relationship exists between the two participants.
    mockVmRepository.hasActiveRelationshipBetween.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('AUTH MATRIX POSITIVE: sends when participant has a verified relationship', async () => {
      const content = makeDoc('Hello');
      const message = {
        id: 'msg-1',
        roomId: mockRoom,
        senderId: mockVaUser.id,
        body: content,
        seqNo: 1,
        createdAt: new Date(),
      };
      mockRepository.createMessage.mockResolvedValue(message);

      const result = await service.sendMessage(mockRoom, mockVaUser, content);

      expect(result).toEqual(message);
      expect(mockVmRepository.hasActiveRelationshipBetween).toHaveBeenCalledWith(
        mockVaUser.id,
        mockVmUser.id,
      );
      expect(mockRepository.createMessage).toHaveBeenCalledWith(
        mockRoom,
        mockVaUser.id,
        content, // sanitized doc round-trips for a clean payload
        undefined,
      );
    });

    // The vratmitra half of the matrix. Every test above this one uses the VA as the actor and
    // the VM only to derive the room id, so a regression that admitted one side and refused the
    // other would have passed. Chat is symmetric by design — both participants send.
    it('AUTH MATRIX POSITIVE: the vratmitra sends in the same room', async () => {
      const content = makeDoc('From the vratmitra');
      mockRepository.createMessage.mockResolvedValue({
        id: 'msg-2',
        roomId: mockRoom,
        senderId: mockVmUser.id,
        body: content,
        seqNo: 2,
        createdAt: new Date(),
      });

      const result = await service.sendMessage(mockRoom, mockVmUser, content);

      expect(result.senderId).toBe(mockVmUser.id);
      // Same pair, whichever way round — the relationship check is not direction-sensitive.
      expect(mockVmRepository.hasActiveRelationshipBetween).toHaveBeenCalledWith(
        mockVmUser.id,
        mockVaUser.id,
      );
    });

    it('AUTH MATRIX NEGATIVE: rejects a participant with NO verified relationship (forged room)', async () => {
      mockVmRepository.hasActiveRelationshipBetween.mockResolvedValue(false);
      await expect(service.sendMessage(mockRoom, mockVaUser, makeDoc('hi'))).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRepository.createMessage).not.toHaveBeenCalled();
    });

    // The attack the room-id format invites: a client can name any room it likes, so the
    // relationship must be checked against the OTHER id in the string, not merely that the
    // caller appears in it. Here the outsider forges a room containing themselves and a victim.
    it('AUTH MATRIX NEGATIVE: a forged room naming the caller and a stranger is refused', async () => {
      const attacker: SessionUser = { ...mockVaUser, id: 'attacker-1' };
      const forged = `chat:${['attacker-1', 'victim-1'].sort().join(':')}`;
      mockVmRepository.hasActiveRelationshipBetween.mockResolvedValue(false);

      await expect(service.sendMessage(forged, attacker, makeDoc('hi'))).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRepository.createMessage).not.toHaveBeenCalled();
    });

    it('rejects a non-participant even when relationship lookup would pass', async () => {
      const outsider: SessionUser = { ...mockVaUser, id: 'outsider-9' };
      await expect(service.sendMessage(mockRoom, outsider, makeDoc('hi'))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects content that is not a Tiptap doc', async () => {
      await expect(
        service.sendMessage(mockRoom, mockVaUser, { type: 'paragraph' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('strips disallowed nodes/marks before persisting', async () => {
      mockRepository.createMessage.mockImplementation((_room, _sender, content) => ({
        body: content,
      }));
      const dirty = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'ok', marks: [{ type: 'bold' }, { type: 'evil' }] }],
          },
          { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
        ],
      };
      await service.sendMessage(mockRoom, mockVaUser, dirty);
      const stored = mockRepository.createMessage.mock.calls[0][2];
      expect(stored.content).toHaveLength(1); // script node dropped
      expect(stored.content[0].content[0].marks).toEqual([{ type: 'bold' }]); // evil mark dropped
    });
  });

  describe('getMessages', () => {
    it('AUTH MATRIX POSITIVE: retrieves when participant has a verified relationship', async () => {
      const messages = [
        { id: 'msg-1', roomId: mockRoom, body: {}, seqNo: 1, createdAt: new Date() },
      ];
      mockRepository.getMessagesByRoomAfterSeqNo.mockResolvedValue(messages);

      const result = await service.getMessages(mockRoom, mockVaUser, 0, 50);

      expect(result).toEqual(messages);
      expect(mockRepository.getMessagesByRoomAfterSeqNo).toHaveBeenCalledWith(mockRoom, 0, 50);
    });

    it('AUTH MATRIX POSITIVE: the vratmitra reads the same room', async () => {
      const messages = [
        { id: 'msg-1', roomId: mockRoom, body: {}, seqNo: 1, createdAt: new Date() },
      ];
      mockRepository.getMessagesByRoomAfterSeqNo.mockResolvedValue(messages);

      const result = await service.getMessages(mockRoom, mockVmUser, 0, 50);

      expect(result).toEqual(messages);
    });

    it('AUTH MATRIX NEGATIVE: rejects participant with no verified relationship', async () => {
      mockVmRepository.hasActiveRelationshipBetween.mockResolvedValue(false);
      await expect(service.getMessages(mockRoom, mockVaUser, 0, 50)).rejects.toThrow(
        ForbiddenException,
      );
    });

    // Reading someone else's conversation is the worse half of the failure: a refusal to send
    // is visible, a leaked read is not.
    it('AUTH MATRIX NEGATIVE: a stranger cannot read a room they are absent from', async () => {
      const stranger: SessionUser = { ...mockVmUser, id: 'stranger-7' };
      await expect(service.getMessages(mockRoom, stranger, 0, 50)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRepository.getMessagesByRoomAfterSeqNo).not.toHaveBeenCalled();
    });

    it('rejects a non-participant', async () => {
      const outsider: SessionUser = { ...mockVaUser, id: 'other-user' };
      await expect(service.getMessages(mockRoom, outsider, 0, 50)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deriveRoomId', () => {
    it('should create deterministic room ID from sorted user IDs', () => {
      const room1 = service.deriveRoomId('user-a', 'user-b');
      const room2 = service.deriveRoomId('user-b', 'user-a');

      expect(room1).toBe(room2);
      expect(room1).toMatch(/^chat:[^:]+:[^:]+$/);
    });
  });
});
