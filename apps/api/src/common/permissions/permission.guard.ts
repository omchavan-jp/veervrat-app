import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { Request } from 'express';
import { SessionUser } from '../../modules/auth/types/auth.types';
import {
  AccessDeniedException,
  SessionExpiredException,
} from '../exceptions/app.exceptions';
import { hasPermission } from './has-permission';
import { PermissionResource } from './types';
import { PERMISSION_KEY, PermissionMetadata } from './require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<PermissionMetadata | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      throw new AccessDeniedException('Route must be decorated with @RequirePermission');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as SessionUser | undefined;

    if (!user) {
      throw new SessionExpiredException();
    }

    let resource: PermissionResource;
    if (metadata.resolver) {
      resource = await metadata.resolver(request, this.moduleRef);
    } else {
      resource = { type: 'platform' };
    }

    const allowed = hasPermission(user, resource, metadata.action);

    if (!allowed) {
      this.logger.warn({
        msg: 'permission denied',
        userId: user.id,
        action: metadata.action,
        resourceType: resource.type,
      });
      throw new AccessDeniedException();
    }

    return true;
  }
}
