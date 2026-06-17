import { Injectable } from '@nestjs/common';
import { AdminContentRepository } from './admin-content.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import {
  AccessDeniedException,
  EntityInUseException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import {
  CreateSubvirtueDto,
  CreateVirtueDto,
  CreateWeaknessDto,
  LinkWeaknessSubvirtueDto,
  UpdateSubvirtueDto,
  UpdateVirtueDto,
  UpdateWeaknessDto,
} from './dto/taxonomy.dto';

@Injectable()
export class TaxonomyService {
  constructor(private readonly repo: AdminContentRepository) {}

  private assert(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.manage_taxonomy')) {
      throw new AccessDeniedException();
    }
  }

  // ─── Virtues ───────────────────────────────────────────────────────────────
  async createVirtue(user: SessionUser, dto: CreateVirtueDto) {
    this.assert(user);
    return this.repo.createVirtue(dto);
  }

  async updateVirtue(user: SessionUser, id: string, dto: UpdateVirtueDto) {
    this.assert(user);
    if (!(await this.repo.findVirtue(id))) throw new EntityNotFoundException('Virtue', id);
    return this.repo.updateVirtue(id, dto);
  }

  async deleteVirtue(user: SessionUser, id: string) {
    this.assert(user);
    const virtue = await this.repo.findVirtue(id);
    if (!virtue) throw new EntityNotFoundException('Virtue', id);
    if (virtue._count.subvirtues > 0) throw new EntityInUseException('Virtue', 'it has subvirtues');
    return this.repo.deleteVirtue(id);
  }

  // ─── Subvirtues ──────────────────────────────────────────────────────────────
  async createSubvirtue(user: SessionUser, dto: CreateSubvirtueDto) {
    this.assert(user);
    return this.repo.createSubvirtue(dto);
  }

  async updateSubvirtue(user: SessionUser, id: string, dto: UpdateSubvirtueDto) {
    this.assert(user);
    if (!(await this.repo.findSubvirtue(id))) throw new EntityNotFoundException('Subvirtue', id);
    return this.repo.updateSubvirtue(id, dto);
  }

  async deleteSubvirtue(user: SessionUser, id: string) {
    this.assert(user);
    const sv = await this.repo.findSubvirtue(id);
    if (!sv) throw new EntityNotFoundException('Subvirtue', id);
    if (sv._count.sentences > 0) throw new EntityInUseException('Subvirtue', 'it has sentences');
    if (sv._count.weaknesses > 0) throw new EntityInUseException('Subvirtue', 'it is linked to weaknesses');
    return this.repo.deleteSubvirtue(id);
  }

  // ─── Weaknesses ──────────────────────────────────────────────────────────────
  async createWeakness(user: SessionUser, dto: CreateWeaknessDto) {
    this.assert(user);
    return this.repo.createWeakness(dto);
  }

  async updateWeakness(user: SessionUser, id: string, dto: UpdateWeaknessDto) {
    this.assert(user);
    if (!(await this.repo.findWeakness(id))) throw new EntityNotFoundException('Weakness', id);
    return this.repo.updateWeakness(id, dto);
  }

  async deleteWeakness(user: SessionUser, id: string) {
    this.assert(user);
    const w = await this.repo.findWeakness(id);
    if (!w) throw new EntityNotFoundException('Weakness', id);
    const c = w._count;
    const refs =
      c.journeyWeaknesses + c.exposureWeaknesses + c.resolutionWeaknesses + c.challengeWeaknesses + c.testAttempts;
    if (refs > 0) throw new EntityInUseException('Weakness', 'it is referenced by journeys, ERC content, or tests');
    return this.repo.deleteWeakness(id);
  }

  // ─── Links ───────────────────────────────────────────────────────────────────
  async linkWeaknessSubvirtue(user: SessionUser, dto: LinkWeaknessSubvirtueDto) {
    this.assert(user);
    return this.repo.upsertWeaknessSubvirtue(dto.weaknessId, dto.subvirtueId, dto.priority ?? 0);
  }

  async unlinkWeaknessSubvirtue(user: SessionUser, weaknessId: string, subvirtueId: string) {
    this.assert(user);
    return this.repo.deleteWeaknessSubvirtue(weaknessId, subvirtueId);
  }
}
