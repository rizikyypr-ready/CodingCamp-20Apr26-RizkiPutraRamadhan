"""
Property-based tests for the Personal Dashboard.

Uses Python's Hypothesis library for property-based testing.

Run with: python -m pytest tests/test_properties.py -v
      or: python tests/test_properties.py
"""

import sys
import os
import math
import re
import unittest

# Add tests directory to path so we can import pure_functions
sys.path.insert(0, os.path.dirname(__file__))

from hypothesis import given, settings, assume
from hypothesis import strategies as st

from pure_functions import (
    toggle_theme_pure,
    get_greeting_phrase,
    TIMER_STATES,
    TIMER_ACTIONS,
    apply_timer_action,
    format_countdown,
    is_valid_duration,
    tick_ms,
    add_todo,
    toggle_todo,
    delete_todo,
)


# ============================================================
# Task 2.2 — Property 8: Theme toggle is an involution
# Validates: Requirements 7.1, 7.2
# ============================================================

class TestThemeToggleInvolution(unittest.TestCase):
    """Property 8: Theme toggle is an involution"""

    @given(st.sampled_from(["light", "dark"]))
    def test_double_toggle_returns_original(self, theme):
        """
        Validates: Requirements 7.1, 7.2
        toggleTheme(toggleTheme(theme)) === theme for any valid theme
        """
        result = toggle_theme_pure(toggle_theme_pure(theme))
        self.assertEqual(result, theme,
            f"Double toggle of '{theme}' should return '{theme}', got '{result}'")

    def test_light_toggles_to_dark(self):
        self.assertEqual(toggle_theme_pure("light"), "dark")

    def test_dark_toggles_to_light(self):
        self.assertEqual(toggle_theme_pure("dark"), "light")


# ============================================================
# Task 3.2 — Property 1: Greeting phrase covers all 24 hours
# Validates: Requirements 1.3, 1.4, 1.5, 1.6
# ============================================================

