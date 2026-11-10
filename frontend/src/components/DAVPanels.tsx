import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { AuditPayload, ComparisonDAVPayload, CorrelationsPayload, CountsPayload, Distribution, DistributionPayload, Metadata, PairPoint, RelationshipPayload } from '../api/types';
import { DataBar } from './Executive';

type Common = { meta?: Metadata; title?: string; unit?: string | null; compact?: boolean; color?: string };
const number = (value: number | null | undefined, digits = 4) => value == null ? 'Unavailable' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
const precise = (value: number | null | undefined) => value == null ? 'Unavailable' : String(value);
function Value({ value, suffix = '' }: { value: number | null | undefined; suffix?: string }) {
  return <span tabIndex={0} className="dav-value" title={precise(value) + (suffix ? ' ' + suffix : '')} aria-label={precise(value) + (suffix ? ' ' + suffix : '')}>{number(value)}{value != null && suffix ? ' ' + suffix : ''}</span>;
}
function DerivedTable({ caption, children }: { caption: string; children: ReactNode }) {
  return <details className="dav-derived"><summary>{caption}</summary><div className="table-scroll"><table><caption className="sr-only">{caption}</caption>{children}</table></div></details>;
}
export function AnalysisTabs({ label, options, value, onChange, children }: { label: string; options: { id: string; label: string; disabled?: boolean }[]; value: string; onChange: (id: string) => void; children?: ReactNode }) {
  const id = useId();
  const refs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [transition, setTransition] = useState(0);
  function select(next: string) { if (next !== value) { setTransition(current => current + 1); onChange(next); } }
  function key(event: KeyboardEvent<HTMLButtonElement>) {
    const enabled = options.filter(option => !option.disabled);
    const index = enabled.findIndex(option => option.id === value);
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % enabled.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else return;
    event.preventDefault();
    if (enabled[next]) { select(enabled[next].id); refs.current.get(enabled[next].id)?.focus(); }
  }
  return <div className="dav-tabs-host"><div className="dav-tabs" role="tablist" aria-label={label}>{options.map(option => <button key={option.id} ref={element => { if (element) refs.current.set(option.id, element); else refs.current.delete(option.id); }} id={id + '-tab-' + option.id} aria-controls={id + '-panel-' + option.id} role="tab" type="button" aria-selected={value === option.id} tabIndex={value === option.id ? 0 : -1} disabled={option.disabled} onKeyDown={key} onClick={() => select(option.id)}>{option.label}</button>)}</div>{children !== undefined && <div key={transition} className={transition ? 'dav-view dav-view-changed' : 'dav-view'} id={id + '-panel-' + value} role="tabpanel" aria-labelledby={id + '-tab-' + value} tabIndex={0}>{children}</div>}</div>;
}

