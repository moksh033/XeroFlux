import { useEffect, useMemo, type ReactNode } from 'react';
import { Clock3, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api/client';
import type { Catalog, StormRecord, TrackRecord } from '../api/types';
import { QueryState } from '../components/DataPanels';
import IndiaMap, { type IndiaMapProps } from '../components/IndiaMap';
import { defaultStateId, useFilters } from '../hooks/useFilters';
import { usePlayback, type Playback } from '../hooks/usePlayback';

const categoryLabels = { cyclones: 'Cyclones', rainfall: 'Rainfall', floods: 'Floods', landslides: 'Landslides' } as const;
type Category = keyof typeof categoryLabels;

function PlaybackControls({ playback, count, timestamp }: { playback: Playback; count: number; timestamp?: string }) {
  return <section className="replay-playback" aria-labelledby="playback-controls-title">
    <h2 id="playback-controls-title">Playback</h2>
    {!count && <p role="status">No replayable observations loaded.</p>}
    {count === 1 && <p>One observation; playback needs two.</p>}
    <div className="playback-controls" aria-describedby="playback-reason">
      <button className="button primary" type="button" disabled={count < 2 || playback.playing} onClick={playback.play}><Play size={16} aria-hidden="true" /> Play</button>{' '}
      <button className="button" type="button" disabled={!count || !playback.playing} onClick={playback.pause}><Pause size={16} aria-hidden="true" /> Pause</button>{' '}
      <button className="button" type="button" disabled={!count} onClick={playback.restart}><RotateCcw size={16} aria-hidden="true" /> Restart</button>{' '}
      <button className="button" type="button" disabled={count < 2 || playback.index >= count - 1} onClick={playback.step}><SkipForward size={16} aria-hidden="true" /> Step</button>
    </div>
    <p id="playback-reason" className="muted">1× = one recorded observation per second.</p>
    <div className="playback-timeline">
      <div>
        <label htmlFor="playback-speed">Playback speed</label>
        <select id="playback-speed" value={playback.speed} disabled={!count} onChange={event => playback.setSpeed(Number(event.target.value))}>
          <option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option>
        </select>
      </div>
      <div>
        <label htmlFor="playback-position">Observation timeline</label>
        <input id="playback-position" type="range" min="0" max={Math.max(0, count - 1)} value={playback.index} disabled={!count} onChange={event => playback.seek(Number(event.target.value))} aria-valuetext={timestamp ? `Observation ${playback.index + 1} of ${count}: ${timestamp}` : 'No recorded observations available'} />
      </div>
    </div>
    <p role="status">{count ? `Observation ${playback.index + 1} of ${count} · ${playback.playing ? 'Playing' : 'Paused'} · ${timestamp ?? 'Source timestamp unavailable'}` : 'No observations'}</p>
  </section>;
}

function ReplayMap({ controls, ...props }: Omit<IndiaMapProps, 'boundaries'> & { controls: ReactNode }) {
  // This component exists only on the active replay map. useApi caches boundaries for five minutes.
  const boundaries = useApi('/api/v1/boundaries');
  return <section className="replay-stage" aria-label="Observed geography and playback">
    <QueryState query={boundaries} empty={boundaries.data?.status === 'no_data' || boundaries.data?.data.features.length === 0}>
      <IndiaMap {...props} boundaries={boundaries.data?.data} />
    </QueryState>
    {controls}
  </section>;
}

function PageControls({ page, onChange, label }: { page: { offset: number; limit: number; total: number; items: unknown[] }; onChange: (offset: number) => void; label: string }) {
  return <div className="replay-page-controls">
    <p className="muted">{page.items.length ? page.offset + 1 : 0}–{page.offset + page.items.length} of {page.total} {label} · replaying this page only</p>
    {page.offset > 0 && <button className="button" type="button" onClick={() => onChange(Math.max(0, page.offset - page.limit))}>Previous {label} page</button>}
    {page.offset + page.items.length < page.total && <button className="button" type="button" onClick={() => onChange(page.offset + page.limit)}>Next {label} page</button>}
  </div>;
}

function CycloneMeasurements({ records, current }: { records: TrackRecord[]; current?: TrackRecord }) {
  return <div className="replay-measurements">
    {(['wind', 'pressure'] as const).flatMap(metric => {
      const unitKey = metric === 'wind' ? 'wind_unit' : 'pressure_unit';
      const units = [...new Set(records.map(record => record[unitKey] ?? null))];
      return units.map(unit => {
        const title = metric === 'wind' ? 'Recorded wind' : 'Recorded pressure';
        const rows = records.map(record => ({
          timestamp: record.timestamp,
          time: Date.parse(record.timestamp),
          value: (record[unitKey] ?? null) === unit ? record[metric] ?? null : null,
        })).filter(row => Number.isFinite(row.time));
        return <section className="replay-measurement" key={`${metric}:${unit ?? 'unspecified'}`}>
          <h2>{title} <small>({unit ?? 'unit unspecified'})</small></h2>
          {rows.some(row => row.value !== null) ? <div className="chart-canvas" role="img" aria-label={`${title} over recorded timestamps, ${unit ?? 'unit unspecified'}. Missing observations are gaps. Values in Track records below.`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 12, left: 4 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={value => new Date(value).toISOString().slice(5, 16).replace('T', ' ')} minTickGap={40} stroke="var(--muted)" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} stroke="var(--muted)" tick={{ fontSize: 11 }} width={52} />
                <Tooltip labelFormatter={value => new Date(Number(value)).toISOString()} contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                {current && Number.isFinite(Date.parse(current.timestamp)) && <ReferenceLine x={Date.parse(current.timestamp)} stroke="var(--muted)" strokeDasharray="4 4" />}
                <Line name={`${title} (${unit ?? 'unit unspecified'})`} dataKey="value" type="linear" stroke={metric === 'wind' ? 'var(--accent)' : 'var(--muted)'} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div> : <p className="empty-state">No measured {metric} in this unit.</p>}
        </section>;
      });
    })}
  </div>;
}

function StormReplay({ storm }: { storm: StormRecord }) {
  const track = useApi('/api/v1/cyclones/{storm_id}/track', undefined, { storm_id: storm.storm_id });
  const records = useMemo(() => [...(track.data?.data ?? [])].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)), [track.data]);
  const playback = usePlayback(records.length, `cyclones:${storm.year}:${storm.storm_id}`);
  const current = records[playback.index];
  const ready = !track.isPending && !track.error && track.data?.status === 'ok' && records.length > 0;
  const controls = <PlaybackControls playback={playback} count={ready ? records.length : 0} timestamp={ready ? current?.timestamp : undefined} />;
  return <>
    <QueryState query={track} empty={track.data?.status === 'no_data' || records.length === 0}>
      <div className="replay-workbench">
        <ReplayMap track={records} activePoint={current} controls={controls} />
        <aside className="replay-readout" aria-labelledby="replay-observation-title">
          <h2 id="replay-observation-title"><Clock3 size={21} aria-hidden="true" /> {storm.name}</h2>
          <dl className="replay-current-values">
            <dt>Recorded time</dt><dd>{current ? <time dateTime={current.timestamp}>{current.timestamp}</time> : 'Not available'}</dd>
            <dt>Wind</dt><dd>{current?.wind != null ? `${current.wind} ${current.wind_unit ?? '(unit unspecified)'}` : 'Not observed'}</dd>
            <dt>Pressure</dt><dd>{current?.pressure != null ? `${current.pressure} ${current.pressure_unit ?? '(unit unspecified)'}` : 'Not observed'}</dd>
            <dt>Position (longitude, latitude)</dt><dd>{current ? `${current.longitude}, ${current.latitude}` : 'Not available'}</dd>
          </dl>
          <p className="muted">Basin-wide track · recorded positions only</p>
        </aside>
      </div>
      <CycloneMeasurements records={records} current={current} />
      <details className="replay-records"><summary>Track records ({records.length})</summary>
        <div className="replay-table-scroll"><table>
          <thead><tr><th scope="col">Recorded timestamp</th><th scope="col">Longitude, latitude</th><th scope="col">Wind</th><th scope="col">Pressure</th></tr></thead>
          <tbody>{records.map((record, index) => <tr key={`${record.timestamp}:${index}`}>
            <th scope="row"><time dateTime={record.timestamp}>{record.timestamp}</time></th><td>{record.longitude}, {record.latitude}</td>
            <td>{record.wind == null ? 'Not observed' : `${record.wind} ${record.wind_unit ?? '(unit unspecified)'}`}</td>
            <td>{record.pressure == null ? 'Not observed' : `${record.pressure} ${record.pressure_unit ?? '(unit unspecified)'}`}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </QueryState>
    {!ready && controls}
  </>;
}

function CycloneReplay({ year, scopeControls }: { year: number; scopeControls: ReactNode }) {
  const { filters, setFilters } = useFilters();
  const requestedOffset = Number(filters.get('storm_offset') ?? 0);
  const offset = Number.isFinite(requestedOffset) && requestedOffset >= 0 ? Math.floor(requestedOffset) : 0;
  const storms = useApi('/api/v1/cyclones', { year, limit: 100, offset });
  const items = storms.data?.data.items ?? [];
  const storm = items.find(item => item.storm_id === filters.get('storm_id')) ?? items.find(item => item.name.toUpperCase() === 'FANI') ?? items[0];
  const ready = !storms.isPending && !storms.error && storms.data?.status === 'ok' && !!storm;
  const unavailablePlayback = usePlayback(0, `cyclones:${year}:catalog:${offset}`);
  return <>
    <div className="replay-scope-controls">
      {scopeControls}
      <div>
        <label htmlFor="replay-storm">Cyclone / storm</label>
        <select id="replay-storm" value={ready ? storm.storm_id : ''} disabled={!ready} onChange={event => setFilters({ storm_id: event.target.value })}>
          {!ready && <option value="">No returned storm available</option>}
          {items.map(item => <option key={item.storm_id} value={item.storm_id}>{item.name} · {item.year} · {item.storm_id}</option>)}
        </select>
      </div>
    </div>
    <QueryState query={storms} empty={storms.data?.status === 'no_data' || items.length === 0}>
      {ready && <StormReplay key={storm.storm_id} storm={storm} />}
    </QueryState>
    {!ready && <PlaybackControls playback={unavailablePlayback} count={0} />}
    {storms.data && <PageControls page={storms.data.data} label="storms" onChange={next => setFilters({ storm_offset: String(next), storm_id: undefined })} />}
  </>;
}

function EventReplay({ category, year, stateId }: { category: 'floods' | 'landslides'; year: number; stateId: string }) {
  const { filters, setFilters } = useFilters();
  const requestedOffset = Number(filters.get('offset') ?? 0);
  const offset = Number.isFinite(requestedOffset) && requestedOffset >= 0 ? Math.floor(requestedOffset) : 0;
  const query = useApi(category === 'floods' ? '/api/v1/events/floods' : '/api/v1/events/landslides', { state_id: stateId || undefined, year, limit: 100, offset });
  const page = query.data?.data;
  const records = useMemo(() => (query.data?.data.items ?? []).filter(event => event.timestamp && Number.isFinite(Date.parse(event.timestamp))).sort((a, b) => Date.parse(a.timestamp!) - Date.parse(b.timestamp!)), [query.data]);
  const playback = usePlayback(records.length, `${category}:${stateId}:${year}:${offset}`);
  const current = records[playback.index];
  const visible = current ? records.filter(event => Date.parse(event.timestamp!) <= Date.parse(current.timestamp!)) : [];
  const withoutTimestamp = page?.items.filter(event => !event.timestamp || !Number.isFinite(Date.parse(event.timestamp))) ?? [];
  const ready = !query.isPending && !query.error && query.data?.status === 'ok' && !!page?.items.length;
  const controls = <PlaybackControls playback={playback} count={ready ? records.length : 0} timestamp={ready ? current?.timestamp ?? undefined : undefined} />;
  return <>
    <div className="replay-workbench">
      <ReplayMap points={ready ? visible : []} selectedState={stateId} showStateSelector={false} onSelect={id => setFilters({ state_id: id, offset: undefined })} basemapHint={category === 'landslides' ? 'terrain' : undefined} controls={controls} />
      <aside className="replay-readout" aria-labelledby="replay-events-title">
        <h2 id="replay-events-title">{categoryLabels[category]} · recorded events</h2>
        <QueryState query={query} empty={query.data?.status === 'no_data' || page?.items.length === 0}>
          <p aria-live="polite">{current?.timestamp ? <time dateTime={current.timestamp}>{current.timestamp}</time> : 'No compatible source timestamp available'}</p>
          <p className="muted">{visible.length} events through this timestamp · missing coordinates are not mapped</p>
          <ol className="replay-event-list" aria-label="Events through the selected source timestamp">
            {visible.map(event => <li key={event.event_id} aria-current={event.event_id === current?.event_id ? 'step' : undefined}>
              <time dateTime={event.timestamp ?? undefined}>{event.timestamp}</time> · {event.state_id ?? 'State unresolved'}
              <details><summary>Event record</summary><p>{event.event_id} · {event.longitude != null && event.latitude != null ? `${event.longitude}, ${event.latitude}` : 'Coordinates missing'}</p><pre style={{ overflowX: 'auto' }}>{JSON.stringify(event.attributes ?? {}, null, 2)}</pre></details>
            </li>)}
          </ol>
          {!records.length && <p>No compatible timestamped records are present on this page.</p>}
          {withoutTimestamp.length > 0 && <details><summary>Records without compatible timestamps ({withoutTimestamp.length})</summary>
            <p>Excluded from playback; year-only records have no within-year ordering.</p>
            <ul>{withoutTimestamp.map(event => <li key={event.event_id}>{event.event_id} · source timestamp: {event.timestamp ?? 'Not available'} · source year: {event.year ?? 'Not available'}</li>)}</ul>
          </details>}
        </QueryState>
      </aside>
    </div>
    {page && <PageControls page={page} label="events" onChange={next => setFilters({ offset: String(next) })} />}
  </>;
}

function RainfallReplay({ year, catalog, stateId, stateName }: { year: number; catalog: Catalog; stateId: string; stateName: string }) {
  const { filters, setFilters } = useFilters();
  const dates = useMemo(() => [...(catalog.capabilities.rainfall_observation_dates ?? [])].filter(date => date.startsWith(`${year}-`)).sort(), [catalog, year]);
  const playback = usePlayback(dates.length, `rainfall:${year}`);
  const requestedDate = filters.get('observation_date');
  const { seek } = playback;
  useEffect(() => {
    const index = requestedDate ? dates.indexOf(requestedDate) : -1;
    if (index >= 0) seek(index);
  }, [dates, requestedDate, seek]);
  const currentDate = dates[playback.index];
  const rainfall = useApi('/api/v1/map/rainfall', { year, observation_date: currentDate }, undefined, !!currentDate);
  const ready = !rainfall.isPending && !rainfall.error && rainfall.data?.status === 'ok' && rainfall.data.data.length > 0;
  const observation = rainfall.data?.data.find(record => record.state_id === stateId);
  const controls = <PlaybackControls playback={playback} count={ready ? dates.length : 0} timestamp={ready ? currentDate : undefined} />;
  if (!dates.length) return <section className="replay-empty">
    <h2>Rainfall observation dates unavailable</h2>
    <p>No daily observation dates are available for this year.</p>
    {controls}
  </section>;
  return <>
    <div className="replay-workbench">
      <ReplayMap rainfall={ready ? rainfall.data?.data : undefined} unit={rainfall.data?.meta.unit} selectedState={stateId} showStateSelector={false} onSelect={id => setFilters({ state_id: id })} controls={controls} />
      <aside className="replay-readout" aria-labelledby="replay-rainfall-title">
        <h2 id="replay-rainfall-title">Daily Actual · <time dateTime={currentDate}>{currentDate}</time></h2>
        <label htmlFor="replay-rainfall-date">Observation date</label>
        <select id="replay-rainfall-date" value={currentDate} onChange={event => { playback.seek(dates.indexOf(event.target.value)); setFilters({ observation_date: event.target.value }); }}>
          {dates.map(date => <option key={date} value={date}>{date}</option>)}
        </select>
        {stateId && <dl className="replay-current-values"><dt>{stateName}</dt><dd>{observation?.value != null ? `${observation.value} ${rainfall.data?.meta.unit ?? '(unit unspecified)'}` : 'Not observed'}</dd></dl>}
        <p className="muted">Daily actual ({rainfall.data?.meta.unit ?? 'unit unspecified'}) · missing ≠ zero</p>
        <QueryState query={rainfall} empty={rainfall.data?.status === 'no_data' || rainfall.data?.data.length === 0}>
          <details className="replay-records"><summary>Returned state observations</summary>
            <div className="replay-table-scroll"><table><thead><tr><th scope="col">State identifier</th><th scope="col">Source date</th><th scope="col">Daily Actual ({rainfall.data?.meta.unit ?? 'source unit unspecified'})</th></tr></thead><tbody>
              {rainfall.data?.data.map(record => <tr key={`${record.state_id}:${record.date ?? record.year}`}><th scope="row">{record.state_id}</th><td>{record.date ?? `Year only: ${record.year}`}</td><td>{record.value ?? 'Not observed'}</td></tr>)}
            </tbody></table></div>
          </details>
        </QueryState>
      </aside>
    </div>
  </>;
}

export default function TimeMachine() {
  const metadata = useApi('/api/v1/metadata');
  const states = useApi('/api/v1/states');
  const { filters, setFilters } = useFilters();
  const catalog = metadata.data?.data;
  const stateRecords = states.data?.data ?? [];
  const stateSelection = filters.get('state_id') ?? defaultStateId(stateRecords);
  const stateId = stateSelection === 'all' ? '' : stateSelection;
  const validState = stateSelection === 'all' || stateRecords.some(state => state.state_id === stateId);
  const stateName = stateRecords.find(state => state.state_id === stateId)?.name ?? 'Selected state';
  const categories = (Object.keys(categoryLabels) as Category[]).filter(category => catalog?.capabilities.observed_replay?.includes(category));
  const requestedCategory = filters.get('hazard');
  const category = categories.find(item => item === requestedCategory) ?? categories[0];
  const years = [...(category ? catalog?.capabilities.available_years?.[category] ?? [] : [])].sort((a, b) => a - b);
  const requestedYear = Number(filters.get('year'));
  const year = years.includes(requestedYear) ? requestedYear : category === 'cyclones' && years.includes(2019) ? 2019 : years.at(-1);
  const unavailablePlayback = usePlayback(0, 'replay-unavailable');
  const ready = !metadata.isPending && !metadata.error && metadata.data?.status === 'ok' && !!category && year !== undefined;
  const scopeControls = <>
    <div><label htmlFor="replay-category">Observation category</label>
      <select id="replay-category" value={category ?? ''} disabled={!categories.length} onChange={event => setFilters({ hazard: event.target.value, year: undefined, storm_id: undefined, storm_offset: undefined, observation_date: undefined, offset: undefined })}>
        {!categories.length && <option value="">No compatible replay category supplied</option>}
        {categories.map(item => <option key={item} value={item}>{categoryLabels[item]}</option>)}
      </select>
    </div>
    <div><label htmlFor="replay-year">Recorded year / catalog season</label>
      <select id="replay-year" value={year ?? ''} disabled={!years.length} onChange={event => setFilters({ year: event.target.value, storm_id: undefined, storm_offset: undefined, observation_date: undefined, offset: undefined })}>
        {!years.length && <option value="">No confirmed years available</option>}
        {years.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
    {category && category !== 'cyclones' && <div><label htmlFor="replay-state">State</label>
      <select id="replay-state" value={stateSelection} disabled={states.isPending} onChange={event => setFilters({ state_id: event.target.value, offset: undefined })}>
        {!validState && <option value={stateSelection}>Select a catalog state</option>}
        <option value="all">All states</option>
        {stateRecords.map(state => <option key={state.state_id} value={state.state_id}>{state.name}</option>)}
      </select>
    </div>}
  </>;
  return <>
    <header className="page-heading">
      <h1>Climate Time Machine</h1>
    </header>
    <QueryState query={metadata} empty={metadata.data?.status === 'no_data'}>
      {category === 'cyclones' && year !== undefined
        ? <CycloneReplay key={`cyclones:${year}`} year={year} scopeControls={scopeControls} />
        : <>
          <div className="replay-scope-controls">{scopeControls}</div>
          <QueryState query={states} empty={Boolean(states.data) && !stateRecords.length}>
            {!validState && <p role="status">Select a catalog state or all states.</p>}
            {validState && (category === 'floods' || category === 'landslides') && year !== undefined && <EventReplay key={`${category}:${stateId}:${year}`} category={category} year={year} stateId={stateId} />}
            {validState && category === 'rainfall' && year !== undefined && catalog && <RainfallReplay key={`rainfall:${year}`} catalog={catalog} year={year} stateId={stateId} stateName={stateName} />}
          </QueryState>
        </>}
      {requestedCategory && requestedCategory !== category && <p role="status">The requested category does not support observed replay. Showing {category ? categoryLabels[category] : 'no category'} instead.</p>}
      {filters.has('year') && requestedYear !== year && <p role="status">The requested year is not in this category's confirmed coverage. {year ? `Showing ${year}.` : 'No period can be selected.'}</p>}
      {!categories.length && <p role="status">No observed replay capability has been provided by the backend.</p>}
    </QueryState>
    {!ready && <PlaybackControls playback={unavailablePlayback} count={0} />}
  </>;
}
