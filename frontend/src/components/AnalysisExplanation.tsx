import { useId, useState, type ReactNode } from 'react';
import { useApi } from '../api/client';
import type { DAVQuery, Metadata } from '../api/types';
import { AuditPanel } from './DAVPanels';
import { QueryState } from './DataPanels';

export type AuditSource = { id: string; label: string; query: DAVQuery };
export type AnalysisExplanationProps = {
  selectionLabel: string;
  meta?: Metadata;
  interpretation: ReactNode;
  calculation: ReactNode;
  assumptions?: ReactNode;
  children?: ReactNode;
  auditSources: AuditSource[];
};

export function AnalysisExplanation(props: AnalysisExplanationProps) {
  // Remount local audit state on any actual sample change, including a changed
  // query behind the same source ID. Never retain a previous scope's audit.
  const scope = JSON.stringify([props.selectionLabel, props.auditSources]);
  return <ExplanationBody key={scope} {...props} />;
}

function ExplanationBody({ selectionLabel, interpretation, calculation, assumptions, children, auditSources }: AnalysisExplanationProps) {
  const [sourceId, setSourceId] = useState(auditSources[0]?.id ?? '');
  const [auditOpen, setAuditOpen] = useState(false);
  const source = auditSources.find(item => item.id === sourceId);
  const audit = useApi('/api/v1/dav', source?.query, undefined, auditOpen && source !== undefined);
  const auditData = audit.data?.data?.kind === 'audit' ? audit.data.data : undefined;
  const auditRegion = useId();
  return <div className="analysis-explanation">
    <p className="dav-selection"><strong>Selected sample:</strong> {selectionLabel}</p>
        {interpretation != null && <section className="analysis-explanation-section"><h3>Interpretation</h3>{interpretation}</section>}
        {calculation != null && <section className="analysis-explanation-section"><h3>Calculation</h3>{calculation}</section>}
        <section className="analysis-explanation-section">
          {(assumptions != null || children != null) && <><h3>Data & assumptions</h3>{assumptions}{children}</>}
          <div className="dav-audit-controls">
            <label>Audit source<select value={sourceId} disabled={!auditSources.length} onChange={event => { setSourceId(event.target.value); setAuditOpen(false); }}>
              {auditSources.length ? auditSources.map(item => <option key={item.id} value={item.id}>{item.label}</option>) : <option value="">No supported source selection</option>}
            </select></label>
            <button className="button" type="button" disabled={!source} aria-expanded={auditOpen} aria-controls={auditRegion} onClick={() => setAuditOpen(current => !current)}>Quality audit</button>
          </div>
          <p>Audit covers filtered prepared records, not excluded ingestion rows.</p>
          {!source && <p>Select a supported source scope before requesting a quality audit.</p>}
          <div id={auditRegion}>{auditOpen && source && <section aria-label={'Quality audit of ' + source.label}>
            <p><strong>{source.label}</strong> · {selectionLabel}</p>
            <QueryState query={audit} empty={audit.data?.status === 'no_data'}>{auditData && <AuditPanel data={auditData} meta={audit.data?.meta} />}</QueryState>
          </section>}</div>
        </section>
  </div>;
}

