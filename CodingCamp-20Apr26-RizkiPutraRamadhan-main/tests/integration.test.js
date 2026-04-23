/**
 * Integration smoke tests for the Personal Dashboard.
 *
 * Task 10.2 — Integration smoke tests
 * Validates: Requirements 2.4, 4.4, 5.10, 6.6, 7.4
 *
 * These tests simulate the browser environment using a minimal DOM/localStorage
 * stub so that init() can be exercised in Node.js without a real browser.
 *
 * Run with: node --test tests/integration.test.js
 */

import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ============================================================
// Minimal browser environment stubs
// ============================================================

/**
 * A simple in-memory localStorage implementation.
 */
class MockLocalStorage {
  constructor() {
    this._store = new Map();
  }
  getItem(key) {
    return this._store.has(key) ? this._store.get(key) : null;
  }
  setItem(key, value) {
    this._store.set(key, String(value));
  }
  removeItem(key) {
    this._store.delete(key);
  }
  clear() {
    this._store.clear();
  }
  get length() {
    return this._store.size;
  }
  key(index) {
    return [...this._store.keys()][index] ?? null;
  }
}

/**
 * A minimal DOM element stub that supports the operations used by app.js.
 */
class MockElement {
  constructor(id) {
    this.id = id;
    this.textContent = "";
    this.value = "";
    this.hidden = false;
    this._attrs = new Map();
    this._listeners = new Map();
    this.classList = {
      _classes: new Set(),
      add: (cls) => this.classList._classes.add(cls),
      remove: (cls) => this.classList._classes.delete(cls),
      contains: (cls) => this.classList._classes.has(cls),
    };
    this.children = [];
    this.innerHTML = "";
  }
  getAttribute(name) {
    return this._attrs.get(name) ?? null;
  }
  setAttribute(name, value) {
    this._attrs.set(name, value);
  }
  addEventListener(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(handler);
  }
  removeEventListener(event, handler) {
    if (this._listeners.has(event)) {
      const handlers = this._listeners.get(event).filter(h => h !== handler);
      this._listeners.set(event, handlers);
    }
  }
  dispatchEvent(event) {
    const handlers = this._listeners.get(event.type) ?? [];
    handlers.forEach(h => h(event));
  }
}

/**
 * A minimal document stub.
 */
class MockDocument {
  constructor() {
    this._elements = new Map();
    this._listeners = new Map();
    this.title = "Personal Dashboard";
    // Pre-create the elements that app.js looks up
    const ids = [
      "theme-toggle",
      "greeting-phrase", "greeting-time", "greeting-date",
      "name-input", "name-save", "name-error",
      "timer-display", "timer-start-stop", "timer-reset",
      "duration-input", "duration-save", "duration-error",
      "timer-widget",
      "todo-list", "todo-input", "todo-add", "todo-error",
      "links-list", "link-label-input", "link-url-input", "link-add", "link-error",
    ];
    for (const id of ids) {
      this._elements.set(id, new MockElement(id));
    }
    // documentElement (html element)
    this.documentElement = new MockElement("html");
  }
  getElementById(id) {
    if (!this._elements.has(id)) {
      this._elements.set(id, new MockElement(id));
    }
    return this._elements.get(id);
  }
  createElement(tag) {
    return new MockElement(tag);
  }
  addEventListener(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(handler);
  }
  // Helper to fire DOMContentLoaded
  fireDOMContentLoaded() {
    const handlers = this._listeners.get("DOMContentLoaded") ?? [];
    handlers.forEach(h => h());
  }
}

/**
 * A minimal window stub.
 */
