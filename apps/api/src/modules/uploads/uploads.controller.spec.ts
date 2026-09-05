import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { SessionGuard } from '../auth/guards/session.guard';
import type { SessionUser } from '../auth/types/auth.types';
import { Role } from '@prisma/client';

// Validation of the file itself — type, size, HEIC conversion, storage failure — lives in
// uploads.service.spec.ts and is not repeated here. What that file cannot cover is the
// controller's own contract: that these routes require a session at all, that each purpose
// reaches the right service call, and that the response is wrapped the way the client expects.
describe('UploadsController', () => {
  let controller: UploadsController;

  const mockService = {
    uploadChatImage: vi.fn(),
    uploadImage: vi.fn(),
  };

  const user: SessionUser = {
    id: 'user-1',
    email: 'user@test.com',
    username: 'someone',
    displayName: 'Someone',
    roles: [Role.VRATARTHI],
    avatarUrl: null,
    language: 'EN',
  } as SessionUser;

  const request = {
    fileBuffer: Buffer.from('not-really-an-image').toString('base64'),
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [{ provide: UploadsService, useValue: mockService }],
    })
      // Stubs the guard INSTANCE so the module builds without AuthService. The `__guards__`
      // metadata read by the authentication test lives on the controller class and is not
      // affected, so that test still asserts the real decorator is present.
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UploadsController>(UploadsController);
    mockService.uploadChatImage.mockResolvedValue({ url: '/api/v1/uploads/abc.jpg' });
    mockService.uploadImage.mockResolvedValue({ url: '/api/v1/uploads/def.jpg' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Authentication ──────────────────────────────────────────────────────────
  //
  // Task 4.6's "auth required" case. This cannot be an assertion about a 401, because the
  // controller never sees an unauthenticated request — the guard rejects it first. What is worth
  // asserting is that the guard is there: this application has no global authentication guard,
  // so a controller that loses its @UseGuards line becomes publicly writable and every existing
  // test still passes. Uploads write to object storage, which makes that the expensive case.
  describe('authentication', () => {
    it('AUTH REQUIRED: the controller declares SessionGuard', () => {
      const guards = Reflect.getMetadata('__guards__', UploadsController) as unknown[] | undefined;

      expect(guards, 'UploadsController has no guards at all').toBeDefined();
      expect(guards).toContain(SessionGuard);
    });

    // Control for the assertion above — the same lookup must come back empty for a class that
    // was never decorated, otherwise a metadata helper that always returned something would
    // make the test pass without measuring anything.
    it('control: the same lookup finds nothing on an undecorated class', () => {
      class Undecorated {}
      expect(Reflect.getMetadata('__guards__', Undecorated)).toBeUndefined();
    });
  });

  // ── Purpose routing ─────────────────────────────────────────────────────────
  //
  // Purpose is not cosmetic: it decides which storage container the file lands in, and only
  // `blog` goes to the anonymously-readable one. A chat image routed as a blog image would be
  // publicly readable, so each route is pinned to its own call.
  describe('purpose routing', () => {
    it('sends a chat upload to uploadChatImage', async () => {
      await controller.uploadChatImage(request, user);

      expect(mockService.uploadChatImage).toHaveBeenCalledWith(request, user);
      expect(mockService.uploadImage).not.toHaveBeenCalled();
    });

    it('sends an experience upload with the experience purpose', async () => {
      await controller.uploadExperienceImage(request, user);

      expect(mockService.uploadImage).toHaveBeenCalledWith(request, user, 'experience');
      expect(mockService.uploadChatImage).not.toHaveBeenCalled();
    });

    it('sends a blog upload with the blog purpose', async () => {
      await controller.uploadBlogImage(request, user);

      expect(mockService.uploadImage).toHaveBeenCalledWith(request, user, 'blog');
    });

    it('never routes a chat upload through the blog purpose', async () => {
      await controller.uploadChatImage(request, user);

      const blogCalls = mockService.uploadImage.mock.calls.filter(([, , p]) => p === 'blog');
      expect(blogCalls).toHaveLength(0);
    });
  });

  // ── Response shape ──────────────────────────────────────────────────────────
  describe('response shape', () => {
    it('wraps the result in a data envelope the client can read', async () => {
      const res = await controller.uploadChatImage(request, user);
      expect(res).toEqual({ data: { url: '/api/v1/uploads/abc.jpg' } });
    });

    it('propagates a service rejection rather than swallowing it', async () => {
      const boom = new Error('storage unavailable');
      mockService.uploadChatImage.mockRejectedValue(boom);

      await expect(controller.uploadChatImage(request, user)).rejects.toThrow(boom);
    });
  });
});
