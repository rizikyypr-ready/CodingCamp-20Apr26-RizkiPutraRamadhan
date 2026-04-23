(function () {
  "use strict";

  // ============================================================
  // --- Storage helpers ---
  // ============================================================

  /**
   * Storage key constants used throughout the dashboard.
   * @enum {string}
   */
  const StorageKey = {
    THEME:         "pd_theme",
    USER_NAME:     "pd_name",
    POMODORO_MINS: "pd_pomodoro_mins",
    TODOS:         "pd_todos",
    LINKS:         "pd_links",
  };

  /**
   * Retrieve a value from localStorage, falling back to `defaultValue`
   * if the key is absent or the stored JSON cannot be parsed.
   *
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  function storageGet(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("[Dashboard] storageGet failed for key:", key, err);
      return defaultValue;
    }
  }

  /**
   * Serialize `value` to JSON and write it to localStorage under `key`.
   * Silently swallows errors (e.g., storage quota exceeded).
   *
   * @param {string} key
   * @param {*} value
   */
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn("[Dashboard] storageSet failed for key:", key, err);
    }
  }

  /**
   * Remove the entry for `key` from localStorage.
   * Silently swallows errors.
   *
   * @param {string} key
   */
  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn("[Dashboard] storageRemove failed for key:", key, err);
    }
  }

  // ============================================================
  // --- Theme controller ---
  // ============================================================

  /**
   * Read the saved theme from storage (key: `pd_theme`).
   * If absent, fall back to the OS `prefers-color-scheme` media query.
   * Apply the resolved theme as a `data-theme` attribute on `<html>` and
   * update the toggle button's label / aria-label to match.
   */
  function initTheme() {
    const saved = storageGet(StorageKey.THEME, null);
    const theme = saved !== null
      ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    document.documentElement.setAttribute("data-theme", theme);
    _updateThemeButton(theme);
  }

  /**
   * Flip the current theme between "light" and "dark", persist the new
   * value to storage, and update the `data-theme` attribute + button.
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", next);
    storageSet(StorageKey.THEME, next);
    _updateThemeButton(next);
  }

  /**
   * Sync the #theme-toggle button's text content and aria-label to the
   * given theme value.
   *
   * @param {"light"|"dark"} theme
   */
  function _updateThemeButton(theme) {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    if (theme === "dark") {
      btn.textContent = "☀️";
      btn.setAttribute("aria-label", "Switch to light mode");
    } else {
      btn.textContent = "🌙";
      btn.setAttribute("aria-label", "Switch to dark mode");
    }
  }

  // Wire the theme toggle button (called during bootstrap)
  function _initThemeToggleButton() {
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", toggleTheme);
    }
  }

  // ============================================================
  // --- Greeting widget ---
  // ============================================================

  /**
   * Map an hour (0–23) to the appropriate time-of-day greeting.
   *
   * @param {number} hour - Hour in 24-hour format (0–23)
   * @returns {string} One of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night"
   */
  function getGreetingPhrase(hour) {
    if (hour >= 5 && hour <= 11) {
      return "Good Morning";
    } else if (hour >= 12 && hour <= 17) {
      return "Good Afternoon";
    } else if (hour >= 18 && hour <= 21) {
      return "Good Evening";
    } else {
      // hour ∈ [0, 4] ∪ [22, 23]
      return "Good Night";
    }
  }

  /**
   * Format a Date object as "HH:MM:SS" (24-hour, zero-padded).
   *
   * @param {Date} date
   * @returns {string} Time in "HH:MM:SS" format
   */
  function formatTime(date) {
    const hours   = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format a Date object as a human-readable date string.
   * Example: "Monday, 26 April 2025"
   *
   * @param {Date} date
   * @returns {string} Date in "Weekday, DD Month YYYY" format
   */
  function formatDate(date) {
    const options = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    };
    return date.toLocaleDateString("en-GB", options);
  }

  /**
   * Read the saved name from storage, compute the current greeting phrase,
   * time, and date, then update the greeting DOM elements:
   *   #greeting-phrase — e.g. "Good Morning, Rizki" or "Good Morning"
   *   #greeting-time   — e.g. "09:30"
   *   #greeting-date   — e.g. "Monday, 26 April 2025"
   */
  function renderGreeting() {
    const now = new Date();
    const name = storageGet(StorageKey.USER_NAME, "");
    const phrase = getGreetingPhrase(now.getHours());

    const phraseEl = document.getElementById("greeting-phrase");
    const timeEl   = document.getElementById("greeting-time");
    const dateEl   = document.getElementById("greeting-date");

    if (phraseEl) {
      phraseEl.textContent = name ? `${phrase}, ${name}` : phrase;
    }
    if (timeEl) {
      timeEl.textContent = formatTime(now);
    }
    if (dateEl) {
      dateEl.textContent = formatDate(now);
    }
  }

  /**
   * Initialise the greeting widget:
   *   1. Render immediately so the user sees the greeting on load.
   *   2. Set up a 1-second interval to keep the time display current.
   *   3. Pre-fill the name input with any saved name.
   *   4. Wire the Save button to persist / clear the name and re-render.
   */
  function initGreeting() {
    // Initial render
    renderGreeting();

    // Keep time updated every second
    setInterval(renderGreeting, 1000);

    // Pre-fill the name input with the saved name
    const nameInput = document.getElementById("name-input");
    const nameSave  = document.getElementById("name-save");
    const nameError = document.getElementById("name-error");

    if (nameInput) {
      nameInput.value = storageGet(StorageKey.USER_NAME, "");
    }

    if (nameSave) {
      nameSave.addEventListener("click", function () {
        const value = nameInput ? nameInput.value.trim() : "";

        // Hide any previous error
        if (nameError) {
          nameError.hidden = true;
          nameError.textContent = "";
        }

        if (value) {
          storageSet(StorageKey.USER_NAME, value);
        } else {
          storageRemove(StorageKey.USER_NAME);
        }

        renderGreeting();
      });
    }
  }

  // ============================================================
  // --- Timer widget ---
  // ============================================================

  /**
   * Enum-like object representing the three possible timer states.
   * @enum {string}
   */
  const TimerState = {
    IDLE:    "IDLE",
    RUNNING: "RUNNING",
    PAUSED:  "PAUSED",
  };

  /**
   * Mutable timer state object.
   * @type {{ status: string, remainingMs: number, intervalId: number|null }}
   */
  const timerState = {
    status:      TimerState.IDLE,
    remainingMs: 25 * 60 * 1000,
    intervalId:  null,
  };

  // ---- Pure functions ----

  /**
   * Format a millisecond duration as "MM:SS" (zero-padded).
   * e.g. 1 500 000 ms → "25:00", 65 000 ms → "01:05"
   *
   * @param {number} ms - Duration in milliseconds (non-negative)
   * @returns {string} Time string in "MM:SS" format
   */
  function formatCountdown(ms) {
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
  function isValidDuration(n) {
    return Number.isInteger(n) && n >= 1 && n <= 120;
  }

  // ---- State machine functions ----

  /**
   * Transition IDLE or PAUSED → RUNNING.
   * Starts a 1-second interval that calls tickTimer().
   * No-op if already RUNNING.
   */
  function startTimer() {
    if (timerState.status === TimerState.RUNNING) return;

    timerState.status = TimerState.RUNNING;
    timerState.intervalId = setInterval(tickTimer, 1000);
    renderTimer();
  }

  /**
   * Transition RUNNING → PAUSED.
   * Clears the interval but retains remainingMs.
   * No-op if not RUNNING.
   */
  function stopTimer() {
    if (timerState.status !== TimerState.RUNNING) return;

    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
    timerState.status = TimerState.PAUSED;
    renderTimer();
  }

  /**
   * Transition any state → IDLE.
   * Clears the interval and restores remainingMs from storage.
   * No-op if already IDLE.
   */
  function resetTimer() {
    if (timerState.status === TimerState.IDLE) return;

    if (timerState.intervalId !== null) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }

    const savedMins = storageGet(StorageKey.POMODORO_MINS, 25);
    timerState.remainingMs = savedMins * 60 * 1000;
    timerState.status = TimerState.IDLE;
    renderTimer();
  }

  /**
   * Called every second while the timer is RUNNING.
   * Decrements remainingMs by 1000, clamps to 0, and triggers
   * onTimerComplete() when the countdown reaches zero.
   */
  function tickTimer() {
    timerState.remainingMs = Math.max(0, timerState.remainingMs - 1000);
    renderTimer();

    if (timerState.remainingMs === 0) {
      onTimerComplete();
    }
  }

  // ---- Render / init functions ----

  /**
   * Update the timer DOM to reflect the current timerState:
   *   - #timer-display: formatted MM:SS countdown
   *   - document.title: "⏱ MM:SS — Personal Dashboard" when running,
   *                     "Personal Dashboard" otherwise
   *   - #timer-start-stop: label and aria-label reflect current state
   */
  function renderTimer() {
    const displayEl = document.getElementById("timer-display");
    const startStopBtn = document.getElementById("timer-start-stop");

    const formatted = formatCountdown(timerState.remainingMs);

    if (displayEl) {
      displayEl.textContent = formatted;
    }

    if (timerState.status === TimerState.RUNNING) {
      document.title = `⏱ ${formatted} — Personal Dashboard`;
    } else {
      document.title = "Personal Dashboard";
    }

    if (startStopBtn) {
      if (timerState.status === TimerState.RUNNING) {
        startStopBtn.textContent = "Stop";
        startStopBtn.setAttribute("aria-label", "Stop timer");
      } else {
        startStopBtn.textContent = "Start";
        startStopBtn.setAttribute("aria-label", "Start timer");
      }
    }
  }

  /**
   * Called when the countdown reaches 00:00.
   * Stops the timer, flashes the widget, and plays a short beep.
   */
  function onTimerComplete() {
    // Stop the interval
    if (timerState.intervalId !== null) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }
    timerState.status = TimerState.IDLE;
    renderTimer();

    // Visual flash: add CSS class, remove after animation ends
    const widget = document.getElementById("timer-widget");
    if (widget) {
      widget.classList.add("flash");
      widget.addEventListener("animationend", function handler() {
        widget.classList.remove("flash");
        widget.removeEventListener("animationend", handler);
      });
    }

    // Audible beep via Web Audio API (~200 ms oscillator burst)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);

        oscillator.onended = function () {
          ctx.close();
        };
      }
    } catch (err) {
      console.warn("[Dashboard] Web Audio beep failed:", err);
    }
  }

  /**
   * Initialise the timer widget:
   *   1. Load saved Pomodoro duration from storage (default 25 min).
   *   2. Set remainingMs and call renderTimer().
   *   3. Wire #timer-start-stop, #timer-reset, and #duration-save buttons.
   */
  function initTimer() {
    const savedMins = storageGet(StorageKey.POMODORO_MINS, 25);
    timerState.remainingMs = savedMins * 60 * 1000;
    timerState.status = TimerState.IDLE;
    renderTimer();

    // Pre-fill the duration input with the saved value
    const durationInput = document.getElementById("duration-input");
    if (durationInput) {
      durationInput.value = savedMins;
    }

    // Start / Stop button
    const startStopBtn = document.getElementById("timer-start-stop");
    if (startStopBtn) {
      startStopBtn.addEventListener("click", function () {
        if (timerState.status === TimerState.RUNNING) {
          stopTimer();
        } else {
          startTimer();
        }
      });
    }

    // Reset button
    const resetBtn = document.getElementById("timer-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        resetTimer();
      });
    }

    // Duration save button
    const durationSaveBtn = document.getElementById("duration-save");
    const durationError   = document.getElementById("duration-error");

    if (durationSaveBtn) {
      durationSaveBtn.addEventListener("click", function () {
        // Hide any previous error
        if (durationError) {
          durationError.hidden = true;
          durationError.textContent = "";
        }

        const raw = durationInput ? durationInput.value : "";
        const parsed = parseInt(raw, 10);

        if (!isValidDuration(parsed)) {
          if (durationError) {
            durationError.textContent = "Please enter a whole number between 1 and 120.";
            durationError.hidden = false;
          }
          return;
        }

        // Persist the new duration
        storageSet(StorageKey.POMODORO_MINS, parsed);

        // Update the display only when the timer is not running
        if (timerState.status !== TimerState.RUNNING) {
          timerState.remainingMs = parsed * 60 * 1000;
          timerState.status = TimerState.IDLE;
          renderTimer();
        }
      });
    }
  }

  // ============================================================
  // --- Todo widget ---
  // ============================================================

  /**
   * Return a new array with a new Task appended.
   * @param {string} label
   * @param {Array} tasks
   * @returns {Array}
   */
  function addTodo(label, tasks) {
    return tasks.concat([{
      id:        crypto.randomUUID(),
      label:     label,
      completed: false,
    }]);
  }

  /**
   * Return a new array with the matching task's `completed` flipped.
   * @param {string} id
   * @param {Array} tasks
   * @returns {Array}
   */
  function toggleTodo(id, tasks) {
    return tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, { completed: !t.completed }) : t;
    });
  }

  /**
   * Return a new array with the matching task's label updated.
   * @param {string} id
   * @param {string} newLabel
   * @param {Array} tasks
   * @returns {Array}
   */
  function editTodo(id, newLabel, tasks) {
    return tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, { label: newLabel }) : t;
    });
  }

  /**
   * Return a new array with the matching task removed.
   * @param {string} id
   * @param {Array} tasks
   * @returns {Array}
   */
  function deleteTodo(id, tasks) {
    return tasks.filter(function (t) { return t.id !== id; });
  }

  /** Persist the current task list to storage. */
  function saveTodos(tasks) {
    storageSet(StorageKey.TODOS, tasks);
  }

  /**
   * Full re-render of the task list DOM.
   * @param {Array} tasks
   */
  function renderTodos(tasks) {
    const list = document.getElementById("todo-list");
    if (!list) return;

    list.innerHTML = "";

    tasks.forEach(function (task) {
      const li = document.createElement("li");
      li.className = "todo-item" + (task.completed ? " completed" : "");

      // Checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", "Mark \"" + task.label + "\" as " + (task.completed ? "incomplete" : "complete"));
      checkbox.addEventListener("change", function () {
        const updated = toggleTodo(task.id, storageGet(StorageKey.TODOS, []));
        saveTodos(updated);
        renderTodos(updated);
      });

      // Label span
      const labelSpan = document.createElement("span");
      labelSpan.className = "todo-label";
      labelSpan.textContent = task.label;

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "todo-edit-btn";
      editBtn.textContent = "Edit";
      editBtn.setAttribute("aria-label", "Edit task: " + task.label);
      editBtn.addEventListener("click", function () {
        // Replace label span with an input
        const editInput = document.createElement("input");
        editInput.type = "text";
        editInput.className = "todo-edit-input";
        editInput.value = task.label;
        editInput.setAttribute("aria-label", "Edit task label");

        const saveBtn = document.createElement("button");
        saveBtn.className = "todo-edit-btn";
        saveBtn.textContent = "Save";

        li.replaceChild(editInput, labelSpan);
        li.replaceChild(saveBtn, editBtn);
        editInput.focus();

        function commitEdit() {
          const newLabel = editInput.value.trim();
          if (!newLabel) {
            editInput.setAttribute("aria-invalid", "true");
            editInput.style.borderColor = "var(--color-danger)";
            return;
          }
          const updated = editTodo(task.id, newLabel, storageGet(StorageKey.TODOS, []));
          saveTodos(updated);
          renderTodos(updated);
        }

        saveBtn.addEventListener("click", commitEdit);
        editInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") commitEdit();
          if (e.key === "Escape") renderTodos(storageGet(StorageKey.TODOS, []));
        });
      });

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "todo-delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("aria-label", "Delete task: " + task.label);
      deleteBtn.addEventListener("click", function () {
        const updated = deleteTodo(task.id, storageGet(StorageKey.TODOS, []));
        saveTodos(updated);
        renderTodos(updated);
      });

      li.appendChild(checkbox);
      li.appendChild(labelSpan);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  /** Initialise the todo widget. */
  function initTodos() {
    const tasks = storageGet(StorageKey.TODOS, []);
    renderTodos(tasks);

    const todoInput = document.getElementById("todo-input");
    const todoAdd   = document.getElementById("todo-add");
    const todoError = document.getElementById("todo-error");

    function addTask() {
      const label = todoInput ? todoInput.value.trim() : "";

      if (todoError) {
        todoError.hidden = true;
        todoError.textContent = "";
      }

      if (!label) {
        if (todoError) {
          todoError.textContent = "Task label cannot be empty.";
          todoError.hidden = false;
        }
        return;
      }

      const updated = addTodo(label, storageGet(StorageKey.TODOS, []));
      saveTodos(updated);
      renderTodos(updated);

      if (todoInput) todoInput.value = "";
    }

    if (todoAdd) {
      todoAdd.addEventListener("click", addTask);
    }

    if (todoInput) {
      todoInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") addTask();
      });
    }
  }

  // ============================================================
  // --- Quick Links widget ---
  // ============================================================

  /**
   * Return a new array with a new Link appended.
   * @param {string} label
   * @param {string} url
   * @param {Array} links
   * @returns {Array}
   */
  function addLink(label, url, links) {
    return links.concat([{
      id:    crypto.randomUUID(),
      label: label,
      url:   url,
    }]);
  }

  /**
   * Return a new array with the matching link removed.
   * @param {string} id
   * @param {Array} links
   * @returns {Array}
   */
  function deleteLink(id, links) {
    return links.filter(function (l) { return l.id !== id; });
  }

  /** Persist the current links list to storage. */
  function saveLinks(links) {
    storageSet(StorageKey.LINKS, links);
  }

  /**
   * Full re-render of the links panel DOM.
   * @param {Array} links
   */
  function renderLinks(links) {
    const panel = document.getElementById("links-list");
    if (!panel) return;

    panel.innerHTML = "";

    links.forEach(function (link) {
      const item = document.createElement("div");
      item.className = "link-item";

      // Link button (opens in new tab)
      const btn = document.createElement("button");
      btn.className = "link-btn";
      btn.textContent = link.label;
      btn.setAttribute("aria-label", "Open " + link.label);
      btn.addEventListener("click", function () {
        window.open(link.url, "_blank", "noopener,noreferrer");
      });

      // Delete (×) badge
      const delBtn = document.createElement("button");
      delBtn.className = "link-delete";
      delBtn.textContent = "×";
      delBtn.setAttribute("aria-label", "Remove link: " + link.label);
      delBtn.addEventListener("click", function () {
        const updated = deleteLink(link.id, storageGet(StorageKey.LINKS, []));
        saveLinks(updated);
        renderLinks(updated);
      });

      item.appendChild(btn);
      item.appendChild(delBtn);
      panel.appendChild(item);
    });
  }

  /** Initialise the quick links widget. */
  function initLinks() {
    const links = storageGet(StorageKey.LINKS, []);
    renderLinks(links);

    const labelInput = document.getElementById("link-label-input");
    const urlInput   = document.getElementById("link-url-input");
    const addBtn     = document.getElementById("link-add");
    const linksError = document.getElementById("links-error");

    if (addBtn) {
      addBtn.addEventListener("click", function () {
        const label = labelInput ? labelInput.value.trim() : "";
        const url   = urlInput   ? urlInput.value.trim()   : "";

        if (linksError) {
          linksError.hidden = true;
          linksError.textContent = "";
        }

        if (!label || !url) {
          if (linksError) {
            linksError.textContent = "Both a label and a URL are required.";
            linksError.hidden = false;
          }
          return;
        }

        const updated = addLink(label, url, storageGet(StorageKey.LINKS, []));
        saveLinks(updated);
        renderLinks(updated);

        if (labelInput) labelInput.value = "";
        if (urlInput)   urlInput.value   = "";
      });
    }
  }

  // ============================================================
  // --- Bootstrap / init ---
  // ============================================================

  function init() {
    // Theme must be applied first to prevent flash of wrong theme (Req 7.4)
    initTheme();
    _initThemeToggleButton();

    initGreeting();
    initTimer();
    initTodos();
    initLinks();
  }

  document.addEventListener("DOMContentLoaded", init);

})();
