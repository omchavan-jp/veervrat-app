import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OVERRIDE_LOCALES, type OverrideLocale } from './dto/upsert-override.dto';
import type { NestedMessages } from './messages.util';

export type PublishFile = { path: string; content: string };

// Opens content-edit pull requests via the GitHub REST API using the built-in `fetch`
// (no Octokit dependency). Reads the canonical message files from the base branch and
// commits merged copies onto a fresh branch — it never pushes to the base branch directly.
@Injectable()
export class GithubPublisher {
  private readonly logger = new Logger('GithubPublisher');
  private readonly token?: string;
  private readonly repo?: string; // "owner/name"
  private readonly baseBranch: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('CONTENT_EDIT_GITHUB_TOKEN');
    this.repo = this.config.get<string>('CONTENT_EDIT_GITHUB_REPO');
    this.baseBranch = this.config.get<string>('CONTENT_EDIT_GITHUB_BASE_BRANCH', 'main');
  }

  get configured(): boolean {
    return Boolean(this.token && this.repo);
  }

  // The current message catalogs on the base branch — the merge base for a publish.
  async getMessageFiles(): Promise<Record<OverrideLocale, NestedMessages>> {
    const entries = await Promise.all(
      OVERRIDE_LOCALES.map(async (locale) => {
        const raw = await this.getRawFile(`apps/web/messages/${locale}.json`);
        return [locale, JSON.parse(raw) as NestedMessages] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<OverrideLocale, NestedMessages>;
  }

  async openPullRequest(params: {
    branch: string;
    title: string;
    body: string;
    files: PublishFile[];
  }): Promise<{ prUrl: string; branch: string }> {
    const api = this.apiBase();

    // Base branch head → its tree.
    const baseRef = (await this.gh(`${api}/git/ref/heads/${this.baseBranch}`, 'GET')) as {
      object: { sha: string };
    };
    const baseSha = baseRef.object.sha;
    const baseCommit = (await this.gh(`${api}/git/commits/${baseSha}`, 'GET')) as {
      tree: { sha: string };
    };

    // New tree with the updated files, committed onto a new branch.
    const newTree = (await this.gh(`${api}/git/trees`, 'POST', {
      base_tree: baseCommit.tree.sha,
      tree: params.files.map((f) => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        content: f.content,
      })),
    })) as { sha: string };

    const commit = (await this.gh(`${api}/git/commits`, 'POST', {
      message: params.title,
      tree: newTree.sha,
      parents: [baseSha],
    })) as { sha: string };

    await this.gh(`${api}/git/refs`, 'POST', {
      ref: `refs/heads/${params.branch}`,
      sha: commit.sha,
    });

    const pr = (await this.gh(`${api}/pulls`, 'POST', {
      title: params.title,
      head: params.branch,
      base: this.baseBranch,
      body: params.body,
    })) as { html_url: string };

    return { prUrl: pr.html_url, branch: params.branch };
  }

  private apiBase(): string {
    if (!this.token || !this.repo) {
      throw new ServiceUnavailableException('Content publishing (GitHub) is not configured');
    }
    const [owner, name] = this.repo.split('/');
    return `https://api.github.com/repos/${owner}/${name}`;
  }

  private async getRawFile(path: string): Promise<string> {
    const res = (await this.gh(
      `${this.apiBase()}/contents/${encodeURIComponent(path)}?ref=${this.baseBranch}`,
      'GET',
    )) as { content: string; encoding: string };
    return res.encoding === 'base64'
      ? Buffer.from(res.content, 'base64').toString('utf8')
      : res.content;
  }

  private async gh(url: string, method: string, body?: unknown): Promise<unknown> {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error({
        msg: 'github api error',
        url,
        status: res.status,
        text: text.slice(0, 500),
      });
      throw new ServiceUnavailableException('GitHub API request failed');
    }
    return res.json();
  }
}
