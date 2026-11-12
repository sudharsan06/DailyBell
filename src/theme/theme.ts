import { AccentId } from '../models/types';

export interface Theme {
  dark: boolean;
  accent: AccentId;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textFaint: string;
    primary: string;
    primarySoft: string;
    onPrimary: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    heroStart: string;
    heroText: string;
    heroMuted: string;
    track: string;
  };
  radius: { sm: number; md: number; lg: number; xl: number };
  spacing: (n: number) => number;
}

export interface AccentOption {
  id: AccentId;
  label: string;
  /** Base colour. Chosen so white text on it stays readable (≈4.5:1 or better). */
  color: string;
}

/** Ten theme colours, Slack-style. The first is the default brand indigo. */
export const ACCENTS: AccentOption[] = [
  { id: 'indigo', label: 'Indigo', color: '#5B5BD6' },
  { id: 'aubergine', label: 'Aubergine', color: '#6B2A6E' },
  { id: 'purple', label: 'Purple', color: '#7E3BD0' },
  { id: 'rose', label: 'Rose', color: '#C8305F' },
  { id: 'orange', label: 'Orange', color: '#C2410C' },
  { id: 'amber', label: 'Amber', color: '#A15C07' },
  { id: 'green', label: 'Green', color: '#1E8449' },
  { id: 'teal', label: 'Teal', color: '#0F766E' },
  { id: 'ocean', label: 'Ocean', color: '#2563EB' },
  { id: 'graphite', label: 'Graphite', color: '#4B5563' },
];

export const DEFAULT_ACCENT: AccentId = 'indigo';

export const isAccentId = (v: unknown): v is AccentId =>
  ACCENTS.some(a => a.id === v);

export const getAccent = (id: AccentId): AccentOption =>
  ACCENTS.find(a => a.id === id) ?? ACCENTS[0];

// ---- colour maths -------------------------------------------------------

const toRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map(c => c + c)
          .join('')
      : h;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
};

const toHex = (rgb: number[]) =>
  '#' +
  rgb
    .map(v =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase();

/** Mixes `amount` (0..1) of colour `a` into colour `b`. */
export const mix = (a: string, b: string, amount: number) => {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex(ca.map((v, i) => v * amount + cb[i] * (1 - amount)));
};

// ---- theme builder ------------------------------------------------------

const base = {
  radius: { sm: 8, md: 14, lg: 20, xl: 28 },
  spacing: (n: number) => n * 4,
};

/**
 * Builds a full theme from the accent: primary actions, the hero card, and a
 * light tint across backgrounds, surfaces and borders, so the whole app takes
 * on the chosen colour (like Slack's sidebar themes). Status colours
 * (success / warning / danger) stay fixed so their meaning never changes.
 */
export const buildTheme = (accentId: AccentId, dark: boolean): Theme => {
  const a = getAccent(accentId).color;

  if (!dark) {
    return {
      ...base,
      dark: false,
      accent: accentId,
      colors: {
        background: mix(a, '#F6F7F9', 0.06),
        surface: '#FFFFFF',
        surfaceAlt: mix(a, '#EEF0F3', 0.08),
        border: mix(a, '#E2E4EA', 0.1),
        text: '#151826',
        textMuted: mix(a, '#5E6370', 0.12),
        textFaint: mix(a, '#9CA1AE', 0.1),
        primary: a,
        primarySoft: mix(a, '#FFFFFF', 0.12),
        onPrimary: '#FFFFFF',
        success: '#1F9D6B',
        successSoft: '#E3F6EE',
        warning: '#C27803',
        warningSoft: '#FFF4DB',
        danger: '#D93B4A',
        heroStart: mix(a, '#000000', 0.9),
        heroText: '#FFFFFF',
        heroMuted: 'rgba(255,255,255,0.74)',
        track: 'rgba(255,255,255,0.24)',
      },
    };
  }

  return {
    ...base,
    dark: true,
    accent: accentId,
    colors: {
      background: mix(a, '#0D0F14', 0.05),
      surface: mix(a, '#171A21', 0.06),
      surfaceAlt: mix(a, '#20232C', 0.09),
      border: mix(a, '#2A2E39', 0.12),
      text: '#F2F3F8',
      textMuted: mix(a, '#A4A9B8', 0.1),
      textFaint: mix(a, '#6C7182', 0.1),
      primary: mix(a, '#FFFFFF', 0.62),
      primarySoft: mix(a, '#171A21', 0.3),
      onPrimary: '#0E1018',
      success: '#3CC48D',
      successSoft: '#163327',
      warning: '#F0B53C',
      warningSoft: '#3A2D10',
      danger: '#F2606E',
      heroStart: mix(a, '#0D0F14', 0.62),
      heroText: '#FFFFFF',
      heroMuted: 'rgba(255,255,255,0.72)',
      track: 'rgba(255,255,255,0.2)',
    },
  };
};

export const lightTheme = buildTheme(DEFAULT_ACCENT, false);
export const darkTheme = buildTheme(DEFAULT_ACCENT, true);
