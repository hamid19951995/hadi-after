#!/usr/bin/env python3
"""AE BOSS OMEGA Offline Core.
Stdlib-only, deterministic, network-free runtime for validation, planning, audit, and command intent.
Protocol: one JSON object per stdin line -> one JSON object per stdout line.
"""
from __future__ import annotations
import hashlib, json, os, re, sys, time
from pathlib import Path

VERSION = "1.0.0"
ENGINE = "AE BOSS OMEGA Offline Core"
ALLOWED_ACTIONS = ["walk","run","idle","talk","point","present","sit","stand","wave","think","celebrate"]
PROP_ACTIONS = ["pickUp","attach","carry","use","place","handoff","detach","drop"]
PROP_STATES = ["world","held","attached","carried","used","placed","dropped"]


def stable_hash(value):
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def safe_text(value, max_len=10000):
    return str(value or "")[:max_len]


def health():
    return {
        "ok": True,
        "engine": ENGINE,
        "version": VERSION,
        "network": "disabled",
        "dependencies": "python-stdlib-only",
        "python": sys.version.split()[0],
        "features": ["intent", "action-plan", "prop-plan", "audit", "fingerprint", "jsonl"],
    }


def infer(text, language="auto"):
    t = safe_text(text).lower()
    action = None
    for name, patterns in [
        ("walk", [r"\bwalk\b", r"راه برو", r"راه رفت"]),
        ("run", [r"\brun\b", r"بدو", r"دویدن"]),
        ("idle", [r"\bidle\b", r"ایستای", r"بی.?حرکت"]),
        ("talk", [r"\btalk\b", r"صحبت", r"حرف بزن"]),
        ("point", [r"\bpoint\b", r"اشاره", r"اشاره کن"]),
        ("present", [r"\bpresent\b", r"معرفی", r"ارائه"]),
        ("sit", [r"\bsit\b", r"بنشین", r"نشستن"]),
        ("stand", [r"\bstand\b", r"بلند شو", r"ایستادن"]),
        ("wave", [r"\bwave\b", r"دست تکان", r"سلام بده"]),
        ("think", [r"\bthink\b", r"فکر کن", r"تفکر"]),
        ("celebrate", [r"\bcelebrate\b", r"جشن", r"خوشحالی"]),
    ]:
        if any(re.search(p, t, re.I) for p in patterns):
            action = name
            break
    prop_action = None
    for name, patterns in [
        ("pickUp", [r"pick\s*up", r"بردار", r"برداشتن", r"بگیر"]),
        ("carry", [r"carry", r"حمل", r"با خودت ببر"]),
        ("use", [r"\buse\b", r"استفاده", r"کار با"]),
        ("place", [r"\bplace\b", r"بگذار", r"قرار بده"]),
        ("handoff", [r"handoff", r"تحویل", r"بده به"]),
        ("attach", [r"attach", r"وصل", r"متصل"]),
        ("detach", [r"detach", r"جدا"]),
        ("drop", [r"\bdrop\b", r"بینداز", r"رها کن"]),
    ]:
        if any(re.search(p, t, re.I) for p in patterns):
            prop_action = name
            break
    commands = []
    if action:
        commands.append({"type": "action", "action": action, "duration": 1.0})
    if prop_action:
        commands.append({"type": "prop-action", "action": prop_action, "duration": 1.0})
    reply = None
    if commands:
        labels = [c.get("action") for c in commands]
        reply = "Offline Core detected: " + ", ".join(labels) + "."
    else:
        reply = "Offline Core is active. I can validate rigs, compile actions, audit props, and execute deterministic local planning without network access."
    return {"ok": True, "language": language, "commands": commands, "reply": reply, "fingerprint": stable_hash({"text": text, "commands": commands})}


def validate_action_plan(plan):
    if not isinstance(plan, dict):
        raise ValueError("INVALID_ACTION_PLAN")
    actions = plan.get("actions")
    if not isinstance(actions, list) or not actions:
        raise ValueError("ACTIONS_REQUIRED")
    seen = set()
    for item in actions:
        if not isinstance(item, dict) or item.get("action") not in ALLOWED_ACTIONS:
            raise ValueError("UNSUPPORTED_ACTION")
        oid = item.get("id") or item.get("operationKey")
        if not oid or oid in seen:
            raise ValueError("DUPLICATE_OR_MISSING_ACTION_ID")
        seen.add(oid)
        start = float(item.get("start", 0))
        duration = float(item.get("duration", 1))
        fps = float(plan.get("fps", 30))
        scene_duration = float(plan.get("sceneDuration", 5))
        if fps <= 0 or start < 0 or duration <= 0 or start + duration > scene_duration + 1e-9:
            raise ValueError("INVALID_ACTION_TIMING")
    return True


