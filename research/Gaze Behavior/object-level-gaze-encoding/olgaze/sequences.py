from __future__ import annotations

from .encoding import Fixation, assign_units, stabilize_labels


def collapse(units) -> list[int]:
    """Merge consecutive repetitions of a unit."""
    out: list[int] = []
    for u in units:
        u = int(u)
        if not out or out[-1] != u:
            out.append(u)
    return out


def transition_sequence(events: list[Fixation]) -> list[int]:
    """Units of the fixation events in temporal order, collapsed."""
    return collapse(e.unit for e in events)


def reference_sequence(x, y, unit_map, radius_px: float) -> list[int]:
    """Stabilized unit of every sample in temporal order, collapsed."""
    return collapse(stabilize_labels(x, y, assign_units(x, y, unit_map), radius_px))
