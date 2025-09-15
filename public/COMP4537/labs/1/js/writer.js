/* Disclose ChatGPT usage per course policy */

(function () {
  "use strict";

  // ===== Utilities =====
  function nowIso() {
    return new Date().toISOString();
  }
  function formatTime(iso, locale = "en-CA") {
    try {
      return new Date(iso).toLocaleString(locale);
    } catch {
      return iso;
    }
  }

  // Simple debounce helper
  function debounce(fn, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ===== Storage Layer (OOP style) =====
  function NotesStore(storageKey) {
    this.storageKey = storageKey;
  }
  NotesStore.prototype.read = function () {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return { version: 0, updatedAt: null, notes: [] };
    try {
      const parsed = JSON.parse(raw);
      // Defensive defaults
      parsed.version ??= 0;
      parsed.updatedAt ??= null;
      parsed.notes ??= [];
      return parsed;
    } catch {
      return { version: 0, updatedAt: null, notes: [] };
    }
  };
  NotesStore.prototype.write = function (state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  };

  // Domain object (constructor pattern)
  function Note(id, text, updatedAt) {
    this.id = id;
    this.text = text;
    this.updatedAt = updatedAt || nowIso();
  }

  // ===== Writer App =====
  function WriterApp(opts) {
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

  WriterApp.prototype.init = function () {
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
  };

  WriterApp.prototype.renderNote = function (note) {
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
  };

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

  WriterApp.prototype.persist = function () {
    this.store.write(this.state);
    this.updateSavedLabel(this.state.updatedAt);
    // (Optional) you could toast or aria-live announce saving here
  };

  WriterApp.prototype.updateSavedLabel = function (iso) {
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
