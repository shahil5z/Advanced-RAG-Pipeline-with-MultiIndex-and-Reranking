# Retrieval experiment report

Questions in the dataset: 40.

| Configuration | Recall | MRR | nDCG | Citation precision | Mean retrieval ms |
|---|---:|---:|---:|---:|---:|
| flat_baseline | 0.833 | 0.779 | 0.784 | 0.229 | 37.3 |
| flat_no_rerank | 0.833 | 0.629 | 0.670 | 0.229 | 35.3 |
| hnsw | 0.833 | 0.779 | 0.784 | 0.229 | 35.9 |
| ivf | 0.796 | 0.754 | 0.755 | 0.217 | 36.5 |

## Baseline comparison

The comparison below is `flat_no_rerank` against `flat_baseline`.

Status: FAIL

- recall_at_k: baseline 0.8333, current 0.8333, delta 0.0000, PASS
- precision_at_k: baseline 0.1850, current 0.1850, delta 0.0000, PASS
- mrr: baseline 0.7792, current 0.6292, delta -0.1500, FAIL
- ndcg: baseline 0.7843, current 0.6702, delta -0.1141, FAIL
- citation_precision: baseline 0.2288, current 0.2288, delta 0.0000, PASS
- mrr dropped by more than 0.05.
- ndcg dropped by more than 0.05.

LLM-judge scores are not in this report unless a run stored them.
Judge scores are model-based and are not ground truth.
