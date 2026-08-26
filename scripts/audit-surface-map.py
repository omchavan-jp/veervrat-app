#!/usr/bin/env python3
"""
Audit pass 03 — the surface map.

For every notification the backend can emit, answer two questions with file:line evidence:

  1. Does the deep link go somewhere that can show the thing? (both maps, backend and frontend)
  2. Do the two maps agree? They are written separately and drift silently.

Regenerable. Prints JSON.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

SCHEMA = ROOT / "apps/api/prisma/schema.prisma"
BE_MAP = ROOT / "apps/api/src/modules/notifications/notification-link.ts"
FE_MAP = ROOT / "apps/web/components/layout/notification-panel.tsx"
WEB_APP = ROOT / "apps/web/app"


def event_types():
    body = re.search(r"^enum NotificationEventType \{(.*?)^\}", SCHEMA.read_text(), re.S | re.M)
    return [m.strip() for m in re.findall(r"^\s+([A-Z_]+)", body.group(1), re.M)]


def parse_case_map(path):
    """case 'A': case 'B': return '/x';  ->  {A: '/x', B: '/x'} with the line of the return."""
    out = {}
    if not path.exists():
        return out
    pending = []
    for i, line in enumerate(path.read_text().splitlines(), 1):
        # Two spellings: `case 'X':` (frontend) and `case NotificationEventType.X:` (backend).
        for m in re.finditer(r"case (?:'([A-Z_]+)'|NotificationEventType\.([A-Z_]+))", line):
            pending.append(m.group(1) or m.group(2))
        r = re.search(r"return\s+(`[^`]*`|'[^']*')", line)
        if r and pending:
            target = r.group(1).strip("`'")
            for ev in pending:
                out[ev] = {"target": target, "line": i}
            pending = []
    return out


DEFAULT_RE = re.compile(r"^\s*default:")


def default_target(path):
    if not path.exists():
        return None
    lines = path.read_text().splitlines()
    for i, line in enumerate(lines):
        if DEFAULT_RE.match(line):
            for follow in lines[i:i + 3]:
                r = re.search(r"return\s+(`[^`]*`|'[^']*')", follow)
                if r:
                    return {"target": r.group(1).strip("`'"), "line": i + 1, "via": "default"}
    return None


def routes():
    """Every route the web app can render, as a path with :params normalised."""
    out = set()
    for p in WEB_APP.rglob("page.tsx"):
        rel = p.relative_to(WEB_APP).parent
        segs = []
        for s in rel.parts:
            if s.startswith("(") and s.endswith(")"):
                continue  # route group, not a URL segment
            segs.append(":param" if s.startswith("[") else s)
        out.add("/" + "/".join(segs) if segs else "/")
    return out


def resolves(target, known):
    if not target:
        return False
    base = target.split("?")[0].rstrip("/") or "/"
    # normalise a template literal segment like ${resourceId} to a param
    base = re.sub(r"\$\{[^}]+\}", ":param", base)
    return base in known


def main():
    evs = event_types()
    be, fe = parse_case_map(BE_MAP), parse_case_map(FE_MAP)
    be_default = default_target(BE_MAP)
    known = routes()

    rows = []
    for ev in evs:
        b, f = be.get(ev) or be_default, fe.get(ev)
        rows.append({
            "event": ev,
            "backend_target": b["target"] if b else None,
            "backend_line": b["line"] if b else None,
            "frontend_target": f["target"] if f else None,
            "frontend_line": f["line"] if f else None,
            "agree": (b or {}).get("target") == (f or {}).get("target"),
            "backend_resolves": resolves((b or {}).get("target"), known),
            "frontend_resolves": resolves((f or {}).get("target"), known),
        })

    print(json.dumps({
        "event_count": len(evs),
        "web_routes": len(known),
        "unmapped_frontend": [r["event"] for r in rows if not r["frontend_target"]],
        "unmapped_backend": [r["event"] for r in rows if not r["backend_target"]],
        "disagree": [r["event"] for r in rows if r["backend_target"] and r["frontend_target"]
                     and not r["agree"]],
        "dead_frontend_target": [r["event"] for r in rows
                                 if r["frontend_target"] and not r["frontend_resolves"]],
        "rows": rows,
    }, indent=1))


if __name__ == "__main__":
    main()