class MockWindow {
  constructor() {
    this.matchMedia = (_query) => ({ matches: false });
    this.AudioContext = null;
    this.webkitAudioContext = null;
    this.open = () => {};
    this.crypto = {
      randomUUID: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
  }
}

// ============================================================
// Inject stubs into global scope so app.js can use them
// ============================================================

function createEnvironment() {
  const mockStorage = new MockLocalStorage();
  const mockDocument = new MockDocument();
  const mockWindow = new MockWindow();

  global.localStorage = mockStorage;
  global.document = mockDocument;
  global.window = mockWindow;
  global.setInterval = (_fn, _ms) => 42; // return a fake interval id
  global.clearInterval = (_id) => {};
  global.crypto = mockWindow.crypto;

  return { mockStorage, mockDocument, mockWindow };
}

/**
 * Dynamically load app.js as a module by reading it and evaluating it
 * in the current global context (which has our stubs injected).
 *
 * Because app.js is an IIFE that calls document.addEventListener("DOMContentLoaded", init),
 * we need to:
 *   1. Inject the stubs into global scope
 *   2. Evaluate the IIFE (which registers the DOMContentLoaded listener)
 *   3. Fire DOMContentLoaded to trigger init()
 */
async function loadAndRunApp(mockDocument) {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const appPath = join(__dirname, "..", "js", "app.js");
  const appCode = await readFile(appPath, "utf8");

  // Evaluate the IIFE — this registers the DOMContentLoaded listener
  // We use Function constructor to run in the current global scope
  const fn = new Function(appCode);
  fn();

  // Now fire DOMContentLoaded to trigger init()
  mockDocument.fireDOMContentLoaded();
}

// ============================================================
// Tests
// ============================================================

describe("Integration smoke tests (Task 10.2)", () => {

  describe("init() with empty localStorage (all defaults)", () => {
    it("init() runs without throwing when localStorage is empty", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      // localStorage is empty — all defaults should apply

      await assert.doesNotReject(
        async () => {
          await loadAndRunApp(mockDocument);
        },
        "init() should not throw when localStorage is empty"
      );
    });

    it("applies default theme (light or OS preference) when no theme is saved", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      await loadAndRunApp(mockDocument);

      const theme = mockDocument.documentElement.getAttribute("data-theme");
      assert.ok(
        theme === "light" || theme === "dark",
        `Expected data-theme to be "light" or "dark", got "${theme}"`
      );
    });

    it("timer display shows default 25:00 when no duration is saved", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      await loadAndRunApp(mockDocument);

      const timerDisplay = mockDocument.getElementById("timer-display");
      assert.equal(timerDisplay.textContent, "25:00",
        `Expected timer display "25:00", got "${timerDisplay.textContent}"`);
    });

    it("duration input is pre-filled with 25 when no duration is saved", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      await loadAndRunApp(mockDocument);

      const durationInput = mockDocument.getElementById("duration-input");
      assert.equal(String(durationInput.value), "25",
        `Expected duration input "25", got "${durationInput.value}"`);
    });
  });

  describe("init() restores persisted state (Req 2.4, 4.4, 7.4)", () => {
    it("restores saved theme from localStorage (Req 7.4)", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      // Pre-populate localStorage with a saved dark theme
      mockStorage.setItem("pd_theme", JSON.stringify("dark"));

      await loadAndRunApp(mockDocument);

      const theme = mockDocument.documentElement.getAttribute("data-theme");
      assert.equal(theme, "dark",
        `Expected restored theme "dark", got "${theme}"`);
    });

    it("restores saved light theme from localStorage (Req 7.4)", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      mockStorage.setItem("pd_theme", JSON.stringify("light"));

      await loadAndRunApp(mockDocument);

      const theme = mockDocument.documentElement.getAttribute("data-theme");
      assert.equal(theme, "light",
        `Expected restored theme "light", got "${theme}"`);
    });

    it("restores saved Pomodoro duration from localStorage (Req 4.4)", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      mockStorage.setItem("pd_pomodoro_mins", JSON.stringify(45));

      await loadAndRunApp(mockDocument);

      const timerDisplay = mockDocument.getElementById("timer-display");
      assert.equal(timerDisplay.textContent, "45:00",
        `Expected timer display "45:00" for saved 45 min, got "${timerDisplay.textContent}"`);
    });

    it("restores saved user name into the name input (Req 2.4)", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      mockStorage.setItem("pd_name", JSON.stringify("Alice"));

      await loadAndRunApp(mockDocument);

      const nameInput = mockDocument.getElementById("name-input");
      assert.equal(nameInput.value, "Alice",
        `Expected name input "Alice", got "${nameInput.value}"`);
    });

    it("greeting phrase element is populated on load (Req 2.4)", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      mockStorage.setItem("pd_name", JSON.stringify("Bob"));

      await loadAndRunApp(mockDocument);

      const phraseEl = mockDocument.getElementById("greeting-phrase");
      assert.ok(
        phraseEl.textContent.includes("Bob"),
        `Expected greeting phrase to include "Bob", got "${phraseEl.textContent}"`
      );
    });

    it("greeting phrase element is populated without name when none saved (Req 2.4)", async () => {
      const { mockStorage, mockDocument } = createEnvironment();
      // No name saved

      await loadAndRunApp(mockDocument);

      const phraseEl = mockDocument.getElementById("greeting-phrase");
      const validPhrases = ["Good Morning", "Good Afternoon", "Good Evening", "Good Night"];
      assert.ok(
        validPhrases.some(p => phraseEl.textContent.startsWith(p)),
        `Expected greeting phrase to start with a valid phrase, got "${phraseEl.textContent}"`
      );
    });
  });
});
