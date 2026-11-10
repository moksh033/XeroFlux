import { useState } from 'react';
import { CalendarDays, Layers } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api/client';
import type { EventRecord } from '../api/types';
import { QueryState } from '../components/DataPanels';
import { SlicerRibbon } from '../components/Executive';
import IndiaMap from '../components/IndiaMap';
import { defaultStateId, useFilters } from '../hooks/useFilters';

export default function MultiHazard() {
  const states = useApi('/api/v1/states');
  const catalog = useApi('/api/v1/metadata');
  const { filters, setFilters } = useFilters();
  const [showMap, setShowMap] = useState(true);
  const [selectedRelationship, setSelectedRelationship] = useState('');
  const [hazardSlicer, setHazardSlicer] = useState<string | null>(null);
  const [decadeSlicer, setDecadeSlicer] = useState<string | null>(null);
  const [tablePosition, setTablePosition] = useState({ identity: '', page: 0 });
  const stateRecords = states.data?.data ?? [];
  const stateId = filters.get('state_id') ?? defaultStateId(stateRecords);
  const available = catalog.data?.data.capabilities.available_years;
  const years = [...new Set(['floods', 'landslides'].flatMap((dataset) => available?.[dataset] ?? []))].sort((a, b) => a - b);
  const startYear = Number(filters.get('start_year') ?? years[0]);
  const endYear = Number(filters.get('end_year') ?? years.at(-1));
  const validState = stateRecords.some((state) => state.state_id === stateId);
  const validPeriod = years.includes(startYear) && years.includes(endYear) && startYear <= endYear;
  const enabled = validState && validPeriod;
  const relationships = useApi('/api/v1/multi-hazard', { state_id: stateId, start_year: startYear, end_year: endYear }, undefined, enabled);
  const records = relationships.data?.data ?? [];
  const active = records.find((record) => record.id === selectedRelationship) ?? records[0];
  const allObservations = [...(active?.observations ?? [])].sort((a, b) => (a.timestamp ?? String(a.year ?? '')).localeCompare(b.timestamp ?? String(b.year ?? '')));
  const rowYear = (row: (typeof allObservations)[number]) => row.year ?? (row.timestamp ? Number(row.timestamp.slice(0, 4)) : NaN);
  const hazardOptions = [...new Set(allObservations.map((row) => row.hazard))].map((hazard) => ({
    id: hazard,
    label: hazard,
    count: allObservations.filter((row) => row.hazard === hazard).length,
  }));
  const distinctYears = [...new Set(allObservations.map(rowYear).filter((y) => Number.isFinite(y)))].sort((a, b) => a - b);
  const decadeOptions = [...new Set(distinctYears.map((y) => Math.floor(y / 10) * 10))].map((decade) => ({
    id: `${decade}s`,
    label: `${decade}s`,
    count: distinctYears.filter((y) => Math.floor(y / 10) * 10 === decade).length,
  }));
  const observations = allObservations.filter((row) => {
    if (hazardSlicer && row.hazard !== hazardSlicer) return false;
    if (decadeSlicer) {
      const y = rowYear(row);
      if (!Number.isFinite(y) || `${Math.floor(y / 10) * 10}s` !== decadeSlicer) return false;
    }
    return true;
  });
  const identity = JSON.stringify([stateId, startYear, endYear, active?.id, hazardSlicer, decadeSlicer]);
  if (tablePosition.identity !== identity) {
    setTablePosition({ identity, page: 0 });
  }
  const lastPage = Math.max(0, Math.ceil(observations.length / 50) - 1);
  const page = tablePosition.identity === identity ? Math.min(tablePosition.page, lastPage) : 0;
  const visibleObservations = observations.slice(page * 50, (page + 1) * 50);
  const hasYearOnly = observations.some((observation) => !observation.timestamp && observation.year != null);
  const points: EventRecord[] = observations.map((observation) => ({
    event_id: observation.event_id,
    state_id: observation.state_id,
    year: observation.year,
    timestamp: observation.timestamp,
    longitude: observation.longitude,
    latitude: observation.latitude,
    attributes: { hazard: observation.hazard },
  }));
  const boundariesAvailable = catalog.data?.data.capabilities.boundaries === true;
  const boundaries = useApi('/api/v1/boundaries', undefined, undefined, showMap && boundariesAvailable && Boolean(active));

  return (
    <>
      <header className="page-heading">
        <h1>Multi-hazard explorer</h1>
      </header>
      <section className="work-section" aria-labelledby="multi-scope-title">
        <h2 id="multi-scope-title"><Layers size={22} aria-hidden="true" /> Scope</h2>
        <QueryState query={states} empty={Boolean(states.data) && stateRecords.length === 0}>
          <QueryState query={catalog}>
            <div className="filter-row">
              <label htmlFor="multi-state">State
                <select id="multi-state" value={stateId} onChange={(event) => setFilters({ state_id: event.target.value })}>
                  {!validState && <option value={stateId}>Select a catalog state</option>}
                  {stateRecords.map((state) => <option key={state.state_id} value={state.state_id}>{state.name}</option>)}
                </select>
              </label>
              <label htmlFor="multi-start">Start year
                <select id="multi-start" value={years.includes(startYear) ? startYear : ''} disabled={!years.length} onChange={(event) => setFilters({ start_year: event.target.value })}>
                  {!years.includes(startYear) && <option value="">Select an observed year</option>}
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label htmlFor="multi-end">End year
                <select id="multi-end" value={years.includes(endYear) ? endYear : ''} disabled={!years.length} onChange={(event) => setFilters({ end_year: event.target.value })}>
                  {!years.includes(endYear) && <option value="">Select an observed year</option>}
                  {years.map((year) => <option key={year} value={year} disabled={year < startYear}>{year}</option>)}
                </select>
              </label>
              <button className="button" type="button" onClick={() => setFilters({ state_id: undefined, start_year: undefined, end_year: undefined })}>Reset scope</button>
            </div>
            {!enabled && <p role="status">Select a catalog state and an ordered observation period.</p>}
          </QueryState>
        </QueryState>
      </section>
      {enabled ? <>
        <QueryState query={relationships} empty={relationships.data?.status === 'no_data' || (Boolean(relationships.data) && records.length === 0)}>
          <section className="trend-panel" aria-labelledby="multi-counts-title">
            <h2 id="multi-counts-title">Relationship observations</h2>
            <p className="muted">Backend-reported record counts · relationships may overlap</p>
            <div className="chart-canvas" role="img" aria-label="Backend-reported observation counts for each returned relationship. Exact values are listed below.">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={records} margin={{ top: 12, right: 16, left: 4, bottom: 12 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="title" stroke="var(--muted)" tick={{ fontSize: 11 }} minTickGap={20} />
                  <YAxis allowDecimals={false} stroke="var(--muted)" tick={{ fontSize: 11 }} width={56} />
                  <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  <Bar dataKey="observation_count" name="Observation records" fill="var(--accent)" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <details><summary>Chart values</summary><div className="table-scroll"><table>
              <thead><tr><th scope="col">Relationship</th><th scope="col">Observation records</th></tr></thead>
              <tbody>{records.map(record => <tr key={record.id}><th scope="row">{record.title}</th><td>{record.observation_count.toLocaleString()}</td></tr>)}</tbody>
            </table></div></details>
          </section>
          <div className="multi-workbench">
            <section className="relationship-index" aria-labelledby="multi-relationships-title">
              <h2 id="multi-relationships-title">Relationships</h2>
              <ul className="relationship-list">{records.map((relationship) => <li key={relationship.id}>
                <button type="button" className="relationship-choice" aria-pressed={active?.id === relationship.id} onClick={() => setSelectedRelationship(relationship.id)}>
                  <strong>{relationship.title}</strong>
                  <span>{relationship.hazards.join(', ')}</span>
                  <span>{relationship.observation_count.toLocaleString()} observations</span>
                </button>
              </li>)}</ul>
            </section>
            {active && <section className="relationship-records" aria-labelledby="multi-observations-title">
              <h2 id="multi-observations-title"><CalendarDays size={22} aria-hidden="true" /> {active.title}</h2>
              <p className="relationship-summary">{active.region} · {active.period.start ?? 'Unknown start'}–{active.period.end ?? 'Unknown end'} · {active.observation_count.toLocaleString()} observations</p>
              <div className="slicer-bar">
                {hazardOptions.length > 0 && <SlicerRibbon label="Hazard" options={hazardOptions} value={hazardSlicer} onChange={setHazardSlicer} />}
                {decadeOptions.length > 0 && <SlicerRibbon label="Decade" options={decadeOptions} value={decadeSlicer} onChange={setDecadeSlicer} onReset={hazardSlicer || decadeSlicer ? () => { setHazardSlicer(null); setDecadeSlicer(null); } : undefined} />}
              </div>
              <div className="relationship-visuals">
              <button className="button" type="button" aria-expanded={showMap} aria-controls="multi-observation-map" onClick={() => setShowMap((shown) => !shown)}>{showMap ? 'Hide' : 'Show'} observation map</button>
              {showMap && <div id="multi-observation-map">{boundariesAvailable ? <QueryState query={boundaries} empty={boundaries.data?.status === 'no_data' || (Boolean(boundaries.data) && boundaries.data?.data.features.length === 0)}>
                <IndiaMap boundaries={boundaries.data?.data} selectedState={stateId} onSelect={(id) => setFilters({ state_id: id })} showStateSelector={false} basemapHint={observations.some((row) => row.hazard.toLowerCase().includes('landslide')) ? 'terrain' : undefined} points={points} />
                {!points.some((point) => point.longitude != null && point.latitude != null) && <p>No coordinates supplied; observations remain in the records table.</p>}
              </QueryState> : <p>Official boundary geometry is unavailable. Use the state selector and observed-record table.</p>}</div>}
              </div>
              <details className="relationship-source-records"><summary>Observation records ({observations.length.toLocaleString()})</summary>
              {hasYearOnly && <p className="muted">Year-only records have no within-year ordering.</p>}
              {observations.length ? <>
                <div className="table-scroll"><table>
                  <caption>Source records supplied with this relationship</caption>
                  <thead><tr><th scope="col">Source timestamp / year</th><th scope="col">Hazard</th><th scope="col">Event ID</th><th scope="col">State ID</th><th scope="col">Coordinates (longitude, latitude)</th></tr></thead>
                  <tbody>{visibleObservations.map((observation, index) => <tr key={`${observation.hazard}-${observation.event_id}-${page * 50 + index}`}>
                    <th scope="row">{observation.timestamp ? <time dateTime={observation.timestamp}>{observation.timestamp}</time> : observation.year != null ? `${observation.year} (year only)` : 'Timestamp not provided'}</th><td>{observation.hazard}</td><td>{observation.event_id}</td><td>{observation.state_id ?? 'Not attributed'}</td><td>{observation.longitude != null && observation.latitude != null ? `${observation.longitude}, ${observation.latitude}` : 'Not provided — not mapped'}</td>
                  </tr>)}</tbody>
                </table></div>
                <div className="pagination" aria-label="Observation table pagination">
                  <button type="button" className="button" disabled={page === 0} onClick={() => setTablePosition({ identity, page: page - 1 })}>Previous observations</button>
                  <p role="status">Records {page * 50 + 1}–{Math.min((page + 1) * 50, observations.length)} of {observations.length.toLocaleString()}</p>
                  <button type="button" className="button" disabled={page >= lastPage} onClick={() => setTablePosition({ identity, page: page + 1 })}>Next observations</button>
                </div>
              </> : <p>No observed records were supplied for this relationship.</p>}
              </details>
            </section>}
          </div>
        </QueryState>
      </> : <div className="empty-state">Relationships require valid state and period selections.</div>}
    </>
  );
}
