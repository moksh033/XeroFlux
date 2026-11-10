# ClimateLens India backend

FastAPI historical-evidence API with a connected React frontend and a typed Data Analytics & Visualization (DAV) service. Unsupported science/data remains explicit rather than simulated. Scientific library files and the existing analytics plugin protocol are unchanged.

## Setup — Windows PowerShell

From repository root:

```powershell
py -3.12 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
cd backend
.venv/Scripts/python.exe prepare_workbook.py --workbook "../XeroFlux Dataset.xlsx" --output ../data/processed
```

NIElytics is pinned to the exact installed upstream revision `ebb751664d92ce11a6751d2d933a9c2282de0c83` (0.2.0.dev1). Installing requires Git/network once; running requires neither a remote LLM nor GPU. Python 3.12 was used because this workstation defaults to Python 3.15.

### Official boundaries — explicit preparation, never startup download

The workbook explicitly omits polygon geometry. Obtain the official NWIC archive from its workbook-declared URL, then transform its actual **EPSG:7755** geometry to EPSG:4326:

```powershell
# From backend; create ../data/raw first if absent.
curl.exe --fail --location --output ../data/raw/state_nwic_geojson.zip https://nwdp.nwic.gov.in/dataset/dd960900-34cc-4486-a95c-83200d2f2c7b/resource/f039e721-132c-4a24-9e5e-07af03064b4d/download/state_nwic_geojson.zip
.venv/Scripts/python.exe prepare_boundaries.py --archive ../data/raw/state_nwic_geojson.zip --output ../data/processed
```

The transform uses pyproj with `always_xy=True`, preserves complete polygons/islands/holes, validates coordinate ranges and matches IDs/names to the workbook state catalog. No approximate substitute outline or simplification is used. Downloads and prepared assets are ignored under `data/`; retain them locally for offline judging. Re-running workbook preparation publishes a new manifest; run boundary preparation again afterward.

### Run

```powershell
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

API: `http://127.0.0.1:8000/api/v1`. Interactive docs: `/docs`; runtime OpenAPI: `/openapi.json`. Port 8000 is an explicit local run choice. No data downloads/workbook ingestion occur at startup or per request.

Environment (set in shell; `.env.example` is not automatically loaded):

```powershell
$env:CLIMATELENS_DATA_DIR = 'C:/actual/path/to/prepared-data'
$env:CLIMATELENS_CORS_ORIGINS = 'http://127.0.0.1:5173,http://localhost:5173'
$env:CLIMATELENS_ANALYTICS_MODULE = 'app.services.nielytics_adapter'
```

Default data root is repository `data/processed`, independent of working directory. Relative configured paths resolve against working directory. Default analytics is the included adapter calling actual NIElytics; empty explicitly disables analysis. CORS allows only configured origins. No credentials or API keys are hardcoded.

## Data connected / limits

`prepare_workbook.py` streams ZIP/XML rows rather than expanding the 745 MB cyclone worksheet in memory. It converts actual supplied records to validated prepared Parquet/JSON; this is storage normalization, not a new climate algorithm. Source originals, unmatched/ambiguous names, missing values, rejected records and exact duplicate decisions are recorded in `processing_report.json` and `processing_issues.jsonl`.

- **States:** actual NWIC attribute IDs (`stcode`) and names from workbook.
- **Boundaries:** official downloaded NWIC polygons, reprojected from their declared CRS.
- **Rainfall:** 2,664 prepared daily state observations, 2026-08-19–2026-11-01, preserving source `Daily Actual` values and dates. The workbook does not establish the unit; unit remains null. The incomplete year cannot supply annual totals, anomalies or annual comparisons.
- **Floods/landslides:** documented catalog records covering 1967–2023 / 2007–2016, not proof of complete reporting. Ambiguous state names/multi-state events remain unassigned rather than being allocated by guess. Missing coordinates remain null. Landslide original provenance remains uncertain despite workbook NASA/GLC attribution.
- **Cyclones:** actual North Indian Ocean source observations, storm IDs, source timestamps, WMO wind/pressure and original units. Basin records are not confirmed Indian landfalls.
- **Drought:** prepared national annual drought-area percentage, 2021–2026, declared as annual means of reported weekly observations. It cannot be assigned to a state.
- **Temperature:** prepared regional annual summer (April–June) maximum in °C, 1967–2024. Query the exact returned region name or state code; month-specific analysis is available only if the source returns monthly rows, never by assigning a month to annual records.

These current declarations come from the prepared manifest, which supersedes stale omissions in earlier processing reports; they are not new verification results. Source references come from the workbook and are marked workbook-declared/unverified, not independently authenticated. Geometry was separately retrieved from the exact official URL. Catalog coverage does not establish complete analytical coverage or equal reporting completeness.

## Scientific integration

`app/services/nielytics_adapter.py` calls actual NIElytics statistical summaries, Mann–Kendall, regional event aggregation, InsightEngine and regional catalog-overlap methods. Unsupported rainfall schema skips annual analysis transparently and can still provide supported event insights. Single-state event summaries are not interstate hazard/risk rankings. Multi-hazard results mean catalogs overlap in a state over the selected period—not simultaneous events, correlation or causation.

Current advertised comparison metrics are `flood_event_count` and `landslide_event_count`. They count documented state records per catalog-observed year, not hazard risk: zero selected state records in an observed catalog year is 0; globally absent catalog years are not fabricated. Annual rainfall remains unsupported because the supplied daily observations are incomplete and have no declared unit. Candidate metrics must be explicitly advertised by metadata. The current library lacks a state-difference API; supplied adapter differences remain null rather than claiming an unexecuted method.

