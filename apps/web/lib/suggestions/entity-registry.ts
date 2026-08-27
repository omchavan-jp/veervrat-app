/**
 * Which record is this page about?
 *
 * A suggestion is only actionable if it says *which weakness*, not just "the study page". Next
 * gives us the route pattern and the resolved params; this maps the pattern to an entity type and
 * names the param that carries the id.
 *
 * **A route missing from this table still produces a valid suggestion**, with no entity. Absence
 * degrades precision; it never fails. That is why this is a lookup and not a validation.
 */
const ROUTE_ENTITIES: Record<string, { entityType: string; param: string }> = {
  '/weaknesses/[id]': { entityType: 'weakness', param: 'id' },
  '/virtues/[id]': { entityType: 'virtue', param: 'id' },
  '/subvirtues/[id]': { entityType: 'subvirtue', param: 'id' },
  '/sentences/[id]': { entityType: 'sentence', param: 'id' },
  '/study/[id]': { entityType: 'weakness', param: 'id' },
  '/study/[id]/test': { entityType: 'weakness', param: 'id' },
  '/study/[id]/test/[testId]': { entityType: 'test', param: 'testId' },
  '/study/[id]/test/[testId]/preview': { entityType: 'test', param: 'testId' },
  '/study/[id]/test/[testId]/report': { entityType: 'test', param: 'testId' },
  '/journeys/[id]': { entityType: 'journey', param: 'id' },
  '/u/[username]': { entityType: 'user', param: 'username' },
  '/community/blogs/[id]': { entityType: 'blog', param: 'id' },
  '/blogs/[id]/edit': { entityType: 'blog', param: 'id' },
  '/community/experiences/[id]': { entityType: 'experienceLog', param: 'id' },
  '/experiences/[id]/edit': { entityType: 'experienceLog', param: 'id' },
  '/my-vratmitras/[vmId]/chat': { entityType: 'user', param: 'vmId' },
};

export type ResolvedEntity = { entityType?: string; entityId?: string };

export function resolveEntity(
  route: string | null,
  params: Record<string, string | string[] | undefined>,
): ResolvedEntity {
  if (!route) return {};
  const entry = ROUTE_ENTITIES[route];
  if (!entry) return {};

  const raw = params[entry.param];
  // A catch-all route hands back an array. Take the first segment — it is the identifier in
  // every case here — rather than stringifying the whole array into something unusable.
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) return {};

  return { entityType: entry.entityType, entityId: id };
}

/** Exported for the test that keeps this table honest against the app's actual routes. */
export const KNOWN_ENTITY_ROUTES = Object.keys(ROUTE_ENTITIES);
