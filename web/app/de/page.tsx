import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KI-gestützte Dokumentensuche",
  description: "Kurze deutsche Zusammenfassung der Evaluierung.",
};

export default function GermanPage() {
  return (
    <article lang="de" className="shell max-w-3xl space-y-6 py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">KI-gestützte Dokumentensuche und RAG-Evaluierung</h1>
      <p className="leading-7">
        Das Projekt indexiert Dokumente, sucht Passagen und misst die Suche an 40 geprüften Fragen. Eine Antwort kann überzeugend klingen und trotzdem die falsche Seite treffen. Recall@5, MRR und nDCG machen sichtbar, ob die richtige Seite überhaupt dabei war und wie weit oben sie stand.
      </p>
      <p className="leading-7">
        Lokal: FAISS, BM25, FastAPI, Qdrant und OpenTelemetry. Öffentlich: eine vorbereitete Next.js-Ansicht ohne Schlüssel und ohne Backend. Der Benchmark hat 1.177 Chunks. BM25 hielt Recall@5 bei 0,833 und hob MRR von 0,629 auf 0,779 sowie nDCG von 0,670 auf 0,784.
      </p>
      <p className="leading-7 text-muted">
        Das ist eine technische Demonstration, keine Rechtsberatung und keine Compliance-Aussage. Die übrige Dokumentation ist auf Englisch.
      </p>
      <p>
        <Link href="/about" className="text-sm font-semibold underline">
          Back to About
        </Link>
      </p>
    </article>
  );
}
