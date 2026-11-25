from __future__ import annotations

import numpy as np


def lcs_length(a, b) -> int:
    """Length of the longest common subsequence."""
    a, b = list(a), list(b)
    if not a or not b:
        return 0
    prev = [0] * (len(b) + 1)
    for u in a:
        cur = [0] * (len(b) + 1)
        for j, v in enumerate(b, start=1):
            cur[j] = prev[j - 1] + 1 if u == v else max(prev[j], cur[j - 1])
        prev = cur
    return prev[-1]


def edit_distance(a, b) -> int:
    """Levenshtein distance."""
    a, b = list(a), list(b)
    prev = list(range(len(b) + 1))
    for i, u in enumerate(a, start=1):
        cur = [i] + [0] * len(b)
        for j, v in enumerate(b, start=1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (u != v))
        prev = cur
    return prev[-1]


def transition_scores(reference, sequence) -> dict:
    """LCS and edit distance against the reference, both normalized by the reference length."""
    g, r = list(reference), list(sequence)
    if not g:
        raise ValueError('empty reference')
    lcs, ed = lcs_length(g, r), edit_distance(g, r)
    return dict(lcs=lcs, ed=ed, reference_length=len(g), sequence_length=len(r), nlcs=lcs / len(g), ned=ed / len(g))


def stroke_mask(points, half_width: float, shape: tuple[int, int]) -> np.ndarray:
    """Pixels whose centre lies within half_width of the polyline through the (x, y) points."""
    height, width = shape
    mask = np.zeros((height, width), dtype=bool)
    P = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    if len(P) == 0:
        return mask
    segments = [(P[0], P[0])] if len(P) == 1 else list(zip(P[:-1], P[1:]))
    hw2 = half_width * half_width
    for a, b in segments:
        ax, ay, bx, by = float(a[0]), float(a[1]), float(b[0]), float(b[1])
        c0 = max(int(np.floor(min(ax, bx) - half_width - 0.5)), 0)
        c1 = min(int(np.ceil(max(ax, bx) + half_width - 0.5)), width - 1)
        r0 = max(int(np.floor(min(ay, by) - half_width - 0.5)), 0)
        r1 = min(int(np.ceil(max(ay, by) + half_width - 0.5)), height - 1)
        if c0 > c1 or r0 > r1:
            continue
        X = (np.arange(c0, c1 + 1, dtype=np.float64) + 0.5)[None, :]
        Y = (np.arange(r0, r1 + 1, dtype=np.float64) + 0.5)[:, None]
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        if L2 == 0.0:
            d2 = (X - ax) ** 2 + (Y - ay) ** 2
        else:
            s = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0.0, 1.0)
            d2 = (X - (ax + s * dx)) ** 2 + (Y - (ay + s * dy)) ** 2
        mask[r0:r1 + 1, c0:c1 + 1] |= d2 <= hw2
    return mask


def _dtw_frechet(reference, trajectory) -> tuple[float, float]:
    R = np.asarray(reference, dtype=np.float64).reshape(-1, 2)
    S = np.asarray(trajectory, dtype=np.float64).reshape(-1, 2)
    cost = np.sqrt(((R[:, None, :] - S[None, :, :]) ** 2).sum(axis=2)).tolist()
    m = len(cost[0])
    dtw_prev, fr_prev = [0.0] * m, [0.0] * m
    acc, mx = 0.0, 0.0
    for j in range(m):
        acc += cost[0][j]
        dtw_prev[j] = acc
        mx = max(mx, cost[0][j])
        fr_prev[j] = mx
    for i in range(1, len(cost)):
        row = cost[i]
        dtw_cur, fr_cur = [0.0] * m, [0.0] * m
        dtw_cur[0] = dtw_prev[0] + row[0]
        fr_cur[0] = max(row[0], fr_prev[0])
        for j in range(1, m):
            dtw_cur[j] = row[j] + min(dtw_prev[j - 1], dtw_prev[j], dtw_cur[j - 1])
            fr_cur[j] = max(row[j], min(fr_prev[j - 1], fr_prev[j], fr_cur[j - 1]))
        dtw_prev, fr_prev = dtw_cur, fr_cur
    return float(dtw_prev[-1]), float(fr_prev[-1])


def path_geometry(samples_xy, centroids_xy, map_shape: tuple[int, int], stroke_width_px: float) -> dict | None:
    """Jaccard similarity of the stroked trajectories, DTW and discrete Frechet distance (px) of the
    fixation centroids against the recorded samples. None for fewer than two centroids."""
    S = np.asarray(samples_xy, dtype=np.float64).reshape(-1, 2)
    C = np.asarray(centroids_xy, dtype=np.float64).reshape(-1, 2)
    if len(C) < 2:
        return None
    a = stroke_mask(C, stroke_width_px / 2.0, map_shape)
    b = stroke_mask(S, stroke_width_px / 2.0, map_shape)
    dtw, frechet = _dtw_frechet(S, C)
    return dict(jaccard=int(np.count_nonzero(a & b)) / int(np.count_nonzero(a | b)), dtw=dtw, frechet=frechet, vertices=len(C))
