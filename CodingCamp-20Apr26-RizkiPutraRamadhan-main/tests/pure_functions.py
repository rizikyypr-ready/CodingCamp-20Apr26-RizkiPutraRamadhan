"""
Pure functions mirroring the logic in js/app.js.
These must stay in sync with the JavaScript implementations.
"""

import math
import random
import time


# ============================================================
# Theme controller (pure logic)
# ============================================================

def toggle_theme_pure(theme: str) -> str:
    """
    Return the opposite theme.
    toggle_theme_pure(toggle_theme_pure(theme)) == theme  (involution)
    """
    return "dark" if theme == "light" else "light"


# ============================================================
# Greeting widget
# ============================================================

def get_greeting_phrase(hour: int) -> str:
    """
    Map an hour (0–23) to the appropriate time-of-day greeting.

    Mapping:
      5–11  -> "Good Morning"
      12–17 -> "Good Afternoon"
      18–21 -> "Good Evening"
      0–4, 22–23 -> "Good Night"
    """
    if 5 <= hour <= 11:
        return "Good Morning"
    elif 12 <= hour <= 17:
        return "Good Afternoon"
    elif 18 <= hour <= 21:
        return "Good Evening"
    else:
        return "Good Night"


# ============================================================
# Timer widget
# ============================================================

TIMER_STATES = {"IDLE", "RUNNING", "PAUSED"}
TIMER_ACTIONS = {"start", "stop", "reset"}


def apply_timer_action(state: str, action: str) -> str:
    """
    Pure state-machine transition function.

    Transition table:
      IDLE    + start -> RUNNING
      RUNNING + stop  -> PAUSED
      RUNNING + reset -> IDLE
      PAUSED  + start -> RUNNING
      PAUSED  + reset -> IDLE
      IDLE    + stop  -> IDLE   (no-op)
      IDLE    + reset -> IDLE   (no-op)
      PAUSED  + stop  -> PAUSED (no-op)
      RUNNING + start -> RUNNING (no-op)
    """
    if action == "start":
        if state in ("IDLE", "PAUSED"):
            return "RUNNING"
        return state
    elif action == "stop":
        if state == "RUNNING":
            return "PAUSED"
        return state
    elif action == "reset":
        if state in ("RUNNING", "PAUSED"):
            return "IDLE"
        return state
    return state


def format_countdown(ms: int) -> str:
    """
    Format a millisecond duration as "MM:SS" (zero-padded).
    e.g. 1_500_000 ms -> "25:00", 65_000 ms -> "01:05"
    """
    total_seconds = math.floor(max(0, ms) / 1000)
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes:02d}:{seconds:02d}"


def is_valid_duration(n) -> bool:
    """
    Validate a proposed Pomodoro duration.
    Returns True iff n is an integer and 1 <= n <= 120.
    """
    return isinstance(n, int) and not isinstance(n, bool) and 1 <= n <= 120


def tick_ms(remaining_ms: int) -> int:
    """
    Simulate one tick: decrement by 1000 and clamp to 0.
    """
    return max(0, remaining_ms - 1000)


# ============================================================
# Todo widget
# ============================================================

def add_todo(label: str, tasks: list) -> list:
    """
    Add a new todo task to the list.
    Returns a new list with the task appended.
    """
    new_id = f"todo-{int(time.time() * 1000)}-{random.randint(0, 999999):06d}"
    return tasks + [{"id": new_id, "label": label, "completed": False}]


def toggle_todo(task_id: str, tasks: list) -> list:
    """
    Toggle the completed state of a task by id.
    Returns a new list.
    """
    return [
        {**t, "completed": not t["completed"]} if t["id"] == task_id else t
        for t in tasks
    ]


def delete_todo(task_id: str, tasks: list) -> list:
    """
    Delete a task by id.
    Returns a new list without the matching task.
    """
    return [t for t in tasks if t["id"] != task_id]
