# Advanced RAG Evaluation Lab

A local multi-index RAG pipeline and evaluation tool (`ragcheck`), measured on 40 reviewed questions.

## What this project is

A local RAG pipeline that loads PDFs, chunks them, embeds them with `all-MiniLM-L6-v2`, and searches FAISS indexes (Flat, HNSW, IVF). BM25 reranking is supported. OpenAI generates answers from retrieved context. An evaluation tool (`ragcheck`) scores retrieval against a golden dataset of 40 reviewed questions.

## Problem solved

Evaluates how different retrieval configurations affect page-level recall and citation quality on a documented benchmark, enabling comparison of vector indexes with and without lexical reranking.

## Core pipeline

```text
PDF pages
    → Chunking ( RecursiveCharacterTextSplitter, 1000/200 )
    → Embedding ( all-MiniLM-L6-v2, sentence-transformers )
    → One FAISS index ( Flat / HNSW / IVF )
        → Optional BM25 reranking
            → OpenAI generation (gpt-4.1-mini)
                → QueryResult with citations
```

## Key capabilities

- Multi-index retrieval: Flat (exact L2), HNSW (approximate), IVF (inverted file)
- BM25 reranking to reorder retrieved chunks by lexical relevance
- Configurable chunking (size 1000, overlap 200, sentence-level boundaries)
- Page-level evaluation with Recall@5, Precision@5, MRR, nDCG, citation precision
- Matrix benchmarking via `ragcheck` CLI (four configurations compared automatically)
- OpenAI-powered generation with grounded, context-constrained answers

## Technology stack

| Layer | Technology |
|---|---|
| PDF ingestion | `pymupdf`, `langchain-text-splitters` |
| Embedding | `sentence-transformers` (all-MiniLM-L6-v2) |
| Vector search | `faiss-cpu` (Flat, HNSW, IVF) |
| Lexical reranking | `rank-bm25` |
| Generation | OpenAI `gpt-4.1-mini` (via `openai` SDK) |
| Evaluation | `pytest`, custom metrics (Recall, MRR, nDCG, citation precision) |
| CLI | `ragcheck` (argument-driven matrix runner) |

## How the pipeline works

1. **Load** PDFs via `pymupdf` (extracts text per page)
2. **Chunk** pages recursively (preserving page labels)
3. **Embed** chunks with `all-MiniLM-L6-v2` (sentence-transformers, no normalization)
4. **Build** a FAISS index (configurable type: flat / hnsw / ivf)
5. **Rerank** top-k results with BM25 (if enabled)
6. **Generate** answer with OpenAI, grounded in retrieved chunks
7. **Score** retrieval using `ragcheck` against `data/golden/diabetes.jsonl` (40 questions)

## Benchmark results

1,177 chunks, chunk size 1,000, overlap 200, top-5, seed 42, Python 3.13.15, `all-MiniLM-L6-v2`.

| Configuration | Recall@5 | MRR | nDCG | Citation precision | Median retrieval |
|---|---|---|---|---|---|
| Flat, reranking on | 0.833 | 0.779 | 0.784 | 0.229 | 5.7 ms |
| Flat, reranking off | 0.833 | 0.629 | 0.670 | 0.229 | 4.0 ms |
| HNSW, reranking on | 0.833 | 0.779 | 0.784 | 0.229 | 5.5 ms |
| IVF, reranking on | 0.796 | 0.754 | 0.755 | 0.217 | 5.5 ms |

**Interpretation:** BM25 changed retrieval order without affecting coverage (Recall@5 stayed at 0.833). HNSW matched Flat on all metrics. IVF with `nlist=100` and `nprobe=10` is undertrained for 1,177 vectors (FAISS warning).

## How to run

```bash
# Install package (with OpenAI for generation)
python -m pip install -e ".[dev,openai]"

# Build dataset from golden questions (read-only, does not invent questions)
ragcheck build-dataset

# Run the experiment matrix and write results JSON
ragcheck run --matrix experiments/default.yaml

# Run CI check (fails if any metric drops >0.05 from baseline)
ragcheck ci --current results/experiments/latest.json --baseline results/baseline.json --name hnsw

# Run the full pipeline on a query (requires OPENAI_API_KEY)
python -c "
from advanced_rag.config import RAGConfig
from advanced_rag.pipeline import RAGPipeline
config = RAGConfig.from_dict({'embedding_model': 'all-MiniLM-L6-v2', 'index_type': 'flat', 'reranking': True, 'generation_model': 'gpt-4.1-mini', 'temperature': 0.5, 'input_paths': ['Global report on diabetes.pdf']})
pipe = RAGPipeline(config)
result = pipe.query('What does the document say about symptoms?')
print(result.answer)
print([c.chunk_id for c in result.retrieved_chunks])
"
```

## Project structure

```text
src/advanced_rag/           pipeline (chunking, embeddings, indexes, reranking, retrieval, generation)
src/ragcheck/               CLI, matrix runner, comparison, reports
data/golden/                40 reviewed questions (diabetes.jsonl)
data/demo/                  short public note (lab-notes.pdf)
results/                    stored benchmark (experiments/latest.json, baseline.json)
web/                        Next.js demo (serves prepared traces, no Python process needed)
docs/ARCHITECTURE.md        detailed architecture description
notebooks/                  original research notebooks
```

## Limitations

- Forty questions and one clean source report; results may not generalize
- Page labels span wider than a single sentence
- IVF (`nlist=100`) is undertrained for 1,177 vectors (FAISS warning)
- OpenAI generation is not deterministic; scores were not part of this benchmark
- Index latency on this corpus is not a scaling result
- Source PDFs are for local runs only; this project does not claim they can be redistributed
- No production URL or hosted deployment has been created from this repository

## References

- Architecture: `docs/ARCHITECTURE.md`
- Notebooks: `notebooks/1_rag_NOTEBOOK.ipynb`, `notebooks/2_assignment.ipynb`
- Live site: `web/` (Next.js, serves prepared traces from `data/demo/lab-notes.pdf`; does not embed PDFs, rebuild FAISS, or call OpenAI)