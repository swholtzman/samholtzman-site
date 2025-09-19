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

  /**
   * Get the current time as an ISO 8601 string.
   * Used for both global state and per-note timestamps.
   *
   * @returns {string} ISO timestamp, e.g., "2025-09-14T20:15:00.000Z".
   */
  function nowIso() {
    return new Date().toISOString();
  }

  /**
   * Safely format an ISO date-time string for display.
   * Falls back to returning the raw input if parsing/formatting fails.
   *
   * @param {string} iso            - An ISO 8601 date-time string.
   * @param {string} [locale=en-CA] - BCP 47 locale string for formatting (e.g., "en-CA", "fr-FR").
   * @returns {string} Human-friendly locale-formatted date/time, or the raw string on error.
   */
  function formatTime(iso, locale = "en-CA") {
    try {
      return new Date(iso).toLocaleString(locale);
    } catch {
      return iso;
    }
  }

  /**
   * Return a debounced version of a function.
   * The debounced function delays invoking `fn` until after `wait` milliseconds
   * have elapsed since the last call.
   *
   * @template {(...args:any[])=>any} F
   * @param {F} fn
   * @param {number} wait
   * @returns {F} Debounced function with the same call signature.
   */
  function debounce(fn, wait) {
    let timeout; // Timer ID
    return function (...args) {
      clearTimeout(timeout); // Cancel previous timer if any
      timeout = setTimeout(() => fn.apply(this, args), wait); // Set new timer
    };
  }

  // ===== Storage Layer =====
  /**
   * NotesStore
   * ----------
   * Minimal abstraction over localStorage that handles reading/writing the entire
   * notes state under a single key. Parsing/stringifying and default normalization
   * happen here. No in-memory caching; last-write-wins.
   */
  class NotesStore {
    /**
     * @param {string} storageKey - The localStorage key holding the serialized NotesState JSON.
     */
    constructor(storageKey) {
      this.storageKey = storageKey; // Need this due to JS lack of private fields
    }

    /**
     * Load and parse the notes state from localStorage.
     * Ensures all expected top-level fields exist (with sensible defaults).
     *
     * @returns {NotesState} A normalized state object.
     */
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

    /**
     * Serialize and write the entire state to localStorage.
     * Overwrites any existing data.
     *
     * @param {NotesState} state
     */
    write(state) {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    }
  }

  /**
   * Domain object representing a single note.
   * The constructor sets `updatedAt` to "now" if not provided.
   */
  class Note {
    /**
     * @param {string} id
     * @param {string} text
     * @param {string} [updatedAt]
     */
    constructor(id, text, updatedAt) {
      /** @type {string} */
      this.id = id;
      /** @type {string} */
      this.text = text;
      /** @type {string} */
      this.updatedAt = updatedAt || nowIso();
    }
  }

  // ===== Writer App =====

  /**
   * Interactive writer/editor for notes backed by localStorage.
   * Responsibilities:
   *   - Render existing notes with editable textareas and per-item delete buttons.
   *   - Add new notes via an "Add" button.
   *   - Persist changes: immediately for structure, debounced for keystrokes.
   *   - Maintain state invariants: bump `version` and refresh `updatedAt` on change.
   */
  class WriterApp {
    /**
     * @param {Object} opts
     * @param {LabStrings} opts.STR     - String resources and config for the app.
     * @param {string} opts.storageKey  - localStorage key (mirrors STR.CONFIG.storageKey; passed explicitly for clarity).
     * @param {string} opts.locale      - BCP 47 locale for timestamps (e.g., "en-CA").
     */
    constructor(opts) {
      this.STR = opts.STR;
      this.store = new NotesStore(opts.storageKey);
      this.locale = opts.locale;

      // ===== DOM lookups =====
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

      // Debounced persistence for keystrokes; immediate persist for structural changes.
      this.persistDebounced = debounce(
        this.persist.bind(this),
        this.STR.CONFIG.debounceMs
      );

      this.init();
    }

    /**
     * One-time setup:
     * - Apply UI strings to controls (no hardcoded labels in HTML).
     * - Clear placeholder markup.
     * - Render existing notes from storage.
     * - Wire up event handlers (add button).
     */
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

    /**
     * Create DOM for a single note row: <textarea> + "remove" button.
     * Also tracks the textarea element for quick lookup on input.
     *
     * @param {Note} note
     */
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

    /**
     * Persist current in-memory state to localStorage and update the "last saved" label.
     * Structural changes call this directly; text edits call `persistDebounced`.
     */
    persist() {
      this.store.write(this.state);
      this.updateSavedLabel(this.state.updatedAt);
      // (Optional) you could toast or aria-live announce saving here
    }

    /**
     * Update the "last saved" label with a formatted timestamp.
     * If the label isn’t present in the DOM, this is a no-op.
     *
     * @param {string|null} iso - ISO timestamp string (or null before first save).
     */
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

    /**
 * Add a new empty note:
 * - Generate UUID
 * - Push into state
 * - Bump version and update timestamps
 * - Render and persist immediately (structural change)
 *
 * @this {WriterApp}
 */
    handleAdd = function () {
      const id = crypto.randomUUID();
      const newNote = new Note(id, "");
      this.state.notes.push(newNote);
      this.state.version += 1;
      this.state.updatedAt = nowIso();
      this.renderNote(newNote);
      this.persist(); // immediate persist on structure changes
    };

    /**
     * Remove a note:
     * - Identify owning .note-item from the clicked delete button
     * - Remove from state and DOM
     * - Bump version, update timestamps, persist immediately
     *
     * @this {WriterApp}
     * @param {MouseEvent} evt
     */
    handleRemove = function (evt) {
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

    /**
     * Handle text input in a note:
     * - Find note by item dataset id
     * - Update text and note.updatedAt
     * - Bump state.version, set state.updatedAt
     * - Persist via debounce (avoid excessive writes on keystrokes)
     *
     * @this {WriterApp}
     * @param {InputEvent} evt
     */
    handleInput = function (evt) {
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

      // Do not save on every keystroke: debounce
      this.persistDebounced();
    };
  }

  // ===== Bootstrapping =====
  // Wait for DOM to be ready, then initialize the writer with strings/config.
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
