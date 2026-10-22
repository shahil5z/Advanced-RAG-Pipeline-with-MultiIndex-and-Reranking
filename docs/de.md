# KI-gestützte Dokumentensuche und RAG-Evaluierung

Das Projekt indexiert Dokumente, sucht Passagen und misst die Suche an 40 geprüften Fragen. Eine Antwort kann überzeugend klingen und trotzdem die falsche Seite treffen. Recall@5, MRR und nDCG machen sichtbar, ob die richtige Seite überhaupt dabei war und wie weit oben sie stand.

Lokal kommen FAISS, BM25, FastAPI, Qdrant und OpenTelemetry zum Einsatz. Die öffentliche Ansicht ist eine vorbereitete Next.js-Seite ohne Schlüssel und ohne dieses Backend.

Der gespeicherte Benchmark hat 1.177 Chunks. BM25 hielt Recall@5 bei 0,833 und hob MRR von 0,629 auf 0,779 sowie nDCG von 0,670 auf 0,784.

Das ist eine technische Demonstration, keine Rechtsberatung und keine Aussage über Compliance. Die übrige Dokumentation bleibt auf Englisch.
