# Advanced RAG Evaluation Lab

A local multi-index RAG pipeline and a small evaluation tool, `ragcheck`, taken from an older notebook and measured on 40 reviewed questions.

On that benchmark, BM25 did not change Recall@5 (0.833). It raised MRR from 0.629 to 0.779 and nDCG from 0.670 to 0.784. Relevant pages moved up the list. They were not newly introduced into the top five.

## What this is for

The notebook timed one query and printed an L2 distance. This package keeps the Flat, HNSW, and IVF setup, then scores retrieval against labeled pages and can fail a run when a metric drops.

## Architecture

Locally, `advanced_rag` loads PDFs, chunks them, embeds them with `all-MiniLM-L6-v2`, and searches one FAISS index. BM25 can rerank those hits. OpenAI is the only generator. It receives the retrieved text and reads `OPENAI_API_KEY` from the environment. `ragcheck` can score retrieval without that key.

The public site is a Next.js view of saved data. It shows six prepared questions from a short note written for the site, and the benchmark table. It does not embed the project PDFs, rebuild FAISS, or call OpenAI.

Details are in `docs/ARCHITECTURE.md`.

## Quick start

```bash
python -m pip install -e ".[dev,openai]"
ragcheck build-dataset
pytest
```

Export `OPENAI_API_KEY` in the shell before generation or the judge. The package does not load a secrets file.

```bash
ragcheck run --matrix experiments/default.yaml
ragcheck ci --current results/experiments/latest.json --baseline results/baseline.json --name hnsw
cd web && npm install && npm run dev
```

`ragcheck run` downloads the embedding model on first use and embeds the PDFs. The committed results already contain one local run.

## Evaluation

`data/golden/diabetes.jsonl` has 40 questions checked against `Global report on diabetes.pdf`. Page numbers are zero-based. `Understanding_Science.pdf` is in the index as a distractor. Its OCR text was not used to write questions.

A chunk is relevant when its file and page are labeled. The same page counts once.

- Recall@5: labeled pages found in the top five distinct pages, divided by the number of labeled pages.
- Precision@5: labeled pages in those five slots, divided by 5.
- MRR: 1 divided by the rank of the first labeled page.
- nDCG: binary gain, log base 2.
- Citation precision: labeled pages among the distinct pages that were cited, divided by how many distinct pages were cited. This pipeline cites every retrieved chunk. The value is about 0.229 with reranking. It is not answer accuracy. It is lower or higher than Precision@5 because the denominator is the number of distinct cited pages, not 5.

L2 distance is not accuracy. Smaller is closer. After BM25, a larger score is better.

The optional OpenAI judge scores faithfulness, answer relevance, and context relevance from 0 to 1, then caches the JSON. Those scores were not part of this benchmark. The key was not in the process environment.

## Benchmark results

1,177 chunks, chunk size 1,000, overlap 200, top 5, seed 42, Python 3.13.15, `all-MiniLM-L6-v2`. The numbers are copied from `results/experiments/latest.json`.

| Configuration | Recall@5 | MRR | nDCG | Citation precision | Median retrieval |
|---|---:|---:|---:|---:|---:|
| Flat, reranking on | 0.833 | 0.779 | 0.784 | 0.229 | 5.7 ms |
| Flat, reranking off | 0.833 | 0.629 | 0.670 | 0.229 | 4.0 ms |
| HNSW, reranking on | 0.833 | 0.779 | 0.784 | 0.229 | 5.5 ms |
| IVF, reranking on | 0.796 | 0.754 | 0.755 | 0.217 | 5.5 ms |

## Interpretation

BM25 changed order, not coverage. Recall@5 stayed 0.833. MRR and nDCG rose as above.

HNSW matched Flat on every reported metric. Median retrieval differed by about 1 ms. Mean retrieval was about 35 to 37 ms because the first queries were slower than the median. This corpus does not show a useful speed gap between the indexes.

IVF kept the original `nlist=100` and `nprobe=10`. FAISS warned that 1,177 vectors are below the 3,900 it asks for when training 100 lists. Recall@5 was 0.796. Read that as an experiment on this corpus, not as a general claim about IVF.

`results/baseline.json` is Flat with reranking. `ragcheck ci` fails a metric that drops by more than 0.05. HNSW passes. The no-rerank run fails on MRR and nDCG. IVF stays inside the gate. Latency is not gated unless `latency_ratio` is set.

## Public demo

`web/` serves prepared traces from `data/demo/lab-notes.pdf`. The evaluation page repeats the table above. Full retrieval and generation stay in the Python package.

A Vercel project for this site should use `web` as the root directory. The site does not need `OPENAI_API_KEY`, the source PDFs, or a Python process. No production URL has been created from this repository.

## Limitations

- Forty questions and one clean source report.
- Page labels are wider than a single sentence.
- The IVF setting is undertrained for 1,177 vectors.
- Generation was not scored. OpenAI output is not deterministic.
- Index latency on this corpus is not a scaling result.
- The two source PDFs are for local runs. This project does not claim they can be redistributed.

## Repository structure

```text
src/advanced_rag/     pipeline
src/ragcheck/         metrics, matrix, CLI
data/golden/          40 reviewed questions
data/demo/            short public note
results/              stored benchmark
web/                  Next.js demo and table
docs/ARCHITECTURE.md
notebooks/            original notebooks
```
