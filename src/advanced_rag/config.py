"""Run configuration. Secrets are not stored here."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path

INDEX_TYPES = ("flat", "hnsw", "ivf")


@dataclass
class RAGConfig:
    """Reproducible settings for one pipeline run.

    `output_path` is reserved for later artifacts. This package does not write it.
    """

    embedding_model: str = "all-MiniLM-L6-v2"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    index_type: str = "flat"
    top_k: int = 5
    reranking: bool = True
    generation_model: str = "gpt-4.1-mini"
    temperature: float = 0.5
    input_paths: list[str] = field(default_factory=list)
    output_path: str | None = None
    seed: int = 42
    hnsw_m: int = 32
    hnsw_ef_construction: int = 40
    ivf_nlist: int = 100
    ivf_nprobe: int = 10

    def __post_init__(self) -> None:
        self.index_type = str(self.index_type).lower()
        self.input_paths = [str(path) for path in self.input_paths]
        if self.output_path is not None:
            self.output_path = str(self.output_path)
        self._validate()

    def _validate(self) -> None:
        if self.index_type not in INDEX_TYPES:
            raise ValueError(
                f"index_type must be one of {', '.join(INDEX_TYPES)}. Got {self.index_type!r}."
            )
        if self.chunk_size < 1:
            raise ValueError("chunk_size must be at least 1.")
        if self.chunk_overlap < 0 or self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be zero or greater, and smaller than chunk_size.")
        if self.top_k < 1:
            raise ValueError("top_k must be at least 1.")
        if self.temperature < 0:
            raise ValueError("temperature must be zero or greater.")
        if self.hnsw_m < 2:
            raise ValueError("hnsw_m must be at least 2.")
        if self.hnsw_ef_construction < 1:
            raise ValueError("hnsw_ef_construction must be at least 1.")
        if self.ivf_nlist < 1:
            raise ValueError("ivf_nlist must be at least 1.")
        if self.ivf_nprobe < 1 or self.ivf_nprobe > self.ivf_nlist:
            raise ValueError("ivf_nprobe must be between 1 and ivf_nlist.")
        if not self.embedding_model.strip():
            raise ValueError("embedding_model is empty.")
        if not self.generation_model.strip():
            raise ValueError("generation_model is empty.")

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> RAGConfig:
        if not isinstance(data, dict):
            raise ValueError("Configuration must be a mapping.")
        known = {item.name for item in cls.__dataclass_fields__.values()}
        unknown = sorted(set(data) - known)
        if unknown:
            raise ValueError(f"Unknown configuration fields: {', '.join(unknown)}.")
        return cls(**data)


def load_config(path: str | Path) -> RAGConfig:
    """Load a YAML configuration. The file must not contain credentials."""

    config_path = Path(path)
    if not config_path.is_file():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    try:
        import yaml
    except ImportError as exc:
        raise RuntimeError("PyYAML is required to load a YAML configuration.") from exc
    loaded = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    if not isinstance(loaded, dict):
        raise ValueError("Configuration file must contain a mapping.")
    return RAGConfig.from_dict(loaded)
