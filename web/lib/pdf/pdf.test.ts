import assert from "node:assert/strict";

import { chunkPages } from "./chunk";
import { MAX_PDF_BYTES, validatePdfFile } from "./limits";
import { checkQuota } from "./quota";
import { bm25Scores, cosine, decodeVector, encodeVector, rankOrder, reciprocalRankFusion } from "./rank";

const long = Array.from({ length: 400 }, (_, index) => `word${index}`).join(" ");
const chunks = chunkPages([{ page: 1, text: long }, { page: 2, text: "short page" }], 300, 60);
assert.ok(chunks.length > 2);
assert.ok(chunks.every((chunk) => chunk.text.length <= 300));
assert.equal(chunks[chunks.length - 1].page, 2);
const first = chunks[0].text.split(" ");
assert.ok(chunks[1].text.startsWith(first[first.length - 5]) || chunks[1].text.includes(first[first.length - 2]), "chunks overlap");

assert.equal(validatePdfFile({ name: "a.pdf", size: MAX_PDF_BYTES + 1, type: "application/pdf" })?.includes("10 MB"), true);
assert.equal(validatePdfFile({ name: "a.txt", size: 10, type: "text/plain" }), "Only PDF files are accepted.");
assert.equal(validatePdfFile({ name: "a.pdf", size: 10, type: "application/pdf" }), null);

const scores = bm25Scores("insulin dose", ["insulin dose timing", "exercise", "dose of vitamin"]);
assert.equal(rankOrder(scores)[0], 0);
const fused = reciprocalRankFusion([[0, 1, 2], [2, 0, 1]]);
assert.ok((fused.get(0) ?? 0) > (fused.get(1) ?? 0));

const vector = [0.5, -0.25, 0.1, 0];
assert.ok(cosine(vector, decodeVector(encodeVector(vector))) > 0.999);

let request = new Request("https://example.test/api/pdf/ask", { headers: { "x-forwarded-for": "203.0.113.9" } });
let check = checkQuota(request, 3);
for (let count = 0; count < 3; count += 1) {
  assert.equal(check.allowed, true);
  const used = check.commit();
  const cookie = used.cookie.split(";")[0];
  request = new Request("https://example.test/api/pdf/ask", { headers: { "x-forwarded-for": "203.0.113.9", cookie } });
  check = checkQuota(request);
  check = checkQuota(request, 3);
}
assert.equal(check.allowed, false);
assert.equal(check.remaining, 0);
const fresh = checkQuota(new Request("https://example.test/", { headers: { "x-forwarded-for": "203.0.113.9" } }), 3);
assert.equal(fresh.allowed, false, "ip fallback blocks a cleared cookie");
const forged = checkQuota(new Request("https://example.test/", { headers: { "x-forwarded-for": "198.51.100.1", cookie: "pdfqa_quota=e30.bad" } }), 3);
assert.equal(forged.used, 0);

console.log("pdf tests passed");
