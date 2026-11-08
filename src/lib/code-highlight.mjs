import { bundledLanguages, bundledThemes, codeToHtml } from "shiki";

const backgrounds = {
  tech: ["#f5f6f8", "#1e1f22"],
  reflections: ["#f7f1e5", "#332c23"],
  writing: ["#ffffff", "#ffffff"],
  exercise: ["#f3f6ee", "#1a2417"],
  journal: ["#edf2f1", "#20302e"],
  parenting: ["#fffaf5", "#342d34"],
  unclassified: ["#ffffff", "#202626"],
};
const themes = new Map();
const channels = (color) =>
  /^#[\da-f]{6}$/i.test(color ?? "")
    ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
    : null;
const luminance = (rgb) =>
  rgb
    .map((x) => x / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
export function codeContrast(foreground, background) {
  const a = channels(foreground),
    b = channels(background);
  if (!a || !b) return Infinity;
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function readableColor(color, background) {
  const rgb = channels(color);
  if (!rgb || codeContrast(color, background) >= 4.5) return color;
  const target = luminance(channels(background)) > 0.4 ? 0 : 255;
  for (let step = 1; step <= 100; step++) {
    const adjusted =
      "#" +
      rgb
        .map((x) =>
          Math.round(x + ((target - x) * step) / 100)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
    if (codeContrast(adjusted, background) >= 4.5) return adjusted;
  }
  return target ? "#ffffff" : "#000000";
}
export function sectionCodeThemes(section) {
  if (!Object.hasOwn(backgrounds, section ?? ""))
    return Promise.resolve({ light: "github-light", dark: "github-dark" });
  if (!themes.has(section))
    themes.set(
      section,
      Promise.all(
        ["light", "dark"].map(async (mode, index) => {
          const baseMode = section === "writing" ? "light" : mode;
          const original = (await bundledThemes[`github-${baseMode}`]())
            .default;
          const background = backgrounds[section][index];
          return [
            mode,
            {
              ...original,
              name: `blog-${section}-${mode}`,
              colors: {
                ...original.colors,
                "editor.background": background,
                "editor.foreground": readableColor(
                  original.colors["editor.foreground"],
                  background,
                ),
              },
              tokenColors: original.tokenColors.map((rule) => ({
                ...rule,
                settings: {
                  ...rule.settings,
                  ...(rule.settings.foreground
                    ? {
                        foreground: readableColor(
                          rule.settings.foreground,
                          background,
                        ),
                      }
                    : {}),
                },
              })),
            },
          ];
        }),
      ).then(Object.fromEntries),
    );
  return themes.get(section);
}

// Shiki caches its highlighter and loads grammars on demand on the server.
export async function highlightCode(source, language = "", section) {
  const requested = language.toLowerCase();
  const lang = Object.hasOwn(bundledLanguages, requested) ? requested : "text";
  return codeToHtml(source, {
    lang,
    themes: await sectionCodeThemes(section),
    defaultColor: false,
  });
}
