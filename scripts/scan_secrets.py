"""Scan tracked text for committed secrets. Patterns are assembled in code."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

NEEDLES = (
    ("openai key assignment", "OPENAI_" + "API_KEY="),
    ("public openai key", "NEXT_PUBLIC_" + "OPENAI_" + "API_KEY"),
    ("pinecone assignment", "PINECONE_" + "API_KEY="),
    ("google assignment", "GOOGLE_" + "API_KEY="),
    ("hub token assignment", "HF_" + "TOKEN="),
    ("private key block", "BEGIN " + "PRIVATE KEY"),
)
TOKEN = re.compile("sk" + r"-[A-Za-z0-9]{20,}|" + "AI" + r"za[0-9A-Za-z_\-]{20,}")
SKIP = {".png", ".pdf", ".woff2", ".ico", ".jpg", ".jpeg", ".webp", ".gif", ".bin"}


def main() -> int:
    listed = subprocess.check_output(["git", "ls-files"], text=True)
    failed = False
    for name in listed.splitlines():
        path = Path(name)
        if path.suffix.lower() in SKIP or not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for label, needle in NEEDLES:
            if needle in text:
                print(f"{name}: {label}")
                failed = True
        if TOKEN.search(text):
            print(f"{name}: token-shaped value")
            failed = True
    if failed:
        return 1
    print("secret scan: no matches")
    return 0


if __name__ == "__main__":
    sys.exit(main())
