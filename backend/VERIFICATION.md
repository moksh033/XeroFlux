# Executed backend verification

## DAV continuation — 2026-11-10

Prepared data was not regenerated or replaced. OpenAPI export and `npm.cmd run generate:api` both completed; generated types include `/api/v1/dav`.

### Executed checks

- From `backend/`, with `CLIMATELENS_REAL_DATA_TESTS=1`: `.venv/Scripts/python.exe -m pytest tests/test_dav.py tests/test_nielytics_adapter.py tests/test_real_data.py` collected 99 cases: 98 passed and one new Kelly expectation failed. The fixture's linear P90 is 9.6, not 8.2; its expectation was corrected without changing the estimator. The targeted rerun `tests/test_dav.py::test_distribution_preserves_linear_quantiles_iqr_and_literal_sturges` passed. All three opt-in real-data cases ran, not skipped.
- The root-directory form of that pytest command failed collection because `app` was not importable. Use the documented backend working directory; no import-path workaround was added.
- From `frontend/`: `npm.cmd test` reported 53 passed and one existing reset test failed on an incidental, now-ambiguous text query. Removed that assertion, retaining filter-reset/theme-preservation assertions. `npm.cmd test -- src/test/App.test.tsx` then passed all four cases. The Comparison DAV behavior regressions passed in the integrated run.
- `npm.cmd run typecheck` initially exposed shared selectors incorrectly typed as full `DAVQuery`; they now use `Omit<DAVQuery, 'operation'>`. Typechecking passed after that correction and again after the syllabus catalog-count integration.
- Starlette/httpx deprecation and upstream NumPy empty-slice warnings remained visible; neither was suppressed. No build, lint, new e2e suite, or unrelated full backend suite is claimed.

### Actual HTTP and independent numerical proof

A throwaway in-memory Python/httpx/Pandas/SciPy calculation called the running Uvicorn API and independently selected the supplied Parquet observations. All six operations returned finite JSON/null fields and passed assertions; the script was not installed in the product.

| Actual selection | Observed and independently checked |
| --- | --- |
| Karnataka rainfall, 2026 | n=74, k=8, mean=2.616216216216216; outliers 12.8 on October 24 and 10.8 on October 25; unit null. Quantiles, sample variance/SD and histogram totals matched source values. |
| Karnataka/Odisha flood counts, 2007–2016 | Embedded comparison exactly equals `/compare`; source totals 107/26. Pooled SD=3.7896056669673577, t=4.779428840215608, df=18, p=0.00014998578402922603 match SciPy's equal-variance calculation. Model assumptions remain explicitly unverified. |
| Unsupported annual rainfall comparison | HTTP 422 `UNSUPPORTED_ANALYSIS`; no daily-rainfall substitute. |
| Karnataka annual correlations, 2007–2016 | Five labels; nine available ordered cells matched independently year-aligned Pandas correlations and exact point pairs. Rainfall/drought cells, including their diagonals, remained unavailable. |
| Complete catalog Counts | Karnataka flood sum 107 for 2007–2016. All-state/unassigned 1967–2023 dated totals: floods 6,856; landslides 1,265. Undated exclusions matched complete source tables; absent landslide coverage remained null. |
| Rainfall audit | 74 prepared rows; each column's missing count matched `isna().sum()` on the selected source table. |
| Fani `2019116N02090` | 62 complete same-storm wind/pressure pairs, 9 incomplete observations excluded; exact source pair values and units `kts`/`mb` matched. |
| Temperature/drought | Exact Karnataka 2007–2016 and national drought 2021–2026 distribution n matched audit rows. Annual-only temperature queried for April returned complete `no_data` metadata, not annual-row substitution. |

### Atlas and Explorer browser proof

Actual Chromium used the real API/Vite servers, without fixture responses. At 1440×900, 1024×768 and 390×844 in both themes, Atlas and Explorer Counts had zero document horizontal overflow. Final Atlas analysis slot is 280px; Explorer analytical body is 360px. All visible main-page scope actions, selects and buttons measured at least 44px in both dimensions. Mobile tables scroll internally (Counts table: 342px viewport / 440px content).

