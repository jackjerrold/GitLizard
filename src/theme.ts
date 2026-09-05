export type ThemeId =
  | "paper"
  | "navy-peach"
  | "terminal"
  | "editorial"
  | "lizard"
  | "cobalt-citrine";

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  {
    id: "paper",
    label: "Obsidian & Parchment",
    description: "Dark charcoal with warm paper cards and a soft blue accent.",
  },
  {
    id: "navy-peach",
    label: "Navy & Peach",
    description: "Deep navy ground, cream cards, a single peach accent.",
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Black and phosphor green, zero border radius, monospace only.",
  },
  {
    id: "editorial",
    label: "Warm Editorial",
    description: "A light theme — cream paper, terracotta accent, serif headings.",
  },
  {
    id: "lizard",
    label: "Lizard",
    description: "Deep terrarium green with a scale-bright accent, gitlizard's house theme.",
  },
  {
    id: "cobalt-citrine",
    label: "Cobalt & Citrine",
    description: "Deep navy ground with a bold gold accent and cobalt blue highlights.",
  },
];

const THEME_IDS: ThemeId[] = THEMES.map((t) => t.id);
const THEME_STORAGE_KEY = "gitlizard-theme";

export function loadStoredTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_IDS.includes(saved as ThemeId) ? (saved as ThemeId) : "navy-peach";
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}