# PDF question answering on the demo page

The demo page has a second section where a visitor uploads a PDF and asks questions about it.

## Flow

1. The browser checks the type and size (PDF, at most 10 MB). Files above 3 MB are split by page range with pdf-lib so each request stays under the Vercel request body limit.
2. POST /api/pdf/extract checks the declared total size, the part size, and the `%PDF-` header, then extracts text per page with unpdf in a Node function.
3. POST /api/pdf/index splits pages into 900 character chunks with 150 characters of overlap, keeps the page number on each chunk, embeds them with text-embedding-3-small at 512 dimensions, and writes four suggested questions with gpt-4o-mini in JSON mode. The vectors are returned to the browser as int8 base64. Nothing is stored on the server.
4. POST /api/pdf/ask embeds the question, ranks chunks by cosine similarity and by BM25, fuses the two lists with reciprocal rank fusion (k = 60), optionally reranks the top 10 with gpt-4o-mini, and answers from the top 5 with page citations. Every answer carries inline (p. N) citations: references such as (page 3) or [p. 3] are normalized, pages outside the retrieved passages are removed, and the cited pages are appended when the text has none. When the passages do not support an answer, the reply is `Not found in document.`

## Limits

- 15 tests per browser per day (UTC). An upload or a question is one test. The count lives in a signed httpOnly cookie and in an in-memory map keyed by a hash of the client IP. The higher of the two is used. The in-memory map is per function instance, so it is a fallback, not a shared store.
- At most 400 pages, 400,000 characters of text, and 300 chunks per document. Questions are limited to 500 characters.
- Output caps: 500 tokens for an answer, 300 for suggestions, 120 for the rerank.

## Cost

Estimated from token usage and list prices (text-embedding-3-small 0.02 USD per 1M tokens, gpt-4o-mini 0.15 input and 0.60 output per 1M). Measured on 2026-10-22 with the 88-page diabetes report: indexing 0.00116 USD (49,163 embedding tokens), each question with rerank 0.00035 to 0.00046 USD. A three-page sample PDF cost 0.00005 USD to index and about 0.00005 USD per question.

## Configuration

OPENAI_API_KEY is a server-only, sensitive environment variable in the Vercel project. It is never sent to the browser. The lab-note demo at /api/query also runs live on OpenAI and counts against the same daily limit. When the key is missing, every live route returns HTTP 503 with a clear message.

## Robustness

- Password-protected and damaged files return a clear 422 message. Encrypted files above 3 MB cannot be split in the browser and get their own message.
- PDFs without a text layer (scanned images) are detected after extraction and rejected before any OpenAI call, without using a test.
- BM25 tokenizes Unicode letters and numbers, and splits Chinese, Japanese and Korean runs into character bigrams, so non-English documents rank lexically. Suggested questions are always written in English, whatever the document language. Each set is checked with a language heuristic and regenerated, up to three attempts, when a question is not English. Answers are written in English unless the question itself is written in, or asks for, another language.
- OpenAI calls time out after 25 seconds and retry up to three times on HTTP 429 and 5xx, honouring Retry-After.

## Live numbers

Every timing, token count and cost in a live result is measured for that request: split time in the browser, server extract time, embedding, retrieval, rerank and generation latency, token usage from the provider's usage field, and cost from that usage times the list price.
