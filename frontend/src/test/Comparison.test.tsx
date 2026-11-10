import { cloneElement } from 'react';
import type { ReactElement } from 'react';
import type * as Recharts from 'recharts';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponseOf } from '../api/client';
import type { Catalog, ComparisonDAVPayload, ComparisonResult, Distribution, Metadata } from '../api/types';
import Comparison from '../pages/Comparison';
import { ThemeProvider } from '../theme';

// Only replace container measurement: the actual Recharts bars, axes and lines render.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof Recharts>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width: number; height: number }> }) => <div>{cloneElement(children, { width: 720, height: 280 })}</div>,
  };
});

// Isolated synthetic contract fixtures; none are imported by production pages.
const fixtureMeta: Metadata = {
  metric: 'synthetic_fixture_event_count', unit: 'events', geographic_level: 'state',
  time_resolution: 'annual', period: { start: '2018', end: '2019' },
  source_ids: ['fixture_source'], method: 'Test-only supplied count method',
  observation_count: 2, limitations: ['Synthetic fixture coverage limitation'],
};
const fixtureResult: ComparisonResult = {
  state_a: 'FIXTURE_A', state_b: 'FIXTURE_B', metric: 'flood_event_count', unit: 'events',
  period: { start: '2018', end: '2019' }, state_a_value: 0, state_b_value: null,
  series: [
    { year: 2018, state_a: 0, state_b: null },
    { year: 2019, state_a: 4, state_b: 6 },
  ],
};
const fixtureDistribution: Distribution = {
  n: 2, missing: 0, mean: 2, median: 2, variance: 8, std: Math.sqrt(8),
  min: 0, p10: 0.4, q1: 1, q3: 3, p90: 3.6, max: 4, iqr: 2,
  lower_fence: -2, upper_fence: 6, whisker_low: 0, whisker_high: 4,
  bowley: 0, kelly: 0, excess_kurtosis: null, kurtosis_class: null,
  bins: [{ lower: 0, upper: 2, count: 1 }, { lower: 2, upper: 4, count: 1 }], outliers: [],
};
function fixtureAnalysis(comparison: ComparisonResult = fixtureResult): ComparisonDAVPayload {
  return {
    kind: 'comparison', reason: null, comparison,
    a: fixtureDistribution, b: fixtureDistribution,
    points: [{ id: 'fixture-2018', label: '2018', x: 0, y: 0 }, { id: 'fixture-2019', label: '2019', x: 4, y: 6 }],
    regression: { n: 2, slope: null, intercept: null, r: null, r_squared: null, reason: 'Synthetic fixture has fewer than three pairs' },
    test: {
      n_a: 2, n_b: 2, mean_a: 0, mean_b: 0, variance_a: 0, variance_b: 8,
      pooled_sd: 2, t: 0, p_value: 0.25, df: 2, alpha: 0.05,
      decision: 'fail_to_reject', reason: null,
    },
  };
}
const annualRainfallOmission = 'Fixture source has incomplete daily coverage and no declared annual rainfall unit.';
const clients: QueryClient[] = [];

