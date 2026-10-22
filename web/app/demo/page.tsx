import type { Metadata } from "next";

import { Demo } from "@/components/Demo";
import demo from "@/data/demo.json";

export const metadata: Metadata = {
  title: "Demo",
  description: "Ask the lab notes. The server retrieves passages with exact search and can rerank them with BM25.",
};

export default function DemoPage() {
  const questions = demo.examples.map((item) => item.question);
  return <Demo questions={questions} />;
}
