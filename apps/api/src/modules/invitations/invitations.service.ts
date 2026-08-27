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
  InvitationReminderAlreadySentException,
  PendingGlobalVmInviteException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';
import { SendInvitationDto } from './dto/send-invitation.dto';
import {
  VmInvitationEmail,
  getSubject as getVmInviteSubject,
} from '../email/templates/VmInvitationEmail';
import {
  VmInvitationDeclinedEmail,
  getSubject as getDeclinedSubject,
} from '../email/templates/VmInvitationDeclinedEmail';
import {
  PlatformInvitationEmail,
  getSubject as getPlatformInviteSubject,
} from '../email/templates/PlatformInvitationEmail';

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
    // Platform invites: any authenticated user (spec/13). VM invites: VA-only.
    if (
      dto.type !== InvitationType.PLATFORM &&
      !hasPermission(user, { type: 'platform' }, 'vm_invitation.send')
    ) {
      throw new AccessDeniedException();
    }

    // inviteeUsername only comes from the search-select flow (an existing platform user).
    // PLATFORM invites are a signup link for someone NOT yet registered — combining the
    // two silently created an invite with no in-app notification and no VM relationship
    // on accept, since neither path treats PLATFORM as a VM invitation. Reject it outright
    // rather than accept a combination that can never do what the caller intended.
    if (dto.type === InvitationType.PLATFORM && dto.inviteeUsername) {
      throw new ValidationException(
        'Platform invites are for people not yet on Veervrat — invite an existing user as a vratmitra instead.',
      );
    }

    // Resolve the invitee email: from a username (existing user, email not exposed to
    // the client) or directly from a supplied email. One is required.
    const inviteeEmail = await this.resolveInviteeEmail(dto);

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

    const invitee = await this.usersService.findByEmail(inviteeEmail);

    const invitation = await this.invitationsRepository.create({
      inviterId: user.id,
      inviteeEmail,
      inviteeId: invitee?.id ?? null,
      type: dto.type,
      scopeId: dto.type === InvitationType.PLATFORM ? null : (dto.scopeId ?? null),
    });

    const lang = invitee?.language ?? 'EN';
    await this.sendInvitationEmail(invitation, user.displayName, lang);

    // Only an existing platform user gets an in-app notification; a VM invite to a
    // non-user is delivered purely by email until they sign up.
    if (invitee && dto.type !== InvitationType.PLATFORM) {
      // skipEmail: the bespoke VmInvitationEmail (with accept link) was already sent above.
      void this.notificationsService.create(
        invitee.id,
        user.id,
        NotificationEventType.VM_INVITATION_RECEIVED,
        'invitation',
        invitation.id,
        { skipEmail: true },
      );
    }

    return { ...invitation, shareMessage: this.buildShareMessage(invitation, user.displayName) };
  }

  // A search-found user is invited by username (email not exposed client-side); anyone
  // else by email. Exactly one path must yield an email.
  private async resolveInviteeEmail(dto: SendInvitationDto): Promise<string> {
    if (dto.inviteeUsername) {
      const target = await this.usersService.findByUsernameWithEmail(dto.inviteeUsername);
      if (!target) throw new EntityNotFoundException('User', dto.inviteeUsername);
      return target.email;
    }
    if (dto.inviteeEmail) return dto.inviteeEmail.toLowerCase();
    throw new AccessDeniedException();
  }

  // Re-sends a pending invitation's email — once only (spec/13). Inviter-only.
  async sendReminder(user: SessionUser, id: string) {
    const invitation = await this.invitationsRepository.findById(id);
    if (!invitation) throw new EntityNotFoundException('Invitation', id);
    if (invitation.inviterId !== user.id) throw new AccessDeniedException();
    if (invitation.status !== InvitationStatus.PENDING) throw new InvitationNotPendingException();
    if (invitation.reminderSentAt) throw new InvitationReminderAlreadySentException();

    const invitee = await this.usersService.findByEmail(invitation.inviteeEmail);
    const lang = invitee?.language ?? 'EN';
    await this.sendInvitationEmail(invitation, user.displayName, lang);
    return this.invitationsRepository.markReminderSent(id);
  }

  // Sends the type-appropriate invitation email (VM accept-link or platform signup-link).
  private async sendInvitationEmail(
    invitation: { token: string; type: InvitationType; inviteeEmail: string },
    inviterDisplayName: string,
    lang: 'EN' | 'MR',
  ) {
    if (invitation.type === InvitationType.PLATFORM) {
      const signupUrl = `${this.frontendUrl}/signup?invite=${invitation.token}`;
      const { html, text } = await this.emailService.renderTemplate(
        createElement(PlatformInvitationEmail, { inviterDisplayName, signupUrl, language: lang }),
      );
      this.emailService.sendNotification(
        invitation.inviteeEmail,
        getPlatformInviteSubject(lang),
        html,
        text,
      );
      return;
    }
    const acceptUrl = `${this.frontendUrl}/invitations/${invitation.token}/accept`;
    const { html, text } = await this.emailService.renderTemplate(
      createElement(VmInvitationEmail, {
        vaDisplayName: inviterDisplayName,
        scope: invitation.type === InvitationType.VM_GLOBAL ? 'global' : 'journey',
        acceptUrl,
        language: lang,
      }),
    );
    this.emailService.sendNotification(
      invitation.inviteeEmail,
      getVmInviteSubject(lang),
      html,
      text,
    );
  }

  // Auto-generated, copy/paste shareable message (spec/13) — editable client-side.
  private buildShareMessage(
    invitation: { token: string; type: InvitationType },
    inviterDisplayName: string,
  ): string {
    const url =
      invitation.type === InvitationType.PLATFORM
        ? `${this.frontendUrl}/signup?invite=${invitation.token}`
        : `${this.frontendUrl}/invitations/${invitation.token}/accept`;
    return invitation.type === InvitationType.PLATFORM
      ? `${inviterDisplayName} has invited you to join Veervrat — a companion for self-development. Join here: ${url}`
      : `${inviterDisplayName} has invited you to be their vratmitra (mentor) on Veervrat. Accept here: ${url}`;
  }

  async acceptInvitation(user: SessionUser, token: string) {
    const invitation = await this.invitationsRepository.findByToken(token);
    if (!invitation) throw new EntityNotFoundException('Invitation', token);

    if (
      !hasPermission(
        user,
        {
          type: 'invitation',
          invitation: { inviterId: invitation.inviterId, inviteeId: invitation.inviteeId },
        },
        'vm_invitation.accept',
      )
    ) {
      throw new AccessDeniedException();
    }

    if (invitation.expiresAt < new Date()) throw new InvitationExpiredException();
    if (invitation.status !== InvitationStatus.PENDING) throw new InvitationNotPendingException();

    const now = new Date();

    // Mark ACCEPTED first — if the relationship creation fails, the invitation can be retried by resetting to PENDING.
    // Inverse order risks a dangling ACTIVE relationship with a PENDING invitation and no duplicate constraint to catch retries.
    const accepted = await this.invitationsRepository.updateStatus(
      invitation.id,
      InvitationStatus.ACCEPTED,
      { acceptedAt: now },
    );

    if (invitation.type === InvitationType.VM_GLOBAL) {
      await this.vmRelationshipsService.createFromGlobalInvite(invitation.inviterId, user.id, now);
    } else if (invitation.type === InvitationType.VM_JOURNEY && invitation.scopeId) {
      await this.vmRelationshipsService.createFromJourneyInvite(invitation.scopeId, user.id, now);
    }

    // The role follows from the relationship. Granted after it exists, so a failure to form the
    // relationship never leaves someone holding a role they did not earn — and before the
    // notification, so the vratarthi is not told about a vratmitra who cannot yet act.
    if (invitation.type !== InvitationType.PLATFORM) {
      await this.invitationsRepository.grantVratmitraRole(user.id);
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

    if (
      !hasPermission(
        user,
        {
          type: 'invitation',
          invitation: { inviterId: invitation.inviterId, inviteeId: invitation.inviteeId },
        },
        'vm_invitation.decline',
      )
    ) {
      throw new AccessDeniedException();
    }

    if (invitation.status !== InvitationStatus.PENDING) throw new InvitationNotPendingException();

    const updated = await this.invitationsRepository.updateStatus(
      invitation.id,
      InvitationStatus.DECLINED,
    );

    const inviter = await this.usersService.findById(invitation.inviterId);
    if (inviter) {
      const lang = inviter.language;
      const { html, text } = await this.emailService.renderTemplate(
        createElement(VmInvitationDeclinedEmail, {
          vaDisplayName: inviter.displayName,
          language: lang,
        }),
      );
      this.emailService.sendNotification(inviter.email, getDeclinedSubject(lang), html, text);
    }

    // skipEmail: the bespoke VmInvitationDeclinedEmail was already sent above.
    void this.notificationsService.create(
      invitation.inviterId,
      user.id,
      NotificationEventType.VM_INVITATION_DECLINED,
      'invitation',
      invitation.id,
      { skipEmail: true },
    );

    return updated;
  }

  async cancelInvitation(user: SessionUser, id: string) {
    const invitation = await this.invitationsRepository.findById(id);
    if (!invitation) throw new EntityNotFoundException('Invitation', id);

    if (
      !hasPermission(
        user,
        {
          type: 'invitation',
          invitation: { inviterId: invitation.inviterId, inviteeId: invitation.inviteeId },
        },
        'vm_invitation.cancel',
      )
    ) {
      throw new AccessDeniedException();
    }

    if (invitation.status !== InvitationStatus.PENDING)
      throw new InvitationNotCancellableException();

    return this.invitationsRepository.updateStatus(invitation.id, InvitationStatus.CANCELLED);
  }

  /**
   * Invitations addressed to this person.
   *
   * No permission check beyond having a session: these are invitations sent *to* you, and being
   * the recipient is what makes the question meaningful. Scoped to `user.id` in the query rather
   * than filtered afterwards, so nothing a caller passes can widen it.
   */
  async listReceived(user: SessionUser) {
    return this.invitationsRepository.listByInvitee(user.id);
  }

  /**
   * One invitation by token, for the page where it is accepted.
   *
   * **Public.** The person holding the link may have no account yet — that is exactly why the
   * accept page could not say who was asking.
   *
   * ⚠️ Because it is public it is enumerable, so **a missing invitation and an expired one are
   * the same answer**. Returning "expired" for a real token and "not found" for a guess confirms
   * which strings are real invitations, which is an oracle for guessing them. The page still
   * tells an invited person that their invitation has expired — it learns that from `status` and
   * `expiresAt` on an invitation it was allowed to read, not from the difference between two
   * error codes.
   */
  async getByTokenForDisplay(token: string) {
    const invitation = await this.invitationsRepository.findByTokenForDisplay(token);
    if (!invitation) throw new EntityNotFoundException('Invitation', token);
    return invitation;
  }

  async listInvitations(user: SessionUser) {
    const invitations = await this.invitationsRepository.listByInviter(user.id);
    return invitations.map((inv) => ({
      ...inv,
      shareMessage: this.buildShareMessage(inv, user.displayName),
    }));
  }
}