VALID_PHRASES = {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"}


class TestGreetingPhraseCoverage(unittest.TestCase):
    """Property 1: Greeting phrase covers all 24 hours"""

    @given(st.integers(min_value=0, max_value=23))
    def test_returns_valid_phrase_for_every_hour(self, hour):
        """
        Validates: Requirements 1.3, 1.4, 1.5, 1.6
        For every integer h in [0, 23], getGreetingPhrase(h) returns exactly
        one of the four valid greeting phrases.
        """
        phrase = get_greeting_phrase(hour)
        self.assertIn(phrase, VALID_PHRASES,
            f"Hour {hour}: expected one of {VALID_PHRASES}, got '{phrase}'")

    @given(st.integers(min_value=5, max_value=11))
    def test_morning_hours_5_to_11(self, hour):
        """Hours 5–11 map to Good Morning"""
        self.assertEqual(get_greeting_phrase(hour), "Good Morning",
            f"Hour {hour} should be 'Good Morning'")

    @given(st.integers(min_value=12, max_value=17))
    def test_afternoon_hours_12_to_17(self, hour):
        """Hours 12–17 map to Good Afternoon"""
        self.assertEqual(get_greeting_phrase(hour), "Good Afternoon",
            f"Hour {hour} should be 'Good Afternoon'")

    @given(st.integers(min_value=18, max_value=21))
    def test_evening_hours_18_to_21(self, hour):
        """Hours 18–21 map to Good Evening"""
        self.assertEqual(get_greeting_phrase(hour), "Good Evening",
            f"Hour {hour} should be 'Good Evening'")

    @given(st.one_of(
        st.integers(min_value=0, max_value=4),
        st.integers(min_value=22, max_value=23)
    ))
    def test_night_hours_0_to_4_and_22_to_23(self, hour):
        """Hours 0–4 and 22–23 map to Good Night"""
        self.assertEqual(get_greeting_phrase(hour), "Good Night",
            f"Hour {hour} should be 'Good Night'")

    def test_boundary_values(self):
        """Test exact boundary hours"""
        self.assertEqual(get_greeting_phrase(0), "Good Night")
        self.assertEqual(get_greeting_phrase(4), "Good Night")
        self.assertEqual(get_greeting_phrase(5), "Good Morning")
        self.assertEqual(get_greeting_phrase(11), "Good Morning")
        self.assertEqual(get_greeting_phrase(12), "Good Afternoon")
        self.assertEqual(get_greeting_phrase(17), "Good Afternoon")
        self.assertEqual(get_greeting_phrase(18), "Good Evening")
        self.assertEqual(get_greeting_phrase(21), "Good Evening")
        self.assertEqual(get_greeting_phrase(22), "Good Night")
        self.assertEqual(get_greeting_phrase(23), "Good Night")


# ============================================================
# Task 4.2 — Property 2: Timer state machine transitions are valid
# Validates: Requirements 3.2, 3.3, 3.4, 3.5
# ============================================================

class TestTimerStateMachineTransitions(unittest.TestCase):
    """Property 2: Timer state machine transitions are valid"""

    @given(
        st.sampled_from(["IDLE", "RUNNING", "PAUSED"]),
        st.sampled_from(["start", "stop", "reset"])
    )
    def test_any_state_action_pair_produces_valid_state(self, state, action):
        """
        Validates: Requirements 3.2, 3.3, 3.4, 3.5
        Any (state, action) pair produces a valid TimerState.
        """
        next_state = apply_timer_action(state, action)
        self.assertIn(next_state, TIMER_STATES,
            f"({state}, {action}) -> '{next_state}' is not a valid TimerState")

    @given(
        st.sampled_from(["IDLE", "RUNNING", "PAUSED"]),
        st.lists(st.sampled_from(["start", "stop", "reset"]), min_size=1, max_size=20)
    )
    def test_any_sequence_of_actions_produces_valid_state(self, initial_state, actions):
        """Any sequence of actions always produces a valid state"""
        state = initial_state
        for action in actions:
            state = apply_timer_action(state, action)
            self.assertIn(state, TIMER_STATES,
                f"After action '{action}', state '{state}' is not valid")

    def test_idle_start_to_running(self):
        self.assertEqual(apply_timer_action("IDLE", "start"), "RUNNING")

    def test_running_stop_to_paused(self):
        self.assertEqual(apply_timer_action("RUNNING", "stop"), "PAUSED")

    def test_running_reset_to_idle(self):
        self.assertEqual(apply_timer_action("RUNNING", "reset"), "IDLE")

    def test_paused_start_to_running(self):
        self.assertEqual(apply_timer_action("PAUSED", "start"), "RUNNING")

    def test_paused_reset_to_idle(self):
        self.assertEqual(apply_timer_action("PAUSED", "reset"), "IDLE")

    def test_idle_stop_is_noop(self):
        self.assertEqual(apply_timer_action("IDLE", "stop"), "IDLE")

    def test_idle_reset_is_noop(self):
        self.assertEqual(apply_timer_action("IDLE", "reset"), "IDLE")


# ============================================================
# Task 4.3 — Property 3: Timer remaining time is always non-negative
# Validates: Requirements 3.6
# ============================================================

class TestTimerRemainingTimeNonNegative(unittest.TestCase):
    """Property 3: Timer remaining time is always non-negative"""

    @given(
        st.integers(min_value=0, max_value=7200000),  # up to 2 hours in ms
        st.integers(min_value=1, max_value=10000)      # number of ticks
    )
    def test_remaining_ms_never_negative_after_ticks(self, initial_ms, tick_count):
        """
        Validates: Requirements 3.6
        After any sequence of tick operations, remainingMs is always >= 0.
        """
        remaining = initial_ms
        for i in range(tick_count):
            remaining = tick_ms(remaining)
            self.assertGreaterEqual(remaining, 0,
                f"remainingMs became negative ({remaining}) after {i+1} ticks from {initial_ms}ms")

    def test_tick_clamps_to_zero(self):
        self.assertEqual(tick_ms(0), 0)
        self.assertEqual(tick_ms(500), 0)   # less than 1 second -> clamps to 0
        self.assertEqual(tick_ms(1000), 0)  # exactly 1 second -> reaches 0
        self.assertEqual(tick_ms(1500), 500)  # 1.5s -> 0.5s remaining


# ============================================================
# Task 4.4 — Property 4: Pomodoro duration validation is a total predicate
# Validates: Requirements 4.1, 4.5
# ============================================================

class TestPomodoroValidation(unittest.TestCase):
    """Property 4: Pomodoro duration validation is a total predicate"""

    @given(st.integers(min_value=1, max_value=120))
    def test_valid_range_returns_true(self, n):
        """
        Validates: Requirements 4.1, 4.5
        isValidDuration returns true for all integers in [1, 120].
        """
        self.assertTrue(is_valid_duration(n),
            f"is_valid_duration({n}) should be True")

    @given(st.integers(max_value=0))
    def test_below_range_returns_false(self, n):
        """isValidDuration returns false for integers <= 0"""
        self.assertFalse(is_valid_duration(n),
            f"is_valid_duration({n}) should be False")

    @given(st.integers(min_value=121))
    def test_above_range_returns_false(self, n):
        """isValidDuration returns false for integers >= 121"""
        self.assertFalse(is_valid_duration(n),
            f"is_valid_duration({n}) should be False")

    @given(st.floats(min_value=1.0, max_value=120.0, allow_nan=False, allow_infinity=False).filter(
        lambda x: x != int(x)
    ))
    def test_non_integers_return_false(self, n):
        """isValidDuration returns false for non-integer floats"""
        self.assertFalse(is_valid_duration(n),
            f"is_valid_duration({n}) should be False for non-integer")

    def test_boundary_values(self):
        """Boundary values: 1 and 120 are valid, 0 and 121 are not"""
        self.assertTrue(is_valid_duration(1))
        self.assertTrue(is_valid_duration(120))
        self.assertFalse(is_valid_duration(0))
        self.assertFalse(is_valid_duration(121))
        self.assertFalse(is_valid_duration(-1))


# ============================================================
# Task 4.5 — Property 9: formatCountdown is always MM:SS
# Validates: Requirements 3.1
# ============================================================

MM_SS_PATTERN = re.compile(r"^\d{2}:\d{2}$")


class TestFormatCountdown(unittest.TestCase):
    """Property 9: formatCountdown is always MM:SS"""

    @given(st.integers(min_value=0, max_value=5999000))
    def test_format_matches_mm_ss_pattern(self, ms):
        """
        Validates: Requirements 3.1
        For any ms in [0, 5999000], formatCountdown(ms) matches ^\\d{2}:\\d{2}$
        """
        result = format_countdown(ms)
        self.assertRegex(result, MM_SS_PATTERN,
            f"format_countdown({ms}) = '{result}' does not match MM:SS pattern")

    @given(st.integers(min_value=0, max_value=5999000))
    def test_seconds_part_in_range_0_to_59(self, ms):
        """Seconds part is always in [0, 59]"""
        result = format_countdown(ms)
        seconds = int(result.split(":")[1])
        self.assertGreaterEqual(seconds, 0,
            f"format_countdown({ms}) = '{result}' has seconds {seconds} < 0")
        self.assertLessEqual(seconds, 59,
            f"format_countdown({ms}) = '{result}' has seconds {seconds} > 59")

    def test_specific_known_values(self):
        self.assertEqual(format_countdown(0), "00:00")
        self.assertEqual(format_countdown(1000), "00:01")
        self.assertEqual(format_countdown(60000), "01:00")
        self.assertEqual(format_countdown(1500000), "25:00")
        self.assertEqual(format_countdown(5999000), "99:59")
        self.assertEqual(format_countdown(65000), "01:05")


# ============================================================
# Task 6.2 — Property 5: Todo list add-then-delete identity
# Validates: Requirements 5.2, 5.9
# ============================================================

# Strategy for a single task dict
task_strategy = st.fixed_dictionaries({
    "id": st.text(min_size=1, max_size=20, alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd"), whitelist_characters="-_"
    )),
    "label": st.text(min_size=1, max_size=50),
    "completed": st.booleans(),
})

