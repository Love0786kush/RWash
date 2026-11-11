// Comprehensive Dynamic Theme & Appearance Engine for RWash Admin
// Supports:
// 1. Dynamic Colors for Every Element (Primary, Canvas BG, Card Surface, Border, Text Primary, Text Secondary, Accent/Button, Header, Sidebar)
// 2. Dynamic Typography (Heading Font, Body Font, Font Scaling, Font Weight, Letter Spacing)
// 3. Dynamic Card Styling (Corner Radius, Border Width, Shadow Depth, Glassmorphism)
// 4. Instant Realtime Database Sync across Client and Admin

export interface ThemeColors {
  primary: string;       // Main brand accent / buttons / active states
  bg: string;            // Page canvas background
  card: string;          // Cards, containers, modals
  border: string;        // Borders, dividers, outlines
  textPrimary: string;   // Main headings and titles
  textSecondary: string; // Subtitles, captions, descriptions
  accent: string;        // Accent highlights, badges
  btn: string;           // Primary CTA button background
  headerBg?: string;     // Header / navbar background
  sidebarBg?: string;    // Sidebar background
}

export interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  fontScale: 'compact' | 'normal' | 'spacious';
  headingWeight: '700' | '800' | '900';
  letterSpacing: 'tight' | 'normal' | 'wide';
}

export interface CardStyleConfig {
  radius: 'sharp' | 'rounded' | 'extra-rounded' | 'ultra' | 'pill';
  borderWidth: 'none' | 'thin' | 'normal' | 'thick';
  shadow: 'none' | 'soft' | 'elevated' | 'glow';
  glassmorphism: boolean;
}

export interface ThemeConfig {
  presetName?: string;
  light: ThemeColors;
  dark: ThemeColors;
  typography?: TypographyConfig;
  cardStyle?: CardStyleConfig;
}

export const AVAILABLE_HEADING_FONTS = [
  'Sora',
  'Plus Jakarta Sans',
  'Outfit',
  'Poppins',
  'Inter',
  'Montserrat',
  'Playfair Display',
  'Cinzel',
  'Urbanist',
  'Syne',
  'Righteous',
]

export const AVAILABLE_BODY_FONTS = [
  'Plus Jakarta Sans',
  'Inter',
  'Roboto',
  'Poppins',
  'DM Sans',
  'Nunito',
  'Outfit',
  'Open Sans',
]

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  headingFont: 'Sora',
  bodyFont: 'Plus Jakarta Sans',
  fontScale: 'normal',
  headingWeight: '800',
  letterSpacing: 'tight',
}

export const DEFAULT_CARD_STYLE: CardStyleConfig = {
  radius: 'extra-rounded',
  borderWidth: 'thin',
  shadow: 'soft',
  glassmorphism: false,
}