Custom science adapters may implement the strict protocol in `INTEGRATION.md`. The backend validates identities, periods, sources, paired observations, numeric validity and response schemas; it does not certify an unseen plugin's scientific validity.

`app/services/dav_service.py` adds six operations at `/dav`: distribution, comparison, relationship, counts, correlations and audit. It reuses installed NIElytics summaries/linear quantiles/IQR/OLS/Pearson correlation/profiling. Comparison delegates to the existing `compare` operation and embeds its original result unchanged; the browser does not replace plugin summaries. ClimateLens DAV separately owns equal-width histogram/shape orchestration and the educational pooled equal-variance two-sided Student t-test using `scipy.stats.t.sf`, not an NIElytics t-test.

Tests require at least two observations per state and positive finite pooled variance; regression/correlation requires at least three complete pairs with variation in both axes. Annual observations may be temporally dependent and same-year values cross-correlated. Count-test assumptions of independence/equal variance are not established and reporting differs. “Fail to reject H₀” does not establish equal states; significance is not policy importance.

Correlations retain all five variable labels but leave daily rainfall and national drought cells unavailable, including their diagonals. Only compatible annual state/year pairs are calculated. Counts read complete prepared catalogs, include unassigned events when no state is selected, distinguish coverage-null from documented zero, and report selected-geography undated exclusions before year filtering. Audits inspect complete filtered prepared source records, not paginated views or derived series: excluded ingestion rows are not included. See `INTEGRATION.md` for selectors, exact grain and calculation limits.

## API behavior

All paths below are under `/api/v1`; schemas and parameters are in `../contracts/openapi.yaml`.

| Paths | Behavior |
| --- | --- |
| `/health`, `/metadata`, `/sources`, `/states` | Process/manifest state, declared capabilities and source/state catalogs |
| `/boundaries` | Official complete available state FeatureCollection, compression and cache header |
| `/map/rainfall?year=YYYY&observation_date=YYYY-MM-DD` | One actual dated value per state; ambiguous multi-date requests require date selection |
| `/trends/rainfall?state_id=ID` | Prepared observations preserving actual daily or declared annual resolution |
| `/trends/drought`, `/trends/temperature?region=REGION` | Only compatible prepared national/regional records; explicit unavailable otherwise |
| `/events/floods`, `/events/landslides` | Optional state/year; limit 1–500, offset, optional valid_coordinates |
| `/cyclones?year=YYYY`, `/cyclones/{storm_id}/track` | Paginated storm catalog, complete selected track sorted by timezone-aware source timestamp |
| `/compare` | Validated states/metric/common period, actual science adapter results only |
| `/insights`, `/multi-hazard` | Actual executed NIElytics findings and catalog overlap with limitations |
| `/reports/state/{state_id}` | Nonempty observation-backed PDF with rows, available insights, sources/methods/limitations |
| `/dav?operation=...` | Six typed prepared-record analyses with source/scope metadata, explicit unavailable statistics and prepared-only audits |

Years are 1800 through current server year. Optional ranges require both start/end or neither; start cannot exceed end. Unknown verified state/storm IDs are 404. Invalid parameters/unsupported analyses are 422. Missing/invalid files are 503. Unexpected failures are sanitized 500. Valid unmatched data uses `status: no_data`, not zero; paginated emptiness refers to the current page. Reports require explicit state/start/end and `format=pdf`; no available evidence means `REPORT_UNAVAILABLE`, never a blank PDF.

The health flag `data_ready` means manifest validated, not all datasets available. `analytics_configured` is configuration—not proof a method executed. Metadata is declarations; observation responses preserve scope, actual source labels, units, methods and limitations.

## Verification / contract

```powershell
# From backend/; these are commands to run, not new execution results.
$env:CLIMATELENS_REAL_DATA_TESTS = '1'
.venv/Scripts/python.exe -m pytest tests/test_dav.py tests/test_nielytics_adapter.py tests/test_real_data.py
.venv/Scripts/python.exe export_openapi.py
```

OpenAPI is generated from the application, not hand-maintained duplicate schemas; regenerate frontend types with `npm.cmd run generate:api` from `frontend/`. Backend tests include DAV numerical/selection/API regressions alongside validation, GeoJSON, prepared Parquet/null handling, source provenance, installed NIElytics calls over isolated synthetic records, cyclone chronology, comparison validity, PDF text, failures, CORS and preparation. Synthetic fixtures are only tests, never production fallback data. `VERIFICATION.md` distinguishes historical execution evidence from current declarations; new integrated DAV verification must be recorded only after execution.

## Frontend handoff / demo

The React frontend now consumes generated contract types and real API queries; its static missing-contract gate was removed. Run this API on port 8000 and Vite on port 5173; Vite proxies `/api` to this server. See `../frontend/README.md` for connected-site commands and `INTEGRATION.md` for contract details.

Use `/metadata` for actual available years/dates/capabilities. Select a returned rainfall date and state; distinguish the date KPI from the analysis period and inspect Distribution with its quality audit. In Comparison, select an advertised documented-count metric and observed years for Spread, year-joined Relationship and assumption-qualified Test. In Explorer, compare Count plot/GroupBy/Pivot over the same complete catalog selection, inspect national drought and the exact temperature region, or use a returned cyclone's timestamp-matched wind/pressure relationship. In Insights, review actual findings, supported correlation cells and unavailable-cell explanations, then export the evidence report. Annual rainfall totals and state drought remain unsupported.

## Files / ownership

`app/main.py`, `models.py`, `core/`, `repositories/`, `services/`, `tests/`, preparation CLIs, `export_openapi.py`, dependency/environment files and backend documentation; shared `contracts/openapi.yaml`; ignored generated data assets. Frontend connection lives under `frontend/`; the installed scientific library is not modified.
