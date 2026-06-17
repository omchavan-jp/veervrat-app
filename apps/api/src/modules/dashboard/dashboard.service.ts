import { Injectable } from '@nestjs/common';
import { DashboardRepository, DashboardStats, SuggestionItem } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getStats(userId: string): Promise<DashboardStats> {
    return this.dashboardRepository.getStats(userId);
  }

  async getSuggestions(userId: string): Promise<{ suggestions: SuggestionItem[] }> {
    const suggestions = await this.dashboardRepository.getSuggestions(userId);
    return { suggestions };
  }
}