- Final Atlas map at 1440×900: y=293.046875, height=580, bottom=873.046875 in both themes. At 1024×768 map height=468; at 390×844 height=400. The mobile map was not shrunk to a chart-sized box.
- Trend/Distribution initially changed page height by 208px; the state analysis now has one scrollable 280px slot. Final page height stayed 1,494px across both views; map geometry stayed unchanged. Refresh retained Distribution.
- Changing the recorded date retained distribution n=74. A real map click selected Maharashtra (`27`) through shared filters; returning to Karnataka preserved the expected sample. Hover did not mutate the URL.
- Source rows displayed both outlier dates/values. Keyboard Tab reached the SVG outlier and disclosed its identity and exact `12.8 > Q3 + 1.5×IQR = 10.4875` inequality. Responsive outlier hit rectangles measured 44×44 CSS pixels, including mobile.
- Native drawer measured 480×900 desktop and 390×844 mobile, with initial Close focus, internal content scroll, Escape/opener return, inside-click retention and direct-backdrop close. Reduced-motion view animation computed to `none`.
- Quality audit displayed the same 74 rainfall rows and 10 selected Karnataka temperature rows. Platform & syllabus displayed actual catalog volumes, including rainfall 2,664 and tracks 57,880.
- Explorer Counts GroupBy/Pivot showed identical rows, retained Records year 2010, preserved counts under decade highlighting, rendered coverage-null as N/A, and rejected reversed bounds. Explicit defaults reset cleared `dav_view`. The bounded Karnataka flood rows summed 107; all-state/unassigned 2007–2016 flood rows were 358+800 and landslide rows 182+1,083.
- Explorer rainfall supports n=74 Distribution; incompatible carried-over `dav_view=counts` fell back to Trend without rewriting the URL. Temperature's annual-only April selection showed a selection error without substituting annual rows. National drought showed n=6 with national scope. Fani showed n=62 relationships while retaining all 71 source observations.

Screenshot: `frontend/test-results/dav-atlas-distribution-light-1440.png` (ignored generated evidence). Visual critique: map remains the dominant surface; the period/date distinction is explicit, and statistical detail scrolls inside the narrow evidence rail rather than creating a chart/card wall. The existing basemap is preserved, not newly acquired by this feature.

### Comparison and Insights browser proof

The separate real-Chromium acceptance tab traversed all four Comparison views and both Insights views at all three viewports in both themes, then closed.

- Trend issued `/compare` only; Spread issued DAV comparison only. Spread used one numeric axis, with source-identified Karnataka 2012 outlier `2 < lower fence 2.25`. Relationship exposed all ten year pairs, including 2012 `(2,0)`, fitted values and residuals.
- Real requests were delayed while changing state and period: loading immediately replaced the old verdict. Refresh retained Test. Unsupported annual rainfall issued neither `/dav` nor `/compare`; explicit reset cleared `dav_view`.
- Matrix off-diagonal values matched the API: floods/landslides r=−0.12415164297872668, temperature/floods 0.07181267278778222, temperature/landslides 0.34959814552431234, each n=10. Unavailable rainfall/drought diagonals showed exact prerequisite reasons.
- Enter on a supported cell opened ten labeled pairs and focused Back; Back restored the originating cell's focus without changing scope. Hover did not filter; state change cleared the selected pair. Refresh retained Correlations; incompatible views defaulted to Findings; reset cleared `dav_view`.
- Evidence chain `event-insight:29:2007:2016:0` showed its 138 observations, actual calculation, floods/landslides source IDs and specified advisory decision/action. Both source links resolved Sources. Prepared audits returned floods 107 / landslides 31; Comparison A/B audits returned 107/26 underlying source records, distinct from annual n=10.
- The actual report action downloaded a 72,711-byte PDF; extracted text confirmed Karnataka 29 and 2007–2016. PDF proof here is download/content extraction, not visual PDF pagination review.
- Final document overflow was zero; analytical bodies measured 360px. Scope, Compare/reset/Explain/report/theme actions and tabs measured ≥44px; matrix cells were 52px high and 86px wide on mobile. Internal scroll widths/client widths: model table 440/342px, annual table 516/356px, matrix 560/342px, pair table 440/342px.
- Measured minimum body contrast: light 5.443:1 / dark 7.155:1; primary text 6.332/7.786; matrix number backing 13.755/14.204. Control borders 5.875/6.396, selected border ≥5.068, matrix boundaries ≥5.443. Comparison marks A 4.789/7.250, B 5.280/9.985, outlier 5.823/6.849. Initial low-contrast primary text/control borders were corrected before these measurements.
- Home/End/arrows, selected-tab retention, modal initial focus/Escape/return/direct-backdrop behavior passed. Native modal prevented navigation/assistant focus. Mobile Close stayed at `(317.91,12)`, 56.09×44px after scrolling its 775px content viewport over 2,362px of content. Explicit transitions were opacity-only 150ms, with no continuing animation; reduced motion computed to none.

