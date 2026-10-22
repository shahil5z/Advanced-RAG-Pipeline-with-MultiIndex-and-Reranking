# EU AI Act and GDPR notes

This is an engineering demonstration. It is not legal advice and it is not a compliance certification. Nothing here claims conformity with the EU AI Act or the GDPR.

## What the system does

It retrieves passages from a fixed corpus and can optionally draft an answer from those passages. The public site shows stored measurements. The local API can answer from a small sample corpus.

## Practices in this repository

- Data minimization: the event row keeps tokens, latency, status, and error type. Raw prompts and answers are off unless content logging is enabled.
- Secrets stay on the server. The browser bundle does not receive a model key.
- Traceability: a request id is attached to the response, the event row, and the spans.
- Human oversight: citations point at a page, and an empty or uncited answer becomes a fixed fallback. A person still has to judge the text.
- Transparency: the public pages separate stored retrieval metrics from generation figures that have not been run, and they label the demo as a prepared demonstration.
- Retention is a setting on the local event store. The default is 14 days. That is a local delete, not a vendor commitment.
- Personal data: the sample corpus and the reviewed questions are not a customer dataset. Do not paste personal data into the demo if you would not want it in a request log.

## What this does not do

It does not assess risk class, sign a declaration of conformity, appoint a representative, or complete a data-protection impact assessment. Those are outside this repository.
