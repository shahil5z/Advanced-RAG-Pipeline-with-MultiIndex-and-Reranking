<p align="center">
  <img src="web/public/logo.png" alt="Advanced RAG Evaluation Platform logo" width="200" />
</p>

<h1 align="center">Advanced RAG Evaluation Platform</h1>

<p align="center">
  A local multi-index RAG pipeline that loads PDFs, chunks them, embeds them with HuggingFace sentence-transformers,
  searches FAISS indexes (Flat, HNSW, IVF), reranks results with BM25, and generates answers via OpenAI.
</p>

<p align="center">
  <a href="https://www.python.org/"><img alt="Python 3.11+" src="https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white" /></a>
  <a href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2"><img alt="sentence-transformers" src="https://img.shields.io/badge/sentence--transformers-HuggingFace-FFD21E?logo=huggingface&logoColor=black" /></a>
  <a href="https://github.com/facebookresearch/faiss"><img alt="FAISS" src="https://img.shields.io/badge/FAISS-Flat%20%7C%20HNSW%20%7C%20IVF-0467DF" /></a>
  <a href="https://openai.com/"><img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-API-412991?logo=openai&logoColor=white" /></a>
  <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-web-000000?logo=nextdotjs&logoColor=white" /></a>
  <a href="https://vercel.com/"><img alt="Vercel" src="https://img.shields.io/badge/Vercel-deployed-000000?logo=vercel&logoColor=white" /></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow" /></a>
</p>

<p align="center">
  <a href="https://advanced-rag-evaluation.vercel.app"><strong>Live Demo</strong></a>
</p>

---

## Project Overview

This project is a retrieval augmented generation (RAG) pipeline with a reproducible evaluation harness. The Python package `advanced_rag` runs the pipeline locally, and the `ragcheck` CLI scores retrieval against a reviewed question set. A Next.js web app presents the benchmark results and offers a PDF question answering demo.

The goal is to measure, not assume, how index type, BM25 reranking, hybrid retrieval, and the choice of generation model affect quality, latency, and cost.

## Pipeline Overview

```text
PDF documents
  -> text extraction per page (pymupdf)
  -> chunking (1,000 characters, 200 overlap)
  -> embeddings (all-MiniLM-L6-v2, sentence-transformers)
  -> FAISS index: Flat, HNSW, or IVF
  -> top-k retrieval (optional hybrid dense + BM25 with RRF fusion)
  -> BM25 reranking
  -> prompt with retrieved context
  -> OpenAI generation
```

## Core Components

| Component | Technology | Purpose |
|---|---|---|
| Ingestion | `pymupdf` | Extracts text per page from PDFs |
| Chunking | `langchain-text-splitters` | Overlapping chunks with stable chunk ids |
| Embeddings | `sentence-transformers` | `all-MiniLM-L6-v2` vectors |
| Vector search | `faiss-cpu` | Flat, HNSW, and IVF indexes |
| Lexical scoring | `rank-bm25` | BM25 reranking and BM25 retrieval for hybrid search |
| Generation | OpenAI API | Grounded answers from retrieved chunks |
| Evaluation | `ragcheck` CLI | Recall@k, MRR, nDCG, citation precision, CI gate |
| Web app | Next.js on Vercel | Benchmark pages and a PDF Q&A demo |

The live PDF demo is a separate TypeScript path. It extracts text with `unpdf`, embeds with OpenAI `text-embedding-3-small`, answers with `gpt-4o-mini`, accepts PDFs up to 10 MB, and allows 15 requests per day per browser.

## Multi-Index Retrieval

- **Flat:** exact L2 search, used as the accuracy baseline.
- **HNSW:** graph based approximate search (`M=32`, `efConstruction=40`).
- **IVF:** inverted file index with `nlist=100`, `nprobe=10`.

Hybrid retrieval combines the top 20 dense results with the top 20 BM25 results using reciprocal rank fusion (`k=60`) and keeps the final top 5.

## BM25 Reranking

After retrieval, BM25 reorders the candidate chunks by lexical match with the question. Reranking does not add new chunks, so it cannot change Recall@5. On the benchmark it raised MRR from 0.629 to 0.779 and nDCG from 0.670 to 0.784 on the Flat index, at a cost of about 1.7 ms median latency.

## Benchmark Results

Setup: 40 reviewed questions on `Global report on diabetes.pdf`, with `Understanding_Science.pdf` as a distractor. 1,177 chunks, `all-MiniLM-L6-v2`, top 5, seed 42.

### Index types

| Configuration | Recall@5 | MRR | nDCG | Citation precision | p50 retrieval |
|---|---|---|---|---|---|
| Flat, reranking on | 0.833 | 0.779 | 0.784 | 0.229 | 5.7 ms |
| Flat, reranking off | 0.833 | 0.629 | 0.670 | 0.229 | 4.0 ms |
| HNSW, reranking on | 0.833 | 0.779 | 0.784 | 0.229 | 5.5 ms |
| IVF, reranking on | 0.796 | 0.754 | 0.755 | 0.217 | 5.5 ms |

### Hybrid retrieval (Flat index)

| Configuration | Recall@5 | MRR | nDCG | p50 retrieval |
|---|---|---|---|---|
| Dense only | 0.833 | 0.629 | 0.670 | 4.8 ms |
| Dense + BM25 rerank | 0.833 | 0.779 | 0.784 | 6.1 ms |
| BM25 only | 0.833 | 0.781 | 0.778 | 1.2 ms |
| Hybrid RRF | 0.858 | 0.760 | 0.772 | 54.9 ms |
| Hybrid RRF + BM25 rerank | 0.858 | 0.821 | 0.819 | 105.9 ms |

### Generation models

Retrieval: Flat with BM25 reranking, top 5 chunks, temperature 0. Correctness and faithfulness are judged by `gpt-4.1-mini`, so they are model based estimates, not ground truth.

| Model | Correctness | Faithfulness | Median latency | Cost per query |
|---|---|---|---|---|
| gpt-4.1-mini | 0.950 | 1.000 | 1,023 ms | $0.00057 |
| gpt-4o-mini | 0.925 | 1.000 | 1,516 ms | $0.00021 |
| gpt-4.1-nano | 0.900 | 0.975 | 718 ms | $0.00014 |

Estimated total OpenAI spend for this benchmark, including judging: $0.114.

## Limitations

- The evaluation set is small: 40 questions on one source report, so results may not generalize.
- Relevance is labeled at page level, which is coarser than the exact supporting sentence.
- IVF with `nlist=100` is undertrained for 1,177 vectors and triggers a FAISS training warning.
- Latencies were measured on a small local corpus and are not a scaling result.
- Model scores come from an LLM judge and OpenAI outputs are not fully deterministic.
- Cost figures are estimates from token counts and list prices.
- The live demo uses OpenAI embeddings rather than the local sentence-transformers model, so its retrieval differs from the benchmark.
- The demo daily limit is tracked per browser cookie, so clearing cookies resets it.

## Author

Designed and developed by **Shohrab Haque Shahil**

[LinkedIn](https://www.linkedin.com/in/shohrab-haque) 

## License

MIT License. See [LICENSE](LICENSE) for details.
