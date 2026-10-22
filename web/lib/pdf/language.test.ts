import assert from "node:assert/strict";

import { looksEnglish } from "./language";
import { enforceCitations, suggestQuestions } from "./pipeline";
import { emptyUsage } from "./openai";

assert.ok(looksEnglish("What was the population of France on 1 January 2024?"));
assert.ok(looksEnglish("How many babies were born in France in 2023?"));
assert.ok(looksEnglish("What does the INSEE report say about the décès rate?"));
assert.ok(!looksEnglish("¿Cuál fue la tasa de natalidad en 2023?"));
assert.ok(!looksEnglish("Quelle était la population de la France au 1er janvier 2024 ?"));
assert.ok(!looksEnglish("Wie viele Kinder wurden 2023 geboren?"));
assert.ok(!looksEnglish("2023年に生まれた子どもは何人ですか"));

const allowed = new Set([2, 3, 7]);
assert.deepEqual(enforceCitations("The rate was 1.68.", [3], allowed), { answer: "The rate was 1.68 (p. 3).", citations: [3] });
assert.equal(enforceCitations("It rose (page 2) and fell [p. 7].", [], allowed).answer, "It rose (p. 2) and fell (p. 7).");
assert.equal(enforceCitations("It rose (pp. 2, 9).", [], allowed).answer, "It rose (p. 2).");
assert.deepEqual(enforceCitations("Bad cite (p. 9).", [], allowed, 3), { answer: "Bad cite (p. 3).", citations: [3] });
assert.deepEqual(enforceCitations("Two pages", [7, 2], allowed).answer, "Two pages (p. 2, p. 7)");

assert.equal(enforceCitations("The title is 'Constitución Española.' (p. 2)", [], allowed).answer, "The title is 'Constitución Española' (p. 2).");

void (async () => {
  const replies = [
    { questions: ["¿Cuál es la tasa?", "What is the rate in 2023?", "Quelle est la population ?", "Who wrote the report?"] },
    { questions: ["What is the population?", "How many marriages were there?", "What is the rate in 2023?"] },
  ];
  let calls = 0;
  const result = await suggestQuestions("excerpts", emptyUsage(), async () => replies[calls++]);
  assert.equal(calls, 2);
  assert.deepEqual(result, ["What is the rate in 2023?", "Who wrote the report?", "What is the population?", "How many marriages were there?"]);
  console.log("language tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
