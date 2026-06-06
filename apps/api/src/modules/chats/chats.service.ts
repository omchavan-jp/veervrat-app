import { Injectable, ForbiddenException } from '@nestjs/common';
import { ChatsRepository } from './chats.repository';
import { CreateMessageDto } from './dto/create-message.dto';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';

@Injectable()
export class ChatsService {
  constructor(private chatsRepository: ChatsRepository) {}

  async sendMessage(
    roomId: string,
    user: SessionUser,
    content: any,
    journeyId?: string,
  ) {
    if (!hasPermission(user, { type: 'room', id: roomId }, 'chat.send')) {
      throw new ForbiddenException(
        'You do not have permission to send messages in this chat',
      );
    }

    return this.chatsRepository.createMessage(
      roomId,
      user.id,
      content,
      journeyId,
    );
  }

  async getMessages(
    roomId: string,
    user: SessionUser,
    afterSeqNo: number,
    limit: number = 50,
  ) {
    if (!hasPermission(user, { type: 'room', id: roomId }, 'chat.view')) {
      throw new ForbiddenException(
        'You do not have permission to view this chat',
      );
    }

    return this.chatsRepository.getMessagesByRoomAfterSeqNo(
      roomId,
      afterSeqNo,
      Math.min(limit, 200),
    );
  }

  async getLastMessageSeqNo(roomId: string, user: SessionUser): Promise<number> {
    if (!hasPermission(user, { type: 'room', id: roomId }, 'chat.view')) {
      throw new ForbiddenException(
        'You do not have permission to view this chat',
      );
    }

    return this.chatsRepository.getLastMessageSeqNo(roomId);
  }

  deriveRoomId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `chat:${sorted[0]}:${sorted[1]}`;
  }
}
