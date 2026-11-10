import { useEffect } from 'react';
import { AlertTriangle, BookOpen, Database, ShieldCheck } from 'lucide-react';
import { useApi } from '../api/client';
import { QueryState } from '../components/DataPanels';
import type { Metadata } from '../api/types';
import { useFilters } from '../hooks/useFilters';

const requestedSources = [
  { id: 'landslides', name: 'Community landslide records' },
  { id: 'nwic_boundaries', name: 'NWIC official boundaries' },
  { id: 'drought', name: 'IIT Gandhinagar drought indicators' },
  { id: 'heat', name: 'IITM Pune / IMD regional temperature — requested family' },
  { id: 'floods', name: 'IIT Delhi flood records' },
  { id: 'imd_rainfall', name: 'IMD / NWIC rainfall observations' },
  { id: 'cyclones', name: 'NOAA IBTrACS cyclone observations' },
];

function safeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function Sources() {
  const sources = useApi('/api/v1/sources');
  const catalog = useApi('/api/v1/metadata');
  const { filters } = useFilters();
  const selectedSource = filters.get('source_id');
  const records = sources.data?.data ?? [];
  const missingSources = requestedSources.filter((requested) => !records.some((source) => source.id === requested.id));
  if (selectedSource && !records.some((source) => source.id === selectedSource) && !missingSources.some((source) => source.id === selectedSource)) {
    missingSources.push({ id: selectedSource, name: selectedSource });
  }

  useEffect(() => {
    if (selectedSource && sources.data) {
      document.getElementById(`source-${selectedSource}`)?.scrollIntoView?.({ block: 'start' });
    }
  }, [selectedSource, sources.data, catalog.data]);

  return (
    <>
      <header className="page-heading">
        <h1>Sources and methodology</h1>
        <p className="muted">Trace provider declarations, imported coverage and processing methods.</p>
      </header>
      <section className="provenance-warning" aria-labelledby="landslide-warning-title">
        <h2 id="landslide-warning-title"><AlertTriangle size={22} aria-hidden="true" /> Landslide provenance is unverified</h2>
        <p>The original provenance of the community landslide records is unverified, including workbook NASA/GLC attribution. Do not interpret unreported events as absence of hazard or this collection as a complete official inventory.</p>
      </section>
      <section aria-labelledby="sources-title">
        <h2 id="sources-title"><Database size={22} aria-hidden="true" /> Source catalog</h2>
        <QueryState query={catalog} empty={catalog.data !== undefined && Object.keys(catalog.data.data.datasets).length === 0}>
          <p className="muted">Imported dataset catalog prepared: {catalog.data?.data.processed_at}. Provider-declared coverage is not the same as imported observation coverage.</p>
        </QueryState>
        <QueryState query={sources} empty={sources.data?.status === 'no_data' || (Boolean(sources.data) && records.length === 0)}>
          <div className="sources-workbench">
            <nav className="source-index" aria-label="Dataset index">
              <ul>
                {[...records, ...missingSources].map((source) => <li key={source.id}><a href={`#/sources?source_id=${encodeURIComponent(source.id)}`} aria-current={selectedSource === source.id ? 'location' : undefined}>{source.name}</a></li>)}
              </ul>
            </nav>
            <div className="source-articles">
              {records.map((source) => {
                const url = safeUrl(source.url);
                const importedDatasets = Object.entries(catalog.data?.data.datasets ?? {}).filter(([, metadata]) => metadata.source_ids?.includes(source.id));
                return (
                  <article className="source-article" id={`source-${source.id}`} key={source.id} aria-labelledby={`source-${source.id}-title`}>
                    <h3 id={`source-${source.id}-title`}>{source.name}</h3>
                    <p className="muted">Source ID: {source.id}</p>
                    <dl>
                      <dt>Provider</dt><dd>{source.provider}</dd>
                      <dt>Purpose declared by source</dt><dd>{source.purpose}</dd>
                      <dt>Format</dt><dd>{source.data_format}</dd>
                      <dt>Provider-declared geographical coverage</dt><dd>{source.geographic_coverage}</dd>
                      <dt>Provider-declared temporal coverage</dt><dd>{source.temporal_coverage}</dd>
                      <dt>Provenance status</dt><dd>{source.provenance_status}</dd>
                      <dt>Provider / download link</dt><dd>{url ? <a href={url} target="_blank" rel="noopener noreferrer">Open declared source for {source.name} (new tab)</a> : 'No valid HTTP(S) source URL provided'}</dd>
                    </dl>
                    <ul>{source.limitations?.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
                    {catalog.data && <section aria-labelledby={`source-${source.id}-imported-title`}>
                      <h4 id={`source-${source.id}-imported-title`}>Imported dataset coverage</h4>
                      {importedDatasets.length ? importedDatasets.map(([name, metadata]) => <div className="imported-dataset" key={name}>
                        <h5>{name}: {metadata.metric}</h5>
                        <SourceMetadata meta={metadata} />
                      </div>) : <p>No imported dataset declares this source ID.</p>}
                    </section>}
                  </article>
                );
              })}
              {missingSources.map((requested) => <article className="source-article" key={requested.id} id={`source-${requested.id}`}>
                <h3>{requested.name}</h3><p>Requested source family — backend source metadata unavailable.</p>
              </article>)}
            </div>
          </div>
        </QueryState>
        {sources.data && records.length === 0 && missingSources.map((requested) => <article className="source-article" key={requested.id} id={`source-${requested.id}`}>
          <h3>{requested.name}</h3><p>Requested source family — backend source metadata unavailable.</p>
        </article>)}
        <SourceMetadata meta={sources.data?.meta} />
      </section>
      <section className="work-section" aria-labelledby="source-method-title">
        <h2 id="source-method-title"><BookOpen size={22} aria-hidden="true" /> Dataset methods and availability</h2>
        {catalog.data && <>
          {Object.entries(catalog.data.data.datasets).map(([name, metadata]) => <details key={name}>
            <summary>{name}: {metadata.metric}</summary>
            <SourceMetadata meta={metadata} />
          </details>)}
          {Object.entries(catalog.data.data.capabilities.omitted_datasets ?? {}).map(([name, reason]) => <p key={name}><strong>{name} unavailable:</strong> {reason}</p>)}
        </>}
      </section>
      <section className="work-section" aria-labelledby="science-method-title"><h2 id="science-method-title">Science methods and syllabus</h2><details><summary>Statistical methods, architecture and course references</summary><PlatformSyllabus /></details></section>
      <details className="work-section"><summary>Histogram and statistical test calculations</summary><p>Histogram bins use Sturges k = 1 + ceil(log₂(n)); constant samples use one nonzero-width bin. Intervals include the lower endpoint; only the final bin includes its upper endpoint. Linear quantiles and sample variance/SD use the backend’s declared conventions.</p><p>For the pooled two-sided Student test: sₚ² = ((nA−1)sA² + (nB−1)sB²)/(nA+nB−2); t = (meanA−meanB)/(sₚ√(1/nA+1/nB)); df = nA+nB−2; p = 2×SciPy t.sf(|t|,df). Reject iff p ≤ 0.05. Each sample requires n ≥ 2 and positive pooled variance; no paired or Welch substitution is performed.</p><p>Annual observations may be temporally dependent or cross-correlated. Independence and equal variance are not established. A p-value is not the probability that H₀ is true, and statistical significance is not policy importance. Historical OLS fits are restricted to observed x values, not forecasts.</p></details>
      <section className="research-note" aria-labelledby="source-use-title">
        <h2 id="source-use-title"><ShieldCheck size={22} aria-hidden="true" /> Historical research, not emergency guidance</h2>
        <p>Provider attribution is not independent verification. No real-time forecasting, official alerts or validated future predictions. Missing observations are not zero; shared calendar years do not establish comparability. Regional temperature and national drought cannot be repurposed as state observations.</p>
      </section>
    </>
  );
}
function PlatformSyllabus() {
  const catalog = useApi('/api/v1/metadata');
  return <div className="dav-syllabus">
    <section><h3>Four analytics types</h3><dl>
      <dt>Descriptive</dt><dd>Observed distributions, summaries and documented catalog counts.</dd>
      <dt>Diagnostic</dt><dd>Exploratory relationships: association, not established cause.</dd>
      <dt>Predictive</dt><dd>Not implemented: historical fit is not a forecast.</dd>
      <dt>Prescriptive</dt><dd>Human-reviewed recommendation, not optimized or automated intervention.</dd>
    </dl></section>
    <section><h3>Decision chain</h3><p>Source records → summary → supported interpretation → proposed decision → proposed action (Module 1 p. 12). The selected finding’s actual evidence and highlighted stages appear in Interpretation; they are not an automated intervention.</p></section>
    <section><h3>Data types</h3><p>Structured tables and time series hold observations. GeoJSON and nested API event attributes are semi-structured. The supplied reference documents and free-text descriptions, where present, are unstructured content. Fixed-field incident rows are not inherently unstructured.</p></section>
    <section><h3>The 5Vs</h3><dl>
      <dt>Volume</dt><dd><p>Prepared catalog record counts; collections can overlap and do not count unique disasters.</p><QueryState query={catalog}><ul>{Object.entries(catalog.data?.data.datasets ?? {}).filter(([name]) => name !== 'states' && name !== 'boundaries').map(([name, dataset]) => <li key={name}>{name}: {dataset.observation_count.toLocaleString()} records</li>)}</ul></QueryState></dd>
      <dt>Velocity</dt><dd>A batch-prepared workbook, not live streaming.</dd>
      <dt>Variety</dt><dd>Workbook tables, prepared Parquet/JSON, GeoJSON boundaries and referenced documents.</dd>
      <dt>Veracity</dt><dd>Missingness, exact-row and observation-identity duplicates, and declared source/coverage limitations.</dd>
      <dt>Value</dt><dd>The concrete supported interpretation and evidence report for human review, not a claim of distributed big-data infrastructure.</dd>
    </dl></section>
    <section><h3>Seven layers</h3><ol>
      <li><strong>Sources:</strong> workbook and provider references in <a className="source-link" href="#/sources">Sources</a>.</li>
      <li><strong>Ingestion:</strong> <code>prepare_workbook.py</code> and <code>prepare_boundaries.py</code>.</li>
      <li><strong>Storage:</strong> prepared Parquet, JSON and GeoJSON.</li>
      <li><strong>Processing:</strong> source validation and normalization.</li>
      <li><strong>Analysis:</strong> NIElytics summaries, quantiles, IQR, regression and correlation; explicitly attributed ClimateLens DAV binning/shape orchestration and SciPy pooled t-test.</li>
      <li><strong>Visualization:</strong> React, Recharts and MapLibre.</li>
      <li><strong>Decision making:</strong> a human-reviewed evidence report.</li>
    </ol><p>No Kafka, Spark or machine-learning infrastructure is claimed.</p></section>
    <section><h3>Central tendency & dispersion</h3><p>Mean/median; sample variance s² and standard deviation s with declared units; linear quantiles; observed five-number summary versus in-fence whiskers; IQR, strict 1.5×IQR fences and source-identified outliers. Atlas/Explorer Distribution and Comparison Spread cover Module 2 pp. 7–26, 39–74, 196–203.</p></section>
    <section><h3>Shape</h3><p>Bowley = (Q3 + Q1 − 2×median)/(Q3 − Q1); Kelly = (P90 + P10 − 2×median)/(P90 − P10). Zero denominators are unavailable. Unbiased Fisher excess kurtosis needs at least four nonconstant observations. |g₂| ≤ 0.05 is approximately mesokurtic; above 0.05 leptokurtic; below −0.05 platykurtic. This descriptive convention does not establish normality or extreme-disaster risk.</p></section>
    <section><h3>Bivariate & statistical comparison</h3><p>A histogram uses numeric intervals; a count plot uses categories. GroupBy and Pivot retain identical backend hazard/decade rows. Cyclone wind/pressure joins identical storm timestamps; state comparison joins explicit years. OLS y = mx + c, Pearson r and R² describe association. The pooled, equal-variance, two-sided Student t-test states H₀/H₁, α = 0.05 and its decision limits; independence/equal variance are not established for documented counts. Explorer: Module 2 pp. 206–214 / Lab pp. 24–25. Comparison: Module 2 pp. 80–85, 114–126, 199–203.</p></section>
    <section><h3>Multivariate analysis</h3><p>The five-label matrix exposes pairwise n, compatible state/year grain and explicit unavailable cells. Select an available off-diagonal cell for its source-matched scatter. Daily rainfall is not an annual total; national drought is not a state series. Insights: Module 2 pp. 211–214, 252–255; Module 1 p. 12.</p></section>
    <section><h3>Quality audit & lab operations</h3><p>Data & assumptions provides actual filtered prepared <code>isnull().sum()</code>, dtypes, sample numeric summaries, exact-row duplicates and observation-identity duplicates. Numeric zero is present. This is not an audit of excluded ingestion rows and does not authenticate upstream completeness.</p></section>
    <section><h3>Method references</h3><p>Module 1 pp. 12, 29–36, 46–49, 77–99; Module 2 pp. 7–26, 39–85, 114–126, 196–214, 240–255; Lab pp. 8–15, 24–25. Sturges binning and the explicit 1.5×IQR multiplier are requested enhancements, not claimed verbatim slide formulas. Some PDF equations are image-only. The scanned brochure supplies no verified judging rubric.</p></section>
  </div>;
}

function SourceMetadata({ meta }: { meta?: Metadata }) {
  if (!meta) return null;
  return <div className="source-metadata">
    <dl>
      <dt>Sources</dt><dd>{meta.source_ids?.length ? meta.source_ids.map(id => <a key={id} href={"#/sources?source_id=" + encodeURIComponent(id)}>{id} </a>) : "Not supplied"}</dd>
      <dt>Metric</dt><dd>{meta.metric ?? "Not supplied"}</dd>
      <dt>Scope / resolution</dt><dd>{meta.geographic_level} / {meta.time_resolution}</dd>
      <dt>Unit</dt><dd>{meta.unit ?? "Unit not declared"}</dd>
      <dt>Prepared observations</dt><dd>{meta.observation_count.toLocaleString()}</dd>
      {(meta.period?.start || meta.period?.end) && <><dt>Imported period</dt><dd>{meta.period?.start ?? "Not supplied"} — {meta.period?.end ?? "Not supplied"}</dd></>}
      <dt>Method</dt><dd>{meta.method ?? "Not supplied"}</dd>
    </dl>
    {!!meta.limitations?.length && <ul>{meta.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>}
  </div>;
}
