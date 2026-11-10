"""SYNTHETIC TEST ONLY: isolated prepared files and real NIElytics/SciPy calls.

No fixture is loaded by the application or replaces supplied climate records.
"""
from copy import deepcopy
import json

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from nielytics.core import statistics
from pydantic import TypeAdapter, ValidationError

from app.core.config import Config
from app.core.errors import AppError
from app.main import create_app
from app.models import Envelope, Metadata, Period
from app.repositories.dataset_repository import DatasetRepository
from app.services.analytics_models import ComparisonPoint, ComparisonResult
from app.services.analytics_service import AnalyticsService
from app.services.dav_models import DAVPayload, PairPoint, SamplePoint
from app.services.dav_service import DAVService, distribution, pooled_test, regression, test_decision


VALUES = [1, 2, 2, 3, 4, 5, 6, 7, 20]
BOUNDS = dict(start_year=2019, end_year=2021)


def event(identity, year, state='OD', **updates):
    return dict(event_id=identity, state_id=state, year=year, timestamp=None,
                longitude=None, latitude=None, attributes={'test_only': 'SYNTHETIC'}) | updates


def track(day, wind, pressure, storm='TEST-STORM', **updates):
    return dict(storm_id=storm, timestamp=f'2019-01-{day:02d}T00:00:00Z',
                longitude=80, latitude=20, wind=wind, pressure=pressure,
                wind_unit='kts' if wind is not None else None,
                pressure_unit='hPa' if pressure is not None else None) | updates


