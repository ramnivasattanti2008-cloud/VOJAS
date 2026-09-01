#!/usr/bin/env python3
"""
VOJAS API Smoke Test — verifies all Phase 16+ endpoints
"""
import requests, json, sys

BASE = "http://localhost:5000/api/v1"
EMAIL = "testadmin2@vojas.gov"
PASSWORD = "AdminTest99"

REAL_PROJECT_ID = None  # fetched during login

session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

def login():
    global REAL_PROJECT_ID
    r = session.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code != 200:
        print(f"[FAIL] Login: {r.status_code} {r.text[:200]}"); sys.exit(1)
    REAL_PROJECT_ID = r.json()["data"]["user"]["projects"][0] if r.json()["data"]["user"].get("projects") else None
    if not REAL_PROJECT_ID:
        # fetch a real project ID directly
        rr = session.get(f"{BASE}/projects?limit=1")
        try:
            REAL_PROJECT_ID = rr.json()["data"]["items"][0]["id"]
        except Exception:
            REAL_PROJECT_ID = "00009652-da8a-4033-8a95-70ad85fde468"
    print(f"[OK] Login (projectId={REAL_PROJECT_ID[:8]}...)")

def get(path, expected=200, **kw):
    r = session.get(f"{BASE}{path}", **kw)
    ok = r.status_code == expected
    label = "OK" if ok else "FAIL"
    print(f"[{label}] GET {path} => {r.status_code}" + ("" if ok else f" (expected {expected})"))
    return r

def post(path, data, expected=201, **kw):
    r = session.post(f"{BASE}{path}", json=data, **kw)
    ok = r.status_code == expected
    label = "OK" if ok else "FAIL"
    print(f"[{label}] POST {path} => {r.status_code}" + ("" if ok else f" (expected {expected})"))
    return r

def main():
    print("=== VOJAS Smoke Test ===")
    login()

    # ── Phase 16: Assets ──────────────────────────────────────────────────────
    get("/assets/stats")
    get("/assets")
    post("/assets", {"name":"Test Rd","type":"ROAD","district":"Lucknow","state":"UP"})

    # ── Phase 17: Development Requests ──────────────────────────────────────
    get("/development-requests/stats")
    get("/development-requests")
    # Use valid ProjectSector enum value — "TRANSPORT" is valid, not "ROADS"
    post("/development-requests", {
        "title":"Need new road","description":"Roads in poor condition",
        "requestType":"INFRASTRUCTURE","sector":"TRANSPORT",
        "state":"Uttar Pradesh","district":"Lucknow"
    })

    # ── Phase 23: Inspections ───────────────────────────────────────────────
    get("/inspections/stats")
    get("/inspections")
    # Use a real projectId to avoid FK constraint error
    post("/inspections", {
        "projectId": REAL_PROJECT_ID,
        "assigneeId": None,
        "locationDesc": "Near community hall",
        "notes": "Routine inspection"
    })

    # ── Phase 24: Cases ──────────────────────────────────────────────────────
    get("/cases/stats")
    get("/cases")
    # Use valid CaseType enum value — not "PROJECT"
    post("/cases", {
        "title":"Test Case","description":"Testing case creation",
        "type":"VERIFICATION_REQUIRED","priority":"HIGH"
    })

    # ── Phase 27-35: Contractor ─────────────────────────────────────────────
    get("/contractors/dashboard")
    # Note: /contractors/profile is CONTRACTOR-only → expect 403 for ADMIN

    # ── Phase 18: Development Priority ──────────────────────────────────────
    get("/priority/stats")
    get("/priority/top?limit=5")
    get("/priority/district/Lucknow")

    # ── Phase 42: Data Quality ──────────────────────────────────────────────
    get("/data-quality/stats")
    get("/data-quality?page=1&limit=10")
    # Scan may return 200 (no issues) — 200 is success
    r = session.post(f"{BASE}/data-quality/scan", json={"entityType":"DEVELOPMENT_REQUEST"})
    print(f"[{'OK' if 200 <= r.status_code < 300 else 'FAIL'}] POST /data-quality/scan => {r.status_code}")

    # ── Phase 43: Data Sources ──────────────────────────────────────────────
    get("/data-sources/stats")
    get("/data-sources")

    # ── Phase 41: Guidelines ────────────────────────────────────────────────
    get("/guidelines/categories")
    get("/guidelines")
    get("/guidelines/stats")
    post("/guidelines", {
        "title":"MPLADS Revised Guidelines 2024",
        "category":"LEGISLATION","description":"Updated MPLADS guidelines"
    })

    # ── Whistleblower (public) ──────────────────────────────────────────────
    r = session.post(f"{BASE}/whistleblower", json={
        "title":"Suspicious activity","description":"Bribery attempt",
        "category":"FRAUD","location":"Lucknow","dateOccurred":"2024-08-01"
    })
    # Whistleblower is public — no auth, may return 201 or 400
    print(f"[{'OK' if 200 <= r.status_code < 300 else 'FAIL'}] POST /whistleblower => {r.status_code}")

    print("\n=== Done ===")

if __name__ == "__main__":
    main()
