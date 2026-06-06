// WebSocket Gateway — Socket.IO integration
// NOTE: This file requires '@nestjs/websockets' and 'socket.io' packages
// which must be installed separately. See documentation/Platform-Engineering-Standard.md
// for the full WebSocket contract.

import { Injectable, Logger } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { AuthService } from '../auth/auth.service';
import type { SessionUser } from '../auth/types/auth.types';

@Injectable()
export class ChatsGateway {
  private logger = new Logger('ChatsGateway');

  constructor(
    private chatsService: ChatsService,
    private authService: AuthService,
  ) {
    this.logger.warn(
      'ChatsGateway requires socket.io and @nestjs/websockets packages. ' +
      'Install with: pnpm add @nestjs/websockets socket.io',
    );
  }

  // NOTE: Full implementation requires:
  // 1. Middleware to validate session cookies on handshake
  // 2. Auto-join user to all chat rooms on connect
  // 3. Message handler to persist and broadcast to room
  // 4. ACK handler for optimistic UI
  // See design.md for full contract
}

