<p align="center">
  <img src="web/public/logo.png" alt="Advanced RAG Pipeline Logo" width="200" />
</p>

<h1 align="center">Advanced RAG Pipeline with Multi-Index and Reranking</h1>

<p align="center">
  A local multi-index RAG pipeline that loads PDFs, chunks them, embeds them with HuggingFace sentence-transformers,
  searches FAISS indexes (Flat, HNSW, IVF), reranks results with BM25, and generates answers via OpenAI.
</p>

<p align="center">
  <a href="https://www.python.org/"><img alt="Python 3.11+" src="https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white" /></a>
  <a href="https://github.com/facebookresearch/faiss"><img alt="FAISS" src="https://img.shields.io/badge/FAISS-multi--index-13293d" /></a>
  <a href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2"><img alt="Sentence-Transformers" src="https://img.shields.io/badge/sentence--transformers-HuggingFace-24A1E3" /></a>
  <a href="https://openai.com/"><img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-LLM-74AA9C?logo=openai&logoColor=white" /></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-9a541f" /></a>
</p>

---

## Project Overview

This project implements a complete Retrieval-Augmented Generation (RAG) pipeline for local document processing and question answering.

**What it does:** Loads PDF documents, extracts text per page, splits content into semantic chunks, generates vector embeddings using `all-MiniLM-L6-v2`, indexes them with FAISS using three different strategies (Flat, HNSW, IVF), benchmarks retrieval performance, applies BM25 reranking to improve result quality, and generates grounded answers via OpenAI's language model.

**Why it exists:** The project demonstrates how different FAISS index types affect retrieval speed and accuracy on a documented benchmark, and how BM25 lexical reranking can improve result ordering without changing coverage.

## Pipeline Overview

```text
PDF Documents
      ↓
Document Extraction (pymupdf)
      ↓
Semantic Chunking (RecursiveCharacterTextSplitter, 1000/200)
      ↓
Embedding (all-MiniLM-L6-v2 via sentence-transformers)
      ↓
FAISS Vector Indexing
 ┌──────┼──────┐
 ↓      ↓      ↓
Flat   HNSW   IVF
 └──────┴──────┘
      ↓
Retrieval Benchmarking
      ↓
BM25 Reranking (rank-bm25)
      ↓
Prompt Construction
      ↓
LLM Generation (OpenAI gpt-4.1-mini)
      ↓
DOCX Report Output
```

## Core Components

| Component | Technology | Purpose |
|---|---|---|
| PDF Ingestion | `pymupdf` | Extracts text per page from PDF documents |
| Chunking | `langchain-text-splitters` | Splits text into overlapping chunks (1000/200) |
| Embeddings | `sentence-transformers` | Generates vectors with `all-MiniLM-L6-v2` |
| Vector Search | `faiss-cpu` | Flat, HNSW, and IVF index types |
| Reranking | `rank-bm25` | BM25 lexical reranking of retrieved chunks |
| Generation | OpenAI `gpt-4.1-mini` | LLM answers grounded in retrieved context |
| Evaluation | `ragcheck` CLI | Benchmarks recall, MRR, nDCG, citation precision |

## Multi-Index Retrieval

The pipeline supports three FAISS index types, each with different trade-offs:

- **Flat:** Exact L2 distance search. Baseline for accuracy comparison.
- **HNSW:** Hierarchical Navigable Small World graph. Approximate nearest neighbor with configurable M and efConstruction.
- **IVF:** Inverted File Index. Quantization-based indexing with nlist/nprobe parameters.

## BM25 Reranking

BM25 lexical reranking is applied after vector retrieval to reorder results by lexical relevance. This improves mean reciprocal rank (MRR) and nDCG by moving more relevant pages higher in the result list, without changing Recall@5 coverage.

## Benchmark Results

Evaluated on 40 reviewed questions against `Global report on diabetes.pdf`, with `Understanding_Science.pdf` as a distractor document.

1,177 chunks, chunk size 1,000, overlap 200, top-5, seed 42, Python 3.13.15, `all-MiniLM-L6-v2`.

| Configuration | Recall@5 | MRR | nDCG | Citation precision | Median retrieval |
|---|---|---|---|---|---|
| Flat, reranking on | 0.833 | 0.779 | 0.784 | 0.229 | 5.7 ms |
| Flat, reranking off | 0.833 | 0.629 | 0.670 | 0.229 | 4.0 ms |
| HNSW, reranking on | 0.833 | 0.779 | 0.784 | 0.229 | 5.5 ms |
| IVF, reranking on | 0.796 | 0.754 | 0.755 | 0.217 | 5.5 ms |

