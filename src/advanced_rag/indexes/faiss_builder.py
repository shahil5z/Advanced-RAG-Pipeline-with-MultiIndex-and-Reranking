"""Build one of the three FAISS indexes used in the notebook.

Flat is exact L2 search. HNSW uses M=32 and efConstruction=40.
IVF uses nlist=100 and nprobe=10. IVF training uses the configured seed.
The same seed does not make HNSW identical across FAISS builds or machines.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from advanced_rag.config import RAGConfig


def build_faiss_index(vectors: np.ndarray, config: RAGConfig):
    try:
        import faiss
    except ImportError as exc:
        raise RuntimeError("faiss-cpu is required to build an index.") from exc

    matrix = np.ascontiguousarray(vectors, dtype="float32")
    if matrix.ndim != 2 or matrix.shape[0] == 0:
        raise ValueError("Cannot build an index from an empty embedding matrix.")
    dimension = matrix.shape[1]
    index: Any

    if config.index_type == "flat":
        index = faiss.IndexFlatL2(dimension)
        index.add(matrix)
        return index

    if config.index_type == "hnsw":
        index = faiss.IndexHNSWFlat(dimension, config.hnsw_m)
        index.hnsw.efConstruction = config.hnsw_ef_construction
        index.add(matrix)
        return index

    if len(matrix) < config.ivf_nlist:
        raise ValueError(
            f"IVF needs at least {config.ivf_nlist} vectors to train. "
            f"This corpus has {len(matrix)}."
        )
    quantizer = faiss.IndexFlatL2(dimension)
    index = faiss.IndexIVFFlat(quantizer, dimension, config.ivf_nlist, faiss.METRIC_L2)
    index.cp.seed = int(config.seed)
    np.random.seed(config.seed)
    index.train(matrix)
    index.add(matrix)
    index.nprobe = config.ivf_nprobe
    return index
