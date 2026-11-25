from __future__ import annotations
import csv, io, zipfile
from pathlib import Path

import numpy as np

SAMPLE_INTERVAL_US = 1_000_000.0 / 240.0


def _sources(folder: Path):
    archive = folder / 'Dataset_EyeData.zip'
    for sub in ('Dataset_EyeData/eyeData', 'eyeData', 'Dataset_EyeData'):
        mats = sorted((folder / sub).glob('*.mat'))
        if mats:
            return [(p.stem, p) for p in mats]
    if archive.is_file():
        z = zipfile.ZipFile(archive)
        names = sorted(n for n in z.namelist() if n.endswith('.mat'))
        return [(Path(n).stem, io.BytesIO(z.read(n))) for n in names]
    return []


def prepare(folder: Path, map_folder: Path) -> int:
    """Convert the eye data of Ehinger et al. (2009) found in folder into gaze/<observation>.csv
    and observations.csv. Coordinates are kept to 16 significant digits. Returns the number of
    observations written."""
    from scipy.io import loadmat
    sources = _sources(folder)
    if not sources:
        raise FileNotFoundError(
            f'No eye data found. Download "Dataset: EyeData" from http://cvcl.mit.edu/SearchModels '
            f'and place Dataset_EyeData.zip (or the unzipped Dataset_EyeData folder) in {folder}')
    (folder / 'gaze').mkdir(parents=True, exist_ok=True)
    rows = []
    for stimulus, src in sources:
        with np.load(map_folder / f'{stimulus}.npz') as z:
            height, width = z['units'].shape
        m = loadmat(src)
        record = m[next(k for k in m if not k.startswith('__'))][0, 0]
        subjects = record['subdata']
        for k in range(subjects.shape[1]):
            eye = np.asarray(subjects[0, k]['eyedata'], dtype=np.float64)
            observation = f'{stimulus}_{k}'
            n = 0
            with open(folder / 'gaze' / f'{observation}.csv', 'w', newline='') as f:
                w = csv.writer(f, lineterminator='\n')
                w.writerow(['t_us', 'x', 'y'])
                for i, row in enumerate(eye):
                    if np.isnan(row).any():
                        continue
                    x, y = float(row[0]), float(row[1])
                    if x < 0 or y < 0 or int(x) >= width or int(y) >= height:
                        continue
                    w.writerow([int(round(1_000_000 + (i + 1) * SAMPLE_INTERVAL_US)), repr(x), repr(y)])
                    n += 1
            rows.append(dict(observation=observation, stimulus=stimulus, observer=k, samples=n))
    rows.sort(key=lambda r: r['observation'])
    with open(folder / 'observations.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n')
        w.writeheader()
        w.writerows(rows)
    return len(rows)
