import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ChatsRepository } from './chats.repository';
import { VmRelationshipsRepository } from '../vm-relationships/vm-relationships.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import {
  sanitizeChatContent,
  InvalidChatContentError,
  type TiptapDoc,
} from './tiptap-content';

@Injectable()
export class ChatsService {
  constructor(
    private chatsRepository: ChatsRepository,
    private vmRelationshipsRepository: VmRelationshipsRepository,
  ) {}

  async sendMessage(
    roomId: string,
    user: SessionUser,
    content: unknown,
    journeyId?: string,
  ) {
    await this.authorizeRoom(roomId, user, 'chat.send');

    let sanitized: TiptapDoc;
    try {
      sanitized = sanitizeChatContent(content);
    } catch (err) {
      if (err instanceof InvalidChatContentError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    return this.chatsRepository.createMessage(roomId, user.id, sanitized, journeyId);
  }

  async getMessages(
    roomId: string,
    user: SessionUser,
    afterSeqNo: number,
    limit: number = 50,
  ) {
    await this.authorizeRoom(roomId, user, 'chat.view');

    return this.chatsRepository.getMessagesByRoomAfterSeqNo(
      roomId,
      afterSeqNo,
      Math.min(limit, 200),
    );
  }

  async getLastMessageSeqNo(roomId: string, user: SessionUser): Promise<number> {
    await this.authorizeRoom(roomId, user, 'chat.view');

    return this.chatsRepository.getLastMessageSeqNo(roomId);
  }

  // Authorizes a room action by (1) confirming the caller is one of the two room
  // participants and (2) verifying — against the DB — that an active VM relationship
  // exists between the two participants. The room string alone is never trusted.
  private async authorizeRoom(
    roomId: string,
    user: SessionUser,
    action: 'chat.view' | 'chat.send',
  ): Promise<void> {
    const otherId = this.otherParticipant(roomId, user.id);
    const relationshipVerified =
      otherId !== null &&
      (await this.vmRelationshipsRepository.hasActiveRelationshipBetween(user.id, otherId));

    if (!hasPermission(user, { type: 'room', id: roomId, relationshipVerified }, action)) {
      throw new ForbiddenException(
        action === 'chat.send'
          ? 'You do not have permission to send messages in this chat'
          : 'You do not have permission to view this chat',
      );
    }
  }

  // Returns the other participant id from a `chat:<a>:<b>` room string, or null if the
  // caller is not one of the two ids (or the string is malformed).
  private otherParticipant(roomId: string, userId: string): string | null {
    const parts = roomId.split(':');
    if (parts.length !== 3 || parts[0] !== 'chat') return null;
    const [, a, b] = parts;
    if (userId === a) return b;
    if (userId === b) return a;
    return null;
  }

  deriveRoomId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `chat:${sorted[0]}:${sorted[1]}`;
  }
}