def compile_action_plan(actions, fps=30, scene_duration=5):
    out = []
    for i, raw in enumerate(actions or []):
        action = str(raw.get("action", "idle"))
        if action not in ALLOWED_ACTIONS:
            raise ValueError("UNSUPPORTED_ACTION")
        item = dict(raw)
        item.setdefault("id", f"offline-action-{i+1}")
        item.setdefault("start", 0)
        item.setdefault("duration", 1)
        item["fps"] = float(fps)
        item["end"] = float(item["start"]) + float(item["duration"])
        item["operationKey"] = stable_hash({"id": item["id"], "action": action, "start": item["start"], "duration": item["duration"]})
        out.append(item)
    plan = {"kind": "offline-action-plan.v1", "engine": ENGINE, "engineVersion": VERSION, "fps": float(fps), "sceneDuration": float(scene_duration), "actions": out}
    plan["fingerprint"] = stable_hash(plan)
    validate_action_plan(plan)
    return plan


def validate_prop_plan(plan):
    if not isinstance(plan, dict) or not isinstance(plan.get("props"), list):
        raise ValueError("INVALID_PROP_PLAN")
    prop_ids = {str(p.get("id")) for p in plan["props"] if isinstance(p, dict) and p.get("id")}
    if len(prop_ids) != len(plan["props"]):
        raise ValueError("INVALID_PROP_IDS")
    for p in plan["props"]:
        if p.get("initialState", "world") not in PROP_STATES:
            raise ValueError("INVALID_PROP_STATE")
    for a in plan.get("actions", []):
        if a.get("propId") not in prop_ids or a.get("action") not in PROP_ACTIONS:
            raise ValueError("INVALID_PROP_ACTION")
        if not a.get("operationKey"):
            raise ValueError("MISSING_PROP_OPERATION_KEY")
    return True


def audit(payload):
    root = Path(safe_text(payload.get("root"), 4096)).resolve() if payload.get("root") else Path.cwd()
    include = payload.get("include") or [".js", ".jsx", ".json", ".py", ".ps1"]
    findings = []
    files = 0
    for path in root.rglob("*"):
        if not path.is_file() or path.stat().st_size > 5_000_000:
            continue
        if include and path.suffix.lower() not in {str(x).lower() for x in include}:
            continue
        files += 1
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            findings.append({"severity":"error","path":str(path.relative_to(root)),"message":str(exc)})
            continue
        if re.search(r"\bfetch\s*\(\s*[\"']https?://|https?://[^\s\"']+", text, re.I) and path.parts[0] not in {"docs", "contracts", "examples"}:
            findings.append({"severity":"network-reference","path":str(path.relative_to(root)),"message":"External URL reference detected; not used by Offline Core."})
        if path.suffix.lower() == ".json":
            try: json.loads(text)
            except Exception as exc: findings.append({"severity":"json-error","path":str(path.relative_to(root)),"message":str(exc)})
    return {"ok": True, "root": str(root), "filesScanned": files, "findings": findings, "networkPolicy": "offline-core-only"}


def handle(request):
    op = request.get("op")
    if op == "health": return health()
    if op == "infer": return infer(request.get("text", ""), request.get("language", "auto"))
    if op == "compile_action_plan": return {"ok": True, "plan": compile_action_plan(request.get("actions", []), request.get("fps", 30), request.get("sceneDuration", 5))}
    if op == "validate_action_plan": return {"ok": bool(validate_action_plan(request.get("plan")))}
    if op == "validate_prop_plan": return {"ok": bool(validate_prop_plan(request.get("plan")))}
    if op == "audit": return audit(request)
    if op == "fingerprint": return {"ok": True, "fingerprint": stable_hash(request.get("value"))}
    raise ValueError("UNKNOWN_OFFLINE_OPERATION")


def main():
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8", errors="strict")
        sys.stdout.reconfigure(encoding="utf-8", errors="strict")
    input_stream = sys.stdin.buffer if hasattr(sys.stdin, "buffer") else sys.stdin
    for raw_line in input_stream:
        line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else raw_line
        line = line.strip()
        if not line: continue
        started = time.time()
        try:
            request = json.loads(line)
            if not isinstance(request, dict): raise ValueError("REQUEST_MUST_BE_OBJECT")
            result = handle(request)
            result["elapsedMs"] = round((time.time() - started) * 1000, 3)
        except Exception as exc:
            result = {"ok": False, "error": str(exc), "errorType": exc.__class__.__name__, "elapsedMs": round((time.time() - started) * 1000, 3)}
        sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
