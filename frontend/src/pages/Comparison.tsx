import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api/client';
import type { DAVQuery } from '../api/types';
import { AnalysisDrawer } from '../components/AnalysisDrawer';
import { AnalysisExplanation } from '../components/AnalysisExplanation';
import { AnalysisTabs, RelationshipPanel, SpreadPanel, TestPanel } from '../components/DAVPanels';
import { QueryState } from '../components/DataPanels';
import { DataBar } from '../components/Executive';
import { defaultStateId, useFilters } from '../hooks/useFilters';

const comparisonDatasets: Record<string, string> = {
  rainfall_annual_total: 'rainfall',
  rainfall_anomaly: 'rainfall',
  flood_event_count: 'floods',
  landslide_event_count: 'landslides',
};

const comparisonViews = [
  { id: 'trend', label: 'Trend' },
  { id: 'spread', label: 'Spread' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'test', label: 'Test' },
];

function supplied(value: number | null | undefined, unit?: string | null): string {
  return value == null ? 'Not supplied' : `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
}

export default function Comparison() {
  const states = useApi('/api/v1/states');
  const catalog = useApi('/api/v1/metadata');
  const { filters, setFilters } = useFilters();
  const [explanationOpen, setExplanationOpen] = useState(false);
  const stateRecords = states.data?.data ?? [];
  const inheritedStateId = filters.get('state_id');
  const stateA = filters.get('state_a') ?? (inheritedStateId === 'all' ? undefined : inheritedStateId) ?? defaultStateId(stateRecords);
  const defaultStateB = stateRecords.find((state) => state.state_id === '21' && state.state_id !== stateA)
    ?? stateRecords.find((state) => state.state_id !== stateA);
  const stateB = filters.get('state_b') ?? defaultStateB?.state_id ?? '';
  const capabilities = catalog.data?.data.capabilities;
  const advertisedMetrics = capabilities?.comparison_metrics ?? [];
  const metrics = advertisedMetrics.filter((metric) => Object.hasOwn(comparisonDatasets, metric));
  const metric = filters.get('metric') ?? metrics[0] ?? '';
  const dataset = comparisonDatasets[metric];
  const years = [...new Set((dataset ? capabilities?.available_years?.[metric] ?? capabilities?.available_years?.[dataset] : []) ?? [])].sort((a, b) => a - b);
  const startYear = Number(filters.get('start_year') ?? years[0]);
  const endYear = Number(filters.get('end_year') ?? years.at(-1));
  const validStates = stateA !== stateB && stateRecords.some((state) => state.state_id === stateA) && stateRecords.some((state) => state.state_id === stateB);
  const validMetric = metrics.includes(metric);
  const validPeriod = years.includes(startYear) && years.includes(endYear) && startYear <= endYear;
  const enabled = validStates && validMetric && validPeriod;
  const requestedView = filters.get('dav_view');
  const view = comparisonViews.some((option) => option.id === requestedView) ? requestedView! : 'trend';
  const selection = { state_a: stateA, state_b: stateB, metric, start_year: startYear, end_year: endYear };
  const comparison = useApi('/api/v1/compare', selection, undefined, enabled && view === 'trend');
  const dav = useApi('/api/v1/dav', { operation: 'comparison', ...selection }, undefined, enabled && view !== 'trend');
  const activeQuery = view === 'trend' ? comparison : dav;
  const responseIsCurrent = enabled && !activeQuery.isFetching && !activeQuery.error;
  const analysis = responseIsCurrent && view !== 'trend' && dav.data?.data?.kind === 'comparison' ? dav.data.data : undefined;
  const candidate = responseIsCurrent ? (view === 'trend' ? comparison.data?.data : analysis?.comparison) : undefined;
  const result = candidate?.state_a === stateA && candidate.state_b === stateB && candidate.metric === metric
    && candidate.period.start === String(startYear) && candidate.period.end === String(endYear) ? candidate : undefined;
  const currentAnalysis = result ? analysis : undefined;
  const currentMeta = result ? activeQuery.data?.meta : undefined;
  const stateName = (id: string) => stateRecords.find((state) => state.state_id === id)?.name ?? id;
  const unavailableReason = !advertisedMetrics.length
    ? 'No comparison metrics are available.'
    : !metrics.length
      ? 'No supported state comparison is available.'
      : !validStates
        ? 'Select two different states.'
        : !validMetric
          ? 'Select an available metric.'
          : !validPeriod
            ? 'Select an ordered period from the available years.'
            : '';
  const auditSources: { id: string; label: string; query: DAVQuery }[] = enabled && dataset ? [
    { id: 'state-a', label: `A: ${stateName(stateA)}`, query: { operation: 'audit', dataset: dataset as DAVQuery['dataset'], state_id: stateA, start_year: startYear, end_year: endYear } },
    { id: 'state-b', label: `B: ${stateName(stateB)}`, query: { operation: 'audit', dataset: dataset as DAVQuery['dataset'], state_id: stateB, start_year: startYear, end_year: endYear } },
  ] : [];
  const isCount = result?.metric === 'flood_event_count' || result?.metric === 'landslide_event_count';
  const seriesMax = Math.max(0, ...(result?.series.flatMap((point) => [point.state_a, point.state_b, point.absolute_difference].filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).map((v) => Math.abs(v))) ?? []));
  const chartAxes = <>
    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
    <XAxis dataKey="year" stroke="var(--muted)" />
    <YAxis stroke="var(--muted)" domain={isCount ? [0, 'auto'] : ['auto', 'auto']} allowDecimals={!isCount} />
    <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text)' }} labelStyle={{ color: 'var(--text)' }} />
    <Legend />
  </>;

  return (
    <div className="comparison-workbench">
      <header className="page-heading">
        <h1>State comparison</h1>
      </header>
      <section className="work-section comparison-canvas" aria-labelledby="comparison-chart-title">
        <div className="dav-heading">
          <h2 id="comparison-chart-title">Annual state observations</h2>
          <button type="button" className="button" disabled={!enabled} onClick={() => setExplanationOpen(true)}>Explain this analysis</button>
        </div>
        <QueryState query={states} empty={Boolean(states.data) && stateRecords.length === 0}>
          <QueryState query={catalog}>
            <div className="filter-row">
              <label htmlFor="comparison-state-a">State A
                <select id="comparison-state-a" value={stateA} onChange={(event) => setFilters({ state_a: event.target.value, state_b: stateB })}>
                  {!stateRecords.some((state) => state.state_id === stateA) && <option value={stateA}>Select a catalog state</option>}
                  {stateRecords.map((state) => <option key={state.state_id} value={state.state_id}>{state.name}</option>)}
                </select>
              </label>
              <label htmlFor="comparison-state-b">State B
                <select id="comparison-state-b" value={stateB} onChange={(event) => setFilters({ state_a: stateA, state_b: event.target.value })}>
                  {!stateRecords.some((state) => state.state_id === stateB) && <option value={stateB}>Select a different catalog state</option>}
                  {stateRecords.map((state) => <option key={state.state_id} value={state.state_id}>{state.name}</option>)}
                </select>
              </label>
              <label htmlFor="comparison-metric">Metric
                <select id="comparison-metric" value={validMetric ? metric : ''} disabled={!metrics.length} aria-describedby={unavailableReason ? 'comparison-disabled-reason' : undefined} onChange={(event) => setFilters({ metric: event.target.value, start_year: undefined, end_year: undefined })}>
                  {!validMetric && <option value="">No comparable metric selected</option>}
                  {metrics.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
              <label htmlFor="comparison-start">Start year
                <select id="comparison-start" value={years.includes(startYear) ? startYear : ''} disabled={!validMetric || !years.length} onChange={(event) => setFilters({ start_year: event.target.value })}>
                  {!years.includes(startYear) && <option value="">Supported years unavailable</option>}
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label htmlFor="comparison-end">End year
                <select id="comparison-end" value={years.includes(endYear) ? endYear : ''} disabled={!validMetric || !years.length} onChange={(event) => setFilters({ end_year: event.target.value })}>
                  {!years.includes(endYear) && <option value="">Supported years unavailable</option>}
                  {years.map((year) => <option key={year} value={year} disabled={year < startYear}>{year}</option>)}
                </select>
              </label>
            </div>
            {unavailableReason && <p id="comparison-disabled-reason" role="status">{unavailableReason}</p>}
            <div className="button-row">
              <button type="button" className="button primary" disabled={!enabled || activeQuery.isFetching} onClick={() => void activeQuery.refetch()}>Compare states</button>
              <button type="button" className="button" onClick={() => setFilters({ state_a: undefined, state_b: undefined, state_id: undefined, metric: undefined, start_year: undefined, end_year: undefined, dav_view: undefined })}>Reset</button>
            </div>
          </QueryState>
        </QueryState>
        <AnalysisDrawer open={explanationOpen} onClose={() => setExplanationOpen(false)} title="Explain this analysis">
        <AnalysisExplanation
          selectionLabel={`${stateName(stateA)} / ${stateName(stateB)}; ${metric.replaceAll('_', ' ')}; ${startYear}–${endYear}`}
          meta={currentMeta}
          interpretation={<p>Observed differences do not establish which state is safer. Association is not causation.</p>}
          calculation={view === 'test' ? <details><summary>Test formula</summary><p>sp² = ((nA−1)sA² + (nB−1)sB²)/(nA+nB−2); t = (meanA−meanB)/(sp × √(1/nA+1/nB)); df = nA+nB−2. Two-sided p uses the Student-t distribution; α = 0.05.</p></details> : <p>Annual observations for the selected states and period. Missing values are not zero.</p>}
          assumptions={<p>Independence and equal variance are not established; reporting differs. A failure to reject H₀ does not establish equality.</p>}
          auditSources={auditSources}
        />
        </AnalysisDrawer>
        <AnalysisTabs label="Comparison view" options={comparisonViews} value={view} onChange={(dav_view) => setFilters({ dav_view })}>
          {enabled ? <QueryState query={{ ...activeQuery, isPending: activeQuery.isPending || activeQuery.isFetching }} empty={activeQuery.data?.status === 'no_data'}>
            {result ? <>
              <p className="muted">{stateName(result.state_a)} / {stateName(result.state_b)} · {startYear}–{endYear} · {result.unit ?? 'Unit not declared'} · Missing values are not zero</p>
              {view === 'trend' && <div className="chart-canvas dav-body" role="img" aria-label={`${isCount ? 'Grouped event-count bars' : 'Rainfall lines'} for ${stateName(result.state_a)} and ${stateName(result.state_b)}. Exact values are available under Annual values.`}>
                <ResponsiveContainer width="100%" height="100%">
                  {isCount ? <BarChart data={result.series} margin={{ top: 15, right: 20, bottom: 15, left: 5 }}>
                    {chartAxes}
                    <Bar dataKey="state_a" name={`A: ${stateName(result.state_a)}`} fill="var(--rainfall)" isAnimationActive={false} />
                    <Bar dataKey="state_b" name={`B: ${stateName(result.state_b)}`} fill="var(--cyclone)" stroke="var(--text)" strokeDasharray="5 3" isAnimationActive={false} />
                  </BarChart> : <LineChart data={result.series} margin={{ top: 15, right: 20, bottom: 15, left: 5 }}>
                    {chartAxes}
                    <Line type="linear" dataKey="state_a" name={`A: ${stateName(result.state_a)}`} stroke="var(--rainfall)" strokeWidth={2} connectNulls={false} isAnimationActive={false} />
                    <Line type="linear" dataKey="state_b" name={`B: ${stateName(result.state_b)}`} stroke="var(--cyclone)" strokeWidth={2} strokeDasharray="5 3" connectNulls={false} isAnimationActive={false} />
                  </LineChart>}
                </ResponsiveContainer>
              </div>}
              {view === 'spread' && currentAnalysis && <SpreadPanel data={currentAnalysis} unit={result.unit} labelA={stateName(result.state_a)} labelB={stateName(result.state_b)} />}
              {view === 'relationship' && currentAnalysis && <RelationshipPanel data={{ points: currentAnalysis.points, regression: currentAnalysis.regression, x_label: `A: ${stateName(result.state_a)}`, y_label: `B: ${stateName(result.state_b)}`, x_unit: result.unit, y_unit: result.unit }} />}
              {view === 'test' && currentAnalysis && <TestPanel data={currentAnalysis} unit={result.unit} labelA={stateName(result.state_a)} labelB={stateName(result.state_b)} />}
              <dl className="comparison-summary" aria-label="Comparison summary">
                <div><dt>{stateName(result.state_a)}</dt><dd>{supplied(result.state_a_value, result.unit)}</dd></div>
                <div><dt>{stateName(result.state_b)}</dt><dd>{supplied(result.state_b_value, result.unit)}</dd></div>
                <div><dt>Absolute difference</dt><dd>{supplied(result.absolute_difference, result.unit)}</dd></div>
                <div><dt>Percentage difference (A baseline)</dt><dd>{supplied(result.percentage_difference, '%')}</dd></div>
              </dl>
              <details className="dav-derived">
                <summary>Annual values · {result.series.length} years</summary>
                <p className="muted">Missing values are not zero. Differences and percentages are supplied by the analysis.</p>
                <div className="table-scroll"><table>
                  <caption>Annual series · {result.unit ?? 'Unit not declared'}</caption>
                  <thead><tr><th scope="col">Year</th><th scope="col">{stateName(result.state_a)}</th><th scope="col">{stateName(result.state_b)}</th><th scope="col">Absolute difference</th><th scope="col">Percentage difference</th></tr></thead>
                  <tbody>{result.series.map((point) => <tr key={point.year}><th scope="row">{point.year}</th><td><DataBar value={point.state_a} max={seriesMax} tone="a" /></td><td><DataBar value={point.state_b} max={seriesMax} tone="b" /></td><td><DataBar value={point.absolute_difference} max={seriesMax} tone="a" /></td><td>{supplied(point.percentage_difference, '%')}</td></tr>)}</tbody>
                </table></div>
              </details>
              <a className="button" href={`#/insights?state_id=${encodeURIComponent(result.state_a)}&start_year=${startYear}&end_year=${endYear}&dav_view=findings`}>Findings for {stateName(result.state_a)}</a>
            </> : <p role="status">No result matches the selected states, metric and period.</p>}
          </QueryState> : <p className="muted">Choose two states, a metric and an available period.</p>}
        </AnalysisTabs>
      </section>
    </div>
  );
}
