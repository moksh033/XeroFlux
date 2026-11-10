import { useEffect, useState } from 'react';
import { Droplets, Mountain, Thermometer, Waves, Wind } from 'lucide-react';
import { useApi } from '../api/client';
import type { DAVQuery, Metadata } from '../api/types';
import { AnalysisTabs, CountPanel, DistributionDetails, DistributionPanel, RelationshipPanel } from '../components/DAVPanels';
import { AnalysisDrawer } from '../components/AnalysisDrawer';
import { AnalysisExplanation } from '../components/AnalysisExplanation';
import { QueryState, ReportDownload, TrendChart } from '../components/DataPanels';
import { KpiCard, SlicerRibbon } from '../components/Executive';
import IndiaMap from '../components/IndiaMap';
import { defaultStateId, useFilters } from '../hooks/useFilters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const lenses = [
  { id: 'floods', label: 'Floods', Icon: Waves, scope: 'Documented events, not measured hazard risk.' },
  { id: 'heat', label: 'Heat', Icon: Thermometer, scope: 'Regional temperature observations, not state heat-wave days.' },
  { id: 'drought', label: 'Drought', Icon: Droplets, scope: 'National observations only; no state estimates.' },
  { id: 'landslides', label: 'Landslides', Icon: Mountain, scope: 'Documented events, not measured hazard risk.' },
  { id: 'cyclones', label: 'Cyclones', Icon: Wind, scope: 'Observed basin tracks, not state exposure or forecasts.' },
] as const;

