import numpy as np
import pymupdf
import pytest

from advanced_rag.chunking import chunk_pages
from advanced_rag.config import RAGConfig, load_config
from advanced_rag.generation.base import build_context_prompt
from advanced_rag.generation.openai import OpenAIGenerator
from advanced_rag.indexes import build_faiss_index
from advanced_rag.ingestion import load_pdfs
from advanced_rag.models import Chunk, PageText, RetrievedChunk
from advanced_rag.pipeline import RAGPipeline
from advanced_rag.reranking import BM25Reranker
from advanced_rag.retrieval import search


def test_config_rejects_unknown_fields(tmp_path):
    path = tmp_path / "config.yaml"
    path.write_text("index_type: flat\nnot_a_field: 1\n", encoding="utf-8")
    with pytest.raises(ValueError):
        load_config(path)


def test_example_config_loads():
    config = load_config("config.example.yaml")
    assert config.embedding_model == "all-MiniLM-L6-v2"
    assert config.generation_model == "gpt-4.1-mini"
    assert config.index_type == "flat"


def test_pdf_page_metadata(tmp_path):
    path = tmp_path / "sample.pdf"
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((72, 72), "Insulin regulates blood glucose.")
    document.save(path)
    document.close()
    loaded = load_pdfs([path])
    assert loaded[0].document_id == "sample.pdf"
    assert loaded[0].page == 0
    assert "Insulin" in loaded[0].text


def test_chunk_ids_are_stable():
    pages = [PageText("a.pdf", 0, "Diabetes and blood glucose. " * 40)]
    first = chunk_pages(pages, 80, 10)
    second = chunk_pages(pages, 80, 10)
    assert [chunk.chunk_id for chunk in first] == [chunk.chunk_id for chunk in second]
    assert first[0].chunk_id == "a.pdf:p0:c0"
    assert first[0].corpus_index == 0


def test_flat_hnsw_and_ivf_indexes():
    vectors = np.random.default_rng(1).random((8, 4), dtype=np.float32)
    flat = build_faiss_index(vectors, RAGConfig(index_type="flat", input_paths=["a.pdf"]))
    hits = search(
        flat,
        vectors[2],
        [Chunk(f"a.pdf:p0:c{i}", "a.pdf", 0, "x", i) for i in range(8)],
        1,
    )
    assert hits[0].corpus_index == 2
    hnsw = build_faiss_index(
        vectors,
        RAGConfig(index_type="hnsw", hnsw_m=32, hnsw_ef_construction=40, input_paths=["a.pdf"]),
    )
    assert hnsw.hnsw.efConstruction == 40
    with pytest.raises(ValueError):
        build_faiss_index(vectors, RAGConfig(index_type="ivf", ivf_nlist=100, input_paths=["a.pdf"]))
    ivf_vectors = np.random.default_rng(2).random((20, 4), dtype=np.float32)
    ivf = build_faiss_index(
        ivf_vectors,
        RAGConfig(index_type="ivf", ivf_nlist=4, ivf_nprobe=2, seed=3, input_paths=["a.pdf"]),
    )
    assert ivf.nlist == 4
    assert ivf.nprobe == 2


def test_bm25_uses_corpus_index_not_result_position():
    chunks = [
        Chunk("a.pdf:p0:c0", "a.pdf", 0, "diabetes is a chronic disease of blood glucose", 0),
        Chunk("b.pdf:p0:c0", "b.pdf", 0, "photosynthesis happens in green plants", 1),
        Chunk("c.pdf:p0:c0", "c.pdf", 0, "orbits of distant planets and moons", 2),
    ]
    retrieved = [
        RetrievedChunk(chunks[1].chunk_id, "b.pdf", 0, chunks[1].text, 1, 1, 0.1, "l2_distance", 0.1),
        RetrievedChunk(chunks[0].chunk_id, "a.pdf", 0, chunks[0].text, 0, 2, 0.9, "l2_distance", 0.9),
    ]
    ranked = BM25Reranker(chunks).rerank("diabetes blood glucose", retrieved, 2)
    assert ranked[0].chunk_id == "a.pdf:p0:c0"
    assert ranked[0].score_type == "bm25"
    assert ranked[0].distance == 0.9


def test_prompt_contains_retrieved_context():
    chunk = RetrievedChunk("a.pdf:p0:c0", "a.pdf", 0, "daily insulin", 0, 1, 1.0, "bm25", 0.4)
    prompt = build_context_prompt("What is required?", [chunk])
    assert "daily insulin" in prompt
    assert "a.pdf:p0:c0" in prompt


class _FakeCompletions:
    def __init__(self):
        self.messages = None

    def create(self, **kwargs):
        self.messages = kwargs["messages"]

        class Message:
            content = "Insulin is required daily."

        class Choice:
            message = Message()

        class Response:
            choices = [Choice()]

        return Response()


class _FakeClient:
    def __init__(self):
        self.chat = type("Chat", (), {"completions": _FakeCompletions()})()


def test_openai_generator_sends_context_and_hides_errors(monkeypatch):
    client = _FakeClient()
    answer = OpenAIGenerator("gpt-4.1-mini", 0, client=client).generate(
        "question",
        [RetrievedChunk("a.pdf:p0:c0", "a.pdf", 0, "daily insulin", 0, 1, 1, "bm25", 0.2)],
    )
    assert answer == "Insulin is required daily."
    assert "daily insulin" in client.chat.completions.messages[1]["content"]
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(RuntimeError) as exc:
        OpenAIGenerator("gpt-4.1-mini", 0).generate("question", [])
    assert "OPENAI_API_KEY" in str(exc.value)
    assert "sk-" not in str(exc.value)


def test_pipeline_retrieve_does_not_call_the_generator(tmp_path):
    path = tmp_path / "note.pdf"
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((72, 72), "Diabetes is a chronic disease of blood glucose.")
    document.save(path)
    document.close()

    class Embedder:
        def embed_documents(self, texts):
            return np.vstack([self.embed_query(text) for text in texts])

        def embed_query(self, text):
            vector = np.zeros(4, dtype="float32")
            vector[0 if "diabetes" in text.lower() else 1] = 1
            return vector

    class Generator:
        called = False

        def generate(self, query, contexts):
            Generator.called = True
            return contexts[0].text

    pipeline = RAGPipeline(
        RAGConfig(input_paths=[str(path)], index_type="flat", top_k=1, reranking=False, chunk_size=500, chunk_overlap=0),
        generator=Generator(),
        embedder=Embedder(),
    )
    chunks, latency = pipeline.retrieve("What is diabetes?")
    assert chunks[0].document_id == "note.pdf"
    assert latency >= 0
    assert Generator.called is False
    result = pipeline.query("What is diabetes?")
    assert "blood glucose" in result.answer
    assert result.citations[0].chunk_id == chunks[0].chunk_id