export const THEME_PRESETS: Record<string, ThemeConfig> = {
  Brown: {
    presetName: 'Luxury Bronze',
    light: {
      primary: '#8C471E',
      bg: '#FFF8F0',
      card: '#FFFFFF',
      border: '#E6CBB2',
      textPrimary: '#3D1E0B',
      textSecondary: '#542E16',
      accent: '#A65D2E',
      btn: '#8C471E',
      headerBg: '#FFFFFF',
      sidebarBg: '#FFF8F0',
    },
    dark: {
      primary: '#E69D62',
      bg: '#120702',
      card: '#210E04',
      border: '#52270D',
      textPrimary: '#FFF5EB',
      textSecondary: '#E8C8AE',
      accent: '#E69D62',
      btn: '#A65D2E',
      headerBg: '#210E04',
      sidebarBg: '#120702',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Sora' },
    cardStyle: { ...DEFAULT_CARD_STYLE },
  },
  Blue: {
    presetName: 'Royal Sapphire',
    light: {
      primary: '#1D4ED8',
      bg: '#F0F6FF',
      card: '#FFFFFF',
      border: '#BFDBFE',
      textPrimary: '#0F172A',
      textSecondary: '#1E3A8A',
      accent: '#3B82F6',
      btn: '#1D4ED8',
      headerBg: '#FFFFFF',
      sidebarBg: '#F0F6FF',
    },
    dark: {
      primary: '#60A5FA',
      bg: '#0A0F1D',
      card: '#131B2E',
      border: '#1E293B',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      accent: '#38BDF8',
      btn: '#2563EB',
      headerBg: '#131B2E',
      sidebarBg: '#0A0F1D',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Outfit' },
    cardStyle: { ...DEFAULT_CARD_STYLE, radius: 'extra-rounded' },
  },
  Emerald: {
    presetName: 'Emerald Forest',
    light: {
      primary: '#047857',
      bg: '#F0FDF4',
      card: '#FFFFFF',
      border: '#A7F3D0',
      textPrimary: '#064E3B',
      textSecondary: '#065F46',
      accent: '#10B981',
      btn: '#047857',
      headerBg: '#FFFFFF',
      sidebarBg: '#F0FDF4',
    },
    dark: {
      primary: '#34D399',
      bg: '#02180F',
      card: '#082619',
      border: '#0F3F2A',
      textPrimary: '#ECFDF5',
      textSecondary: '#A7F3D0',
      accent: '#34D399',
      btn: '#059669',
      headerBg: '#082619',
      sidebarBg: '#02180F',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Urbanist' },
    cardStyle: { ...DEFAULT_CARD_STYLE },
  },
  Ruby: {
    presetName: 'Velvet Crimson',
    light: {
      primary: '#BE123C',
      bg: '#FFF1F2',
      card: '#FFFFFF',
      border: '#FECDD3',
      textPrimary: '#4C0519',
      textSecondary: '#881337',
      accent: '#F43F5E',
      btn: '#BE123C',
      headerBg: '#FFFFFF',
      sidebarBg: '#FFF1F2',
    },
    dark: {
      primary: '#FB7185',
      bg: '#170308',
      card: '#290610',
      border: '#4C0519',
      textPrimary: '#FFF1F2',
      textSecondary: '#FDA4AF',
      accent: '#FB7185',
      btn: '#E11D48',
      headerBg: '#290610',
      sidebarBg: '#170308',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Playfair Display' },
    cardStyle: { ...DEFAULT_CARD_STYLE, shadow: 'elevated' },
  },
  Purple: {
    presetName: 'Midnight Amethyst',
    light: {
      primary: '#7C3AED',
      bg: '#FAF5FF',
      card: '#FFFFFF',
      border: '#E9D5FF',
      textPrimary: '#3B0764',
      textSecondary: '#581C87',
      accent: '#8B5CF6',
      btn: '#7C3AED',
      headerBg: '#FFFFFF',
      sidebarBg: '#FAF5FF',
    },
    dark: {
      primary: '#A78BFA',
      bg: '#100521',
      card: '#1F0B3D',
      border: '#3B0764',
      textPrimary: '#FAF5FF',
      textSecondary: '#D8B4FE',
      accent: '#C084FC',
      btn: '#8B5CF6',
      headerBg: '#1F0B3D',
      sidebarBg: '#100521',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Poppins' },
    cardStyle: { ...DEFAULT_CARD_STYLE, shadow: 'glow' },
  },
  Sunset: {
    presetName: 'Sunset Amber',
    light: {
      primary: '#EA580C',
      bg: '#FFF7ED',
      card: '#FFFFFF',
      border: '#FED7AA',
      textPrimary: '#431407',
      textSecondary: '#7C2D12',
      accent: '#F97316',
      btn: '#EA580C',
      headerBg: '#FFFFFF',
      sidebarBg: '#FFF7ED',
    },
    dark: {
      primary: '#FB923C',
      bg: '#180802',
      card: '#2E1105',
      border: '#431407',
      textPrimary: '#FFF7ED',
      textSecondary: '#FDBA74',
      accent: '#FB923C',
      btn: '#EA580C',
      headerBg: '#2E1105',
      sidebarBg: '#180802',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Montserrat' },
    cardStyle: { ...DEFAULT_CARD_STYLE },
  },
  Stealth: {
    presetName: 'Stealth Obsidian',
    light: {
      primary: '#1E293B',
      bg: '#F8FAFC',
      card: '#FFFFFF',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      accent: '#475569',
      btn: '#1E293B',
      headerBg: '#FFFFFF',
      sidebarBg: '#F8FAFC',
    },
    dark: {
      primary: '#94A3B8',
      bg: '#0B0F19',
      card: '#151D2C',
      border: '#1E293B',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
      accent: '#94A3B8',
      btn: '#334155',
      headerBg: '#151D2C',
      sidebarBg: '#0B0F19',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Inter' },
    cardStyle: { ...DEFAULT_CARD_STYLE, radius: 'rounded' },
  },
  Neon: {
    presetName: 'Cyberpunk Teal',
    light: {
      primary: '#0D9488',
      bg: '#F0FDFA',
      card: '#FFFFFF',
      border: '#99F6E4',
      textPrimary: '#134E4A',
      textSecondary: '#115E59',
      accent: '#14B8A6',
      btn: '#0D9488',
      headerBg: '#FFFFFF',
      sidebarBg: '#F0FDFA',
    },
    dark: {
      primary: '#2DD4BF',
      bg: '#041716',
      card: '#092422',
      border: '#115E59',
      textPrimary: '#F0FDFA',
      textSecondary: '#99F6E4',
      accent: '#2DD4BF',
      btn: '#0D9488',
      headerBg: '#092422',
      sidebarBg: '#041716',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Syne' },
    cardStyle: { ...DEFAULT_CARD_STYLE, shadow: 'glow', glassmorphism: true },
  },
  RoseGold: {
    presetName: 'Rose Gold Luxury',
    light: {
      primary: '#BE5B6C',
      bg: '#FFF8F9',
      card: '#FFFFFF',
      border: '#F8D7DC',
      textPrimary: '#4C1D24',
      textSecondary: '#7A323E',
      accent: '#D47B8B',
      btn: '#BE5B6C',
      headerBg: '#FFFFFF',
      sidebarBg: '#FFF8F9',
    },
    dark: {
      primary: '#E598A5',
      bg: '#1A0B0E',
      card: '#2A1318',
      border: '#53232C',
      textPrimary: '#FFF5F6',
      textSecondary: '#F0C2C9',
      accent: '#E598A5',
      btn: '#C7697A',
      headerBg: '#2A1318',
      sidebarBg: '#1A0B0E',
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Cinzel' },
    cardStyle: { ...DEFAULT_CARD_STYLE, shadow: 'elevated' },
  },
}

// ─── Color Utilities ───

function hexToRgb(hex: string): [number, number, number] {
  let c = (hex || '').replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  if (c.length !== 6) return [140, 71, 30] // fallback
  const num = parseInt(c, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
}

export function mix(hex1: string, hex2: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  const w = Math.max(0, Math.min(1, weight))
  return rgbToHex(r1 * (1 - w) + r2 * w, g1 * (1 - w) + g2 * w, b1 * (1 - w) + b2 * w)
}

export function generateShades(primaryHex: string, bgLightHex = '#FFF8F0', bgDarkHex = '#120702') {
  return {
    '50': mix(primaryHex, bgLightHex, 0.9),
    '100': mix(primaryHex, bgLightHex, 0.8),
    '200': mix(primaryHex, bgLightHex, 0.6),
    '300': mix(primaryHex, bgLightHex, 0.4),
    '400': mix(primaryHex, '#FFFFFF', 0.2),
    '405': mix(primaryHex, '#FFFFFF', 0.1),
    '500': primaryHex,
    '600': mix(primaryHex, '#000000', 0.15),
    '655': mix(primaryHex, '#000000', 0.25),
    '700': mix(primaryHex, '#000000', 0.35),
    '750': mix(primaryHex, '#000000', 0.45),
    '755': mix(primaryHex, '#000000', 0.55),
    '800': mix(primaryHex, bgDarkHex, 0.65),
    '900': mix(primaryHex, bgDarkHex, 0.8),
    '950': bgDarkHex,
  }
}

// ─── Build Custom Theme Configuration ───
export function buildCustomConfig(
  lightPartial: Partial<ThemeColors> | string,
  bgLightOrDarkPartial?: Partial<ThemeColors> | string,
  dpHex?: string,
  dbHex?: string,
  typography?: TypographyConfig,
  cardStyle?: CardStyleConfig
): ThemeConfig {
  let light: ThemeColors
  let dark: ThemeColors

  if (typeof lightPartial === 'string') {
    const lp = lightPartial
    const lb = (bgLightOrDarkPartial as string) || '#FFF8F0'
    const dp = dpHex || '#E69D62'
    const db = dbHex || '#120702'

    light = {
      primary: lp,
      bg: lb,
      card: '#FFFFFF',
      border: mix(lp, lb, 0.82),
      textPrimary: mix(lp, '#000000', 0.6),
      textSecondary: mix(lp, '#000000', 0.32),
      accent: mix(lp, '#FFFFFF', 0.12),
      btn: lp,
      headerBg: '#FFFFFF',
      sidebarBg: lb,
    }
    dark = {
      primary: dp,
      bg: db,
      card: mix(db, '#FFFFFF', 0.07),
      border: mix(db, dp, 0.28),
      textPrimary: mix(db, '#FFFFFF', 0.93),
      textSecondary: mix(dp, '#FFFFFF', 0.45),
      accent: dp,
      btn: dp,
      headerBg: mix(db, '#FFFFFF', 0.07),
      sidebarBg: db,
    }
  } else {
    const l = lightPartial as Partial<ThemeColors>
    const d = (bgLightOrDarkPartial as Partial<ThemeColors>) || {}
    const lp = l.primary || '#8C471E'
    const lb = l.bg || '#FFF8F0'
    const dp = d.primary || '#E69D62'
    const db = d.bg || '#120702'

    light = {
      primary: lp,
      bg: lb,
      card: l.card || '#FFFFFF',
      border: l.border || mix(lp, lb, 0.82),
      textPrimary: l.textPrimary || mix(lp, '#000000', 0.6),
      textSecondary: l.textSecondary || mix(lp, '#000000', 0.32),
      accent: l.accent || lp,
      btn: l.btn || lp,
      headerBg: l.headerBg || l.card || '#FFFFFF',
      sidebarBg: l.sidebarBg || lb,
    }

    dark = {
      primary: dp,
      bg: db,
      card: d.card || mix(db, '#FFFFFF', 0.07),
      border: d.border || mix(db, dp, 0.28),
      textPrimary: d.textPrimary || mix(db, '#FFFFFF', 0.93),
      textSecondary: d.textSecondary || mix(dp, '#FFFFFF', 0.45),
      accent: d.accent || dp,
      btn: d.btn || dp,
      headerBg: d.headerBg || d.card || mix(db, '#FFFFFF', 0.07),
      sidebarBg: d.sidebarBg || db,
    }
  }

  return {
    presetName: 'Custom',
    light,
    dark,
    typography: typography || DEFAULT_TYPOGRAPHY,
    cardStyle: cardStyle || DEFAULT_CARD_STYLE,
  }
}

// ─── Dynamic Font Loader ───
export function loadGoogleFonts(headingFont: string, bodyFont: string) {
  if (typeof document === 'undefined') return
  const fonts = Array.from(new Set([headingFont, bodyFont])).filter(Boolean)
  if (!fonts.length) return

  const fontQuery = fonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800;900`).join('&')
  const href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`

  let link = document.getElementById('rwash-dynamic-fonts') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = 'rwash-dynamic-fonts'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) {
    link.href = href
  }
}

// ─── Main Theme Applicator ───
export const applyTheme = (themeInput: string | ThemeConfig | any) => {
  if (typeof document === 'undefined') return
  if (!themeInput) themeInput = 'Brown'

  let config: ThemeConfig

  if (typeof themeInput === 'string') {
    config = THEME_PRESETS[themeInput] || THEME_PRESETS.Brown
  } else if (themeInput.light && themeInput.dark) {
    config = themeInput
  } else if (themeInput.theme_config) {
    config = themeInput.theme_config
  } else if (themeInput.theme_color && THEME_PRESETS[themeInput.theme_color]) {
    config = THEME_PRESETS[themeInput.theme_color]
  } else {
    config = THEME_PRESETS.Brown
  }

  const root = document.documentElement
  const L = config.light
  const D = config.dark
  const typo = config.typography || DEFAULT_TYPOGRAPHY
  const cardSt = config.cardStyle || DEFAULT_CARD_STYLE

  // 1. Load Dynamic Google Fonts
  loadGoogleFonts(typo.headingFont, typo.bodyFont)

  // 2. Cache theme config for zero-flash boot
  try {
    localStorage.setItem('rwash_theme_config', JSON.stringify(config))
  } catch { /* ignore */ }

  // 3. Set Color CSS Variables
  root.style.setProperty('--theme-p', L.primary)
  root.style.setProperty('--theme-bg', L.bg)
  root.style.setProperty('--theme-card', L.card)
  root.style.setProperty('--theme-border', L.border)
  root.style.setProperty('--theme-text', L.textPrimary)
  root.style.setProperty('--theme-text2', L.textSecondary)
  root.style.setProperty('--theme-accent', L.accent)
  root.style.setProperty('--theme-btn', L.btn)
  root.style.setProperty('--theme-header-bg', L.headerBg || L.card)
  root.style.setProperty('--theme-sidebar-bg', L.sidebarBg || L.bg)

  root.style.setProperty('--theme-dp', D.primary)
  root.style.setProperty('--theme-dbg', D.bg)
  root.style.setProperty('--theme-dcard', D.card)
  root.style.setProperty('--theme-dborder', D.border)
  root.style.setProperty('--theme-dtext', D.textPrimary)
  root.style.setProperty('--theme-dtext2', D.textSecondary)
  root.style.setProperty('--theme-daccent', D.accent)
  root.style.setProperty('--theme-dbtn', D.btn)
  root.style.setProperty('--theme-dheader-bg', D.headerBg || D.card)
  root.style.setProperty('--theme-dsidebar-bg', D.sidebarBg || D.bg)

  // Legacy variables for backward compat
  root.style.setProperty('--bg-light', L.bg)
  root.style.setProperty('--card-light', L.card)
  root.style.setProperty('--border-light', L.border)
  root.style.setProperty('--text-light-primary', L.textPrimary)
  root.style.setProperty('--text-light-secondary', L.textSecondary)
  root.style.setProperty('--accent-light', L.accent)
  root.style.setProperty('--btn-light', L.btn)
  root.style.setProperty('--bg-dark', D.bg)
  root.style.setProperty('--card-dark', D.card)
  root.style.setProperty('--border-dark', D.border)
  root.style.setProperty('--text-dark-primary', D.textPrimary)
  root.style.setProperty('--text-dark-secondary', D.textSecondary)
  root.style.setProperty('--accent-dark', D.accent)
  root.style.setProperty('--btn-dark', D.btn)

  // Primary Shades
  const shades = generateShades(L.primary, L.bg, D.bg)
  Object.entries(shades).forEach(([shade, hex]) => {
    root.style.setProperty(`--primary-${shade}`, hex)
    root.style.setProperty(`--color-primary-${shade}`, hex)
  })

  // 4. Set Typography Variables
  const fontScaleMap = { compact: '0.92', normal: '1.0', spacious: '1.08' }
  const fontTrackingMap = { tight: '-0.025em', normal: '0em', wide: '0.04em' }
  root.style.setProperty('--font-heading', `"${typo.headingFont}", sans-serif`)
  root.style.setProperty('--font-body', `"${typo.bodyFont}", sans-serif`)
  root.style.setProperty('--font-scale', fontScaleMap[typo.fontScale] || '1.0')
  root.style.setProperty('--font-heading-weight', typo.headingWeight || '800')
  root.style.setProperty('--font-heading-tracking', fontTrackingMap[typo.letterSpacing] || '-0.02em')

  // 5. Set Card Style Variables
  const radiusMap = {
    sharp: '6px',
    rounded: '12px',
    'extra-rounded': '22px',
    ultra: '32px',
    pill: '9999px',
  }
  const borderWidthMap = {
    none: '0px',
    thin: '1px',
    normal: '2px',
    thick: '3px',
  }
  const shadowMap = {
    none: 'none',
    soft: '0 4px 16px -2px rgba(0, 0, 0, 0.05)',
    elevated: '0 12px 32px -4px rgba(0, 0, 0, 0.12)',
    glow: `0 8px 30px ${L.primary}33`,
  }
  root.style.setProperty('--card-radius', radiusMap[cardSt.radius] || '22px')
  root.style.setProperty('--card-border-width', borderWidthMap[cardSt.borderWidth] || '1px')
  root.style.setProperty('--card-shadow', shadowMap[cardSt.shadow] || shadowMap.soft)
  root.style.setProperty('--card-backdrop', cardSt.glassmorphism ? 'blur(16px)' : 'none')

  // 6. Build and inject CSS overrides
  const p = L.primary
  const bg = L.bg
  const card = L.card
  const brd = L.border
  const txt = L.textPrimary
  const txt2 = L.textSecondary
  const dp = D.primary
  const dbg = D.bg
  const dcard = D.card
  const dbrd = D.border
  const dtxt = D.textPrimary
  const dtxt2 = D.textSecondary

  let styleEl = document.getElementById('rwash-dynamic-theme') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'rwash-dynamic-theme'
    document.head.appendChild(styleEl)
  }

  let css = ''

  // Typography global application
  css += `html { font-size: calc(16px * var(--font-scale, 1)); }\n`
  css += `body, button, input, textarea, select, a, p, span, div, label { font-family: var(--font-body, "Plus Jakarta Sans", sans-serif) !important; }\n`
  css += `h1, h2, h3, h4, h5, h6, .font-display { font-family: var(--font-heading, "Sora", sans-serif) !important; font-weight: var(--font-heading-weight, 800) !important; letter-spacing: var(--font-heading-tracking, -0.02em) !important; line-height: 1.25; }\n`

  // Card styling global application
  css += `[class*="rounded-3xl"], [class*="rounded-2xl"], [class*="rounded-xl"] { border-radius: var(--card-radius, 22px) !important; }\n`
  css += `[class*="shadow-"] { box-shadow: var(--card-shadow) !important; }\n`
  if (cardSt.glassmorphism) {
    css += `[class*="bg-white"]:not([class*="bg-white/"]), html.dark [class*="bg-[#210E04]"], html.dark [class*="bg-[#131B2E]"], html.dark [class*="bg-[#082619]"], html.dark [class*="bg-[#290610]"], html.dark [class*="bg-[#1F0B3D]"] { backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important; }\n`
  }

  // Base canvas colors
  css += `html, body, #root { background-color: ${bg} !important; color: ${txt} !important; }\n`
  css += `html.dark, html.dark body, html.dark #root { background-color: ${dbg} !important; color: ${dtxt} !important; }\n`
  css += `aside, [class*="sidebar"] { background-color: ${L.sidebarBg || bg} !important; border-color: ${brd} !important; }\n`
  css += `html.dark aside, html.dark [class*="sidebar"] { background-color: ${D.sidebarBg || dbg} !important; border-color: ${dbrd} !important; }\n`
  css += `header, [class*="header"] { background-color: ${L.headerBg || card} !important; border-color: ${brd} !important; }\n`
  css += `html.dark header, html.dark [class*="header"] { background-color: ${D.headerBg || dcard} !important; border-color: ${dbrd} !important; }\n`

  // Cards surface overrides
  css += `[class*="bg-white"]:not([class*="bg-white/"]) { background-color: ${card} !important; }\n`
  css += `html.dark [class*="bg-white"]:not([class*="bg-white/"]) { background-color: ${dcard} !important; }\n`
  css += `[class*="bg-[#FFF8F0]"], [class*="bg-[#FAF6F0]"], [class*="bg-[#FFF1F2]"], [class*="bg-[#F0F6FF]"], [class*="bg-[#F0FDF4]"], [class*="bg-[#FAF5FF]"], [class*="bg-[#FFF7ED]"], [class*="bg-[#F8FAFC]"] { background-color: ${bg} !important; }\n`
  css += `html.dark [class*="bg-[#120702]"], html.dark [class*="bg-[#0A0F1D]"], html.dark [class*="bg-[#02180F]"], html.dark [class*="bg-[#170308]"], html.dark [class*="bg-[#100521]"], html.dark [class*="bg-[#180802]"], html.dark [class*="bg-[#0B0F19]"] { background-color: ${dbg} !important; }\n`
  css += `html.dark [class*="bg-[#210E04]"], html.dark [class*="bg-[#131B2E]"], html.dark [class*="bg-[#082619]"], html.dark [class*="bg-[#290610]"], html.dark [class*="bg-[#1F0B3D]"], html.dark [class*="bg-[#2E1105]"], html.dark [class*="bg-[#151D2C]"] { background-color: ${dcard} !important; }\n`

  // Buttons & accents
  css += `[class*="bg-[#8C471E]"], [class*="bg-[#A65D2E]"], [class*="bg-[#BE123C]"], [class*="bg-[#1D4ED8]"], [class*="bg-[#047857]"], [class*="bg-[#7C3AED]"], [class*="bg-[#EA580C]"] { background-color: ${p} !important; border-color: ${p} !important; color: #fff !important; }\n`
  css += `[class*="text-[#8C471E]"], [class*="text-[#BE123C]"], [class*="text-[#1D4ED8]"], [class*="text-[#047857]"], [class*="text-[#7C3AED]"], [class*="text-[#EA580C]"] { color: ${p} !important; }\n`
  
  // Primary Text (Headings)
  css += `[class*="text-[#3D1E0B]"], [class*="text-[#4C0519]"], [class*="text-[#0F172A]"], [class*="text-[#064E3B]"], [class*="text-[#3B0764]"], [class*="text-[#431407]"] { color: ${txt} !important; }\n`
  css += `h1, h2, h3, h4, h5, h6, .font-display { color: ${txt} !important; }\n`
  
  // Secondary Text (Descriptions & Subtitles)
  css += `[class*="text-[#542E16]"], [class*="text-[#7A3B14]"], [class*="text-[#881337]"], [class*="text-[#1E3A8A]"], [class*="text-[#065F46]"], [class*="text-[#581C87]"], [class*="text-[#7C2D12]"] { color: ${txt2} !important; }\n`
  
  // Dark mode text
  css += `html.dark [class*="text-[#E69D62]"], html.dark [class*="text-[#FB7185]"], html.dark [class*="text-[#60A5FA]"], html.dark [class*="text-[#34D399]"], html.dark [class*="text-[#A78BFA]"], html.dark [class*="text-[#FB923C]"] { color: ${dp} !important; }\n`
  css += `html.dark [class*="text-[#FFF5EB]"], html.dark [class*="text-[#FFF1F2]"], html.dark [class*="text-[#F8FAFC]"], html.dark [class*="text-[#ECFDF5]"], html.dark [class*="text-[#FAF5FF]"], html.dark [class*="text-[#FFF7ED]"] { color: ${dtxt} !important; }\n`
  css += `html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark h5, html.dark h6, html.dark .font-display { color: ${dtxt} !important; }\n`
  css += `html.dark [class*="text-[#E8C8AE]"], html.dark [class*="text-[#FDA4AF]"], html.dark [class*="text-[#94A3B8]"], html.dark [class*="text-[#A7F3D0]"], html.dark [class*="text-[#D8B4FE]"], html.dark [class*="text-[#FDBA74]"], html.dark [class*="text-[#CBD5E1]"] { color: ${dtxt2} !important; }\n`

  // Borders
  css += `[class*="border-[#E6CBB2]"], [class*="border-[#FECDD3]"], [class*="border-[#BFDBFE]"], [class*="border-[#A7F3D0]"], [class*="border-[#E9D5FF]"], [class*="border-[#FED7AA]"], [class*="border-[#E2E8F0]"] { border-color: ${brd} !important; }\n`
  css += `html.dark [class*="border-[#52270D]"], html.dark [class*="border-[#4C0519]"], html.dark [class*="border-[#1E293B]"], html.dark [class*="border-[#0F3F2A]"], html.dark [class*="border-[#3B0764]"], html.dark [class*="border-[#431407]"] { border-color: ${dbrd} !important; }\n`

  // Form controls
  css += `input[type=checkbox], input[type=radio] { accent-color: ${p} !important; }\n`

  // Gradients
  css += `[class*="from-[#8C471E]"], [class*="from-[#BE123C]"], [class*="from-[#1D4ED8]"], [class*="from-[#047857]"], [class*="from-[#7C3AED]"], [class*="from-[#EA580C]"] { --tw-gradient-from: ${p} !important; }\n`
  css += `[class*="to-[#210E04]"], [class*="to-[#290610]"], [class*="to-[#0A0F1D]"], [class*="to-[#02180F]"] { --tw-gradient-to: ${dbg} !important; }\n`

  styleEl.textContent = css

  // Browser meta theme color
  let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
  if (!metaTheme) {
    metaTheme = document.createElement('meta')
    metaTheme.name = 'theme-color'
    document.head.appendChild(metaTheme)
  }
  const isDark = root.classList.contains('dark')
  metaTheme.content = isDark ? D.bg : L.bg
}
