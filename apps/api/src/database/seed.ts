import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parseCsv, parseWeaknessNames, TIER_MAP } from './seed-utils';

// Load .env from apps/api/ — works from any cwd
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// __dirname = apps/api/src/database — go up 4 levels to repo root
const DATA_DIR = path.resolve(__dirname, '../../../../data/seed');

async function seed() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  // PrismaClient with driver adapter — cast required because generated client
  // does not expose adapter in its constructor overload in Prisma 7

  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  try {
    // ── Virtues ───────────────────────────────────────────────────────────────
    const virtueMap = new Map<string, string>(); // nameEn → uuid
    const virtues = await parseCsv(path.join(DATA_DIR, 'virtues.csv'));
    for (const row of virtues) {
      const v = await prisma.virtue.upsert({
        where: { nameEn: row['name_en'] },
        create: { nameEn: row['name_en'], nameMr: row['name_mr'] || null },
        update: { nameMr: row['name_mr'] || null },
        select: { id: true, nameEn: true },
      });
      virtueMap.set(v.nameEn, v.id);
    }

    // ── Subvirtues ────────────────────────────────────────────────────────────
    const subvirtueMap = new Map<string, string>();
    const subvirtues = await parseCsv(path.join(DATA_DIR, 'subvirtues.csv'));
    for (const row of subvirtues) {
      const virtueId = virtueMap.get(row['virtue_name_en']);
      if (!virtueId) {
        console.warn(`  WARN: virtue not found for subvirtue "${row['name_en']}"`);
        continue;
      }
      const sv = await prisma.subvirtue.upsert({
        where: { nameEn: row['name_en'] },
        create: { nameEn: row['name_en'], nameMr: row['name_mr'] || null, virtueId },
        update: { nameMr: row['name_mr'] || null, virtueId },
        select: { id: true, nameEn: true },
      });
      subvirtueMap.set(sv.nameEn, sv.id);
    }

    // ── Weaknesses ────────────────────────────────────────────────────────────
    const weaknessMap = new Map<string, string>();
    const weaknesses = await parseCsv(path.join(DATA_DIR, 'weakness.csv'));
    for (const row of weaknesses) {
      const w = await prisma.weakness.upsert({
        where: { nameEn: row['name_en'] },
        create: {
          nameEn: row['name_en'],
          nameMr: row['name_mr'] || null,
          category: row['category'] || null,
        },
        update: { nameMr: row['name_mr'] || null, category: row['category'] || null },
        select: { id: true, nameEn: true },
      });
      weaknessMap.set(w.nameEn, w.id);
    }

    // ── Weakness–Subvirtue links ──────────────────────────────────────────────
    const wsLinks = await parseCsv(path.join(DATA_DIR, 'weakness_subvirtues.csv'));
    let wsSkipped = 0;
    const wsData = wsLinks
      .map((row) => {
        const weaknessId = weaknessMap.get(row['weakness_name_en']);
        const subvirtueId = subvirtueMap.get(row['subvirtue_name_en']);
        if (!weaknessId || !subvirtueId) {
          console.warn(
            `  WARN: skipping weakness_subvirtue link — "${row['weakness_name_en']}" ↔ "${row['subvirtue_name_en']}"`,
          );
          wsSkipped++;
          return null;
        }
        return { weaknessId, subvirtueId, priority: parseInt(row['priority'] || '0', 10) };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (wsSkipped) console.warn(`  WARN: ${wsSkipped} weakness_subvirtue row(s) skipped`);
    await prisma.weaknessSubvirtue.createMany({ data: wsData, skipDuplicates: true });

    // ── Sentences ─────────────────────────────────────────────────────────────
    const sentenceMap = new Map<string, string>(); // textEn → uuid
    const sentences = await parseCsv(path.join(DATA_DIR, 'sentences.csv'));
    for (const row of sentences) {
      const subvirtueId = subvirtueMap.get(row['subvirtue_name_en']);
      if (!subvirtueId) {
        console.warn(`  WARN: subvirtue not found for sentence "${row['text_en'].slice(0, 50)}"`);
        continue;
      }
      let s = await prisma.sentence.findFirst({
        where: { textEn: row['text_en'] },
        select: { id: true, textEn: true },
      });
      if (!s) {
        s = await prisma.sentence.create({
          data: { textEn: row['text_en'], textMr: row['text_mr'] || null, subvirtueId },
          select: { id: true, textEn: true },
        });
      } else {
        await prisma.sentence.update({
          where: { id: s.id },
          data: { textMr: row['text_mr'] || null, subvirtueId },
        });
      }
      sentenceMap.set(s.textEn, s.id);
    }

    // ── Sentence ERC metadata ─────────────────────────────────────────────────
    const ercMeta = await parseCsv(path.join(DATA_DIR, 'sentence_erc_meta.csv'));
    for (const row of ercMeta) {
      const sid = sentenceMap.get(row['sentence_text_en']);
      if (!sid) {
        console.warn(
          `  WARN: sentence not found for ERC meta "${row['sentence_text_en'].slice(0, 50)}"`,
        );
        continue;
      }
      await prisma.sentence.update({
        where: { id: sid },
        data: { sourceFile: row['source_file'] || null, notes: row['notes'] || null },
      });
    }

    // ── Exposures ─────────────────────────────────────────────────────────────
    const exposures = await parseCsv(path.join(DATA_DIR, 'exposures.csv'));
    for (const row of exposures) {
      const sentenceId = sentenceMap.get(row['sentence_text_en']);
      if (!sentenceId) {
        console.warn(`  WARN: sentence not found for exposure "${row['title']}"`);
        continue;
      }
      const tier = TIER_MAP[row['tier']];
      if (!tier) {
        console.warn(`  WARN: unknown tier "${row['tier']}" for exposure "${row['title']}"`);
        continue;
      }
      let existing = await prisma.exposure.findFirst({
        where: { sentenceId, titleEn: row['title'] },
        select: { id: true },
      });
      if (!existing) {
        existing = await prisma.exposure.create({
          data: {
            sentenceId,
            tier,
            titleEn: row['title'],
            descriptionEn: row['description'] || null,
            sortOrder: parseInt(row['sort_order'] || '0', 10),
          },
          select: { id: true },
        });
      } else {
        await prisma.exposure.update({
          where: { id: existing.id },
          data: {
            tier,
            descriptionEn: row['description'] || null,
            sortOrder: parseInt(row['sort_order'] || '0', 10),
          },
        });
      }

      const wnames = parseWeaknessNames(row['weakness_names']);
      const ewData: { exposureId: string; weaknessId: string }[] = [];
      for (const wname of wnames) {
        const weaknessId = weaknessMap.get(wname);
        if (!weaknessId) {
          console.warn(`  WARN: weakness not found for exposure "${row['title']}": "${wname}"`);
        } else {
          ewData.push({ exposureId: existing.id, weaknessId });
        }
      }
      if (ewData.length)
        await prisma.exposureWeakness.createMany({ data: ewData, skipDuplicates: true });
    }

    // ── Resolutions ───────────────────────────────────────────────────────────
    const resolutions = await parseCsv(path.join(DATA_DIR, 'resolutions.csv'));
    for (const row of resolutions) {
      const sentenceId = sentenceMap.get(row['sentence_text_en']);
      if (!sentenceId) {
        console.warn(`  WARN: sentence not found for resolution "${row['title']}"`);
        continue;
      }
      let existingR = await prisma.resolution.findFirst({
        where: { sentenceId, titleEn: row['title'] },
        select: { id: true },
      });
      const dur = row['duration_weeks'] ? parseInt(row['duration_weeks'], 10) : null;
      if (!existingR) {
        existingR = await prisma.resolution.create({
          data: {
            sentenceId,
            titleEn: row['title'],
            descriptionEn: row['description'] || null,
            durationWeeks: dur,
            sortOrder: parseInt(row['sort_order'] || '0', 10),
          },
          select: { id: true },
        });
      } else {
        await prisma.resolution.update({
          where: { id: existingR.id },
          data: {
            descriptionEn: row['description'] || null,
            durationWeeks: dur,
            sortOrder: parseInt(row['sort_order'] || '0', 10),
          },
        });
      }

      const wnames = parseWeaknessNames(row['weakness_names']);
      const rwData: { resolutionId: string; weaknessId: string }[] = [];
      for (const wname of wnames) {
        const weaknessId = weaknessMap.get(wname);
        if (!weaknessId) {
          console.warn(`  WARN: weakness not found for resolution "${row['title']}": "${wname}"`);
        } else {
          rwData.push({ resolutionId: existingR.id, weaknessId });
        }
      }
      if (rwData.length)
        await prisma.resolutionWeakness.createMany({ data: rwData, skipDuplicates: true });
    }

    // ── Challenges ────────────────────────────────────────────────────────────
    const challenges = await parseCsv(path.join(DATA_DIR, 'challenges.csv'));
    for (const row of challenges) {
      const sentenceId = sentenceMap.get(row['sentence_text_en']);
      if (!sentenceId) {
        console.warn(`  WARN: sentence not found for challenge "${row['title']}"`);
        continue;
      }
      let existingC = await prisma.challenge.findFirst({
        where: { sentenceId, titleEn: row['title'] },
        select: { id: true },
      });
      const durC = row['duration_days'] ? parseInt(row['duration_days'], 10) : null;
      if (!existingC) {
        existingC = await prisma.challenge.create({
          data: {
            sentenceId,
            titleEn: row['title'],
            descriptionEn: row['description'] || null,
            durationDays: durC,
          },
          select: { id: true },
        });
      } else {
        await prisma.challenge.update({
          where: { id: existingC.id },
          data: { descriptionEn: row['description'] || null, durationDays: durC },
        });
      }

      const wnames = parseWeaknessNames(row['weakness_names']);
      const cwData: { challengeId: string; weaknessId: string }[] = [];
      for (const wname of wnames) {
        const weaknessId = weaknessMap.get(wname);
        if (!weaknessId) {
          console.warn(`  WARN: weakness not found for challenge "${row['title']}": "${wname}"`);
        } else {
          cwData.push({ challengeId: existingC.id, weaknessId });
        }
      }
      if (cwData.length)
        await prisma.challengeWeakness.createMany({ data: cwData, skipDuplicates: true });
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const counts = await Promise.all([
      prisma.virtue.count(),
      prisma.subvirtue.count(),
      prisma.weakness.count(),
      prisma.weaknessSubvirtue.count(),
      prisma.sentence.count(),
      prisma.exposure.count(),
      prisma.exposureWeakness.count(),
      prisma.resolution.count(),
      prisma.resolutionWeakness.count(),
      prisma.challenge.count(),
      prisma.challengeWeakness.count(),
    ]);

    const labels = [
      'virtues',
      'subvirtues',
      'weaknesses',
      'weakness_subvirtues',
      'sentences',
      'exposures',
      'exposure_weaknesses',
      'resolutions',
      'resolution_weaknesses',
      'challenges',
      'challenge_weaknesses',
    ];
    console.log('\nSeed complete:');
    labels.forEach((label, i) => console.log(`  ${label}: ${counts[i]}`));
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