Persistent screenshots under `frontend/test-results/`: `dav-comparison-test-*`, `dav-comparison-test-result-*`, and `dav-insights-matrix-*`, each for `{1440x900,1024x768,390x844}-{light,dark}.png`. The parent also opened the actual desktop result and mobile matrix images. Scope/method hierarchy and the permanent model caveat remain clear; N/A is visibly hatched, numbers have readable neutral backing, and dense mobile tables use internal scrolling rather than a second canvas or false-performance decoration. Reaching the verdict or matrix legend requires intentional internal scrolling in the specified fixed-height body.

## Historical backend integration record

The execution evidence below predates the DAV implementation and later prepared-data declarations. It is retained as historical evidence, not a rerun or proof of current DAV behavior. No DAV checks are claimed here. Current declarations and commands are in `README.md` / `INTEGRATION.md`; the integration owner records newly exercised numerical/API/frontend/browser results separately after running them.

### Environment / commands (historical)

Python 3.12 virtual environment; FastAPI 0.162.0, Pydantic 2.14.3, Pandas 2.3.3, PyArrow 23.0.1, pyproj 3.8.0, NIElytics 0.2.0.dev1 at pinned upstream revision `ebb751664d92ce11a6751d2d933a9c2282de0c83`.

From `backend/`, executed successfully during that earlier backend integration:

```powershell
.venv/Scripts/python.exe prepare_workbook.py --workbook "../XeroFlux Dataset.xlsx" --output ../data/processed
.venv/Scripts/python.exe prepare_boundaries.py --archive ../data/raw/state_nwic_geojson.zip --output ../data/processed
.venv/Scripts/python.exe -c "import os,pytest; os.environ['CLIMATELENS_REAL_DATA_TESTS']='1'; raise SystemExit(pytest.main(['-q','-rs']))"
.venv/Scripts/python.exe export_openapi.py
```

Historical final test run: **246 passed, 2 skipped**, 14.93 seconds. The two skipped cases required symlink privileges unavailable to this Windows account. One upstream Starlette/httpx TestClient deprecation warning remained; it was not suppressed. Three opt-in tests read the then-prepared local source datasets and validated official geometry/catalog matching, source cyclone chronology/units, actual NIElytics event counts and readable report evidence. Other tests used isolated explicitly synthetic fixtures, never production fallbacks. These totals do not describe the new DAV tests.

The contract exporter generated `contracts/openapi.yaml` for that historical application. No frontend tests were rerun or frontend files changed during that backend work. Endpoint counts are not a current contract guarantee.

### Real data preparation observed (historical)

| Prepared collection | Rows/features | Available observed period |
| --- | ---: | --- |
| State attributes | 36 | Static attributes, vintage not inferred |
| Official boundary features | 36 | Static geometry, vintage not inferred |
| Daily actual rainfall | 1,998 | 2026-08-19 through 2026-11-01 |
| Reported flood records | 6,876 | 1967-07-02 through 2023-09-12 |
| Reported landslide records | 1,265 | 2007-03-12 through 2016-10-17 |
| NI cyclone catalog | 1,860 | Source seasons 1842–2026, not continuous coverage |
| NI track observations | 57,880 | 1842-10-25 through 2026-10-29 |

These are the records observed during that earlier preparation, not the current catalog snapshot or counts of unique disasters, reporting completeness, Indian landfalls or risk. At that time not all raw rainfall rows mapped through exact normalized state labels. The current prepared manifest now declares **2,664 rainfall rows**, regional annual summer maximum temperature **1967–2024 in °C**, national annual drought-area percentage **2021–2026**, and advertised `flood_event_count` / `landslide_event_count` comparisons. Those current declarations are not newly executed verification results. Daily rainfall units remain null; annual rainfall remains unsupported. Refer to current metadata rather than stale omissions in historical processing reports.

The official NWIC archive was fetched explicitly from its workbook-declared HTTPS URL (20,809,092 bytes); this is not a startup download. Its actual CRS is EPSG:7755. Full polygons were transformed to EPSG:4326 with longitude-first coordinates. All 36 features match verified catalog IDs; no outline was invented, simplified or substituted.

### Actual HTTP smoke (historical)

