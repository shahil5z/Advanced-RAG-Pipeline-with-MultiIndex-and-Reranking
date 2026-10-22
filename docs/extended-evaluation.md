# Extended evaluation

Measured on 2026-10-22 with `python scripts/extended_eval.py` on the 40 reviewed questions in data/golden/diabetes.jsonl. Artifacts are in results/extended/ and web/data/extended.json. The stored benchmark in results/experiments/ is unchanged.

Setup: all-MiniLM-L6-v2, chunk size 1000, overlap 200, 1,177 chunks, flat FAISS index, K = 5. Hybrid uses config/hybrid.yaml: dense top 20, BM25 top 20, RRF k = 60, final top 5. Latency is local CPU time per query, including query embedding.

## Hybrid retrieval

| Setup | Recall@5 | MRR | nDCG | Median ms | p95 ms |
| --- | --- | --- | --- | --- | --- |
| Dense only (flat) | 0.833 | 0.629 | 0.670 | 4.8 | 6.0 |
| Dense + BM25 rerank (flat_baseline) | 0.833 | 0.779 | 0.784 | 6.1 | 7.8 |
| BM25 only | 0.833 | 0.781 | 0.778 | 1.2 | 2.0 |
| Dense + BM25 with RRF | 0.858 | 0.760 | 0.772 | 54.9 | 63.3 |
| RRF + BM25 rerank | 0.858 | 0.821 | 0.819 | 105.9 | 168.2 |

The two dense rows reproduce the stored benchmark. RRF gains one question net: q11 and q18 recovered, q30 lost. The fused paths are slower because BM25 is fitted on every query in the current code.

## Model comparison

Each model answered from the same flat_baseline top 5 chunks at temperature 0. gpt-4.1-mini graded each answer against the reviewed reference (correctness) and against the context (faithfulness). These are model-based scores, not ground truth.

| Model | Correctness | Faithfulness | Median latency ms | p95 latency ms | Cost per query USD |
| --- | --- | --- | --- | --- | --- |
| gpt-4o-mini | 0.925 | 1.000 | 1516 | 3037 | 0.000209 |
| gpt-4.1-nano | 0.900 | 0.975 | 718 | 1336 | 0.000138 |
| gpt-4.1-mini | 0.950 | 1.000 | 1023 | 1609 | 0.000573 |

## Cost

Estimated OpenAI API cost from token usage and list prices per 1M tokens (gpt-4o-mini 0.15 / 0.60, gpt-4.1-nano 0.10 / 0.40, gpt-4.1-mini 0.40 / 1.60). Average input was 1,218 tokens per query. Per-query rows are in results/extended/per_query_cost.csv. Generation for 120 answers cost an estimated 0.0368 USD, the judge 0.0772 USD, total 0.1140 USD.

## Failure analysis

See docs/failure-analysis.md. With retrieved pages stored, the 8 flat_baseline misses split into multi_page_partial 3, lexical_mismatch 2, same_document_distractor 2, adjacent_page 1. No miss came from the distractor document.
