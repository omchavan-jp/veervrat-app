import { governanceJson } from '../../../lib/governance-json';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export function GET(): Promise<Response> {
  return governanceJson('decision-registry.schema.json');
}
