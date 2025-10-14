// Shared font definitions used by Settings and TextField
export const FONT_OPTIONS = [
  { id: "mono", label: "Mono" },
  { id: "inter", label: "Inter" },
  { id: "paper", label: "Paper" },
  { id: "handwritten", label: "Handwritten" },
  { id: "lora", label: "Lora" },
  { id: "poppins", label: "Poppins" },
  { id: "cormorant", label: "Cormorant" },
  { id: "space", label: "Space" },
  { id: "orbitron", label: "Orbitron" },
  { id: "amatic", label: "Amatic" },
  { id: "greatvibes", label: "Great Vibes" },
];

export const FONT_MAP = {
  mono: '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
  inter:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  paper: '"Merriweather", Georgia, "Times New Roman", serif',
  handwritten:
    '"Patrick Hand", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  lora: '"Lora", Georgia, "Times New Roman", serif',
  poppins:
    '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  cormorant: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
  space:
    "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  orbitron: "Orbitron, 'Segoe UI', Roboto, Arial, sans-serif",
  amatic: "'Amatic SC', 'Comic Sans MS', cursive",
  greatvibes: "'Great Vibes', cursive",
};

export default {
  FONT_OPTIONS,
  FONT_MAP,
};
