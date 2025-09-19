/* AI-Assist Disclosure — Sep 14, 2025
   Tools: ChatGPT (GPT-5 Thinking); GitHub Copilot
   Scope: Assistance in organization and removal of redundant code.
   Details: Streamlined note rendering and event handling logic, removing excess code and refining structure for clarity.
    Note: Original code contained redundant functions and overly complex structures; these have been simplified while maintaining original functionality.
    Additionally, provided detailed comments for clarity.

*/

(function () {
  "use strict";

  /**
   * Safely format an ISO date-time string for display.
   * Falls back to returning the raw input if parsing/formatting fails.
   *
   * @param {string} iso            - An ISO 8601 date-time string (e.g., "2025-09-14T20:15:00.000Z").
   * @param {string} [locale=en-CA] - BCP 47 locale string for formatting (e.g., "en-CA", "fr-FR").
   * @returns {string} Human-friendly locale-formatted date/time, or the raw string on error.
   */
  function formatTime(iso, locale = "en-CA") {
    try {
      return new Date(iso).toLocaleString(locale);
    } catch {
      // If `iso` is not a valid date string, just show what we got.
      return iso;
    }
  }



  /**
   * Thin wrapper around localStorage for retrieving the notes payload.
   * - Read-only in this module (writer code is expected to handle writes).
   * - Tolerant of missing keys and malformed JSON.
   */
  class NotesStore {
    /**
     * @param {string} storageKey - The localStorage key holding the serialized NotesState JSON.
     */
    constructor(storageKey) {
      /** @private */
      this.storageKey = storageKey;
    }

    /**
     * Load and parse the notes state from localStorage.
     * Ensures all expected top-level fields exist (with sensible defaults).
     *
     * @returns {NotesState} A normalized state object.
     */
    read() {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        // No data yet: return an empty, well-typed default.
        return { version: 0, updatedAt: null, notes: [] };
      }

      try {
        /** @type {Partial<NotesState>} */
        const parsed = JSON.parse(raw);

        // Defensive normalization to guarantee shape
        parsed.version ??= 0;
        parsed.updatedAt ??= null;
        parsed.notes ??= [];

        return /** @type {NotesState} */ (parsed);
      } catch {
        // Malformed JSON: fail closed to an empty model
        return { version: 0, updatedAt: null, notes: [] };
      }
    }
  }

  /**
   * Read-only notes UI:
   * - Renders notes into #note_list .note-list
   * - Shows last retrieval time in #last_retrieved_time
   * - Reacts to cross-tab 'storage' events for the configured key
   */
  class ReaderApp {
    /**
     * @param {Object} opts
     * @param {LabStrings} opts.STR   - String resources and config for the app.
     * @param {string} opts.storageKey- localStorage key (mirrors STR.CONFIG.storageKey; passed for clarity).
     * @param {string} opts.locale    - BCP 47 locale for timestamps (e.g., "en-CA").
     */
    constructor(opts) {
      // Object that bundles UI text and config; originates from user.js
      this.STR = opts.STR;

      // key like "LAB_NOTES_V1"
      // Instance of NotesStore, a tiny wrapper that reads from localStorage under a specific key
      this.store = new NotesStore(opts.storageKey);

      // BCP-47 locale string (e.g., "en-CA", "fr-FR") used only for date/time formatting
      this.locale = opts.locale;

      // ===== DOM lookups =====
      // Timestamp label; optional in DOM (methods no-op if missing)
      this.lastRetrievedLabel = document.getElementById("last_retrieved_time"); // present in reader.html

      // Container holding the list
      this.container = document.getElementById("note_list");

      // The actual list element we populate (required for rendering)
      this.list = this.container.querySelector(".note-list");

      // ===== State snapshot =====
      // Used to avoid redundant re-renders if the version hasn't changed
      this.currentVersion = -1;

      // ===== Method bindings for event listeners =====
      this.handleExternalStorage = this.handleExternalStorage.bind(this);

      this.init();
    }

    /**
     * One-time setup:
     * - Clears placeholder markup
     * - Renders initial state
     * - Subscribes to cross-tab storage events
     */
    init() {
      if (!this.list) return; // If the DOM contract isn't met, bail safely.

      // Clear any server/placeholder HTML to ensure a clean slate
      this.list.innerHTML = "";

      // Initial render (only if state differs from sentinel)
      this.refreshIfChanged();

      // Listen for updates made in other tabs/windows of the same origin
      window.addEventListener("storage", this.handleExternalStorage);
    }

    /**
    * Read from storage and re-render ONLY if the version has changed.
    * This reduces unnecessary DOM work and keeps UI responsive.
    */
    refreshIfChanged() {
      const state = this.store.read();

      if (state.version !== this.currentVersion) {
        this.currentVersion = state.version;
        this.render(state.notes);

        // Change the retrieved label to match the time it was updated at
        // Return a new date if there was no previous timestamp
        this.updateRetrievedLabel(state.updatedAt || new Date().toISOString());
      }
    }

    /**
     * Render the list of notes. Minimal DOM creation; clears container and repopulates.
     *
     * @param {Note[]} notes - Notes to render in order.
     */
    render(notes) {
      if (!this.list) return;

      // Remove any prior content before re-populating
      this.list.innerHTML = "";

      // Empty state UI
      if (!notes || notes.length === 0) {
        const item = document.createElement("div");
        item.className = "note-item";
        const p = document.createElement("p");
        p.className = "note-text";
        p.textContent = this.STR.uiStrings.emptyList;
        item.appendChild(p);
        this.list.appendChild(item);
        return;
      }

      // Simple, order-preserving render of each note as a block
      for (const note of notes) {
        const item = document.createElement("div");
        item.className = "note-item";
        const p = document.createElement("p");
        p.className = "note-text";
        p.textContent = note.text || ""; // defensive against missing `text`
        item.appendChild(p);
        this.list.appendChild(item);
      }
    }

    /**
    * Update the "last retrieved" label with a formatted timestamp.
    * If the label isn’t present in the DOM, this is a no-op.
    *
    * @param {string} iso - ISO timestamp string (e.g., from state.updatedAt).
    */
    updateRetrievedLabel(iso) {
      if (!this.lastRetrievedLabel) return;
      const prefix = this.STR.uiStrings.lastRetrievedPrefix;
      this.lastRetrievedLabel.textContent = `${prefix} ${formatTime(
        iso,
        this.locale
      )}`;
    }
  }


  /**
   * Handle cross-tab `storage` events.
   * We only care about events for our storage key. If they match, we check whether
   * the version changed and re-render if needed.
   *
   * Notes:
   * - This event does NOT fire in the same tab that called localStorage.setItem().
   * - It *does* fire in other tabs/windows from the same origin.
   *
   * @this {ReaderApp}
   * @param {StorageEvent} evt - The storage event payload.
   */
  ReaderApp.prototype.handleExternalStorage = function (evt) {
    // Only react to our configured key to avoid unrelated storage noise
    const key = this.STR.CONFIG.storageKey;
    if (evt.key !== key) return;
    this.refreshIfChanged();
  };

  // ===== Bootstrapping =====
  // Wait for DOM to be ready, then initialize the reader app with strings/config.
  document.addEventListener("DOMContentLoaded", () => {
    const STR = window.LAB_STRINGS;
    if (!STR) return; // Nothing to do without strings/config.

    new ReaderApp({
      STR,
      storageKey: STR.CONFIG.storageKey, // explicit for clarity, mirrors STR.CONFIG
      locale: STR.CONFIG.timeFormat, // e.g., "en-CA"; passed to Date#toLocaleString
    });
  });
})();
