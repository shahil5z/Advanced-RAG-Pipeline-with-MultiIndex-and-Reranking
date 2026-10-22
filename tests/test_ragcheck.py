import json

import pytest

from ragcheck.cache.disk import JsonCache, cache_key
from ragcheck.cli import main
from ragcheck.compare import compare
from ragcheck.datasets.load import load_dataset
from ragcheck.evaluators.judge import OpenAIJudge
from ragcheck.reports.markdown import render_report


def test_golden_dataset_has_reviewed_questions():
    rows, digest = load_dataset("data/golden/diabetes.jsonl")
    assert len(rows) == 40
    assert len(digest) == 12
    assert all(row["metadata"]["reviewed"] for row in rows)
    with pytest.raises(ValueError):
        load_dataset("data/golden/README.md")


def test_dataset_validation_rejects_a_bad_row(tmp_path):
    path = tmp_path / "bad.jsonl"
    path.write_text('{"id": "x", "question": "q", "expected_answer": "a", "relevant": []}\n', encoding="utf-8")
    with pytest.raises(ValueError):
        load_dataset(path)


def test_compare_fails_a_drop_past_the_threshold():
    baseline = {"metrics": {"recall_at_k": 0.80, "mrr": 0.70, "ndcg": 0.75, "precision_at_k": 0.40, "citation_precision": 0.40}}
    current = {"metrics": {"recall_at_k": 0.70, "mrr": 0.69, "ndcg": 0.74, "precision_at_k": 0.40, "citation_precision": 0.40}}
    report = compare(current, baseline, {"recall_at_k": 0.05, "mrr": 0.05, "ndcg": 0.05, "precision_at_k": 0.05, "citation_precision": 0.05})
    assert report["status"] == "FAIL"
    recall = next(row for row in report["metrics"] if row["metric"] == "recall_at_k")
    assert recall["status"] == "FAIL"
    assert next(row for row in report["metrics"] if row["metric"] == "mrr")["status"] == "PASS"


def test_ci_command_returns_nonzero_on_regression(tmp_path):
    baseline = tmp_path / "baseline.json"
    current = tmp_path / "current.json"
    payload = {"metrics": {"recall_at_k": 0.9, "precision_at_k": 0.5, "mrr": 0.8, "ndcg": 0.8, "citation_precision": 0.5}}
    baseline.write_text(json.dumps(payload), encoding="utf-8")
    worse = {"metrics": {**payload["metrics"], "recall_at_k": 0.5}}
    current.write_text(json.dumps(worse), encoding="utf-8")
    status = main(["ci", "--current", str(current), "--baseline", str(baseline)])
    assert status == 1


def test_judge_cache_avoids_a_second_call(tmp_path):
    class Completions:
        calls = 0

        def create(self, **kwargs):
            Completions.calls += 1

            class Message:
                content = json.dumps(
                    {
                        "faithfulness": 0.5,
                        "faithfulness_explanation": "partial",
                        "answer_relevance": 1,
                        "answer_relevance_explanation": "direct",
                        "context_relevance": 0.25,
                        "context_relevance_explanation": "weak",
                    }
                )

            class Choice:
                message = Message()

            class Response:
                choices = [Choice()]

            return Response()

    client = type("Client", (), {"chat": type("Chat", (), {"completions": Completions()})()})()
    judge = OpenAIJudge("gpt-4.1-mini", JsonCache(tmp_path), client=client)
    first = judge.score("q", "a", ["c"])
    second = judge.score("q", "a", ["c"])
    assert Completions.calls == 1
    assert second["cached"] is True
    assert first["faithfulness"] == 0.5
    changed = cache_key({"rubric": "v1", "model": "gpt-4.1-mini", "question": "other", "answer": "a", "contexts": ["c"]})
    original = cache_key({"rubric": "v1", "model": "gpt-4.1-mini", "question": "q", "answer": "a", "contexts": ["c"]})
    assert changed != original


def test_report_uses_only_supplied_numbers():
    text = render_report(
        [
            {
                "name": "flat",
                "questions": 2,
                "metrics": {"recall_at_k": 0.5, "mrr": 0.5, "ndcg": 0.5, "citation_precision": 0.5},
                "latency_ms": {"mean": 12.5},
            }
        ]
    )
    assert "flat" in text
    assert "0.500" in text
    assert "12.5" in text


def test_cli_help_and_dataset_check():
    assert main(["build-dataset", "--dataset", "data/golden/diabetes.jsonl"]) == 0
    with pytest.raises(SystemExit) as exc:
        main(["--help"])
    assert exc.value.code == 0