function DistributionSummary({ summary, unit }: { summary: Distribution; unit?: string | null }) {
  return <dl className="dav-stat-grid"><dt>Valid n / missing</dt><dd>{summary.n} / {summary.missing}</dd><dt>Mean / median</dt><dd><Value value={summary.mean} /> / <Value value={summary.median} /></dd><dt>Sample variance s²</dt><dd><Value value={summary.variance} suffix={unit ? '(' + unit + ')²' : 'unit unspecified, squared'} /></dd><dt>Sample SD s</dt><dd><Value value={summary.std} suffix={unit ?? 'unit unspecified'} /></dd></dl>;
}
export function DistributionPanel({ data, meta, title = 'Distribution', unit = meta?.unit, compact, color = 'var(--dav-series-color, var(--rainfall))' }: Common & { data: DistributionPayload }) {
  const [width, setWidth] = useState(400);
  const s = data.summary;
  const bins = s.bins.map((bin, index) => ({ ...bin, center: (bin.lower + bin.upper) / 2, final: index === s.bins.length - 1 }));
  const domain: [number, number] = bins.length ? [bins[0].lower, bins[bins.length - 1].upper] : [0, 1];
  const overlap = s.mean != null && s.median != null && Math.abs(s.mean - s.median) < (domain[1] - domain[0]) * .08;
  return <section className={'dav-panel' + (compact ? ' dav-compact' : '')} style={{ '--dav-color': color } as CSSProperties}><h2>{title}</h2><p>Equal-width histogram · {unit ?? 'Unit not declared'} · n={s.n}; k={bins.length}</p><div className="dav-body"><div className="dav-chart" role="img" aria-label={'Histogram of ' + s.n + ' observations. Numeric bin intervals and frequencies are in the derived table.'}><ResponsiveContainer width="100%" height="100%" onResize={nextWidth => setWidth(nextWidth)}><BarChart data={bins} margin={{ left: 8, right: 14, top: 30, bottom: 24 }} barCategoryGap={0} barGap={0}>
    <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="center" type="number" scale="linear" domain={domain} allowDataOverflow stroke="var(--muted)" tick={{ fontSize: 11 }} tickFormatter={value => number(Number(value), 2)} label={{ value: unit ?? 'Observed value (unit unspecified)', position: 'insideBottom', offset: -16, fill: 'var(--muted)', fontSize: 11 }} /><YAxis width={48} domain={[0, 'auto']} allowDecimals={false} stroke="var(--muted)" tick={{ fontSize: 11 }} label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 11 }} />
    <Tooltip cursor={{ fill: 'var(--accent-soft)' }} content={({ active, payload }) => { const bin = payload?.[0]?.payload as typeof bins[number] | undefined; return active && bin ? <div className="dav-tooltip"><strong>[{precise(bin.lower)}, {precise(bin.upper)}{bin.final ? ']' : ')'}</strong><p>{bin.final ? 'Both endpoints included' : 'Lower included; upper excluded'}</p><p>{bin.count} observations ({number(s.n ? bin.count / s.n * 100 : 0, 2)}%); n={s.n}; k={bins.length}</p><p>Mean {precise(s.mean)}; median {precise(s.median)}</p></div> : null; }} />
    <Bar dataKey="count" name="Frequency" fill="var(--dav-color)" stroke="var(--text)" strokeWidth={.6} barSize={Math.max(1, (width - 70) / Math.max(1, bins.length))} isAnimationActive={false} />
    {s.mean != null && <ReferenceLine x={s.mean} stroke="var(--text)" strokeWidth={2} label={overlap ? undefined : { value: 'Mean', position: 'top', fill: 'var(--text)', fontSize: 11 }} />}{s.median != null && <ReferenceLine x={s.median} stroke="var(--text)" strokeDasharray="5 3" strokeWidth={2} label={overlap ? undefined : { value: 'Median', position: 'insideTopRight', fill: 'var(--text)', fontSize: 11 }} />}
  </BarChart></ResponsiveContainer></div><p className="dav-legend">{overlap ? 'Mean / median markers overlap: ' : ''}<span className="dav-line-key">Mean (solid) {number(s.mean)}</span>; <span className="dav-line-key dashed">median (dashed) {number(s.median)}</span></p><DistributionSummary summary={s} unit={unit} /><DerivedTable caption="Derived histogram bins"><thead><tr><th scope="col">Interval</th><th scope="col">Frequency</th><th scope="col">Percentage</th></tr></thead><tbody>{bins.map(bin => <tr key={bin.lower}><th scope="row">[{precise(bin.lower)}, {precise(bin.upper)}{bin.final ? ']' : ')'}</th><td>{bin.count}</td><td>{number(s.n ? bin.count / s.n * 100 : 0, 2)}%</td></tr>)}</tbody></DerivedTable></div></section>;
}

type BoxSeries = { label: string; summary: Distribution; identity?: 'a' | 'b' };
function Boxplots({ series, unit }: { series: BoxSeries[]; unit?: string | null }) {
  const id = useId();
  const [focused, setFocused] = useState<{ series: BoxSeries[]; text: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hitSize, setHitSize] = useState(44);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const resize = () => {
      const width = svg.getBoundingClientRect().width;
      if (width > 0) setHitSize(44 * 610 / width);
    };
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(resize);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const bounds = series.flatMap(row => [row.summary.min, row.summary.max]).filter((v): v is number => v != null);
  const low = bounds.length ? Math.min(...bounds) : 0;
  const high = bounds.length ? Math.max(...bounds) : 1;
  const pad = high === low ? Math.max(1, Math.abs(low) * .01) : (high - low) * .06;
  const min = low - pad, max = high + pad;
  const x = (value: number) => 100 + (value - min) / (max - min) * 480;
  const axisY = 44 + series.length * 72;
  function outlierText(row: BoxSeries, point: Distribution['outliers'][number]) { const s = row.summary; return row.label + ': IQR outlier ' + point.label + ' [' + point.id + '], value ' + precise(point.value) + '. Q1=' + precise(s.q1) + ', Q3=' + precise(s.q3) + ', IQR=' + precise(s.iqr) + '. ' + (s.lower_fence != null && point.value < s.lower_fence ? precise(point.value) + ' < Q1 − 1.5×IQR = ' + precise(s.lower_fence) : precise(point.value) + ' > Q3 + 1.5×IQR = ' + precise(s.upper_fence)); }
  const outlierCount = series.reduce((sum, row) => sum + row.summary.outliers.length, 0);
  return <><svg ref={svgRef} className="dav-boxplot" viewBox={'0 0 610 ' + (axisY + 45)} aria-labelledby={id + '-title ' + id + '-desc'}>
    <title id={id + '-title'}>Boxplots on a common numeric axis</title><desc id={id + '-desc'}>Boxes span Q1 to Q3; solid center line is median. Whiskers are actual in-fence observations. Hollow diamonds identify IQR outliers. Exact summaries and identities follow in tables.</desc>
    {series.map((row, index) => {
      const s = row.summary;
      const y = 48 + index * 72;
      const color = row.identity === 'b' ? 'var(--cyclone)' : row.identity === 'a' ? 'var(--rainfall)' : 'var(--dav-color, var(--dav-series-color, var(--rainfall)))';
      return <g key={row.label} style={{ color }}>
        <text x={4} y={y + 4} fill="var(--text)" fontSize={12}>{row.label}</text>
        {s.whisker_low != null && s.whisker_high != null && <><line x1={x(s.whisker_low)} x2={x(s.whisker_high)} y1={y} y2={y} stroke="currentColor" strokeWidth={2} strokeDasharray={row.identity === 'b' ? '5 3' : undefined} />{[s.whisker_low, s.whisker_high].map((v, i) => <line key={i} x1={x(v)} x2={x(v)} y1={y - 9} y2={y + 9} stroke="currentColor" strokeWidth={2} />)}</>}
        {s.q1 != null && s.q3 != null && <rect x={x(s.q1)} y={y - 15} width={Math.max(1, x(s.q3) - x(s.q1))} height={30} fill="var(--surface)" stroke="currentColor" strokeWidth={2} strokeDasharray={row.identity === 'b' ? '5 3' : undefined} />}
        {s.median != null && <line x1={x(s.median)} x2={x(s.median)} y1={y - 15} y2={y + 15} stroke="var(--text)" strokeWidth={2} />}
        {s.outliers.map(point => <g key={point.id} tabIndex={0} role="img" aria-label={outlierText(row, point)}
          onFocus={() => setFocused({ series, text: outlierText(row, point) })} onBlur={() => setFocused(null)}
          onMouseEnter={() => setFocused({ series, text: outlierText(row, point) })} onMouseLeave={() => setFocused(null)}>
          <title>{outlierText(row, point)}</title><rect x={x(point.value) - hitSize / 2} y={y - hitSize / 2} width={hitSize} height={hitSize} fill="transparent" /><path d={'M' + x(point.value) + ' ' + (y - 6) + 'l6 6 -6 6 -6 -6Z'} fill="var(--surface)" stroke="var(--outlier)" strokeWidth={2} />
        </g>)}
      </g>;
    })}
    <line x1={100} x2={580} y1={axisY} y2={axisY} stroke="var(--muted)" />{Array.from({ length: 5 }, (_, i) => min + (max - min) * i / 4).map(tick => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1={axisY} y2={axisY + 5} stroke="var(--muted)" /><text x={x(tick)} y={axisY + 20} textAnchor="middle" fill="var(--text)" fontSize={11}>{number(tick, 2)}</text></g>)}
    <text x={340} y={axisY + 39} textAnchor="middle" fill="var(--text)" fontSize={11}>{unit ?? 'Observed value (unit not declared)'}</text>
  </svg>
  <p className="dav-mark-detail" role="status">{focused?.series === series ? focused.text : outlierCount ? 'Focus a hollow diamond for its source identity and exact fence inequality.' : '0 observations outside the fences.'}</p>
  <DerivedTable caption="Derived boxplot summaries and observed extrema"><thead><tr><th scope="col">Series</th>{['Observed min', 'Q1', 'Median', 'Q3', 'Observed max', 'Whisker low', 'Whisker high', 'Lower fence', 'Upper fence', 'IQR', 'n'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{series.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{[row.summary.min, row.summary.q1, row.summary.median, row.summary.q3, row.summary.max, row.summary.whisker_low, row.summary.whisker_high, row.summary.lower_fence, row.summary.upper_fence, row.summary.iqr, row.summary.n].map((value, i) => <td key={i}><Value value={value} /></td>)}</tr>)}</tbody></DerivedTable>
  <DerivedTable caption="Derived IQR outlier flags with source identities"><thead><tr><th scope="col">Source observation</th><th scope="col">Value and flag</th></tr></thead><tbody>{series.flatMap(row => row.summary.outliers.map(point => <tr key={row.label + point.id}><th scope="row">{point.label}<small className="dav-source-id">{point.id}</small></th><td>{outlierText(row, point)}</td></tr>))}</tbody></DerivedTable>
  </>;
}
export function DistributionDetails({ data, unit, title = 'Boxplot & shape', color = 'var(--dav-series-color, var(--rainfall))' }: { data: DistributionPayload; unit?: string | null; title?: string; color?: string }) {
  const s = data.summary;
  return <section className="dav-distribution-details" style={{ '--dav-color': color } as CSSProperties}><h3>{title}</h3><Boxplots series={[{ label: 'Selected sample', summary: s }]} unit={unit} /><DistributionSummary summary={s} unit={unit} /><dl className="dav-stat-grid"><dt>Bowley skewness</dt><dd><Value value={s.bowley} /></dd><dt>Kelly skewness</dt><dd><Value value={s.kelly} /></dd><dt>Unbiased Fisher excess kurtosis</dt><dd><Value value={s.excess_kurtosis} /></dd><dt>Descriptive shape class</dt><dd>{s.kurtosis_class === 'mesokurtic' ? 'Approximately mesokurtic' : s.kurtosis_class ?? 'Unavailable'}</dd></dl></section>;
}
export function SpreadPanel({ data, meta, title = 'Annual observation spread', unit = meta?.unit, compact, labelA = 'State A', labelB = 'State B' }: Common & { data: ComparisonDAVPayload; labelA?: string; labelB?: string }) {
  return <section className={'dav-panel dav-comparison' + (compact ? ' dav-compact' : '')}><h2>{title}</h2><p>A: {labelA} (blue solid); B: {labelB} (violet dashed). Common numeric axis · {unit ?? 'Unit not declared'}</p><div className="dav-body"><Boxplots series={[{ label: 'A', summary: data.a, identity: 'a' }, { label: 'B', summary: data.b, identity: 'b' }]} unit={unit} /><h3>A: {labelA}</h3><DistributionSummary summary={data.a} unit={unit} /><h3>B: {labelB}</h3><DistributionSummary summary={data.b} unit={unit} /></div></section>;
}

type RelationshipData = Pick<RelationshipPayload, 'points' | 'regression' | 'x_label' | 'y_label'> & { x_unit?: string | null; y_unit?: string | null };
export function RelationshipPanel({ data, title = 'Relationship', compact, color = 'var(--dav-series-color, var(--rainfall))' }: Common & { data: RelationshipData }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { points, regression: r } = data;
  const xLabel = data.x_label + ' (' + (data.x_unit ?? 'unit not declared') + ')';
  const yLabel = data.y_label + ' (' + (data.y_unit ?? 'unit not declared') + ')';
  const fitted = (point: PairPoint) => r.slope != null && r.intercept != null ? r.slope * point.x + r.intercept : null;
  const detail = (point: PairPoint) => point.label + ' [' + point.id + ']: x=' + precise(point.x) + ', y=' + precise(point.y) + '; fitted=' + precise(fitted(point)) + '; residual=' + precise(fitted(point) == null ? null : point.y - fitted(point)!);
  const xValues = points.map(point => point.x);
  const endpoints = points.length && r.slope != null && r.intercept != null ? [Math.min(...xValues), Math.max(...xValues)].map(x => ({ x, y: r.slope! * x + r.intercept! })) : [];
  const active = points.find(point => point.id === activeId);
  return <section className={'dav-panel' + (compact ? ' dav-compact' : '')} style={{ '--dav-color': color } as CSSProperties}>
    <h2>{title}</h2>
    <div className="dav-body"><div className="dav-chart" role="group" aria-label={xLabel + ' versus ' + yLabel + '. Focus points for source and residual details.'}><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, left: 12, right: 18, bottom: 42 }}>
      <CartesianGrid stroke="var(--border)" /><XAxis type="number" dataKey="x" name={data.x_label} domain={['auto', 'auto']} tick={{ fontSize: 11 }} stroke="var(--muted)" label={{ value: xLabel, position: 'insideBottom', offset: -26, fill: 'var(--text)', fontSize: 11 }} /><YAxis type="number" dataKey="y" name={data.y_label} domain={['auto', 'auto']} width={56} tick={{ fontSize: 11 }} stroke="var(--muted)" label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--text)', fontSize: 11 }} />
      <Tooltip content={({ active: shown, payload }) => { const point = payload?.[0]?.payload as PairPoint | undefined; return shown && point?.id ? <div className="dav-tooltip">{detail(point)}</div> : null; }} />
      <Scatter name="Complete source pairs" data={points} fill="var(--dav-color)" isAnimationActive={false} shape={(props: unknown) => {
        const dot = props as { cx?: number; cy?: number; payload?: PairPoint };
        if (!dot.payload) return <g />;
        const point = dot.payload;
        return <g tabIndex={0} role="img" aria-label={detail(point)} onFocus={() => setActiveId(point.id)} onBlur={() => setActiveId(null)} onMouseEnter={() => setActiveId(point.id)} onMouseLeave={() => setActiveId(null)}><title>{detail(point)}</title><circle cx={dot.cx} cy={dot.cy} r={22} fill="transparent" /><circle cx={dot.cx} cy={dot.cy} r={4.5} fill="var(--dav-color)" stroke="var(--text)" strokeWidth={.8} /></g>;
      }} />
      {endpoints.length > 0 && <Scatter name="OLS fitted line (observed x range only)" data={endpoints} line={{ stroke: 'var(--text)', strokeWidth: 2, strokeDasharray: '5 3' }} shape={() => <g />} isAnimationActive={false} />}
    </ScatterChart></ResponsiveContainer></div>
    <p>{r.slope != null && r.intercept != null ? <>OLS: y = <Value value={r.slope} />x + <Value value={r.intercept} /></> : 'OLS coefficients unavailable'}; r=<Value value={r.r} />; R²=<Value value={r.r_squared} />; n={r.n}</p>
    <p className="dav-mark-detail" role="status">{active ? detail(active) : 'Focus an observation for its identity, fitted value and residual.'}</p>{r.reason && <p>{r.reason}</p>}
    <DerivedTable caption="Derived matched pairs, fitted values & residuals"><thead><tr><th scope="col">Source identity</th><th scope="col">{xLabel}</th><th scope="col">{yLabel}</th><th scope="col">Fitted y</th><th scope="col">Residual y − fitted</th></tr></thead><tbody>{points.map(point => <tr key={point.id}><th scope="row">{point.label}<small className="dav-source-id">{point.id}</small></th><td><Value value={point.x} /></td><td><Value value={point.y} /></td><td><Value value={fitted(point)} /></td><td><Value value={fitted(point) == null ? null : point.y - fitted(point)!} /></td></tr>)}</tbody></DerivedTable>
    </div>
  </section>;
}
export function TestPanel({ data, meta, title = 'Pooled two-sided Student t-test', unit = meta?.unit, compact, labelA = 'State A', labelB = 'State B' }: Common & { data: ComparisonDAVPayload; labelA?: string; labelB?: string }) {
  const t = data.test;
  const decision = t.decision === 'reject' ? 'Reject H₀' : t.decision === 'fail_to_reject' ? 'Fail to reject H₀' : 'Unavailable';
  return <section className={'dav-panel dav-comparison' + (compact ? ' dav-compact' : '')}><h2>{title}</h2><p className="dav-assumption">Assumption-dependent model on documented counts; independence/equal variance not established; reporting differs</p><div className="dav-body"><p>H₀: μA = μB; H₁: μA ≠ μB. A: {labelA}; B: {labelB}.</p><div className="table-scroll"><table><caption>Model inputs and result · {unit ?? 'Unit not declared'}</caption><thead><tr><th scope="col">Statistic</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody>{[['n', t.n_a, t.n_b], ['Mean', t.mean_a, t.mean_b], ['Sample variance s²', t.variance_a, t.variance_b], ['Sample SD s', data.a.std, data.b.std]].map(([label, a, b]) => <tr key={String(label)}><th scope="row">{label}{label === 'Sample variance s²' ? ' (' + (unit ?? 'unit unspecified') + ')²' : label === 'Mean' || label === 'Sample SD s' ? ' (' + (unit ?? 'unit unspecified') + ')' : ''}</th><td><Value value={a as number | null} /></td><td><Value value={b as number | null} /></td></tr>)}</tbody></table></div><dl className="dav-stat-grid"><dt>Pooled SD sₚ</dt><dd><Value value={t.pooled_sd} suffix={unit ?? 'unit unspecified'} /></dd><dt>t / df</dt><dd><Value value={t.t} /> / <Value value={t.df} /></dd><dt>Two-sided p</dt><dd><span tabIndex={0} title={precise(t.p_value)} aria-label={'p-value ' + precise(t.p_value)}>{t.p_value != null && t.p_value < .0001 ? '<0.0001' : number(t.p_value, 6)}</span></dd><dt>α</dt><dd>{t.alpha}</dd><dt>Model decision</dt><dd><strong>{decision}</strong></dd></dl><p>{t.decision === 'unavailable' ? t.reason ?? 'The model prerequisites are not satisfied.' : t.decision === 'reject' ? 'Under this unverified equal-variance independent-observation model, the result rejects equality of the two means at α = 0.05.' : 'Under this unverified model, the evidence is insufficient to reject equal means at α = 0.05; this does not establish that the states are equal.'}</p></div></section>;
}

