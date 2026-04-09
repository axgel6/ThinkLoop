// Shared theme definitions used across the application

// Color theme options for settings
export const COLOR_OPTIONS = [
  { id: "zero", label: "Default (Ayu)" },
  { id: "one", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "two", label: "Blue" },
  { id: "three", label: "Gray" },
  { id: "four", label: "Cream" },
  { id: "five", label: "Purple" },
  { id: "six", label: "Pink" },
  { id: "seven", label: "Sky Blue" },
  { id: "eight", label: "Sage Green" },
  { id: "nine", label: "Brown" },
  { id: "ten", label: "Sunset" },
  { id: "eleven", label: "Burgundy" },
  { id: "twelve", label: "Forest Green" },
  { id: "thirteen", label: "Golden" },
  { id: "fourteen", label: "Intelligence" },
  { id: "fifteen", label: "Snow Leopard" },
  { id: "sixteen", label: "eXPerience" },
  { id: "seventeen", label: "Bright Red" },
  { id: "eighteen", label: "Gruvbox (ModelLoop Default)" },
];

// Mapping of color option IDs to CSS theme classes
export const THEME_CLASS_MAP = {
  zero: "theme-default",
  one: "theme-dark",
  light: "theme-light",
  two: "theme-blue",
  three: "theme-gray",
  four: "theme-cream",
  five: "theme-purple",
  six: "theme-pink",
  seven: "theme-skyblue",
  eight: "theme-sage",
  nine: "theme-brown",
  ten: "theme-sunset",
  eleven: "theme-burgundy",
  twelve: "theme-forestgreen",
  thirteen: "theme-gold",
  fourteen: "theme-ai",
  fifteen: "theme-snowleopard",
  sixteen: "theme-windowsxp",
  seventeen: "theme-brightred",
  eighteen: "theme-gruvbox",
};

// All theme classes (auto-generated from THEME_CLASS_MAP)
export const ALL_THEME_CLASSES = Object.values(THEME_CLASS_MAP);

// Per-note theme options (includes "default" to match global theme)
export const NOTE_THEME_OPTIONS = [
  { id: "default", label: "Match Theme" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "brown", label: "Brown" },
  { id: "blue", label: "Blue" },
  { id: "gray", label: "Gray" },
  { id: "cream", label: "Cream" },
  { id: "purple", label: "Purple" },
  { id: "pink", label: "Pink" },
  { id: "skyblue", label: "Sky Blue" },
  { id: "sage", label: "Sage" },
  { id: "sunset", label: "Sunset" },
  { id: "burgundy", label: "Burgundy" },
  { id: "forestgreen", label: "Forest Green" },
  { id: "gold", label: "Gold" },
  { id: "ai", label: "Intelligence" },
  { id: "snowleopard", label: "Snow Leopard" },
  { id: "windowsxp", label: "eXPerience" },
  { id: "brightred", label: "Bright Red" },
  { id: "gruvbox", label: "Gruvbox (ModelLoop Default)" },
];