**Key finding:** BM25 changes retrieval order, not coverage. Recall@5 stays at 0.833 with or without reranking. HNSW matches Flat on all metrics with minimal latency difference.

## Report Samples

Sample DOCX reports generated from LLM responses:

<p align="center">
  <img src="IMG/Report%201.png" alt="Report Sample 1" width="500" />
</p>

<p align="center">
  <img src="IMG/Report%202.png" alt="Report Sample 2" width="500" />
</p>

## Project Structure

```text
Advanced-RAG-Pipeline-with-MultiIndex-and-Reranking/
├── IMG/
│   ├── Report 1.png          # Sample LLM-generated DOCX report
│   └── Report 2.png          # Sample LLM-generated DOCX report
├── web/public/
│   └── logo.png              # Project logo
├── notebooks/
│   ├── 1_rag_NOTEBOOK.ipynb  # Original RAG notebook
│   └── 2_assignment.ipynb    # Assignment implementation notebook
├── src/
│   ├── advanced_rag/         # Core RAG pipeline package
│   │   ├── chunking/         # Document chunking logic
│   │   ├── embeddings/       # Sentence-transformer embedding
│   │   ├── generation/       # OpenAI LLM generation
│   │   ├── indexes/          # FAISS index builders
│   │   ├── ingestion/        # PDF loading and extraction
│   │   ├── pipeline/         # Pipeline orchestration
│   │   ├── reranking/        # BM25 reranking
│   │   └── retrieval/        # FAISS vector search
│   └── ragcheck/             # Evaluation CLI tool
│       ├── cli.py            # Command-line interface
│       ├── compare.py        # Result comparison
│       └── runners/          # Matrix experiment runner
├── data/
│   ├── golden/               # 40 reviewed questions (diabetes.jsonl)
│   └── demo/                 # Demo note (lab-notes.pdf)
├── results/                  # Stored benchmark results
├── docs/                     # Architecture and decision records
├── Global report on diabetes.pdf  # Primary input document
├── Understanding_Science.pdf      # Distractor input document
├── medical_report.docx       # Generated output report
├── science_report.docx       # Generated output report
├── requirements.txt          # Python dependencies
├── config.example.yaml       # Example pipeline configuration
├── .env.example              # Example environment variables
├── LICENSE                   # MIT License
└── README.md                 # This file
```

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/shahil5z/Advanced-RAG-Pipeline-with-MultiIndex-and-Reranking.git
cd Advanced-RAG-Pipeline-with-MultiIndex-and-Reranking
pip install -r requirements.txt
```

## Configuration

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

**Required environment variable:**

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for LLM generation (read from process environment) |

The `.env.example` file contains placeholder values only. Do not commit real credentials.

## Usage

### Run the notebooks

Two Jupyter notebooks demonstrate the full pipeline:

1. `1_rag_NOTEBOOK.ipynb` — Original RAG research notebook
2. `2_assignment.ipynb` — Assignment implementation with full RAG setup

### Run the evaluation CLI

```bash
# Build and validate the golden dataset
ragcheck build-dataset

# Run the experiment matrix and write results
ragcheck run --matrix experiments/default.yaml

# Compare results against baseline
ragcheck ci --current results/experiments/latest.json --baseline results/baseline.json --name hnsw
```

### Run the pipeline programmatically

```python
from advanced_rag.config import RAGConfig
from advanced_rag.pipeline import RAGPipeline

config = RAGConfig.from_dict({
    "embedding_model": "all-MiniLM-L6-v2",
    "index_type": "flat",
    "reranking": True,
    "generation_model": "gpt-4.1-mini",
    "temperature": 0.5,
    "input_paths": ["Global report on diabetes.pdf"],
})

pipe = RAGPipeline(config)
result = pipe.query("What does the document say about symptoms?")
print(result.answer)
print([c.chunk_id for c in result.retrieved_chunks])
```

## Limitations

- Benchmark evaluated on 40 questions against one clean source report; results may not generalize
- Page labels span wider than a single sentence
- IVF (`nlist=100`) is undertrained for 1,177 vectors (FAISS training warning)
- OpenAI generation is non-deterministic; scores were not part of this benchmark
- Index latency on this corpus is not a scaling result
- Source PDFs are for local runs only; redistribution is not claimed
- The public web demo (`web/`) uses prepared traces and does not embed source PDFs

## Author

Shahil Haque

GitHub: [shahil5z](https://github.com/shahil5z)

## License

MIT License. See [LICENSE](LICENSE) for details.