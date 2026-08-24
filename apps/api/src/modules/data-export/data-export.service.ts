import { Injectable } from '@nestjs/common';
import { DataExportRepository } from './data-export.repository';

@Injectable()
export class DataExportService {
  constructor(private readonly repo: DataExportRepository) {}

  /**
   * Everything held about one person, in one JSON document.
   *
   * JSON rather than a rendered document: portability is the obligation this exists to satisfy,
   * and a format meant to be read by another system has to win over one meant to be read by a
   * human. `ops/data-map.md` §1 is the checklist this method exists to make queryable rather
   * than merely documented — every category listed there that belongs to one person appears
   * below by name, so a category quietly added to the schema without a line here is easy to
   * notice by diffing the two.
   */
  async exportFor(userId: string) {
    const [
      identity,
      authAccounts,
      consents,
      testAttempts,
      journeys,
      experienceLogs,
      chatMessages,
      blogs,
      blogComments,
    ] = await Promise.all([
      this.repo.identity(userId),
      this.repo.authAccounts(userId),
      this.repo.consents(userId),
      this.repo.testAttempts(userId),
      this.repo.journeys(userId),
      this.repo.experienceLogs(userId),
      this.repo.chatMessages(userId),
      this.repo.blogs(userId),
      this.repo.blogComments(userId),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      identity,
      authAccounts,
      consents,
      selfAssessments: testAttempts,
      journeys,
      experienceLogs,
      chatMessages,
      blogs,
      blogComments,
    };
  }
}
