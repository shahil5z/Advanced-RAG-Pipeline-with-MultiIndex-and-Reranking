"""Optional Locust file for the same local targets as scripts/load_smoke.py.

Generation is not called. Keep the user count small.
"""

from locust import HttpUser, between, task


class LocalReader(HttpUser):
    wait_time = between(0.05, 0.2)

    @task(3)
    def health(self) -> None:
        self.client.get("/health")

    @task(1)
    def retrieve(self) -> None:
        self.client.post("/retrieve", json={"question": "How does insulin lower glucose?", "top_k": 3})
