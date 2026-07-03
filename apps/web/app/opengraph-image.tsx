import { ImageResponse } from 'next/og';

// Rich link-preview image (WhatsApp, iMessage, Slack, Twitter, …). Next.js wires
// this up as og:image + twitter:image automatically and makes the URL absolute
// via metadataBase (set in app/layout.tsx).
export const runtime = 'nodejs';
export const alt = 'Veervrat — a platform for self-reliance and personal growth';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG = '#FAF7F2';
const FG = '#1C1A17';
const ACCENT = '#C0512F';
const GREEN = '#2F5B4F';
const MUTED = '#8A817A';

// Fetch just the glyphs we need from Google Fonts. Returns null on any failure
// so the image still renders (falling back to the built-in font).
async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
    const src = css.match(/src:\s*url\(([^)]+)\)\s*format/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [display, deva] = await Promise.all([
    loadGoogleFont(
      'Newsreader',
      600,
      'Veervrat A platform for self-reliance and personal growth JNANA PRABODHINI',
    ),
    loadGoogleFont('Tiro Devanagari Marathi', 400, 'वीरव्रत ज्ञान प्रबोधिनी वी'),
  ]);

  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 600; style: 'normal' }[] = [];
  if (display) fonts.push({ name: 'Display', data: display, weight: 600, style: 'normal' });
  if (deva) fonts.push({ name: 'Deva', data: deva, weight: 400, style: 'normal' });
  const hasDeva = Boolean(deva);

  // Ambient concentric "ascent" rings, sharing a centre near the lower-left —
  // the widening practice of virtue that the platform is built around.
  const ring = (d: number, color: string) => (
    <div
      style={{
        position: 'absolute',
        width: d,
        height: d,
        left: 150 - d / 2,
        top: 600 - d / 2,
        borderRadius: 9999,
        border: `2px solid ${color}`,
      }}
    />
  );

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
          display: 'flex',
          backgroundColor: BG,
          overflow: 'hidden',
        }}
      >
        {ring(1180, 'rgba(47,91,79,0.09)')}
        {ring(920, 'rgba(192,81,47,0.10)')}
        {ring(660, 'rgba(47,91,79,0.13)')}
        {ring(420, 'rgba(192,81,47,0.14)')}

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            padding: '84px 96px',
            justifyContent: 'space-between',
          }}
        >
          {/* Institutional mark + eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 104,
                height: 104,
                borderRadius: 9999,
                backgroundColor: FG,
                color: BG,
                border: `3px solid ${ACCENT}`,
                fontSize: 54,
                fontFamily: hasDeva ? 'Deva' : 'Display',
              }}
            >
              {/* optical-centre the Devanagari glyph (its mass sits above the headline) */}
              <div style={{ display: 'flex', transform: hasDeva ? 'translate(-1px, 6px)' : 'none' }}>
                {hasDeva ? 'वी' : 'V'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {hasDeva && (
                <div style={{ display: 'flex', fontSize: 27, color: GREEN, fontFamily: 'Deva' }}>
                  ज्ञान प्रबोधिनी
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  fontSize: 20,
                  letterSpacing: 7,
                  color: MUTED,
                  fontFamily: 'Display',
                }}
              >
                JNANA PRABODHINI
              </div>
            </div>
          </div>

          {/* Bilingual wordmark lockup — the signature */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 30 }}>
              <div style={{ display: 'flex', fontSize: 124, fontFamily: 'Display', lineHeight: 1 }}>
                <span style={{ color: ACCENT }}>Veer</span>
                <span style={{ color: FG }}>vrat</span>
              </div>
              {hasDeva && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 66,
                    color: GREEN,
                    fontFamily: 'Deva',
                    paddingBottom: 14,
                  }}
                >
                  वीरव्रत
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                width: 150,
                height: 8,
                backgroundColor: ACCENT,
                borderRadius: 4,
                marginTop: 22,
              }}
            />
          </div>

          {/* Tagline */}
          <div
            style={{ display: 'flex', fontSize: 40, color: FG, fontFamily: 'Display', maxWidth: 900 }}
          >
            A platform for self-reliance and personal growth
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
