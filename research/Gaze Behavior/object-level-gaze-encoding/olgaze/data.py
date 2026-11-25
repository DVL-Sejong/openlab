from __future__ import annotations
import csv, json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

DATA = Path(__file__).resolve().parent.parent / 'data'


@dataclass(frozen=True)
class Recording:
    name: str
    sampling_rate_hz: float
    px_per_deg: float
    theta_px_per_ms: float
    radius_deg: float

    @property
    def theta_deg_per_s(self) -> float:
        return self.theta_px_per_ms * 1000.0 / self.px_per_deg

    @property
    def radius_px(self) -> float:
        return self.radius_deg * self.px_per_deg

    @property
    def folder(self) -> Path:
        return DATA / self.name


RECORDINGS = {
    'free_viewing': Recording('free_viewing', 30.0, 61.5, 1.845, 0.32),
    'visual_search': Recording('visual_search', 240.0, 800.0 / 23.5, 1.480647, 0.13),
}


def observations(recording: str) -> list[dict]:
    folder = RECORDINGS[recording].folder
    if not (folder / 'observations.csv').is_file():
        if recording != 'visual_search':
            raise FileNotFoundError(f'{folder} holds no gaze data')
        from .ehinger import prepare
        print(f'converting the eye data in {folder} ...', flush=True)
        prepare(folder, folder / 'maps')
    with open(folder / 'observations.csv', newline='') as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r['samples'] = int(r['samples'])
    return rows


def load_gaze(recording: str, observation: str):
    """Timestamps (microseconds) and gaze coordinates (stimulus pixels)."""
    t, x, y = [], [], []
    with open(RECORDINGS[recording].folder / 'gaze' / f'{observation}.csv', newline='') as f:
        r = csv.reader(f)
        next(r)
        for a, b, c in r:
            t.append(int(a)); x.append(float(b)); y.append(float(c))
    return np.array(t, dtype=np.int64), np.array(x, dtype=np.float64), np.array(y, dtype=np.float64)


def load_map(recording: str, stimulus: str) -> np.ndarray:
    """Object label map, indexed [row, column]."""
    with np.load(RECORDINGS[recording].folder / 'maps' / f'{stimulus}.npz') as z:
        return z['units'].astype(np.int64)


def load_units(recording: str, stimulus: str) -> dict[int, dict]:
    """Label, score and area of each unit of a map."""
    meta = json.loads((RECORDINGS[recording].folder / 'maps' / f'{stimulus}.json').read_text())
    return {int(u['id']): u for u in meta['units']}
