#!/usr/bin/env python3
"""Encode one observation and compare the encodings with its reference transition sequence.

    python3 examples/encode_observation.py free_viewing c0+sun_bdjyjupowtqakfmu__user03
    python3 examples/encode_observation.py visual_search U0146_1LBE_13 --plot U0146_1LBE_13.png
"""
from __future__ import annotations
import argparse, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import olgaze as og


def plot(path, unit_map, x, y, encodings):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    pad = 0.08 * max(x.max() - x.min(), y.max() - y.min(), 1.0)
    aspect = (y.max() - y.min() + 2 * pad) / (x.max() - x.min() + 2 * pad)
    fig, axes = plt.subplots(1, len(encodings) + 1, figsize=(4.2 * (len(encodings) + 1), 4.2 * aspect + 0.5), constrained_layout=True)
    for ax in axes:
        ax.imshow(unit_map, cmap='tab20', interpolation='nearest', alpha=0.55)
        ax.set_xlim(x.min() - pad, x.max() + pad)
        ax.set_ylim(y.max() + pad, y.min() - pad)
        ax.set_xticks([]); ax.set_yticks([])
    axes[0].scatter(x, y, s=5, color='black')
    axes[0].set_title(f'recorded samples (n = {len(x)})')
    for ax, (name, events) in zip(axes[1:], encodings.items()):
        ax.plot([e.x for e in events], [e.y for e in events], color='0.25', lw=0.8)
        ax.scatter([e.x for e in events], [e.y for e in events], s=28, c=[e.unit for e in events], cmap='tab20',
                   vmin=unit_map.min(), vmax=unit_map.max(), edgecolors='black', linewidths=0.6, zorder=3)
        ax.set_title(f'{name} ({len(events)} events)')
    fig.savefig(path, dpi=200)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('recording', choices=sorted(og.RECORDINGS))
    ap.add_argument('observation')
    ap.add_argument('--plot', help='write a figure to this file (needs matplotlib)')
    a = ap.parse_args()
    rec = og.RECORDINGS[a.recording]
    row = next((r for r in og.observations(a.recording) if r['observation'] == a.observation), None)
    if row is None:
        sys.exit(f'{a.observation} is not listed in data/{a.recording}/observations.csv')
    t, x, y = og.load_gaze(a.recording, a.observation)
    unit_map = og.load_map(a.recording, row['stimulus'])
    units = og.load_units(a.recording, row['stimulus'])
    label = lambda u: f"{u}:{units[u]['label']}" if u in units else str(u)

    encodings = {
        'object-level': og.encode_object_level(t, x, y, unit_map, rec.radius_px, rec.theta_px_per_ms),
        'majority-after': og.encode_coordinate_level(t, x, y, unit_map, rec.theta_px_per_ms, 'majority', rec.radius_px),
        'I-VT': og.encode_coordinate_level(t, x, y, unit_map, rec.theta_px_per_ms, 'centroid'),
    }
    reference = og.reference_sequence(x, y, unit_map, rec.radius_px)

    print(f"{a.observation}: {len(t)} samples, {(t[-1] - t[0]) / 1e6:.2f} s, stimulus {row['stimulus']}")
    print(f"threshold {rec.theta_deg_per_s:.3f} deg/s, stabilization radius {rec.radius_deg} deg ({rec.radius_px:.2f} px)\n")
    print('object-level fixation events')
    print(f"{'start ms':>9s} {'end ms':>9s} {'x':>8s} {'y':>8s} {'n':>4s}  unit")
    for e in encodings['object-level']:
        print(f"{(e.t_start - t[0]) / 1000:9.1f} {(e.t_end - t[0]) / 1000:9.1f} {e.x:8.1f} {e.y:8.1f} {e.n_samples:4d}  {label(e.unit)}")
    print(f"\nreference ({len(reference)} visits): {' > '.join(label(u) for u in reference)}\n")
    print(f"{'encoding':16s} {'events':>6s} {'units':>6s} {'LCS':>9s} {'nLCS':>6s} {'nED':>6s} {'Jaccard':>8s} {'DTW':>9s} {'Frechet':>8s}")
    for name, events in encodings.items():
        seq = og.transition_sequence(events)
        s = og.transition_scores(reference, seq)
        g = og.path_geometry(list(zip(x, y)), [(e.x, e.y) for e in events], unit_map.shape, rec.px_per_deg)
        geo = f"{g['jaccard']:8.3f} {g['dtw']:9,.0f} {g['frechet']:8.1f}" if g else f"{'-':>8s} {'-':>9s} {'-':>8s}"
        print(f"{name:16s} {len(events):6d} {len(seq):6d} {s['lcs']:>4d}/{s['reference_length']:<4d} {s['nlcs']:6.3f} {s['ned']:6.3f} {geo}")
    if a.plot:
        plot(a.plot, unit_map, x, y, encodings)
        print('\nwritten', a.plot)


if __name__ == '__main__':
    main()
