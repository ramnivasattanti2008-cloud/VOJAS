# VOJAS — Open Data Ingest

Idempotent scripts for loading real MPLADS data into VOJAS.

## Data sources

| Source | Records | Scope | Key field |
|--------|---------|-------|-----------|
| Vonter/india-mplads-works | 60,359 | Recommendations (single-day 2024-03-04) | MP name + constituency + Rajya Sabha |
| dataful.in 18th Lok Sabha | 96,541 | Expenditure 2024–2026 | `vendor_name` (14,754 unique vendors) |
| opencity.in 15th/16th/17th Lok Sabha | ~100K/term | Expenditure 2009–2024 | Longitudinal term history |
| LGD (lgdirectory.gov.in) | 784 districts | Master reference | Canonical district names + LGD codes |

## Order of operations

```
1. npm run ingest:lgd         # LGD master reference (canonical names, LGD codes)
2. npm run ingest:vonter      # Recommendations (Rajya Sabha + Vonter state/district)
3. npm run ingest:opencity    # Historical 15th–17th Lok Sabha (2009–2024)
4. npm run ingest:dataful     # 18th Lok Sabha with vendor data (2024–2026)
5. npm run ingest:normalize   # Post-ingest: LGD matching, vendor aggregates
```

> **Important:** Run `npm run db:push` before the first ingest to create the new tables (`MP`, `Vendor`, `LGDLocation`, new `Project`/`Expenditure` fields).

## Idempotency

Every script uses upserts keyed on stable natural keys:
- **MP**: unique on `(name, constituency, term)`
- **Project**: unique on `(source, sourceWorkId)`
- **Vendor**: unique on `(nameNormalized, state)`
- **Expenditure**: unique on `(source, sourceTxnId)`
- **LGDLocation**: unique on `(lgdCode)`

Re-running will update existing rows, not duplicate.

## Dry run

Every script accepts `--dry-run` to print stats without writing to the DB:

```bash
npm run ingest:vonter -- --dry-run
npm run ingest:dataful -- --dry-run
```

## Manual data download

If network is unavailable, place the CSV files manually:

| Script | Expected file path |
|--------|-------------------|
| vonter | `scripts/ingest/data/MPLADS.csv` |
| opencity 15th | `scripts/ingest/data/opencity-15th-lok-sabha.csv` |
| opencity 16th | `scripts/ingest/data/opencity-16th-lok-sabha.csv` |
| opencity 17th | `scripts/ingest/data/opencity-17th-lok-sabha.csv` |
| dataful | `scripts/ingest/data/dataful-18th-lok-sabha.csv` |

## Expected row counts after full ingest

| Table | Expected rows |
|-------|-------------|
| MP | ~800–1,200 unique MPs |
| Vendor | ~5,000–15,000 (after dedup) |
| LGDLocation | 784 districts (initial) |
| Project | ~200,000+ |
| Expenditure | ~300,000+ |

## Troubleshooting

### `npm run ingest:opencity` returns 502
The opencity.in server is flaky. Try again later, or download manually:
1. Visit https://data.opencity.in/dataset/lok-sabha-mp-local-area-development-funds-details
2. Download each CSV and save to `scripts/ingest/data/opencity-{term}-lok-sabha.csv`

### `npm run ingest:dataful` returns 404
dataful.in may require browser session. Download manually:
1. Visit https://dataful.in/datasets/22565/
2. Click Download → CSV
3. Save to `scripts/ingest/data/dataful-18th-lok-sabha.csv`

### District matching rate is low
After running `ingest:normalize`, check the match rate:
```sql
SELECT COUNT(*) FROM Project WHERE lgdDistrictCode IS NULL;
```
Low match rate = LGD names differ from source names. The `normalizeDistrictName()` helper in `_shared.ts` handles common variations, but you may need to add more mappings.

## Adding new sources

1. Create `scripts/ingest/{source}.ts`
2. Import `{ batch, parseCSV, ... }` from `_shared.ts`
3. Use upserts on `(source, sourceWorkId)` for Projects
4. Add to `ingest:all` in `backend/package.json`
