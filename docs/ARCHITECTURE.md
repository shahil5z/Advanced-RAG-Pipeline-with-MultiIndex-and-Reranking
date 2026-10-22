# Architecture

## Local research

`notebooks/2_assignment.ipynb` loaded two PDFs, split them, embedded them with `all-MiniLM-L6-v2`, and built Flat L2, HNSW (`M=32`, `efConstruction=40`), and IVF (`nlist=100`, `nprobe=10`). It timed one query and treated L2 distance as the score. BM25 used the position in the result list because the chunks had no id. The calls that wrote the DOCX files did not receive the retrieved text. The other notebook is a separate Pinecone exercise. Those notebooks are history. They are not the supported path.

`src/advanced_rag` keeps the splitter defaults and the three index settings. Configuration supplies paths. Chunk ids are `{filename}:p{page}:c{n}`. BM25 scores `corpus_index`, which is the FAISS row. `OpenAIGenerator` is the only generator. The prompt includes the retrieved chunks. The key is `OPENAI_API_KEY` from the process environment. The package does not load a dotenv file.

```text
PDF pages -> chunks -> vectors -> one FAISS index
                                 -> optional BM25 on the hits
                                 -> OpenAI, only if query() is called
```

`RAGPipeline.retrieve` stops before generation.

## Evaluation

`src/ragcheck` scores `data/golden/diabetes.jsonl`. Metrics are page-level Recall@K, Precision@K, MRR, nDCG, and citation precision. Citation precision divides by the number of distinct cited pages. Precision@K divides by K. Definitions are in `src/ragcheck/metrics/retrieval.py`.

The default matrix is Flat with reranking, Flat without it, HNSW, and IVF. Embeddings are computed once per chunking setup. IVF still uses `nlist=100`. The stored run trained 1,177 vectors. FAISS warned that this is below the 3,900 points it wants for 100 lists. The configuration was not changed to hide that warning.

`results/baseline.json` is Flat with reranking. `ragcheck ci --name <experiment>` fails when a metric drops by more than 0.05. On the stored file, HNSW passes, the no-rerank run fails on MRR and nDCG, and IVF stays inside the threshold.

The OpenAI judge is optional, cached, and was not used for the stored table.

## Public site

`web/` is Next.js. Deploy it with the Vercel project root set to `web`. The settings and environment variables are in `docs/VERCEL.md`.

```text
Browser -> pages
        -> POST /api/query
              -> six lab-note passages
              -> hashed token vectors, or OpenAI embeddings when OPENAI_API_KEY is set
              -> exact L2 search
              -> optional BM25 rerank
              -> quoted passage, or OpenAI generation when the key is set
        -> /evaluation reads web/data/benchmark.json from the local FAISS run
```

PyTorch, sentence-transformers, and FAISS stay in the local package. A default serverless function would have to download `all-MiniLM-L6-v2` and ship those wheels. The public flat index uses hashed token vectors instead, so the demo retrieves and reranks with no key. `OPENAI_API_KEY` is optional and is read only on the server. The browser never receives it, and the caller cannot choose a filesystem path or a model name.

The content security policy allows inline scripts, which Next.js uses to hydrate the demo.

Page numbers in the demo are zero-based, matching the evaluation labels. The benchmark PDFs are not required to open the site.

## What is not deterministic

HNSW can differ across FAISS builds. IVF training uses the configured seed and still depends on the FAISS version. OpenAI generation is not deterministic. The stored retrieval metrics are the output of one local run.
