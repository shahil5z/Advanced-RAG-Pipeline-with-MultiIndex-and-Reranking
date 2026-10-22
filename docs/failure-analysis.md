# Failure analysis

Source: stored `flat_baseline` metrics on the 40 reviewed questions.
Retrieved pages were not stored with that run. The notes below use only the recorded recall.

Retrieved pages were not stored, so semantic, lexical, document, page, boundary, distractor, and filter categories were not assigned.

Questions: 40.
Recall below 1: 8.
Recall 0 (`retrieval_miss`): 5.
Partial recall (`partial_page_coverage`): 3.

These categories are not semantic or lexical judgments. They only say whether the page-level recall was zero or partial.

## q02

Question: How many adults were estimated to be living with diabetes in 2014?

Expected pages: Global report on diabetes.pdf p5, Global report on diabetes.pdf p20.

Retrieved pages: not stored.

Category: `partial_page_coverage`. Recall@5 0.5.

Likely cause: The stored flat_baseline run recorded page-level metrics for this question but did not record retrieved pages. A finer cause (semantic miss, lexical mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata filter) cannot be assigned without that evidence.

Mitigation: Persist retrieved document ids and pages on the next evaluation run, then classify the miss from the stored pages.

## q03

Question: How did the age-standardized global prevalence of diabetes change from 1980 to the figure given for the adult population?

Expected pages: Global report on diabetes.pdf p5.

Retrieved pages: not stored.

Category: `retrieval_miss`. Recall@5 0.0.

Likely cause: The stored flat_baseline run recorded page-level metrics for this question but did not record retrieved pages. A finer cause (semantic miss, lexical mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata filter) cannot be assigned without that evidence.

Mitigation: Persist retrieved document ids and pages on the next evaluation run, then classify the miss from the stored pages.

## q05

Question: How many additional deaths in 2012 were attributed to higher-than-optimal blood glucose?

Expected pages: Global report on diabetes.pdf p5, Global report on diabetes.pdf p20.

Retrieved pages: not stored.

Category: `partial_page_coverage`. Recall@5 0.5.

Likely cause: The stored flat_baseline run recorded page-level metrics for this question but did not record retrieved pages. A finer cause (semantic miss, lexical mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata filter) cannot be assigned without that evidence.

Mitigation: Persist retrieved document ids and pages on the next evaluation run, then classify the miss from the stored pages.

## q09

Question: Where does the report say basic blood glucose testing should be available?

Expected pages: Global report on diabetes.pdf p6, Global report on diabetes.pdf p46, Global report on diabetes.pdf p47.

Retrieved pages: not stored.

Category: `partial_page_coverage`. Recall@5 0.3333333333333333.

Likely cause: The stored flat_baseline run recorded page-level metrics for this question but did not record retrieved pages. A finer cause (semantic miss, lexical mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata filter) cannot be assigned without that evidence.

Mitigation: Persist retrieved document ids and pages on the next evaluation run, then classify the miss from the stored pages.

## q11

Question: What does the report say people with type 1 diabetes require daily?

Expected pages: Global report on diabetes.pdf p10.

Retrieved pages: not stored.

Category: `retrieval_miss`. Recall@5 0.0.

Likely cause: The stored flat_baseline run recorded page-level metrics for this question but did not record retrieved pages. A finer cause (semantic miss, lexical mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata filter) cannot be assigned without that evidence.

Mitigation: Persist retrieved document ids and pages on the next evaluation run, then classify the miss from the stored pages.

## q18

Question: What fasting plasma glucose value does the report give as the diagnostic criterion for diabetes?

Expected pages: Global report on diabetes.pdf p20.

Retrieved pages: not stored.

Category: `retrieval_miss`. Recall@5 0.0.

Likely cause: The stored flat_baseline run recorded page-level metrics for this question but did not record retrieved pages. A finer cause (semantic miss, lexical mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata filter) cannot be assigned without that evidence.

Mitigation: Persist retrieved document ids and pages on the next evaluation run, then classify the miss from the stored pages.

## q33

Question: What does the WHO Global NCD Action Plan 2013-2020 set out, according to the prevention section?

Expected pages: Global report on diabetes.pdf p42.

Retrieved pages: not stored.

Category: `retrieval_miss`. Recall@5 0.0.

Likely cause: The stored flat_baseline run recorded page-level metrics for this question but did not record retrieved pages. A finer cause (semantic miss, lexical mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata filter) cannot be assigned without that evidence.

Mitigation: Persist retrieved document ids and pages on the next evaluation run, then classify the miss from the stored pages.

## q36

Question: Which glucose-lowering medicines does the report say are on the WHO Model list of essential medicines?

Expected pages: Global report on diabetes.pdf p51.

Retrieved pages: not stored.

Category: `retrieval_miss`. Recall@5 0.0.

Likely cause: The stored flat_baseline run recorded page-level metrics for this question but did not record retrieved pages. A finer cause (semantic miss, lexical mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata filter) cannot be assigned without that evidence.

Mitigation: Persist retrieved document ids and pages on the next evaluation run, then classify the miss from the stored pages.
