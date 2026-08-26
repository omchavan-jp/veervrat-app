#!/usr/bin/env python3
"""
Audit pass 04 — is every read of the vratmitra relationship complete?

A vratmitra relationship is stored in TWO tables:

  * `vm_relationships`      — global: this person mentors that person, across everything
  * `journey_vm_assignments` — journey-scoped: this person mentors that person on one journey

Neither is a subset of the other, so any query answering "who mentors whom" must consult both.
One that consults only one silently under-reports, and the failure is invisible: it returns a
plausible, shorter list rather than an error.

There is a second trap in the same area. `VmRelationshipState` has only PENDING and ACTIVE —
there is no ENDED. A relationship ends by having `endedAt` set **while its state stays ACTIVE**.
So `where: { state: ACTIVE }` without `endedAt: null` returns ended relationships as live ones.

This enumerates every query against either table and flags both.

Usage: python3 scripts/audit-vm-model.py [repo-root]
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
SRC = ROOT / "apps/api/src"

TABLES = {"vmRelationship": "global", "journeyVmAssignment": "journey"}
CALL_RE = re.compile(r"this\.prisma\.(vmRelationship|journeyVmAssignment)\.(\w+)\(")
# Reads. A write does not have to filter endedAt the same way.
READ_OPS = {"findFirst", "findMany", "findUnique", "count", "aggregate", "groupBy"}


def enclosing_method(lines, idx):
    for i in range(idx, -1, -1):
        m = re.match(r"\s*(?:async\s+)?(?:private\s+|public\s+)?(\w+)\s*\(", lines[i])
        if m and m.group(1) not in {"if", "for", "while", "switch", "catch", "map", "filter"}:
            return m.group(1)
    return "?"


def call_body(text, start):
    """Balanced-paren slice of the call arguments."""
    depth, i = 0, start
    while i < len(text):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
        i += 1
    return text[start:start + 400]


def main():
    rows = []
    for f in sorted(SRC.rglob("*.ts")):
        if f.name.endswith(".spec.ts"):
            continue
        text = f.read_text(errors="ignore")
        lines = text.splitlines()
        for m in CALL_RE.finditer(text):
            table, op = m.group(1), m.group(2)
            line_no = text[:m.start()].count("\n") + 1
            body = call_body(text, m.end() - 1)
            rows.append({
                "file": str(f.relative_to(ROOT)),
                "line": line_no,
                "method": enclosing_method(lines, line_no - 1),
                "table": table,
                "scope": TABLES[table],
                "op": op,
                "is_read": op in READ_OPS,
                "filters_endedAt": "endedAt" in body,
                "filters_state": "state:" in body or "state :" in body,
            })

    # group by enclosing method: does the method as a whole consult both tables?
    by_method = {}
    for r in rows:
        by_method.setdefault((r["file"], r["method"]), set()).add(r["scope"])

    reads = [r for r in rows if r["is_read"]]
    missing_ended = [r for r in reads if r["filters_state"] and not r["filters_endedAt"]]
    single_scope = [
        {"file": f, "method": mth, "scope": list(s)[0]}
        for (f, mth), s in sorted(by_method.items()) if len(s) == 1
    ]

    print(json.dumps({
        "total_queries": len(rows),
        "reads": len(reads),
        "reads_filtering_state_without_endedAt": missing_ended,
        "methods_touching_one_scope_only": single_scope,
        "methods_touching_both": [
            {"file": f, "method": mth} for (f, mth), s in sorted(by_method.items()) if len(s) > 1
        ],
        "all": rows,
    }, indent=1))


if __name__ == "__main__":
    main()
