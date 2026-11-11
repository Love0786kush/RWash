// Comprehensive Dynamic Theme Manager for RWash Client
// Injects a live <style> tag to override ALL hardcoded hex colors in the app.
// Supports 7 presets + Custom. Synced from Admin DB in real-time.

export interface ThemeColors {
  primary: string;
  bg: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  btn: string;
  headerBg?: string;
  sidebarBg?: string;
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
    light: { primary: '#8C471E', bg: '#FFF8F0', card: '#FFFFFF', border: '#E6CBB2', textPrimary: '#3D1E0B', textSecondary: '#542E16', accent: '#A65D2E', btn: '#8C471E', headerBg: '#FFFFFF', sidebarBg: '#FFF8F0' },
    dark:  { primary: '#E69D62', bg: '#120702', card: '#210E04', border: '#52270D', textPrimary: '#FFF5EB', textSecondary: '#E8C8AE', accent: '#E69D62', btn: '#A65D2E', headerBg: '#210E04', sidebarBg: '#120702' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Sora' },
    cardStyle: { ...DEFAULT_CARD_STYLE },
  },
  Blue: {
    presetName: 'Royal Sapphire',
    light: { primary: '#1D4ED8', bg: '#F0F6FF', card: '#FFFFFF', border: '#BFDBFE', textPrimary: '#0F172A', textSecondary: '#1E3A8A', accent: '#3B82F6', btn: '#1D4ED8', headerBg: '#FFFFFF', sidebarBg: '#F0F6FF' },
    dark:  { primary: '#60A5FA', bg: '#0A0F1D', card: '#131B2E', border: '#1E293B', textPrimary: '#F8FAFC', textSecondary: '#94A3B8', accent: '#38BDF8', btn: '#2563EB', headerBg: '#131B2E', sidebarBg: '#0A0F1D' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Outfit' },
    cardStyle: { ...DEFAULT_CARD_STYLE, radius: 'extra-rounded' },
  },
  Emerald: {
    presetName: 'Emerald Forest',
    light: { primary: '#047857', bg: '#F0FDF4', card: '#FFFFFF', border: '#A7F3D0', textPrimary: '#064E3B', textSecondary: '#065F46', accent: '#10B981', btn: '#047857', headerBg: '#FFFFFF', sidebarBg: '#F0FDF4' },
    dark:  { primary: '#34D399', bg: '#02180F', card: '#082619', border: '#0F3F2A', textPrimary: '#ECFDF5', textSecondary: '#A7F3D0', accent: '#34D399', btn: '#059669', headerBg: '#082619', sidebarBg: '#02180F' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Urbanist' },
    cardStyle: { ...DEFAULT_CARD_STYLE },
  },
  Ruby: {
    presetName: 'Velvet Crimson',
    light: { primary: '#BE123C', bg: '#FFF1F2', card: '#FFFFFF', border: '#FECDD3', textPrimary: '#4C0519', textSecondary: '#881337', accent: '#F43F5E', btn: '#BE123C', headerBg: '#FFFFFF', sidebarBg: '#FFF1F2' },
    dark:  { primary: '#FB7185', bg: '#170308', card: '#290610', border: '#4C0519', textPrimary: '#FFF1F2', textSecondary: '#FDA4AF', accent: '#FB7185', btn: '#E11D48', headerBg: '#290610', sidebarBg: '#170308' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Playfair Display' },
    cardStyle: { ...DEFAULT_CARD_STYLE, shadow: 'elevated' },
  },
  Purple: {
    presetName: 'Midnight Amethyst',
    light: { primary: '#7C3AED', bg: '#FAF5FF', card: '#FFFFFF', border: '#E9D5FF', textPrimary: '#3B0764', textSecondary: '#581C87', accent: '#8B5CF6', btn: '#7C3AED', headerBg: '#FFFFFF', sidebarBg: '#FAF5FF' },
    dark:  { primary: '#A78BFA', bg: '#100521', card: '#1F0B3D', border: '#3B0764', textPrimary: '#FAF5FF', textSecondary: '#D8B4FE', accent: '#C084FC', btn: '#8B5CF6', headerBg: '#1F0B3D', sidebarBg: '#100521' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Poppins' },
    cardStyle: { ...DEFAULT_CARD_STYLE, shadow: 'glow' },
  },
  Sunset: {
    presetName: 'Sunset Amber',
    light: { primary: '#EA580C', bg: '#FFF7ED', card: '#FFFFFF', border: '#FED7AA', textPrimary: '#431407', textSecondary: '#7C2D12', accent: '#F97316', btn: '#EA580C', headerBg: '#FFFFFF', sidebarBg: '#FFF7ED' },
    dark:  { primary: '#FB923C', bg: '#180802', card: '#2E1105', border: '#431407', textPrimary: '#FFF7ED', textSecondary: '#FDBA74', accent: '#FB923C', btn: '#EA580C', headerBg: '#2E1105', sidebarBg: '#180802' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Montserrat' },
    cardStyle: { ...DEFAULT_CARD_STYLE },
  },
  Stealth: {
    presetName: 'Stealth Obsidian',
    light: { primary: '#1E293B', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', textPrimary: '#0F172A', textSecondary: '#334155', accent: '#475569', btn: '#1E293B', headerBg: '#FFFFFF', sidebarBg: '#F8FAFC' },
    dark:  { primary: '#94A3B8', bg: '#0B0F19', card: '#151D2C', border: '#1E293B', textPrimary: '#F8FAFC', textSecondary: '#CBD5E1', accent: '#94A3B8', btn: '#334155', headerBg: '#151D2C', sidebarBg: '#0B0F19' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Inter' },
    cardStyle: { ...DEFAULT_CARD_STYLE, radius: 'rounded' },
  },
  Neon: {
    presetName: 'Cyberpunk Teal',
    light: { primary: '#0D9488', bg: '#F0FDFA', card: '#FFFFFF', border: '#99F6E4', textPrimary: '#134E4A', textSecondary: '#115E59', accent: '#14B8A6', btn: '#0D9488', headerBg: '#FFFFFF', sidebarBg: '#F0FDFA' },
    dark:  { primary: '#2DD4BF', bg: '#041716', card: '#092422', border: '#115E59', textPrimary: '#F0FDFA', textSecondary: '#99F6E4', accent: '#2DD4BF', btn: '#0D9488', headerBg: '#092422', sidebarBg: '#041716' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Syne' },
    cardStyle: { ...DEFAULT_CARD_STYLE, shadow: 'glow', glassmorphism: true },
  },
  RoseGold: {
    presetName: 'Rose Gold Luxury',
    light: { primary: '#BE5B6C', bg: '#FFF8F9', card: '#FFFFFF', border: '#F8D7DC', textPrimary: '#4C1D24', textSecondary: '#7A323E', accent: '#D47B8B', btn: '#BE5B6C', headerBg: '#FFFFFF', sidebarBg: '#FFF8F9' },
    dark:  { primary: '#E598A5', bg: '#1A0B0E', card: '#2A1318', border: '#53232C', textPrimary: '#FFF5F6', textSecondary: '#F0C2C9', accent: '#E598A5', btn: '#C7697A', headerBg: '#2A1318', sidebarBg: '#1A0B0E' },
    typography: { ...DEFAULT_TYPOGRAPHY, headingFont: 'Cinzel' },
    cardStyle: { ...DEFAULT_CARD_STYLE, shadow: 'elevated' },
  },
}

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

// ─── Color Utilities ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const num = parseInt(c, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
}

function mix(hex1: string, hex2: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  const w = Math.max(0, Math.min(1, weight))
  return rgbToHex(r1 * (1 - w) + r2 * w, g1 * (1 - w) + g2 * w, b1 * (1 - w) + b2 * w)
}

function lighten(hex: string, amount: number) { return mix(hex, '#FFFFFF', amount) }
function darken(hex: string, amount: number)  { return mix(hex, '#000000', amount) }

export function generateShades(primaryHex: string, bgLightHex = '#FFF8F0', bgDarkHex = '#120702') {
  return {
    '50':  mix(primaryHex, bgLightHex, 0.9),
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

// ─── Main Theme Applicator ────────────────────────────────────────────────────

export const applyTheme = (themeInput: string | ThemeConfig | any) => {
  if (!themeInput) themeInput = 'Brown'

  let config: ThemeConfig
  if (typeof themeInput === 'string') {
    config = THEME_PRESETS[themeInput] || THEME_PRESETS.Brown
  } else if (themeInput?.light && themeInput?.dark) {
    config = themeInput
  } else if (themeInput?.theme_config?.light) {
    config = themeInput.theme_config
  } else if (themeInput?.theme_color && THEME_PRESETS[themeInput.theme_color]) {
    config = THEME_PRESETS[themeInput.theme_color]
  } else {
    config = THEME_PRESETS.Brown
  }

  const root = document.documentElement

  // Cache the resolved theme so the inline boot script in index.html can paint
  // the correct brand colors instantly on next load (no brown flash / FOUC).
  try {
    localStorage.setItem('rwash_theme_config', JSON.stringify(config))
  } catch { /* storage may be unavailable */ }

  // ── 1. Set CSS Custom Properties ──────────────────────────────────────────
  const L = config.light
  const D = config.dark

  root.style.setProperty('--theme-p',          L.primary)
  root.style.setProperty('--theme-bg',         L.bg)
  root.style.setProperty('--theme-card',       L.card)
  root.style.setProperty('--theme-border',     L.border)
  root.style.setProperty('--theme-text',       L.textPrimary)
  root.style.setProperty('--theme-text2',      L.textSecondary)
  root.style.setProperty('--theme-accent',     L.accent)
  root.style.setProperty('--theme-btn',        L.btn)
  root.style.setProperty('--theme-header-bg',   L.headerBg || L.card)
  root.style.setProperty('--theme-sidebar-bg',  L.sidebarBg || L.bg)

  root.style.setProperty('--theme-dp',         D.primary)
  root.style.setProperty('--theme-dbg',        D.bg)
  root.style.setProperty('--theme-dcard',      D.card)
  root.style.setProperty('--theme-dborder',    D.border)
  root.style.setProperty('--theme-dtext',      D.textPrimary)
  root.style.setProperty('--theme-dtext2',     D.textSecondary)
  root.style.setProperty('--theme-daccent',    D.accent)
  root.style.setProperty('--theme-dbtn',       D.btn)
  root.style.setProperty('--theme-dheader-bg',  D.headerBg || D.card)
  root.style.setProperty('--theme-dsidebar-bg', D.sidebarBg || D.bg)

  const typo = config.typography || DEFAULT_TYPOGRAPHY
  const cardSt = config.cardStyle || DEFAULT_CARD_STYLE

  loadGoogleFonts(typo.headingFont, typo.bodyFont)

  const fontScaleMap = { compact: '0.92', normal: '1.0', spacious: '1.08' }
  const fontTrackingMap = { tight: '-0.025em', normal: '0em', wide: '0.04em' }
  root.style.setProperty('--font-heading', `"${typo.headingFont}", sans-serif`)
  root.style.setProperty('--font-body', `"${typo.bodyFont}", sans-serif`)
  root.style.setProperty('--font-scale', fontScaleMap[typo.fontScale] || '1.0')
  root.style.setProperty('--font-heading-weight', typo.headingWeight || '800')
  root.style.setProperty('--font-heading-tracking', fontTrackingMap[typo.letterSpacing] || '-0.02em')

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

  // Legacy variables (for backward compat)
  root.style.setProperty('--bg-light',            L.bg)
  root.style.setProperty('--card-light',          L.card)
  root.style.setProperty('--border-light',        L.border)
  root.style.setProperty('--text-light-primary',  L.textPrimary)
  root.style.setProperty('--text-light-secondary',L.textSecondary)
  root.style.setProperty('--accent-light',        L.accent)
  root.style.setProperty('--btn-light',           L.btn)
  root.style.setProperty('--bg-dark',             D.bg)
  root.style.setProperty('--card-dark',           D.card)
  root.style.setProperty('--border-dark',         D.border)
  root.style.setProperty('--text-dark-primary',   D.textPrimary)
  root.style.setProperty('--text-dark-secondary', D.textSecondary)
  root.style.setProperty('--accent-dark',         D.accent)
  root.style.setProperty('--btn-dark',            D.btn)

  // Primary shades
  const shades = generateShades(L.primary, L.bg, D.bg)
  Object.entries(shades).forEach(([shade, hex]) => {
    root.style.setProperty(`--primary-${shade}`, hex)
    root.style.setProperty(`--color-primary-${shade}`, hex)
  })

  // ── 2. Inject Dynamic CSS Override <style> tag ────────────────────────────
  // This overrides all hardcoded hex colors in the components without touching
  // any component file. Both light & dark modes fully covered.
  const p   = L.primary
  const bg  = L.bg
  const card= L.card
  const brd = L.border
  const txt = L.textPrimary
  const txt2= L.textSecondary
  const acc = L.accent

  const dp   = D.primary
  const dbg  = D.bg
  const dcard= D.card
  const dbrd = D.border
  const dtxt = D.textPrimary
  const dtxt2= D.textSecondary
  const dacc = D.accent

  // Derived shades
  const pHover   = darken(p, 0.12)
  const pLight10 = lighten(p, 0.85)
  const pLight20 = lighten(p, 0.7)
  const pAlpha15 = p + '26'  // 15% opacity
  const pAlpha20 = p + '33'  // 20% opacity
  const bgCard2  = mix(bg, '#000000', 0.03)
  const bgInput  = mix(bg, '#FFFFFF', 0.3)
  const dbgCard2 = mix(dbg, '#FFFFFF', 0.06)
  const dbgInput = mix(dbg, '#FFFFFF', 0.04)
  const brdMid   = mix(brd, bg, 0.5)
  const dbrdMid  = mix(dbrd, dbg, 0.5)

  let styleEl = document.getElementById('rwash-dynamic-theme') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'rwash-dynamic-theme'
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = `
/* ═══════════════════════════════════════════════════════════════════
   RWASH DYNAMIC THEME — Auto-generated by applyTheme()
   Light: ${L.primary} on ${L.bg}  |  Dark: ${D.primary} on ${D.bg}
═══════════════════════════════════════════════════════════════════ */

/* ── TYPOGRAPHY ──────────────────────────────────────────────────── */
html {
  font-size: calc(16px * var(--font-scale, 1)) !important;
}
body, button, input, textarea, select, a, p, span, div, label {
  font-family: var(--font-body, "Plus Jakarta Sans", sans-serif) !important;
}
h1, h2, h3, h4, h5, h6, .font-display {
  font-family: var(--font-heading, "Sora", sans-serif) !important;
  font-weight: var(--font-heading-weight, 800) !important;
  letter-spacing: var(--font-heading-tracking, -0.02em) !important;
  color: ${txt} !important;
}
html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark h5, html.dark h6, html.dark .font-display {
  color: ${dtxt} !important;
}

/* ── CARDS DYNAMIC SHAPE & SHADOW ────────────────────────────────── */
[class*="rounded-3xl"], [class*="rounded-2xl"], [class*="rounded-xl"] {
  border-radius: var(--card-radius, 22px) !important;
}
[class*="shadow-"] {
  box-shadow: var(--card-shadow) !important;
}

/* ── ROOT & BODY ─────────────────────────────────────────────────── */
html, body, #root {
  background-color: ${bg} !important;
  color: ${txt} !important;
  transition: background-color 0.3s ease, color 0.3s ease !important;
}
html.dark, html.dark body, html.dark #root {
  background-color: ${dbg} !important;
  color: ${dtxt} !important;
}

/* ── SIDEBAR ─────────────────────────────────────────────────────── */
aside, [class*="sidebar"] {
  background-color: ${L.sidebarBg || bg} !important;
  border-color: ${brd} !important;
}
html.dark aside, html.dark [class*="sidebar"] {
  background-color: ${D.sidebarBg || dbg} !important;
  border-color: ${dbrd} !important;
}

/* ── HEADER / TOPBAR ─────────────────────────────────────────────── */
header, [class*="header"] {
  background-color: ${L.headerBg || card} !important;
  border-color: ${brd} !important;
}
html.dark header, html.dark [class*="header"] {
  background-color: ${D.headerBg || dcard} !important;
  border-color: ${dbrd} !important;
}

/* ── CARDS & PANELS ──────────────────────────────────────────────── */
[class*="bg-white"]:not([class*="bg-white/"]), [class*="bg-\\[#FFFFFF\\]"] {
  background-color: ${card} !important;
}
html.dark [class*="bg-white"]:not([class*="bg-white/"]), html.dark [class*="bg-\\[#FFFFFF\\]"] {
  background-color: ${dcard} !important;
}

/* ── PAGE BACKGROUNDS ────────────────────────────────────────────── */
[class*="bg-\\[#FFF8F0\\]"], [class*="bg-\\[#FAF6F0\\]"],
[class*="bg-\\[#FFF1F2\\]"], [class*="bg-\\[#F0F6FF\\]"],
[class*="bg-\\[#F0FDF4\\]"], [class*="bg-\\[#FAF5FF\\]"],
[class*="bg-\\[#FFF7ED\\]"], [class*="bg-\\[#F8FAFC\\]"] {
  background-color: ${bg} !important;
}
html.dark [class*="bg-\\[#120702\\]"], html.dark [class*="bg-\\[#0A0F1D\\]"],
html.dark [class*="bg-\\[#02180F\\]"], html.dark [class*="bg-\\[#170308\\]"],
html.dark [class*="bg-\\[#100521\\]"], html.dark [class*="bg-\\[#180802\\]"],
html.dark [class*="bg-\\[#0B0F19\\]"] {
  background-color: ${dbg} !important;
}

/* ── CARD BACKGROUNDS ────────────────────────────────────────────── */
html.dark [class*="bg-\\[#210E04\\]"], html.dark [class*="bg-\\[#131B2E\\]"],
html.dark [class*="bg-\\[#082619\\]"], html.dark [class*="bg-\\[#290610\\]"],
html.dark [class*="bg-\\[#1F0B3D\\]"], html.dark [class*="bg-\\[#2E1105\\]"],
html.dark [class*="bg-\\[#151D2C\\]"] {
  background-color: ${dcard} !important;
}

/* ── PRIMARY COLOR ELEMENTS ──────────────────────────────────────── */
[class*="bg-\\[#8C471E\\]"], [class*="bg-\\[#A65D2E\\]"],
[class*="bg-\\[#BE123C\\]"], [class*="bg-\\[#1D4ED8\\]"],
[class*="bg-\\[#047857\\]"], [class*="bg-\\[#7C3AED\\]"],
[class*="bg-\\[#EA580C\\]"], [class*="bg-\\[#1E293B\\]"] {
  background-color: ${p} !important;
}
html.dark [class*="bg-\\[#A65D2E\\]"],
html.dark [class*="bg-\\[#E11D48\\]"], html.dark [class*="bg-\\[#2563EB\\]"],
html.dark [class*="bg-\\[#059669\\]"], html.dark [class*="bg-\\[#8B5CF6\\]"],
html.dark [class*="bg-\\[#FB923C\\]"], html.dark [class*="bg-\\[#334155\\]"] {
  background-color: ${dp} !important;
}

/* ── HOVER STATES (primary) ─────────────────────────────────────── */
[class*="hover\\:bg-\\[#733615\\]"]:hover,
[class*="hover\\:bg-\\[#881337\\]"]:hover,
[class*="hover\\:bg-\\[#1e40af\\]"]:hover,
[class*="hover\\:bg-\\[#065f46\\]"]:hover {
  background-color: ${pHover} !important;
}

/* ── TEXT COLORS (PRIMARY) ───────────────────────────────────────── */
[class*="text-[#8C471E]"], [class*="text-[#A65D2E]"],
[class*="text-[#BE123C]"], [class*="text-[#1D4ED8]"],
[class*="text-[#047857]"], [class*="text-[#7C3AED]"],
[class*="text-[#EA580C]"], [class*="text-[#8c471e]"],
[class*="text-[#1d4ed8]"], [class*="text-[#047857]"] {
  color: ${p} !important;
}
html.dark [class*="text-[#E69D62]"], html.dark [class*="text-[#FB7185]"],
html.dark [class*="text-[#60A5FA]"], html.dark [class*="text-[#34D399]"],
html.dark [class*="text-[#A78BFA]"], html.dark [class*="text-[#FB923C]"],
html.dark [class*="text-[#94A3B8]"], html.dark [class*="text-[#e69d62]"],
html.dark [class*="text-[#60a5fa]"] {
  color: ${dp} !important;
}

/* ── DARK TEXT PRIMARY (Headings) ────────────────────────────────── */
[class*="text-[#3D1E0B]"], [class*="text-[#4C0519]"],
[class*="text-[#0F172A]"], [class*="text-[#064E3B]"],
[class*="text-[#3B0764]"], [class*="text-[#431407]"],
[class*="text-[#3d1e0b]"], [class*="text-[#0f172a]"] {
  color: ${txt} !important;
}
html.dark [class*="text-[#FFF5EB]"], html.dark [class*="text-[#FFF1F2]"],
html.dark [class*="text-[#F8FAFC]"], html.dark [class*="text-[#ECFDF5]"],
html.dark [class*="text-[#FAF5FF]"], html.dark [class*="text-[#FFF7ED]"],
html.dark [class*="text-[#fff5eb]"], html.dark [class*="text-[#f8fafc]"] {
  color: ${dtxt} !important;
}

/* ── SECONDARY TEXT (Descriptions) ───────────────────────────────── */
[class*="text-[#542E16]"], [class*="text-[#7A3B14]"],
[class*="text-[#881337]"], [class*="text-[#1E3A8A]"],
[class*="text-[#065F46]"], [class*="text-[#581C87]"],
[class*="text-[#7C2D12]"], [class*="text-[#542e16]"] {
  color: ${txt2} !important;
}
html.dark [class*="text-[#E8C8AE]"], html.dark [class*="text-[#FDA4AF]"],
html.dark [class*="text-[#94A3B8]"], html.dark [class*="text-[#A7F3D0]"],
html.dark [class*="text-[#D8B4FE]"], html.dark [class*="text-[#FDBA74]"],
html.dark [class*="text-[#CBD5E1]"], html.dark [class*="text-[#e8c8ae]"] {
  color: ${dtxt2} !important;
}

/* ── BORDER COLORS ───────────────────────────────────────────────── */
[class*="border-[#E6CBB2]"], [class*="border-[#FECDD3]"],
[class*="border-[#BFDBFE]"], [class*="border-[#A7F3D0]"],
[class*="border-[#E9D5FF]"], [class*="border-[#FED7AA]"],
[class*="border-[#E2E8F0]"], [class*="border-[#e6cbb2]"] {
  border-color: ${brd} !important;
}
html.dark [class*="border-[#52270D]"], html.dark [class*="border-[#4C0519]"],
html.dark [class*="border-[#1E293B]"], html.dark [class*="border-[#0F3F2A]"],
html.dark [class*="border-[#3B0764]"], html.dark [class*="border-[#431407]"],
html.dark [class*="border-[#52270d]"] {
  border-color: ${dbrd} !important;
}

/* ── INPUTS & TEXTAREAS ──────────────────────────────────────────── */
input, textarea, select {
  transition: border-color 0.2s, box-shadow 0.2s !important;
}
input:focus, textarea:focus, select:focus {
  border-color: ${p} !important;
  --tw-ring-color: ${pAlpha20} !important;
}

/* ── RING / FOCUS COLORS ─────────────────────────────────────────── */
[class*="focus\\:ring-\\[#8C471E\\]"]:focus,
[class*="focus\\:ring-\\[#BE123C\\]"]:focus,
[class*="focus\\:ring-\\[#1D4ED8\\]"]:focus,
[class*="focus\\:ring-\\[#047857\\]"]:focus,
[class*="focus\\:ring-\\[#7C3AED\\]"]:focus,
[class*="focus\\:ring-\\[#EA580C\\]"]:focus {
  --tw-ring-color: ${pAlpha20} !important;
  outline-color: ${p} !important;
}

/* ── BADGE / PILL BACKGROUNDS ────────────────────────────────────── */
[class*="bg-\\[#8C471E\\]\\/10"], [class*="bg-\\[#BE123C\\]\\/10"],
[class*="bg-\\[#1D4ED8\\]\\/10"] {
  background-color: ${pLight10} !important;
}

/* ── GRADIENT / HERO SECTION (Login Banner) ──────────────────────── */
[class*="from-\\[#8C471E\\]"], [class*="from-\\[#BE123C\\]"],
[class*="from-\\[#1D4ED8\\]"], [class*="from-\\[#047857\\]"],
[class*="from-\\[#7C3AED\\]"], [class*="from-\\[#EA580C\\]"] {
  --tw-gradient-from: ${p} !important;
}
[class*="via-\\[#5C270C\\]"], [class*="via-\\[#9F1239\\]"],
[class*="via-\\[#1e40af\\]"], [class*="via-\\[#065f46\\]"] {
  --tw-gradient-via: ${darken(p, 0.3)} !important;
}
[class*="to-\\[#210E04\\]"], [class*="to-\\[#290610\\]"],
[class*="to-\\[#0A0F1D\\]"], [class*="to-\\[#02180F\\]"] {
  --tw-gradient-to: ${dbg} !important;
}

/* ── ACTIVE NAVLINK OVERRIDE ─────────────────────────────────────── */
nav a[class*="bg-\\[#8C471E\\]"], nav a[class*="bg-\\[#A65D2E\\]"],
nav a[class*="bg-\\[#BE123C\\]"], nav a[class*="bg-\\[#1D4ED8\\]"],
nav a[class*="bg-\\[#047857\\]"], nav a[class*="bg-\\[#7C3AED\\]"] {
  background-color: ${p} !important;
  color: #ffffff !important;
}
html.dark nav a[class*="bg-\\[#A65D2E\\]"] {
  background-color: ${dp} !important;
}

/* ── CHECKBOX / ACCENT ───────────────────────────────────────────── */
input[type=checkbox], input[type=radio] {
  accent-color: ${p} !important;
}

/* ── SCROLLBAR ───────────────────────────────────────────────────── */
::-webkit-scrollbar-thumb {
  background-color: ${mix(p, bg, 0.5)} !important;
  border-radius: 8px;
}
html.dark ::-webkit-scrollbar-thumb {
  background-color: ${mix(dp, dbg, 0.5)} !important;
}

/* ── FOOTER: DB dark-bg driven (brown/amber hardcode override) ────── */
footer {
  background-color: ${dbg} !important;
  border-color: ${dbrd} !important;
  color: ${dtxt} !important;
}
footer [class*="text-amber-"] {
  color: ${dp} !important;
}
footer a:hover, footer button:hover {
  color: ${dp} !important;
}
footer [class*="border-[#52270D]"] {
  border-color: ${dbrd} !important;
}
footer [class*="bg-[#2A1307]"] {
  background-color: ${mix(dbg, dp, 0.12)} !important;
  border-color: ${dbrd} !important;
}
/* Footer light palette catch-all: slate/rose text that leaked on the dark footer
   must follow the theme's dark text/primary instead of staying slate/rose. */
footer [class*="text-slate-100"], footer [class*="text-slate-200"],
footer [class*="text-slate-300"], footer [class*="text-slate-400"],
footer [class*="text-gray-100"], footer [class*="text-gray-200"],
footer [class*="text-gray-300"] {
  color: ${dtxt} !important;
}
footer [class*="text-rose-500"], footer [class*="text-rose-400"],
footer [class*="text-rose-300"], footer [class*="fill-rose-500"],
footer [class*="fill-rose-400"] {
  color: ${dp} !important;
  fill: ${dp} !important;
}
footer [class*="hover:text-rose-400"]:hover, footer [class*="hover:text-rose-500"]:hover {
  color: ${dp} !important;
}

/* ── EXTRA HARDCODE CATCHERS (slate/amber/odd browns — unescaped hex match) ─ */
[class*="#8B5E3C"], [class*="#553118"], [class*="#724628"],
[class*="#341B0A"], [class*="#1C0B03"], [class*="#221105"],
[class*="#2A1307"], [class*="#1A0B04"], [class*="#6D3412"],
[class*="#6D472B"], [class*="#140903"], [class*="#380D04"],
[class*="#7A3B14"], [class*="#B58A63"], [class*="#D6AF91"] {
  border-color: ${mix(p, bg, 0.35)} !important;
}
[class*="bg-#8B5E3C"], [class*="bg-#553118"], [class*="bg-#724628"],
[class*="bg-#341B0A"], [class*="bg-#1C0B03"], [class*="bg-#221105"],
[class*="bg-#2A1307"], [class*="bg-#1A0B04"], [class*="bg-#6D3412"],
[class*="bg-#6D472B"], [class*="bg-#140903"], [class*="bg-#380D04"] {
  background-color: ${p} !important;
  border-color: ${p} !important;
}
html.dark [class*="bg-#2A1307"], html.dark [class*="bg-#1A0B04"],
html.dark [class*="bg-#341B0A"], html.dark [class*="bg-#221105"],
html.dark [class*="bg-#140903"], html.dark [class*="bg-#380D04"],
html.dark [class*="bg-#1C0B03"] {
  background-color: ${mix(dbg, dp, 0.12)} !important;
  border-color: ${dbrd} !important;
}
[class*="from-#553118"], [class*="from-#221105"],
[class*="from-#1C0B03"], [class*="from-#140903"] {
  --tw-gradient-from: ${p} !important;
}
[class*="via-#724628"], [class*="via-#341B0A"],
[class*="via-#5C270C"], [class*="via-#9F1239"] {
  --tw-gradient-via: ${darken(p, 0.3)} !important;
}
[class*="to-#341B0A"], [class*="to-#140903"],
[class*="to-#1C0B03"], [class*="to-#380D04"] {
  --tw-gradient-to: ${dbg} !important;
}
[class*="text-#B58A63"], [class*="text-#724628"], [class*="text-#7A3B14"],
[class*="text-#553118"], [class*="text-#8B5E3C"], [class*="text-#A65D2E"] {
  color: ${p} !important;
}
html.dark [class*="text-#B58A63"], html.dark [class*="text-#724628"] {
  color: ${dp} !important;
}
/* Tailwind amber/slate brand utilities → theme */
[class*="text-amber-400"], [class*="text-amber-300"],
[class*="text-amber-500"], [class*="text-amber-600"] {
  color: ${p} !important;
}
html.dark [class*="text-amber-200"], html.dark [class*="text-amber-100"],
html.dark [class*="text-amber-300"], html.dark [class*="text-amber-400"] {
  color: ${dp} !important;
}
[class*="bg-amber-500"]:not([class*="bg-amber-500/"]) {
  background-color: ${p} !important;
  border-color: ${p} !important;
  color: #fff !important;
}
[class*="hover:bg-amber-600"]:hover, [class*="hover:bg-amber-500"]:hover {
  background-color: ${pHover} !important;
}
[class*="bg-amber-500/10"], [class*="bg-amber-500/20"] {
  background-color: ${pLight10} !important;
}
[class*="text-amber-600"], [class*="text-amber-700"], [class*="text-amber-800"] {
  color: ${p} !important;
}
[class*="border-amber-500/"], [class*="border-amber-900/"],
[class*="border-amber-800/"], [class*="border-amber-400/"],
[class*="border-amber-200"], [class*="border-amber-100"] {
  border-color: ${mix(p, bg, 0.35)} !important;
}
html.dark [class*="border-amber-500/"], html.dark [class*="border-amber-900/"],
html.dark [class*="border-amber-800/"], html.dark [class*="border-amber-400/"] {
  border-color: ${mix(dp, dbg, 0.3)} !important;
}
[class*="bg-amber-950/"], [class*="bg-amber-50"], [class*="bg-amber-100"] {
  background-color: ${pLight10} !important;
}
[class*="ring-amber-500/"] {
  --tw-ring-color: ${pAlpha20} !important;
}
/* dark slate surfaces → theme dark card */
html.dark [class*="bg-slate-900"] {
  background-color: ${dcard} !important;
}
html.dark [class*="border-slate-800"] {
  border-color: ${dbrd} !important;
}
html.dark [class*="bg-slate-950/"], html.dark [class*="bg-slate-900/"] {
  background-color: ${dbg} !important;
}
html.dark [class*="bg-slate-800"] {
  background-color: ${mix(dbg, dp, 0.12)} !important;
}
/* primary tint hovers */
[class*="hover:bg-#FFF8F0"]:hover, [class*="hover:bg-#FAF6F0"]:hover,
[class*="hover:bg-amber-50"]:hover, [class*="hover:bg-amber-100"]:hover {
  background-color: ${pLight20} !important;
}
[class*="hover:text-#8C471E"]:hover, [class*="hover:text-amber-"] {
  color: ${p} !important;
}

/* ── SLATE + SKELETON THEME CATCH-ALL (light + dark) ───────────────
   Skeletons, chat, modals, inputs use Tailwind slate utilities that
   must follow the active theme in BOTH modes (fixes grey skeletons,
   hard grey chat borders, and unreadable text). */
[class*="bg-slate-200"], [class*="bg-slate-100"] {
  background-color: ${brd} !important;
}
[class*="bg-slate-50"] {
  background-color: ${bg} !important;
}
[class*="border-slate-200"], [class*="border-slate-100"], [class*="border-slate-300"] {
  border-color: ${brd} !important;
}
[class*="text-slate-800"], [class*="text-slate-900"], [class*="text-slate-700"] {
  color: ${txt} !important;
}
[class*="text-slate-600"], [class*="text-slate-500"], [class*="text-slate-400"] {
  color: ${txt2} !important;
}
html.dark [class*="bg-slate-200"], html.dark [class*="bg-slate-100"] {
  background-color: ${mix(dbg, dp, 0.10)} !important;
}
html.dark [class*="bg-slate-50"], html.dark [class*="bg-slate-950/"] {
  background-color: ${dbg} !important;
}
html.dark [class*="border-slate-200"], html.dark [class*="border-slate-100"],
html.dark [class*="border-slate-300"] {
  border-color: ${dbrd} !important;
}
html.dark [class*="text-slate-800"], html.dark [class*="text-slate-900"],
html.dark [class*="text-slate-700"], html.dark [class*="text-slate-600"] {
  color: ${dtxt} !important;
}
html.dark [class*="text-slate-500"], html.dark [class*="text-slate-400"],
html.dark [class*="text-slate-300"] {
  color: ${dtxt2} !important;
}

/* ── UNIVERSAL HARDCODE FIX (unescaped — matches DOM class attr directly) ─ */
[class*="8C471E"], [class*="A65D2E"], [class*="BE123C"], [class*="1D4ED8"],
[class*="047857"], [class*="7C3AED"], [class*="EA580C"], [class*="8B5E3C"],
[class*="553118"], [class*="724628"], [class*="341B0A"], [class*="1C0B03"],
[class*="221105"], [class*="2A1307"], [class*="1A0B04"], [class*="6D3412"],
[class*="6D472B"], [class*="140903"], [class*="380D04"], [class*="5C270C"],
[class*="9F1239"], [class*="7A3B14"], [class*="B58A63"], [class*="D6AF91"],
[class*="E6CBB2"], [class*="FDF0E6"], [class*="FFF8F0"], [class*="FAF6F0"] {
  border-color: ${brd} !important;
}
[class*="bg-8C471E"], [class*="bg-A65D2E"],
[class*="bg-BE123C"], [class*="bg-1D4ED8"],
[class*="bg-047857"], [class*="bg-7C3AED"],
[class*="bg-EA580C"], [class*="bg-8B5E3C"], [class*="bg-553118"],
[class*="bg-724628"], [class*="bg-6D3412"], [class*="bg-6D472B"] {
  background-color: ${p} !important;
  border-color: ${p} !important;
}
[class*="hover:bg-733615"]:hover, [class*="hover:bg-6D3412"]:hover,
[class*="hover:bg-6D472B"]:hover, [class*="hover:bg-881337"]:hover {
  background-color: ${pHover} !important;
}
[class*="text-8C471E"], [class*="text-A65D2E"],
[class*="text-BE123C"], [class*="text-1D4ED8"],
[class*="text-047857"], [class*="text-7C3AED"],
[class*="text-EA580C"], [class*="text-B58A63"], [class*="text-724628"],
[class*="text-7A3B14"], [class*="text-553118"], [class*="text-8B5E3C"] {
  color: ${p} !important;
}
[class*="hover:text-8C471E"]:hover, [class*="hover:text-amber-"]:hover {
  color: ${p} !important;
}
[class*="bg-FFF8F0"], [class*="bg-FAF6F0"], [class*="bg-FFF1F2"],
[class*="bg-F0F6FF"], [class*="bg-F0FDF4"], [class*="bg-FAF5FF"],
[class*="bg-FFF7ED"], [class*="bg-F8FAFC"] {
  background-color: ${bg} !important;
}
[class*="text-3D1E0B"], [class*="text-4C0519"], [class*="text-0F172A"],
[class*="text-064E3B"], [class*="text-3B0764"], [class*="text-431407"],
[class*="text-1E293B"], [class*="text-221105"] {
  color: ${txt} !important;
}
[class*="text-542E16"], [class*="text-7A3B14"], [class*="text-881337"],
[class*="text-1E3A8A"], [class*="text-065F46"], [class*="text-581C87"],
[class*="text-7C2D12"] {
  color: ${txt2} !important;
}
html.dark [class*="bg-210E04"], html.dark [class*="bg-131B2E"], html.dark [class*="bg-082619"],
html.dark [class*="bg-290610"], html.dark [class*="bg-1F0B3D"], html.dark [class*="bg-2E1005"],
html.dark [class*="bg-151D2C"] {
  background-color: ${dcard} !important;
}
html.dark [class*="bg-120702"], html.dark [class*="bg-0A0F1D"],
html.dark [class*="bg-02180F"], html.dark [class*="bg-170308"],
html.dark [class*="bg-100521"], html.dark [class*="bg-180802"],
html.dark [class*="bg-0B0F19"], html.dark [class*="bg-2A1307"],
html.dark [class*="bg-1A0B04"], html.dark [class*="bg-341B0A"],
html.dark [class*="bg-221105"], html.dark [class*="bg-140903"],
html.dark [class*="bg-380D04"], html.dark [class*="bg-1C0B03"] {
  background-color: ${dbg} !important;
}
html.dark [class*="bg-221105"], html.dark [class*="bg-210E04"],
html.dark [class*="bg-341B0A"], html.dark [class*="bg-2A1307"] {
  background-color: ${mix(dbg, dp, 0.12)} !important;
  border-color: ${dbrd} !important;
}
[class*="from-8C471E"], [class*="from-BE123C"], [class*="from-1D4ED8"],
[class*="from-047857"], [class*="from-7C3AED"], [class*="from-EA580C"],
[class*="from-553118"], [class*="from-221105"], [class*="from-1C0B03"] {
  --tw-gradient-from: ${p} !important;
}
[class*="via-5C270C"], [class*="via-9F1239"], [class*="via-1e40af"],
[class*="via-065f46"], [class*="via-724628"], [class*="via-341B0A"] {
  --tw-gradient-via: ${darken(p, 0.3)} !important;
}
[class*="to-210E04"], [class*="to-290610"], [class*="to-0A0F1D"],
[class*="to-02180F"], [class*="to-341B0A"], [class*="to-140903"],
[class*="to-1C0B03"], [class*="to-380D04"] {
  --tw-gradient-to: ${dbg} !important;
}

/* ── GLOBAL TYPOGRAPHY ENFORCE (same font ids everywhere) ─────────── */
* { font-family: inherit; }
body, button, input, textarea, select, a, p, span, div, label {
  font-family: 'Plus Jakarta Sans', Inter, system-ui, sans-serif !important;
}
h1, h2, h3, .font-display {
  font-family: 'Sora', 'Plus Jakarta Sans', Inter, sans-serif !important;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.font-black { font-weight: 800 !important; }
.font-extrabold { font-weight: 700 !important; }
.font-bold { font-weight: 700 !important; }
label, .tracking-widest, .uppercase {
  letter-spacing: 0.08em;
}

/* ── META THEME COLOR ────────────────────────────────────────────── */
/* Updated via JS below */
`

  // ── AUTO HEX → THEME MAP: every hardcoded component hex → live DB theme ──
  // Legacy override rules used broken selector forms (`bg-724628`,
  // `bg-#724628`) that never matched real DOM classes like `bg-[#724628]`,
  // leaving brown leftovers across About / Contact / Book / Services /
  // Footer / modals. This generated block re-maps every known hardcoded hex
  // (both letter cases, dark:/hover: aware) so NOTHING stays brown in any
  // preset, in either mode.
  const hv = (hex: string) => {
    const c = hex.replace('#', '')
    const u = c.toUpperCase(), l = c.toLowerCase()
    return u === l ? [u] : [u, l]
  }
  /** selectors for `prefix-[#HEX]` arbitrary classes.
      modes: guard (light side, dark:-aware) | plain (html.dark side) | hover | hoverRaw | focus */
  const ax = (prefix: string, hex: string, mode: string, pre = '') =>
    hv(hex).map((c) => {
      const full = `${prefix}[#${c}]`
      let s = `${pre}[class*="${full}"]`
      if (mode === 'guard')
        s += `:not([class*="dark:${full}"]):not([class*="dark:hover:${full}"]):not([class*="dark:group-hover:${full}"])`
      if (mode !== 'hoverRaw' && mode !== 'hover')
        s += `:not([class*="hover:${full}"]):not([class*="focus:${full}"]):not([class*="active:${full}"]):not([class*="group-hover:${full}"])`
      if (mode === 'hover') {
        s += ':hover'
        s += `:not([class*="dark:${full}"]):not([class*="dark:group-hover:${full}"])`
      }
      if (mode === 'hoverRaw') s += ':hover'
      if (mode === 'focus') s += ':focus'
      return s
    }).join(', ')
  const jx = (prefix: string, list: string[], mode: string, pre = '') =>
    list.map((h) => ax(prefix, h, mode, pre)).filter(Boolean).join(', ')

  const ACCENT = ['8C471E','A65D2E','724628','6D3412','733615','6D472B','C28052','D49B70','B58A63','A07550','E69D62','E6B998','8B5E3C','553118','9F1239','1E40AF','065F46','7C2D12','431407','1E3A8A','581C87','D97706','BE123C','1D4ED8','047857','7C3AED','EA580C','1E293B','E11D48','2563EB','059669','8B5CF6','FB923C','334155']
  const SURF_D = ['120702','210E04','2A1307','1C0B03','140903','221105','341B0A','1A0B04','380D04','381403','2E1002','331A0D','1A0C04','1A120B','2A1408','111111','0C0C0C','090D16','0B1120','0F0603','2B1406','4A2512','471C06','5C270C','52270D','0A0F1D','02180F','170308','100521','180802','0B0F19','131B2E','082619','290610','1F0B3D','2E1105','151D2C']
  const PAGE_D = ['120702','140903','1C0B03','1A0C04','1A120B','2A1408','111111','0C0C0C','090D16','0B1120','0F0603','0A0F1D','02180F','170308','100521','180802','0B0F19']
  const TINTS = ['FFF8F0','FAF6F0','FFF1F2','F0F6FF','F0FDF4','FAF5FF','FFF7ED','F8FAFC']
  const TILE  = ['FDF0E6','FFF5EB','FFEED6','F3E9DC','F5D9C4','E5D3B8','FEF3C7','FDE7D3','D9A884']
  const TXT_A = ['724628','B58A63','A65D2E','8B5E3C','553118','733615','6D472B','471C06','C28052','D49B70','E6B998','8C471E','6D3412','5C270C','A07550','E69D62','9F1239','D97706']
  const TXT_D = ['3D1E0B','221105','1C0B03','140903','341B0A','331A0D','2E1002','381403','2A1307','120702','210E04','4C0519','0F172A','064E3B','3B0764','431407','1E293B','4A2512','2B1406']
  const TXT_2 = ['542E16','7A3B14','881337','1E3A8A','065F46','581C87','7C2D12']
  const HOV   = ['553118','6D3412','6D472B','733615','881337','5C270C','471C06','4A2512','2B1406','431407','1E40AF','065F46','7C2D12','1E3A8A','581C87','3B0764','064E3B','4C0519','0F172A','724628','8C471E','381403','2E1002','331A0D','A65D2E','7C3AED','1D4ED8','BE123C','047857','EA580C']
  const HOV_T = ['E6CBB2','FFF8F0','FAF6F0','FDF0E6','E2E8F0','F1F5F9','D6AF91','E5D3B8','F5D9C4','E6B998']
  const HOV_D = ['2A1307','210E04','120702','140903','1C0B03','221105','341B0A','1A0B04','380D04','381403','2E1002']
  const BRD_L = ['E6CBB2','D6AF91','E5D3B8','F3E9DC','F5D9C4','E6B998','F1F5F9','FFEED6','D9A884','FDE7D3','FECDD3','BFDBFE','A7F3D0','E9D5FF','FED7AA','E2E8F0','52270D','7A3B14','5C270C','471C06','4A2512','341B0A','2B1406','380D04','2A1307','1C0B03','331A0D','2E1002','381403','120702','210E04','1A0B04','553118','6D472B','6D3412']
  const GRAD  = ACCENT.concat(['553118','724628','733615','5C270C','471C06','4A2512','2B1406','341B0A','221105','140903','1C0B03','2A1307','380D04','1A0B04','9F1239','881337','7C2D12'])
  const GRAD_TO = ['210E04','140903','1C0B03','380D04','341B0A','221105','120702','2A1307','1A0B04','381403','2E1002','1A0C04','0F0603','471C06','5C270C','553118','6D3412','0A0F1D','02180F','170308','180802','100521']
  const RING_P = ['8C471E','A65D2E','724628','6D3412']
  const RING_B = ['E6CBB2','52270D','D6AF91','120702','210E04']

  let gen = '\n/* ===== AUTO HEX → THEME MAP (generated by applyTheme) ===== */\n'
  const genAdd = (sel: string, css: string) => { if (sel.trim()) gen += sel + ' {\n  ' + css + '\n}\n' }
  // Solid brand fills (buttons / pills / badges / chips)
  genAdd(jx('bg-', ACCENT, 'guard'), `background-color: ${p} !important;\nborder-color: ${p} !important;`)
  genAdd(jx('bg-', TINTS, 'guard'), `background-color: ${bg} !important;`)
  genAdd(jx('bg-', TILE, 'guard'), `background-color: ${mix(p, '#FFFFFF', 0.85)} !important;`)
  genAdd(jx('bg-', TINTS, 'plain', 'html.dark '), `background-color: ${dbg} !important;`)
  genAdd(jx('bg-', TILE, 'plain', 'html.dark '), `background-color: ${mix(dbg, dp, 0.16)} !important;`)
  genAdd(jx('bg-', ACCENT, 'plain', 'html.dark '), `background-color: ${dp} !important;\nborder-color: ${dp} !important;`)
  genAdd(jx('bg-', PAGE_D, 'plain', 'html.dark '), `background-color: ${dbg} !important;`)
  genAdd(jx('bg-', SURF_D.filter((h) => !PAGE_D.includes(h)), 'plain', 'html.dark '), `background-color: ${dcard} !important;`)
  genAdd(jx('bg-', SURF_D, 'guard'), `background-color: ${mix(p, '#000000', 0.78)} !important;`)
  // Accent / primary / secondary text colors
  genAdd(jx('text-', TXT_A, 'guard'), `color: ${p} !important;`)
  genAdd(jx('text-', TXT_D, 'guard'), `color: ${txt} !important;`)
  genAdd(jx('text-', TXT_2, 'guard'), `color: ${txt2} !important;`)
  genAdd(jx('text-', TXT_A, 'plain', 'html.dark '), `color: ${dp} !important;`)
  genAdd(jx('text-', TXT_D, 'plain', 'html.dark '), `color: ${dtxt} !important;`)
  genAdd(jx('text-', TXT_2, 'plain', 'html.dark '), `color: ${dtxt2} !important;`)
  // Borders — warm browns + dark browns → theme border in BOTH modes
  genAdd(jx('border-', BRD_L, 'guard'), `border-color: ${brd} !important;`)
  genAdd(jx('border-', BRD_L, 'plain', 'html.dark '), `border-color: ${dbrd} !important;`)
  // Hover states
  genAdd(jx('hover:bg-', HOV, 'hover'), `background-color: ${mix(p, '#000000', 0.2)} !important;`)
  genAdd(jx('hover:bg-', HOV_T, 'hover'), `background-color: ${mix(p, bg, 0.45)} !important;`)
  genAdd(jx('hover:bg-', HOV, 'hoverRaw', 'html.dark '), `background-color: ${mix(dp, '#000000', 0.18)} !important;`)
  genAdd(jx('hover:bg-', HOV_D, 'hoverRaw', 'html.dark '), `background-color: ${mix(dbg, dp, 0.14)} !important;`)
  // Gradients (from / via / to)
  genAdd(jx('from-', GRAD, 'guard'), `--tw-gradient-from: ${p} !important;`)
  genAdd(jx('via-', GRAD, 'guard'), `--tw-gradient-via: ${mix(p, '#000000', 0.35)} !important;`)
  genAdd(jx('to-', GRAD_TO, 'guard'), `--tw-gradient-to: ${mix(p, '#000000', 0.82)} !important;`)
  genAdd(jx('from-', GRAD, 'plain', 'html.dark '), `--tw-gradient-from: ${dp} !important;`)
  genAdd(jx('via-', GRAD, 'plain', 'html.dark '), `--tw-gradient-via: ${mix(dp, '#000000', 0.35)} !important;`)
  genAdd(jx('to-', GRAD_TO, 'plain', 'html.dark '), `--tw-gradient-to: ${dbg} !important;`)
  // Focus + avatar rings
  genAdd(jx('focus:ring-', RING_P.concat(RING_B), 'focus'), `--tw-ring-color: ${p}33 !important;\noutline-color: ${p} !important;`)
  genAdd(jx('ring-', RING_P, 'guard'), `--tw-ring-color: ${p} !important;`)
  genAdd(jx('ring-', RING_P, 'plain', 'html.dark '), `--tw-ring-color: ${dp} !important;`)
  genAdd(jx('ring-', RING_B, 'guard'), `--tw-ring-color: ${brd} !important;`)
  genAdd(jx('ring-', RING_B, 'plain', 'html.dark '), `--tw-ring-color: ${dbrd} !important;`)
  // Slate/stone dark panels in LIGHT mode (login gates, modals) → theme-dark
  gen += `html:not(.dark) [class*="bg-slate-900"]:not([class*="dark:bg-slate-900"]), html:not(.dark) [class*="bg-slate-950"]:not([class*="dark:bg-slate-950"]), html:not(.dark) [class*="bg-stone-900"]:not([class*="dark:bg-stone-900"]) {\n  background-color: ${mix(p, '#000000', 0.84)} !important;\n}\n`
  gen += `html:not(.dark) [class*="bg-slate-800"]:not([class*="dark:bg-slate-800"]), html:not(.dark) [class*="bg-slate-855"]:not([class*="dark:bg-slate-855"]), html:not(.dark) [class*="bg-stone-800"]:not([class*="dark:bg-stone-800"]) {\n  background-color: ${mix(p, '#000000', 0.7)} !important;\n}\n`
  gen += `html:not(.dark) [class*="border-slate-800"]:not([class*="dark:border-slate-800"]), html:not(.dark) [class*="border-slate-700"]:not([class*="dark:border-slate-700"]) {\n  border-color: ${mix(p, '#000000', 0.55)} !important;\n}\n`
  // Translucent variants bg-[#HEX]/10 … /90 → themed color + same alpha
  const ALS = ['10', '20', '30', '40', '50', '60', '80', '90']
  const ahx: Record<string, string> = { '10': '1A', '20': '33', '30': '4D', '40': '66', '50': '80', '60': '99', '80': 'CC', '90': 'E6' }
  const A_ACC = ['8C471E', 'A65D2E', '724628', 'E69D62', '6D3412', '733615', '553118', 'B58A63']
  const A_SUR = ['120702', '210E04', '2A1307', '221105', '140903', '341B0A', '1C0B03', '1A0B04', '380D04', '2E1002']
  const A_TIN = ['E6CBB2', 'FFF8F0', 'FDF0E6', 'FFF5EB', 'F8FAFC', 'FAF6F0', 'FFF7ED']
  const alphaSel = (prefix: string, list: string[], a: string, mode: string, pre = '') =>
    list.map((h) => hv(h).map((c) => {
      const full = `${prefix}[#${c}]`
      let s = `${pre}[class*="${full}/${a}"]`
      if (mode === 'guard')
        s += `:not([class*="dark:${full}/${a}"]):not([class*="dark:hover:${full}/${a}"]):not([class*="dark:group-hover:${full}/${a}"])`
      s += `:not([class*="hover:${full}/${a}"]):not([class*="group-hover:${full}/${a}"])`
      return s
    }).join(', ')).join(', ')
  for (const a of ALS) {
    genAdd(alphaSel('bg-', A_ACC, a, 'guard'), `background-color: ${p}${ahx[a]} !important;`)
    genAdd(alphaSel('bg-', A_TIN, a, 'guard'), `background-color: ${bg}${ahx[a]} !important;`)
    genAdd(alphaSel('bg-', A_SUR, a, 'guard'), `background-color: ${mix(p, '#000000', 0.78)}${ahx[a]} !important;`)
    genAdd(alphaSel('bg-', A_ACC, a, 'plain', 'html.dark '), `background-color: ${dp}${ahx[a]} !important;`)
    genAdd(alphaSel('bg-', A_TIN, a, 'plain', 'html.dark '), `background-color: ${dbg}${ahx[a]} !important;`)
    const aPage = A_SUR.filter((h) => PAGE_D.includes(h))
    const aPanel = A_SUR.filter((h) => !PAGE_D.includes(h))
    genAdd(alphaSel('bg-', aPage, a, 'plain', 'html.dark '), `background-color: ${dbg}${ahx[a]} !important;`)
    genAdd(alphaSel('bg-', aPanel, a, 'plain', 'html.dark '), `background-color: ${dcard}${ahx[a]} !important;`)
  }
  // Readable placeholders follow the theme
  gen += `[class*="placeholder-slate-400"]::placeholder, [class*="placeholder-slate-500"]::placeholder {\n  color: ${mix(p, '#000000', 0.42)} !important;\n}\n`
  styleEl.textContent += gen

  // Meta theme-color for browser chrome
  let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
  if (!metaTheme) {
    metaTheme = document.createElement('meta')
    metaTheme.name = 'theme-color'
    document.head.appendChild(metaTheme)
  }
  const isDark = root.classList.contains('dark')
  metaTheme.content = isDark ? D.bg : L.bg
}