# Strategy for a list of tasks (0–10 items, unique ids)
def unique_task_list():
    return st.lists(task_strategy, min_size=0, max_size=10).map(
        lambda tasks: list({t["id"]: t for t in tasks}.values())
    )


class TestTodoAddThenDeleteIdentity(unittest.TestCase):
    """Property 5: Todo list add-then-delete identity"""

    @given(unique_task_list(), st.text(min_size=1, max_size=100))
    def test_add_then_delete_returns_original_list(self, tasks, label):
        """
        Validates: Requirements 5.2, 5.9
        deleteTodo(id, addTodo(label, T)) returns a list equal to T.
        """
        after_add = add_todo(label, tasks)
        # The new task is always appended at the end
        new_task = after_add[-1]
        after_delete = delete_todo(new_task["id"], after_add)

        # Same length
        self.assertEqual(len(after_delete), len(tasks),
            f"Length mismatch: expected {len(tasks)}, got {len(after_delete)}")

        # Same items in same order
        for i, (original, restored) in enumerate(zip(tasks, after_delete)):
            self.assertEqual(restored, original,
                f"Task at index {i} differs after add-then-delete")


# ============================================================
# Task 6.3 — Property 6: Todo toggle is an involution
# Validates: Requirements 5.5
# ============================================================

