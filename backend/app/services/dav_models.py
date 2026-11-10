"""Typed prepared-record DAV results; the existing analytics plugin is unchanged."""

from typing import Annotated, Literal

from pydantic import Field

from app.models import StrictModel
from app.services.analytics_models import ComparisonResult


class SamplePoint(StrictModel):
    id: str
    label: str
    value: float


class Bin(StrictModel):
    lower: float
    upper: float
    count: int


class Distribution(StrictModel):
    n: int
    missing: int
    mean: float | None
    median: float | None
    variance: float | None
    std: float | None
    min: float | None
    p10: float | None
    q1: float | None
    q3: float | None
    p90: float | None
    max: float | None
    iqr: float | None
    lower_fence: float | None
    upper_fence: float | None
    whisker_low: float | None
    whisker_high: float | None
    bowley: float | None
    kelly: float | None
    excess_kurtosis: float | None
    kurtosis_class: Literal['leptokurtic', 'mesokurtic', 'platykurtic'] | None
    bins: list[Bin]
    outliers: list[SamplePoint]


class PairPoint(StrictModel):
    id: str
    label: str
    x: float
    y: float


class Regression(StrictModel):
    n: int
    slope: float | None
    intercept: float | None
    r: float | None
    r_squared: float | None
    reason: str | None


class Test(StrictModel):
    n_a: int
    n_b: int
    mean_a: float | None
    mean_b: float | None
    variance_a: float | None
    variance_b: float | None
    pooled_sd: float | None
    t: float | None
    p_value: float | None
    df: int | None
    alpha: Literal[0.05] = 0.05
    decision: Literal['reject', 'fail_to_reject', 'unavailable']
    reason: str | None


class DistributionPayload(StrictModel):
    kind: Literal['distribution'] = 'distribution'
    reason: str | None = None
    points: list[SamplePoint]
    summary: Distribution


class ComparisonDAVPayload(StrictModel):
    kind: Literal['comparison'] = 'comparison'
    reason: str | None = None
    comparison: ComparisonResult
    a: Distribution
    b: Distribution
    points: list[PairPoint]
    regression: Regression
    test: Test


class RelationshipPayload(StrictModel):
    kind: Literal['relationship'] = 'relationship'
    reason: str | None = None
    points: list[PairPoint]
    regression: Regression
    x_label: str
    y_label: str
    x_unit: str | None = None
    y_unit: str | None = None


class CountRow(StrictModel):
    hazard: Literal['floods', 'landslides']
    decade: int
    count: int | None
    reason: str | None


class CountsPayload(StrictModel):
    kind: Literal['counts'] = 'counts'
    reason: str | None = None
    rows: list[CountRow]
    excluded_undated: int


class CorrelationCell(StrictModel):
    x: str
    y: str
    n: int
    r: float | None
    reason: str | None
    points: list[PairPoint]
    regression: Regression


class CorrelationsPayload(StrictModel):
    kind: Literal['correlations'] = 'correlations'
    reason: str | None = None
    variables: tuple[Literal['rainfall'], Literal['floods'], Literal['landslides'], Literal['temperature'], Literal['drought']]
    cells: list[CorrelationCell]


class AuditColumn(StrictModel):
    name: str
    dtype: str
    missing: int


class NumericAudit(StrictModel):
    name: str
    count: int
    mean: float | None
    median: float | None
    variance: float | None
    std: float | None
    min: float | None
    max: float | None


class AuditPayload(StrictModel):
    kind: Literal['audit'] = 'audit'
    reason: str | None = None
    scope: Literal['filtered_prepared_records'] = 'filtered_prepared_records'
    rows: int
    columns: list[AuditColumn]
    duplicate_rows: int
    duplicate_identities: int
    numeric: list[NumericAudit]


DAVPayload = Annotated[
    DistributionPayload | ComparisonDAVPayload | RelationshipPayload | CountsPayload | CorrelationsPayload | AuditPayload,
    Field(discriminator='kind'),
]
