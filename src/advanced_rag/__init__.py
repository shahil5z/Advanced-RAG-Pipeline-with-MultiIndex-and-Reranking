"""Local multi-index RAG pipeline.

This package is the supported way to run the pipeline.
"""

from advanced_rag.config import RAGConfig, load_config
from advanced_rag.generation.base import Generator, build_context_prompt
from advanced_rag.generation.openai import OpenAIGenerator
from advanced_rag.models import Citation, QueryResult, RetrievedChunk
from advanced_rag.pipeline import RAGPipeline

__all__ = [
    "Citation",
    "OpenAIGenerator",
    "Generator",
    "QueryResult",
    "RAGConfig",
    "RAGPipeline",
    "RetrievedChunk",
    "build_context_prompt",
    "load_config",
]
