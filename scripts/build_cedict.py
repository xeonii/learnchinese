#!/usr/bin/env python3
"""Convert CC-CEDICT into a compact gzipped JSON array for the app.

Download (CC BY-SA 4.0):
  https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz

Usage:
  python3 scripts/build_cedict.py /path/to/cedict.txt.gz
  python3 scripts/build_cedict.py   # looks at /tmp/cedict/cedict.txt.gz
"""
from __future__ import annotations

import gzip
import json
import re
import sys
from pathlib import Path

LINE_RE = re.compile(r"^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$")
HANZI_RE = re.compile(r"^[\u4e00-\u9fff·]+$")
MAX_LEN = 8
GLOSS_MAX = 96

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "cedict.json.gz"


def first_gloss(rest: str) -> str:
    parts = [p.strip() for p in rest.split("/") if p.strip()]
    useful = []
    for part in parts:
        low = part.lower()
        if low.startswith("variant of ") or low.startswith("see also "):
            continue
        if low.startswith("see ") and "variant" in low:
            continue
        useful.append(part)
        if len(useful) == 2:
            break
    if not useful:
        useful = parts[:1]
    gloss = "; ".join(useful)
    if len(gloss) > GLOSS_MAX:
        gloss = gloss[: GLOSS_MAX - 1].rstrip() + "…"
    return gloss


def compact_pinyin(raw: str) -> str:
    return (
        raw.strip()
        .lower()
        .replace("u:", "v")
        .replace(" ", "")
        .replace("'", "")
    )


def parse(path: Path) -> list[list[str]]:
    opener = gzip.open if path.suffix == ".gz" or str(path).endswith(".txt.gz") else open
    rows: list[list[str]] = []
    seen: set[tuple[str, str]] = set()
    with opener(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            m = LINE_RE.match(line)
            if not m:
                continue
            _trad, simp, pinyin, glosses = m.groups()
            if not HANZI_RE.match(simp) or not (1 <= len(simp) <= MAX_LEN):
                continue
            pinyin = compact_pinyin(pinyin)
            if not pinyin:
                continue
            key = (simp, pinyin)
            if key in seen:
                continue
            seen.add(key)
            gloss = first_gloss(glosses)
            if not gloss:
                continue
            rows.append([simp, pinyin, gloss])
    rows.sort(key=lambda r: (len(r[0]), r[0], r[1]))
    return rows


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/cedict/cedict.txt.gz")
    if not src.exists():
        sys.exit(f"CC-CEDICT not found at {src}")
    rows = parse(src)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with gzip.open(OUT, "wb", compresslevel=9) as fh:
        fh.write(payload)
    print(f"wrote {OUT}")
    print(f"entries {len(rows)}")
    print(f"json_bytes {len(payload)}")
    print(f"gzip_bytes {OUT.stat().st_size}")


if __name__ == "__main__":
    main()
