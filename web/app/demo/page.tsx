"use client";

import { useState } from "react";
import demo from "@/data/demo.json";

type Chunk = {
  rank: number;
  document: string;
  page: number;
  score: number;
  score_type: string;
  distance: number;
  text: string;
};

type Example = {
  id: string;
  question: string;
  answer: string;
  retrieval_latency_ms: number;
  configuration: { index_type: string; top_k: number; reranking: boolean };
  chunks: Chunk[];
};

const examples = demo.examples as Example[];

export default function DemoPage() {
  const [question, setQuestion] = useState(examples[0]?.question ?? "");
  const [selected, setSelected] = useState<Example | null>(null);
  const [message, setMessage] = useState("");

  function run() {
    const match = examples.find((item) => item.question.trim().toLowerCase() === question.trim().toLowerCase());
    if (!match) {
      setSelected(null);
      setMessage(
        examples.length === 0
          ? "No demo traces are available."
          : "That question is not in the public demo set. Choose one of the prepared questions.",
      );
      return;
    }
    setMessage("");
    setSelected(match);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">RAG Demo</h1>
      <p className="text-sm text-stone-700">
        These six questions were retrieved ahead of time from a short note written for this site. Running the demo shows that saved trace. It does not embed the project PDFs, rebuild FAISS, or call OpenAI. The local package does those steps.
      </p>
      <label className="block text-sm" htmlFor="question">
        Ask a question
      </label>
      <textarea
        id="question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={3}
        className="w-full border border-stone-400 bg-white p-3 text-sm"
      />
      {examples.length > 0 && (
        <label className="block text-sm">
          Prepared question
          <select
            className="mt-1 block w-full border border-stone-400 bg-white p-2"
            value={examples.some((item) => item.question === question) ? question : ""}
            onChange={(event) => setQuestion(event.target.value)}
          >
            <option value="">Select</option>
            {examples.map((item) => (
              <option key={item.id} value={item.question}>
                {item.question}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="button" onClick={run} className="bg-stone-900 px-4 py-2 text-sm text-white">
        Run Demo
      </button>
      {message && <p className="text-sm">{message}</p>}
      {selected && (
        <div className="space-y-4">
          <p className="text-sm">
            Index {selected.configuration.index_type} · top {selected.configuration.top_k} · reranking{" "}
            {selected.configuration.reranking ? "on" : "off"} · {selected.retrieval_latency_ms.toFixed(1)} ms retrieval
          </p>
          <section>
            <h2 className="font-semibold">Answer</h2>
            <p className="mt-2 text-sm leading-6">{selected.answer}</p>
          </section>
          <section>
            <h2 className="font-semibold">Sources</h2>
            <ul className="mt-2 space-y-2">
              {selected.chunks.map((chunk) => (
                <li key={chunk.rank}>
                  <details className="border border-stone-300 bg-white p-3 text-sm">
                    <summary>
                      {chunk.rank}. {chunk.document} · {chunk.score_type} {chunk.score.toFixed(3)}
                    </summary>
                    <p className="mt-2 leading-6">{chunk.text}</p>
                    <p className="mt-1 text-stone-600">
                      Page {chunk.page} · L2 distance {chunk.distance.toFixed(3)}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