Launched a real Uvicorn process on `127.0.0.1:8000`, made HTTP requests using httpx, then terminated the process after verification. This was not a TestClient-only claim. The tool's named-service supervisor failed on this Windows machine because it attempted unavailable WSL `/bin/bash`; a directly launched Python/Uvicorn process worked. The issue was reported to the tool harness.

| Actual request | Observed result |
| --- | --- |
| `/api/v1/health` | 200; manifest ready, analytics configured |
| `/api/v1/metadata`, `/sources`, `/states` | 200; seven source entries and 36 states/UT entries |
| `/api/v1/boundaries` | 200; 36 complete official features, cache header |
| `/api/v1/map/rainfall?year=2026&observation_date=2026-08-19` | 200; 27 state observations for that date, unit null |
| `/api/v1/trends/rainfall?state_id=02&start_year=2026&end_year=2026` | 200; actual dated records |
| `/api/v1/events/floods?year=2010&limit=2&offset=1` | 200; paginated records |
| `/api/v1/events/landslides?year=2010&limit=2&offset=1` | 200; paginated records |
| `/api/v1/cyclones?year=2019` | 200; actual recorded storms, including FANI |
| `/api/v1/cyclones/2019116N02090/track` | 200; 71 Fani observations, 2019-04-25T18:00:00Z through 2019-05-04T12:00:00Z |
| `/api/v1/insights?state_id=29&start_year=2007&end_year=2023` | 200; actual NIElytics regional aggregation followed by InsightEngine finding |
| `/api/v1/multi-hazard?state_id=29&start_year=2007&end_year=2023` | 200; one catalog-overlap relationship, explicitly not temporal causation |
| `/api/v1/reports/state/29?start_year=2007&end_year=2023&format=pdf` | 200; 112,164-byte, 50-page PDF parsed by pypdf, Karnataka evidence text found |
| `/api/v1/trends/drought` | Historical expected 503 DATASET_UNAVAILABLE under the earlier declarations; not the current prepared national series |
| `/api/v1/trends/temperature?region=India` | Historical expected 503 DATASET_UNAVAILABLE under the earlier declarations; not the current prepared annual summer-maximum series |
| `/api/v1/compare?state_a=29&state_b=21&metric=rainfall_annual_total&start_year=2019&end_year=2019` | Expected 422 UNSUPPORTED_METRIC; no validated annual/common coverage declared |

PDF validation in that backend task was structural parsing and extracted-content verification, not visual PDF-viewer inspection. Frontend map rendering/playback was not part of that historical backend verification; earlier connected-browser coverage is described in `../frontend/README.md` and does not verify the new DAV surfaces.

### Failures fixed during verification (historical)

- Source-reference parsing incorrectly treated an HTTP URL on the next line as a new label; corrected and covered by preparation tests.
- Same-size manifest updates inside one filesystem clock tick could reuse stale declarations; cache identity now includes small-manifest content, with deterministic regression coverage.
- Pandas converted nullable Parquet integer event years into floats, causing strict validation failures on actual records; Arrow-backed nullable reads now preserve source integer/null types, covered by a real Parquet regression.
- The event analytics adapter initially required state-resolution metadata even for point-event records carrying explicit verified state IDs; it now permits source-assigned point events, excludes missing assignments and discloses aggregation scope. National estimates remain rejected.
- Boundary preparation initially left the map capability falsely disabled; publication now updates capabilities and resolves only the boundary omission without clearing unrelated limitations.

### Judge / frontend handoff (historical)

1. Start the backend with the README command; inspect `/docs` and `/api/v1/metadata`.
2. Fetch official boundaries and a returned rainfall observation date. Show actual daily values without implying an annual total or unverified units.
3. List 2019 storms; select FANI ID `2019116N02090`; replay its 71 source timestamps in the frontend.
4. Select Karnataka ID `29`, period 2007–2023; display the actual event insight and returned method/source/limitations.
5. Open the multi-hazard result as period-wide catalog overlap, not simultaneous hazard causation.
6. Download the state evidence PDF through the actual endpoint.
7. At that time annual comparison/drought/regional-temperature controls were disabled. This is historical handoff advice, superseded for national drought, annual regional temperature and advertised documented-count comparisons by the current manifest. Annual rainfall remains unsupported; no fake demo is provided.

Historical dependency consistency: `.venv/Scripts/python.exe -m pip check` completed with `No broken requirements found.`
