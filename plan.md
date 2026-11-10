# ClimateLens India DAV Implementation Plan

**Goal:** Make the four existing analytical pages an assumption-aware climate evidence workbench that visibly covers the NIErnaya Data Analytics & Visualization curriculum using only the supplied prepared observations.

**Architecture:** Add one typed backend DAV service and one `/api/v1/dav` endpoint, preserving the existing analytics plugin and its scientific summaries. Generate the frontend contract, then build shared analytical panels and a controlled explanation drawer before integrating Atlas, Explorer, Comparison and Insights as in-place views. Keep one analytical canvas and a narrow scope rail; Atlas's map remains the hero.

**Tech Stack:** Existing FastAPI/Pydantic backend, prepared Pandas tables, installed NIElytics and SciPy; React 19, TypeScript, TanStack Query, Recharts 3, Tailwind 4, MapLibre, existing light/dark CSS themes; existing pytest/Vitest and real Chromium for verification. No added runtime dependency or Power BI Desktop/Fabric/DAX migration.

**Spec:** [CLIMATELENS_INDIA_PLAN.md](CLIMATELENS_INDIA_PLAN.md), preserved unchanged as the original reference specification. Read both documents before implementation; this plan carries the executable contracts and reorganizes the work, not a reduced scope.

> **Execution record:** Tasks 1–8 are implemented and verified. The original task/checklist specification below is retained; implemented behavior, exercised checks, corrections and browser measurements are recorded in [backend/VERIFICATION.md](backend/VERIFICATION.md#dav-continuation--2026-11-10). Unsupported analyses remain unavailable by design, not replaced with demo data.

## Global constraints

- Four existing pages only; preserve Time Machine, Multi-Hazard, Sources and ordinary callers. No new route, dependency, Power BI Desktop/Fabric/DAX migration or external data acquisition.
- Supplied prepared observations only: no synthetic product/demo/teaching data, fabricated cells, inferred rainfall units, incomplete-daily-to-annual totals or replacement workbook. Synthetic numerical inputs are isolated unit tests only.
- Reuse existing shell, themes, map, filters, evidence, source tables and validation/error conventions. Do not alter installed NIElytics or its three-operation plugin protocol; new backend DAV estimates cannot replace plugin summaries in the browser.
- Same analytical sample across selection, computation, captions, tables and audits. Preserve source identities; join explicit state/time keys, never array positions.
- Missing ≠ zero; non-finite statistics → null with limitations. Unsupported analysis explains prerequisites; valid empty selection → `no_data`; never substitute a dataset.
- Counts ≠ hazard risk; correlation ≠ causation; IQR flag ≠ bad measurement/disaster; significance ≠ policy importance. No assumed positive/negative climate polarity.
- Existing typography/theme and green navigation; semantic color, sentence case and tabular numerals. No ornamental gradient/glow/card wall, new fonts, fabricated baseline deltas, gauges or sparklines.
- Measured body contrast4.5:1/nontext3:1,44px touch actions, keyboard focus, noncolor cues, reduced motion, mobile stacking and internal table scroll.
- Preserve source evidence and existing map/null/backend-summary regressions. Behavior tests target uncertain edges/API contracts, not source text or arbitrary wording; real-browser proof is mandatory.
- One integration owner for shared files; sample/service/models → route/contracts → shared surfaces → independent page slices → whole-app verification/docs.

## Review focus

| Failure mode | Required behavior and owning evidence |
| --- | --- |
| 1. A map date, temperature month or region alias changes the chart sample without changing its caption/audit | Keep recorded-date KPI separate from period analysis; preserve exact region/month selection and year-only separation. Task 1 selection regressions; Tasks 4–5 and Task 8 browser comparison of chart/table/audit scope. |
| 2. A catalog gap, unassigned incident or undated row becomes a false zero or disappears through pagination | Complete catalog selection, explicit zero-versus-coverage-null policy and geography-wide undated exclusions. Tasks 1–2 backend regressions; Task 5 all-states/multi-decade browser scenario. |
| 3. A changed state/period leaves an old p-value or an unsupported URL invokes rainfall analysis | Gate requests by capabilities and current filters; no stale verdict or daily-to-annual substitute. Tasks 2 and 6 API/behavior regression and Task 8 real-browser scope change. |
| 4. A dense matrix/outlier/drawer becomes unreadable or unusable on mobile/keyboard | Meaningful contrast, 44px touch actions, keyboard-focusable marks/cells, modal focus return, internal table/dialog scroll. Task 3 component acceptance and Task 8 viewport/theme/keyboard browser proof. |
| 5. A carried-over `dav_view`, hover or reset silently changes analytical filters | Validate page/lens views, preserve filters on view changes, keep hover local, clear `dav_view` only on explicit defaults reset. Tasks 3–7 integration contracts; Task 8 URL/refresh/reset/hover browser scenarios. |

## Skill provenance and applied refinements

Installed project-locally under `.agents/skills/`, tracked by `skills-lock.json`; the three design/planning `SKILL.md` files were read. Counts are observed CLI directory snapshots, **not correctness guarantees**.

| Skill/source | Observed installs | Concrete change applied to this plan |
| --- | --- | --- |
| [vercel-labs/skills@find-skills](https://github.com/vercel-labs/skills/tree/main/skills/find-skills) | Not quoted | Discover/install project-local skills; evaluate fit rather than equating popularity with scientific correctness. |
| [anthropics/skills@frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | ~1.1M | Climate evidence workbench, map hero, asymmetric canvas/rail, existing typography, restrained semantic color, sentence-case actions and screenshot critique. |
| [github/awesome-copilot@power-bi-report-design-consultation](https://github.com/github/awesome-copilot/blob/main/skills/power-bi-report-design-consultation/SKILL.md) | ~9.4K | Audience/decision/visual and metric-grain dictionaries; bounded slicer/highlight/reset rules; missing/zero, contrast/touch/mobile and useful shared chrome. No arbitrary cross-filtering or performance-polarity cues. |
| [obra/superpowers@writing-plans](https://github.com/obra/superpowers/tree/main/skills/writing-plans) | ~298.4K | File responsibilities, exact interfaces, numbered checkboxes, five review risks, dependency sequencing and acceptance evidence. User's root location overrides default; no unavailable subskill/commit requirement. |

Existing `.omp` anti-slop/dashboard/geospatial guidance supports density, map priority and useful table bars, not new basemap acquisition, halos, fabricated KPI baselines or expanded cross-filtering. Live-data/scope constraints override decoration.

## Evidence status: existing capabilities versus proposed work

### Existing application to retain

Existing: four pages/shell/themes, MapLibre, shared hash filters, plugin scientific outputs, capability-driven comparison, source disclosures/tables and report export. `frontend/src/api/client.ts` already provides generated `paths`-typed `getApi`/`useApi`, parameterized query keys and `enabled`; reuse it with aliases in `api/types.ts`.

The original plan records installed NIElytics summarize/quantiles/regression/correlation/IQR/profiling and existing SciPy dependency. Continuous bins and pooled t-test are not upstream operations. DAV service/models/endpoint/panels/drawer below are **proposed**, not existing capabilities.

### Observations recorded in the original plan, not checks repeated this session

- The four root PDFs are curriculum references `Data Analytics and Visualization module 1.pdf`, `DAV Module - 02.pdf`, `DAV Lab Programs.pdf`, and scanned event brochure `NIErnaya Broucher.pdf`. The original research could not extract/render the brochure; no rubric or timing rule is attributed to it. Some PDF equations are image-only.
- The prepared manifest and actual API responses supersede stale `backend/README.md` prose and omissions in `processing_report.json`. Original read-only FastAPI requests returned HTTP 200 for temperature `region=Karnataka` and `region=29`, national drought and Karnataka/Odisha flood-count comparison for 2007–2016. This is prior-plan evidence, not a new API execution claim.
- Rainfall: **2,664 daily state observations, 2026-08-19–2026-11-01**, undeclared unit and incomplete year. Temperature: regional annual summer maximum in **°C, 1967–2024**. Drought: national annual percentage, **2021–2026**. Flood/landslide catalogs: **1967–2023 / 2007–2016**. These are manifest/provider/workbook declarations, not independent upstream authentication.
- Advertised comparison metrics: `flood_event_count`, `landslide_event_count`; annual rainfall is omitted. `_compare_event_counts` assigns zero documented state rows only within catalog-observed years; it never invents globally absent years or proves zero hazard.
- The five-variable live matrix cannot be complete: daily rainfall does not overlap historical flood/landslide/temperature years, and national drought cannot be assigned to a state. A supported annual temperature/floods/landslides submatrix for 2007–2016 is possible; all five labels remain, with explicit unavailable cells.
- Original planning attempted LSP references, but no language server was available. Future implementers reread symbols/callsites instead of trusting old line numbers.

**This session:** skill/package/source inspection only, no implementation verification. Commands and numeric/browser targets below are future gates; numeric baselines are prior-plan TestClient/Pandas/SciPy observations, not new results.

## Product and visual specification

### Audience, decisions and question-to-visual mapping

Audience: judges/analysts choosing supported scopes, inspecting claims/limitations and reviewing/exporting evidence—not operators receiving automated warnings. Desktop serves exploration/presentation; mobile retains the same evidence.

| Page / user question | Decision supported | Primary visual and grain | On-demand explanation |
| --- | --- | --- | --- |
| Atlas: “How unusual is this recorded value?” | Inspect state/outliers | Map hero/date KPI; Trend/Distribution of daily rainfall in existing state slot | Boxplot/shape/source records; not risk |
| Explorer: “How are records distributed; do storm measurements co-vary?” | Review coverage/records | Events Records/Counts; numeric Trend/Distribution; cyclone Track/Relationship | Count plot/GroupBy/Pivot same rows; same-timestamp scatter |
| Comparison: “How do annual state series differ under this model?” | Inspect spread/association/test | Trend/Spread/Relationship/Test, one canvas | Common-axis boxplots/year-join scatter/pooled t-test caveats |
| Insights: “Which claims/pairs are supported?” | Review/export evidence | Findings/Correlations; pair scatter replaces matrix | Actual evidence chain and unavailable-pair reasons |

### Metric and grain dictionary

| Metric | Geography/time grain and sample | Unit / meaning / limitation |
| --- | --- | --- |
| Rainfall KPI/map | Existing selected state/date and map sample | Undeclared unit; recorded date visibly distinct from period summary; no anomaly baseline |
| Rainfall distribution/trend | State+daily date, selected bounds | Null measurement missing; map date does not shorten period sample |
| Temperature | Exact region+year+optional month | °C, annual summer maximum declaration; month sample excludes year-only rows; matrix uses annual state-code rows |
| Drought | National+year | Annual percentage, not assignable to state |
| Flood/landslide comparison | State+catalog-observed year | Documented counts, not risk; no globally absent years |
| Event Counts | Hazard+decade within bounds, optional exact state | Complete catalog; coverage-null ≠0; undated exclusions |
| Cyclone relationship | Storm+identical timestamp, complete pair | Declared consistent units; incomplete rows remain in source table |
| Comparison test/scatter | Actual annual series; scatter joins year | Test uses observations, not total; n/assumptions visible |
| Correlation | State+compatible annual pairs per cell | Pairwise n/years, five labels, no fake diagonal/state drought/annual rainfall |
| Audit | Complete filtered prepared source table | Prepared-only, not visible page/derived series/ingestion authentication |

### Layout, interaction and color

Keep existing `Bahnschrift`/`Aptos`/`Segoe UI`/system-sans typography and neutral theme. Desktop: wide analytical canvas/narrow scope rail; Atlas's map is hero and analysis stays in its selected-state slot. One main workbench with title/method, compact view control and consistently placed **Explain this analysis**. Shared chrome is useful title/action/body alignment and crisp border, not nested cards. Mobile stacks without deleting evidence.

- **Filters/slicers:** state selection on the map updates the existing shared filters; scope controls remain the existing state/metric/period/hazard/storm controls. Reuse `SlicerRibbon` unchanged for real hazard/decade filters. Do not introduce arbitrary chart-to-chart cross-filtering. Hover/focus highlights are local and must not mutate filter/query state.
- **View state:** hash query `dav_view` switches representation, not sample. Valid page/lens values are specified in Task 3. Unsupported carried-over values fall back to that page/lens default. Keep matrix pair selection and drawer state local; clear selected pair on scope change, no new global store.
- **Reset:** explicit “Reset to available defaults” / catalog-default resets in Explorer, Comparison and Insights also clear `dav_view`. Ordinary view switches preserve geography, period and metric. Counts preserves the Records `year`; its decade ribbon highlights only and cannot truncate the multi-decade sample.
- **Loading/error/zero:** existing `QueryState` and selection-error conventions distinguish loading, valid empty `no_data`, unavailable statistic, unsupported selection, unknown identifier and unavailable dataset. Never leave a previous scope's verdict visible while fetching. Render null as “Unavailable”/hatched “N/A” with a specific reason; render numeric zero as zero. A zero event count means zero selected documented rows within observed coverage, not zero hazard.

| Role / token | Light | Dark | Use |
| --- | --- | --- | --- |
| Rainfall / `--rainfall` | `#2563EB` | `#60A5FA` | Rainfall series and active rainfall marks |
| Heat / `--heat` | `#EA580C` | `#FB923C` | Heat observations, not generic selection |
| Floods / `--flood` | `#0891B2` | `#22D3EE` | Flood event marks |
| Landslides / `--landslide` | `#A16207` | `#D6B45C` | Landslide event marks |
| Cyclones / `--cyclone` | `#7C3AED` | `#C4B5FD` | Cyclone event marks |
| Outlier / `--outlier` | `#BE123C` | `#FB7185` | Hollow diamond labeled “IQR outlier” |

Set tokens in `frontend/src/styles.css`, preserve green navigation and `--drought`. Univariate charts use the active hazard color. State identity overrides hazard in comparisons: A rainfall-blue solid; B cyclone-violet dashed/outlined, consistently across views. Matrix centered scale: light negative `#B45309`, zero `#F8FAFC`, positive `#2563EB`; dark negative `#FBBF24`, zero `var(--surface)`, positive `#60A5FA`. Negative/positive here means association direction, not bad/good climate. Use theme text or contrast-measured white/dark text for numbers; distinguish missing with hatch and N/A, not zero color. If a mark token fails nontext contrast on its surface, use a contrasting outline/pattern rather than sacrificing the role mapping. Do not use hazard colors blindly as body-text colors.

Use **150ms opacity only after explicit view change**, reduced-motion-safe; no repeated from-zero animation/layout shift. DAV bodies: **280px state rail /360px full workbench**, with long contents internally scrolling. Scope these heights to DAV: existing `.chart-canvas`230px/state-rail160px must not globally change or displace the map. Drawer **`min(480px,100vw)`** desktop/full-screen mobile, internal scroll/persistent Close. Mobile page flow may scroll; don't shrink the map. Captions identify dataset/scope/period/grain/declared unit/method.

## Shared scientific and API contract

### Boundary and exact response shapes

`DAVService(repository, analytics)` exposes `execute(operation: str, parameters: dict) -> Envelope`. It reads prepared records for new analyses, but comparison calls **`analytics.execute('compare', parameters)`** and returns the original `ComparisonResult` unchanged. Keep `AnalyticsService` and its three-operation plugin protocol intact; reuse `StrictModel`, `Metadata`, `Envelope`, current state validation, chronological `period()` validation and error envelopes.

Expose **GET `/api/v1/dav`** in `backend/app/main.py`:

- `operation: Literal['distribution','comparison','relationship','counts','correlations','audit']`.
- Optional selectors: `dataset: Literal['rainfall','temperature','drought','tracks','floods','landslides']`, `state_id`, `state_a`, `state_b`, `metric`, `region`, `storm_id`, `start_year`, `end_year`, **`month: Annotated[int | None, Query(ge=1,le=12)] = None`**, **`measure: Literal['value','wind','pressure'] = 'value'`**. Retain existing Year/StateID constraints.
- Enforce operation-specific requirements below. Incompatible selection → **422 `UNSUPPORTED_ANALYSIS`**; unknown state/storm → **404**; unavailable files → existing **503** dataset errors; valid empty selection → **`no_data`, `data=null`**. Never silently fall back to another dataset.

Use `Result[DAVPayload | None]`, where `DAVPayload = Annotated[DistributionPayload | ComparisonDAVPayload | RelationshipPayload | CountsPayload | CorrelationsPayload | AuditPayload, Field(discriminator='kind')]`. Every payload has its matching `kind: Literal[...]`, `reason: str | None` and the following fields. Every computed scalar summary/regression/test/numeric-audit statistic is individually `float | None`, including min/max, quantiles, fences and whiskers; counts are integers. Non-finite results become null with an explanatory limitation. Metadata carries actual source IDs, selected period, unit, executed method and limitations.
`getApi` requires complete `Metadata` even for `no_data`: `metric`, `geographic_level`, `time_resolution` and finite nonnegative `observation_count` (0 for empty), alongside `data:null`; do not return an incomplete empty envelope.

- `SamplePoint = {id: str, label: str, value: float}`. Identity/label: state+date for rainfall, region+year+month for temperature, year for drought, storm+timestamp for tracks, state+year for comparison. Never use a plot index.
- `Distribution = {n: int, missing: int, mean, median, variance, std, min, p10, q1, q3, p90, max, iqr, lower_fence, upper_fence, whisker_low, whisker_high, bowley, kelly, excess_kurtosis: float | None, kurtosis_class: 'leptokurtic' | 'mesokurtic' | 'platykurtic' | null, bins: [{lower: float, upper: float, count: int}], outliers: SamplePoint[]}`. Put undefined-statistic/zero-denominator explanations in metadata limitations.
- `Regression = {n: int, slope, intercept, r, r_squared: float | None, reason: str | None}`; `PairPoint = {id: str, label: str, x: float, y: float}`.
- `Test = {n_a: int, n_b: int, mean_a, mean_b, variance_a, variance_b, pooled_sd, t, p_value: float | None, df: int | None, alpha: 0.05, decision: 'reject' | 'fail_to_reject' | 'unavailable', reason: str | None}`.
- `distribution`: `{points: SamplePoint[], summary: Distribution}`.
- `comparison`: `{comparison: ComparisonResult, a: Distribution, b: Distribution, points: PairPoint[], regression: Regression, test: Test}`.
- `relationship`: `{points: PairPoint[], regression: Regression, x_label: str, y_label: str, x_unit: str | None, y_unit: str | None}`; nullable units default to `None`.
- `counts`: `{rows: [{hazard: 'floods' | 'landslides', decade: int, count: int | None, reason: str | None}], excluded_undated: int}`.
- `correlations`: `{variables: ['rainfall','floods','landslides','temperature','drought'], cells: [{x: str, y: str, n: int, r: float | None, reason: str | None, points: PairPoint[], regression: Regression}]}`.
- `audit`: `{scope: 'filtered_prepared_records', rows: int, columns: [{name: str, dtype: str, missing: int}], duplicate_rows: int, duplicate_identities: int, numeric: [{name: str, count: int, mean, median, variance, std, min, max: float | None}]}`.

Do not encode nested chart data as JSON strings in `Insight.statistics`. Generate schema from FastAPI and add aliases in `frontend/src/api/types.ts`; never hand-edit `frontend/src/api/schema.d.ts`.

### Selection and calculation rules: all six operations

1. **Distribution**
   - Rainfall requires `state_id`; temperature requires `region` using exactly the requested representation, never concatenated name/code aliases; drought rejects `state_id` and stays national; tracks requires `storm_id` and `measure=wind|pressure`. Apply years and optional temperature month first, respecting `ReturnedSeries` year-only/month-specific separation. Null measurement rows count as missing, not zero.
   - Call NIElytics `statistics.summarize(..., ddof=1)` and `statistics.quantiles(..., q=[.1,.25,.5,.75,.9])`. Use Pandas-style linear quantiles, `IQR=Q3-Q1`, fences `Q1−1.5IQR`, `Q3+1.5IQR`; use NIElytics IQR detection while retaining original point identities. Strict outside-fence inequalities flag outliers. Whiskers are actual in-fence extrema, not fences; observed min/max are separate Tukey five-number-summary entries. With IQR=0, fences/outlier flags remain valid but Bowley is unavailable.
   - Histogram literally uses **`k = 1 + ceil(log2(n))`** equal-width bins on observed min/max. Bins are left-closed/right-open except final bin includes max; retain zero-frequency bins. Constant v uses one nonzero-width bin `[v−w/2,v+w/2]`, `w=max(1,abs(v)*.01)`. A singleton has one ordinary bin but variance/std/kurtosis unavailable. Empty/all-null valid samples return `no_data`. Constant multi-observation samples retain mathematically valid zero variance/std, never a fabricated nonzero spread.
   - Bowley **`(Q3+Q1−2*median)/(Q3−Q1)`**; Kelly **`(P90+P10−2*median)/(P90−P10)`**. Zero denominators → null with named reason. Use the library's Pandas unbiased Fisher excess kurtosis; unavailable when n<4 or sample constant. Display convention **`abs(g2)<=.05`** = “approximately mesokurtic”, above .05 leptokurtic, below −.05 platykurtic. State this is not a normality test or a measure of extreme-disaster risk.
2. **Comparison**
   - Require distinct states, start/end and a metric actually advertised by the backend. Call existing compare, retaining all coverage/error behavior and unchanged summary; derive distributions from the actual annual series, not totals.
   - Join scatter by explicit year. Use NIElytics `linear_regression(frame,'x','y')`, map `r_value` → `r`, retain `r_squared`; require ≥3 complete pairs and variation in both axes, otherwise return points plus unavailable coefficients and specific reason. No extrapolation outside observed x.
   - Pooled two-sided Student t-test uses each state's returned annual observations with sample variances: **`sp²=((nA−1)sA²+(nB−1)sB²)/(nA+nB−2)`**, **`t=(meanA−meanB)/(sp*sqrt(1/nA+1/nB))`**, **`df=nA+nB−2`**, **`p=2*scipy.stats.t.sf(abs(t),df)`**. Require nA,nB≥2 and positive pooled variance; otherwise unavailable, not artificial p=0/1. Reject H₀ iff **p≤.05**.
   - Attribute formula/SciPy calculation to **ClimateLens DAV**, not an NIElytics t-test. Label it an educational equal-variance model. Permanently show for count metrics: **“Assumption-dependent model on documented counts; independence/equal variance not established; reporting differs”**. Annual/like-year climate observations can be temporally dependent and cross-correlated; do not claim independent-model validation or silently switch to paired/Welch. “Fail to reject H₀” is not “Accept H₀” or “The states are equal”; a p-value is not the probability H₀ is true.
3. **Relationship**
   - Selected cyclone storm only, using same-timestamp wind/pressure complete pairs and declared consistent units. Retain source rows missing either measurement in the observation table; exclude them from pairs and report excluded count in metadata limitations. Reject mixed units rather than implicitly convert. Use the shared regression helper/≥3 nonconstant-pair gate and visible temporal-dependence caveat.
4. **Counts**
   - Require ordered year bounds; optional `state_id`, with no state meaning **all catalog rows including unassigned events**, matching Records. With state, use exact ID. Read complete prepared flood/landslide tables, never a paginated API response.
   - Group dated selected rows by hazard and **`decade=floor(year/10)*10`**. Include decades with any selected dated row. Where a hazard has globally catalog-observed years inside the selected bounds/decade, no selected documented rows = 0. No globally observed year in that intersection → `count=null`, reason **“No catalog coverage in this period”**. Never fabricate whole absent years. Report selected-geography undated rows as excluded **before** year filtering because their period is unknown. Do not compare basin storm counts to state incident counts.
5. **Correlations**
   - Require state/year bounds; retain fixed labels rainfall/floods/landslides/temperature/drought. Temperature selects **`region == state_id` and `month is None`**, requiring declared annual resolution and unique `(region,year)` identities. Missing state-code annual rows or duplicate year identities make temperature unavailable; do not guess name aliases.
   - Derive annual documented flood/landslide counts using exact `_compare_event_counts` catalog-observed-year policy and preserve its limitation. Align state/year keys, ≥3 complete nonconstant pairs; NIElytics **`correlation_matrix(method='pearson')`** and shared regression. Include pairwise n and actual years in labels/tooltips.
   - Rainfall cells: **“Daily observations; annual total not available.”** Drought cells: **“National series cannot be assigned to this state.”** No diagonal 1 for unavailable variables. Current annual temperature/floods/landslides may form a descriptive three-variable submatrix for 2007–2016; unsupported cells remain explicitly unavailable.
6. **Audit**
   - Same dataset/state/region/storm/period/month as active analysis; complete filtered prepared source table. Compute **`isnull().sum()`**, exact duplicate rows and observation-identity duplicates, normalizing nested attributes for whole-row comparison. Reuse NIElytics profiling and `summarize`, sample SD/variance; numeric zero is present.
   - Identity keys: rainfall `(state_id,year,date)`, temperature `(region,year,month)`, drought `(year)`, tracks `(storm_id,timestamp)`, event catalogs `(event_id)`. Never audit only a rendered page or concatenate code/name aliases.
   - Show **“Prepared records; excluded source rows are not included.”** Do not relabel ingestion `blank_numeric` as `isnull().sum()` or infer ingestion had no duplicates from prepared rows. Comparison audits underlying prepared records for A or B, explicitly distinct from derived annual series.

Only small orchestration, binning, shape and test helpers are new. Reuse the installed numerical routines rather than writing a probability distribution or another general-purpose statistics library.

## File responsibility map

Reference rows are inspect/reuse, not rewrite. Reread symbols; old line anchors are not stable.

| File | Responsibility / ownership |
| --- | --- |
| **New** `backend/app/services/dav_models.py` | Strict nullable/discriminated models; Task1 |
| **New** `backend/app/services/dav_service.py` | Selectors, six operations, numerical orchestration/provenance; Task1 |
| `backend/app/models.py`, `backend/app/services/analytics_models.py` | Reference existing strict/envelope/comparison contracts |
| `backend/app/repositories/dataset_repository.py` | Reference complete prepared records/catalog/identity |
| `backend/app/services/nielytics_adapter.py` | Reference `_compare_event_counts`, `_rainfall`, `_OVERLAP_LIMITATIONS` |
| `backend/app/services/analytics_service.py` | Reference `AnalyticsService.execute`; plugin unchanged |
| `backend/app/main.py` | Typed DAV route/validation; Task2 |
| `backend/export_openapi.py`, `contracts/openapi.yaml` | Existing exporter/generated contract; Task2 |
| **New** `backend/tests/test_dav.py`; existing `backend/tests/test_nielytics_adapter.py`, `backend/tests/test_real_data.py` | Numeric/selection/API regressions |
| `frontend/src/api/schema.d.ts`, `frontend/src/api/types.ts`, `frontend/src/api/client.ts` | Generated types/aliases/existing request boundary; Task2 |
| **New** `frontend/src/components/DAVPanels.tsx` | Typed tabs/panels/chart-table equivalents; Task3 |
| **New** `frontend/src/components/AnalysisDrawer.tsx` | Controlled modal/explanations/audit/syllabus; Task3 |
| `frontend/src/components/DataPanels.tsx` | Optional InsightCard callback; preserve Evidence/TrendChart; Task3 |
| `frontend/src/styles.css` | Tokens, DAV-scoped layout/accessibility; Task3 shared owner |
| `frontend/src/hooks/useFilters.ts` | Reference `{filters,setFilters}` hash merge/delete |
| `frontend/src/pages/Overview.tsx` | Atlas; Task4 |
| `frontend/src/pages/Explorer.tsx` | Explorer/ReturnedSeries migration; Task5 |
| `frontend/src/pages/Comparison.tsx`; `frontend/src/test/Comparison.test.tsx` | Comparison/behavior regressions; Task6 |
| `frontend/src/pages/Insights.tsx` | Insights/evidence chain; Task7 |
| `frontend/src/test/client.test.ts`, `frontend/src/test/workbench.test.tsx`, `frontend/src/test/App.test.tsx` | Existing behavior boundaries; extend only changed contracts |
| `frontend/playwright.config.ts`, `frontend/package.json` | Reference server/viewport/command conventions |
| `backend/README.md`, `backend/INTEGRATION.md`, `backend/VERIFICATION.md` | Existing docs/actual verification; Task8 |
| `CLIMATELENS_INDIA_PLAN.md`, curriculum PDFs, prepared data | Immutable reference/input |

## Implementation tasks and dependency gates

Tasks1→2→3 settle shared interfaces; then **Tasks4–7 are independently runnable page slices** on existing routes/real data. API/styles/panels/drawer/DataPanels have one integration owner; page owners request shared changes rather than race. Task8 follows all slices.

### Task 1: Implement prepared-sample selection, DAV models and service

**Files:** Create `backend/app/services/dav_models.py`, `backend/app/services/dav_service.py`, `backend/tests/test_dav.py`. Reference existing models, repository, analytics service/adapter and fixture patterns in `backend/tests/test_nielytics_adapter.py` / `backend/tests/test_real_data.py`.

**Consumes:** Existing repository prepared records/catalog; `AnalyticsService.execute(operation, parameters)`; existing `StrictModel`, `Metadata`, `Envelope`, `Result`, `ComparisonResult`; installed NIElytics/SciPy routines.

**Produces:** Exact payload union above; **`DAVService(repository, analytics).execute(operation: str, parameters: dict) -> Envelope`**; all six selection/calculation operations, provenance/limitations and established empty/unsupported/error semantics. Later tasks must not invent another sample builder or estimator.

- [ ] **1.1 Define the strict models.** Encode exact discriminators, field names, nullable statistics/units, integer counts and `alpha: 0.05`; preserve embedded `ComparisonResult`. Normalize non-finite calculated values to null with a specific metadata limitation, not JSON NaN.
- [ ] **1.2 Implement filtered source selection and audits.** Follow the six operation rules, exact region and month/year separation, national drought rejection, source identities, complete catalog reads and nested-attribute duplicate normalization. Reuse repository validation/errors; do not add a dataset fallback or a second repository layer.
- [ ] **1.3 Implement descriptive and relationship helpers.** Reuse summarize/quantiles/IQR/regression/correlation/profiler; add only the specified histogram, shape/classification and pooled-test orchestration. Comparison delegates to `analytics.execute('compare', parameters)` and derives all new output from its actual annual series.
- [ ] **1.4 Add bounded numerical unit tests** in `test_dav.py`, following existing fixtures. Use these isolated inputs only in tests:
  - `[1,2,2,3,4,5,6,7,20]` → linear Q1=2, median=4, Q3=6; fences −4/12; whiskers 1/7; outlier20; k5; histogram counts **`[5,3,0,0,1]`**, final20 counted exactly once.
  - Equal values → one nonzero-width bin, no artificial variance; zero-denominator/constant shape fields null. Empty/all-null → `no_data`; singleton variance/std/kurtosis unavailable. Zero-IQR sample with a distinct extreme still flags it; numeric zero is not missing.
  - `(x,y)=([1,2,3,4],[2,4,6,8])` → slope2, intercept0, r1, R²1. Shuffle labels/include unmatched years to prove key joining. Constant x or y and fewer than3 complete pairs → unavailable coefficients with points retained.
  - A`[1,2,3]`, B`[2,3,4]` → pooled SD1, df4, t≈−1.224744871, p≈.287864135, fail to reject. n<2 or zero pooled variance → unavailable. Pin **p≤.05** at the decision helper; do not fake extreme p-values.
- [ ] **1.5 Add Review focus1–2 regressions:** exact region/month/year-only separation; null/zero; no state drought/annualized rainfall; absent global years (manifest flood1977), permitted observed-year state zeros, all-states/unassigned, undated-before-year exclusion, full-not-page counts; duplicate annual temperature identities; cyclone timestamp/storm/unit pairing; separate nested-normalized whole-row/identity duplicates and prepared-only scope.

**Acceptance evidence:** Future backend run in Task 8 passes these tests with finite JSON/null limits. Review can trace any plotted value to its actual selected prepared record or unchanged compare series. No upstream library/plugin edit or browser estimator is required.

### Task 2: Expose the route and regenerate the shared contract

**Files:** Modify `backend/app/main.py`; generate `contracts/openapi.yaml`, `frontend/src/api/schema.d.ts`; modify `frontend/src/api/types.ts`; extend `backend/tests/test_dav.py`. Existing generator/client/models remain reused, not replaced.

**Consumes:** Task 1 `DAVService`/payload union and existing `period()`/StateID/Year/error conventions.

**Produces:** Exact typed GET `/api/v1/dav` contract above, matching generated frontend `paths`/`components`; aliases for all DAV payloads, distributions, pairs, regression and test; existing generic **`useApi('/api/v1/dav', query, undefined, enabled)`** usable by every panel/page.

- [ ] **2.1 Register and type the endpoint.** Wire one service to existing repository/analytics dependencies; validate required operation selectors, distinct states and ordered bounds while retaining exact literal/month/measure/identifier constraints. Preserve 422 `UNSUPPORTED_ANALYSIS`, unknown-ID404, existing503 and valid-empty `no_data` behavior.
- [ ] **2.2 Add API contract regressions** to `test_dav.py`: all six discriminated response shapes, null serialization/metadata, unknown state/storm, invalid month, missing/reversed bounds, incompatible dataset/measure/national-state selections, unchanged embedded comparison and unsupported `rainfall_annual_total`422. Tests must prove no silent substitute; supported analysis still works when a different dataset is unavailable using existing repository error conventions.
- [ ] **2.3 Export FastAPI schema and generate TypeScript**, using the existing commands (future execution):

  ```powershell
  # From backend/
  .venv/Scripts/python.exe export_openapi.py
  # From frontend/
  npm run generate:api
  ```

  Expected: exporter writes `contracts/openapi.yaml`; generated TypeScript includes `/api/v1/dav`/payload union. Existing `generate:api` script is `openapi-typescript ../contracts/openapi.yaml -o src/api/schema.d.ts`; no hand edits or endpoint-count promise.
- [ ] **2.4 Add generated aliases** in `frontend/src/api/types.ts`; use `ResponseOf`/typed `useApi` rather than duplicate handwritten response interfaces or `Insight.statistics` JSON. Retain current request-key/enabled/error behavior; if `client.ts` needs no contract change, leave it unchanged.

**Acceptance evidence:** Task8 API/typecheck: error/no_data/null fields preserved; embedded comparison equals `/compare`.

### Task 3: Build the shared analytical surface, drawer and semantic styling

**Files:** Create `frontend/src/components/DAVPanels.tsx`, `frontend/src/components/AnalysisDrawer.tsx`; modify `frontend/src/components/DataPanels.tsx`, `frontend/src/styles.css`. Reference existing API/types/filter/accessibility patterns. Single shared integration owner.

**Consumes:** Task 2 generated aliases; existing `Evidence`, `QueryState`, source table disclosures, `.chart-canvas`, token/focus styles and source metadata.

**Produces:** `AnalysisTabs({label, options: {id,label,disabled?}[], value, onChange})`; `DistributionPanel`, `SpreadPanel`, `RelationshipPanel`, `TestPanel`, `CorrelationPanel`, `CountPanel`, `AuditPanel` consuming their corresponding generated payload, not recalculated statistics; controlled **`AnalysisDrawer({open,onClose,title,children})`**; **`InsightCard.onExplain?: (insight: Insight) => void`**. Keep `TrendChart` and callers without the new optional prop unchanged. These interfaces settle before page work.

- [ ] **3.1 Implement view controls and fixed analytical bodies.** `AnalysisTabs` uses `role=tablist`, roving tab index, arrow/Home/End keys and associated selected tab/panel IDs; clicking the selected view does not deselect it (unlike slicers). Pages persist valid `dav_view` values: Atlas `trend`/`distribution` (default trend); Explorer events `records`/`counts` (records), numeric `trend`/`distribution` (trend), cyclones `track`/`relationship` (track); Comparison `trend`/`spread`/`relationship`/`test` (trend); Insights `findings`/`correlations` (findings). Preserve filter scope on view switches, reject unsupported carried-over views and keep pair/drawer local.
- [ ] **3.2 Implement distributions and spread.** Recharts `BarChart` histogram uses numeric bin geometry, adjoining bins, frequency axis from zero and `ReferenceLine` mean/median with solid/dashed labels, never categorical-index placement. Tooltip includes exact interval/inclusion convention, count/percentage/n/k/Sturges formula. Combine overlapping mean/median legend labels and preserve exact values in summary/tooltip. Boxplots use one small responsive SVG/common numeric axis with title/description/equivalent table, not a stacked-bar imitation. Focusable hollow outlier diamonds disclose source date/value and numeric fence inequality, e.g. `value > Q3 + 1.5×IQR = upper_fence`; expose observed min/max separately from whiskers. Spread places A/B horizontal boxplots on the same axis.
- [ ] **3.3 Implement relationships and test.** Recharts `ScatterChart` plots backend pairs; line endpoints alone use backend slope/intercept and observed min/max x. Show `y = mx + c`, r, R², n and units. Hover/focus reveals identity, x/y, fitted value, residual; it never changes filters. Test is aligned result rows, not another chart: H₀: μA=μB, H₁: μA≠μB; n/mean/SD/pooled SD/t/df/p/α/decision and one assumption-qualified interpretation. Show full precision on focus, small p `<0.0001` not `0.0000`; label variance `s²`, SD `s`, with units. Keep count-model/independence/equal-variance/reporting caveats visible next to result, not only in drawer.
- [ ] **3.4 Implement correlations and counts.** Accessible matrix HTML table with button cells, r to2 decimals and pairwise n in tooltip/focus, fixed −1/0/+1 centered legend, hatch/N/A and activatable unavailable reason. Numeric off-diagonal click replaces matrix with its backend pair scatter; Back to matrix restores it; no simultaneous chart wall, constant/insufficient cells unavailable. Counts is categorical `BarChart`, **not histogram**. One `Count plot / GroupBy / Pivot` segmented control changes representation; only Count plot has `Group by` Hazard/Decade select. GroupBy shows backend `(hazard,decade,count)` rows with existing `DataBar`; Pivot has decade rows and flood/landslide columns. All use identical rows, labeled **“Documented catalog records”**; active-hazard highlighting never removes the other hazard or changes sample.
- [ ] **3.5 Implement the native modal and audit host.** Use `<dialog>` with descriptive heading, initial focus on Close, Escape and return focus to opener. Native modal makes underlying navigation/assistant inert; no overlay event bus. Direct backdrop activation closes; panel clicks do not. Apply exact drawer/body dimensions, internal scrolling and persistent mobile Close. Include sections **Interpretation**, **Calculation**, **Data & assumptions**, and separate **Platform & syllabus** tab. Data & assumptions always has **Quality audit**. Host source-selection controls: exact active Atlas/Explorer dataset; Comparison State A/B underlying source records; Insights active source dataset. Render AuditPanel's prepared-only scope, missing/zero/duplicate/statistical values without implying ingestion completeness.
- [ ] **3.6 Integrate semantic style and evidence affordances.** Apply the token table, theme-aware text/mark contrast, 44px actions, tabular numerals, focus/pattern cues, responsive stack/internal table scroll and 150ms reduced-motion-safe explicit-view transition. Keep accessible source tables, distinguish derived summary/bin/pair tables and do not append extra charts under the canvas. Add optional InsightCard action without changing existing callers' behavior.
- [ ] **3.7 Add the complete syllabus content** specified below to the shared drawer, linking existing Sources rather than a new route. Keep source-specific context passed as content/children; no global store or duplicate audit estimator.
- [ ] **3.8 Migrate comparison identity color coherently:** existing A=flood/B=accent and DataBar tone-a=accent/tone-b=flood must become rainfall-blue/cyclone-violet only for comparison identities; do not recolor unrelated hazard/navigation marks.

**Acceptance evidence:** Task 8 screenshots, keyboard/modal/mobile/contrast checks cover Review focus4–5; supported chart marks, table values and drawer calculations all match generated backend payload. Existing frontend regressions remain applicable. No new UI test suite is needed to prove pixel layout.

### Task 4: Integrate Atlas without displacing the map

**Files:** `frontend/src/pages/Overview.tsx`.
**Consumes:** Existing map/date KPI/state-period selection; Task2 typed DAV; Task3 tabs/distribution/drawer/audit.
**Produces:** Default Trend/in-place Distribution in existing rainfall slot, unchanged map/date sample.

- [ ] **4.1 Wrap rainfall slot**, request DAV only when Distribution or its drawer/audit active; preserve map/shared-filter behavior and source table.
- [ ] **4.2 Label KPI recorded date versus histogram analysis period**, never secretly singleton-filter by map date. Put boxplot/shape in drawer; zero outliers stays honest.
- [ ] **4.3 Check Review focus1/5 with Task8 Atlas browser scenario:** map state selection drives existing filters, hover does not; view refresh/scope/audit agree.

**Acceptance evidence:** Task8 screenshot/map measurements and real-data baseline checks; original map remains hero, unit null and sample stable across views.

### Task 5: Integrate Explorer's three lens families

**Files:** `frontend/src/pages/Explorer.tsx`, local `ReturnedSeries` and both callers.
**Consumes:** Existing hazard/state/year/region/month/storm filters/catalog ranges; Task2 DAV; Task3 panels/drawer.
**Produces:** Event Records/Counts, numeric Trend/Distribution, cyclone Track/Relationship; `ReturnedSeries` adds `dataset: 'temperature' | 'drought'`, `region?: string`.

- [ ] **5.1 Replace event workbench for Counts.** Default bounds=union flood/landslide catalog min/max; explicit ordered bounds override. Show bounds controls only in Counts; reversed/unsupported selection uses existing error treatment. Empty state=all-states/unassigned. Preserve Records `year`; decade ribbon highlights only. Catalog-default reset clears `dav_view`.
- [ ] **5.2 Host numeric switching/Explain inside ReturnedSeries.** Heat caller passes `dataset="temperature"`/exact region; drought `dataset="drought"`/no region. Distribution/audit use exact resolved `start`,`end`,`month`, excluding annual-only rows in month sample. Drought stays national.
- [ ] **5.3 Add selected-storm Relationship**, preserving selector/source table, exclusions/units/temporal caveat. Validate carried-over views on hazard switches; unsupported → lens default.
- [ ] **5.4 Check Review focus1/2/5 via Task8 Explorer scenario**, comparing Counts representations/full totals, Records-year restoration, all-states/coverage gaps, month/audit and storm identity.

**Acceptance evidence:** Browser/API same-sample proof; no pagination totals or silent decade truncation. Shared-file changes stay with Task3 owner.

### Task 6: Integrate capability-gated Comparison

**Files:** `frontend/src/pages/Comparison.tsx`, existing `frontend/src/test/Comparison.test.tsx`.
**Consumes:** Existing capabilities/enabled/selection; Task2 comparison payload; Task3 panels.
**Produces:** Trend/Spread/Relationship/Test under existing controls, one canvas and unchanged backend summary.

- [ ] **6.1 Trend requests `/compare` only; other views request `operation=comparison` only**, using embedded original comparison. Preserve capability-driven metrics/enabled checks.
- [ ] **6.2 Render only current-filter responses**, never old verdict while fetching; keep assumptions visible. Unsupported URL `metric=rainfall_annual_total` or drawer limitation shows `omitted_datasets.annual_rainfall`/formula prerequisites without DAV request/substitution. Explicit defaults reset clears `dav_view`.
- [ ] **6.3 Extend existing behavior tests for Review focus3:** unsupported URL→no DAV request, supported non-Trend→embedded summary, changed state/period→no stale verdict, zero visible. Test mocks stay isolated; preserve other regressions.
- [ ] **6.4 Run Task8 browser traversal/scope-change/refresh/reset scenario**, checking common-axis spread/year-paired scatter/permanent caveats.

**Acceptance evidence:** API comparison equality, existing Vitest behavior and real-browser fresh-scope proof; no alternate test or climate performance verdict.

### Task 7: Integrate Insights and actual evidence chain

**Files:** `frontend/src/pages/Insights.tsx`; consume optional InsightCard callback settled in Task3.
**Consumes:** Actual insight IDs/method/statistics/n/limitations/report; Task2 correlations/audit; Task3 matrix/drawer.
**Produces:** Findings default/Correlations replacing main canvas with scope rail retained; source-bound Evidence chain.

- [ ] **7.1 Add matrix/pair/back interactions**, exact five labels/unavailable reasons; clear local pair on scope change. Correlations use actual selected `start/end`, **not the existing rainfall-trend2019 clamp**.
- [ ] **7.2 Supply `onExplain`**, actual source records→summary→supported interpretation→proposed decision→proposed action. Exact advisory copy: **“Review the cited records and reporting coverage”** / **“Export the evidence report for review”**. Existing report button remains actual action; no invented intervention.
- [ ] **7.3 Audit active source dataset**, prepared-only scope, not rendered pair table; explicit defaults reset clears `dav_view`.
- [ ] **7.4 Check Review focus5 using Task8 Insights scenario:** supported/unavailable cell, pair/back/scope clear, cited links/report/reset.

**Acceptance evidence:** Browser pair/evidence links resolve; no false annual rainfall/state drought/diagonal, no lost scope.

### Task 8: Verify whole app and update existing documentation

**Files:** Integrated Task1–7 files; `backend/README.md`, `backend/INTEGRATION.md`, `backend/VERIFICATION.md`.
**Consumes:** All six operations, regenerated contract/shared surfaces/four page slices.
**Produces:** Exercised scientific/unit/type/browser evidence and accurate existing docs, preserving original plan.

- [ ] **8.1 Search `\bInsightCard\b|\bReturnedSeries\b` in `frontend/src`**: definition/import/caller in DataPanels/Insights, two Explorer calls migrated exactly; ordinary callers unchanged. No source-text tests.
- [ ] **8.2 Run specified backend/frontend checks once after integration**, with real-data opt-in below; regenerate contract if API changed. Preserve map/null/plugin-summary regressions. No fabricated pass/test counts.
- [ ] **8.3 Perform all real-browser/API gates below**, recording screenshots, scope/value agreement, measured map/contrast/touch/overflow and keyboard/modal/reduced-motion results; fix owning slice/shared files.
- [ ] **8.4 Update existing docs with supported `/dav` contract, grain/coverage/zero policy, SciPy attribution, limits/generation commands and actual verification evidence.** Correct stale declarations against manifest/API, not data. README's old17-endpoint claim predates assistant (18 before DAV); avoid hardcoded endpoint-count promises. Never present prior baselines/future gates as newly executed results.

**Acceptance evidence:** Every scientific/API/unit/browser/syllabus gate below; typecheck or an isolated page alone is insufficient.


## Platform and syllabus content: complete on-demand coverage

Task 3 places this in the shared drawer's **Platform & syllabus** tab, linking existing Sources. Use exact syllabus terminology on demand rather than permanent module badges or “professor mode.” Methods elsewhere retain short exact labels beside chart titles.

- **Four analytics types:** descriptive = observed distributions/counts; diagnostic = exploratory relationships with **“association, not established cause.”** Predictive = **“Not implemented: historical fit is not a forecast”**; prescriptive = **“Human-reviewed recommendation, not optimized or automated intervention.”** An OLS fit is not relabeled Predictive to tick a box.
- **Decision chain:** Module1 p12 sequence, source records → summary → supported interpretation → proposed decision → proposed action, with highlighted stages bound to selected actual insight (Task 7).
- **Data types:** structured tables/time series; semi-structured GeoJSON/API event attributes; unstructured documents/free-text only where present. Fixed-field incident rows are not inherently unstructured.
- **5Vs:** Volume = actual catalog record counts; Velocity = batch prepared workbook, not streaming; Variety = actual file/record types; Veracity = missingness/duplicates/source limitations; Value = concrete insight/report. Do not claim distributed big-data infrastructure.
- **Seven layers:** Sources (workbook/provider references) → Ingestion (`prepare_workbook.py`, `prepare_boundaries.py`) → Storage (prepared Parquet/JSON/GeoJSON) → Processing (validation/normalization) → Analysis (NIElytics plus explicitly attributed DAV/SciPy calculations) → Visualization (React/Recharts/MapLibre) → Decision making (human-reviewed evidence report). No unused Kafka/Spark/ML logos.
- **Central tendency/dispersion:** mean/median, sample variance/SD (`s²`/`s` with units), linear quantiles, observed five-number summary versus whiskers, IQR/fences/outliers. Atlas/Explorer Distribution and Comparison Spread, **Module2 pp7–26,39–74,196–203**.
- **Shape:** Bowley, Kelly and unbiased Fisher excess kurtosis, undefined denominators/sample gates and descriptive ±.05 classification convention; do not infer normality or hazard risk.
- **Bivariate/statistical comparison:** count plot versus histogram, GroupBy/Pivot same sample, wind/pressure and joined-year regression, Pearson r/R², pooled equal-variance two-sided t-test with H₀/H₁/decision limits. Explorer **Module2 pp206–214 / Lab pp24–25**; Comparison **Module2 pp80–85,114–126,199–203**.
- **Multivariate analysis:** five-label correlation matrix with pairwise n, compatible state/year grain and explicit unavailable cells; matrix-to-scatter drill-in. Insights **Module2 pp211–214,252–255; Module1 p12**.
- **Quality audit/lab operations:** actual filtered prepared `isnull().sum()`, dtypes, numeric summaries, exact-row and identity duplicates, null-versus-zero and ingestion-scope disclaimer; no claimed upstream audit based only on prepared rows.
- **Reference text:** Module1 **pp12,29–36,46–49,77–99**; Module2 **pp7–26,39–85,114–126,196–214,240–255**; Lab **pp8–15,24–25**. Sturges and explicit 1.5×IQR multiplier are requested enhancements, not claimed verbatim slide formulas; some equations are image-only.

## Verification specification: future checks, not results of this session

### Backend numerical and API gates

From `backend/`, after implementation:

```powershell
$env:CLIMATELENS_REAL_DATA_TESTS = '1'
.venv/Scripts/python.exe -m pytest tests/test_dav.py tests/test_nielytics_adapter.py tests/test_real_data.py
```
Expected: targeted unit/API tests pass, including opt-in real-data tests (**not skipped**). `test_real_data.py` requires that environment variable. No synthetic fixture is reachable through the product.

Start real API from `backend/`:

```powershell
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Prepared data defaults to repository `data/processed`; default analytics is `app.services.nielytics_adapter`. **Do not regenerate/replace the workbook during verification.** Exercise the following against actual prepared records. Numeric expectations are **prior-plan recorded baselines**, to recheck after implementation if data is unchanged:

| Future request / check | Recorded baseline / required acceptance |
| --- | --- |
| `GET /api/v1/dav?operation=distribution&dataset=rainfall&state_id=29&start_year=2026&end_year=2026` | n74, k8, mean≈2.616216216, median1.5, Q1=.3, Q3=4.375, upper fence10.4875; outliers **12.8 on2026-10-24** and **10.8 on2026-10-25**; unit remains null. |
| `GET /api/v1/dav?operation=comparison&state_a=29&state_b=21&metric=flood_event_count&start_year=2007&end_year=2016` | nA=nB=10, meanA10.7, meanB2.6, pooled SD≈3.789605667, df18, t≈4.779428840, p≈.000149985784; reject **under explicitly unverified model assumptions**. Original comparison fields equal `/compare`. |
| Same comparison request with `metric=rainfall_annual_total` | Current-data422, no daily-rainfall substitute. Frontend unsupported selection does not issue the calculation. |
| `GET /api/v1/dav?operation=correlations&state_id=29&start_year=2007&end_year=2016` | Five labels, rainfall/drought cells unavailable with exact scope reasons, supported annual pairwise n≤10. Validate every available r and point list against Pandas on independently selected matching rows; no diagonal1 for unavailable variables. |
| `GET /api/v1/dav?operation=counts&state_id=29&start_year=2007&end_year=2016` | Summed flood rows equal complete catalog selection and `/compare` State A total**107**, not paginated total; exercise all-states/unassigned and coverage-null edges too. |
| `GET /api/v1/dav?operation=audit&dataset=rainfall&state_id=29&start_year=2026&end_year=2026` | Prepared scope74 rows, measurement missing0; no undeclared mm. Other columns' missingness comes from actual records; scope is prepared-only. |
| Cyclone `operation=relationship` for selected storm | Use Fani **`2019116N02090`** when present; otherwise first actual storm with ≥3 complete nonconstant wind/pressure pairs. Every pair has identical timestamp/storm and declared units. No injected live fixture; verify missing-pair exclusions and mixed-unit rejection. |

Compare all six operation payloads/metadata with their selection rules. If prepared data legitimately changes, independently compute expected selected-record values with Pandas/SciPy, record the new baseline and keep product logic data-driven. Stale baselines are not a reason to modify observations.

### Actual browser proof: required for UI acceptance

From `frontend/`, start existing Vite alongside the real API:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Open a real Chromium tab at **`http://127.0.0.1:5173`**. The repository's `frontend/playwright.config.ts` documents real backend/Vite and desktop/mobile conventions; existing e2e configuration is context, not a requirement to add a UI suite. Do not substitute mocked UI tests for this proof.

1. **Atlas:** `#/overview?state_id=29&start_year=2026&end_year=2026`. Switch Trend/Distribution; inspect the two actual outlier dates/values in boxplot drawer and source table if baseline unchanged. Switching preserves n74/state/period/page height; date KPI remains visibly distinct from period histogram. At **1440×900**, map starts **no lower than y300**, is **≥400px tall** and ends **by y900**. Select a different state on map to exercise existing shared filters, and hover/focus without filter mutation. Audit/chart/table scope agrees.
2. **Comparison:** `#/comparison?state_a=29&state_b=21&metric=flood_event_count&start_year=2007&end_year=2016`. Traverse all4 views; values match API gates, same-axis spread and explicit year-pair scatter. Permanent Test caveats remain visible. Change state/period while Test open: no stale verdict while loading. Refresh retains valid selected view. Inspect unsupported annual rainfall without substitution/request; reset available defaults and confirm `dav_view` clears.
3. **Explorer:** Counts defaults to multiple decades without changing Records year. Set explicit ordered bounds; Count plot/GroupBy/Pivot have identical complete rows/totals; outside hazard coverage shows N/A, not0. Decade/hazard highlight cannot change sample. Return to Records and recover exact year. Repeat without state for all-states/unassigned. Check reversed/unsupported bounds selection error and catalog-default reset. Cyclone Relationship follows selected storm; temperature month/year/region selection changes distribution and audit identically, with annual-only rows excluded from selected month. National drought remains national.
4. **Insights:** Correlations replaces Findings; choose available cell, inspect labeled scatter pairs, Back without lost scope; unavailable rainfall/drought cells show exact reasons. Scope change clears selected pair; evidence-chain links resolve actual cited source IDs and existing report action. Reset clears `dav_view`; hover never filters.
5. **View-state edges across pages/lenses:** carry incompatible `dav_view` through navigation/hazard switch and confirm appropriate default; view switches preserve geography/period/metric, and refresh preserves valid view. Explicit reset alone clears view/default scope as specified, not ordinary tab activation.
6. **Responsive/accessibility/theme proof:** repeat scenarios at **1024×768** and **390×844**, in **both themes** (also inspect1440×900 in both). Require zero document horizontal overflow, readable tooltips/table labels, source and derived tables internally scrollable, stacked narrow rail, no tiny forced-height mobile map. Measure4.5:1 body and3:1 meaningful nontext contrast,44px touch actions, label/line/shape alternatives to color. Check focusable outliers/cells, tab/arrow/Home/End behavior, selected tab remaining selected, Escape/focus return, direct-backdrop-only close, underlying navigation/assistant inert during modal, persistent mobile Close and internal modal scroll. Respect reduced motion and stable layout with no repeated from-zero animation.
7. **Capture and critique:** screenshots of **Atlas Distribution**, **Comparison Test** and **matrix**, with viewport/theme noted. Critique specifically against climate evidence hierarchy, map prominence, scope legibility and absence of ornament/card-wall/false-performance cues, then close browser tab afterward. Record observed behavior and measured failures/fixes, not invented screenshot evidence.

Run existing frontend checks **once after integration**, from `frontend/`:

```powershell
npm run typecheck
npm test
```

These are existing package scripts (`tsc --noEmit`, `vitest run`). Expected: exit0 and passing relevant behavior regressions; do not invent test totals. Keep existing frontend/backend map geometry, null handling and plugin-summary tests intentionally unchanged unless their actual behavior contract changes. Extend only uncertain selection/request/null/error edges, not source-text/wiring or arbitrary visual wording. Neither typecheck/unit success nor the existing `npm run test:e2e` script substitutes for real-browser proof. No command here is claimed executed in this planning session.

## Three-minute pitch hooks

These preserve the original proposed walkthrough, **not promised task durations or a brochure-verified timing rule**.

1. **Explain this outlier (0:00–0:55):** select Karnataka in Atlas, Trend → Distribution, open boxplot in drawer. Focus flagged observation: actual date/value, Q1/Q3, IQR, numeric fences and exact flagging inequality. If sample has no outlier, show **“0 observations outside the fences”**, never manufacture drama.
2. **The assumption-aware verdict (0:55–1:50):** Karnataka (`29`) versus Odisha (`21`), documented flood counts2007–2016, Spread → Test. Show H₀/H₁, sample n, pooled SD, df, p and precise decision with visible count-data/independence/equal-variance/reporting limitations. This is a live-data model calculation, not validated climate-policy evidence; do not promise significance.
3. **Trace the decision (1:50–3:00):** actual insight's evidence chain and quality audit, source records → summary → supported interpretation → proposed decision → proposed action. Finish at honest missing correlation cells: explaining why a result is unavailable demonstrates veracity, not an incomplete demo. Decisions/actions remain advisory and the existing report export is the actual action.

## Whole-deliverable acceptance and contingencies

- All four pages/six operations, generated contracts, exact scientific rules and same-sample source/derived evidence satisfy the gates above; preserve other routes and original plan.
- Fully populated five-variable matrix/annual-rainfall test remain impossible where unsupported: prerequisite explanations are specified final behavior, not placeholders.
- Supplied data is provider/workbook-declared, not independently authenticated. If a dataset disappears/fails validation, use existing errors and keep supported lenses usable; never sample-data fallback.
- Degenerate test samples stay unavailable, never substitute a different test. Legitimate data changes update independent expectations, not product hardcodes or observations.
- Complete syllabus/pitch coverage stays on demand. Record only exercised verification in existing docs; this session claims planning only.