function installFixtureApi(options: {
  metrics?: string[];
  years?: number[];
  result?: ComparisonResult | null;
  status?: 'ok' | 'no_data';
  analysis?: ComparisonDAVPayload;
  davResponse?: (url: URL) => Response | Promise<Response>;
} = {}) {
  const requests: URL[] = [];
  const catalog: Catalog = {
    processed_at: '2026-01-01T00:00:00Z',
    capabilities: {
      boundaries: false, comparison_metrics: options.metrics ?? ['flood_event_count'],
      available_years: { floods: options.years ?? [2018, 2019], rainfall: options.years ?? [2018, 2019], landslides: options.years ?? [2018, 2019] },
      omitted_datasets: { drought: 'Synthetic national drought omission, unrelated to comparison', annual_rainfall: annualRainfallOmission },
    },
    datasets: { floods: fixtureMeta, rainfall: { ...fixtureMeta, unit: 'mm', metric: 'rainfall_fixture' } },
  };
  const stateResponse: ResponseOf<'/api/v1/states'> = {
    status: 'ok', data: [{ state_id: 'FIXTURE_A', name: 'Fixture state A' }, { state_id: 'FIXTURE_B', name: 'Fixture state B' }, { state_id: 'FIXTURE_C', name: 'Fixture state C' }], meta: fixtureMeta,
  };
  const catalogResponse: ResponseOf<'/api/v1/metadata'> = { status: 'ok', data: catalog, meta: fixtureMeta };
  const resultResponse: ResponseOf<'/api/v1/compare'> = { status: options.status ?? 'ok', data: options.result === undefined ? fixtureResult : options.result, meta: fixtureMeta };
  const davResponse: ResponseOf<'/api/v1/dav'> = {
    status: options.status ?? 'ok',
    data: options.status === 'no_data' ? null : options.analysis ?? fixtureAnalysis(options.result ?? fixtureResult),
    meta: fixtureMeta,
  };
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    requests.push(url);
    if (url.pathname === '/api/v1/states') return Response.json(stateResponse);
    if (url.pathname === '/api/v1/metadata') return Response.json(catalogResponse);
    if (url.pathname === '/api/v1/compare') return Response.json(resultResponse);
    if (url.pathname === '/api/v1/dav') return options.davResponse ? options.davResponse(url) : Response.json(davResponse);
    throw new Error(`Unexpected fixture endpoint: ${url.pathname}`);
  }));
  return requests;
}

function renderComparison(hash = '#/comparison') {
  window.location.hash = hash;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return render(<ThemeProvider><QueryClientProvider client={client}><Comparison /></QueryClientProvider></ThemeProvider>);
}