@pytest.fixture
def prepared(tmp_path):
    """Use the repository's real validation, with the existing manifest fixture pattern."""
    def create(*, updates=None, meta_updates=None, missing=()):
        rows = {
            'states': [{'state_id': 'OD', 'name': 'Odisha'}, {'state_id': 'KL', 'name': 'Kerala'}],
            'rainfall': [dict(state_id='OD', year=2019, date=f'2019-01-{day:02d}', value=value)
                         for day, value in enumerate(VALUES, 1)],
            'temperature': [dict(region='OD', year=year, month=None, value=value)
                            for year, value in zip(range(2019, 2022), (10, 20, 30), strict=True)] + [
                dict(region='Odisha', year=2019, month=None, value=99),
                dict(region='OD', year=2019, month=1, value=0),
                dict(region='OD', year=2020, month=1, value=4),
                dict(region='OD', year=2019, month=2, value=100)],
            'drought': [dict(year=year, value=value) for year, value in zip(range(2019, 2022), (0, 2, 4), strict=True)],
            'floods': [event(f'f-{state}-{year}-{i}', year, state)
                       for state, counts in (('OD', (1, 2, 3)), ('KL', (2, 3, 4)))
                       for year, count in zip(range(2019, 2022), counts, strict=True)
                       for i in range(count)],
            'landslides': [event(f'l-{year}-{i}', year) for year, count in ((2019, 2), (2020, 4), (2021, 6)) for i in range(count)],
            'cyclones': [dict(storm_id='TEST-STORM', name='SYNTHETIC TEST ONLY', year=2019),
                         dict(storm_id='OTHER-STORM', name='SYNTHETIC OTHER', year=2019)],
            'tracks': [track(4, 8, 992), track(1, 2, 998), track(3, 6, 994), track(2, 4, 996),
                       track(5, None, 990), track(6, 12, None), track(1, 100, 800, 'OTHER-STORM')],
        }
        rows.update(deepcopy(updates or {}))
        sources = [dict(id=f'test-{name}', name='SYNTHETIC TEST ONLY', provider='Test suite',
                        url=None, geographic_coverage='Isolated test records', temporal_coverage='Test years',
                        data_format='json', purpose='DAV regressions only', provenance_status='synthetic',
                        limitations=['Not real climate observations']) for name in rows]
        datasets = {}
        for name, records in rows.items():
            if name in missing:
                continue
            meta = dict(metric=name, unit={'temperature': '°C', 'drought': '%'}.get(name),
                        geographic_level={'temperature': 'regional', 'drought': 'national', 'tracks': 'point', 'cyclones': 'basin'}.get(name, 'state'),
                        time_resolution='annual' if name in {'temperature', 'drought'} else 'daily' if name == 'rainfall' else 'observation' if name == 'tracks' else 'event',
                        source_ids=[f'test-{name}'], observation_count=len(records), method='SYNTHETIC prepared fixture',
                        limitations=['SYNTHETIC TEST ONLY'])
            meta.update((meta_updates or {}).get(name, {}))
            (tmp_path / f'{name}.json').write_text(json.dumps(records, allow_nan=False), encoding='utf-8')
            datasets[name] = dict(path=f'{name}.json', format='json', meta=meta)
        catalog_meta = dict(metric='catalog', geographic_level='catalog', time_resolution='catalog',
                            source_ids=['test-states'], observation_count=0)
        manifest = dict(version=1, processed_at='2026-01-01T00:00:00Z', metadata=catalog_meta,
                        datasets=datasets, sources=sources,
                        capabilities={'comparison_metrics': ['flood_event_count', 'landslide_event_count'],
                                      'omitted_datasets': {'annual_rainfall': 'Daily observations; annual total not available.'}})
        (tmp_path / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
        config = Config(data_dir=tmp_path, analytics_module='app.services.nielytics_adapter')
        repository = DatasetRepository(tmp_path)
        return DAVService(repository, AnalyticsService(config, repository)), TestClient(create_app(config))
    return create


def points(values):
    return [SamplePoint(id=f'test:{i}', label=f'TEST ONLY {i}', value=value) for i, value in enumerate(values)]


def describe(values, limitations=None):
    return distribution(points(values), 0, limitations if limitations is not None else [])


def get(client, operation, **parameters):
    return client.get('/api/v1/dav', params=dict(operation=operation, **parameters))


def test_distribution_preserves_linear_quantiles_iqr_and_literal_sturges():
    result = describe(VALUES)
    assert (result.q1, result.median, result.q3) == (2, 4, 6)
    assert (result.lower_fence, result.upper_fence) == (-4, 12)
    assert (result.min, result.whisker_low, result.whisker_high, result.max) == (1, 1, 7, 20)
    assert [point.value for point in result.outliers] == [20]
    assert result.outliers[0].id == 'test:8'
    assert len(result.bins) == 5
    assert [item.count for item in result.bins] == [5, 3, 0, 0, 1]
    assert result.bins[0].lower == 1 and result.bins[-1].upper == 20
    assert sum(item.count for item in result.bins) == result.n
    assert result.excess_kurtosis == pytest.approx(pd.Series(VALUES).kurt())
    assert result.bowley == 0
    assert (result.p10, result.p90) == pytest.approx((1.8, 9.6))
    assert result.kelly == pytest.approx((9.6 + 1.8 - 8) / (9.6 - 1.8))


def test_fence_equality_is_not_an_outlier_and_histogram_edges_are_left_closed():
    result = describe([-3, 0, 0, 1, 2, 2, 5])
    assert (result.lower_fence, result.upper_fence) == (-3, 5)
    assert result.outliers == []
    assert (result.whisker_low, result.whisker_high) == (-3, 5)
    assert [(item.lower, item.upper, item.count) for item in result.bins] == [
        (-3, -1, 1), (-1, 1, 2), (1, 3, 3), (3, 5, 1)]


@pytest.mark.parametrize('values', [[0], [5, 5, 5, 5], [0, 0, 0, 0]])
def test_constant_and_singleton_statistics_are_not_fabricated(values):
    limitations = []
    result = describe(values, limitations)
    assert len(result.bins) == 1 and result.bins[0].lower < values[0] < result.bins[0].upper
    assert result.bins[0].count == len(values)
    assert result.variance == (None if len(values) == 1 else 0)
    assert result.std == (None if len(values) == 1 else 0)
    assert result.bowley is result.kelly is result.excess_kurtosis is result.kurtosis_class is None
    assert result.outliers == []
    assert any('Q3 − Q1' in text for text in limitations)
    assert any('P90 − P10' in text for text in limitations)
    json.dumps(result.model_dump(mode='json'), allow_nan=False)


def test_zero_iqr_keeps_fences_and_original_outlier():
    result = describe([0, 0, 0, 0, 10])
    assert result.iqr == result.lower_fence == result.upper_fence == 0
    assert [point.value for point in result.outliers] == [10]
    assert result.whisker_low == result.whisker_high == 0
    assert result.bowley is None


@pytest.mark.parametrize('values, classification', [([-2, -1, 0, 1, 2], 'platykurtic'), (VALUES, 'leptokurtic')])
def test_kurtosis_class_uses_unbiased_fisher_statistic(values, classification):
    result = describe(values)
    assert result.excess_kurtosis == pytest.approx(pd.Series(values).kurt())
    assert result.kurtosis_class == classification


def test_regression_keeps_library_coefficients_and_degenerate_points():
    pairs = [PairPoint(id=str(x), label=str(x), x=x, y=2*x) for x in (1, 2, 3, 4)]
    fit = regression(pairs)
    assert (fit.n, fit.slope, fit.intercept, fit.r, fit.r_squared) == (4, 2, 0, 1, 1)
    for selected in (pairs[:2], [point.model_copy(update={'x': 1}) for point in pairs],
                     [point.model_copy(update={'y': 1}) for point in pairs]):
        unavailable = regression(selected)
        assert unavailable.n == len(selected) and unavailable.reason
        assert unavailable.slope is unavailable.intercept is unavailable.r is unavailable.r_squared is None


def test_pooled_model_matches_specified_formula_and_decision_boundary():
    result = pooled_test(describe([1, 2, 3]), describe([2, 3, 4]), [])
    assert result.pooled_sd == 1 and result.df == 4
    assert result.t == pytest.approx(-1.224744871)
    assert result.p_value == pytest.approx(.287864135)
    assert result.decision == 'fail_to_reject' and result.alpha == .05
    assert test_decision(.05) == 'reject'
    assert test_decision(.0500000001) == 'fail_to_reject'
    for a, b in (([1], [1, 2]), ([1, 1], [2, 2])):
        unavailable = pooled_test(describe(a), describe(b), [])
        assert unavailable.decision == 'unavailable' and unavailable.reason
        assert unavailable.p_value is unavailable.t is unavailable.pooled_sd is None


def test_nonfinite_computed_statistics_serialize_as_null(prepared, monkeypatch):
    service, client = prepared()
    original = statistics.summarize
    def overflow(*args, **kwargs):
        result = original(*args, **kwargs)
        result.loc[:, ['mean', 'variance', 'std']] = float('inf')
        return result
    monkeypatch.setattr(statistics, 'summarize', overflow)
    result = get(client, 'distribution', dataset='rainfall', state_id='OD').json()
    assert result['data']['summary']['mean'] is None
    assert result['data']['summary']['variance'] is None
    assert any('mean' in text and 'non-finite' in text for text in result['meta']['limitations'])
    json.dumps(result, allow_nan=False)


def test_nonfinite_audit_summaries_remain_null_not_missing_measurements(prepared, monkeypatch):
    _, client = prepared()
    original = statistics.summarize
    def nonfinite(*args, **kwargs):
        result = original(*args, **kwargs)
        result.loc['value', ['mean', 'variance', 'std', 'min', 'max']] = float('inf')
        return result
    monkeypatch.setattr(statistics, 'summarize', nonfinite)
    response = get(client, 'audit', dataset='rainfall', state_id='OD')
    assert response.status_code == 200
    body = response.json()
    value = next(item for item in body['data']['numeric'] if item['name'] == 'value')
    assert value['count'] == 9 and value['median'] == 4
    assert all(value[name] is None for name in ('mean', 'variance', 'std', 'min', 'max'))
    assert next(item for item in body['data']['columns'] if item['name'] == 'value')['missing'] == 0
    assert any('value mean' in text and 'non-finite' in text for text in body['meta']['limitations'])
    json.dumps(body, allow_nan=False)


def test_nonfinite_regression_keeps_pairs_and_explains_null_coefficients(prepared, monkeypatch):
    _, client = prepared()
    original = statistics.linear_regression
    def nonfinite(*args, **kwargs):
        return original(*args, **kwargs) | dict(slope=float('inf'), intercept=float('nan'))
    monkeypatch.setattr(statistics, 'linear_regression', nonfinite)
    response = get(client, 'relationship', storm_id='TEST-STORM')
    assert response.status_code == 200
    body = response.json()
    assert len(body['data']['points']) == body['data']['regression']['n'] == 4
    assert body['data']['regression']['slope'] is body['data']['regression']['intercept'] is None
    assert body['data']['regression']['r'] == -1 and body['data']['regression']['r_squared'] == 1
    assert body['data']['regression']['reason']
    assert any('slope' in text and 'non-finite' in text for text in body['meta']['limitations'])
    json.dumps(body, allow_nan=False)


def test_nonfinite_pooled_probability_has_no_decision_for_current_selection(prepared, monkeypatch):
    _, client = prepared()
    monkeypatch.setattr('app.services.dav_service.student_t.sf', lambda *args: float('nan'))
    response = get(client, 'comparison', state_a='OD', state_b='KL', metric='flood_event_count', **BOUNDS)
    assert response.status_code == 200
    body = response.json()
    test = body['data']['test']
    assert test['n_a'] == test['n_b'] == 3
    assert test['t'] == pytest.approx(-1.224744871) and test['pooled_sd'] == 1 and test['df'] == 4
    assert test['p_value'] is None and test['decision'] == 'unavailable' and test['reason']
    assert any('p-value' in text and 'non-finite' in text for text in body['meta']['limitations'])
    json.dumps(body, allow_nan=False)


def test_exact_region_month_period_and_audit_use_same_rows(prepared):
    service, client = prepared()
    selection = dict(dataset='temperature', region='OD', month=1, **BOUNDS)
    result = service.execute('distribution', selection)
    assert [point['value'] for point in result.data['points']] == [0, 4]
    assert [point['id'] for point in result.data['points']] == ['OD:2019:1', 'OD:2020:1']
    assert result.meta.unit == '°C' and result.meta.period == Period(start='2019', end='2021')
    audit = service.execute('audit', selection)
    assert audit.data['rows'] == result.data['summary']['n'] == 2
    assert next(item for item in audit.data['numeric'] if item['name'] == 'value')['mean'] == 2
    annual_and_months = service.execute('distribution', selection | {'month': None})
    assert annual_and_months.data['summary']['n'] == 6
    named = service.execute('distribution', selection | {'region': 'Odisha', 'month': None})
    assert [point['value'] for point in named.data['points']] == [99]
    bounded = service.execute('distribution', selection | {'start_year': 2020, 'end_year': 2020})
    assert bounded.data['summary']['n'] == 1 and bounded.data['points'][0]['value'] == 4
    assert get(client, 'distribution', dataset='drought', state_id='OD').status_code == 422


def test_null_tracks_zero_and_valid_empty_have_complete_metadata(prepared):
    service, client = prepared(updates={'tracks': [track(1, 0, None), track(2, None, None)]})
    result = get(client, 'distribution', dataset='tracks', storm_id='TEST-STORM', measure='wind').json()
    assert result['data']['summary']['n'] == result['data']['summary']['missing'] == 1
    assert result['data']['points'][0]['value'] == 0
    audit = get(client, 'audit', dataset='tracks', storm_id='TEST-STORM').json()['data']
    assert audit['rows'] == 2
    assert next(column for column in audit['columns'] if column['name'] == 'wind')['missing'] == 1
    for parameters in (dict(dataset='tracks', storm_id='TEST-STORM', measure='pressure'),
                       dict(dataset='rainfall', state_id='KL')):
        empty = get(client, 'distribution', **parameters).json()
        assert empty['status'] == 'no_data' and empty['data'] is None
        assert empty['meta']['observation_count'] == 0
        assert all(key in empty['meta'] for key in ('metric', 'geographic_level', 'time_resolution', 'source_ids', 'period', 'unit'))
        json.dumps(empty, allow_nan=False)


def test_comparison_embeds_unchanged_plugin_result_and_joins_years(prepared):
    service, client = prepared()
    parameters = dict(state_a='OD', state_b='KL', metric='flood_event_count', **BOUNDS)
    expected = client.get('/api/v1/compare', params=parameters).json()['data']
    response = get(client, 'comparison', **parameters).json()
    assert response['data']['comparison'] == expected
    assert response['data']['a']['mean'] == 2 and response['data']['b']['mean'] == 3
    assert response['data']['test']['p_value'] == pytest.approx(.287864135)
    assert any('Assumption-dependent model' in text for text in response['meta']['limitations'])
    # An existing plugin may return unsorted or one-sided annual observations.
    custom = ComparisonResult(state_a='OD', state_b='KL', metric='flood_event_count', unit='events',
        period=Period(start='2019', end='2022'), state_a_value=1234, state_b_value=5678,
        series=[ComparisonPoint(year=2021, state_a=3, state_b=6),
                ComparisonPoint(year=2019, state_a=1, state_b=2),
                ComparisonPoint(year=2022, state_a=None, state_b=50),
                ComparisonPoint(year=2020, state_a=2, state_b=4)])
    original = Envelope(status='ok', data=custom.model_dump(mode='json'), meta=Metadata(
        metric='flood_event_count', geographic_level='state', time_resolution='annual', observation_count=7))
    service.analytics.execute = lambda operation, parameters: original
    result = service.execute('comparison', parameters)
    assert result.data['comparison'] == custom.model_dump(mode='json')
    assert [(point['label'].split(' · ')[-1], point['x'], point['y']) for point in result.data['points']] == [('2019', 1, 2), ('2020', 2, 4), ('2021', 3, 6)]
    assert result.data['a']['mean'] == 2 and result.data['a']['n'] == 3
    assert result.data['b']['n'] == 4
    assert result.data['regression']['slope'] == 2
    assert original.meta.method is None  # DAV provenance must not mutate the delegated envelope.


def test_catalog_coverage_gaps_state_zeros_all_states_and_undated_exclusions(prepared):
    floods = [event('f1976', 1976), event('f1978', 1978, 'KL'), event('unassigned', 1978, None),
              event('unknown-period', None), event('other-undated', None, 'KL')]
    landslides = [event('l2007', 2007), event('selected-undated', None)]
    service, _ = prepared(updates={'floods': floods, 'landslides': landslides})
    counts = service.execute('counts', dict(state_id='OD', start_year=1970, end_year=2009))
    grouped = {(row['hazard'], row['decade']): row for row in counts.data['rows']}
    assert grouped['floods', 1970]['count'] == 1
    assert grouped['landslides', 1970]['count'] is None
    assert grouped['landslides', 1970]['reason'] == 'No catalog coverage in this period'
    assert counts.data['excluded_undated'] == 2
    all_states = service.execute('counts', dict(start_year=1970, end_year=2009))
    assert sum(row['count'] or 0 for row in all_states.data['rows']) == 4
    assert all_states.data['excluded_undated'] == 3
    zero = service.execute('comparison', dict(state_a='OD', state_b='KL', metric='flood_event_count', start_year=1976, end_year=1978))
    assert [point['year'] for point in zero.data['comparison']['series']] == [1976, 1978]
    assert zero.data['comparison']['series'][1]['state_a'] == 0
    missing_year = service.execute('comparison', dict(state_a='OD', state_b='KL', metric='flood_event_count', start_year=1977, end_year=1977))
    assert missing_year.status == 'no_data' and missing_year.data is None


def test_counts_are_complete_not_page_limited_and_preserve_coverage_zero(prepared):
    floods = [event(f'f{i}', 2019) for i in range(603)]
    service, client = prepared(updates={'floods': floods, 'landslides': [event('elsewhere', 2019, 'KL')]})
    page = client.get('/api/v1/events/floods', params=dict(state_id='OD', limit=1)).json()['data']
    assert len(page['items']) == 1 and page['total'] == 603
    result = service.execute('counts', dict(state_id='OD', **BOUNDS))
    assert [(row['hazard'], row['count']) for row in result.data['rows']] == [('floods', 603), ('landslides', 0)]


def test_relationship_preserves_storm_timestamp_pairs_exclusions_and_units(prepared):
    service, client = prepared()
    result = service.execute('relationship', dict(storm_id='TEST-STORM'))
    assert result.data['x_unit'] == 'kts' and result.data['y_unit'] == 'hPa'
    assert [(point['x'], point['y']) for point in result.data['points']] == [(2, 998), (4, 996), (6, 994), (8, 992)]
    assert [point['id'] for point in result.data['points']] == [f'TEST-STORM:2019-01-{day:02d}T00:00:00Z' for day in range(1, 5)]
    assert result.data['regression']['slope'] == -1
    assert any('2 source rows excluded' in text for text in result.meta.limitations)
    assert service.execute('audit', dict(dataset='tracks', storm_id='TEST-STORM')).data['rows'] == 6
    assert get(client, 'relationship', storm_id='missing').status_code == 404


@pytest.mark.parametrize('measure,unit', [('wind', 'km/h'), ('pressure', 'Pa')])
def test_relationship_rejects_mixed_units_instead_of_converting(prepared, measure, unit):
    service, client = prepared(updates={'tracks': [track(1, 2, 998), track(2, 4, 996, **{measure + '_unit': unit})]})
    response = get(client, 'relationship', storm_id='TEST-STORM')
    assert response.status_code == 422 and response.json()['error']['code'] == 'UNSUPPORTED_ANALYSIS'


def test_correlations_keep_five_labels_and_explicit_state_year_pairs(prepared):
    service, _ = prepared()
    result = service.execute('correlations', dict(state_id='OD', **BOUNDS))
    assert result.data['variables'] == ['rainfall', 'floods', 'landslides', 'temperature', 'drought']
    cells = {(cell['x'], cell['y']): cell for cell in result.data['cells']}
    assert len(cells) == 25
    for variable, reason in (('rainfall', 'Daily observations; annual total not available.'),
                             ('drought', 'National series cannot be assigned to this state.')):
        assert cells[variable, variable]['r'] is None and cells[variable, variable]['reason'] == reason
    supported = cells['floods', 'temperature']
    assert supported['n'] == 3 and supported['r'] == pytest.approx(1)
    assert [(point['x'], point['y']) for point in supported['points']] == [(1, 10), (2, 20), (3, 30)]
    assert [point['label'] for point in supported['points']] == ['OD · 2019', 'OD · 2020', 'OD · 2021']


@pytest.mark.parametrize('temperature,meta,reason', [
    ([dict(region='Odisha', year=2019, value=99)], {}, 'No annual state-code'),
    ([dict(region='OD', year=2019, value=1), dict(region='OD', year=2019, value=2)], {}, 'Duplicate annual'),
    ([dict(region='OD', year=2019, value=1)], {'time_resolution': 'monthly'}, 'does not declare annual'),
])
def test_temperature_matrix_rejects_aliases_duplicates_and_wrong_grain(prepared, monkeypatch, temperature, meta, reason):
    service, _ = prepared(meta_updates={'temperature': meta})
    records = service.repository.records
    source = records('temperature')[1]
    # Exercise the DAV guard independently; production repository validation
    # already rejects duplicate prepared identities before analysis.
    monkeypatch.setattr(service.repository, 'records', lambda name: (
        deepcopy(temperature), source.model_copy(deep=True)
    ) if name == 'temperature' else records(name))
    result = service.execute('correlations', dict(state_id='OD', **BOUNDS))
    selected = next(cell for cell in result.data['cells'] if cell['x'] == cell['y'] == 'temperature')
    assert selected['r'] is None and reason in selected['reason']
    assert selected['points'] == []


def test_nonfinite_matrix_coefficients_are_null_with_current_scope_metadata(prepared, monkeypatch):
    _, client = prepared()
    original = statistics.correlation_matrix
    def nonfinite(*args, **kwargs):
        result = original(*args, **kwargs)
        result.loc['x', 'y'] = float('inf')
        return result
    monkeypatch.setattr(statistics, 'correlation_matrix', nonfinite)
    response = get(client, 'correlations', state_id='OD', **BOUNDS)
    assert response.status_code == 200
    body = response.json()
    selected = next(cell for cell in body['data']['cells'] if cell['x'] == 'floods' and cell['y'] == 'temperature')
    assert selected['n'] == 3 and len(selected['points']) == 3
    assert selected['r'] is None and 'non-finite' in selected['reason']
    assert selected['regression']['slope'] == 10
    assert body['meta']['period'] == dict(start='2019', end='2021')
    assert body['meta']['source_ids'] == ['test-floods', 'test-landslides', 'test-temperature']
    assert any('Pearson correlation' in text and 'null' in text for text in body['meta']['limitations'])
    json.dumps(body, allow_nan=False)


def test_matrix_pairwise_year_join_retains_insufficient_points_without_filling_gaps(prepared):
    temperature = [dict(region='OD', year=year, value=value)
                   for year, value in ((2022, 40), (2019, 10), (2020, 20))]
    floods = [event(f'f-{year}-{i}', year) for year, count in ((2018, 1), (2019, 2), (2021, 3), (2022, 4))
              for i in range(count)]
    service, _ = prepared(updates={'temperature': temperature, 'floods': floods})
    result = service.execute('correlations', dict(state_id='OD', start_year=2018, end_year=2022))
    selected = next(cell for cell in result.data['cells'] if cell['x'] == 'floods' and cell['y'] == 'temperature')
    assert [(point['id'], point['x'], point['y']) for point in selected['points']] == [
        ('OD:2019', 2, 10), ('OD:2022', 4, 40)]
    assert selected['n'] == 2 and selected['r'] is None
    assert selected['regression']['slope'] is None and selected['reason']


def test_matrix_observed_catalog_zeros_remain_data_but_absent_years_do_not(prepared):
    service, client = prepared(updates={
        'floods': [event(f'f-{year}', year, 'KL') for year in (1976, 1978, 1979)],
        'landslides': [event(f'l-{year}', year, 'KL') for year in (1976, 1978, 1979)],
        'temperature': [],
    })
    result = service.execute('correlations', dict(state_id='OD', start_year=1976, end_year=1979))
    assert result.status == 'ok' and result.meta.observation_count == 6
    selected = next(cell for cell in result.data['cells'] if cell['x'] == 'floods' and cell['y'] == 'landslides')
    assert selected['n'] == 3 and selected['r'] is None
    assert [(point['id'], point['x'], point['y']) for point in selected['points']] == [
        (f'OD:{year}', 0, 0) for year in (1976, 1978, 1979)]
    assert selected['regression']['slope'] is None and selected['reason']
    empty = get(client, 'correlations', state_id='OD', start_year=1977, end_year=1977).json()
    assert empty['status'] == 'no_data' and empty['data'] is None
    assert empty['meta']['observation_count'] == 0
    assert empty['meta']['source_ids'] == ['test-floods', 'test-landslides', 'test-temperature']


def test_audit_normalizes_nested_exact_duplicates_separately_from_identity_duplicates(prepared, monkeypatch):
    first = event('same-id', 2019, attributes={'a': 1, 'nested': {'x': 0, 'y': [1, 2]}})
    reordered = event('same-id', 2019, attributes={'nested': {'y': [1, 2], 'x': 0}, 'a': 1})
    different = event('same-id', 2019, attributes={'a': 2})
    service, _ = prepared()
    records = service.repository.records
    source = records('floods')[1]
    audit_rows = [first, reordered, different, event('outside', 2018)]
    monkeypatch.setattr(service.repository, 'records', lambda name: (
        deepcopy(audit_rows), source.model_copy(deep=True)
    ) if name == 'floods' else records(name))
    result = service.execute('audit', dict(dataset='floods', state_id='OD', **BOUNDS))
    assert result.data['scope'] == 'filtered_prepared_records'
    assert result.data['rows'] == 3 and result.data['duplicate_rows'] == 1
    assert result.data['duplicate_identities'] == 2
    assert next(column for column in result.data['columns'] if column['name'] == 'longitude')['missing'] == 3
    assert any('Prepared records; excluded source rows are not included.' == text for text in result.meta.limitations)
    json.dumps(result.model_dump(mode='json'), allow_nan=False)


@pytest.mark.parametrize('operation,parameters', [
    ('distribution', dict(dataset='rainfall', state_id='OD')),
    ('comparison', dict(state_a='OD', state_b='KL', metric='flood_event_count', **BOUNDS)),
    ('relationship', dict(dataset='tracks', storm_id='TEST-STORM')),
    ('counts', BOUNDS),
    ('correlations', dict(state_id='OD', **BOUNDS)),
    ('audit', dict(dataset='rainfall', state_id='OD')),
])
def test_all_six_api_shapes_are_discriminated_and_finite(prepared, operation, parameters):
    _, client = prepared()
    response = get(client, operation, **parameters)
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'ok' and body['data']['kind'] == operation
    TypeAdapter(DAVPayload).validate_python(body['data'])
    assert body['meta']['observation_count'] >= 0 and body['meta']['method']
    assert body['meta']['source_ids']
    json.dumps(body, allow_nan=False)


@pytest.mark.parametrize('operation,parameters,code', [
    ('distribution', dict(dataset='rainfall'), 'UNSUPPORTED_ANALYSIS'),
    ('distribution', dict(dataset='temperature'), 'UNSUPPORTED_ANALYSIS'),
    ('distribution', dict(dataset='temperature', region='OD', month=13), 'INVALID_REQUEST'),
    ('distribution', dict(dataset='temperature', region='OD', month=0), 'INVALID_REQUEST'),
    ('distribution', dict(dataset='drought', state_id='OD'), 'UNSUPPORTED_ANALYSIS'),
    ('distribution', dict(dataset='rainfall', state_id='OD', measure='wind'), 'UNSUPPORTED_ANALYSIS'),
    ('distribution', dict(dataset='floods'), 'UNSUPPORTED_ANALYSIS'),
    ('distribution', dict(dataset='tracks', storm_id='TEST-STORM'), 'UNSUPPORTED_ANALYSIS'),
    ('distribution', dict(dataset='rainfall', state_id='OD', storm_id='TEST-STORM'), 'UNSUPPORTED_ANALYSIS'),
    ('relationship', dict(dataset='rainfall', storm_id='TEST-STORM'), 'UNSUPPORTED_ANALYSIS'),
    ('relationship', dict(storm_id='TEST-STORM', measure='wind'), 'UNSUPPORTED_ANALYSIS'),
    ('counts', {}, 'UNSUPPORTED_ANALYSIS'),
    ('counts', dict(start_year=2019), 'INVALID_PERIOD'),
    ('counts', dict(start_year=2021, end_year=2019), 'INVALID_PERIOD'),
    ('correlations', BOUNDS, 'UNSUPPORTED_ANALYSIS'),
    ('audit', dict(dataset='drought', region='OD'), 'UNSUPPORTED_ANALYSIS'),
    ('comparison', dict(state_a='OD', state_b='OD', metric='flood_event_count', **BOUNDS), 'UNSUPPORTED_ANALYSIS'),
    ('comparison', dict(state_a='OD', state_b='KL', metric='rainfall_annual_total', **BOUNDS), 'UNSUPPORTED_ANALYSIS'),
])
def test_api_rejects_incompatible_selections_without_substitution(prepared, operation, parameters, code):
    _, client = prepared()
    response = get(client, operation, **parameters)
    assert response.status_code == 422 and response.json()['error']['code'] == code
    assert 'data' not in response.json()


@pytest.mark.parametrize('operation,parameters', [
    ('distribution', dict(dataset='rainfall', state_id='unknown')),
    ('distribution', dict(dataset='tracks', storm_id='unknown', measure='wind')),
    ('comparison', dict(state_a='OD', state_b='unknown', metric='flood_event_count', **BOUNDS)),
    ('counts', dict(state_id='unknown', **BOUNDS)),
    ('correlations', dict(state_id='unknown', **BOUNDS)),
    ('audit', dict(dataset='floods', state_id='unknown')),
])
def test_unknown_identifiers_are_404(prepared, operation, parameters):
    _, client = prepared()
    assert get(client, operation, **parameters).status_code == 404


def test_unavailable_dataset_is_503_but_does_not_block_other_supported_analysis(prepared):
    _, client = prepared(missing=('rainfall',))
    unavailable = get(client, 'distribution', dataset='rainfall', state_id='OD')
    assert unavailable.status_code == 503 and unavailable.json()['error']['code'] == 'DATASET_UNAVAILABLE'
    comparison = get(client, 'comparison', state_a='OD', state_b='KL', metric='flood_event_count', **BOUNDS)
    assert comparison.status_code == 200 and comparison.json()['data']['comparison']['metric'] == 'flood_event_count'
    assert get(client, 'distribution', dataset='drought').status_code == 200


@pytest.mark.parametrize('operation,dataset,rows,selection', [
    ('audit', 'floods', [event('duplicate', 2019), event('duplicate', 2019)], dict(state_id='OD')),
    ('correlations', 'temperature', [dict(region='OD', year=2019, value=1),
                                   dict(region='OD', year=2019, value=2)], dict(state_id='OD', **BOUNDS)),
])
def test_duplicate_prepared_identities_preserve_repository_error(prepared, operation, dataset, rows, selection):
    _, client = prepared(updates={dataset: rows})
    parameters = selection | ({'dataset': dataset} if operation == 'audit' else {})
    response = get(client, operation, **parameters)
    assert response.status_code == 503
    assert response.json()['error']['code'] == 'DATASET_INVALID'


def test_strict_models_reject_unknown_fields_and_nonfinite_source_points():
    with pytest.raises(ValidationError):
        SamplePoint(id='test', label='test', value=float('nan'))
    with pytest.raises(ValidationError):
        PairPoint(id='test', label='test', x=0, y=1, extra='not allowed')
