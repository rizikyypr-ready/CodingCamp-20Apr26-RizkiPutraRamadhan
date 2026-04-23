"""
Integration smoke tests for the Personal Dashboard.

Task 10.2 — Integration smoke tests
Validates: Requirements 2.4, 4.4, 5.10, 6.6, 7.4

These tests verify the pure-function layer behaves correctly when
simulating the init() sequence: loading defaults and restoring persisted state.

Since the app runs in a browser (no Node.js available), these tests exercise
the pure-function equivalents of the init logic directly in Python.

Run with: python -m pytest tests/test_integration.py -v
      or: python tests/test_integration.py
"""

import sys
import os
import json
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from pure_functions import (
    toggle_theme_pure,
    get_greeting_phrase,
    format_countdown,
    is_valid_duration,
    add_todo,
    delete_todo,
    toggle_todo,
)


# ============================================================
# Simulated storage (mirrors localStorage behaviour)
# ============================================================

class MockStorage:
    """In-memory localStorage equivalent."""

    def __init__(self):
        self._store = {}

    def get_item(self, key):
        return self._store.get(key, None)

    def set_item(self, key, value):
        self._store[key] = json.dumps(value)

    def remove_item(self, key):
        self._store.pop(key, None)

    def clear(self):
        self._store.clear()

    def storage_get(self, key, default=None):
        """Mirrors storageGet(key, defaultValue) from app.js."""
        raw = self.get_item(key)
        if raw is None:
            return default
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            return default


# ============================================================
# Simulated init() logic (mirrors the JS init sequence)
# ============================================================

def simulate_init(storage: MockStorage, os_prefers_dark: bool = False):
    """
    Simulate the init() bootstrap sequence from app.js.
    Returns a dict representing the resolved application state.
    """
    # --- initTheme() ---
    saved_theme = storage.storage_get("pd_theme", None)
    if saved_theme is not None:
        theme = saved_theme
    else:
        theme = "dark" if os_prefers_dark else "light"

    # --- initGreeting() ---
    user_name = storage.storage_get("pd_name", "")

    # --- initTimer() ---
    pomodoro_mins = storage.storage_get("pd_pomodoro_mins", 25)
    # Validate: if stored value is invalid, fall back to 25
    if not is_valid_duration(pomodoro_mins):
        pomodoro_mins = 25
    remaining_ms = pomodoro_mins * 60 * 1000
    timer_display = format_countdown(remaining_ms)

    # --- initTodos() ---
    todos = storage.storage_get("pd_todos", [])
    if not isinstance(todos, list):
        todos = []

    # --- initLinks() ---
    links = storage.storage_get("pd_links", [])
    if not isinstance(links, list):
        links = []

    return {
        "theme": theme,
        "user_name": user_name,
        "pomodoro_mins": pomodoro_mins,
        "remaining_ms": remaining_ms,
        "timer_display": timer_display,
        "todos": todos,
        "links": links,
    }


# ============================================================
# Tests
# ============================================================

class TestInitWithEmptyStorage(unittest.TestCase):
    """init() with empty localStorage — all defaults applied"""

    def setUp(self):
        self.storage = MockStorage()

    def test_init_does_not_raise_with_empty_storage(self):
        """init() runs without throwing when localStorage is empty"""
        try:
            state = simulate_init(self.storage)
        except Exception as e:
            self.fail(f"simulate_init() raised an exception: {e}")

    def test_default_theme_is_light_when_no_os_preference(self):
        """Applies default theme 'light' when no theme saved and OS prefers light"""
        state = simulate_init(self.storage, os_prefers_dark=False)
        self.assertEqual(state["theme"], "light",
            f"Expected default theme 'light', got '{state['theme']}'")

    def test_default_theme_is_dark_when_os_prefers_dark(self):
        """Applies 'dark' theme when no theme saved but OS prefers dark (Req 7.5)"""
        state = simulate_init(self.storage, os_prefers_dark=True)
        self.assertEqual(state["theme"], "dark",
            f"Expected OS-preference theme 'dark', got '{state['theme']}'")

    def test_default_timer_display_is_25_00(self):
        """Timer display shows default 25:00 when no duration is saved (Req 4.4)"""
        state = simulate_init(self.storage)
        self.assertEqual(state["timer_display"], "25:00",
            f"Expected timer display '25:00', got '{state['timer_display']}'")

    def test_default_pomodoro_mins_is_25(self):
        """Pomodoro duration defaults to 25 minutes (Req 4.4)"""
        state = simulate_init(self.storage)
        self.assertEqual(state["pomodoro_mins"], 25,
            f"Expected default 25 minutes, got {state['pomodoro_mins']}")

    def test_default_todos_is_empty_list(self):
        """Todo list defaults to empty list (Req 5.10)"""
        state = simulate_init(self.storage)
        self.assertEqual(state["todos"], [],
            f"Expected empty todos, got {state['todos']}")

    def test_default_links_is_empty_list(self):
        """Links list defaults to empty list (Req 6.6)"""
        state = simulate_init(self.storage)
        self.assertEqual(state["links"], [],
            f"Expected empty links, got {state['links']}")

    def test_default_user_name_is_empty(self):
        """User name defaults to empty string (Req 2.4)"""
        state = simulate_init(self.storage)
        self.assertEqual(state["user_name"], "",
            f"Expected empty user name, got '{state['user_name']}'")


