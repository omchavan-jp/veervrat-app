import { Controller, Get, Param, Res, UseGuards, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { UploadsResolverService } from './uploads-resolver.service';

/**
 * Serves an uploaded image, deciding per request whether the caller may see it (#178).
 *
 * A separate controller from `UploadsController` for one reason: that one carries a class-level
 * `SessionGuard`, and this route must be reachable without a session. Public experience logs and
 * the public pool are readable by guests (`OptionalSessionGuard` on both), so an image inside a
 * published log has to be too — a blanket "must be signed in" rule here would break published
 * content for exactly the audience it was published for.
 *
 * Guest-reachable is not the same as unguarded. Whether any particular image is served is
 * decided by the document that contains it, in the service below.
 */
@Controller('uploads')
export class UploadsResolverController {
  constructor(private readonly resolver: UploadsResolverService) {}

  @Get(':key')
  @UseGuards(OptionalSessionGuard)
  async serve(
    @Param('key') key: string,
    @CurrentUser() user: SessionUser | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.resolver.resolve(key, user);

    // Blog images live in the public container and are already world-readable. Redirecting to
    // the storage URL keeps them cacheable, which is the entire reason they are public — proxying
    // them through here would spend API bandwidth to hide nothing.
    if (result.kind === 'redirect') {
      res.redirect(302, result.url);
      return;
    }

    // Private images are streamed rather than handed out as a signed URL. A signed URL is a
    // bearer credential for its lifetime: anyone it reaches can use it until it expires, and it
    // cannot be withdrawn. Streaming means access is re-decided on every single request, so
    // removing an image from a log, or making the log private again, takes effect immediately.
    //
    // The cost is API bandwidth. That is a deliberate trade at this scale, and the shape to
    // revisit first if private image traffic ever becomes significant — the switch back to a
    // redirect is this one branch.
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.body.byteLength);
    // `private` so shared caches never hold it, and a short max-age so a browser re-asks often
    // enough that revocation is not theoretical while still not refetching on every scroll.
    res.setHeader('Cache-Control', 'private, max-age=60');
    // Never inline-render an upload as a document: a file whose bytes are not what its type
    // claims cannot then execute in this origin.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.end(result.body);
  }
}

// Re-exported so the module can register a single not-found shape for both "no such key" and
// "not allowed", which must be indistinguishable — see the service.
export { NotFoundException };
