/* Disclose ChatGPT usage per course policy */

(function () {
  "use strict";

  function formatTime(iso, locale = "en-CA") {
    try {
      return new Date(iso).toLocaleString(locale);
    } catch {
      return iso;
    }
  }

  function NotesStore(storageKey) {
    this.storageKey = storageKey;
  }
  NotesStore.prototype.read = function () {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return { version: 0, updatedAt: null, notes: [] };
    try {
      const parsed = JSON.parse(raw);
      parsed.version ??= 0;
      parsed.updatedAt ??= null;
      parsed.notes ??= [];
      return parsed;
    } catch {
      return { version: 0, updatedAt: null, notes: [] };
    }
  };

  function ReaderApp(opts) {
    this.STR = opts.STR;
    this.store = new NotesStore(opts.storageKey);
    this.locale = opts.locale;

    // DOM
    this.lastRetrievedLabel = document.getElementById("last_retrieved_time"); // present in reader.html
    this.container = document.getElementById("note_list");
    this.list = this.container.querySelector(".note-list");

    // State snapshot
    this.currentVersion = -1;

    // Bindings
    this.handleExternalStorage = this.handleExternalStorage.bind(this);

    this.init();
  }

  ReaderApp.prototype.init = function () {
    // Clear any placeholder HTML
    this.list.innerHTML = "";
    // Initial render
    this.refreshIfChanged();

    // Listen for cross-tab updates
    window.addEventListener("storage", this.handleExternalStorage);
  };

  ReaderApp.prototype.handleExternalStorage = function (evt) {
    // Only care about our key
    const key = this.STR.CONFIG.storageKey;
    if (evt.key !== key) return;
    this.refreshIfChanged();
  };

  ReaderApp.prototype.refreshIfChanged = function () {
    const state = this.store.read();
    if (state.version !== this.currentVersion) {
      this.currentVersion = state.version;
      this.render(state.notes);
      this.updateRetrievedLabel(state.updatedAt || new Date().toISOString());
    }
  };

  ReaderApp.prototype.render = function (notes) {
    this.list.innerHTML = "";

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

    for (const note of notes) {
      const item = document.createElement("div");
      item.className = "note-item";
      const p = document.createElement("p");
      p.className = "note-text";
      p.textContent = note.text || "";
      item.appendChild(p);
      this.list.appendChild(item);
    }
  };

  ReaderApp.prototype.updateRetrievedLabel = function (iso) {
    if (!this.lastRetrievedLabel) return;
    const prefix = this.STR.uiStrings.lastRetrievedPrefix;
    this.lastRetrievedLabel.textContent = `${prefix} ${formatTime(
      iso,
      this.locale
    )}`;
  };

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    const STR = window.LAB_STRINGS;
    if (!STR) return;
    new ReaderApp({
      STR,
      storageKey: STR.CONFIG.storageKey,
      locale: STR.CONFIG.timeFormat,
    });
  });
})();
