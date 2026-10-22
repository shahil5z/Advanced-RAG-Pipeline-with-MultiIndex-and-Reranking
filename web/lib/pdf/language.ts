const ENGLISH_WORDS = new Set(
  "a an the of to in on for by with from at as is are was were be been does do did how what which who whom whose when where why many much and or not this that these those it its their there than per according document report section page".split(" "),
);

const FOREIGN_WORDS = new Set(
  [
    // French
    "le", "la", "les", "des", "du", "une", "est", "sont", "quel", "quelle", "quels", "quelles", "combien", "pour", "dans", "avec", "sur", "qui", "que", "été", "ont", "selon", "entre", "année", "comment", "pourquoi",
    // Spanish and Portuguese
    "el", "los", "las", "del", "uno", "una", "qué", "cuál", "cuáles", "cuántos", "cuántas", "cuánto", "cómo", "dónde", "según", "fue", "son", "para", "por", "con", "año", "entre", "quién", "não", "uma", "qual", "quais", "quantos", "segundo",
    // German and Italian
    "der", "die", "das", "und", "ist", "wie", "viele", "welche", "welcher", "wurde", "nach", "dem", "den", "eine", "il", "di", "che", "sono", "quanti", "quale", "della",
  ],
);

/** Heuristic check that a short text is written in English. */
export function looksEnglish(text: string): boolean {
  const letters = [...text].filter((char) => /\p{L}/u.test(char));
  if (letters.length === 0) return false;
  const latin = letters.filter((char) => /[A-Za-z\u00C0-\u024F]/.test(char)).length;
  if (latin / letters.length < 0.9) return false;
  const accented = letters.filter((char) => /[\u00C0-\u024F]/.test(char)).length;
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  const english = words.filter((word) => ENGLISH_WORDS.has(word)).length;
  const foreign = words.filter((word) => FOREIGN_WORDS.has(word)).length;
  if (english === 0) return false;
  if (foreign >= english) return false;
  if (/[¿¡]/.test(text)) return false;
  return accented / letters.length < 0.08;
}