export function CorrelationPanel({ data, meta, title = 'Compatible annual correlations', compact, scopeKey = '' }: Common & { data: CorrelationsPayload; scopeKey?: string }) {
  const [selection, setSelection] = useState<{ scope: string; data: CorrelationsPayload; x: string; y: string } | null>(null);
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const backRef = useRef<HTMLButtonElement>(null);
  const returnCell = useRef<string | null>(null);
  const currentSelection = selection?.scope === scopeKey && selection.data === data ? selection : null;
  const selected = currentSelection ? data.cells.find(cell => cell.x === currentSelection.x && cell.y === currentSelection.y) : undefined;
  const pairOpen = selected != null && selected.r != null && selected.x !== selected.y;

  // Discover which variables actually have non-null correlation pairs in this payload
  const activeVariables = useMemo(() => {
    const varsWithData = new Set<string>();
    for (const cell of data.cells) {
      if (cell.r !== null && cell.x !== cell.y) {
        varsWithData.add(cell.x);
        varsWithData.add(cell.y);
      }
    }
    return varsWithData.size > 0 ? data.variables.filter(v => varsWithData.has(v)) : data.variables;
  }, [data]);

  const displayedVariables = filterActiveOnly ? activeVariables : data.variables;

  useEffect(() => {
    if (pairOpen) backRef.current?.focus();
    else if (returnCell.current) {
      cellRefs.current.get(returnCell.current)?.focus();
      returnCell.current = null;
    }
  }, [pairOpen]);

  if (pairOpen && selected) return <div className="dav-pair"><button ref={backRef} className="button" type="button" onClick={() => setSelection(null)}>Back to correlation matrix</button><RelationshipPanel data={{ points: selected.points, regression: selected.regression, x_label: selected.x, y_label: selected.y, x_unit: selected.x === 'temperature' ? '°C' : 'documented records', y_unit: selected.y === 'temperature' ? '°C' : 'documented records' }} title={`${selected.x} vs ${selected.y} Relationship`} meta={meta} compact={compact} /></div>;

  return <section className={'dav-panel' + (compact ? ' dav-compact' : '')}>
    <div className="dav-heading">
      <div>
        <h2>{title}</h2>
        <p className="muted">Statistical association between annual climate indicators · click any cell to view scatter & trend</p>
      </div>
      {activeVariables.length < data.variables.length && (
        <button type="button" className="button" onClick={() => setFilterActiveOnly(!filterActiveOnly)}>
          {filterActiveOnly ? 'Show all 5 variables (including N/A)' : 'Focus on comparable variables'}
        </button>
      )}
    </div>
    <div className="dav-body">
      <div className="table-scroll dav-matrix">
        <table>
          <caption>Annual correlation matrix. Click any cell for scatter plot and regression line.</caption>
          <thead>
            <tr>
              <th scope="col">Variable</th>
              {displayedVariables.map(variable => <th key={variable} scope="col">{variable}</th>)}
            </tr>
          </thead>
          <tbody>
            {displayedVariables.map(y => <tr key={y}>
              <th scope="row">{y}</th>
              {displayedVariables.map(x => {
                const cell = data.cells.find(value => value.x === x && value.y === y);
                const unavailable = cell?.r == null;
                const strength = Math.abs(cell?.r ?? 0);
                const key = x + '/' + y;
                const details = `${x} vs ${y}: r = ${precise(cell?.r)}, n = ${cell?.n ?? 0}`;
                return <td key={x} className={unavailable ? 'dav-na' : ''}>
                  <button
                    ref={element => { if (element) cellRefs.current.set(key, element); else cellRefs.current.delete(key); }}
                    type="button"
                    className="dav-matrix-cell"
                    style={unavailable ? undefined : { background: 'color-mix(in srgb, ' + ((cell?.r ?? 0) < 0 ? 'var(--correlation-negative)' : 'var(--correlation-positive)') + ' ' + (strength * 100) + '%, var(--correlation-zero))' }}
                    title={details}
                    aria-label={details}
                    onClick={() => { if (!unavailable && x !== y) returnCell.current = key; setSelection({ scope: scopeKey, data, x, y }); }}
                  >
                    <span className="dav-matrix-value">
                      {unavailable ? 'N/A' : (cell?.r ?? 0).toFixed(2)}
                      <small>{unavailable ? 'no overlap' : `n=${cell?.n ?? 0}`}</small>
                    </span>
                  </button>
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="dav-matrix-legend" aria-label="Fixed correlation scale">
        <span>−1 Negative association</span>
        <span>0 No correlation</span>
        <span>+1 Positive association</span>
      </div>
      {currentSelection && <p role="status" className="dav-selection-status">
        <strong>{currentSelection.x} &amp; {currentSelection.y}:</strong> {selected?.reason ?? (selected?.x === selected?.y && selected ? 'Self-correlation diagonal (r = 1.0).' : 'No shared observations.')}
      </p>}
      <p className="muted" style={{ fontSize: '11px', marginTop: '6px' }}>
        Tip: Rainfall in this dataset contains daily records without annual totals; drought is recorded at national level. Floods, landslides, and temperature are tracked at state level annually.
      </p>
    </div>
  </section>;
}

export function CountPanel({ data, title = 'Documented catalog records', compact, activeHazard, activeDecade }: Common & { data: CountsPayload; activeHazard?: 'floods' | 'landslides'; activeDecade?: number }) {
  const [view, setView] = useState('plot');
  const [group, setGroup] = useState<'hazard' | 'decade'>('hazard');
  const rows = data.rows;
  const max = Math.max(0, ...rows.map(row => row.count ?? 0));
  const decades = [...new Set(rows.map(row => row.decade))].sort((a, b) => a - b);
  const plotted = [...rows].sort((a, b) => group === 'hazard' ? a.hazard.localeCompare(b.hazard) || a.decade - b.decade : a.decade - b.decade || a.hazard.localeCompare(b.hazard)).map(row => ({ ...row, label: group === 'hazard' ? row.hazard + ' ' + row.decade + 's' : row.decade + 's ' + row.hazard }));
  const marked = (row: CountsPayload['rows'][number]) => (!activeHazard || row.hazard === activeHazard) && (activeDecade === undefined || row.decade === activeDecade);
  return <section className={'dav-panel dav-count-panel' + (compact ? ' dav-compact' : '')}><h2>{title}</h2><p>Documented catalog records · dated rows in the selected bounds; {data.excluded_undated} undated records excluded before year filtering</p><AnalysisTabs label="Count representation" options={[{ id: 'plot', label: 'Count plot' }, { id: 'groupby', label: 'GroupBy' }, { id: 'pivot', label: 'Pivot' }]} value={view} onChange={setView}><div className="dav-body">{view === 'plot' ? <><label className="dav-select">Group by<select value={group} onChange={event => setGroup(event.target.value as 'hazard' | 'decade')}><option value="hazard">Hazard</option><option value="decade">Decade</option></select></label><div className="dav-chart" role="img" aria-label="Categorical count plot of hazard and decade rows. Null coverage is shown as N/A below; it is not zero."><ResponsiveContainer width="100%" height="100%"><BarChart data={plotted} margin={{ top: 12, right: 12, left: 8, bottom: 64 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" type="category" interval={0} angle={-35} textAnchor="end" height={68} tick={{ fontSize: 10 }} stroke="var(--muted)" /><YAxis width={42} domain={[0, 'auto']} allowDecimals={false} stroke="var(--muted)" tick={{ fontSize: 11 }} /><Tooltip content={({ active, payload }) => { const row = payload?.[0]?.payload as typeof plotted[number] | undefined; return active && row ? <div className="dav-tooltip">{row.label}: {row.count == null ? 'N/A — ' + row.reason : row.count + ' documented catalog records'}</div> : null; }} /><Bar dataKey="count" isAnimationActive={false}>{plotted.map(row => <Cell key={row.hazard + row.decade} fill={row.hazard === 'floods' ? 'var(--flood)' : 'var(--landslide)'} stroke="var(--text)" strokeWidth={marked(row) ? 2 : .7} strokeDasharray={row.hazard === 'landslides' ? '4 2' : undefined} />)}</Bar></BarChart></ResponsiveContainer></div><p>Floods solid; landslides dashed. Outline marks selection.</p>{rows.filter(row => row.count == null).map(row => <p key={row.hazard + row.decade}>{row.hazard} {row.decade}s: N/A — {row.reason}</p>)}<CountRows rows={rows} max={max} /></> : view === 'groupby' ? <CountRows rows={rows} max={max} open /> : <div className="table-scroll"><table><caption>Pivot of the identical hazard/decade count rows</caption><thead><tr><th scope="col">Decade</th><th scope="col">Floods</th><th scope="col">Landslides</th></tr></thead><tbody>{decades.map(decade => <tr key={decade}><th scope="row">{decade}s</th>{(['floods', 'landslides'] as const).map(hazard => { const row = rows.find(item => item.decade === decade && item.hazard === hazard); return <td key={hazard}>{row?.count == null ? <span className="dav-na">N/A — {row?.reason ?? 'No grouped row supplied'}</span> : <DataBar value={row.count} max={max} tone={hazard === 'floods' ? 'a' : 'b'} />}</td>; })}</tr>)}</tbody></table></div>}<p>Zero means zero selected documented rows within observed catalog coverage, not zero hazard or risk. N/A means unavailable catalog coverage.</p></div></AnalysisTabs></section>;
}
function CountRows({ rows, max, open = false }: { rows: CountsPayload['rows']; max: number; open?: boolean }) {
  const content = <div className="table-scroll dav-counts"><table><caption>GroupBy: unchanged backend hazard/decade rows</caption><thead><tr><th scope="col">Hazard</th><th scope="col">Decade</th><th scope="col">Documented catalog records</th></tr></thead><tbody>{rows.map(row => <tr key={row.hazard + row.decade}><th scope="row">{row.hazard}</th><td>{row.decade}s</td><td>{row.count == null ? <span className="dav-na">N/A — {row.reason}</span> : <DataBar value={row.count} max={max} tone={row.hazard === 'floods' ? 'a' : 'b'} />}</td></tr>)}</tbody></table></div>;
  return open ? content : <details className="dav-derived"><summary>Derived grouped count rows (accessible table)</summary>{content}</details>;
}
export function AuditPanel({ data, title = 'Quality audit', compact }: Common & { data: AuditPayload }) {
  return <section className={'dav-panel' + (compact ? ' dav-compact' : '')}><h3>{title}</h3><p><strong>Prepared records; excluded source rows are not included.</strong></p><div className="dav-body"><dl className="dav-stat-grid"><dt>Scope</dt><dd>{data.scope}</dd><dt>Filtered prepared rows</dt><dd>{data.rows}</dd><dt>Exact duplicate rows</dt><dd>{data.duplicate_rows}</dd><dt>Duplicate observation identities</dt><dd>{data.duplicate_identities}</dd></dl><div className="table-scroll"><table><caption>Column dtypes and isnull().sum() on filtered prepared records</caption><thead><tr><th scope="col">Column</th><th scope="col">dtype</th><th scope="col">Missing</th></tr></thead><tbody>{data.columns.map(column => <tr key={column.name}><th scope="row">{column.name}</th><td>{column.dtype}</td><td>{column.missing}</td></tr>)}</tbody></table></div><div className="table-scroll"><table><caption>Backend numeric summaries; variance s² and SD s use the sample convention</caption><thead><tr>{['Column', 'Count', 'Mean', 'Median', 'Variance s²', 'SD s', 'Min', 'Max'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.numeric.map(column => <tr key={column.name}><th scope="row">{column.name}</th>{[column.count, column.mean, column.median, column.variance, column.std, column.min, column.max].map((value, index) => <td key={index}><Value value={value} /></td>)}</tr>)}</tbody></table></div><p>Numeric zero is present, not missing.</p></div></section>;
}
