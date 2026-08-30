# VOJAS — 5-Minute SIH Pitch Script

**Target:** Smart India Hackathon 2026 — Problem SIH26102
**Audience:** Judges (technical + non-technical), 5-minute slot
**Demo accounts:** All use password `VojasDemo2026`
- `admin@vojas.gov` — full PII + admin views
- `officer@vojas.gov` — field officer (recommended for primary demo)
- `analyst@vojas.gov` — data analyst (Risk + Anomalies best views)

> **Tip:** The 4-step Demo Tour auto-shows on first login. Click "Skip" if you want to drive the demo yourself; otherwise let it walk judges through.

---

## The 30-Second Hook (0:00 – 0:30)

> *"Every year ₹4,000 crores flows through MPLAD. Less than 3% gets audited. By the time fraud is detected, money is gone and the project is on the ground. VOJAS catches the signal in real time — before disbursement, before scandal."*

**On screen:** Login page → enter `officer@vojas.gov` / `VojasDemo2026`.

---

## 1. The Command Center (0:30 – 1:15)

**Screen:** Dashboard (`/`)

**Say:** *"This is the command center. The 3D-tilted India map is the spatial view of every MPLAD project in our system. The green pulse is the system heart-beat. The 6 KPI cards break down the entire portfolio at a glance — total projects, anomalies, risk distribution, budget utilization."*

**Click:** Open the side panel → show the **Quick Ratios** + **Live Feed** + **System Status** cards.

**On screen:** Spatial map with 8 project markers, KPI cards, live feed populated from real anomaly/report data.

---

## 2. The Map (1:15 – 2:00)

**Screen:** Map View (`/map`)

**Say:** *"Every project is geocoded. We use free OpenStreetMap tiles — no Google API key needed. The clustering collapses dense regions; the heatmap shows where anomalies are concentrated. Use the risk filter to highlight only HIGH-risk projects."*

**Click:**
1. Toggle to **Heatmap** layer (top-right floating control).
2. Click the **HIGH** risk filter chip.
3. Zoom into a marker cluster; click an individual marker to fly to the project.

**On screen:** Animated risk filter, project markers, anomaly heatmap pulsing in amber/red.

**Safety note to judges:** *"This isn't surveillance — every project here is a public-record MPLAD project."*

---

## 3. The Risk Engine (2:00 – 3:00)

**Screen:** Risk Dashboard (`/risk`)

**Say:** *"This is the heart of VOJAS. Every project gets a 0–100 risk score from four independent signals. The anomaly engine contributes 40 points, financial analysis 25, citizen reports 20, timeline evaluation 15. We weight them because anomalies can be wrong, reports can be noisy, and timelines can shift — but when all four point the same direction, that's a signal."*

**Click:**
1. **Recalculate All** (top-right) — wait for the progress indicator.
2. Click a **HIGH** or **CRITICAL** project row → show the breakdown panel.
3. Walk through the 4 columns: Score Breakdown, Risk Factors, Anomalies & AI.

**On screen:** Risk table with color-coded scores, breakdown panel showing 4 signal contributions and any AI explanations.

**Key line:** *"This is not a black-box ML model. Every score is explainable, every factor auditable, every decision traceable."*

---

## 4. The AI Verdict (3:00 – 3:45)

**Screen:** Anomaly Detail (`/anomalies/<id>`)

**Say:** *"Click any anomaly. This is where the AI shines. The confidence ring — see it animate to 78% — is the AI's own assessment of how certain it is about this flag. Contributing factors break down why. The recommendation tells the officer what to do next. CRITICAL means escalate today. HIGH means review in 48 hours. The verdict is human-readable, not a probability score."*

**Click:** Scroll to the **AI Verdict** panel.

**On screen:** Animated confidence ring (SVG, framer-motion), weighted contributing factors bars, recommendation callout.

**Pivot line:** *"Notice the trust notice at the bottom — this verdict is a risk indicator, not a fraud conviction. Final verification stays with the human officer."*

---

## 5. The Citizen Loop (3:45 – 4:30)

**Screen:** Reports (`/reports`)

**Say:** *"Citizens submit reports without logging in — there's a public portal at /citizens. Each report can include photo or PDF attachments. The moment a report is submitted, our AI classifier runs on the text — extracting keywords, detecting corruption signals, suggesting severity. The reporter's identity is auto-redacted in the UI for any role below ADMIN. Officers who need to see the original must log an investigation context — and that's audit-logged."*

**Click:**
1. Open any report → show the **AI Analysis** section (keywords, sentiment, suggested severity).
2. Note the **PII redacted** state (e.g. `[REDACTED]` for reporter name).
3. If logged in as `admin@vojas.gov`, show the **View Original** button + the investigation-context modal.

**On screen:** Report list, AI classification panel, PII redaction in action.

---

## 6. The Close (4:30 – 5:00)

**Screen:** Back to Dashboard

**Say:** *"VOJAS is an accountability layer, not a fraud conviction engine. It surfaces risk indicators for human verification. It preserves the chain of evidence with audit logs. It scales to every Lok Sabha constituency without requiring a single API key. And it runs on a stack the government already trusts: Node.js, PostgreSQL, React."*

**On screen:** Dashboard overview, with the demo tour button visible (click it to show the guided walkthrough again if judges want to click around).

**Final line:** *"We believe accountability is the foundation of public trust. VOJAS makes it visible. Thank you."*

---

## Backup Screens (if time allows)

- **Analytics** (`/analytics`) — admin/analyst-only, charts of all 4 risk signals across the portfolio.
- **Settings** (`/settings`) — admin panel for user management, anomaly rules, audit log.
- **Map sidebar** — switch between Markers / Heatmap / Both with a single click.
- **Notifications bell** — top-right; shows in-app inbox of anomaly and report events.

## Common Judge Questions

**Q: Is this real-time?**
A: The data is real-time where the source is real-time (citizen reports). Anomaly scans are run on demand. Risk recalc is on demand; in production, a nightly batch job.

**Q: How do you avoid false positives?**
A: Three safeguards: (1) every flag requires a rule trigger AND at least one corroborating signal; (2) AI confidence is shown, not hidden; (3) the trust notice on every page reminds the officer that this is a risk indicator, not a fraud conviction.

**Q: What about PII?**
A: Reporter PII is redacted at the service layer for every role except ADMIN. ADMIN access to original data requires a written investigation context, which is audit-logged with user, timestamp, and reason.

**Q: Can this scale to all 543 Lok Sabha constituencies?**
A: Yes. The architecture is stateless on the backend, with PostgreSQL handling the relational load. Current bottleneck is data ingestion (citizen reports) which scales horizontally with the Node workers.

**Q: How is this different from existing audit systems?**
A: Existing audits are retrospective — they run after the money is spent. VOJAS is concurrent — it flags signals during the project lifecycle, when intervention is still possible.

**Q: What about the AI — is it a real LLM?**
A: Our core explainability engine is a local, rule-based, deterministic system. It runs offline, on the same server as the API. The architecture has a `LLMProvider` interface so we can swap in a hosted LLM (Claude, OpenAI) when an API key is configured. We chose this for two reasons: SIH runs in environments where external API calls may be restricted, and we want the AI to be auditable — every factor and recommendation is traceable to a rule.
