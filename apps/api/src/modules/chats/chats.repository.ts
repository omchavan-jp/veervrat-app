import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatsRepository {
  constructor(private prisma: PrismaService) {}

  async createMessage(
    roomId: string,
    senderId: string,
    content: any,
    journeyId?: string,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        body: content,
        journeyId,
        seqNo: await this.getNextSeqNo(roomId),
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  private async getNextSeqNo(roomId: string): Promise<number> {
    const lastMessage = await this.prisma.chatMessage.findFirst({
      where: { roomId },
      orderBy: { seqNo: 'desc' },
    });
    return (lastMessage?.seqNo ?? 0) + 1;
  }

  async getMessagesByRoomAfterSeqNo(
    roomId: string,
    afterSeqNo: number,
    limit: number = 50,
  ) {
    return this.prisma.chatMessage.findMany({
      where: {
        roomId,
        seqNo: {
          gt: afterSeqNo,
        },
      },
      orderBy: { seqNo: 'asc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getLastMessageSeqNo(roomId: string): Promise<number> {
    const lastMessage = await this.prisma.chatMessage.findFirst({
      where: { roomId },
      orderBy: { seqNo: 'desc' },
    });
    return lastMessage?.seqNo ?? 0;
  }
}
