import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import enMessages from '../../messages/en.json';
import mrMessages from '../../messages/mr.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const weaknessCsvPath = path.join(repoRoot, 'data', 'seed', 'weakness.csv');

function flatten(obj: Record<string, unknown>, prefix = '', out: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      flatten(value as Record<string, unknown>, p, out);
    } else {
      out[p] = String(value);
    }
  }
  return out;
}

describe('terminology — Marathi weakness (#369)', () => {
  const enFlat = flatten(enMessages as Record<string, unknown>);
  const mrFlat = flatten(mrMessages as Record<string, unknown>);

  it('uses उणीव / उणीवा for the Weakness entity in key UI labels', () => {
    expect(mrFlat['entityType.weakness']).toBe('उणीव');
    expect(mrFlat['common.nav.virtues']).toBe('सद्गुण व उणीवा');
    expect(mrFlat['virtues.title']).toBe('सद्गुण व उणीवा');
    expect(mrFlat['virtues.weaknessesSection']).toBe('उणीवा');
    expect(mrFlat['virtues.backToBrowser']).toBe('सद्गुण व उणीवा');
    expect(mrFlat['admin.taxonomyDesc']).toBe('सद्गुण, उपगुण व उणीवा.');
    expect(mrFlat['profile.fieldWeaknesses']).toBe('काम केलेल्या उणीवा');
    expect(mrFlat['publicProfile.weaknesses']).toBe('काम केलेल्या उणीवा');
    expect(mrFlat['experiences.tagType.WEAKNESS']).toBe('उणीव');
    expect(mrFlat['experiences.entityType.WEAKNESS']).toBe('उणीव');
    expect(mrFlat['experiences.tagSearchPlaceholder']).toBe('उणीव, सद्गुण, प्रवास शोधा…');
    expect(mrFlat['virtues.tacklesWeaknesses']).toBe('ह्या उणीवा हाताळण्यास मदत करते');
    expect(mrFlat['virtues.takeTestForWeakness']).toBe('या उणिवेची चाचणी द्या');
    expect(mrFlat['virtues.weaknessesEmpty']).toBe('अद्याप कोणत्याही उणीवा नाहीत');
    expect(mrFlat['virtues.cultivateHint']).toBe(
      'पुढील गोष्टी जोपासल्याने ही उणीव हाताळण्यास मदत होऊ शकते.',
    );
    expect(mrFlat['virtues.sentenceCtaHint']).toBe(
      'ही केवळ माहिती आहे. यावर काम करण्यासाठी, संबंधित उणिवेची चाचणी द्या.',
    );
    expect(mrFlat['suggestions.titlePlaceholder']).toBe('या उणिवेला वर्णन हवे');
  });

  it('uses grammatically appropriate inflections in body copy', () => {
    expect(mrFlat['onboarding.framework.stage2Body']).toBe(
      'प्रत्येक उणिवेचा वाक्यांद्वारे आणि त्यांच्या जोडलेल्या सद्गुणांद्वारे शोध घ्या. मूळ समजून घ्या.',
    );
    expect(mrFlat['onboarding.framework.stage4Body']).toBe(
      'प्रवास पूर्ण करा. विचार करा. उणीव एक प्रारंभिक बिंदू बनतो, शेवट नाही.',
    );
    expect(mrFlat['study.test.exitBody']).toBe(
      'तुमची आतापर्यंतची उत्तरे जतन झाली आहेत. तुम्ही ही चाचणी उणिवेवर पानावरून कधीही पुन्हा सुरू करू शकता.',
    );
    expect(mrFlat['journey.erc.poolEmptyExposures']).toBe(
      'तुमच्या उणिवेच्या संदर्भासाठी कोणतेही एक्सपोजर उपलब्ध नाहीत.',
    );
    expect(mrFlat['journey.erc.poolEmptyResolutions']).toBe(
      'तुमच्या उणिवेच्या संदर्भासाठी कोणतेही संकल्प उपलब्ध नाहीत.',
    );
    expect(mrFlat['journey.erc.poolEmptyChallenges']).toBe(
      'तुमच्या उणिवेच्या संदर्भासाठी कोणतीही आव्हाने उपलब्ध नाहीत.',
    );
  });

  it('preserves existing canonical oblique forms already correct', () => {
    expect(mrFlat['study.detail.backToWeaknesses']).toBe('उणिवांकडे परत');
    expect(mrFlat['study.report.backToWeakness']).toBe('उणिवेकडे परत');
  });

  it('does not use deprecated Weakness terms for the Weakness entity', () => {
    const deprecated = [
      'common.nav.virtues',
      'onboarding.framework.stage2Body',
      'onboarding.framework.stage4Body',
      'study.test.exitBody',
      'journey.erc.poolEmptyExposures',
      'journey.erc.poolEmptyResolutions',
      'journey.erc.poolEmptyChallenges',
      'profile.fieldWeaknesses',
      'publicProfile.weaknesses',
      'experiences.tagSearchPlaceholder',
      'experiences.tagType.WEAKNESS',
      'experiences.entityType.WEAKNESS',
      'virtues.title',
      'virtues.subtitle',
      'virtues.weaknessesSection',
      'virtues.backToBrowser',
      'virtues.tacklesWeaknesses',
      'virtues.cultivateHint',
      'virtues.sentenceCtaHint',
      'virtues.takeTestForWeakness',
      'virtues.weaknessesEmpty',
      'admin.taxonomyDesc',
      'entityType.weakness',
      'suggestions.titlePlaceholder',
    ];
    for (const key of deprecated) {
      expect(mrFlat[key]).not.toMatch(/दुर्गुण|कमकुवतपणा|दुर्बलता|कमजोरी/);
    }
  });

  it('allows the preserved password-strength sense of कमकुवत alone', () => {
    expect(mrFlat['auth.signup.passwordWeak']).toBe('कमकुवत');
  });

  it('seeded weakness data uses the canonical term', () => {
    const csv = fs.readFileSync(weaknessCsvPath, 'utf8');
    expect(csv).toContain('उणीव आणि व्यक्तींमध्ये फरक न करता येणे');
    expect(csv).not.toMatch(/दुर्गुण|कमकुवतपणा|दुर्बलता/);
  });

  it('keeps EN and MR message keys aligned', () => {
    expect(Object.keys(mrFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });
});
