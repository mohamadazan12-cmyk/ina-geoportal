export const FIGMA_TOKENS = {
  colors: {
    primary: '#1A3BAF',
    navy: '#0C1D36',
    background: '#F1F7FA',
    card: '#FFFFFF',
    tabBg: '#D9D9D9',
    textDark: '#1E1E1E',
    textMuted: '#717171',
    textWhite: '#FFFFFF',
    border: 'rgba(26, 59, 175, 0.5)',
    borderLight: '#E5E7EB',
    badgeGreen: '#E8F5E9',
    badgeGreenText: '#2E7D32',
    badgeOrange: '#FFF3E0',
    badgeOrangeText: '#EF6C00',
    badgeBlue: '#E3F2FD',
    badgeBlueText: '#1565C0',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    heroTitle: 'text-2xl font-bold',
    screenTitle: 'text-2xl font-bold text-[#1E1E1E]',
    statNumber: 'text-[28px] font-bold leading-tight text-[#1E1E1E]',
    cardTitle: 'text-base font-semibold text-[#1E1E1E]',
    body: 'text-sm font-normal text-[#1E1E1E]',
    small: 'text-xs font-normal text-[#1E1E1E]',
  },
  borderRadius: {
    card: 'rounded-lg', // 8px
    button: 'rounded-lg', // 8px
    badge: 'rounded-full', // 20px
    circle: 'rounded-full',
  },
  shadow: {
    card: 'shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
    drawer: 'shadow-[0_-4px_16px_rgba(0,0,0,0.12)]',
    floating: 'shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
  },
  viewport: {
    width: 402,
    height: 874,
  }
} as const;
