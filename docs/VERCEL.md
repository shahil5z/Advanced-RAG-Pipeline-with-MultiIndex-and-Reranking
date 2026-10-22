# Deploying the site

The Vercel project root directory is `web`. The Python package is not part of the deployment.

| Setting | Value |
| --- | --- |
| Root Directory | `web` |
| Framework Preset | Next.js |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | Leave empty. Next.js publishes its own output. |
| Node.js | 22.x or 24.x |

`web/vercel.json` selects the Next.js framework and runs functions in Frankfurt (`fra1`).

Do not add a Python runtime, a FAISS build, or `sentence-transformers` to this project. Those dependencies are for local `ragcheck` runs. The live route is `POST /api/query`.

## Environment variables

Set these in the Vercel project for Production, Preview, and Development. None of them are required for the site to answer questions.

| Name | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Server-only. When it is set, `/api/query` embeds with `text-embedding-3-small` and writes the answer with `gpt-4.1-mini`. When it is unset, the route uses hashed token vectors, BM25, and quotes the top passage. Never use the `NEXT_PUBLIC_` prefix. |
| `NEXT_PUBLIC_SITE_URL` | No | Absolute origin for Open Graph metadata, for example `https://advanced-rag-evaluation.vercel.app`. When it is unset, that production domain is the default. |

The benchmark page and the lab-note corpus are committed in `web/data`. A deployment does not need the source PDFs, a vector database, or a model cache.

After changing `OPENAI_API_KEY` or `NEXT_PUBLIC_SITE_URL`, redeploy so the server build and the metadata pick up the new values.
