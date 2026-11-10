import { useState } from 'react';
import { Droplets, Mountain, Thermometer, Waves, Wind } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api/client';
import type { DAVQuery } from '../api/types';
import { AnalysisDrawer } from '../components/AnalysisDrawer';
import { AnalysisExplanation } from '../components/AnalysisExplanation';
import { AnalysisTabs, DistributionDetails, DistributionPanel } from '../components/DAVPanels';
import { QueryState, ReportDownload, TrendChart } from '../components/DataPanels';
import { KpiCard, SlicerRibbon } from '../components/Executive';
import IndiaMap from '../components/IndiaMap';
import { defaultStateId, useFilters } from '../hooks/useFilters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const hazards = [
  { id: 'heat', dataset: 'temperature', label: 'Heat', Icon: Thermometer },
  { id: 'floods', dataset: 'floods', label: 'Floods', Icon: Waves },
  { id: 'drought', dataset: 'drought', label: 'Drought', Icon: Droplets },
  { id: 'landslides', dataset: 'landslides', label: 'Landslides', Icon: Mountain },
  { id: 'cyclones', dataset: 'cyclones', label: 'Cyclones', Icon: Wind },
];

export default function Overview() {
  const { filters, setFilters } = useFilters();
  const [explanationOpen, setExplanationOpen] = useState(false);
  const requestedView = filters.get('dav_view');
  const view = ['distribution', 'hazards', 'temperature'].includes(requestedView ?? '') ? requestedView! : 'trend';
  const metadata = useApi('/api/v1/metadata');
  const states = useApi('/api/v1/states');
  const boundaries = useApi('/api/v1/boundaries');
  const catalog = metadata.data?.data;
  const capabilities = catalog?.capabilities;
  const dates = [...(capabilities?.rainfall_observation_dates ?? [])].sort();
  const requestedDate = filters.get('observation_date') ?? '';
  const date = dates.includes(requestedDate) ? requestedDate : dates.at(-1) ?? '';
  const stateRows = states.data?.data ?? [];
  const requestedState = filters.get('state_id');
  const selectedState = requestedState ?? defaultStateId(stateRows);
  const years = [...(capabilities?.available_years?.rainfall ?? [])].sort((a, b) => a - b);
  const startYear = filters.has('start_year') ? Number(filters.get('start_year')) : years[0];
  const endYear = filters.has('end_year') ? Number(filters.get('end_year')) : years.at(-1);
  const validPeriod = startYear !== undefined && endYear !== undefined && Number.isInteger(startYear) && Number.isInteger(endYear) && startYear <= endYear;
  const identity = JSON.stringify({ date, selectedState, startYear, endYear });
  const settledIdentity = useDebouncedValue(identity);
  const settled = (settledIdentity ? JSON.parse(settledIdentity) : { date, selectedState, startYear, endYear }) as { date: string; selectedState: string; startYear?: number; endYear?: number };
  const updating = identity !== settledIdentity;
  const rainfall = useApi('/api/v1/map/rainfall', {
    year: Number(settled.date.slice(0, 4)), observation_date: settled.date,
  }, undefined, !!settled.date);
  const evidenceBusy = updating || (!!date && rainfall.isPending);
  const trend = useApi('/api/v1/trends/rainfall', {
    state_id: settled.selectedState, start_year: settled.startYear, end_year: settled.endYear,
  }, undefined, !updating && !!settled.selectedState && validPeriod && settled.startYear !== undefined && settled.endYear !== undefined);
  const distributionQuery: DAVQuery = {
    operation: 'distribution', dataset: 'rainfall', state_id: settled.selectedState,
    start_year: settled.startYear, end_year: settled.endYear,
  };
  const distribution = useApi('/api/v1/dav', distributionQuery, undefined,
    !updating && !!settled.selectedState && validPeriod && (view === 'distribution' || explanationOpen));
  const distributionData = !updating && distribution.data?.data?.kind === 'distribution' ? distribution.data.data : undefined;
  const auditQuery: DAVQuery = {
    operation: 'audit', dataset: 'rainfall', state_id: selectedState,
    start_year: startYear, end_year: endYear,
  };
  const focusedHazard = filters.get('hazard') ?? 'rainfall';
  const stateCounts = useApi('/api/v1/dav', {
    operation: 'counts', state_id: settled.selectedState, start_year: 1967, end_year: 2026,
  }, undefined, !updating && !!settled.selectedState);
  const stateTemperature = useApi('/api/v1/trends/temperature', {
    region: settled.selectedState,
  }, undefined, !updating && !!settled.selectedState);
  const stateName = stateRows.find((state) => state.state_id === selectedState)?.name ?? 'Selected state';
  const observation = rainfall.data?.data.find((row) => row.state_id === selectedState && row.date === date);
  const trendRows = [...(trend.data?.data ?? [])].sort((a, b) => (a.date ?? String(a.year)).localeCompare(b.date ?? String(b.year))).map((row) => ({ label: row.date ?? String(row.year), value: row.value }));
  const periodLabel = validPeriod ? `${startYear}–${endYear}` : 'Invalid period';
  const analysisLabel = `${stateName}; daily rainfall observations; analysis period ${periodLabel}`;
  const slicerOptions = [
    { id: 'rainfall', label: 'Rainfall', count: catalog?.datasets?.rainfall?.observation_count ?? null },
    ...hazards.map(({ id, dataset, label }) => ({
      id,
      label,
      count: catalog?.datasets?.[dataset]?.observation_count ?? null,
      disabled: Boolean(capabilities && !capabilities.available_hazards?.includes(id)),
    })),
  ];
  const selectState = (state: string) => setFilters({ state_id: state });
  const route = (path: string, patch: Record<string, string> = {}) => {
    const query = new URLSearchParams(filters);
    if (selectedState) query.set('state_id', selectedState);
    if (startYear !== undefined) query.set('start_year', String(startYear));
    if (endYear !== undefined) query.set('end_year', String(endYear));
    for (const [key, value] of Object.entries(patch)) query.set(key, value);
    return `#/${path}?${query.toString()}`;
  };

  return <div className="overview-page">
    <header className="page-heading"><h1>India climate atlas</h1></header>
    <div className="filter-row atlas-toolbar">
      <div><label htmlFor="overview-date">Map observation date</label><select id="overview-date" value={date} disabled={!dates.length} onChange={(event) => setFilters({ observation_date: event.target.value })}>
        {!dates.length && <option value="">No supported dates</option>}{dates.map((value) => <option key={value} value={value}>{value}</option>)}
      </select></div>
      <div><label htmlFor="overview-state">State / union territory</label><select id="overview-state" value={selectedState} disabled={!stateRows.length} onChange={(event) => selectState(event.target.value)}>
        {!stateRows.length && <option value="">No states available</option>}{requestedState !== null && !stateRows.some((state) => state.state_id === requestedState) && <option value={requestedState}>Unknown state: {requestedState || '(empty)'}</option>}{stateRows.map((state) => <option key={state.state_id} value={state.state_id}>{state.name}</option>)}
      </select></div>
    </div>
    {(metadata.isPending || metadata.error) && <QueryState query={metadata} />}
    {(states.isPending || states.error) && <QueryState query={states} />}
    <div className="atlas-workbench">
      <section className="map-stage" aria-label="India rainfall map" aria-busy={evidenceBusy}>
        <QueryState query={boundaries} empty={boundaries.data?.status === 'no_data'}>
          <IndiaMap boundaries={boundaries.data?.data} rainfall={updating ? undefined : rainfall.data?.data} selectedState={selectedState} onSelect={selectState} showStateSelector={false} basemapHint={focusedHazard === 'landslides' ? 'terrain' : undefined} unit={updating ? undefined : rainfall.data?.meta.unit} />
          {evidenceBusy && <p className="map-update-status" role="status">Updating filters…</p>}
        </QueryState>
      </section>
      <aside className="state-rail" aria-label="Selected state rainfall" aria-busy={evidenceBusy}>
        <header className="state-rail-header">
          <div>
            <h2>{stateName}</h2>
            <p className="state-code-label">State ID {selectedState}</p>
          </div>
          <div className="recorded-date-pill">
            <span className="pill-label">Recorded date</span>
            {observation ? <strong aria-label="Recorded rainfall value" role="status">{observation.value}</strong> : <strong className="no-observation">No record</strong>}
            <small>{rainfall.data?.meta.unit ?? 'Unit not declared'} · <time dateTime={date}>{date}</time></small>
          </div>
        </header>
        <div className="state-quick-kpis">
          <div className="state-kpi-card rainfall-card">
            <span className="kpi-symbol" aria-hidden="true">▼</span>
            <div>
              <span className="kpi-title">Peak 2026 Rain</span>
              <strong>{trendRows.length && trendRows.some(r => r.value != null) ? Math.max(...trendRows.filter(r => r.value != null).map(r => r.value!)).toFixed(1) : '—'} <small>{rainfall.data?.meta.unit ?? ''}</small></strong>
            </div>
          </div>
          <div className="state-kpi-card flood-card">
            <span className="kpi-symbol" aria-hidden="true">≈</span>
            <div>
              <span className="kpi-title">Recorded Floods</span>
              <strong>{stateCounts.data?.data?.kind === 'counts' ? stateCounts.data.data.rows.filter(r => r.hazard === 'floods' && r.count != null).reduce((acc, r) => acc + (r.count ?? 0), 0) : '—'}</strong>
            </div>
          </div>
          <div className="state-kpi-card landslide-card">
            <span className="kpi-symbol" aria-hidden="true">▲</span>
            <div>
              <span className="kpi-title">Landslides</span>
              <strong>{stateCounts.data?.data?.kind === 'counts' ? stateCounts.data.data.rows.filter(r => r.hazard === 'landslides' && r.count != null).reduce((acc, r) => acc + (r.count ?? 0), 0) : '—'}</strong>
            </div>
          </div>
          <div className="state-kpi-card heat-card">
            <span className="kpi-symbol" aria-hidden="true">☼</span>
            <div>
              <span className="kpi-title">Max Summer Heat</span>
              <strong>{stateTemperature.data?.data?.length ? `${Math.max(...stateTemperature.data.data.map(r => r.value))} °C` : '—'}</strong>
            </div>
          </div>
        </div>
        <section className="overview-analysis dav-workbench" aria-label="Period rainfall analysis" aria-busy={updating} data-hazard="rainfall">
          <div className="dav-heading">
            <div>
              <h3>State Analysis &amp; Hazard Visuals</h3>
              <p className="muted">{periodLabel} · {trendRows.length} daily observations</p>
            </div>
            <button type="button" className="button" disabled={!selectedState || !validPeriod} onClick={() => setExplanationOpen(true)}>Explain</button>
          </div>
          <div className="filter-row overview-period-controls">
            <div><label htmlFor="overview-start">Start</label><select id="overview-start" value={filters.get('start_year') ?? startYear ?? ''} disabled={!years.length} onChange={(event) => setFilters({ start_year: event.target.value })}>
              {!years.length && <option value="">No years</option>}{filters.has('start_year') && !years.includes(startYear!) && <option value={filters.get('start_year')!}>{filters.get('start_year')}</option>}{years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select></div>
            <div><label htmlFor="overview-end">End</label><select id="overview-end" value={filters.get('end_year') ?? endYear ?? ''} disabled={!years.length} onChange={(event) => setFilters({ end_year: event.target.value })}>
              {!years.length && <option value="">No years</option>}{filters.has('end_year') && !years.includes(endYear!) && <option value={filters.get('end_year')!}>{filters.get('end_year')}</option>}{years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select></div>
          </div>
          <div className="overview-tabs-row">
            {!validPeriod ? <p role="alert">Choose valid period bounds.</p> : !selectedState ? <p role="status">Select a state.</p> : updating ? <p role="status">Updating analysis…</p> : <AnalysisTabs label="Rainfall analysis view" options={[{ id: 'trend', label: 'Rainfall Trend' }, { id: 'distribution', label: 'Rainfall Distribution' }, { id: 'hazards', label: 'Hazard History' }, { id: 'temperature', label: 'Summer Heat' }]} value={view} onChange={(next) => setFilters({ dav_view: next })}>
              <div className="overview-chart-canvas">
                {view === 'trend' ? <div className="dav-body"><QueryState query={trend} empty={trend.data?.status === 'no_data' || trend.data?.data.length === 0}>
                  <TrendChart title="Observed daily rainfall" unit={trend.data?.meta.unit} rows={trendRows} color="var(--rainfall)" />
                </QueryState></div> : view === 'distribution' ? <>
                  <QueryState query={distribution} empty={distribution.data?.status === 'no_data'}>
                    {distributionData && <DistributionPanel data={distributionData} meta={distribution.data?.meta} unit={distribution.data?.meta.unit} title="Daily rainfall distribution" color="var(--rainfall)" compact />}
                  </QueryState>
                  <QueryState query={trend} empty={trend.data?.status === 'no_data' || trend.data?.data.length === 0}>
                    <details><summary>Observation values (accessible table)</summary><div className="table-scroll"><table>
                      <caption>{analysisLabel}</caption>
                      <thead><tr><th scope="col">Recorded date</th><th scope="col">Value ({trend.data?.meta.unit ?? 'unit not declared'})</th></tr></thead>
                      <tbody>{trendRows.map((row) => <tr key={`${selectedState}:${row.label}`}><th scope="row">{row.label}</th><td>{row.value ?? 'Not observed'}</td></tr>)}</tbody>
                    </table></div></details>
                  </QueryState>
                </> : view === 'hazards' ? <div className="dav-body">
                  <QueryState query={stateCounts} empty={stateCounts.data?.status === 'no_data'}>
                    {stateCounts.data?.data?.kind === 'counts' && (
                      <div className="overview-hazards-viz">
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text)' }}>Documented Floods &amp; Landslides by Decade</h4>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={[...new Set(stateCounts.data.data.rows.map(r => r.decade))].sort().map(dec => ({
                            decade: `${dec}s`,
                            floods: stateCounts.data?.data?.kind === 'counts' ? stateCounts.data.data.rows.find(r => r.decade === dec && r.hazard === 'floods')?.count ?? 0 : 0,
                            landslides: stateCounts.data?.data?.kind === 'counts' ? stateCounts.data.data.rows.find(r => r.decade === dec && r.hazard === 'landslides')?.count ?? 0 : 0,
                          }))} margin={{ top: 12, right: 16, bottom: 20, left: 0 }}>
                            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="decade" stroke="var(--muted)" tick={{ fontSize: 11 }} />
                            <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                            <Bar dataKey="floods" name="Floods" fill="var(--flood)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                            <Bar dataKey="landslides" name="Landslides" fill="var(--landslide)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </QueryState>
                </div> : <div className="dav-body">
                  <QueryState query={stateTemperature} empty={stateTemperature.data?.status === 'no_data' || (Boolean(stateTemperature.data) && !stateTemperature.data?.data.length)}>
                    <div className="overview-temp-viz">
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text)' }}>Summer Max Temperature Trend (1967–2024)</h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={[...(stateTemperature.data?.data ?? [])].filter(r => r.month === null).sort((a, b) => a.year - b.year).map(r => ({ year: r.year, temp: r.value }))} margin={{ top: 12, right: 16, bottom: 20, left: 0 }}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                          <XAxis dataKey="year" stroke="var(--muted)" tick={{ fontSize: 11 }} />
                          <YAxis stroke="var(--muted)" domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} unit="°C" width={46} />
                          <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                          <Line type="monotone" dataKey="temp" name="Summer Max (°C)" stroke="var(--heat)" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </QueryState>
                </div>}
              </div>
            </AnalysisTabs>}
          </div>
        </section>
        <div className="overview-rail-actions">
          <a className="button" href={route('insights')}>NIElytics insights for this state</a>
          {selectedState && validPeriod && startYear !== undefined && endYear !== undefined && <ReportDownload stateId={selectedState} startYear={startYear} endYear={endYear} disabled={updating || trend.isPending || !trend.data?.data.length} />}
        </div>
      </aside>
    </div>
    <AnalysisDrawer open={explanationOpen} onClose={() => setExplanationOpen(false)} title="Rainfall analysis">
      {explanationOpen && (updating ? <p role="status">Updating analysis scope…</p> : !selectedState || !validPeriod ? <p role="alert">Choose a state and valid period.</p> : <AnalysisExplanation
        selectionLabel={analysisLabel}
        meta={distribution.data?.meta ?? trend.data?.meta}
        auditSources={[{ id: 'rainfall', label: `${stateName} rainfall records`, query: auditQuery }]}
        interpretation={<QueryState query={distribution} empty={distribution.data?.status === 'no_data'}>
          {distributionData && <>
            <p>{distributionData.summary.n} measured observations; {distributionData.summary.missing} missing; {distributionData.summary.outliers.length} IQR outliers.</p>
            <DistributionDetails data={distributionData} unit={distribution.data?.meta.unit} title={`${stateName} rainfall spread`} color="var(--rainfall)" />
          </>}
        </QueryState>}
        calculation={null}
      />)}
    </AnalysisDrawer>
    <section className="hazard-section" aria-labelledby="hazard-section-title">
      <h2 id="hazard-section-title">Hazards</h2>
      <div className="slicer-bar"><SlicerRibbon label="Hazard focus" options={slicerOptions} value={focusedHazard} onChange={(id) => setFilters({ hazard: id ?? undefined })} onReset={filters.get('hazard') ? () => setFilters({ hazard: undefined }) : undefined} /></div>
      <nav className="instrument-strip" aria-label="Hazard lenses">{hazards.map(({ id, label, Icon }) => <a key={id} href={route('explorer', { hazard: id })}><Icon size={19} aria-hidden="true" /><span>{label}</span></a>)}</nav>
    </section>
  </div>;
}
