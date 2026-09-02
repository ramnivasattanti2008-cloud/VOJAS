# VOJAS — Paid Dependencies

This document tracks every paid (or paid-tier) dependency in the VOJAS stack.
Per project policy, paid services are introduced only when genuinely
necessary, and only after the free alternative has been considered.

**Last reviewed:** 2026-09-02

---

## 1. `openai` (Node SDK) — backend dependency

- **Status:** Active. Used for AI evidence generation in anomaly detection
  (see `backend/src/lib/ai.ts`).
- **Cost model:** Per-token billing. Variable based on model chosen.
- **Free alternative available:** Yes. The AI provider abstraction now
  supports:
  - **Groq** — free tier (open models like Llama 3.1, Mixtral). No credit
    card required. Set `AI_PROVIDER=groq` + `GROQ_API_KEY` in `.env`.
  - **Ollama** — fully local, free, no API key. Set `AI_PROVIDER=ollama`
    + `OLLAMA_BASE_URL` (default `http://localhost:11434`).
- **Why we keep OpenAI as an option:** Customers may want the best-quality
  models (GPT-4o, etc.) for production anomaly evidence. The provider
  abstraction makes this a configuration choice, not a code change.
- **Recommendation for development:** Use Groq or Ollama. Switch to
  OpenAI only when the quality difference matters for a specific use case.

---

## 2. Vercel (Frontend hosting)

- **Status:** Active. Frontend deployed at `vojas-frontend.vercel.app`.
- **Cost model:** Free tier covers hobby use (100 GB bandwidth/month).
  Exceeding the free tier triggers pay-as-you-go.
- **Free alternative available:** Netlify (similar free tier), or fully
  self-hosted on a free tier Render/Railway web service.
- **Why we keep Vercel:** Best Next.js/Vite deployment DX, preview
  deployments on PR, free for VOJAS's current traffic.

---

## 3. Render (Backend hosting)

- **Status:** Active. Backend at `vojas-backend.onrender.com`.
- **Cost model:** Free tier (spins down after 15 min idle — cold starts
  ~30s). Paid plans start at $7/month for always-on.
- **Free alternative available:** Railway (free tier with $5 credit),
  Cyclic (truly free for small apps), Fly.io (free tier).
- **Why we keep Render:** Reliable, simple, paid plan is cheap when we
  outgrow the free tier.

---

## 4. (NOT used) Google Maps Platform

- **Status:** Deliberately not integrated. VOJAS uses Leaflet +
  OpenStreetMap tiles (free) instead.
- **Cost model:** $200/month free credit, then pay-per-load.
- **Free alternative in use:** Leaflet + OpenStreetMap + free satellite
  tiles via Esri (where available).
- **Why we don't use it:** OSM covers all VOJAS map needs. Adding Google
  Maps would add cost without a feature we need.

---

## 5. (NOT used) Google Earth Engine

- **Status:** `REQUIRES VERIFICATION`. Not currently integrated.
  Satellite data is sourced via Copernicus/CDSE (Sentinel-2), which is
  genuinely free and open.
- **Cost model:** Free for research/non-commercial use, subject to
  Google's approval. Approval can take days to weeks.
- **Free alternative in use:** Copernicus Data Space Ecosystem (CDSE)
  for Sentinel-2 L2A products. Fully open, no approval required.
- **Why we might add it later:** Earth Engine's analysis library
  (NDVI time series, change detection, cloud masking) is more mature
  than what we can build on raw Sentinel-2 products. Worth adding if
  we hit a specific analysis it does better.

---

## Verification checklist before adding a new paid service

Before adding any new paid dependency, run through this list and record
your answers in this document:

1. **What does it cost?** (Per-request? Flat monthly? Usage tiers?)
2. **What is the free alternative, and what is the tradeoff?**
3. **Is the paid service genuinely necessary, or is the free option
   "good enough" for the current stage?**
4. **Does the free option have a quota that we will outgrow? When?**
5. **What are the licensing / commercial-use restrictions?**
6. **Is the cost predictable, or could a misuse / bug cause a billing
   surprise?**

If any answer is "I don't know," mark the dependency as
`REQUIRES VERIFICATION` until verified.
