// Shared font definitions used by Settings and TextField
export const FONT_OPTIONS = [
  { id: "mono", label: "JetBrains Mono" },
  { id: "inter", label: "Inter" },
  { id: "roboto", label: "Roboto" },
  { id: "opensans", label: "Open Sans" },
  { id: "lato", label: "Lato" },
  { id: "sourcesans", label: "Source Sans Pro" },
  { id: "nunito", label: "Nunito" },
  { id: "paper", label: "Merriweather" },
  { id: "handwritten", label: "Patrick Hand" },
  { id: "caveat", label: "Caveat" },
  { id: "lora", label: "Lora" },
  { id: "poppins", label: "Poppins" },
  { id: "playfair", label: "Playfair Display" },
  { id: "ebgaramond", label: "EB Garamond" },
  { id: "cormorant", label: "Cormorant Garamond" },
  { id: "crimson", label: "Crimson Text" },
  { id: "space", label: "Space Grotesk" },
  { id: "sourcecodepro", label: "Source Code Pro" },
  { id: "firacode", label: "Fira Code" },
  { id: "inconsolata", label: "Inconsolata" },
  { id: "orbitron", label: "Orbitron" },
  { id: "amatic", label: "Amatic SC" },
  { id: "indieflower", label: "Indie Flower" },
  { id: "greatvibes", label: "Great Vibes" },
  { id: "lucida", label: "Lucida Grande" },
];

export const FONT_MAP = {
  mono: '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
  inter:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  roboto:
    '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  opensans:
    '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  lato: '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  sourcesans:
    '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  nunito:
    '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  paper: '"Merriweather", Georgia, "Times New Roman", serif',
  handwritten:
    '"Patrick Hand", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  caveat: '"Caveat", "Comic Sans MS", cursive',
  lora: '"Lora", Georgia, "Times New Roman", serif',
  poppins:
    '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  playfair: '"Playfair Display", Georgia, "Times New Roman", serif',
  ebgaramond: '"EB Garamond", Georgia, "Times New Roman", serif',
  cormorant: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
  crimson: '"Crimson Text", Georgia, "Times New Roman", serif',
  space:
    "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  sourcecodepro:
    '"Source Code Pro", Menlo, Monaco, Consolas, "Courier New", monospace',
  firacode: '"Fira Code", Menlo, Monaco, Consolas, "Courier New", monospace',
  inconsolata:
    '"Inconsolata", Menlo, Monaco, Consolas, "Courier New", monospace',
  orbitron: "Orbitron, 'Segoe UI', Roboto, Arial, sans-serif",
  amatic: "'Amatic SC', 'Comic Sans MS', cursive",
  indieflower: "'Indie Flower', 'Comic Sans MS', cursive",
  greatvibes: "'Great Vibes', cursive",
  lucida:
    '"Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Arial, sans-serif',
};

// Mapping of font IDs to CSS class names
export const FONT_CLASS_MAP = {
  mono: "font-mono",
  inter: "font-inter",
  roboto: "font-roboto",
  opensans: "font-opensans",
  lato: "font-lato",
  sourcesans: "font-sourcesans",
  nunito: "font-nunito",
  paper: "font-paper",
  handwritten: "font-handwritten",
  caveat: "font-caveat",
  lora: "font-lora",
  poppins: "font-poppins",
  playfair: "font-playfair",
  ebgaramond: "font-ebgaramond",
  cormorant: "font-cormorant",
  crimson: "font-crimson",
  space: "font-space",
  sourcecodepro: "font-sourcecodepro",
  firacode: "font-firacode",
  inconsolata: "font-inconsolata",
  orbitron: "font-orbitron",
  amatic: "font-amatic",
  indieflower: "font-indieflower",
  greatvibes: "font-greatvibes",
  lucida: "font-lucida",
};

// All font classes (auto-generated from FONT_CLASS_MAP)
export const ALL_FONT_CLASSES = Object.values(FONT_CLASS_MAP);

// Helper function to apply a font to the document root
export const applyFont = (fontId) => {
  const root = document.documentElement;
  root.classList.remove(...ALL_FONT_CLASSES);

  const fontClass = FONT_CLASS_MAP[fontId];
  if (fontClass) {
    root.classList.add(fontClass);
  }
};

const fonts = {
  FONT_OPTIONS,
  FONT_MAP,
  FONT_CLASS_MAP,
  ALL_FONT_CLASSES,
  applyFont,
};

export default fonts;
