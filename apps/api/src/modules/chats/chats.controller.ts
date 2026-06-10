import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('chats')
@UseGuards(SessionGuard)
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get(':roomId/messages')
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('after') after?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: SessionUser,
  ) {
    const afterSeqNo = after ? parseInt(after, 10) : -1;
    const pageLimit = limit ? Math.min(parseInt(limit, 10), 200) : 50;

    if (isNaN(afterSeqNo) || isNaN(pageLimit)) {
      throw new BadRequestException('Invalid query parameters');
    }

    const messages = await this.chatsService.getMessages(
      roomId,
      user!,
      afterSeqNo,
      pageLimit,
    );

    return {
      data: messages.map((msg) => ({
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        sender: msg.sender,
        content: msg.body,
        createdAt: msg.createdAt.toISOString(),
        seqNo: msg.seqNo,
      })),
    };
  }
}
