// Shared UI font-size preferences for app-level typography scaling

export const UI_FONT_SIZE_OPTIONS = [
  { id: 14, label: "Small (14px)" },
  { id: 16, label: "Default (16px)" },
  { id: 18, label: "Large (18px)" },
  { id: 20, label: "Extra Large (20px)" },
];

export const DEFAULT_UI_FONT_SIZE = 16;

export const normalizeUIFontSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_UI_FONT_SIZE;
  return UI_FONT_SIZE_OPTIONS.some((o) => o.id === parsed)
    ? parsed
    : DEFAULT_UI_FONT_SIZE;
};

export const applyUIFontSize = (fontSize) => {
  const normalized = normalizeUIFontSize(fontSize);
  document.documentElement.style.fontSize = `${normalized}px`;
  document.documentElement.style.setProperty(
    "--ui-font-size",
    `${normalized}px`,
  );
};
