import { Injectable } from '@nestjs/common';
import { VirtuesRepository } from './virtues.repository';
import { JourneysService } from '../journeys/journeys.service';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';
import { isVa } from '../../common/permissions/types';
import type { SessionUser } from '../auth/types/auth.types';

@Injectable()
export class VirtuesService {
  constructor(
    private readonly repository: VirtuesRepository,
    private readonly journeysService: JourneysService,
  ) {}

  async getVirtues() {
    return this.repository.listVirtues();
  }

  async getVirtue(id: string) {
    const virtue = await this.repository.findVirtueById(id);
    if (!virtue) throw new EntityNotFoundException('Virtue', id);
    return virtue;
  }

  async getSubvirtue(id: string) {
    const subvirtue = await this.repository.findSubvirtueById(id);
    if (!subvirtue) throw new EntityNotFoundException('Subvirtue', id);
    return subvirtue;
  }

  async getSentence(user: SessionUser | undefined, id: string) {
    const sentence = await this.repository.findSentenceById(id);
    if (!sentence) throw new EntityNotFoundException('Sentence', id);

    // Active-journey indicator only for an authenticated VA (spec/21).
    const hasActiveJourney =
      user && isVa(user) ? await this.journeysService.hasActiveJourneyForSentence(user.id, id) : false;

    return { ...sentence, hasActiveJourney };
  }
}
