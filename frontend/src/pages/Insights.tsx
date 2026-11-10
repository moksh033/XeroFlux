import { useState } from 'react';
import { useApi } from '../api/client';
import type { DAVQuery, Insight } from '../api/types';
import { AnalysisDrawer } from '../components/AnalysisDrawer';
import { AnalysisExplanation } from '../components/AnalysisExplanation';
import { AnalysisTabs, CorrelationPanel } from '../components/DAVPanels';
import { InsightCard, QueryState, ReportDownload } from '../components/DataPanels';
import { defaultStateId, useFilters } from '../hooks/useFilters';

const sourceDatasets = ['rainfall', 'floods', 'landslides', 'temperature', 'drought'] as const;

export default function Insights() {
  const states = useApi('/api/v1/states');
  const catalog = useApi('/api/v1/metadata');
  const { filters, setFilters } = useFilters();
  const [explanation, setExplanation] = useState<{ scope: string; insight: Insight | null } | null>(null);
  const stateRecords = states.data?.data ?? [];
  const requestedStateId = filters.get('state_id');
  const stateId = (requestedStateId === 'all' ? undefined : requestedStateId) ?? defaultStateId(stateRecords);
  const available = catalog.data?.data.capabilities.available_years;
  const years = [...new Set(sourceDatasets.flatMap(dataset => available?.[dataset] ?? []))].sort((a, b) => a - b);
  const startYear = Number(filters.get('start_year') ?? years[0] ?? 1967);
  const endYear = Number(filters.get('end_year') ?? years.at(-1) ?? 2026);
  const validState = stateRecords.some(state => state.state_id === stateId);
  const validPeriod = years.includes(startYear) && years.includes(endYear) && startYear <= endYear;
  const enabled = validState && validPeriod;
  const stateName = stateRecords.find(state => state.state_id === stateId)?.name ?? stateId;
  const view = filters.get('dav_view') === 'findings' ? 'findings' : 'correlations';
  const scope = `${stateId}:${startYear}:${endYear}:${view}`;
  const selectedInsight = explanation?.scope === scope ? explanation.insight : null;
  const drawerOpen = enabled && explanation?.scope === scope;
  const insights = useApi('/api/v1/insights', { state_id: stateId, start_year: startYear, end_year: endYear }, undefined, enabled && view === 'findings');
  const correlations = useApi('/api/v1/dav', { operation: 'correlations', state_id: stateId, start_year: startYear, end_year: endYear }, undefined, enabled && view === 'correlations');
  const activeMeta = view === 'correlations' ? correlations.data?.meta : insights.data?.meta;
  const auditSources = sourceDatasets.filter(dataset => !selectedInsight || catalog.data?.data.datasets[dataset]?.source_ids?.some(id => selectedInsight.source_ids.includes(id))).map(dataset => {
    const query: DAVQuery = { operation: 'audit', dataset, start_year: startYear, end_year: endYear, ...(dataset === 'temperature' ? { region: stateId } : dataset === 'drought' ? {} : { state_id: stateId }) };
    return { id: dataset, label: dataset === 'drought' ? 'Drought (national)' : dataset, query };
  });
  function openInsight(insight: Insight) { setExplanation({ scope, insight }); }

  return <>
    <header className="page-heading">
      <h1>Insights</h1>
    </header>
    <div className="insights-workbench insights-canvas">
      <section className="insight-findings" aria-labelledby="insight-findings-title">
        <div className="section-head">
          <h2 id="insight-findings-title">{stateName} · {startYear}–{endYear}</h2>
          <button type="button" className="button" disabled={!enabled} onClick={() => setExplanation({ scope, insight: null })}>Explain this analysis</button>
        </div>
        <QueryState query={states} empty={Boolean(states.data) && !stateRecords.length}>
          <QueryState query={catalog}>
            <div className="filter-row">
              <label htmlFor="insight-state">State<select id="insight-state" value={stateId} onChange={event => { setExplanation(null); setFilters({ state_id: event.target.value }); }}>
                {!validState && <option value={stateId}>Select a catalog state</option>}
                {stateRecords.map(state => <option key={state.state_id} value={state.state_id}>{state.name}</option>)}
              </select></label>
              <label htmlFor="insight-start">Start year<select id="insight-start" value={years.includes(startYear) ? startYear : ''} disabled={!years.length} onChange={event => { setExplanation(null); setFilters({ start_year: event.target.value }); }}>
                {!years.includes(startYear) && <option value="">Select an observed year</option>}
                {years.map(year => <option key={year} value={year}>{year}</option>)}
              </select></label>
              <label htmlFor="insight-end">End year<select id="insight-end" value={years.includes(endYear) ? endYear : ''} disabled={!years.length} onChange={event => { setExplanation(null); setFilters({ end_year: event.target.value }); }}>
                {!years.includes(endYear) && <option value="">Select an observed year</option>}
                {years.map(year => <option key={year} value={year} disabled={year < startYear}>{year}</option>)}
              </select></label>
            </div>
            <div className="insight-actions button-row">
              <button type="button" className="button" onClick={() => { setExplanation(null); setFilters({ state_id: undefined, start_year: undefined, end_year: undefined, dav_view: undefined }); }}>Reset</button>
              <ReportDownload stateId={stateId} startYear={startYear} endYear={endYear} disabled={!enabled} />
            </div>
          </QueryState>
        </QueryState>
        <AnalysisTabs label="Insight view" options={[{ id: 'correlations', label: 'Correlations' }, { id: 'findings', label: 'Findings' }]} value={view} onChange={id => { setExplanation(null); setFilters({ dav_view: id }); }}>
          {!enabled ? <p className="empty-state" role="status">Select a state and an ordered period from the available years.</p> : view === 'correlations' ?
            <QueryState query={{ ...correlations, isPending: correlations.isPending || correlations.isFetching }} empty={correlations.data?.status === 'no_data'}>
              {correlations.data?.data?.kind === 'correlations' && <CorrelationPanel key={scope} scopeKey={scope} data={correlations.data.data} title={`${stateName}: annual correlations (${startYear}–${endYear})`} />}
            </QueryState> :
            <QueryState query={{ ...insights, isPending: insights.isPending || insights.isFetching }} empty={insights.data?.status === 'no_data' || (Boolean(insights.data) && !insights.data?.data.length)}>
              <div className="findings-list">{insights.data?.data.map(insight => <InsightCard key={insight.id} insight={insight} onExplain={openInsight} />)}</div>
            </QueryState>}
        </AnalysisTabs>
      </section>
    </div>
    <AnalysisDrawer open={drawerOpen} onClose={() => setExplanation(null)} title={selectedInsight ? `Evidence chain: ${selectedInsight.title}` : 'Explain this analysis'}>
      <AnalysisExplanation
        selectionLabel={`${stateName}, ${startYear}–${endYear}`}
        meta={selectedInsight ? { metric: selectedInsight.title, geographic_level: selectedInsight.geographic_resolution, time_resolution: 'Insight-supported period', period: selectedInsight.period, unit: selectedInsight.unit, observation_count: selectedInsight.observation_count, limitations: selectedInsight.limitations } : activeMeta}
        auditSources={auditSources}
        interpretation={selectedInsight ? <>
          <p>{selectedInsight.region} · {selectedInsight.period.start ?? 'Start unavailable'}–{selectedInsight.period.end ?? 'End unavailable'}</p>
          <p><strong>{selectedInsight.computed_value ?? 'Unavailable'} {selectedInsight.unit ?? '(unit not declared)'}</strong></p>
          <dl>{Object.entries(selectedInsight.statistics).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value ?? 'Unavailable'}</dd></div>)}</dl>
          <p>{selectedInsight.description}</p>
          {!!selectedInsight.limitations.length && <details><summary>Finding limits</summary><ul>{selectedInsight.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></details>}
          <p>Advisory action: review the observations and export this selection for human review.</p>
          <ReportDownload stateId={stateId} startYear={startYear} endYear={endYear} />
        </> : <p>{view === 'correlations' ? 'Select a matrix cell to inspect its paired observations or unavailability reason.' : 'Open a finding’s Evidence chain for its statistics, supported period and audit.'}</p>}
        calculation={<p>{selectedInsight ? `${selectedInsight.observation_count.toLocaleString()} observations support this finding.` : 'Statistics use the selected period and available observations.'} Missing statistics are unavailable, not zero.</p>}
        assumptions={<p>Association is not causation. Uneven reporting and temporal dependence limit interpretation; these are historical findings, not forecasts.</p>}
      />
    </AnalysisDrawer>
  </>;
}
