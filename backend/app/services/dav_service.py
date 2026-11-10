"""Prepared-sample DAV orchestration, separate from the three-operation plugin.

NIElytics owns summaries, quantiles, IQR flags, OLS, Pearson correlation and
profiling. ClimateLens DAV owns the specified bins, shape ratios and SciPy
pooled educational test. No daily-to-annual climate measurements are created.
"""

from __future__ import annotations

from collections import Counter
import json
import math

import pandas as pd
from nielytics.core import outliers, profiler, statistics
from scipy.stats import t as student_t

from app.core.errors import AppError
from app.models import Envelope, Metadata, Period
from app.services.analytics_models import ComparisonResult
from app.services.climate_service import ClimateService
from app.services.dav_models import (
    AuditColumn, AuditPayload, Bin, ComparisonDAVPayload, CorrelationCell,
    CorrelationsPayload, CountRow, CountsPayload, Distribution, DistributionPayload,
    NumericAudit, PairPoint, Regression, RelationshipPayload, SamplePoint, Test,
)


_COUNT_LIMITATION = (
    'Counts reflect documented catalog events matched to each state per catalog year; '
    'years with zero reported events for a state are 0 in that catalog year, not proof of zero hazard.'
)
_IDENTITIES = {
    'rainfall': ('state_id', 'year', 'date'), 'temperature': ('region', 'year', 'month'),
    'drought': ('year',), 'tracks': ('storm_id', 'timestamp'),
    'floods': ('event_id',), 'landslides': ('event_id',),
}


def _unsupported(reason: str) -> AppError:
    return AppError('UNSUPPORTED_ANALYSIS', reason, 422, details={'reason': reason})


def _finite(value, name: str, limitations: list[str]) -> float | None:
    if value is not None and math.isfinite(float(value)):
        return float(value)
    limitations.append(f'{name} is undefined or non-finite and is returned as null.')
    return None


def distribution(points: list[SamplePoint], missing: int, limitations: list[str]) -> Distribution:
    """Describe finite source points without discarding their observation identities."""
    frame = pd.DataFrame({'value': pd.Series([point.value for point in points], dtype=float)})
    summary = statistics.summarize(frame, columns=['value'], ddof=1).loc['value']
    quantiles = statistics.quantiles(frame, columns=['value'], q=[.1, .25, .5, .75, .9])['value']
    values = {name: _finite(summary[name], name, limitations)
              for name in ('mean', 'median', 'variance', 'std', 'min', 'max')}
    values.update({name: _finite(quantiles.loc[q], name, limitations)
                   for name, q in (('p10', .1), ('q1', .25), ('q3', .75), ('p90', .9))})
    n = len(points)
    flags = outliers.detect_outliers(frame, 'value', method='iqr', threshold=1.5)
    inliers = [point.value for point, flag in zip(points, flags) if not flag]
    iqr = _finite(values['q3'] - values['q1'], 'IQR', limitations) if values['q3'] is not None and values['q1'] is not None else None
    lower = None if iqr is None else _finite(values['q1'] - 1.5 * iqr, 'Lower fence', limitations)
    upper = None if iqr is None else _finite(values['q3'] + 1.5 * iqr, 'Upper fence', limitations)
    bowley = kelly = None
    if iqr is not None and iqr > 0 and values['median'] is not None:
        bowley = _finite((values['q3'] + values['q1'] - 2 * values['median']) / iqr, 'Bowley skewness', limitations)
    else:
        limitations.append('Bowley skewness unavailable: Q3 − Q1 is zero or undefined.')
    if all(values[key] is not None for key in ('p10', 'p90', 'median')) and values['p90'] != values['p10']:
        kelly = _finite((values['p90'] + values['p10'] - 2 * values['median']) / (values['p90'] - values['p10']), 'Kelly skewness', limitations)
    else:
        limitations.append('Kelly skewness unavailable: P90 − P10 is zero or undefined.')
    kurtosis = None
    if n >= 4 and values['min'] != values['max']:
        kurtosis = _finite(summary['kurtosis'], 'Unbiased Fisher excess kurtosis', limitations)
    else:
        limitations.append('Unbiased Fisher excess kurtosis unavailable: requires at least four observations and nonconstant values.')
    kurtosis_class = None if kurtosis is None else ('mesokurtic' if abs(kurtosis) <= .05 else 'leptokurtic' if kurtosis > .05 else 'platykurtic')
    limitations.append('Kurtosis uses the descriptive ±0.05 approximately mesokurtic convention; not a normality test or extreme-disaster risk measure. IQR flags do not establish bad measurements or disasters.')
    bins = []
    if n:
        low, high = min(point.value for point in points), max(point.value for point in points)
        if low == high:
            width = max(1.0, abs(low) * .01)
            bounds = (low - width / 2, high + width / 2)
            if all(math.isfinite(edge) for edge in bounds) and bounds[0] < bounds[1]:
                bins = [Bin(lower=bounds[0], upper=bounds[1], count=n)]
            else:
                limitations.append('Histogram bounds are non-finite or indistinguishable at source precision; bins are unavailable.')
        else:
            k = 1 + math.ceil(math.log2(n))
            edges = [low if i == 0 else high if i == k else low * (1 - i / k) + high * (i / k) for i in range(k + 1)]
            # Left-closed bins; include the observed maximum in the final bin.
            counts = [0] * k
            index_edges = pd.Index(edges)
            for point in points:
                index = min(k - 1, int(index_edges.searchsorted(point.value, side='right')) - 1)
                counts[index] += 1
            bins = [Bin(lower=edges[i], upper=edges[i + 1], count=counts[i]) for i in range(k)]
    return Distribution(n=n, missing=missing, **values, iqr=iqr, lower_fence=lower,
                        upper_fence=upper, whisker_low=min(inliers) if inliers else None,
                        whisker_high=max(inliers) if inliers else None, bowley=bowley,
                        kelly=kelly, excess_kurtosis=kurtosis, kurtosis_class=kurtosis_class,
                        bins=bins, outliers=[point for point, flag in zip(points, flags) if flag])


