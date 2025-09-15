/* AI-Assist Disclosure — Sep 14, 2025
   Tools: ChatGPT (GPT-5 Thinking); GitHub Copilot
   Scope: Assistance in organization and removal of redundant code.
   Details: Streamlined note rendering and event handling logic, removing excess code and refining structure for clarity.
    Note: Original code contained redundant functions and overly complex structures; these have been simplified while maintaining original functionality.
    Additionally, provided detailed comments for clarity.

*/

(function () {
  "use strict";

  // ===== Utilities =====

  /***
   * Returns current time as ISO string.
   * Used for timestamps in notes and state.
   * Returns ISO string like "2024-06-15T12:34:56.789Z"
   */
  function nowIso() {
    return new Date().toISOString();
  }

  /***
   * Formats an ISO timestamp string into a human-readable format.
   * If parsing fails, returns the original string.
   * Uses the specified locale (default "en-CA").
   */
  function formatTime(iso, locale = "en-CA") {
    try {
      return new Date(iso).toLocaleString(locale);
    } catch {
      return iso;
    }
  }

  /***
   * Returns a debounced version of the given function.
   * The debounced function delays invoking `fn` until after `wait` milliseconds
   * have elapsed since the last time the debounced function was invoked.
   */
  function debounce(fn, wait) {
    let timeout; // Timer ID
    return function (...args) {
      clearTimeout(timeout); // Cancel previous timer if any
      timeout = setTimeout(() => fn.apply(this, args), wait); // Set new timer
    };
  }

  // ===== Storage Layer (OOP style) =====
  /***
   * NotesStore: abstraction over localStorage for notes.
   * Handles reading and writing the entire state object.
   * State shape: {version, updatedAt, notes: []}
   * Each note: {id, text, updatedAt}
   * Uses a single localStorage key as specified.
   * Handles JSON parsing/stringifying and defaults.
   * Does NOT do any in-memory caching; always reads/writes to localStorage.
   * Does NOT handle concurrency or merging; last write wins.
   */
  class NotesStore {
    constructor(storageKey) {
      this.storageKey = storageKey; // Need this due to JS lack of private fields
    }
    read() {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { version: 0, updatedAt: null, notes: [] };
      try {
        const parsed = JSON.parse(raw);
        // Defensive defaults
        parsed.version ??= 0; // Version number; Can be any integer
        parsed.updatedAt ??= null; // Last updated timestamp; ISO string or null
        parsed.notes ??= []; // Notes array; each note: {id, text, updatedAt}
        return parsed;
      } catch {
        return { version: 0, updatedAt: null, notes: [] };
      }
    }
    /***
     * Writes the entire state object to localStorage.
     * Overwrites any existing data.
     * Expects state shape: {version, updatedAt, notes: []}
     * Does not validate the shape; assumes caller provides correct data.
     */
    write(state) {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    }
  }

  // Domain object (constructor pattern)
  /***
   * Note object representing a single note.
   * Each note has a unique id, text content, and updatedAt timestamp.
   * The updatedAt is set to current time if not provided.
   */
  class Note {
    constructor(id, text, updatedAt) {
      this.id = id;
      this.text = text;
      this.updatedAt = updatedAt || nowIso();
    }
  }

  // ===== Writer App =====
  class WriterApp {
    constructor(opts) {
      this.STR = opts.STR;
      this.store = new NotesStore(opts.storageKey);
      this.locale = opts.locale;

      // DOM
      this.lastSavedLabel = document.getElementById("last_sent_time"); // present in writer.html
      this.container = document.getElementById("note_list"); // outer container
      this.list = this.container.querySelector(".note-list"); // inner list
      this.addBtn = document.getElementById("add_note"); // add button

      // State
      this.state = this.store.read(); // {version, updatedAt, notes: []}
      this.noteInputs = new Map(); // id -> textarea element

      // Bindings
      this.handleAdd = this.handleAdd.bind(this);
      this.handleRemove = this.handleRemove.bind(this);
      this.handleInput = this.handleInput.bind(this);
      this.persistDebounced = debounce(
        this.persist.bind(this),
        this.STR.CONFIG.debounceMs
      );

      this.init();
    }
    init() {
      // Ensure UI strings are applied (no hardcoded HTML words)
      if (this.addBtn) this.addBtn.textContent = this.STR.uiStrings.addNote;

      // Clear any placeholder items that may exist in HTML
      if (this.list) this.list.innerHTML = "";

      // Render existing notes
      for (const n of this.state.notes) {
        this.renderNote(n);
      }
      this.updateSavedLabel(this.state.updatedAt);

      // Wire add button
      if (this.addBtn) this.addBtn.addEventListener("click", this.handleAdd);
    }
    renderNote(note) {
      const item = document.createElement("div");
      item.className = "note-item";
      item.dataset.id = String(note.id);

      const textarea = document.createElement("textarea");
      textarea.className = "note-text";
      textarea.placeholder = this.STR.uiStrings.placeholder;
      textarea.value = note.text || "";
      textarea.addEventListener("input", this.handleInput);

      const removeBtn = document.createElement("button");
      removeBtn.className = "delete-button";
      removeBtn.textContent = this.STR.uiStrings.remove;
      removeBtn.addEventListener("click", this.handleRemove);

      item.appendChild(textarea);
      item.appendChild(removeBtn);
      this.list.appendChild(item);

      this.noteInputs.set(note.id, textarea);
    }
    persist() {
      this.store.write(this.state);
      this.updateSavedLabel(this.state.updatedAt);
      // (Optional) you could toast or aria-live announce saving here
    }
    updateSavedLabel(iso) {
      if (!this.lastSavedLabel) return;
      if (!iso) {
        this.lastSavedLabel.textContent = "";
        return;
      }
      const prefix = this.STR.uiStrings.lastSavedPrefix;
      this.lastSavedLabel.textContent = `${prefix} ${formatTime(
        iso,
        this.locale
      )}`;
    }
  }

  WriterApp.prototype.handleAdd = function () {
    const id = crypto.randomUUID();
    const newNote = new Note(id, "");
    this.state.notes.push(newNote);
    this.state.version += 1;
    this.state.updatedAt = nowIso();
    this.renderNote(newNote);
    this.persist(); // immediate persist on structure changes
  };

  WriterApp.prototype.handleRemove = function (evt) {
    const item = evt.currentTarget.closest(".note-item");
    if (!item) return;
    const id = item.dataset.id;
    // Remove from state
    this.state.notes = this.state.notes.filter(
      (n) => String(n.id) !== String(id)
    );
    this.state.version += 1;
    this.state.updatedAt = nowIso();
    // Remove from DOM
    this.noteInputs.delete(id);
    item.remove();
    // Persist instantly per spec
    this.persist();
  };

  WriterApp.prototype.handleInput = function (evt) {
    const item = evt.currentTarget.closest(".note-item");
    if (!item) return;
    const id = item.dataset.id;
    const note = this.state.notes.find((n) => String(n.id) === String(id));
    if (!note) return;
    note.text = evt.currentTarget.value;
    note.updatedAt = nowIso();
    // Do not save on every keystroke: debounce
    this.state.version += 1;
    this.state.updatedAt = note.updatedAt;
    this.persistDebounced();
  };

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    const STR = window.LAB_STRINGS;
    if (!STR) return;
    new WriterApp({
      STR,
      storageKey: STR.CONFIG.storageKey,
      locale: STR.CONFIG.timeFormat,
    });
  });
})();
