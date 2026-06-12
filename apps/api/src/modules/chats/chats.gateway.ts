import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatsService } from './chats.service';
import { AuthService } from '../auth/auth.service';
import { VmRelationshipsRepository } from '../vm-relationships/vm-relationships.repository';
import type { SessionUser } from '../auth/types/auth.types';

interface AuthenticatedSocket extends Socket {
  user?: SessionUser;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class ChatsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatsGateway');

  constructor(
    private chatsService: ChatsService,
    private authService: AuthService,
    private vmRelationshipsRepository: VmRelationshipsRepository,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const user = await this.authenticateSocket(socket);
      socket.user = user;

      const roomIds = await this.deriveRoomIds(user.id);
      roomIds.forEach((room) => socket.join(room));
      socket.join(`notifications:${user.id}`);

      this.logger.log(
        `User ${user.id} connected and joined ${roomIds.length} chat rooms`,
      );
    } catch (err) {
      this.logger.warn(`Connection auth failed: ${err.message}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.user) {
      this.logger.log(`User ${socket.user.id} disconnected`);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    socket: AuthenticatedSocket,
    data: {
      type: string;
      roomId: string;
      content: unknown;
      tempId: string;
    },
  ) {
    if (!socket.user) {
      socket.emit('error', {
        type: 'error',
        tempId: data.tempId,
        message: 'Unauthorized',
      });
      return;
    }

    if (data.type !== 'message') {
      socket.emit('error', {
        type: 'error',
        tempId: data.tempId,
        message: 'Invalid message type',
      });
      return;
    }

    try {
      const message = await this.chatsService.sendMessage(
        data.roomId,
        socket.user,
        data.content,
      );

      // Broadcast to the OTHER sockets in the room — the sender reconciles its own
      // optimistic message via the `ack` below, so echoing back to it would surface
      // the message twice. `socket.to` excludes only the sending socket, so the
      // sender's other tabs/devices still receive the broadcast.
      socket.to(data.roomId).emit('message', {
        type: 'message',
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        sender: message.sender,
        content: message.body,
        createdAt: message.createdAt.toISOString(),
        seqNo: message.seqNo,
      });

      socket.emit('ack', {
        type: 'ack',
        tempId: data.tempId,
        id: message.id,
        seqNo: message.seqNo,
      });
    } catch (err) {
      this.logger.warn(`Message send failed: ${err.message}`);
      socket.emit('error', {
        type: 'error',
        tempId: data.tempId,
        message: err.message || 'Failed to send message',
      });
    }
  }

  private async authenticateSocket(
    socket: AuthenticatedSocket,
  ): Promise<SessionUser> {
    const cookies = socket.handshake.headers.cookie || '';
    const sessionToken = this.extractSessionCookie(cookies);

    if (!sessionToken) {
      throw new Error('No session cookie found');
    }

    const user = await this.authService.validateSession(sessionToken);
    if (!user) {
      throw new Error('Invalid or expired session');
    }

    return user;
  }

  private extractSessionCookie(cookieString: string): string | null {
    const cookieName = this.configService.get<string>(
      'SESSION_COOKIE_NAME',
      'veervrat_session',
    );
    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === cookieName) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  private async deriveRoomIds(userId: string): Promise<string[]> {
    const vms = await this.vmRelationshipsRepository.getMyVms(userId);
    const roomIds = new Set<string>();

    vms.forEach((vm) => {
      const roomId = this.chatsService.deriveRoomId(userId, vm.id);
      roomIds.add(roomId);
    });

    return Array.from(roomIds);
  }
}