// CSS custom properties for each theme (used for per-note theming)
export const THEME_VARS = {
  default: {
    "--bg": "#0a0e14",
    "--fg": "#e6e4de",
    "--muted": "#3d4663",
    "--panel-bg": "rgba(13, 16, 23, 0.82)",
    "--panel-border": "#151a24",
    "--panel-bg-solid": "#0d1017",
    "--glass-bg": "linear-gradient(135deg, #0d1017, rgba(57, 186, 230, 0.05))",
  },
  dark: {
    "--bg": "#000000",
    "--fg": "#e0e0e0",
    "--muted": "#9a9a9a",
    "--panel-bg": "rgba(30, 30, 30, 0.6)",
    "--panel-border": "rgba(255, 255, 255, 0.08)",
    "--panel-bg-solid": "rgb(20, 20, 20)",
    "--glass-bg":
      "linear-gradient(135deg, rgba(0, 0, 0, 0.195), rgba(255, 255, 255, 0.05))",
  },
  light: {
    "--bg": "#ffffff",
    "--fg": "#1a1a1a",
    "--muted": "#666666",
    "--panel-bg": "rgba(240, 240, 240, 0.8)",
    "--panel-border": "rgba(0, 0, 0, 0.1)",
    "--panel-bg-solid": "rgb(250, 250, 250)",
    "--glass-bg":
      "linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(200, 200, 200, 0.1))",
  },
  blue: {
    "--bg": "#0a1628",
    "--fg": "#e3f2ff",
    "--muted": "#7cb3ff",
    "--panel-bg": "rgba(20, 60, 120, 0.4)",
    "--panel-border": "rgba(124, 179, 255, 0.3)",
    "--panel-bg-solid": "#1a3a5c",
    "--glass-bg":
      "linear-gradient(135deg, rgba(10, 30, 50, 0.45), rgba(124, 179, 255, 0.06))",
  },
  gray: {
    "--bg": "#1a1a1e",
    "--fg": "#f5f5f5",
    "--muted": "#b8b8c0",
    "--panel-bg": "rgba(50, 50, 55, 0.5)",
    "--panel-border": "rgba(180, 180, 190, 0.2)",
    "--panel-bg-solid": "#2d2d32",
    "--glass-bg":
      "linear-gradient(135deg, rgba(40, 40, 45, 0.55), rgba(255, 255, 255, 0.03))",
  },
  cream: {
    "--bg": "#f5f1e8",
    "--fg": "#3d2e1f",
    "--muted": "#8b7355",
    "--panel-bg": "rgba(235, 220, 200, 0.6)",
    "--panel-border": "rgba(139, 115, 85, 0.25)",
    "--panel-bg-solid": "#ebe4d6",
    "--glass-bg":
      "linear-gradient(135deg, rgba(250, 240, 225, 0.85), rgba(139, 115, 85, 0.05))",
  },
  purple: {
    "--bg": "#c3abf6",
    "--fg": "#24123f",
    "--muted": "#4f3a87",
    "--panel-bg": "rgba(245, 240, 255, 0.9)",
    "--panel-border": "rgba(79, 58, 135, 0.28)",
    "--panel-bg-solid": "#f2ecff",
    "--glass-bg":
      "linear-gradient(135deg, rgba(114, 82, 180, 0.22), rgba(255, 255, 255, 0.24))",
  },
  pink: {
    "--bg": "#ffe9f1",
    "--fg": "#2f1022",
    "--muted": "#7a3d5f",
    "--panel-bg": "rgba(255, 244, 248, 0.9)",
    "--panel-border": "rgba(122, 61, 95, 0.24)",
    "--panel-bg-solid": "#fff3f8",
    "--glass-bg":
      "linear-gradient(135deg, rgba(255, 214, 234, 0.34), rgba(255, 255, 255, 0.26))",
  },
  skyblue: {
    "--bg": "#d8eaf8",
    "--fg": "#163553",
    "--muted": "#355f8b",
    "--panel-bg": "rgba(237, 247, 255, 0.9)",
    "--panel-border": "rgba(53, 95, 139, 0.22)",
    "--panel-bg-solid": "#edf6ff",
    "--glass-bg":
      "linear-gradient(135deg, rgba(193, 223, 247, 0.35), rgba(255, 255, 255, 0.22))",
  },
  sage: {
    "--bg": "#ddeee0",
    "--fg": "#1f3b2f",
    "--muted": "#486a56",
    "--panel-bg": "rgba(235, 246, 236, 0.9)",
    "--panel-border": "rgba(72, 106, 86, 0.24)",
    "--panel-bg-solid": "#ecf8ed",
    "--glass-bg":
      "linear-gradient(135deg, rgba(188, 216, 193, 0.34), rgba(255, 255, 255, 0.22))",
  },
  brown: {
    "--bg": "#2b1b12",
    "--fg": "#efe6dd",
    "--muted": "#b99a85",
    "--panel-bg": "rgba(60, 40, 30, 0.6)",
    "--panel-border": "rgba(179, 128, 95, 0.25)",
    "--panel-bg-solid": "#3a2418",
    "--glass-bg":
      "linear-gradient(135deg, rgba(60, 40, 30, 0.6), rgba(255, 255, 255, 0.02))",
  },
  sunset: {
    "--bg": "#000000",
    "--fg": "#ffeded",
    "--muted": "#ffffff",
    "--panel-bg": "rgba(0, 0, 0, 0.7)",
    "--panel-border": "rgba(152, 152, 152, 0.341)",
    "--panel-bg-solid":
      "linear-gradient(135deg, rgb(0, 0, 0), rgba(0, 0, 0, 0.38))",
    "--glass-bg":
      "linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.441))",
  },
  burgundy: {
    "--bg": "#1a0a0e",
    "--fg": "#f5e9ec",
    "--muted": "#b87a87",
    "--panel-bg": "rgba(64, 0, 21, 0.6)",
    "--panel-border": "rgba(184, 122, 135, 0.25)",
    "--panel-bg-solid": "#2a0f17",
    "--glass-bg":
      "linear-gradient(135deg, rgba(64, 0, 21, 0.85), rgba(26, 10, 14, 0.9))",
  },
  forestgreen: {
    "--bg": "#0e1a0e",
    "--fg": "#e6f0e6",
    "--muted": "#7ab97a",
    "--panel-bg": "rgba(10, 40, 10, 0.6)",
    "--panel-border": "rgba(122, 185, 122, 0.25)",
    "--panel-bg-solid": "#162616",
    "--glass-bg":
      "linear-gradient(135deg, rgba(10, 40, 10, 0.85), rgba(14, 26, 14, 0.9))",
  },
  gold: {
    "--bg": "#cb9a2e",
    "--fg": "#fff8e1",
    "--muted": "#f2d089",
    "--panel-bg": "rgba(30, 20, 5, 0.65)",
    "--panel-border": "rgba(255, 215, 128, 0.25)",
    "--panel-bg-solid": "#2c1f0c",
    "--glass-bg":
      "linear-gradient(135deg, rgba(255, 204, 102, 0.08), rgba(30, 20, 5, 0.85))",
  },
  ai: {
    "--bg": "#0b0b1a",
    "--fg": "#e9f0ff",
    "--muted": "#b5c6ff",
    "--panel-bg": "rgba(15, 20, 35, 0.7)",
    "--panel-border": "rgba(140, 170, 255, 0.25)",
    "--panel-bg-solid":
      "linear-gradient(135deg, #11152a, rgba(30, 35, 60, 0.5))",
    "--glass-bg":
      "linear-gradient(135deg, rgba(60, 30, 100, 0.7), rgba(20, 30, 60, 0.45))",
  },
  snowleopard: {
    "--bg": "#000000",
    "--fg": "#e8e8e8",
    "--muted": "#9a9a9a",
    "--panel-bg": "rgba(0, 0, 0, 0.65)",
    "--panel-border": "rgba(255, 255, 255, 0.15)",
    "--panel-bg-solid": "rgba(0, 0, 0, 0.9)",
    "--glass-bg":
      "linear-gradient(135deg, rgba(20, 20, 20, 0.7), rgba(0, 0, 0, 0.6))",
  },
  windowsxp: {
    "--bg": "#3b6fb3",
    "--fg": "#0b1f3a",
    "--muted": "#365a8c",
    "--panel-bg": "rgba(47, 95, 165, 0.58)",
    "--panel-border": "rgba(255, 255, 255, 0.62)",
    "--panel-bg-solid": "#2d5a9f",
    "--glass-bg":
      "linear-gradient(135deg, rgba(214, 238, 255, 0.5), rgba(255, 255, 255, 0.22))",
  },
  brightred: {
    "--bg": "#8B1A1A",
    "--fg": "#FFFFFF",
    "--muted": "#F4A8A8",
    "--panel-bg": "rgba(180, 50, 50, 0.3)",
    "--panel-border": "rgba(255, 170, 170, 0.4)",
    "--panel-bg-solid": "#A52A2A",
    "--glass-bg":
      "linear-gradient(135deg, rgba(220, 80, 80, 0.3), rgba(139, 26, 26, 0.5))",
  },
  gruvbox: {
    "--bg": "#282828",
    "--fg": "#ebdbb2",
    "--muted": "#928374",
    "--panel-bg": "rgba(60, 56, 54, 0.7)",
    "--panel-border": "rgba(168, 153, 132, 0.3)",
    "--panel-bg-solid": "#3c3836",
    "--glass-bg":
      "linear-gradient(135deg, rgba(40, 40, 40, 0.85), rgba(250, 189, 47, 0.04))",
  },
};

// Helper function to apply a theme to the document root
export const applyTheme = (themeId) => {
  const root = document.documentElement;
  root.classList.remove(...ALL_THEME_CLASSES);

  const themeClass = THEME_CLASS_MAP[themeId];
  if (themeClass) {
    root.classList.add(themeClass);
  }
};

const themes = {
  COLOR_OPTIONS,
  THEME_CLASS_MAP,
  ALL_THEME_CLASSES,
  NOTE_THEME_OPTIONS,
  THEME_VARS,
  applyTheme,
};

export default themes;
