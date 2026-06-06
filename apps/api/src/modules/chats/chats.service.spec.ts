import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsRepository } from './chats.repository';
import type { SessionUser } from '../auth/types/auth.types';
import { Role } from '@prisma/client';

describe('ChatsService', () => {
  let service: ChatsService;
  let repository: ChatsRepository;

  const mockRepository = {
    createMessage: vi.fn(),
    getMessagesByRoomAfterSeqNo: vi.fn(),
    getLastMessageSeqNo: vi.fn(),
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

  const mockRoom = service?.deriveRoomId(mockVaUser.id, mockVmUser.id) || 'chat:va-1:vm-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: ChatsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
    repository = module.get<ChatsRepository>(ChatsRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send message when user is room participant', async () => {
      const content = { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] };
      const message = {
        id: 'msg-1',
        roomId: mockRoom,
        senderId: mockVaUser.id,
        sender: {
          id: mockVaUser.id,
          displayName: mockVaUser.displayName,
          username: mockVaUser.username,
          avatarUrl: mockVaUser.avatarUrl,
        },
        body: content,
        seqNo: 1,
        createdAt: new Date(),
      };

      mockRepository.createMessage.mockResolvedValue(message);

      const result = await service.sendMessage(mockRoom, mockVaUser, content);

      expect(result).toEqual(message);
      expect(mockRepository.createMessage).toHaveBeenCalledWith(
        mockRoom,
        mockVaUser.id,
        content,
        undefined,
      );
    });

    it('should reject message from non-participant', async () => {
      const otherUser: SessionUser = {
        ...mockVaUser,
        id: 'other-user',
      };
      const content = { type: 'paragraph' };

      await expect(
        service.sendMessage(mockRoom, otherUser, content),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages when user is room participant', async () => {
      const messages = [
        {
          id: 'msg-1',
          roomId: mockRoom,
          senderId: mockVaUser.id,
          sender: {
            id: mockVaUser.id,
            displayName: mockVaUser.displayName,
            username: mockVaUser.username,
            avatarUrl: mockVaUser.avatarUrl,
          },
          body: {},
          seqNo: 1,
          createdAt: new Date(),
        },
      ];

      mockRepository.getMessagesByRoomAfterSeqNo.mockResolvedValue(messages);

      const result = await service.getMessages(mockRoom, mockVaUser, 0, 50);

      expect(result).toEqual(messages);
      expect(mockRepository.getMessagesByRoomAfterSeqNo).toHaveBeenCalledWith(
        mockRoom,
        0,
        50,
      );
    });

    it('should reject access from non-participant', async () => {
      const otherUser: SessionUser = {
        ...mockVaUser,
        id: 'other-user',
      };

      await expect(
        service.getMessages(mockRoom, otherUser, 0, 50),
      ).rejects.toThrow(ForbiddenException);
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