def _unavailable_regression(n: int, reason: str) -> Regression:
    return Regression(n=n, slope=None, intercept=None, r=None, r_squared=None, reason=reason)


def regression(points: list[PairPoint]) -> Regression:
    if len(points) < 3:
        return _unavailable_regression(len(points), 'At least three complete pairs are required.')
    if len({point.x for point in points}) < 2 or len({point.y for point in points}) < 2:
        return _unavailable_regression(len(points), 'Both axes must vary; a constant axis has no available regression or correlation.')
    frame = pd.DataFrame({'x': [point.x for point in points], 'y': [point.y for point in points]})
    result = statistics.linear_regression(frame, 'x', 'y')
    limitations = []
    coefficients = {name: _finite(result[key], name, limitations) for name, key in
                    (('slope', 'slope'), ('intercept', 'intercept'), ('r', 'r_value'), ('r_squared', 'r_squared'))}
    return Regression(n=len(points), **coefficients, reason=' '.join(limitations) or None)


def test_decision(p: float) -> str:
    return 'reject' if p <= .05 else 'fail_to_reject'


# This public calculation helper is not a pytest test when imported into tests.
test_decision.__test__ = False


def pooled_test(a: Distribution, b: Distribution, limitations: list[str]) -> Test:
    result = dict(n_a=a.n, n_b=b.n, mean_a=a.mean, mean_b=b.mean,
                  variance_a=a.variance, variance_b=b.variance,
                  pooled_sd=None, t=None, p_value=None, df=None,
                  decision='unavailable', reason=None)
    if min(a.n, b.n) < 2 or any(value is None for value in (a.variance, b.variance, a.mean, b.mean)):
        result['reason'] = 'Pooled test requires at least two observations per group and available sample variances.'
    else:
        df = a.n + b.n - 2
        pooled_variance = ((a.n - 1) * a.variance + (b.n - 1) * b.variance) / df
        if not math.isfinite(pooled_variance) or pooled_variance <= 0:
            result['reason'] = 'Pooled test requires positive finite pooled variance.'
        else:
            pooled_sd = math.sqrt(pooled_variance)
            t = _finite((a.mean - b.mean) / (pooled_sd * math.sqrt(1 / a.n + 1 / b.n)), 'Pooled t statistic', limitations)
            p = None if t is None else _finite(2 * student_t.sf(abs(t), df), 'Pooled two-sided p-value', limitations)
            result.update(pooled_sd=pooled_sd, t=t, p_value=p, df=df,
                          decision=test_decision(p) if p is not None else 'unavailable',
                          reason=None if p is not None else 'Non-finite pooled-test statistic.')
    if result['reason']:
        limitations.append(result['reason'])
    return Test(**result)


