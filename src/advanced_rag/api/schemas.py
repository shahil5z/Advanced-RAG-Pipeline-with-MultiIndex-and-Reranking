"""Request and response models for the local API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str
    top_k: int = Field(default=5, ge=1, le=20)
    document_id: str | None = None
    page: int | None = Field(default=None, ge=0)


class PageRef(BaseModel):
    document_id: str = Field(min_length=1)
    page: int = Field(ge=0)


class EvaluateRequest(BaseModel):
    retrieved: list[PageRef] = Field(min_length=1)
    relevant: list[PageRef] = Field(min_length=1)
    cited: list[PageRef] = Field(default_factory=list)
    k: int = Field(default=5, ge=1, le=50)


class CitationModel(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    page: int
    rank: int


class RetrievalInfo(BaseModel):
    strategy: str
    top_k: int
    latency_ms: float


class GenerationInfo(BaseModel):
    model: str | None
    latency_ms: float
    input_tokens: int | None
    output_tokens: int | None


class QueryResponseModel(BaseModel):
    answer: str
    citations: list[CitationModel]
    retrieval: RetrievalInfo
    generation: GenerationInfo


class PassageModel(BaseModel):
    chunk_id: str
    document_id: str
    page: int
    rank: int
    score: float
    score_type: str
    text: str


class RetrieveResponseModel(BaseModel):
    strategy: str
    top_k: int
    latency_ms: float
    passages: list[PassageModel]
