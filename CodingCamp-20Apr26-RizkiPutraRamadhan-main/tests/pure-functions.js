/**
 * Pure functions extracted from js/app.js for testing.
 * These must stay in sync with the implementations in js/app.js.
 *
 * All functions here are pure (no DOM, no localStorage, no side effects).
 */

// ============================================================
// --- Theme controller (pure logic) ---
// ============================================================

/**
 * Return the opposite theme.
 * toggleTheme(toggleTheme(theme)) === theme  (involution)
 *
 * @param {"light"|"dark"} theme
 * @returns {"light"|"dark"}
 */
export function toggleThemePure(theme) {
  return theme === "light" ? "dark" : "light";
}

// ============================================================
// --- Greeting widget ---
// ============================================================

/**
 * Map an hour (0–23) to the appropriate time-of-day greeting.
 *
 * @param {number} hour - Hour in 24-hour format (0–23)
 * @returns {string}
 */
export function getGreetingPhrase(hour) {
  if (hour >= 5 && hour <= 11) {
    return "Good Morning";
  } else if (hour >= 12 && hour <= 17) {
    return "Good Afternoon";
  } else if (hour >= 18 && hour <= 21) {
    return "Good Evening";
  } else {
    return "Good Night";
  }
}

// ============================================================
// --- Timer widget ---
// ============================================================

/**
 * Enum-like object representing the three possible timer states.
 */
export const TimerState = {
  IDLE:    "IDLE",
  RUNNING: "RUNNING",
  PAUSED:  "PAUSED",
};

/**
 * Apply a timer action to a given state and return the new state.
 * This is the pure state-machine transition function.
 *
 * Transition table:
 *   IDLE    + start → RUNNING
 *   RUNNING + stop  → PAUSED
 *   RUNNING + reset → IDLE
 *   PAUSED  + start → RUNNING
 *   PAUSED  + reset → IDLE
 *   IDLE    + stop  → IDLE   (no-op)
 *   IDLE    + reset → IDLE   (no-op)
 *   PAUSED  + stop  → PAUSED (no-op, not in spec but safe default)
 *
 * @param {"IDLE"|"RUNNING"|"PAUSED"} state
 * @param {"start"|"stop"|"reset"} action
 * @returns {"IDLE"|"RUNNING"|"PAUSED"}
 */
export function applyTimerAction(state, action) {
  switch (action) {
    case "start":
      if (state === TimerState.IDLE || state === TimerState.PAUSED) return TimerState.RUNNING;
      return state; // RUNNING + start → no-op
    case "stop":
      if (state === TimerState.RUNNING) return TimerState.PAUSED;
      return state; // IDLE/PAUSED + stop → no-op
    case "reset":
      if (state === TimerState.RUNNING || state === TimerState.PAUSED) return TimerState.IDLE;
      return state; // IDLE + reset → no-op
    default:
      return state;
  }
}

/**
 * Format a millisecond duration as "MM:SS" (zero-padded).
 *
 * @param {number} ms - Duration in milliseconds (non-negative)
 * @returns {string}
 */
export function formatCountdown(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Validate a proposed Pomodoro duration.
 *
 * @param {number} n - Duration in whole minutes
 * @returns {boolean} true iff 1 ≤ n ≤ 120
 */
export function isValidDuration(n) {
  return Number.isInteger(n) && n >= 1 && n <= 120;
}

/**
 * Simulate a tick on a remainingMs value.
 * Decrements by 1000 and clamps to 0.
 *
 * @param {number} remainingMs
 * @returns {number}
 */
export function tickMs(remainingMs) {
  return Math.max(0, remainingMs - 1000);
}

// ============================================================
// --- Todo widget ---
// ============================================================

/**
 * Add a new todo task to the list.
 *
 * @param {string} label
 * @param {Array<{id: string, label: string, completed: boolean}>} tasks
 * @returns {Array<{id: string, label: string, completed: boolean}>}
 */
export function addTodo(label, tasks) {
  const id = `todo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return [...tasks, { id, label, completed: false }];
}

/**
 * Toggle the completed state of a task by id.
 *
 * @param {string} id
 * @param {Array<{id: string, label: string, completed: boolean}>} tasks
 * @returns {Array<{id: string, label: string, completed: boolean}>}
 */
export function toggleTodo(id, tasks) {
  return tasks.map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
}

/**
 * Delete a task by id.
 *
 * @param {string} id
 * @param {Array<{id: string, label: string, completed: boolean}>} tasks
 * @returns {Array<{id: string, label: string, completed: boolean}>}
 */
export function deleteTodo(id, tasks) {
  return tasks.filter(task => task.id !== id);
}
