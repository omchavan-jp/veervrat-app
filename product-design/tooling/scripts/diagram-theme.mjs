export const palette = {
  light: {
    background: '#ffffff',
    surface: '#f8f6fd',
    text: '#272339',
    muted: '#635c76',
    border: '#d8d2e7',
    primary: '#6840cf',
    core: '#eee8ff',
    outcome: '#e6f4ef',
    process: '#f2edff',
    platform: '#eaf1fb',
    growth: '#e4f5ea',
    weakness: '#fff1e8',
  },
  dark: {
    background: '#16141d',
    surface: '#211e2b',
    text: '#f0ecf8',
    muted: '#b8afc8',
    border: '#51495f',
    primary: '#b69aff',
    core: '#32274e',
    outcome: '#213a33',
    process: '#2d2544',
    platform: '#222f43',
    growth: '#21392b',
    weakness: '#412e27',
  },
};

export function diagramTheme(mode) {
  const p = palette[mode];
  return `vars: {
  d2-config: {layout-engine: elk; theme-id: ${mode === 'dark' ? 200 : 0}}
  d2-elk: {algorithm: layered; edgeRouting: ORTHOGONAL; nodeSpacing: 56}
}
style.fill: "${p.background}"
classes: {
  core: {width: 310; height: 120; style: {fill: "${p.core}"; stroke: "${p.primary}"; font-color: "${p.text}"; border-radius: 14; stroke-width: 2; font-size: 19; bold: true}}
  outcome: {width: 340; height: 125; style: {fill: "${p.outcome}"; stroke: "${p.border}"; font-color: "${p.text}"; border-radius: 14; stroke-width: 1; font-size: 18; bold: true}}
  process: {width: 330; height: 130; style: {fill: "${p.process}"; stroke: "${p.border}"; font-color: "${p.text}"; border-radius: 14; stroke-width: 1; font-size: 18}}
  platform: {width: 390; height: 160; style: {fill: "${p.platform}"; stroke: "${p.border}"; font-color: "${p.text}"; border-radius: 14; stroke-width: 1; font-size: 17}}
  growth: {width: 325; height: 125; style: {fill: "${p.growth}"; stroke: "${p.border}"; font-color: "${p.text}"; border-radius: 14; stroke-width: 1; font-size: 18}}
  weakness: {width: 325; height: 125; style: {fill: "${p.weakness}"; stroke: "${p.border}"; font-color: "${p.text}"; border-radius: 14; stroke-width: 1; font-size: 18}}
  progression: {style: {stroke: "${p.primary}"; stroke-width: 2; font-color: "${p.text}"; font-size: 16}}
  support: {style: {stroke: "${p.muted}"; stroke-width: 2; stroke-dash: 5; font-color: "${p.muted}"; font-size: 16}}
}
`;
}
