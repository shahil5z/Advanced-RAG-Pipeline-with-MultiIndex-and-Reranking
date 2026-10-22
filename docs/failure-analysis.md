# Failure analysis

Source: stored `flat_baseline` metrics on the 40 reviewed questions, with retrieved
pages from a rerun of the same settings on 2026-10-22.

Retrieved pages were stored on a rerun with the flat_baseline settings. Each miss has a fine-grained cause assigned by fixed rules from those pages.

Questions: 40.
Recall below 1: 8.
Recall 0 (`retrieval_miss`): 5.
Partial recall (`partial_page_coverage`): 3.

Fine-grained causes:

- `adjacent_page`: 1
- `lexical_mismatch`: 2
- `multi_page_partial`: 3
- `same_document_distractor`: 2

## q02

Question: How many adults were estimated to be living with diabetes in 2014?

Expected pages: Global report on diabetes.pdf p5, Global report on diabetes.pdf p20.

Retrieved pages: Global report on diabetes.pdf p24, Global report on diabetes.pdf p5, Global report on diabetes.pdf p30, Global report on diabetes.pdf p24, Global report on diabetes.pdf p21.

Category: `partial_page_coverage`. Cause: `multi_page_partial`. Recall@5 0.500, hybrid 0.500.

Likely cause: The answer is labelled on more than one page. Retrieval found at least one labelled page and missed the others, and the remaining slots went to pages that repeat the same facts.

Mitigation: Widen K or deduplicate near-identical pages before the final top 5.

## q03

Question: How did the age-standardized global prevalence of diabetes change from 1980 to the figure given for the adult population?

Expected pages: Global report on diabetes.pdf p5.

Retrieved pages: Global report on diabetes.pdf p25, Global report on diabetes.pdf p30, Global report on diabetes.pdf p24, Global report on diabetes.pdf p24, Global report on diabetes.pdf p24.

Category: `retrieval_miss`. Cause: `same_document_distractor`. Recall@5 0.000, hybrid 0.000.

Likely cause: All retrieved pages come from the right report, but from sections that discuss the same topic in other words. Neither dense, BM25, nor hybrid retrieval reached the labelled page.

Mitigation: Add a cross-encoder or LLM rerank over a wider candidate set, or tag section headings in metadata.

## q05

Question: How many additional deaths in 2012 were attributed to higher-than-optimal blood glucose?

Expected pages: Global report on diabetes.pdf p5, Global report on diabetes.pdf p20.

Retrieved pages: Global report on diabetes.pdf p22, Global report on diabetes.pdf p21, Global report on diabetes.pdf p20, Global report on diabetes.pdf p23, Global report on diabetes.pdf p20.

Category: `partial_page_coverage`. Cause: `multi_page_partial`. Recall@5 0.500, hybrid 0.500.

Likely cause: The answer is labelled on more than one page. Retrieval found at least one labelled page and missed the others, and the remaining slots went to pages that repeat the same facts.

Mitigation: Widen K or deduplicate near-identical pages before the final top 5.

## q09

Question: Where does the report say basic blood glucose testing should be available?

Expected pages: Global report on diabetes.pdf p6, Global report on diabetes.pdf p46, Global report on diabetes.pdf p47.

Retrieved pages: Global report on diabetes.pdf p74, Global report on diabetes.pdf p71, Global report on diabetes.pdf p47, Global report on diabetes.pdf p74, Global report on diabetes.pdf p2.

Category: `partial_page_coverage`. Cause: `multi_page_partial`. Recall@5 0.333, hybrid 0.333.

Likely cause: The answer is labelled on more than one page. Retrieval found at least one labelled page and missed the others, and the remaining slots went to pages that repeat the same facts.

Mitigation: Widen K or deduplicate near-identical pages before the final top 5.

## q11

Question: What does the report say people with type 1 diabetes require daily?

Expected pages: Global report on diabetes.pdf p10.

Retrieved pages: Global report on diabetes.pdf p25, Global report on diabetes.pdf p0, Global report on diabetes.pdf p6, Global report on diabetes.pdf p5, Global report on diabetes.pdf p74.

Category: `retrieval_miss`. Cause: `lexical_mismatch`. Recall@5 0.000, hybrid 1.000.

Likely cause: Dense search ranked the labelled page outside the top 5, while BM25 alone and hybrid RRF both retrieved it. The question shares exact terms with the page that the embedding did not weight.

Mitigation: Use hybrid retrieval (dense + BM25 fused with RRF). On this question it recovers the page.

## q18

Question: What fasting plasma glucose value does the report give as the diagnostic criterion for diabetes?

Expected pages: Global report on diabetes.pdf p20.

Retrieved pages: Global report on diabetes.pdf p82, Global report on diabetes.pdf p83, Global report on diabetes.pdf p83, Global report on diabetes.pdf p47, Global report on diabetes.pdf p0.

Category: `retrieval_miss`. Cause: `lexical_mismatch`. Recall@5 0.000, hybrid 1.000.

Likely cause: Dense search ranked the labelled page outside the top 5, while BM25 alone and hybrid RRF both retrieved it. The question shares exact terms with the page that the embedding did not weight.

Mitigation: Use hybrid retrieval (dense + BM25 fused with RRF). On this question it recovers the page.

## q33

Question: What does the WHO Global NCD Action Plan 2013-2020 set out, according to the prevention section?

Expected pages: Global report on diabetes.pdf p42.

Retrieved pages: Global report on diabetes.pdf p76, Global report on diabetes.pdf p14, Global report on diabetes.pdf p18, Global report on diabetes.pdf p79, Global report on diabetes.pdf p14.

Category: `retrieval_miss`. Cause: `same_document_distractor`. Recall@5 0.000, hybrid 0.000.

Likely cause: All retrieved pages come from the right report, but from sections that discuss the same topic in other words. Neither dense, BM25, nor hybrid retrieval reached the labelled page.

Mitigation: Add a cross-encoder or LLM rerank over a wider candidate set, or tag section headings in metadata.

## q36

Question: Which glucose-lowering medicines does the report say are on the WHO Model list of essential medicines?

Expected pages: Global report on diabetes.pdf p51.

Retrieved pages: Global report on diabetes.pdf p57, Global report on diabetes.pdf p13, Global report on diabetes.pdf p52, Global report on diabetes.pdf p13, Global report on diabetes.pdf p64.

Category: `retrieval_miss`. Cause: `adjacent_page`. Recall@5 0.000, hybrid 0.000.

Likely cause: A retrieved page sits next to the labelled page. The facts cross a page or chunk boundary, so the neighbouring chunk ranked higher.

Mitigation: Chunk across page breaks with page ranges in metadata, or count adjacent pages in review.
