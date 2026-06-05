import { Injectable } from '@nestjs/common';
import { InvitationStatus, InvitationType, NotificationEventType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createElement } from 'react';
import { InvitationsRepository } from './invitations.repository';
import { VmRelationshipsService } from '../vm-relationships/vm-relationships.service';
import { UsersService } from '../users/users.service';
import { JourneysRepository } from '../journeys/journeys.repository';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  EntityNotFoundException,
  AccessDeniedException,
  InvitationExpiredException,
  InvitationNotPendingException,
  InvitationNotCancellableException,
  PendingGlobalVmInviteException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';
import { isVa } from '../../common/permissions/types';
import { SendInvitationDto } from './dto/send-invitation.dto';
import { VmInvitationEmail, getSubject as getVmInviteSubject } from '../email/templates/VmInvitationEmail';
import { VmInvitationDeclinedEmail, getSubject as getDeclinedSubject } from '../email/templates/VmInvitationDeclinedEmail';

@Injectable()
export class InvitationsService {
  private readonly frontendUrl: string;

  constructor(
    private readonly invitationsRepository: InvitationsRepository,
    private readonly vmRelationshipsService: VmRelationshipsService,
    private readonly usersService: UsersService,
    private readonly journeysRepository: JourneysRepository,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  async sendVmInvitation(user: SessionUser, dto: SendInvitationDto) {
    if (!hasPermission(user, { type: 'platform' }, 'vm_invitation.send')) {
      throw new AccessDeniedException();
    }

    if (dto.type === InvitationType.VM_GLOBAL) {
      const existing = await this.invitationsRepository.findPendingGlobalVmByInviter(user.id);
      if (existing) throw new PendingGlobalVmInviteException();
    }

    if (dto.type === InvitationType.VM_JOURNEY) {
      if (!dto.scopeId) throw new AccessDeniedException();
      const journey = await this.journeysRepository.findById(dto.scopeId);
      if (!journey || journey.vratarthiId !== user.id) {
        throw new AccessDeniedException();
      }
    }

    const invitee = await this.usersService.findByEmail(dto.inviteeEmail);

    const invitation = await this.invitationsRepository.create({
      inviterId: user.id,
      inviteeEmail: dto.inviteeEmail,
      inviteeId: invitee?.id ?? null,
      type: dto.type,
      scopeId: dto.scopeId ?? null,
    });

    const acceptUrl = `${this.frontendUrl}/invitations/${invitation.token}/accept`;
    const lang = (invitee?.language ?? 'EN') as 'EN' | 'MR';
    const { html, text } = await this.emailService.renderTemplate(
      createElement(VmInvitationEmail, {
        vaDisplayName: user.displayName,
        scope: dto.type === InvitationType.VM_GLOBAL ? 'global' : 'journey',
        acceptUrl,
        language: lang,
      }),
    );
    this.emailService.sendNotification(dto.inviteeEmail, getVmInviteSubject(lang), html, text);

    if (invitee) {
      void this.notificationsService.create(
        invitee.id,
        user.id,
        NotificationEventType.VM_INVITATION_RECEIVED,
        'invitation',
        invitation.id,
      );
    }

    return invitation;
  }

  async acceptInvitation(user: SessionUser, token: string) {
    const invitation = await this.invitationsRepository.findByToken(token);
    if (!invitation) throw new EntityNotFoundException('Invitation', token);

    if (!hasPermission(user, { type: 'invitation', invitation: { inviterId: invitation.inviterId, inviteeId: invitation.inviteeId } }, 'vm_invitation.accept')) {
      throw new AccessDeniedException();
    }

    if (invitation.expiresAt < new Date()) throw new InvitationExpiredException();
    if (invitation.status !== InvitationStatus.PENDING) throw new InvitationNotPendingException();

    const now = new Date();

    // Mark ACCEPTED first — if the relationship creation fails, the invitation can be retried by resetting to PENDING.
    // Inverse order risks a dangling ACTIVE relationship with a PENDING invitation and no duplicate constraint to catch retries.
    const accepted = await this.invitationsRepository.updateStatus(invitation.id, InvitationStatus.ACCEPTED, { acceptedAt: now });

    if (invitation.type === InvitationType.VM_GLOBAL) {
      await this.vmRelationshipsService.createFromGlobalInvite(invitation.inviterId, user.id, now);
    } else if (invitation.type === InvitationType.VM_JOURNEY && invitation.scopeId) {
      await this.vmRelationshipsService.createFromJourneyInvite(invitation.scopeId, user.id, now);
    }

    void this.notificationsService.create(
      invitation.inviterId,
      user.id,
      NotificationEventType.VM_INVITATION_ACCEPTED,
      'invitation',
      invitation.id,
    );

    return accepted;
  }

  async declineInvitation(user: SessionUser, token: string) {
    const invitation = await this.invitationsRepository.findByToken(token);
    if (!invitation) throw new EntityNotFoundException('Invitation', token);

    if (!hasPermission(user, { type: 'invitation', invitation: { inviterId: invitation.inviterId, inviteeId: invitation.inviteeId } }, 'vm_invitation.decline')) {
      throw new AccessDeniedException();
    }

    if (invitation.status !== InvitationStatus.PENDING) throw new InvitationNotPendingException();

    const updated = await this.invitationsRepository.updateStatus(invitation.id, InvitationStatus.DECLINED);

    const inviter = await this.usersService.findById(invitation.inviterId);
    if (inviter) {
      const lang = inviter.language as 'EN' | 'MR';
      const { html, text } = await this.emailService.renderTemplate(
        createElement(VmInvitationDeclinedEmail, { vaDisplayName: inviter.displayName, language: lang }),
      );
      this.emailService.sendNotification(inviter.email, getDeclinedSubject(lang), html, text);
    }

    void this.notificationsService.create(
      invitation.inviterId,
      user.id,
      NotificationEventType.VM_INVITATION_DECLINED,
      'invitation',
      invitation.id,
    );

    return updated;
  }

  async cancelInvitation(user: SessionUser, id: string) {
    const invitation = await this.invitationsRepository.findById(id);
    if (!invitation) throw new EntityNotFoundException('Invitation', id);

    if (!hasPermission(user, { type: 'invitation', invitation: { inviterId: invitation.inviterId, inviteeId: invitation.inviteeId } }, 'vm_invitation.cancel')) {
      throw new AccessDeniedException();
    }

    if (invitation.status !== InvitationStatus.PENDING) throw new InvitationNotCancellableException();

    return this.invitationsRepository.updateStatus(invitation.id, InvitationStatus.CANCELLED);
  }

  async listInvitations(user: SessionUser) {
    return this.invitationsRepository.listByInviter(user.id);
  }
}