def _year(row: dict) -> int | None:
    return row.get('year') if row.get('year') is not None else (int(row['timestamp'][:4]) if row.get('timestamp') else None)


def _annual_counts(rows: list[dict], state_id: str, start: int, end: int) -> dict[int, float]:
    """Exactly the adapter's catalog-observed-year policy, never all calendar years."""
    years = sorted({_year(row) for row in rows if _year(row) is not None and start <= _year(row) <= end})
    observed = set(years)
    counts = Counter(_year(row) for row in rows if row.get('state_id') == state_id and _year(row) in observed)
    return {year: float(counts[year]) for year in years}


def _pairs(left: dict[int, float], right: dict[int, float], identity: str) -> list[PairPoint]:
    return [PairPoint(id=f'{identity}:{year}', label=f'{identity} · {year}', x=left[year], y=right[year])
            for year in sorted(left.keys() & right.keys())]


def _normalized(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False) if isinstance(value, (dict, list)) else value


class DAVService:
    def __init__(self, repository, analytics):
        self.repository = repository
        self.analytics = analytics
        self.climate = ClimateService(repository)

    def execute(self, operation: str, parameters: dict) -> Envelope:
        p = {key: value for key, value in parameters.items() if value is not None}
        start, end = p.get('start_year'), p.get('end_year')
        if (start is None) != (end is None) or (start is not None and start > end):
            raise AppError('INVALID_PERIOD', 'Supply both start_year and end_year in chronological order, or omit both.', 422)
        operations = {'distribution': self._distribution, 'comparison': self._comparison,
                      'relationship': self._relationship, 'counts': self._counts,
                      'correlations': self._correlations, 'audit': self._audit}
        if operation not in operations:
            raise _unsupported('Unsupported DAV operation.')
        return operations[operation](p)

    @staticmethod
    def _allowed(p: dict, keys: set[str], *, dataset=None):
        unsupported = set(p) - keys - {'measure'}
        if unsupported or (p.get('measure', 'value') != 'value' and dataset != 'tracks'):
            raise _unsupported('Selectors are incompatible with this analysis: ' + ', '.join(sorted(unsupported or {'measure'})))

    @staticmethod
    def _required(p: dict, *keys):
        if any(p.get(key) in (None, '') for key in keys):
            raise _unsupported('This analysis requires ' + ', '.join(keys) + '.')

    def _select(self, p: dict, *, numeric: bool):
        self._required(p, 'dataset')
        name = p['dataset']
        if name not in _IDENTITIES or (numeric and name not in {'rainfall', 'temperature', 'drought', 'tracks'}):
            raise _unsupported('The selected dataset does not support this analysis.')
        selectors = {'dataset', 'start_year', 'end_year'}
        if name == 'rainfall':
            selectors.add('state_id')
            self._required(p, 'state_id')
        elif name == 'temperature':
            selectors.update({'region', 'month'})
            self._required(p, 'region')
        elif name == 'tracks':
            selectors.add('storm_id')
            self._required(p, 'storm_id')
            if numeric and p.get('measure', 'value') not in {'wind', 'pressure'}:
                raise _unsupported('Track distributions require measure=wind or pressure.')
        elif name in {'floods', 'landslides'}:
            selectors.add('state_id')
        self._allowed(p, selectors, dataset=name)
        if p.get('month') is not None and not 1 <= p['month'] <= 12:
            raise _unsupported('Temperature month must lie between 1 and 12.')
        if p.get('state_id') is not None:
            self.climate.validate_state(p['state_id'])
        if name == 'tracks':
            storms, _ = self.repository.records('cyclones')
            if not any(row['storm_id'] == p['storm_id'] for row in storms):
                raise AppError('STORM_NOT_FOUND', 'Storm ID is not present in the verified catalog.', 404)
        rows, meta = self.repository.records(name)
        rows = [row for row in rows if all(row.get(key) == p[key] for key in ('state_id', 'region', 'storm_id', 'month') if key in p)]
        if p.get('start_year') is not None:
            rows = [row for row in rows if _year(row) is not None and p['start_year'] <= _year(row) <= p['end_year']]
        rows = sorted(rows, key=lambda row: tuple(str(row.get(key) or '') for key in _IDENTITIES[name]))
        meta = self._meta([meta], p, rows, metric=meta.metric, unit=meta.unit,
                          resolution=meta.time_resolution, geography=meta.geographic_level)
        scope = ', '.join(f'{key}={p[key]}' for key in ('state_id', 'region', 'storm_id', 'month') if key in p)
        if scope:
            meta.limitations.append('Exact prepared-record selection: ' + scope + '.')
        if name == 'temperature' and 'month' in p:
            meta.limitations.append('Selected month excludes year-only temperature records.')
        return name, rows, meta

    @staticmethod
    def _meta(sources: list[Metadata], p: dict, rows: list[dict], *, metric: str, unit=None,
              resolution='annual', geography='state', method=None) -> Metadata:
        labels = [row.get('timestamp') or row.get('date') or str(_year(row)) for row in rows if row.get('timestamp') or row.get('date') or _year(row) is not None]
        period = Period(start=str(p['start_year']), end=str(p['end_year'])) if p.get('start_year') is not None else Period(start=min(labels), end=max(labels)) if labels else Period()
        return Metadata(metric=metric, unit=unit, geographic_level=geography,
                        time_resolution=resolution, period=period,
                        source_ids=list(dict.fromkeys(source for meta in sources for source in meta.source_ids)),
                        observation_count=len(rows), method=method,
                        limitations=list(dict.fromkeys(item for meta in sources for item in meta.limitations)))

    @staticmethod
    def _envelope(payload, meta: Metadata, *, empty=False) -> Envelope:
        meta.limitations = list(dict.fromkeys(meta.limitations))
        if empty:
            meta.observation_count = 0
            meta.limitations.append('No usable prepared observations match the selected analysis.')
        return Envelope(status='no_data' if empty else 'ok', data=None if empty else payload.model_dump(mode='json'), meta=meta)

    @staticmethod
    def _points(name: str, rows: list[dict], measure: str) -> tuple[list[SamplePoint], int]:
        points = []
        missing = 0
        for row in rows:
            value = row.get(measure if name == 'tracks' else 'value')
            if value is None:
                missing += 1
                continue
            if name == 'rainfall':
                identity = f"{row['state_id']}:{row.get('date') or row['year']}"
            elif name == 'temperature':
                identity = f"{row['region']}:{row['year']}:{row.get('month') if row.get('month') is not None else 'annual'}"
            elif name == 'tracks':
                identity = f"{row['storm_id']}:{row['timestamp']}"
            else:
                identity = str(row['year'])
            points.append(SamplePoint(id=identity, label=identity, value=value))
        return points, missing

    @staticmethod
    def _unit(rows: list[dict], measure: str) -> str | None:
        units = {row.get(measure + '_unit') for row in rows if row.get(measure) is not None}
        if len(units) > 1 or any(not unit for unit in units):
            raise _unsupported(f'{measure} measurements require declared consistent units; mixed units are not converted.')
        return next(iter(units), None)

    def _distribution(self, p):
        name, rows, meta = self._select(p, numeric=True)
        measure = p.get('measure', 'value')
        if name == 'tracks':
            meta.unit = self._unit(rows, measure)
            meta.metric = f'cyclone_{measure}'
        points, missing = self._points(name, rows, measure)
        meta.observation_count = len(points)
        meta.method = 'Prepared-record selection; no usable measurements.' if not points else 'NIElytics summarize(ddof=1), unbiased Fisher excess kurtosis, linear quantiles and IQR detection; ClimateLens DAV k=1+ceil(log2(n)) equal-width histogram and Bowley/Kelly shape ratios.'
        meta.limitations.append(f'{missing} source rows have a missing measurement; missing is not zero.')
        if not points:
            return self._envelope(None, meta, empty=True)
        return self._envelope(DistributionPayload(points=points, summary=distribution(points, missing, meta.limitations)), meta)

    def _comparison(self, p):
        self._allowed(p, {'state_a', 'state_b', 'metric', 'start_year', 'end_year'})
        self._required(p, 'state_a', 'state_b', 'metric', 'start_year', 'end_year')
        if p['state_a'] == p['state_b']:
            raise _unsupported('Comparison requires two distinct states.')
        self.climate.validate_state(p['state_a'])
        self.climate.validate_state(p['state_b'])
        metrics = self.repository.metadata().data['capabilities'].get('comparison_metrics', [])
        if p['metric'] not in metrics:
            raise _unsupported('Metric is not advertised comparable by the prepared data manifest.')
        parameters = {key: p[key] for key in ('state_a', 'state_b', 'metric', 'start_year', 'end_year')}
        original = self.analytics.execute('compare', parameters)
        if original.status == 'no_data':
            return original
        comparison = ComparisonResult.model_validate(original.data)
        meta = original.meta.model_copy(deep=True)
        if len({point.year for point in comparison.series}) != len(comparison.series):
            raise _unsupported('Comparison annual series contains duplicate year identities.')
        left = {point.year: point.state_a for point in comparison.series if point.state_a is not None}
        right = {point.year: point.state_b for point in comparison.series if point.state_b is not None}
        a = distribution([SamplePoint(id=f'{comparison.state_a}:{year}', label=f'{comparison.state_a} · {year}', value=value) for year, value in sorted(left.items())], len(comparison.series) - len(left), meta.limitations)
        b = distribution([SamplePoint(id=f'{comparison.state_b}:{year}', label=f'{comparison.state_b} · {year}', value=value) for year, value in sorted(right.items())], len(comparison.series) - len(right), meta.limitations)
        points = _pairs(left, right, f'{comparison.state_a}/{comparison.state_b}')
        fit = regression(points)
        if fit.reason:
            meta.limitations.append(fit.reason)
        meta.limitations.extend([
            'Educational equal-variance pooled two-sided Student t-test, calculated by ClimateLens DAV with scipy.stats.t.sf; not an NIElytics t-test.',
            'Annual observations may be temporally dependent and like-year observations cross-correlated; independence and equal variance have not been established. Correlation is not causation.',
            'Fail to reject H₀ does not establish equal states; a p-value is not the probability H₀ is true and significance is not policy importance.',
        ])
        if p['metric'] in {'flood_event_count', 'landslide_event_count'}:
            meta.limitations.append('Assumption-dependent model on documented counts; independence/equal variance not established; reporting differs')
        meta.method = (meta.method + '; ' if meta.method else '') + 'DAV annual distributions; NIElytics OLS on explicit-year pairs; ClimateLens DAV pooled two-sided Student t-test (SciPy), alpha=0.05.'
        return self._envelope(ComparisonDAVPayload(comparison=comparison, a=a, b=b, points=points, regression=fit, test=pooled_test(a, b, meta.limitations)), meta)

    def _relationship(self, p):
        self._allowed(p, {'dataset', 'storm_id', 'start_year', 'end_year'}, dataset='tracks')
        if p.get('dataset', 'tracks') != 'tracks' or p.get('measure', 'value') != 'value':
            raise _unsupported('Relationship requires same-storm wind/pressure track observations, not a single measure.')
        _, rows, meta = self._select(p | {'dataset': 'tracks'}, numeric=False)
        x_unit, y_unit = self._unit(rows, 'wind'), self._unit(rows, 'pressure')
        pairs = [PairPoint(id=f"{row['storm_id']}:{row['timestamp']}", label=f"{row['storm_id']} · {row['timestamp']}", x=row['wind'], y=row['pressure']) for row in rows if row.get('wind') is not None and row.get('pressure') is not None]
        meta.observation_count = len(pairs)
        meta.metric = 'cyclone_wind_pressure_relationship'
        meta.unit = None
        meta.method = 'NIElytics linear_regression on complete same-storm, identical-timestamp wind/pressure observations; no unit conversion.'
        meta.limitations.extend([f'{len(rows) - len(pairs)} source rows excluded from pairs because wind or pressure is missing; these remain prepared source records.', 'Storm measurements are temporally dependent; association does not establish causation.'])
        fit = regression(pairs)
        if fit.reason:
            meta.limitations.append(fit.reason)
        return self._envelope(RelationshipPayload(points=pairs, regression=fit, x_label='Wind', y_label='Pressure', x_unit=x_unit, y_unit=y_unit), meta, empty=not pairs)

    def _counts(self, p):
        self._allowed(p, {'state_id', 'start_year', 'end_year'})
        self._required(p, 'start_year', 'end_year')
        if 'state_id' in p:
            self.climate.validate_state(p['state_id'])
        catalogs, sources, selected, decades = {}, [], [], set()
        excluded = 0
        for hazard in ('floods', 'landslides'):
            rows, source = self.repository.records(hazard)
            sources.append(source)
            geography = [row for row in rows if 'state_id' not in p or row.get('state_id') == p['state_id']]
            excluded += sum(_year(row) is None for row in geography)
            dated = [row for row in geography if _year(row) is not None and p['start_year'] <= _year(row) <= p['end_year']]
            selected.extend(dated)
            decades.update(_year(row) // 10 * 10 for row in dated)
            catalogs[hazard] = (rows, Counter(_year(row) // 10 * 10 for row in dated))
        result = []
        for decade in sorted(decades):
            for hazard in ('floods', 'landslides'):
                rows, counts = catalogs[hazard]
                covered = any(_year(row) is not None and max(p['start_year'], decade) <= _year(row) <= min(p['end_year'], decade + 9) for row in rows)
                result.append(CountRow(hazard=hazard, decade=decade, count=counts[decade] if covered else None, reason=None if covered else 'No catalog coverage in this period'))
        meta = self._meta(sources, p, selected, metric='documented_catalog_records', unit='events', geography='state' if 'state_id' in p else 'catalog', resolution='decade', method='ClimateLens DAV complete prepared catalog GroupBy(hazard, floor(year/10)*10); catalog-observed coverage, not risk.')
        meta.limitations.extend([_COUNT_LIMITATION, f'{excluded} selected-geography undated rows excluded before period filtering because their period is unknown.', 'All-catalog selection includes unassigned events; counts do not measure hazard risk.'])
        return self._envelope(CountsPayload(rows=result, excluded_undated=excluded), meta, empty=not result)

    def _correlations(self, p):
        self._allowed(p, {'state_id', 'start_year', 'end_year'})
        self._required(p, 'state_id', 'start_year', 'end_year')
        self.climate.validate_state(p['state_id'])
        variables = ('rainfall', 'floods', 'landslides', 'temperature', 'drought')
        unavailable = {'rainfall': 'Daily observations; annual total not available.', 'drought': 'National series cannot be assigned to this state.'}
        annual, sources, selected = {}, [], []
        for hazard in ('floods', 'landslides'):
            rows, source = self.repository.records(hazard)
            sources.append(source)
            annual[hazard] = _annual_counts(rows, p['state_id'], p['start_year'], p['end_year'])
            selected.extend(row for row in rows if row.get('state_id') == p['state_id'] and _year(row) in annual[hazard])
        temperature, source = self.repository.records('temperature')
        sources.append(source)
        temperature = [row for row in temperature if row.get('region') == p['state_id'] and row.get('month') is None and p['start_year'] <= row['year'] <= p['end_year']]
        if source.time_resolution not in {'annual', 'year'}:
            unavailable['temperature'] = 'Temperature metadata does not declare annual resolution.'
        elif not temperature:
            unavailable['temperature'] = 'No annual state-code temperature records; region-name aliases are not substituted.'
        elif len({row['year'] for row in temperature}) != len(temperature):
            unavailable['temperature'] = 'Duplicate annual temperature identities; unique (region, year) records are required.'
        else:
            annual['temperature'] = {row['year']: row['value'] for row in temperature if row.get('value') is not None}
            selected.extend(temperature)
        meta = self._meta(sources, p, selected, metric='annual_state_pairwise_correlations', method='NIElytics correlation_matrix(method=pearson) and linear_regression on explicit state/year joins; pairwise complete observations only.')
        cells = []
        for x in variables:
            for y in variables:
                reason = unavailable.get(x) or unavailable.get(y)
                points = [] if reason else _pairs(annual.get(x, {}), annual.get(y, {}), p['state_id'])
                fit = _unavailable_regression(0, reason) if reason else regression(points)
                r = None
                if fit.reason is None:
                    frame = pd.DataFrame({'x': [point.x for point in points], 'y': [point.y for point in points]})
                    value = statistics.correlation_matrix(frame, method='pearson').loc['x', 'y']
                    r = _finite(value, 'Pearson correlation', meta.limitations)
                    if r is None:
                        reason = 'Pearson correlation is non-finite and is returned as null.'
                reason = reason or fit.reason
                cells.append(CorrelationCell(x=x, y=y, n=len(points), r=r, reason=reason, points=points, regression=fit))
        # Annual documented zero counts are usable observations even when this
        # geography has no incident source rows in the observed catalog years.
        meta.observation_count = sum(len(values) for values in annual.values())
        meta.limitations.extend([_COUNT_LIMITATION, 'Unequal reporting density between states can affect documented event counts.', 'Correlation does not establish causation; annual observations can be temporally dependent.', *unavailable.values()])
        meta.limitations.extend(cell.reason for cell in cells if cell.reason)
        return self._envelope(CorrelationsPayload(variables=variables, cells=cells), meta, empty=not any(annual.values()))

    def _audit(self, p):
        name, rows, meta = self._select(p, numeric=False)
        meta.method = 'NIElytics profile_dataset and summarize(ddof=1); prepared-table isnull().sum(), nested-normalized exact duplicates and observation-identity duplicates.'
        meta.limitations.append('Prepared records; excluded source rows are not included.')
        if not rows:
            return self._envelope(None, meta, empty=True)
        frame = pd.DataFrame(rows)
        normalized = frame.map(_normalized)
        profile = profiler.profile_dataset(normalized)
        columns = [AuditColumn(name=str(column), dtype=str(frame[column].dtype), missing=int(frame[column].isnull().sum())) for column in frame]
        summary_frame = normalized.copy()
        for column in {'year', 'month', 'value', 'wind', 'pressure', 'longitude', 'latitude'} & set(summary_frame):
            summary_frame[column] = pd.to_numeric(summary_frame[column])
        summary = statistics.summarize(summary_frame, ddof=1)
        numeric = [NumericAudit(name=str(column), count=int(summary.loc[column, 'count']), **{
            stat: _finite(summary.loc[column, stat], f'{column} {stat}', meta.limitations)
            for stat in ('mean', 'median', 'variance', 'std', 'min', 'max')}) for column in summary.index]
        identities = [tuple(_normalized(row.get(key)) for key in _IDENTITIES[name]) for row in rows]
        return self._envelope(AuditPayload(rows=len(rows), columns=columns, duplicate_rows=profile['duplicate_count'], duplicate_identities=len(identities) - len(set(identities)), numeric=numeric), meta)
