# ClimateLens India — connected frontend

React/TypeScript/Vite dashboard using the actual FastAPI contract at `../contracts/openapi.yaml`, including the typed `/api/v1/dav` analytical boundary. No mock-data mode, external tiles, paid maps or external fonts. DAV extends the backend contract without changing installed NIElytics or the existing three-operation analytics plugin.

## Run the site

Use two terminals from the repository root. Prepared real datasets and the official boundaries are already available locally from the backend preparation step.

**Terminal 1 — API**

```powershell
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — website**

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1
```

Open **http://127.0.0.1:5173**. Backend docs: **http://127.0.0.1:8000/docs**. The API process must remain running. If dependencies/prepared files are absent on another machine, follow `../backend/README.md` first; no data is silently downloaded at startup.

Vite dev **and preview** proxy `/api` to `http://127.0.0.1:8000`. No environment configuration is needed for these commands. An old `.env.local` can override this: remove an obsolete URL or set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` and restart Vite. The setting is public, never a place for secrets. For deployed static assets configure a same-origin `/api` reverse proxy or a complete API prefix with backend CORS allowing the frontend origin.

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

`dist/` is the production output. Hash routing requires no server-side page-route rewrites. On non-Windows platforms use `npm`/`npx` and the appropriate backend virtual-environment executable.

## Appearance

The dashboard opens in a **light sage-green theme**. Interface type uses the installed Bahnschrift face with native fallbacks (no font download). Use the sun/moon switch in the header to choose light or dark mode; on mobile it is a compact icon button with the same accessible **Dark mode** switch label.

The choice is stored as `climatelens-theme` in browser local storage and restored before first paint, across navigation and reloads. If browser storage is blocked, switching still works for the current page. Maps, legends, charts, tables, form controls and source popups follow the selected theme. Switching changes map paint in place: it does not reload geometry, reset the viewport, clear filters or restart cyclone playback.

## Connected routes

- `#/overview`: India climate atlas. The official boundary map remains the hero. Selected-state rainfall uses in-place **Trend / Distribution**; the exact recorded-date KPI remains separate from the selected analysis period. The explanation drawer carries the boxplot/shape statistics and complete source-record audit. Rapid date/state changes are debounced and stale observations are never labelled with the new selection.
- `#/explorer`: rainfall and five hazard interfaces. Floods/landslides use **Records / Counts**; Counts offers **Count plot / GroupBy / Pivot** over identical complete hazard/decade rows, not the visible event page. Numeric series use **Trend / Distribution** with exact returned temperature region/month/year scope and national-only drought. Cyclones use **Track / Relationship**, pairing the selected storm's wind/pressure at identical timestamps while retaining incomplete source rows.
- `#/time-machine`: actual cyclone, rainfall-date and paginated event replay. Play/Pause/Restart/Step, speed and seek operate on recorded observations. Fani is selected only when returned. No visual interpolation is added.
- `#/comparison`: catalog states, advertised comparable metrics and periods, with **Trend / Spread / Relationship / Test** in one canvas. Current metrics are documented flood/landslide counts. Spread uses a shared axis; Relationship joins explicit years; Test shows the educational equal-variance model and permanent reporting/independence caveats. Annual rainfall is capability-gated, including unsupported URL selections, with no calculation substitute.
- `#/insights`: **Findings / Correlations**. Findings retain actual NIElytics methods/source IDs and the real PDF action; explanations trace source records → summary → supported interpretation → proposed decision → proposed action. Correlations retains five labels with unavailable-cell reasons; a supported off-diagonal cell replaces the matrix with its pair scatter, and Back restores it without changing scope.
- `#/multi-hazard`: actual backend catalog-overlap relationships, map and chronological source records; not proof of simultaneous events or causation.
- `#/sources`: all returned source/provider/URL/provenance/coverage metadata. HTTP(S) links only; original landslide provenance remains uncertain.

Filters persist in hash-query parameters across navigation/history. `dav_view` persists valid page/lens views; an incompatible carried-over view falls back to that lens's default. View switches preserve geography, period and metric; hover/focus stays local, and selected matrix pairs clear on scope changes. Explicit available/catalog-default resets clear `dav_view` as well as restoring supported defaults. Explorer Counts preserves the Records year; decade highlighting does not truncate its period sample. Mobile navigation traps focus, supports Escape/focus return, and avoids off-screen keyboard targets. Charts have accessible observation/derived tables; map failure retains keyboard state selectors and actual data views.

### Explain this analysis

The four analytical pages share a controlled native-dialog drawer with **Interpretation**, **Calculation**, and **Data & assumptions**, including **Quality audit**. It shows the selected sample, source/method/limitations and a source selector where needed (Comparison State A/B, Insights active source dataset). Audits inspect complete filtered prepared records, not plotted bins/pairs/annual counts or paginated source views: **“Prepared records; excluded source rows are not included.”** Dtypes, `isnull().sum()`, numeric sample summaries and exact-row/identity duplicates are backend supplied; numeric zero is present.

