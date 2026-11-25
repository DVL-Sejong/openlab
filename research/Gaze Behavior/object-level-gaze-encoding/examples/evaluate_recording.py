#!/usr/bin/env python3
"""Encode every observation of a recording and report the fidelity of each encoding.

    python3 examples/evaluate_recording.py free_viewing
    python3 examples/evaluate_recording.py visual_search --workers 4
    python3 examples/evaluate_recording.py free_viewing --no-path-geometry
    python3 examples/evaluate_recording.py free_viewing --csv scores.csv
"""
from __future__ import annotations
import argparse, csv, json, statistics, sys
from multiprocessing import Pool
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import olgaze as og

ENCODINGS = ('object-level', 'majority-after', 'I-VT')


def evaluate_observation(task):
    recording, row, with_geometry = task
    rec = og.RECORDINGS[recording]
    t, x, y = og.load_gaze(recording, row['observation'])
    unit_map = og.load_map(recording, row['stimulus'])
    out = []
    if len(t) == 0:
        return dict(observation=row['observation'], evaluated=False, reference=[], rows=out)
    events = {
        'object-level': og.encode_object_level(t, x, y, unit_map, rec.radius_px, rec.theta_px_per_ms),
        'majority-after': og.encode_coordinate_level(t, x, y, unit_map, rec.theta_px_per_ms, 'majority', rec.radius_px),
        'I-VT': og.encode_coordinate_level(t, x, y, unit_map, rec.theta_px_per_ms, 'centroid'),
    }
    reference = og.reference_sequence(x, y, unit_map, rec.radius_px)
    evaluated = len(set(reference)) >= 2
    for name in ENCODINGS:
        seq = og.transition_sequence(events[name])
        r = dict(observation=row['observation'], encoding=name, events=len(events[name]), sequence='-'.join(map(str, seq)),
                 scored=evaluated and len(set(seq)) >= 2, nlcs=None, ned=None, jaccard=None, dtw=None, frechet=None)
        if r['scored']:
            s = og.transition_scores(reference, seq)
            r.update(nlcs=s['nlcs'], ned=s['ned'])
        if evaluated and with_geometry:
            g = og.path_geometry(list(zip(x, y)), [(e.x, e.y) for e in events[name]], unit_map.shape, rec.px_per_deg)
            if g:
                r.update(jaccard=g['jaccard'], dtw=g['dtw'], frechet=g['frechet'])
        out.append(r)
    return dict(observation=row['observation'], evaluated=evaluated, reference=reference, rows=out)


def evaluate(recording: str, with_geometry: bool = True, workers: int = 1) -> list[dict]:
    tasks = [(recording, row, with_geometry) for row in og.observations(recording)]
    if workers > 1:
        with Pool(workers) as pool:
            return pool.map(evaluate_observation, tasks, chunksize=16)
    return [evaluate_observation(t) for t in tasks]


def summarize(results: list[dict]) -> dict:
    ev = [r for r in results if r['evaluated']]
    summary = dict(observations=len(results), evaluation_set=len(ev),
                   median_reference_length=statistics.median(len(r['reference']) for r in ev), encodings={})
    for name in ENCODINGS:
        rows = [q for r in ev for q in r['rows'] if q['encoding'] == name]
        scored = [q for q in rows if q['scored']]
        geo = [q for q in rows if q['jaccard'] is not None]
        med = lambda key, src: statistics.median(q[key] for q in src) if src else None
        summary['encodings'][name] = dict(scored=len(scored), excluded=len(rows) - len(scored), nlcs=med('nlcs', scored), ned=med('ned', scored),
                                          jaccard=med('jaccard', geo), dtw=med('dtw', geo), frechet=med('frechet', geo))
    return summary


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('recording', choices=sorted(og.RECORDINGS))
    ap.add_argument('--workers', type=int, default=1)
    ap.add_argument('--no-path-geometry', action='store_true')
    ap.add_argument('--csv', help='write one row per observation and encoding to this file')
    a = ap.parse_args()
    results = evaluate(a.recording, not a.no_path_geometry, a.workers)
    s = summarize(results)
    rec = og.RECORDINGS[a.recording]
    print(f"{a.recording}: {s['observations']} observations, {s['evaluation_set']} in the evaluation set, "
          f"median reference length {s['median_reference_length']:g}")
    print(f"threshold {rec.theta_deg_per_s:.3f} deg/s, stabilization radius {rec.radius_deg} deg ({rec.radius_px:.2f} px)")
    print(f"{'encoding':16s} {'scored':>7s} {'excl.':>6s} {'LCS':>7s} {'ED':>7s} {'Jaccard':>8s} {'DTW':>9s} {'Frechet':>8s}")
    f = lambda v, fmt: '-' if v is None else format(v, fmt)
    for name, e in s['encodings'].items():
        print(f"{name:16s} {e['scored']:7d} {e['excluded']:6d} {f(e['nlcs'], '.3f'):>7s} {f(e['ned'], '.3f'):>7s} "
              f"{f(e['jaccard'], '.3f'):>8s} {f(e['dtw'], ',.0f'):>9s} {f(e['frechet'], '.1f'):>8s}")
    if a.csv:
        rows = [q for r in results for q in r['rows']]
        with open(a.csv, 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
        print('written', a.csv)
    exp = Path(__file__).resolve().parent.parent / 'expected' / 'summary.json'
    if exp.exists():
        want = json.loads(exp.read_text())[a.recording]
        ok = want['evaluation_set'] == s['evaluation_set']
        for name, e in s['encodings'].items():
            for k, v in want['encodings'][name].items():
                if e[k] is None and a.no_path_geometry and k in ('jaccard', 'dtw', 'frechet'):
                    continue
                ok &= (e[k] == v) if isinstance(v, int) else (v is None and e[k] is None) or (e[k] is not None and abs(e[k] - v) <= 1e-9 * max(1.0, abs(v)))
        print('expected/summary.json:', 'reproduced' if ok else 'DIFFERENT')


if __name__ == '__main__':
    main()
