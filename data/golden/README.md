# Golden questions

`diabetes.jsonl` has 40 questions. Each expected answer was checked against text extracted from `Global report on diabetes.pdf`. Page numbers are zero-based, matching PyMuPDF.

`Understanding_Science.pdf` is included when the local index is built, but it has no labels. Its extracted text is OCR noise, so it was not used as a source of questions. It acts as a distractor document.

The file was reviewed by hand. `ragcheck build-dataset` checks the file. It does not generate questions.

These questions are for local evaluation. They are not a claim that the source PDF can be redistributed.
