import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
    // Optional, and only ever used by dev-time commands (`migrate dev`, `migrate diff
    // --from-migrations`). Prisma replays every migration into this database to work out the
    // diff; without one it wants to reset the development database instead, which throws away
    // whatever you were testing with. Left undefined in CI and production, where Prisma's
    // default behaviour is correct.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
