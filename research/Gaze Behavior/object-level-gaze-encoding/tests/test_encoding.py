import unittest

import numpy as np

import olgaze as og


def two_unit_map():
    m = np.zeros((10, 20), dtype=np.int64)
    m[:, 10:] = 1
    return m


class Encoding(unittest.TestCase):
    def test_assign_units(self):
        self.assertEqual(list(og.assign_units([0.2, 9.9, 10.0, 19.9], [0.0, 5.5, 5.5, 9.9], two_unit_map())), [0, 0, 1, 1])
        with self.assertRaises(ValueError):
            og.assign_units([20.0], [1.0], two_unit_map())

    def test_stabilization_removes_boundary_flicker(self):
        x = [9.6, 10.1, 9.7, 9.8, 10.2, 9.9]
        y = [5.0] * 6
        labels = og.assign_units(x, y, two_unit_map())
        self.assertEqual(list(labels), [0, 1, 0, 0, 1, 0])
        self.assertEqual(list(og.stabilize_labels(x, y, labels, 1.0)), [0] * 6)

    def test_stabilization_tie_goes_to_the_earliest_label(self):
        self.assertEqual(list(og.stabilize_labels([0, 0, 0, 0], [0, 0, 0, 0], [3, 7, 7, 3], 1.0)), [3, 3, 3, 3])

    def test_event_never_spans_two_units(self):
        t = np.arange(8) * 10_000
        x = [8.0, 8.2, 8.4, 9.0, 11.0, 11.2, 11.4, 11.6]
        y = [5.0] * 8
        obj = og.encode_object_level(t, x, y, two_unit_map(), radius_px=0.1, theta=1.0)
        self.assertEqual([e.unit for e in obj], [0, 1])
        self.assertEqual([e.n_samples for e in obj], [4, 4])
        ivt = og.encode_coordinate_level(t, x, y, two_unit_map(), theta=1.0)
        self.assertEqual(len(ivt), 1)
        self.assertEqual(ivt[0].n_samples, 8)

    def test_fast_sample_ends_an_event(self):
        t = np.arange(6) * 10_000
        x = [1.0, 1.1, 1.2, 15.0, 15.1, 15.2]
        y = [5.0] * 6
        ev = og.encode_coordinate_level(t, x, y, two_unit_map(), theta=0.5)
        self.assertEqual([(e.unit, e.n_samples) for e in ev], [(0, 3), (1, 3)])

    def test_timestamps_must_increase(self):
        with self.assertRaises(ValueError):
            og.encode_object_level([0, 10, 10], [1, 1, 1], [1, 1, 1], two_unit_map(), 1.0, 1.0)


class Measures(unittest.TestCase):
    def test_sequences(self):
        self.assertEqual(og.collapse([1, 1, 2, 2, 1, 3, 3]), [1, 2, 1, 3])
        s = og.transition_scores([1, 2, 1, 3], [1, 3])
        self.assertEqual((s['lcs'], s['ed'], s['nlcs'], s['ned']), (2, 2, 0.5, 0.5))

    def test_identical_paths(self):
        pts = [(2.0, 2.0), (10.0, 2.0), (10.0, 8.0)]
        g = og.path_geometry(pts, pts, (10, 20), 2.0)
        self.assertEqual((g['jaccard'], g['dtw'], g['frechet']), (1.0, 0.0, 0.0))

    def test_frechet_and_dtw(self):
        g = og.path_geometry([(0.0, 0.0), (4.0, 0.0)], [(0.0, 3.0), (4.0, 3.0)], (10, 20), 2.0)
        self.assertEqual((g['dtw'], g['frechet']), (6.0, 3.0))


if __name__ == '__main__':
    unittest.main()