class TestInitRestoresPersistedState(unittest.TestCase):
    """init() correctly restores persisted state for each widget"""

    def setUp(self):
        self.storage = MockStorage()

    def test_restores_dark_theme(self):
        """Restores saved dark theme from storage (Req 7.4)"""
        self.storage.set_item("pd_theme", "dark")
        state = simulate_init(self.storage)
        self.assertEqual(state["theme"], "dark",
            f"Expected restored theme 'dark', got '{state['theme']}'")

    def test_restores_light_theme(self):
        """Restores saved light theme from storage (Req 7.4)"""
        self.storage.set_item("pd_theme", "light")
        state = simulate_init(self.storage, os_prefers_dark=True)
        # Saved value overrides OS preference
        self.assertEqual(state["theme"], "light",
            f"Expected restored theme 'light', got '{state['theme']}'")

    def test_restores_custom_pomodoro_duration(self):
        """Restores saved Pomodoro duration from storage (Req 4.4)"""
        self.storage.set_item("pd_pomodoro_mins", 45)
        state = simulate_init(self.storage)
        self.assertEqual(state["pomodoro_mins"], 45,
            f"Expected restored 45 minutes, got {state['pomodoro_mins']}")
        self.assertEqual(state["timer_display"], "45:00",
            f"Expected timer display '45:00', got '{state['timer_display']}'")

    def test_restores_user_name(self):
        """Restores saved user name from storage (Req 2.4)"""
        self.storage.set_item("pd_name", "Alice")
        state = simulate_init(self.storage)
        self.assertEqual(state["user_name"], "Alice",
            f"Expected restored name 'Alice', got '{state['user_name']}'")

    def test_restores_todos(self):
        """Restores saved todos from storage (Req 5.10)"""
        todos = [
            {"id": "1", "label": "Buy groceries", "completed": False},
            {"id": "2", "label": "Write tests", "completed": True},
        ]
        self.storage.set_item("pd_todos", todos)
        state = simulate_init(self.storage)
        self.assertEqual(len(state["todos"]), 2,
            f"Expected 2 todos, got {len(state['todos'])}")
        self.assertEqual(state["todos"][0]["label"], "Buy groceries")
        self.assertEqual(state["todos"][1]["completed"], True)

    def test_restores_links(self):
        """Restores saved links from storage (Req 6.6)"""
        links = [
            {"id": "1", "label": "GitHub", "url": "https://github.com"},
            {"id": "2", "label": "Google", "url": "https://google.com"},
        ]
        self.storage.set_item("pd_links", links)
        state = simulate_init(self.storage)
        self.assertEqual(len(state["links"]), 2,
            f"Expected 2 links, got {len(state['links'])}")
        self.assertEqual(state["links"][0]["label"], "GitHub")

    def test_invalid_pomodoro_duration_falls_back_to_default(self):
        """Invalid stored duration falls back to 25 minutes (Req 4.4)"""
        self.storage.set_item("pd_pomodoro_mins", 999)  # out of range
        state = simulate_init(self.storage)
        self.assertEqual(state["pomodoro_mins"], 25,
            f"Expected fallback to 25 minutes for invalid duration, got {state['pomodoro_mins']}")

    def test_corrupt_todos_falls_back_to_empty(self):
        """Corrupt todos JSON falls back to empty list (Req 5.10)"""
        # Manually inject corrupt data (not valid JSON array)
        self.storage._store["pd_todos"] = "not-valid-json"
        state = simulate_init(self.storage)
        self.assertEqual(state["todos"], [],
            f"Expected empty todos for corrupt data, got {state['todos']}")

    def test_corrupt_links_falls_back_to_empty(self):
        """Corrupt links JSON falls back to empty list (Req 6.6)"""
        self.storage._store["pd_links"] = "not-valid-json"
        state = simulate_init(self.storage)
        self.assertEqual(state["links"], [],
            f"Expected empty links for corrupt data, got {state['links']}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
