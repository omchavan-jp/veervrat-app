import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { ModuleRef } from '@nestjs/core';
import { PermissionAction, PermissionResource } from './types';

export const PERMISSION_KEY = 'permission';

export type PermissionResolver = (
  req: Request,
  moduleRef: ModuleRef,
) => Promise<PermissionResource> | PermissionResource;

export type PermissionMetadata = {
  action: PermissionAction;
  resolver?: PermissionResolver;
};

export const RequirePermission = (
  action: PermissionAction,
  resolver?: PermissionResolver,
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, PermissionMetadata>(PERMISSION_KEY, { action, resolver });
