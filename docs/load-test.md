# Load smoke

Tool: `scripts/load_smoke.py`. Target: local API on 127.0.0.1:8765. 30 requests, concurrency 4. The in-process limit was raised to 1000 per minute for this sample so the default of 30 did not cut the run off. No model was called. These are local service times. External model latency is not included.

| Target | Requests | Concurrency | RPS | p50 | p95 | p99 | Error rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /health | 30 | 4 | 332.3 | 2.5 ms | 72.2 ms | 72.2 ms | 0 |
| /retrieve | 30 | 4 | 836.8 | 4.4 ms | 6.2 ms | 7.3 ms | 0 |

/health p95 is much higher than p50 on this sample. That tail is part of the measurement, not a model call. /retrieve uses the hash embedder and the three-passage sample corpus, not the 1,177-chunk benchmark.
