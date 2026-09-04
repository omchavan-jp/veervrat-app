import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { SessionGuard } from '../auth/guards/session.guard';
import type { SessionUser } from '../auth/types/auth.types';
import { Role } from '@prisma/client';

// The controller's own job is narrow — parse the query, cap the page, shape the response — and
// authorisation happens a layer down in ChatsService (covered in chats.service.spec.ts). These
// tests cover the part the service cannot: what happens to the parameters on the way in, and
// that the route is not reachable without a session.
describe('ChatsController', () => {
  let controller: ChatsController;

  const mockService = {
    getMessages: vi.fn(),
  };

  const user: SessionUser = {
    id: 'va-1',
    email: 'va@test.com',
    username: 'va_user',
    displayName: 'VA User',
    roles: [Role.VRATARTHI],
    avatarUrl: null,
    language: 'EN',
  } as SessionUser;

  const room = 'chat:va-1:vm-1';

  const message = (seqNo: number) => ({
    id: `msg-${seqNo}`,
    roomId: room,
    senderId: user.id,
    sender: { id: user.id, username: user.username },
    body: { type: 'doc', content: [] },
    seqNo,
    createdAt: new Date('2026-09-05T10:00:00Z'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [{ provide: ChatsService, useValue: mockService }],
    })
      // The guard is stubbed so the module can be built without dragging in AuthService and the
      // whole session machinery. This replaces the guard INSTANCE only — the `__guards__`
      // metadata the test below reads sits on the controller class and is untouched, so that
      // assertion still measures the real decorator rather than this stub.
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatsController>(ChatsController);
    mockService.getMessages.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── The guard ───────────────────────────────────────────────────────────────
  //
  // There is no global authentication guard in this application: a controller without
  // @UseGuards(SessionGuard) is reachable by anyone, and nothing fails to tell you so. This
  // asserts the guard is present rather than trusting that nobody removes it.
  describe('authentication', () => {
    it('AUTH REQUIRED: the controller declares SessionGuard', () => {
      const guards = Reflect.getMetadata('__guards__', ChatsController) as unknown[] | undefined;

      expect(guards, 'ChatsController has no guards at all').toBeDefined();
      expect(guards).toContain(SessionGuard);
    });

    // A control for the assertion above: the same lookup against a class that was never
    // decorated must come back empty. Without this, a getMetadata that silently returned
    // undefined for everything would make the test above pass for the wrong reason.
    it('control: the same lookup finds nothing on an undecorated class', () => {
      class Undecorated {}
      expect(Reflect.getMetadata('__guards__', Undecorated)).toBeUndefined();
    });
  });

  // ── Query parsing ───────────────────────────────────────────────────────────
  describe('getMessages query handling', () => {
    it('defaults to after=-1 and limit=50 when neither is supplied', async () => {
      await controller.getMessages(room, undefined, undefined, user);
      expect(mockService.getMessages).toHaveBeenCalledWith(room, user, -1, 50);
    });

    it('passes through an explicit cursor and page size', async () => {
      await controller.getMessages(room, '12', '25', user);
      expect(mockService.getMessages).toHaveBeenCalledWith(room, user, 12, 25);
    });

    // The cap is the point: an unbounded limit lets one request pull an entire conversation
    // into memory, and the client chooses the number.
    it('caps the page size at 200 however large the request asks for', async () => {
      await controller.getMessages(room, '0', '100000', user);
      expect(mockService.getMessages).toHaveBeenCalledWith(room, user, 0, 200);
    });

    it('allows a page size just under the cap unchanged', async () => {
      await controller.getMessages(room, '0', '199', user);
      expect(mockService.getMessages).toHaveBeenCalledWith(room, user, 0, 199);
    });

    it.each([
      ['after', 'abc', undefined],
      ['limit', undefined, 'abc'],
    ])('rejects a non-numeric %s with 400', async (_label, after, limit) => {
      await expect(controller.getMessages(room, after, limit, user)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.getMessages).not.toHaveBeenCalled();
    });
  });

  // ── Response shape ──────────────────────────────────────────────────────────
  //
  // The web client reads `content` and an ISO `createdAt`; the database column is `body` and a
  // Date. That translation lives here, so a rename in the schema would break the client
  // silently without this.
  describe('response shape', () => {
    it('renames body to content and serialises createdAt as an ISO string', async () => {
      mockService.getMessages.mockResolvedValue([message(1)]);

      const res = await controller.getMessages(room, undefined, undefined, user);

      expect(res.data).toHaveLength(1);
      expect(res.data[0]).toMatchObject({
        id: 'msg-1',
        roomId: room,
        senderId: user.id,
        seqNo: 1,
        content: { type: 'doc', content: [] },
        createdAt: '2026-09-05T10:00:00.000Z',
      });
      expect(res.data[0]).not.toHaveProperty('body');
    });

    it('returns an empty list rather than null when the room has no messages', async () => {
      const res = await controller.getMessages(room, undefined, undefined, user);
      expect(res.data).toEqual([]);
    });

    it('preserves the order the service returned', async () => {
      mockService.getMessages.mockResolvedValue([message(1), message(2), message(3)]);
      const res = await controller.getMessages(room, undefined, undefined, user);
      expect(res.data.map((m) => m.seqNo)).toEqual([1, 2, 3]);
    });
  });
});