/** View filters and DAV requests share the exact returned source selection. */
function ReturnedSeries({ rows, meta, title, allowMonths, dataset, region }: { rows: { year: number; month?: number | null; value: number }[]; meta: Metadata; title: string; allowMonths: boolean; dataset: 'temperature' | 'drought'; region?: string }) {
  const { filters, setFilters } = useFilters();
  const [explainOpen, setExplainOpen] = useState(false);
  const view = filters.get('dav_view') === 'distribution' ? 'distribution' : 'trend';
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
  const months = allowMonths ? [...new Set(rows.flatMap((row) => row.month != null && Number.isInteger(row.month) && row.month >= 1 && row.month <= 12 ? [row.month] : []))].sort((a, b) => a - b) : [];
  const rawStart = filters.get('start_year');
  const rawEnd = filters.get('end_year');
  const rawMonth = allowMonths ? filters.get('month') : null;
  const start = rawStart === null ? years[0] : Number(rawStart);
  const end = rawEnd === null ? years.at(-1) : Number(rawEnd);
  const month = rawMonth === null ? undefined : Number(rawMonth);
  const valid = start !== undefined && end !== undefined && years.includes(start) && years.includes(end) && start <= end && (month === undefined || months.includes(month));
  const withinYears = rows.filter((row) => start !== undefined && end !== undefined && row.year >= start && row.year <= end).sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0));
  const visible = withinYears.filter((row) => month === undefined || row.month === month);
  const yearOnly = month === undefined ? [] : withinYears.filter((row) => row.month == null);
  const chartRows = visible.map((row) => ({ label: row.month == null ? String(row.year) : `${row.year}-${String(row.month).padStart(2, '0')}`, value: row.value }));
  const latest = visible.at(-1);
  const selection: Omit<DAVQuery, 'operation'> = { dataset, ...(dataset === 'temperature' ? { region, month } : {}), start_year: start, end_year: end };
  const distribution = useApi('/api/v1/dav', { operation: 'distribution', ...selection }, undefined, valid && (view === 'distribution' || explainOpen));
  const distributionData = distribution.data?.data?.kind === 'distribution' ? distribution.data.data : undefined;
  const selectionLabel = `${dataset === 'temperature' ? region : 'National drought'}; ${start}–${end}${month === undefined ? '' : `; month ${month}`}`;
  return <>
    <div className="filter-row temporal-view-filters">
      <div><label htmlFor="returned-start">View start year</label><select id="returned-start" value={rawStart ?? ''} onChange={(event) => setFilters({ start_year: event.target.value || undefined })}><option value="">First returned year</option>{rawStart !== null && !years.includes(Number(rawStart)) && <option value={rawStart}>Unsupported selection: {rawStart}</option>}{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>
      <div><label htmlFor="returned-end">View end year</label><select id="returned-end" value={rawEnd ?? ''} onChange={(event) => setFilters({ end_year: event.target.value || undefined })}><option value="">Last returned year</option>{rawEnd !== null && !years.includes(Number(rawEnd)) && <option value={rawEnd}>Unsupported selection: {rawEnd}</option>}{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>
      {months.length > 0 && <div><label htmlFor="returned-month">Returned observation month</label><select id="returned-month" value={rawMonth ?? ''} onChange={(event) => setFilters({ month: event.target.value || undefined })}><option value="">All returned months</option>{rawMonth !== null && !months.includes(Number(rawMonth)) && <option value={rawMonth}>Unsupported selection: {rawMonth}</option>}{months.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>}
    </div>
    {!valid ? <p role="alert">Choose returned year bounds with the start no later than the end, and a supplied month if applicable.</p> : <>
      <div className="dav-workbench explorer-series-canvas" data-hazard={dataset === 'temperature' ? 'heat' : 'drought'}>
        <div className="filter-row"><h3>{title}</h3><button className="button" type="button" onClick={() => setExplainOpen(true)}>Explain this analysis</button></div>
        <AnalysisTabs label={`${title} view`} options={[{ id: 'trend', label: 'Trend' }, { id: 'distribution', label: 'Distribution' }]} value={view} onChange={(dav_view) => setFilters({ dav_view })}>
          {view === 'trend' ? <div className="dav-body">{visible.length ? <TrendChart title={title} rows={chartRows} unit={meta.unit} /> : <p role="status">No observations in this view. This is not measured zero.</p>}</div> : <QueryState query={distribution} empty={distribution.data?.status === 'no_data'}>
            {distributionData && <DistributionPanel data={distributionData} meta={distribution.data?.meta} title={title} unit={meta.unit} color={dataset === 'temperature' ? 'var(--heat)' : 'var(--drought)'} />}
          </QueryState>}
        </AnalysisTabs>
      </div>
      <details><summary>Selected source observations</summary><div className="table-scroll"><table><caption>{selectionLabel}; source rows, not aggregated</caption><thead><tr><th scope="col">Source year / month</th><th scope="col">Value · {meta.unit ?? 'Unit not declared'}</th></tr></thead><tbody>{visible.map((row, index) => <tr key={`${row.year}-${row.month ?? 'annual'}-${index}`}><th scope="row">{row.month == null ? row.year : `${row.year}-${String(row.month).padStart(2, '0')}`}</th><td>{row.value ?? 'Unavailable'}</td></tr>)}</tbody></table></div></details>
      {yearOnly.length > 0 && <div className="table-scroll"><table><caption>Year-only records have no month and are not part of the selected month view</caption><thead><tr><th scope="col">Source year</th><th scope="col">Value · {meta.unit ?? 'Unit not declared'}</th></tr></thead><tbody>{yearOnly.map((row, index) => <tr key={`${row.year}-${index}`}><td>{row.year}</td><td>{row.value ?? 'Unavailable'}</td></tr>)}</tbody></table></div>}
    </>}
    {latest && <p className="muted">{visible.length} observations · latest {latest.value} {meta.unit ?? '(unit not declared)'}. Missing is not zero.</p>}
    <AnalysisDrawer open={explainOpen} onClose={() => setExplainOpen(false)} title={`Explain ${title}`}>
      <AnalysisExplanation selectionLabel={selectionLabel} meta={valid ? distribution.data?.meta : undefined}
        interpretation={<>{valid && <QueryState query={distribution} empty={distribution.data?.status === 'no_data'}>{distributionData && <DistributionDetails data={distributionData} unit={meta.unit} title={title} color={dataset === 'temperature' ? 'var(--heat)' : 'var(--drought)'} />}</QueryState>}</>}
        calculation={null}
        auditSources={valid ? [{ id: dataset, label: dataset === 'temperature' ? `Temperature · ${region}` : 'National drought', query: { operation: 'audit', ...selection } }] : []} />
    </AnalysisDrawer>
  </>;
}

export default function Explorer() {
  const { filters } = useFilters();
  const legacyRainfall = filters.get('hazard') === 'rainfall';
  const query = filters.toString();
  useEffect(() => {
    if (!legacyRainfall) return;
    const next = new URLSearchParams(query);
    for (const key of ['offset', 'storm_id', 'region', 'month']) next.delete(key);
    window.location.replace(`#/overview?${next.toString()}`);
  }, [legacyRainfall, query]);
  return legacyRainfall ? <p role="status">Opening rainfall in Overview…</p> : <HazardExplorer />;
}

function HazardExplorer() {
  const { filters, setFilters } = useFilters();
  const active = lenses.find((lens) => lens.id === filters.get('hazard')) ?? lenses[0];
  const [explainOpen, setExplainOpen] = useState(false);
  const [highlightDecade, setHighlightDecade] = useState<string | null | undefined>(undefined);
  const rawView = filters.get('dav_view');
  const viewOptions = active.id === 'floods' || active.id === 'landslides'
    ? [{ id: 'counts', label: 'Counts' }, { id: 'records', label: 'Records' }]
    : active.id === 'cyclones' ? [{ id: 'track', label: 'Track' }, { id: 'relationship', label: 'Relationship' }]
      : [{ id: 'trend', label: 'Trend' }, { id: 'distribution', label: 'Distribution' }];
  const view = viewOptions.some((option) => option.id === rawView) ? rawView! : viewOptions[0].id;
  useEffect(() => { setExplainOpen(false); }, [active.id]);
  const metadata = useApi('/api/v1/metadata');
  const states = useApi('/api/v1/states');
  const catalog = metadata.data?.data;
  const dataset = active.id === 'heat' ? 'temperature' : active.id;
  const years = [...(catalog?.capabilities.available_years?.[dataset] ?? [])].sort((a, b) => a - b);
  const requestedYear = Number(filters.get('year'));
  const year = years.includes(requestedYear) ? requestedYear : years.at(-1);
  const stateRows = states.data?.data ?? [];
  const requestedState = filters.get('state_id');
  const stateSelection = requestedState ?? defaultStateId(stateRows);
  const selectedState = stateSelection === 'all' ? '' : stateSelection;
  const stateName = stateRows.find((state) => state.state_id === selectedState)?.name;
  const mapVisible = active.id !== 'heat' && active.id !== 'drought';
  const eventLens = active.id === 'floods' || active.id === 'landslides';
  const countsView = eventLens && view === 'counts';
  const relationshipView = active.id === 'cyclones' && view === 'relationship';
  const countYears = [...new Set([...(catalog?.capabilities.available_years?.floods ?? []), ...(catalog?.capabilities.available_years?.landslides ?? [])])].sort((a, b) => a - b);
  const countStart = filters.has('start_year') ? Number(filters.get('start_year')) : countYears[0];
  const countEnd = filters.has('end_year') ? Number(filters.get('end_year')) : countYears.at(-1);
  const validCountPeriod = countStart !== undefined && countEnd !== undefined && Number.isInteger(countStart) && Number.isInteger(countEnd) && countStart >= (countYears[0] ?? Infinity) && countEnd <= (countYears.at(-1) ?? -Infinity) && countStart <= countEnd;
  const counts = useApi('/api/v1/dav', { operation: 'counts', state_id: selectedState || undefined, start_year: countStart, end_year: countEnd }, undefined, countsView && validCountPeriod && (stateSelection === 'all' || !!selectedState));
  const countsData = counts.data?.data?.kind === 'counts' ? counts.data.data : undefined;
  const parsedOffset = Number(filters.get('offset') ?? 0);
  const offset = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const identity = JSON.stringify({ hazard: active.id, year, selectedState, offset, stormId: filters.get('storm_id') ?? '' });
  const settledIdentity = useDebouncedValue(identity);
  const settled = JSON.parse(settledIdentity) as { hazard: string; year?: number; selectedState: string; offset: number; stormId: string };
  const updating = identity !== settledIdentity;
  const scopeReady = active.id === settled.hazard;
  const boundaries = useApi('/api/v1/boundaries', undefined, undefined, mapVisible);
  const events = useApi(active.id === 'landslides' ? '/api/v1/events/landslides' : '/api/v1/events/floods', { state_id: settled.selectedState || undefined, year: settled.year, limit: 100, offset: settled.offset }, undefined, scopeReady && eventLens && !countsView && settled.year !== undefined && (stateSelection === 'all' || !!settled.selectedState));
  const storms = useApi('/api/v1/cyclones', { year: settled.year, limit: 100, offset: settled.offset }, undefined, scopeReady && active.id === 'cyclones' && settled.year !== undefined);
  const stormRows = storms.data?.data.items ?? [];
  const storm = settled.stormId ? stormRows.find((row) => row.storm_id === settled.stormId) : stormRows.find((row) => row.name.toLowerCase() === 'fani') ?? stormRows[0];
  const unavailableStorm = active.id === 'cyclones' && !!settled.stormId && !storms.isPending && !storms.error && !storm;
  const track = useApi('/api/v1/cyclones/{storm_id}/track', undefined, { storm_id: storm?.storm_id ?? '' }, scopeReady && active.id === 'cyclones' && !!storm);
  const trackRows = [...(track.data?.data ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const relationship = useApi('/api/v1/dav', { operation: 'relationship', dataset: 'tracks', storm_id: storm?.storm_id }, undefined, scopeReady && !updating && active.id === 'cyclones' && !!storm && (relationshipView || explainOpen));
  const relationshipData = relationship.data?.data?.kind === 'relationship' ? relationship.data.data : undefined;
  const region = filters.get('region')?.trim() ?? 'Karnataka';
  const temperature = useApi('/api/v1/trends/temperature', { region }, undefined, active.id === 'heat' && !!region);
  const drought = useApi('/api/v1/trends/drought', undefined, undefined, active.id === 'drought');
  const ribbonYears = countsView ? countYears : years;
  const decades = [...new Set(ribbonYears.map((value) => Math.floor(value / 10) * 10))].sort((a, b) => a - b);
  const recordsDecade = year !== undefined ? `${Math.floor(year / 10) * 10}s` : null;
  const activeDecade = countsView ? highlightDecade ?? null : recordsDecade;
  const decadeOptions = decades.map((decade) => ({
    id: `${decade}s`,
    label: `${decade}s`,
    count: ribbonYears.filter((value) => Math.floor(value / 10) * 10 === decade).length,
  }));
  const reportStartYear = countsView ? countStart : year;
  const reportEndYear = countsView ? countEnd : year;
  const selectState = (stateId: string) => setFilters({ state_id: stateId || 'all', offset: undefined });
  const link = (path: string, patch: Record<string, string | undefined> = {}) => {
    const query = new URLSearchParams(filters);
    if (selectedState) query.set('state_id', selectedState);
    for (const [key, value] of Object.entries(patch)) { if (value === undefined) query.delete(key); else query.set(key, value); }
    return `#/${path}?${query.toString()}`;
  };
  const page = active.id === 'cyclones' ? storms.data?.data : events.data?.data;
  const pagination = !updating && (eventLens || active.id === 'cyclones') && (page || offset > 0) ? <nav className="filter-row record-pagination" aria-label={`${active.label} pagination`}>
    <button className="button" type="button" disabled={offset === 0} onClick={() => setFilters({ offset: String(Math.max(0, offset - 100)), storm_id: undefined })}>Previous 100</button>
    <p aria-live="polite">{page?.total ? page.items.length ? `${page.offset + 1}–${Math.min(page.offset + page.items.length, page.total)} of ${page.total}` : `No records on this page; ${page.total} matching records` : 'No matching records'}</p>
    <button className="button" type="button" disabled={!page || page.offset + page.limit >= page.total} onClick={() => setFilters({ offset: String(offset + 100), storm_id: undefined })}>Next 100</button>
  </nav> : null;
  const auditStart = countsView ? countStart : year;
  const auditEnd = countsView ? countEnd : year;
  const eventAuditSources = (countsView ? ['floods', 'landslides'] as const : [active.id === 'landslides' ? 'landslides' : 'floods'] as const).map((source) => ({
    id: source, label: `${source === 'floods' ? 'Flood' : 'Landslide'} prepared records`,
    query: { operation: 'audit', dataset: source, state_id: selectedState || undefined, start_year: auditStart, end_year: auditEnd } satisfies DAVQuery,
  }));

  return <div className="explorer-page">
    <header className="page-heading"><h1>Disaster explorer</h1></header>
    <nav className="lens-strip" aria-label="Hazard lenses">{lenses.map(({ id, label, Icon }) => {
      const key = id === 'heat' ? 'temperature' : id;
      const count = catalog?.datasets?.[key]?.observation_count;
      const keepCountScope = countsView && (id === 'floods' || id === 'landslides');
      return <a href={link('explorer', { hazard: id, offset: undefined, storm_id: undefined, ...(!keepCountScope ? { start_year: undefined, end_year: undefined } : {}), month: undefined })} key={id} aria-current={active.id === id ? 'page' : undefined}><Icon size={17} aria-hidden="true" /><span>{label}</span>{count !== undefined && <span className="slicer-count" aria-hidden="true">{count.toLocaleString()}</span>}</a>;
    })}</nav>
    <section className="explorer-scope" aria-labelledby="explorer-scope-title">
      <h2 id="explorer-scope-title">{active.label}</h2>
      <p className="muted">{active.scope}</p>
      {(metadata.isPending || metadata.error) && <QueryState query={metadata} />}
      {eventLens && (states.isPending || states.error) && <QueryState query={states} />}
      {mapVisible && decadeOptions.length > 0 && <div className="slicer-bar">
        <SlicerRibbon label={countsView ? 'Highlight decade (does not filter Counts)' : 'Decade (years with records)'} options={decadeOptions} value={activeDecade} onChange={(decadeId) => {
          if (countsView) { setHighlightDecade(decadeId); return; }
          if (!decadeId) { setFilters({ year: undefined, offset: undefined, storm_id: undefined }); return; }
          const matching = years.filter((value) => `${Math.floor(value / 10) * 10}s` === decadeId);
          if (matching.length) setFilters({ year: String(matching.at(-1)), offset: undefined, storm_id: undefined });
        }} />
      </div>}
      <div className="filter-row explorer-toolbar">
        {eventLens && <div><label htmlFor="explorer-state">State / union territory</label><select id="explorer-state" value={stateSelection} disabled={!stateRows.length} onChange={(event) => selectState(event.target.value)}>
          <option value="all">All catalog states / unassigned events</option>{!stateRows.length && <option value="">No states available</option>}{requestedState !== null && requestedState !== 'all' && !stateRows.some((state) => state.state_id === requestedState) && <option value={requestedState}>Unknown state: {requestedState || '(empty)'}</option>}{stateRows.map((state) => <option key={state.state_id} value={state.state_id}>{state.name}</option>)}
        </select></div>}
        {mapVisible && !countsView && <div><label htmlFor="explorer-year">Available observation year</label><select id="explorer-year" value={year ?? ''} disabled={!years.length} onChange={(event) => setFilters({ year: event.target.value, offset: undefined, storm_id: undefined })}>{!years.length && <option value="">No supported years</option>}{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>}
        {countsView && <><div><label htmlFor="counts-start">Catalog start year</label><input id="counts-start" type="number" min={countYears[0]} max={countYears.at(-1)} step="1" value={filters.get('start_year') ?? countStart ?? ''} onChange={(event) => setFilters({ start_year: event.target.value || undefined })} /></div><div><label htmlFor="counts-end">Catalog end year</label><input id="counts-end" type="number" min={countYears[0]} max={countYears.at(-1)} step="1" value={filters.get('end_year') ?? countEnd ?? ''} onChange={(event) => setFilters({ end_year: event.target.value || undefined })} /></div></>}
        <button className="button" type="button" onClick={() => { setHighlightDecade(undefined); setExplainOpen(false); setFilters({ state_id: undefined, year: undefined, start_year: undefined, end_year: undefined, month: undefined, storm_id: undefined, offset: undefined, region: undefined, dav_view: undefined }); }}>Reset scope</button>
      </div>
    </section>
    {mapVisible && <>
    {(eventLens || active.id === 'cyclones') && <div className="filter-row"><button className="button" type="button" onClick={() => setExplainOpen(true)}>Explain this analysis</button></div>}
    <AnalysisTabs label={`${active.label} analytical view`} options={viewOptions} value={view} onChange={(dav_view) => setFilters({ dav_view })}>
    {countsView && <section className="dav-workbench" aria-label="Complete catalog counts" data-hazard={active.id}>
      <h2>Flood and landslide counts</h2>
      <p className="muted">{selectedState ? stateName ?? selectedState : 'All catalog states, including unassigned events'} · {countStart}–{countEnd} · documented records by decade.</p>
      {!validCountPeriod ? <p role="alert">Choose supported catalog year bounds with the start no later than the end ({countYears[0]}–{countYears.at(-1)}).</p> : <QueryState query={counts} empty={counts.data?.status === 'no_data'}>{countsData && <CountPanel data={countsData} meta={counts.data?.meta} activeHazard={active.id === 'landslides' ? 'landslides' : 'floods'} activeDecade={activeDecade ? Number(activeDecade.slice(0, -1)) : undefined} />}</QueryState>}
      <p className="muted">Zero: no recorded events within coverage. N/A: no coverage. Neither measures hazard risk.</p>
    </section>}

    {mapVisible && !countsView && <div className={relationshipView ? 'dav-workbench' : 'explorer-workbench'}>
      {!relationshipView && <section className="map-stage" aria-label="Recorded locations" aria-busy={updating || (eventLens && events.isPending) || (active.id === 'cyclones' && (storms.isPending || track.isPending))}>
        <QueryState query={boundaries} empty={boundaries.data?.status === 'no_data'}>
          <IndiaMap boundaries={boundaries.data?.data} selectedState={eventLens ? selectedState || undefined : undefined} onSelect={eventLens ? selectState : undefined} showStateSelector={false} basemapHint={active.id === 'landslides' ? 'terrain' : undefined} points={!updating && eventLens ? events.data?.data.items : undefined} track={!updating && active.id === 'cyclones' ? trackRows : undefined} />
        </QueryState>
        {updating ? <p role="status">Updating filters…</p> : eventLens && <p className="muted">Current-page events with recorded coordinates.</p>}
      </section>}
      <section className="record-rail" aria-label="Recorded observations" aria-busy={updating}>
        {updating ? <p role="status">Updating filters…</p> : eventLens ? <>
          <h2>{active.label} · Recorded events</h2>
          {year !== undefined ? <QueryState query={events} empty={events.data?.status === 'no_data' || events.data?.data.items.length === 0}>
            <div className="kpi-grid">
              <KpiCard label={`${active.label} matching records`} value={events.data?.data.total ?? null} unit="matching records" badge={selectedState ? `${stateName ?? selectedState} · ${year}` : `All catalog states · ${year}`} />
            </div>
            <ol className="event-records" start={offset + 1}>{events.data?.data.items.map((event) => {
              const located = event.latitude != null && event.longitude != null && Number.isFinite(event.latitude) && Number.isFinite(event.longitude) && Math.abs(event.latitude) <= 90 && Math.abs(event.longitude) <= 180;
              return <li key={event.event_id}><h3>{event.event_id}</h3><p>{stateRows.find((state) => state.state_id === event.state_id)?.name ?? event.state_id ?? 'Not assigned'}</p><p>{event.timestamp ? <time dateTime={event.timestamp}>{event.timestamp}</time> : event.year ?? 'Source date not recorded'}</p><p>{located ? `Latitude: ${event.latitude}; longitude: ${event.longitude}` : 'Location not available'}</p><details><summary>Source attributes</summary>{Object.keys(event.attributes ?? {}).length ? <dl>{Object.entries(event.attributes ?? {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'string' ? value : JSON.stringify(value)}</dd></div>)}</dl> : <p>No source attributes supplied.</p>}</details></li>;
            })}</ol>
          </QueryState> : <p>The backend has not declared available years for this event family.</p>}
        </> : <>
          <h2>Cyclones · Observed tracks</h2>
          {year !== undefined ? <QueryState query={storms} empty={storms.data?.status === 'no_data' || stormRows.length === 0}>
            <div className="kpi-grid">
              <KpiCard label="Catalog storms" value={storms.data?.data.total ?? null} unit={`season ${year}`} badge={storm ? `${storm.name} · ${trackRows.length} track points` : undefined} />
            </div>
            <label htmlFor="explorer-storm">Storm from the returned year / page</label><select id="explorer-storm" value={storm?.storm_id ?? settled.stormId} onChange={(event) => setFilters({ storm_id: event.target.value })}>{unavailableStorm && <option value={settled.stormId}>Not in returned year / page: {settled.stormId}</option>}{stormRows.map((row) => <option key={row.storm_id} value={row.storm_id}>{row.name} · {row.year}</option>)}</select></QueryState> : <p>No supported cyclone years are available.</p>}
          {unavailableStorm && <p role="alert">The requested storm {settled.stormId} is not in this returned year / page. Choose a catalog storm or change the year / page; no other storm is substituted.</p>}
          {relationshipView && (storm ? <section data-hazard="cyclones">
            <h3>Wind / pressure · {storm.name}</h3>
            <p className="muted">Same-storm timestamp pairs; temporally dependent observations, not causation.</p>
            <QueryState query={relationship} empty={relationship.data?.status === 'no_data'}>{relationshipData && <RelationshipPanel data={relationshipData} meta={relationship.data?.meta} title={`${storm.name} · ${storm.storm_id}`} color="var(--cyclone)" />}</QueryState>
          </section> : <p role="status">Select a storm with recorded observations.</p>)}
          {!!storm && <QueryState query={track} empty={track.data?.status === 'no_data' || trackRows.length === 0}>
            <h3>{storm.name} · {storm.year}</h3><a className="button primary" href={link('time-machine', { hazard: 'cyclones', year: String(storm.year), storm_id: storm.storm_id, offset: undefined })}>Replay observations</a>
            <details><summary>Recorded positions and measurements</summary><div className="table-scroll"><table><thead><tr><th scope="col">Recorded timestamp</th><th scope="col">Latitude</th><th scope="col">Longitude</th><th scope="col">Wind</th><th scope="col">Pressure</th></tr></thead><tbody>{trackRows.map((row, index) => <tr key={`${row.timestamp}-${index}`}><th scope="row"><time dateTime={row.timestamp}>{row.timestamp}</time></th><td>{row.latitude}</td><td>{row.longitude}</td><td>{row.wind == null ? 'Not available' : `${row.wind} ${row.wind_unit ?? '(unit unspecified)'}`}</td><td>{row.pressure == null ? 'Not available' : `${row.pressure} ${row.pressure_unit ?? '(unit unspecified)'}`}</td></tr>)}</tbody></table></div></details>
          </QueryState>}
        </>}
        {pagination}
      </section>
    </div>}
    </AnalysisTabs>
    </>}
    {(eventLens || active.id === 'cyclones') && <AnalysisDrawer open={explainOpen} onClose={() => setExplainOpen(false)} title={eventLens ? 'Explain documented catalog records' : 'Explain the selected storm'}>
      <AnalysisExplanation
        selectionLabel={eventLens ? `${selectedState ? `${stateName ?? selectedState} (${selectedState})` : 'All catalog states, including unassigned events'}; ${auditStart}–${auditEnd}; ${countsView ? 'both hazard catalogs, grouped by decade' : active.label}` : `${storm?.name ?? 'No selected storm'}; ${storm?.storm_id ?? ''}; complete selected-storm source track`}
        meta={eventLens ? (countsView ? counts.data?.meta : !updating ? events.data?.meta : undefined) : !updating ? relationship.data?.meta ?? track.data?.meta : undefined}
        interpretation={eventLens ? <p>Documented counts, not hazard risk. Zero within coverage differs from N/A for absent coverage.</p> : <p>Wind and pressure use same-storm, same-timestamp pairs. Missing pairs are excluded; observations are temporally dependent.</p>}
        calculation={null}
        auditSources={eventLens ? (countsView ? validCountPeriod : !updating && year !== undefined) ? eventAuditSources : [] : !updating && storm ? [{ id: storm.storm_id, label: `${storm.name} · ${storm.storm_id} source track`, query: { operation: 'audit', dataset: 'tracks', storm_id: storm.storm_id } }] : []} />
    </AnalysisDrawer>}

    {active.id === 'heat' && <section className="regional-workspace"><h2>Regional temperature</h2>
      <div className="slicer-bar">
        <SlicerRibbon label="Quick region" options={['India', 'Rajasthan', 'Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Uttar Pradesh'].map((id) => ({ id, label: id }))} value={region || null} onChange={(next) => setFilters({ region: next ?? undefined, start_year: undefined, end_year: undefined, month: undefined })} />
      </div>
      <form className="filter-row" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setFilters({ region: String(data.get('region') ?? '').trim() || undefined, start_year: undefined, end_year: undefined, month: undefined }); }}><div><label htmlFor="temperature-region">Source region identifier</label><input id="temperature-region" name="region" key={region} defaultValue={region} maxLength={100} required /></div><button className="button primary" type="submit">Load regional temperature</button></form>
      {region ? <QueryState query={temperature} empty={temperature.data?.status === 'no_data' || temperature.data?.data.length === 0}>{temperature.data?.status === 'ok' && !!temperature.data.data.length && <ReturnedSeries key={region} dataset="temperature" region={region} rows={temperature.data.data} meta={temperature.data.meta} title={`Regional temperature · ${region}`} allowMonths />}</QueryState> : <p>No temperature request is made until a source region is supplied.</p>}
    </section>}
    {active.id === 'drought' && <section className="regional-workspace"><h2>National drought indicator</h2><QueryState query={drought} empty={drought.data?.status === 'no_data' || drought.data?.data.length === 0}>{drought.data?.status === 'ok' && !!drought.data.data.length && <ReturnedSeries dataset="drought" rows={drought.data.data} meta={drought.data.meta} title="National drought observations" allowMonths={false} />}</QueryState></section>}

    {eventLens && <div className="route-links">
      <a className="button" href={link('insights', { start_year: reportStartYear?.toString(), end_year: reportEndYear?.toString() })}>Insights{stateName ? ` · ${stateName}` : ''}</a>
      {selectedState && reportStartYear !== undefined && reportEndYear !== undefined && <ReportDownload stateId={selectedState} startYear={reportStartYear} endYear={reportEndYear} disabled={updating} />}
    </div>}
  </div>;
}