The separate **Platform & syllabus** tab covers the four analytics types, actual decision chain, structured/semi-structured/unstructured data, 5Vs, seven platform layers, central tendency/dispersion, Bowley/Kelly/kurtosis, count plots versus histograms, GroupBy/Pivot, OLS/Pearson, pooled test limits, multivariate analysis and quality/lab operations. It cites the existing curriculum references and links Sources. Predictive analytics is explicitly not implemented—historical fit is not a forecast—and prescriptive content is human-reviewed advice, not optimized/automated intervention. No verified brochure rubric, streaming/distributed platform or causal model is claimed.

Keyboard view controls support arrows/Home/End and keep the active tab selected. Drawer Close receives initial focus; Escape/backdrop close and focus return use the native modal, leaving underlying navigation/assistant inert while open. DAV tables/drawer content scroll internally and stack on mobile; existing themes, typography and green navigation remain. Comparison identities use blue A / violet B with noncolor line/shape cues, and matrix N/A is distinct from zero. These are implemented interaction contracts, not a claim that current accessibility/browser acceptance checks have been executed.

## API / types / failure handling

`src/api/schema.d.ts` is generated, not handwritten wire types:

```powershell
npm.cmd run generate:api
```

`src/api/client.ts` centralizes typed requests, encoded query/path parameters, envelope validation, abortable requests, five-minute historical caching and bounded transient retry. `src/api/types.ts` aliases generated `DAVQuery`, the six `kind`-discriminated payloads, `Distribution`, `SamplePoint`, `PairPoint`, `Regression` and `Test`; shared panels use the existing typed `useApi('/api/v1/dav', query, undefined, enabled)` boundary. Regenerate the backend OpenAPI contract before `generate:api`; never hand-edit generated wire types or serialize nested chart data into insight strings.

DAV operations are `distribution`, `comparison`, `relationship`, `counts`, `correlations`, `audit`. The route accepts compatible dataset/state/region/storm/year/month/measure selectors; full requirements and payload shapes are in `../backend/INTEGRATION.md`. Valid empty selections are `no_data` with `data:null` and complete metadata; incompatible analyses/selection are 422, unknown state/storm 404, unavailable prepared datasets 503. Null statistics retain an explanation, not a fake numerical fallback. A failed request never silently substitutes samples or labels old filters as current.

Report downloads require successful HTTP, PDF content type and a nonempty response. Requests abort when leaving/changing the report selection. Source IDs link to the corresponding transparency entries. All scientific findings, summaries and differences come from the backend; frontend code renders payloads rather than replacing plugin estimates or recalculating climate metrics.

## Real-data limits

- Rainfall has **2,664 daily state observations, 2026-08-19–2026-11-01**, not a full annual total. Source units are undeclared; never assume millimetres, annualize the incomplete year or fabricate anomalies. Date KPI and period analysis remain distinct. Missing observations are not measured zero.
- Temperature is declared **regional annual summer (April–June) maximum, °C, 1967–2024**. Exact returned name/code selections are not concatenated. A selected month excludes year-only rows and is usable only if actual monthly records are returned.
- Drought is declared **national annual drought-area percentage, 2021–2026**; no state allocation or replacement dataset.
- Advertised comparisons are `flood_event_count` and `landslide_event_count`, drawn from **1967–2023 / 2007–2016** catalog coverage. Zero selected documented rows is permitted only within globally observed catalog years, never proof of zero hazard; absent whole years are not manufactured.
- Counts read full prepared catalogs, include unassigned rows with no state selected, and report geography-wide undated exclusions before year filtering. Within selected bounds/decades, missing catalog coverage is N/A/null (“No catalog coverage in this period”), not 0. Count plot, GroupBy and Pivot use exactly the same rows. Missing dates/coordinates/ambiguous state assignments are not invented.
- Five-label correlations cannot be complete: rainfall cells explain “Daily observations; annual total not available.” Drought cells explain “National series cannot be assigned to this state.” No false diagonal 1. Compatible annual state-code temperature/flood/landslide pairs use explicit-year joins, pairwise n and reasons for insufficient/constant samples; state temperature requires unique annual identities, never guessed aliases.
- NIElytics supplies summaries, linear quantiles, IQR flags, OLS, Pearson correlation and profiling. ClimateLens DAV supplies histogram/shape orchestration and the **SciPy** pooled equal-variance two-sided Student t-test, not an NIElytics test. The model needs n≥2 per state and positive pooled variance, rejects iff p≤0.05, and does not silently switch tests. Annual observations may be dependent/cross-correlated; independence/equal variance are not established for documented counts and reporting differs. “Fail to reject H₀” does not prove equal states; significance is not policy importance.
- IQR flags do not establish bad measurements or disasters; observed min/max differ from in-fence whiskers. Undefined shape coefficients stay unavailable; the ±0.05 approximately-mesokurtic convention is not a normality or hazard-risk test. Cyclone pairs require consistent declared units and ≥3 complete nonconstant pairs for OLS; basin tracks are not Indian landfall.
- Current declarations come from the prepared manifest/provider references, not independent source authentication. Audits exclude rejected ingestion rows and cannot establish upstream completeness. All analysis is historical evidence, not official alerts, forecasting or validated future risk predictions.