async function openAnnualSeries() {
  fireEvent.click(await screen.findByText(/^Annual values ·/));
  return screen.findByRole('table', { name: /^Annual series/ });
}

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Scientifically supported state comparison', () => {
  it('renders supplied event-count bars and preserves zero, null and absent differences', async () => {
    const requests = installFixtureApi();
    renderComparison();
    const table = await openAnnualSeries();
    const firstRow = within(table).getByRole('row', { name: '2018 0 Not supplied Not supplied Not supplied' });
    expect(within(firstRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['0', 'Not supplied', 'Not supplied', 'Not supplied']);
    const secondRow = within(table).getByRole('row', { name: '2019 4 6 Not supplied Not supplied' });
    expect(within(secondRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['4', '6', 'Not supplied', 'Not supplied']);
    const summary = screen.getByLabelText('Comparison summary');
    expect(within(summary).getByText('0 events')).toBeInTheDocument();
    expect(within(summary).getAllByRole('definition').map((value) => value.textContent)).toEqual(['0 events', 'Not supplied', 'Not supplied', 'Not supplied']);
    const chart = screen.getByRole('img');
    await waitFor(() => expect(chart.querySelectorAll('.recharts-bar')).toHaveLength(2));
    expect(chart.querySelector('.recharts-line')).not.toBeInTheDocument();
    const request = requests.find((url) => url.pathname === '/api/v1/compare');
    expect(Object.fromEntries(request!.searchParams)).toEqual({ state_a: 'FIXTURE_A', state_b: 'FIXTURE_B', metric: 'flood_event_count', start_year: '2018', end_year: '2019' });
    expect(requests.filter((url) => url.pathname === '/api/v1/dav')).toHaveLength(0);
  });

  it('does not request DAV or substitute a dataset for unsupported annual rainfall URLs', async () => {
    const requests = installFixtureApi();
    renderComparison('#/comparison?metric=rainfall_annual_total&dav_view=test');
    await screen.findByLabelText('Metric');
    expect(screen.getByRole('button', { name: 'Compare states' })).toBeDisabled();
    expect(requests.filter((url) => ['/api/v1/compare', '/api/v1/dav'].includes(url.pathname))).toHaveLength(0);
    expect(screen.queryByLabelText('Comparison summary')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it.each(['spread', 'relationship', 'test'])('uses only DAV and its unchanged embedded backend summary for %s', async (view) => {
    const analysis = fixtureAnalysis({
      ...fixtureResult, state_a_value: 91, state_b_value: 62,
      absolute_difference: 17, percentage_difference: 0,
    });
    const requests = installFixtureApi({ analysis });
    renderComparison(`#/comparison?dav_view=${view}`);
    const summary = await screen.findByLabelText('Comparison summary');
    expect(within(summary).getAllByRole('definition').map((value) => value.textContent)).toEqual(['91 events', '62 events', '17 events', '0 %']);
    expect(requests.filter((url) => url.pathname === '/api/v1/compare')).toHaveLength(0);
    const request = requests.find((url) => url.pathname === '/api/v1/dav')!;
    expect(Object.fromEntries(request.searchParams)).toEqual({
      operation: 'comparison', state_a: 'FIXTURE_A', state_b: 'FIXTURE_B',
      metric: 'flood_event_count', start_year: '2018', end_year: '2019',
    });
  });

  it.each([
    ['State B', 'FIXTURE_C', 'state_b'],
    ['Start year', '2019', 'start_year'],
  ])('hides the previous DAV verdict when %s changes and rejects a mismatched response', async (label, value, parameter) => {
    const initial = fixtureAnalysis();
    let finishChangedRequest!: (response: Response) => void;
    // The project targets ES2022, before Promise.withResolvers was introduced.
    const changedResponse = new Promise<Response>((resolve) => { finishChangedRequest = resolve; });
    const requests = installFixtureApi({
      davResponse: (url) => url.searchParams.get(parameter) === value
        ? changedResponse
        : Response.json({ status: 'ok', data: initial, meta: fixtureMeta }),
    });
    renderComparison('#/comparison?dav_view=test');
    expect(await screen.findByLabelText('p-value 0.25')).toBeInTheDocument();
    const decision = screen.getByText('Model decision').nextElementSibling!;
    expect(decision).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    await waitFor(() => expect(requests.some((url) => url.pathname === '/api/v1/dav' && url.searchParams.get(parameter) === value)).toBe(true));
    expect(decision).not.toBeInTheDocument();
    expect(screen.queryByLabelText('p-value 0.25')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Comparison summary')).not.toBeInTheDocument();
    finishChangedRequest(Response.json({ status: 'ok', data: initial, meta: fixtureMeta }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Compare states' })).toBeEnabled());
    expect(screen.queryByText('Model decision')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Comparison summary')).not.toBeInTheDocument();
    expect(requests.filter((url) => url.pathname === '/api/v1/compare')).toHaveLength(0);
  });

  it('preserves numeric zero in DAV model statistics and the embedded annual series', async () => {
    installFixtureApi({ analysis: fixtureAnalysis() });
    renderComparison('#/comparison?dav_view=test');
    const model = await screen.findByRole('table', { name: /Model inputs and result/ });
    const means = within(model).getByRole('row', { name: 'Mean (events) 0 0' });
    expect(within(means).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['0', '0']);
    const variances = within(model).getByRole('row', { name: 'Sample variance s² (events)² 0 8' });
    expect(within(variances).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['0', '8']);
    const series = await openAnnualSeries();
    expect(within(series).getByRole('row', { name: '2018 0 Not supplied Not supplied Not supplied' })).toBeInTheDocument();
    expect(screen.getByLabelText('Comparison summary')).toHaveTextContent('0 events');
  });

  it('shows supplied differences without replacing them with browser arithmetic', async () => {
    installFixtureApi({ result: { ...fixtureResult, absolute_difference: 17, percentage_difference: null, series: [{ year: 2018, state_a: 0, state_b: 6, absolute_difference: 17, percentage_difference: null }] } });
    renderComparison();
    const table = await openAnnualSeries();
    expect(within(table).getByRole('row', { name: '2018 0 6 17 Not supplied' })).toBeInTheDocument();
    expect(screen.getByLabelText('Comparison summary')).toHaveTextContent('17 events');
  });

  it('keeps rainfall on observed lines rather than event-count bars', async () => {
    installFixtureApi({ metrics: ['rainfall_annual_total'], result: { ...fixtureResult, metric: 'rainfall_annual_total', unit: 'mm' } });
    renderComparison();
    const chart = await screen.findByRole('img');
    await waitFor(() => expect(chart.querySelectorAll('.recharts-line')).toHaveLength(2));
    expect(chart.querySelector('.recharts-bar')).not.toBeInTheDocument();
    const table = await openAnnualSeries();
    expect(within(table).getByRole('row', { name: '2019 4 6 Not supplied Not supplied' })).toBeInTheDocument();
  });

  it.each<[string, string, string[]]>([
    ['identical states', 'state_a=FIXTURE_A&state_b=FIXTURE_A', ['flood_event_count']],
    ['a noncatalog state', 'state_a=UNKNOWN', ['flood_event_count']],
    ['an unsupported advertised metric', 'metric=regional_temperature', ['regional_temperature']],
    ['a metric not advertised by the backend', 'metric=landslide_event_count', ['flood_event_count']],
    ['reversed years', 'start_year=2019&end_year=2018', ['flood_event_count']],
    ['a year outside observed coverage', 'start_year=1999&end_year=2019', ['flood_event_count']],
  ])('does not request or chart %s', async (_label, search, metrics) => {
    const requests = installFixtureApi({ metrics });
    renderComparison(`#/comparison?${search}`);
    await screen.findByLabelText('Metric');
    expect(screen.getByRole('button', { name: 'Compare states' })).toBeDisabled();
    expect(requests.filter((url) => url.pathname === '/api/v1/compare')).toHaveLength(0);
    expect(requests.filter((url) => url.pathname === '/api/v1/dav')).toHaveLength(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('disables comparison when the backend advertises no supported metrics', async () => {
    const requests = installFixtureApi({ metrics: [] });
    renderComparison();
    expect(await screen.findByLabelText('Metric')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Compare states' })).toBeDisabled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Comparison summary')).not.toBeInTheDocument();
    expect(requests.filter((url) => url.pathname === '/api/v1/compare')).toHaveLength(0);
  });

  it('keeps requests disabled when no observation years are declared', async () => {
    const requests = installFixtureApi({ years: [] });
    renderComparison();
    await screen.findByLabelText('Start year');
    expect(screen.getByLabelText('Start year')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Compare states' })).toBeDisabled();
    expect(requests.filter((url) => url.pathname === '/api/v1/compare')).toHaveLength(0);
  });

  it('requests the new valid state pair without silently substituting the selection', async () => {
    const requests = installFixtureApi();
    renderComparison();
    await screen.findByLabelText('Comparison summary');
    fireEvent.change(screen.getByLabelText('State A'), { target: { value: 'FIXTURE_B' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Compare states' })).toBeDisabled());
    expect(screen.getByLabelText('State A')).toHaveValue('FIXTURE_B');
    expect(screen.getByLabelText('State B')).toHaveValue('FIXTURE_B');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(requests.filter((url) => url.pathname === '/api/v1/compare')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('State B'), { target: { value: 'FIXTURE_A' } });
    await waitFor(() => expect(requests.filter((url) => url.pathname === '/api/v1/compare')).toHaveLength(2));
    const latest = requests.filter((url) => url.pathname === '/api/v1/compare').at(-1)!;
    expect(latest.searchParams.get('state_a')).toBe('FIXTURE_B');
    expect(latest.searchParams.get('state_b')).toBe('FIXTURE_A');
  });

  it('does not turn a valid no-data response into zero values or a chart', async () => {
    installFixtureApi({ result: null, status: 'no_data' });
    renderComparison();
    await screen.findByRole('heading', { name: 'Data not available for these filters' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Comparison summary')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
