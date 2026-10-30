import { bundledLanguages, codeToHtml } from "shiki";

// Shiki caches its highlighter and loads grammars on demand on the server.
export async function highlightCode(source, language = "") {
  const requested = language.toLowerCase();
  const lang = Object.hasOwn(bundledLanguages, requested) ? requested : "text";
  return codeToHtml(source, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}
