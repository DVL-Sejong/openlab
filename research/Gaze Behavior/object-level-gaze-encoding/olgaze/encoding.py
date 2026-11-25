from __future__ import annotations
from dataclasses import dataclass, asdict

import numpy as np


@dataclass(frozen=True)
class Fixation:
    t_start: int
    t_end: int
    x: float
    y: float
    unit: int
    n_samples: int

    def as_dict(self) -> dict:
        return asdict(self)


def _as_arrays(t_us, x, y):
    t = np.asarray(t_us)
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    if not (len(t) == len(x) == len(y)):
        raise ValueError('t_us, x and y differ in length')
    if len(t) >= 2 and (np.diff(t) <= 0).any():
        raise ValueError('t_us must be strictly increasing')
    return t, x, y


def assign_units(x, y, unit_map) -> np.ndarray:
    """Unit under each sample: unit_map[floor(y), floor(x)]."""
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    unit_map = np.asarray(unit_map)
    col = np.floor(x).astype(np.int64)
    row = np.floor(y).astype(np.int64)
    height, width = unit_map.shape
    if len(x) and (col.min() < 0 or row.min() < 0 or col.max() >= width or row.max() >= height):
        raise ValueError('a sample lies outside the stimulus')
    return unit_map[row, col].astype(np.int64)


def _mode_earliest(labels) -> int:
    counts: dict[int, int] = {}
    for v in labels:
        k = int(v)
        counts[k] = counts.get(k, 0) + 1
    return max(counts, key=counts.get)


def dwell_starts(x, y, radius_px: float) -> list[int]:
    """Index of the first sample of each dwell."""
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    if not radius_px > 0:
        raise ValueError('radius_px must be positive')
    if len(x) == 0:
        return []
    starts, a = [0], 0
    for i in range(1, len(x)):
        if np.hypot(x[i] - x[a], y[i] - y[a]) > radius_px:
            starts.append(i)
            a = i
    return starts


def stabilize_labels(x, y, labels, radius_px: float) -> np.ndarray:
    """Give every sample of a dwell the most frequent label of the dwell (ties to the earliest)."""
    labels = np.asarray(labels)
    out = labels.astype(np.int64, copy=True)
    starts = dwell_starts(x, y, radius_px)
    for a, b in zip(starts, starts[1:] + [len(out)]):
        out[a:b] = _mode_earliest(labels[a:b])
    return out


def sample_velocity(t_us, x, y) -> np.ndarray:
    """Velocity of the edge leaving each sample, in px/ms (length n - 1)."""
    t, x, y = _as_arrays(t_us, x, y)
    if len(t) < 2:
        return np.empty(0, dtype=np.float64)
    dt_ms = np.diff(t).astype(np.float64) / 1000.0
    return np.hypot(np.diff(x), np.diff(y)) / dt_ms


def fixational_samples(t_us, x, y, theta: float) -> np.ndarray:
    """True where the outgoing edge of a sample is slower than theta; the last sample is False."""
    n = len(np.asarray(t_us))
    mask = np.zeros(n, dtype=bool)
    if n >= 2:
        mask[:n - 1] = sample_velocity(t_us, x, y) < theta
    return mask


def _layers(labels) -> list[tuple[int, int, int]]:
    labels = np.asarray(labels)
    out, start = [], 0
    for i in range(1, len(labels)):
        if labels[i] != labels[i - 1]:
            out.append((start, i - 1, int(labels[start])))
            start = i
    if len(labels):
        out.append((start, len(labels) - 1, int(labels[start])))
    return out


def _events(spans, fixational) -> list[tuple[int, int, int]]:
    out = []
    for a, b, unit in spans:
        i = a
        while i <= b:
            if not fixational[i]:
                i += 1
                continue
            first = i
            while i + 1 <= b and fixational[i + 1]:
                i += 1
            out.append((first, min(i + 1, b), unit))
            i += 1
    return out


def encode_object_level(t_us, x, y, unit_map, radius_px: float, theta: float, min_samples: int = 1,
                        return_labels: bool = False):
    """Object-level encoding: units are assigned and stabilized first, and fixation events are
    identified within runs of samples that share a unit."""
    t, x, y = _as_arrays(t_us, x, y)
    labels = stabilize_labels(x, y, assign_units(x, y, unit_map), radius_px)
    events: list[Fixation] = []
    if len(t) >= 2:
        fix = fixational_samples(t, x, y, theta)
        for first, last, unit in _events(_layers(labels), fix):
            if last - first + 1 < min_samples:
                continue
            events.append(Fixation(int(t[first]), int(t[last]), float(x[first:last + 1].mean()),
                                   float(y[first:last + 1].mean()), int(unit), last - first + 1))
    return (events, labels) if return_labels else events


def encode_coordinate_level(t_us, x, y, unit_map, theta: float, assignment: str = 'centroid',
                            radius_px: float | None = None, min_samples: int = 1) -> list[Fixation]:
    """Coordinate-level encoding: fixation events are identified on all samples, and a unit is
    attached afterwards, either the unit under the centroid ('centroid', I-VT) or the most frequent
    stabilized label of the event ('majority')."""
    if assignment not in ('centroid', 'majority'):
        raise ValueError("assignment must be 'centroid' or 'majority'")
    t, x, y = _as_arrays(t_us, x, y)
    unit_map = np.asarray(unit_map)
    labels = None
    if assignment == 'majority':
        if radius_px is None:
            raise ValueError("assignment='majority' needs radius_px")
        labels = stabilize_labels(x, y, assign_units(x, y, unit_map), radius_px)
    events: list[Fixation] = []
    if len(t) < 2:
        return events
    fix = fixational_samples(t, x, y, theta)
    for first, last, _ in _events([(0, len(t) - 1, 0)], fix):
        if last - first + 1 < min_samples:
            continue
        cx, cy = float(x[first:last + 1].mean()), float(y[first:last + 1].mean())
        unit = int(unit_map[int(cy), int(cx)]) if assignment == 'centroid' else _mode_earliest(labels[first:last + 1])
        events.append(Fixation(int(t[first]), int(t[last]), cx, cy, unit, last - first + 1))
    return events