## Demo

1. Overview: wait for `Historical API connected` and the official map. Choose a returned rainfall date; click a state to see its observed series and coverage.
2. Time Machine: select cyclones, 2019, FANI (`2019116N02090`, when returned). Play, pause, step and restart while inspecting source timestamps and wind/pressure units.
3. Explorer: compare Count plot/GroupBy/Pivot for the same state/period, including coverage-null and undated disclosures; inspect a returned temperature region or national drought without changing grain.
4. Comparison: choose an advertised documented-count metric for Karnataka (`29`) / Odisha (`21`) and supported years, then inspect Spread → Relationship → Test with the model caveats visible. No annual-rainfall substitute.
5. Insights: open an actual finding's explanation/evidence chain and quality audit, then inspect supported correlation pairs and the honest unavailable rainfall/drought cells. Download the state evidence report and review source/provider links. Suggested decisions/actions remain advisory.

## Verification commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Playwright starts the real local backend and Vite frontend automatically (or reuses existing servers). It requires prepared source data and the backend virtual environment. Its desktop/mobile scenarios use actual API responses—not fixture network routes. Unit tests use explicitly synthetic transport responses under `src/test/` only and cover malformed data, zero versus no-data, errors/cancellation, replay transitions, navigation and health retry; Comparison behavior regressions cover DAV selection/request boundaries. Synthetic responses are never a product fallback.
When reusing servers under a CI-marked shell, explicitly opt in with `$env:PLAYWRIGHT_REUSE_SERVER = '1'` before running Playwright. This leaves your existing backend/frontend processes alone rather than stopping them to free ports.

### Interface simplification & visualization-first layout — 2026-11-10

- **App chrome cleaned:** Removed sidebar footer (`Powered by NIElytics`, `Sources and methods` link, `NIErnaya 2026`) and topbar connection pill (`Historical API connected`) & `Active filters` disclosure per request.
- **Default state:** Configured across all pages to default to Karnataka (`29`) via `defaultStateId()` instead of alphabetical Andaman (`35`).
- **Rainfall consolidated in Overview:** Disaster Explorer focuses purely on hazards (Floods, Heat, Drought, Landslides, Cyclones) with Floods defaulting to Counts representation. Overview houses full-featured rainfall choropleth map alongside an in-viewport 320px rainfall trend/distribution chart and compact date/period controls.
- **Visualizations elevated & prose reduced:** Replaced heavy repetitive text paragraphs, redundant disclaimers, and verbose attribute tables with live graphs (such as cyclone wind/pressure line charts in Time Machine, multi-hazard relationship bar charts, and prominent correlation matrices in Insights).
- **Sources centralized:** Removed repetitive `Evidence` / source metadata footers across all route cards; consolidated all dataset provenance, documentation, and syllabus topics strictly within `#/sources`.
- **Verification:** All 52 Vitest unit/integration tests pass; TypeScript typecheck exits 0. Real Chromium browser verified zero overflow, proper state selection, and prominent charts across all routes.
### Historical connected-frontend verification

The earlier frontend integration record describes real-backend Chromium coverage of both themes, desktop 1440×900 and mobile 390×844 (plus a 1024×768 stacked layout), map first-fold geometry, state selection, rapid filters, replay controls, source links, PDF downloads, multi-hazard paging and mobile navigation. Screenshots/traces were written under ignored `test-results/`. The proxy was also exercised directly against the backend; reused servers were left running, owned processes were stopped and diagnostic tabs closed. This is historical coverage, **not a rerun or proof of the new DAV views, drawer, calculations or accessibility gates**. New integrated checks and actual browser measurements/results must be recorded after execution; no DAV pass totals are claimed here. See `../backend/VERIFICATION.md` and the acceptance gates in `../plan.md`.
MapLibre's bundled engine remains a large lazy-loaded chunk, and full-resolution official geometry makes the first map load heavier. The production build reports the chunk-size warning rather than hiding it; historical responses are cached, and no external tile service is required.

## Files changed / added

- Generated types, API client and schema aliases: `src/api/{schema.d.ts,client.ts,types.ts}`.
- Live map, shared evidence/chart/report controls and DAV surface: `src/components/{IndiaMap,DataPanels,DAVPanels,AnalysisDrawer,AnalysisExplanation}.tsx`.
- URL filters and playback: `src/hooks/{useFilters,usePlayback}.ts`.
- All seven `src/pages/` views; live connection indicator/filter reset in `src/App.tsx`; responsive live-data styles.
- Vite proxy, environment example, generated-type script/dependency lock, unit and live browser scenarios.
- Appearance: `src/theme.tsx`, pre-paint initialization in `index.html`, header switch in `src/App.tsx`, and token-based light/dark `src/styles.css`. Theme persistence/storage restrictions and live map/replay preservation have dedicated tests.
- Removed obsolete `IntegrationGate.tsx`, `connection.ts` and their obsolete tests in the earlier integration. DAV now adds a generated backend contract and prepared-record service while preserving installed science routines, plugin summaries and ordinary callers.
