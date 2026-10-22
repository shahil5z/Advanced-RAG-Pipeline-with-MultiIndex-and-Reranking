"""Local sentence-transformer embeddings.

Vectors are not normalized. The FAISS indexes use L2 distance, which is the
distance the notebook stored.
"""

from __future__ import annotations

import numpy as np


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model = None

    def _load(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise RuntimeError("sentence-transformers is required to embed text.") from exc
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        if not texts:
            raise ValueError("No text to embed.")
        vectors = self._load().encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=False,
        )
        return np.asarray(vectors, dtype="float32")

    def embed_query(self, text: str) -> np.ndarray:
        vectors = self.embed_documents([text])
        return vectors[0]
