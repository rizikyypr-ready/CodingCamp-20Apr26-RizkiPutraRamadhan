/**
 * Property-based tests for the Personal Dashboard.
 *
 * Uses Node.js built-in test runner (node:test) and fast-check for
 * property-based testing.
 *
 * Run with: node --test tests/properties.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import {
  toggleThemePure,
  getGreetingPhrase,
  TimerState,
  applyTimerAction,
  formatCountdown,
  isValidDuration,
  tickMs,
  addTodo,
  toggleTodo,
  deleteTodo,
} from "./pure-functions.js";

// ============================================================
// Task 2.2 — Property 8: Theme toggle is an involution
// Validates: Requirements 7.1, 7.2
// ============================================================

describe("Property 8: Theme toggle is an involution", () => {
  it("toggleTheme(toggleTheme(theme)) === theme for any valid theme", () => {
    const validThemes = fc.constantFrom("light", "dark");

    fc.assert(
      fc.property(validThemes, (theme) => {
        const result = toggleThemePure(toggleThemePure(theme));
        assert.equal(result, theme,
          `Expected double-toggle of "${theme}" to return "${theme}", got "${result}"`);
      })
    );
  });

  it("toggleTheme flips light to dark", () => {
    assert.equal(toggleThemePure("light"), "dark");
  });

  it("toggleTheme flips dark to light", () => {
    assert.equal(toggleThemePure("dark"), "light");
  });
});

// ============================================================
// Task 3.2 — Property 1: Greeting phrase covers all 24 hours
// Validates: Requirements 1.3, 1.4, 1.5, 1.6
// ============================================================

describe("Property 1: Greeting phrase covers all 24 hours", () => {
  const VALID_PHRASES = new Set([
    "Good Morning",
    "Good Afternoon",
    "Good Evening",
    "Good Night",
  ]);

  it("getGreetingPhrase returns one of the four valid phrases for every hour 0–23", () => {
    const hourArb = fc.integer({ min: 0, max: 23 });

    fc.assert(
      fc.property(hourArb, (hour) => {
        const phrase = getGreetingPhrase(hour);
        assert.ok(
          VALID_PHRASES.has(phrase),
          `Hour ${hour}: expected one of the four greeting phrases, got "${phrase}"`
        );
      })
    );
  });

  it("hours 5–11 map to Good Morning", () => {
    const hourArb = fc.integer({ min: 5, max: 11 });

    fc.assert(
      fc.property(hourArb, (hour) => {
        assert.equal(getGreetingPhrase(hour), "Good Morning",
          `Hour ${hour} should be "Good Morning"`);
      })
    );
  });

  it("hours 12–17 map to Good Afternoon", () => {
    const hourArb = fc.integer({ min: 12, max: 17 });

    fc.assert(
      fc.property(hourArb, (hour) => {
        assert.equal(getGreetingPhrase(hour), "Good Afternoon",
          `Hour ${hour} should be "Good Afternoon"`);
      })
    );
  });

  it("hours 18–21 map to Good Evening", () => {
    const hourArb = fc.integer({ min: 18, max: 21 });

    fc.assert(
      fc.property(hourArb, (hour) => {
        assert.equal(getGreetingPhrase(hour), "Good Evening",
          `Hour ${hour} should be "Good Evening"`);
      })
    );
  });

  it("hours 0–4 and 22–23 map to Good Night", () => {
    const nightHourArb = fc.oneof(
      fc.integer({ min: 0, max: 4 }),
      fc.integer({ min: 22, max: 23 })
    );

    fc.assert(
      fc.property(nightHourArb, (hour) => {
        assert.equal(getGreetingPhrase(hour), "Good Night",
          `Hour ${hour} should be "Good Night"`);
      })
    );
  });
});

// ============================================================
// Task 4.2 — Property 2: Timer state machine transitions are valid
// Validates: Requirements 3.2, 3.3, 3.4, 3.5
// ============================================================

describe("Property 2: Timer state machine transitions are valid", () => {
  const stateArb = fc.constantFrom(TimerState.IDLE, TimerState.RUNNING, TimerState.PAUSED);
  const actionArb = fc.constantFrom("start", "stop", "reset");
  const validStates = new Set([TimerState.IDLE, TimerState.RUNNING, TimerState.PAUSED]);

  it("any (state, action) pair produces a valid TimerState", () => {
    fc.assert(
      fc.property(stateArb, actionArb, (state, action) => {
        const next = applyTimerAction(state, action);
        assert.ok(
          validStates.has(next),
          `(${state}, ${action}) → "${next}" is not a valid TimerState`
        );
      })
    );
  });

  it("IDLE + start → RUNNING", () => {
    assert.equal(applyTimerAction(TimerState.IDLE, "start"), TimerState.RUNNING);
  });

  it("RUNNING + stop → PAUSED", () => {
    assert.equal(applyTimerAction(TimerState.RUNNING, "stop"), TimerState.PAUSED);
  });

  it("RUNNING + reset → IDLE", () => {
    assert.equal(applyTimerAction(TimerState.RUNNING, "reset"), TimerState.IDLE);
  });

  it("PAUSED + start → RUNNING", () => {
    assert.equal(applyTimerAction(TimerState.PAUSED, "start"), TimerState.RUNNING);
  });

  it("PAUSED + reset → IDLE", () => {
    assert.equal(applyTimerAction(TimerState.PAUSED, "reset"), TimerState.IDLE);
  });

  it("IDLE + stop → IDLE (no-op)", () => {
    assert.equal(applyTimerAction(TimerState.IDLE, "stop"), TimerState.IDLE);
  });

  it("IDLE + reset → IDLE (no-op)", () => {
    assert.equal(applyTimerAction(TimerState.IDLE, "reset"), TimerState.IDLE);
  });

  it("any sequence of actions always produces a valid state", () => {
    const actionsArb = fc.array(actionArb, { minLength: 1, maxLength: 20 });

    fc.assert(
      fc.property(stateArb, actionsArb, (initialState, actions) => {
        let state = initialState;
        for (const action of actions) {
          state = applyTimerAction(state, action);
          assert.ok(
            validStates.has(state),
            `After action "${action}", state "${state}" is not valid`
          );
        }
      })
    );
  });
});

// ============================================================
// Task 4.3 — Property 3: Timer remaining time is always non-negative
// Validates: Requirements 3.6
// ============================================================

describe("Property 3: Timer remaining time is always non-negative", () => {
  it("remainingMs is always >= 0 after any sequence of ticks", () => {
    // Start with any non-negative ms value (up to 2 hours in ms)
    const initialMsArb = fc.integer({ min: 0, max: 7200000 });
    const tickCountArb = fc.integer({ min: 1, max: 10000 });

    fc.assert(
      fc.property(initialMsArb, tickCountArb, (initialMs, tickCount) => {
        let remaining = initialMs;
        for (let i = 0; i < tickCount; i++) {
          remaining = tickMs(remaining);
          assert.ok(
            remaining >= 0,
            `remainingMs became negative (${remaining}) after ${i + 1} ticks from ${initialMs}ms`
          );
        }
      })
    );
  });

  it("tickMs clamps to 0 and never goes below", () => {
    assert.equal(tickMs(0), 0);
    assert.equal(tickMs(500), 0);   // less than 1 second → clamps to 0
    assert.equal(tickMs(1000), 0);  // exactly 1 second → reaches 0
    assert.equal(tickMs(1500), 500); // 1.5s → 0.5s remaining
  });
});

// ============================================================
// Task 4.4 — Property 4: Pomodoro duration validation is a total predicate
// Validates: Requirements 4.1, 4.5
// ============================================================

describe("Property 4: Pomodoro duration validation is a total predicate", () => {
  it("isValidDuration returns true iff 1 <= n <= 120 for any integer", () => {
    // Test valid range
    const validArb = fc.integer({ min: 1, max: 120 });
    fc.assert(
      fc.property(validArb, (n) => {
        assert.equal(isValidDuration(n), true,
          `isValidDuration(${n}) should be true`);
      })
    );
  });

  it("isValidDuration returns false for integers below 1", () => {
    const belowArb = fc.integer({ min: -10000, max: 0 });
    fc.assert(
      fc.property(belowArb, (n) => {
        assert.equal(isValidDuration(n), false,
          `isValidDuration(${n}) should be false`);
      })
    );
  });

  it("isValidDuration returns false for integers above 120", () => {
    const aboveArb = fc.integer({ min: 121, max: 100000 });
    fc.assert(
      fc.property(aboveArb, (n) => {
        assert.equal(isValidDuration(n), false,
          `isValidDuration(${n}) should be false`);
      })
    );
  });

  it("isValidDuration returns false for non-integers", () => {
    // Test floats that are not whole numbers
    const floatArb = fc.float({ min: 1, max: 120, noNaN: true }).filter(
      (n) => !Number.isInteger(n)
    );
    fc.assert(
      fc.property(floatArb, (n) => {
        assert.equal(isValidDuration(n), false,
          `isValidDuration(${n}) should be false for non-integer`);
      })
    );
  });

  it("boundary values: 1 and 120 are valid, 0 and 121 are not", () => {
    assert.equal(isValidDuration(1), true);
    assert.equal(isValidDuration(120), true);
    assert.equal(isValidDuration(0), false);
    assert.equal(isValidDuration(121), false);
  });
});

// ============================================================
// Task 4.5 — Property 9: formatCountdown is always MM:SS
// Validates: Requirements 3.1
// ============================================================

describe("Property 9: formatCountdown is always MM:SS", () => {
  const MM_SS_PATTERN = /^\d{2}:\d{2}$/;

  it("formatCountdown returns a string matching ^\\d{2}:\\d{2}$ for any ms in [0, 5999000]", () => {
    const msArb = fc.integer({ min: 0, max: 5999000 });

    fc.assert(
      fc.property(msArb, (ms) => {
        const result = formatCountdown(ms);
        assert.match(result, MM_SS_PATTERN,
          `formatCountdown(${ms}) = "${result}" does not match MM:SS pattern`);
      })
    );
  });

  it("seconds part is always in [0, 59]", () => {
    const msArb = fc.integer({ min: 0, max: 5999000 });

    fc.assert(
      fc.property(msArb, (ms) => {
        const result = formatCountdown(ms);
        const seconds = parseInt(result.split(":")[1], 10);
        assert.ok(
          seconds >= 0 && seconds <= 59,
          `formatCountdown(${ms}) = "${result}" has seconds ${seconds} outside [0, 59]`
        );
      })
    );
  });

  it("specific known values", () => {
    assert.equal(formatCountdown(0), "00:00");
    assert.equal(formatCountdown(1000), "00:01");
    assert.equal(formatCountdown(60000), "01:00");
    assert.equal(formatCountdown(1500000), "25:00");
    assert.equal(formatCountdown(5999000), "99:59");
    assert.equal(formatCountdown(65000), "01:05");
  });
});

// ============================================================
// Task 6.2 — Property 5: Todo list add-then-delete identity
// Validates: Requirements 5.2, 5.9
// ============================================================

describe("Property 5: Todo list add-then-delete identity", () => {
  // Arbitrary for a single task
  const taskArb = fc.record({
    id: fc.uuid(),
    label: fc.string({ minLength: 1, maxLength: 50 }),
    completed: fc.boolean(),
  });

  // Arbitrary for a task list (0–10 tasks)
  const taskListArb = fc.array(taskArb, { minLength: 0, maxLength: 10 });

  // Arbitrary for a non-empty label
  const labelArb = fc.string({ minLength: 1, maxLength: 100 });

  it("deleteTodo(id, addTodo(label, T)) returns a list equal to T", () => {
    fc.assert(
      fc.property(taskListArb, labelArb, (tasks, label) => {
        const afterAdd = addTodo(label, tasks);
        // The new task is always appended at the end
        const newTask = afterAdd[afterAdd.length - 1];
        const afterDelete = deleteTodo(newTask.id, afterAdd);

        // Same length
        assert.equal(afterDelete.length, tasks.length,
          `Length mismatch: expected ${tasks.length}, got ${afterDelete.length}`);

        // Same items in same order
        for (let i = 0; i < tasks.length; i++) {
          assert.deepEqual(afterDelete[i], tasks[i],
            `Task at index ${i} differs after add-then-delete`);
        }
      })
    );
  });
});

// ============================================================
// Task 6.3 — Property 6: Todo toggle is an involution
// Validates: Requirements 5.5
// ============================================================

describe("Property 6: Todo toggle is an involution", () => {
  // Arbitrary for a single task
  const taskArb = fc.record({
    id: fc.uuid(),
    label: fc.string({ minLength: 1, maxLength: 50 }),
    completed: fc.boolean(),
  });

  // Arbitrary for a non-empty task list
  const nonEmptyTaskListArb = fc.array(taskArb, { minLength: 1, maxLength: 10 });

  it("toggleTodo(id, toggleTodo(id, T)) restores the original completed state", () => {
    fc.assert(
      fc.property(nonEmptyTaskListArb, (tasks) => {
        // Pick a random task from the list
        const targetTask = tasks[Math.floor(Math.random() * tasks.length)];
        const id = targetTask.id;
        const originalCompleted = targetTask.completed;

        const afterFirstToggle = toggleTodo(id, tasks);
        const afterSecondToggle = toggleTodo(id, afterFirstToggle);

        const restoredTask = afterSecondToggle.find(t => t.id === id);
        assert.ok(restoredTask !== undefined, `Task with id ${id} not found after double toggle`);
        assert.equal(
          restoredTask.completed,
          originalCompleted,
          `Double toggle should restore completed=${originalCompleted}, got ${restoredTask.completed}`
        );
      })
    );
  });

  it("toggleTodo does not affect other tasks in the list", () => {
    fc.assert(
      fc.property(nonEmptyTaskListArb, (tasks) => {
        const targetTask = tasks[0];
        const id = targetTask.id;

        const afterToggle = toggleTodo(id, tasks);

        // All other tasks should be unchanged
        for (const task of tasks) {
          if (task.id !== id) {
            const found = afterToggle.find(t => t.id === task.id);
            assert.ok(found !== undefined, `Task ${task.id} missing after toggle`);
            assert.deepEqual(found, task, `Task ${task.id} was modified by toggle of ${id}`);
          }
        }
      })
    );
  });
});
