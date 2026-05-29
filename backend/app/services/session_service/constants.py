"""Session-layer constants.

``SNAPSHOT_INTERVAL``
    How often (in events) we persist a full ``CircuitState`` snapshot. The
    snapshot trigger itself lives in ``CircuitService._maybe_create_snapshot``,
    but the *policy number* lives here because snapshot storage is owned by
    the session/snapshot layer. With an interval of 50, rebuilding any state
    replays at most 49 events on top of a snapshot — see ``docs/replay.md``.

``CURSOR_COLORS``
    Eight visually distinct colors handed out to participants so each
    person's cursor and selection are easy to tell apart on a shared canvas.
    When more than eight people join, colors are reused by cycling through
    the list (see ``ParticipantsMixin._assign_color``).
"""

# Snapshot policy: a snapshot is taken every SNAPSHOT_INTERVAL events. The
# trigger lives in CircuitService._maybe_create_snapshot; this constant lives
# here so that snapshot policy is owned by the session/snapshot layer.
SNAPSHOT_INTERVAL = 50

# Cursor colors for participants (8 distinct colors)
CURSOR_COLORS = [
    "#FF5733",  # Red-Orange
    "#33A1FF",  # Blue
    "#33FF57",  # Green
    "#FF33F5",  # Pink
    "#FFD433",  # Yellow
    "#9B33FF",  # Purple
    "#33FFF5",  # Cyan
    "#FF8C33",  # Orange
]
