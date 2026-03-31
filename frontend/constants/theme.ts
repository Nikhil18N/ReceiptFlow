// Design tokens translated from the Stitch "Emerald Ledger" design system

export const Colors = {
  // Core brand
  primary: '#006d36',
  'primary-container': '#50c878',
  'primary-fixed': '#83fba5',
  'primary-fixed-dim': '#66dd8b',
  'inverse-primary': '#66dd8b',
  'on-primary': '#ffffff',
  'on-primary-container': '#005025',
  'on-primary-fixed': '#00210c',
  'on-primary-fixed-variant': '#005227',

  // Secondary (teal)
  secondary: '#446464',
  'secondary-container': '#c6e9e9',
  'secondary-fixed': '#c6e9e9',
  'secondary-fixed-dim': '#abcdcd',
  'on-secondary': '#ffffff',
  'on-secondary-container': '#4a6a6a',
  'on-secondary-fixed': '#002020',
  'on-secondary-fixed-variant': '#2c4c4c',

  // Tertiary (orange)
  tertiary: '#904d00',
  'tertiary-container': '#ff993a',
  'tertiary-fixed': '#ffdcc3',
  'tertiary-fixed-dim': '#ffb77d',
  'on-tertiary': '#ffffff',
  'on-tertiary-container': '#6a3700',
  'on-tertiary-fixed': '#2f1500',
  'on-tertiary-fixed-variant': '#6e3900',

  // Error
  error: '#ba1a1a',
  'error-container': '#ffdad6',
  'on-error': '#ffffff',
  'on-error-container': '#93000a',

  // Surfaces
  background: '#f8f9fa',
  surface: '#f8f9fa',
  'surface-dim': '#d9dadb',
  'surface-bright': '#f8f9fa',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f3f4f5',
  'surface-container': '#edeeef',
  'surface-container-high': '#e7e8e9',
  'surface-container-highest': '#e1e3e4',
  'surface-variant': '#e1e3e4',
  'surface-tint': '#006d36',
  'inverse-surface': '#2e3132',
  'inverse-on-surface': '#f0f1f2',

  // On-surface
  'on-background': '#191c1d',
  'on-surface': '#191c1d',
  'on-surface-variant': '#3e4a3f',

  // Outline
  outline: '#6e7a6e',
  'outline-variant': '#bdcabc',
};

export const Fonts = {
  headline: 'Manrope',
  body: 'Inter',
  label: 'Inter',
};

export const Gradients = {
  emeraldPrimary: ['#006d36', '#50c878'] as const,
  emeraldDark: ['#004d25', '#006d36'] as const,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  card: 28,
  pill: 999,
};

export const Shadows = {
  editorial: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 4,
  },
  card: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  fab: {
    shadowColor: '#006d36',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
};
