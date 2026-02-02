// Shared theme definitions used across the application

// Color theme options for settings
export const COLOR_OPTIONS = [
  { id: "zero", label: "Default" },
  { id: "one", label: "Black" },
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
  { id: "sixteen", label: "Ocean" },
  { id: "seventeen", label: "Lavender" },
  { id: "eighteen", label: "Mint" },
  { id: "nineteen", label: "Coral" },
  { id: "twenty", label: "Slate" },
  { id: "twentyOne", label: "Mocha" },
];

// Mapping of color option IDs to CSS theme classes
export const THEME_CLASS_MAP = {
  zero: "theme-default",
  one: "theme-dark",
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
  sixteen: "theme-ocean",
  seventeen: "theme-lavender",
  eighteen: "theme-mint",
  nineteen: "theme-coral",
  twenty: "theme-slate",
  twentyOne: "theme-mocha",
};

// All theme classes (auto-generated from THEME_CLASS_MAP)
export const ALL_THEME_CLASSES = Object.values(THEME_CLASS_MAP);

// Per-note theme options (includes "default" to match global theme)
export const NOTE_THEME_OPTIONS = [
  { id: "default", label: "Match Theme" },
  { id: "dark", label: "Dark" },
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
  { id: "ocean", label: "Ocean" },
  { id: "lavender", label: "Lavender" },
  { id: "mint", label: "Mint" },
  { id: "coral", label: "Coral" },
  { id: "slate", label: "Slate" },
  { id: "mocha", label: "Mocha" },
];

// CSS custom properties for each theme (used for per-note theming)
export const THEME_VARS = {
  default: {
    "--bg": "#000000",
    "--fg": "#ffffff",
    "--muted": "#999999",
    "--panel-bg": "rgba(30, 30, 30, 0.6)",
    "--panel-border": "rgba(100, 150, 255, 0.2)",
    "--panel-bg-solid": "rgba(20, 20, 30, 0.8)",
    "--glass-bg":
      "linear-gradient(135deg, rgba(0, 0, 20, 0.4), rgba(100, 150, 255, 0.08))",
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
    "--bg": "#ceb4ff",
    "--fg": "#2d1b4e",
    "--muted": "#7c5cba",
    "--panel-bg": "rgba(230, 220, 255, 0.6)",
    "--panel-border": "rgba(124, 92, 186, 0.25)",
    "--panel-bg-solid": "#e6dcff",
    "--glass-bg":
      "linear-gradient(135deg, rgba(110, 80, 170, 0.32), rgba(255, 255, 255, 0.04))",
  },
  pink: {
    "--bg": "#fff1f6",
    "--fg": "#3a1228",
    "--muted": "#b76a93",
    "--panel-bg": "rgba(255, 240, 245, 0.62)",
    "--panel-border": "rgba(150, 100, 130, 0.12)",
    "--panel-bg-solid": "#ffe6ef",
    "--glass-bg":
      "linear-gradient(135deg, rgba(255, 230, 245, 0.6), rgba(255, 255, 255, 0.02))",
  },
  skyblue: {
    "--bg": "#e3f2fd",
    "--fg": "#1e3a5f",
    "--muted": "#4a90c7",
    "--panel-bg": "rgba(220, 240, 255, 0.7)",
    "--panel-border": "rgba(74, 144, 199, 0.25)",
    "--panel-bg-solid": "#d1e9ff",
    "--glass-bg":
      "linear-gradient(135deg, rgba(200, 230, 250, 0.9), rgba(74, 144, 199, 0.04))",
  },
  sage: {
    "--bg": "#e8f3e8",
    "--fg": "#2d4a2d",
    "--muted": "#6b8e6b",
    "--panel-bg": "rgba(220, 235, 220, 0.7)",
    "--panel-border": "rgba(107, 142, 107, 0.25)",
    "--panel-bg-solid": "#d8ead8",
    "--glass-bg":
      "linear-gradient(135deg, rgba(220, 235, 220, 0.9), rgba(107, 142, 107, 0.04))",
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
    "--muted": "#dca339",
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
  ocean: {
    "--bg": "#0a1929",
    "--fg": "#e3f5ff",
    "--muted": "#66b2ff",
    "--panel-bg": "rgba(10, 40, 80, 0.6)",
    "--panel-border": "rgba(102, 178, 255, 0.3)",
    "--panel-bg-solid": "#132f4c",
    "--glass-bg":
      "linear-gradient(135deg, rgba(10, 40, 80, 0.7), rgba(102, 178, 255, 0.08))",
  },
  lavender: {
    "--bg": "#f3f0ff",
    "--fg": "#2e1a47",
    "--muted": "#9775fa",
    "--panel-bg": "rgba(240, 235, 255, 0.7)",
    "--panel-border": "rgba(151, 117, 250, 0.25)",
    "--panel-bg-solid": "#ebe4ff",
    "--glass-bg":
      "linear-gradient(135deg, rgba(240, 235, 255, 0.9), rgba(151, 117, 250, 0.05))",
  },
  mint: {
    "--bg": "#e6fcf5",
    "--fg": "#0c4a3a",
    "--muted": "#20c997",
    "--panel-bg": "rgba(220, 250, 240, 0.7)",
    "--panel-border": "rgba(32, 201, 151, 0.25)",
    "--panel-bg-solid": "#d3f9e9",
    "--glass-bg":
      "linear-gradient(135deg, rgba(220, 250, 240, 0.9), rgba(32, 201, 151, 0.05))",
  },
  coral: {
    "--bg": "#fff5f5",
    "--fg": "#5c1a1a",
    "--muted": "#ff6b6b",
    "--panel-bg": "rgba(255, 240, 240, 0.7)",
    "--panel-border": "rgba(255, 107, 107, 0.25)",
    "--panel-bg-solid": "#ffe8e8",
    "--glass-bg":
      "linear-gradient(135deg, rgba(255, 240, 240, 0.9), rgba(255, 107, 107, 0.05))",
  },
  slate: {
    "--bg": "#1e293b",
    "--fg": "#f1f5f9",
    "--muted": "#94a3b8",
    "--panel-bg": "rgba(30, 41, 59, 0.6)",
    "--panel-border": "rgba(148, 163, 184, 0.25)",
    "--panel-bg-solid": "#334155",
    "--glass-bg":
      "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(148, 163, 184, 0.05))",
  },
  mocha: {
    "--bg": "#3d2817",
    "--fg": "#f5e6d3",
    "--muted": "#d4a574",
    "--panel-bg": "rgba(80, 50, 30, 0.6)",
    "--panel-border": "rgba(212, 165, 116, 0.25)",
    "--panel-bg-solid": "#52341f",
    "--glass-bg":
      "linear-gradient(135deg, rgba(80, 50, 30, 0.7), rgba(212, 165, 116, 0.06))",
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