class TestTodoToggleInvolution(unittest.TestCase):
    """Property 6: Todo toggle is an involution"""

    @given(st.lists(task_strategy, min_size=1, max_size=10))
    def test_double_toggle_restores_original_completed_state(self, tasks):
        """
        Validates: Requirements 5.5
        toggleTodo(id, toggleTodo(id, T)) restores the original completed state.
        """
        # Deduplicate by id to avoid ambiguity
        seen_ids = set()
        unique_tasks = []
        for t in tasks:
            if t["id"] not in seen_ids:
                seen_ids.add(t["id"])
                unique_tasks.append(t)

        assume(len(unique_tasks) > 0)

        target = unique_tasks[0]
        task_id = target["id"]
        original_completed = target["completed"]

        after_first = toggle_todo(task_id, unique_tasks)
        after_second = toggle_todo(task_id, after_first)

        restored = next((t for t in after_second if t["id"] == task_id), None)
        self.assertIsNotNone(restored, f"Task {task_id} not found after double toggle")
        self.assertEqual(restored["completed"], original_completed,
            f"Double toggle should restore completed={original_completed}, "
            f"got {restored['completed']}")

    @given(st.lists(task_strategy, min_size=2, max_size=10))
    def test_toggle_does_not_affect_other_tasks(self, tasks):
        """toggleTodo does not affect other tasks in the list"""
        # Deduplicate by id
        seen_ids = set()
        unique_tasks = []
        for t in tasks:
            if t["id"] not in seen_ids:
                seen_ids.add(t["id"])
                unique_tasks.append(t)

        assume(len(unique_tasks) >= 2)

        target = unique_tasks[0]
        task_id = target["id"]

        after_toggle = toggle_todo(task_id, unique_tasks)

        for task in unique_tasks:
            if task["id"] != task_id:
                found = next((t for t in after_toggle if t["id"] == task["id"]), None)
                self.assertIsNotNone(found, f"Task {task['id']} missing after toggle")
                self.assertEqual(found, task,
                    f"Task {task['id']} was modified by toggle of {task_id}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
