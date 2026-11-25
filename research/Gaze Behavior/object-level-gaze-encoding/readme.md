# Object-level gaze encoding

Code and data for the paper

> **Object-Level Representations of Gaze Behavior from Eye-Tracking Observations in Visual Media Stimuli**<br>
> Sangbong Yoo<sup>1</sup> and Yun Jang<sup>2</sup> (corresponding author)<br>
> <sup>1</sup> Korea Institute of Science and Technology (KIST), Seoul, South Korea<br>
> <sup>2</sup> Sejong University, Seoul, South Korea

**Status:** the manuscript is under review.

The object-level encoder assigns every gaze sample to an object of the stimulus before fixation events are identified, so that a fixation event never spans two objects. This repository contains the encoder, the coordinate-level encoding with the same velocity rule, the measures of transition-structure and path-geometry preservation, and the gaze samples and object label maps of the two recordings used in the paper.

## Requirements

Python 3.9 or later with NumPy and SciPy. Matplotlib is needed only for `--plot`.

```
pip install -r requirements.txt
```

## Data

The gaze data are not distributed with this repository.

**Visual search.** The recording is the eye data of Ehinger et al. (2009). Download "Dataset: EyeData" from <http://cvcl.mit.edu/SearchModels> and place `Dataset_EyeData.zip`, or the unzipped `Dataset_EyeData` folder, in `data/visual_search/`:

```
data/visual_search/Dataset_EyeData.zip
data/visual_search/maps/<stimulus>.npz
data/visual_search/maps/<stimulus>.json
```

The first command that reads the recording converts the eye data into `data/visual_search/gaze/` and writes `data/visual_search/observations.csv`. Nothing else has to be prepared. For the stimuli, the observers, the apparatus and the procedure, please refer to the original paper:

> K. A. Ehinger, B. Hidalgo-Sotelo, A. Torralba, and A. Oliva. Modelling search for people in 900 scenes: A combined source model of eye guidance. *Visual Cognition*, 17(6-7):945–978, 2009.

The object label maps of the 912 stimuli are included in `data/visual_search/maps/`. They were produced with the panoptic segmentation model EoMT. Each `.npz` file holds the unit of every pixel, and the `.json` file gives the label, score and area of each unit. Unit 0 holds the pixels that received no segment. The stimulus images are not needed to run the code.

**Free viewing.** The free-viewing gaze data collected for this work are available from the corresponding author on reasonable request.

| | Free viewing | Visual search |
|---|---|---|
| Stimuli | 60 | 912 |
| Observers | 9 | 14 |
| Observations | 540 | 12,768 |
| Sampling rate | 30 Hz | 240 Hz |
| Pixels per degree | 61.5 | 34.0 |
| Velocity threshold | 30°/s | 43.5°/s |
| Stabilization radius | 0.32° | 0.13° |

## Usage

```python
import olgaze as og

rec = og.RECORDINGS['visual_search']
t, x, y = og.load_gaze('visual_search', 'U0146_1LBE_13')
unit_map = og.load_map('visual_search', 'U0146_1LBE')

events = og.encode_object_level(t, x, y, unit_map, rec.radius_px, rec.theta_px_per_ms)
ivt = og.encode_coordinate_level(t, x, y, unit_map, rec.theta_px_per_ms)

reference = og.reference_sequence(x, y, unit_map, rec.radius_px)
print(og.transition_scores(reference, og.transition_sequence(events)))
print(og.transition_scores(reference, og.transition_sequence(ivt)))
```

Inputs are timestamps in microseconds, gaze coordinates in stimulus pixels, and an integer array that gives the unit of every pixel, indexed `[row, column]`. The velocity threshold is in pixels per millisecond and the stabilization radius in pixels.

| Function | Result |
|---|---|
| `encode_object_level` | fixation events of the object-level encoder |
| `encode_coordinate_level(..., assignment='centroid')` | I-VT events with the unit under each centroid |
| `encode_coordinate_level(..., assignment='majority', radius_px=...)` | the same events with the most frequent unit of each event |
| `reference_sequence` | reference transition sequence built from the samples |
| `transition_scores` | LCS and edit distance, normalized by the reference length |
| `path_geometry` | Jaccard similarity, DTW and discrete Fréchet distance against the recorded samples |

## Examples

One observation, with its fixation events, sequences and scores:

```
python3 examples/encode_observation.py visual_search U0146_1LBE_13
python3 examples/encode_observation.py visual_search U0146_1LBE_13 --plot observation.png
```

All observations of the recording:

```
python3 examples/evaluate_recording.py visual_search --workers 4
```

The command prints the medians below and compares them with `expected/summary.json`.

| Encoding | Scored | LCS | Jaccard | DTW | Fréchet |
|---|---:|---:|---:|---:|---:|
| object-level | 12,392 | 0.615 | 0.748 | 2,608 | 157.7 |
| I-VT | 11,987 | 0.273 | 0.716 | 2,961 | 157.9 |

Tests, which need no data:

```
python3 -m unittest tests.test_encoding
```

## Citation

The manuscript is under review and cannot be cited yet. The reference will be added here once the paper is published. Until then, please link to this repository when you use the code or the data.

If you use the visual-search data, please also cite Ehinger et al. (2009).

## License

Copyright © 2026 Sangbong Yoo and Yun Jang.

The code and the object label maps are released under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/) (CC BY-NC 4.0); see `LICENSE`. They may be used, shared and adapted for research and other non-commercial purposes, provided that appropriate credit is given. Commercial use is not permitted.

The eye data of Ehinger et al. (2009) are not part of this repository and remain subject to the terms of the original dataset.
