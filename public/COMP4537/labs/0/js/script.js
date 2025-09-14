/*!
 * AI/Copilot Disclosure — Sep 6, 2025
 * Tools: GitHub Copilot (inline completions, minor syntax/wording), ChatGPT (code review to match course FAQ/assignment conventions).
 * Scope: Small edits and documentation only; no novel algorithms inserted.
 * Review: I wrote, tested, and take full responsibility for the code.
 */

/* ================== Main app code ================== */
/**
 * Initializes the memory game.
 * Sets up event listeners and game elements.
 */
document.addEventListener("DOMContentLoaded", () => {
  const STR = window.LAB_STRINGS;
  // Set title text from strings
  const titleEl =
    document.querySelector(".title") || document.querySelector("#title");
  if (titleEl) titleEl.textContent = STR.headerStrings.title;

  const form = document.getElementById("input-container");
  const input = document.getElementById("user-input");
  const btnContainer = document.getElementById("button-container");
  const gameSpace = document.getElementById("game-space");
  const movesEl = document.querySelector('[data-stat="moves"]');
  const timeEl = document.querySelector('[data-stat="time"]');
  const scoreEl = document.querySelector('[data-stat="score"]');

  // Lazy-create a status line inside game space
  let statusEl = document.getElementById("status-message");
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.id = "status-message";
    statusEl.style.marginTop = "0.5rem";
    statusEl.style.opacity = "0.85";
    const section = document.getElementById("game-space");
    if (section) section.appendChild(statusEl);
  }

  const game = new MemoryGame({
    buttonContainer: btnContainer,
    gameSpace: gameSpace,
    movesEl,
    timeEl,
    scoreEl,
    statusEl,
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();   // stop the default form submission (page reload/redirect)

    const n = Number(input.value);   // get the number typed into the input field

    // validate: must be an integer and within configured min/max bounds
    if (!Number.isInteger(n) || n < STR.CONFIG.MIN_N || n > STR.CONFIG.MAX_N) {
      game.flash(STR.uiStrings.invalidRange);  // show an error message (e.g., “Invalid range”)
      input.focus();                            // put the cursor back in the input box
      return;                                   // exit without continuing
    }

    // if valid, start the game with that number
    game.start(n);
  });
});

/* ================== Helpers ================== */
/**
 * Pauses execution for a specified duration.
 *
 * @param {*} ms - The duration to sleep in milliseconds.
 * @returns {Promise} - A promise that resolves after the specified duration.
 */
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Samples a subset of elements from an array without replacement.
 *
 * @param {Array} arr - The array to sample from.
 * @param {number} k - The number of elements to sample.
 * @returns {Array} - An array containing the sampled elements.
 */
const sampleWithoutReplacement = (arr, k) => {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone.slice(0, k);
};

/* ================== Classes ================== */
/**
 * GameButton class represents a button in the memory game.
 *
 * @class GameButton
 * @description Represents a button in the memory game.
 */
class GameButton {
  /** order is 1-based display order */
  constructor(order, color) {
    this.order = order;
    this.color = color;
    this.el = document.createElement("button");
    this.el.className = "game-button";
    this.el.textContent = String(order);
    this.el.style.backgroundColor = color;
    this._clickHandler = null;
    this.container = null;
  }

  mountRow(container) {
    this.container = container; // <— remember parent for row phase
    this.el.style.position = "static";
    container.appendChild(this.el);
  }

  setAbsolutePosition(left, top, arena) {
    const container = arena || this.container;
    if (!container) return;

    if (this.el.parentElement !== container) {
      container.appendChild(this.el);
    }
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    this.el.style.position = "absolute";
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  showNumber(show) {
    this.el.textContent = show ? String(this.order) : "";
  }

  enableClick(handler) {
    this.disableClick();
    this._clickHandler = handler;
    this.el.addEventListener("click", this._clickHandler, { passive: true });
    this.el.style.pointerEvents = "auto";
  }

  disableClick() {
    if (this._clickHandler) {
      this.el.removeEventListener("click", this._clickHandler);
      this._clickHandler = null;
    }
    this.el.style.pointerEvents = "none";
  }

  destroy() {
    this.disableClick();
    this.el.remove();
  }
}

/**
 * GameTimer class handles the game timer functionality.
 *
 * @class GameTimer
 * @description Handles the game timer functionality.
 */
class GameTimer {
  constructor(outEl) {
    this.outEl = outEl;
    this._interval = null;
    this._start = null;
  }
  start() {
    this.stop();
    this._start = Date.now();
    this._interval = setInterval(() => {
      const secs = Math.floor((Date.now() - this._start) / 1000);
      this.outEl.textContent = `${secs}s`;
    }, 250);
  }
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
  reset() {
    this.stop();
    this._start = null;
    if (this.outEl) this.outEl.textContent = "—";
  }
}

/**
 * Scoreboard class tracks and displays game statistics.
 *
 * @class Scoreboard
 * @description Tracks and displays game statistics.
 */
class Scoreboard {
  constructor({ movesEl, scoreEl }) {
    this.movesEl = movesEl;
    this.scoreEl = scoreEl;
    this.correct = 0;
    this.moves = 0;
    this.total = 0;
    this.render();
  }
  setTotal(n) {
    this.total = n;
    this.correct = 0;
    this.moves = 0;
    this.render();
  }
  recordClick(isCorrect) {
    this.moves += 1;
    if (isCorrect) this.correct += 1;
    this.render();
  }
  render() {
    if (this.movesEl) this.movesEl.textContent = String(this.moves || "—");
    if (this.scoreEl) {
      const pct = this.total
        ? Math.round((this.correct / this.total) * 100)
        : 0;
      this.scoreEl.textContent = this.total ? `${pct}%` : "—";
    }
  }
}

/**
 * MemoryGame class handles the game logic and UI interactions.
 *
 * @class MemoryGame
 * @description Handles the game logic and UI interactions.
 */
class MemoryGame {
  constructor({
    buttonContainer,
    gameSpace,
    movesEl,
    timeEl,
    scoreEl,
    statusEl,
  }) {
    this.STR = window.LAB_STRINGS;
    this.btnContainer = buttonContainer;
    this.gameSpace = gameSpace;
    this.statusEl = statusEl;
    this.timer = new GameTimer(timeEl);
    this.score = new Scoreboard({ movesEl, scoreEl });

    this.buttons = [];
    this.expectedOrder = [];
    this.currentIndex = 0;
    this.isShuffling = false;
  }

  flash(msg) {
    if (!this.statusEl) return;
    this.statusEl.textContent = msg;
  }

  clear() {
    // remove all buttons and reset
    for (const b of this.buttons) b.destroy();
    this.buttons = [];
    this.expectedOrder = [];
    this.currentIndex = 0;
    this.timer.reset();
    this.score.setTotal(0);
    this.isShuffling = false;
  }

  start(n) {
    // Fresh game
    if (this.isShuffling) {
      this.flash(this.STR.uiStrings.gameInProgress);
      return;
    }
    this.clear();
    this.score.setTotal(n);

    // Create n unique colors
    const colors = sampleWithoutReplacement(this.STR.palette21, n);

    // Create buttons in original order & mount in a row
    for (let i = 1; i <= n; i++) {
      const btn = new GameButton(i, colors[i - 1]);
      btn.mountRow(this.btnContainer);
      btn.disableClick(); // clicks disabled during setup/shuffle
      this.buttons.push(btn);
    }

    this.expectedOrder = this.buttons.map((b) => b.order);
    this.flash(`Showing ${n} buttons…`);

    // Row pause = n seconds (per spec)
    this._runPhases(n).catch((err) => {
      console.error(err);
      this.flash("Unexpected error. Please try again.");
      this.isShuffling = false;
    });
  }

  async _runPhases(n) {
    // Phase 1: wait n seconds while numbers visible
    await sleep(n * 1000);

    // Phase 2: scramble n times, 2 seconds apart
    this.isShuffling = true;
    for (let i = 0; i < n; i++) {
      this._scrambleOnce();
      await sleep(this.STR.CONFIG.SCRAMBLE_INTERVAL_MS);
    }
    this.isShuffling = false;

    // Phase 3: hide numbers, enable clicks, start timer
    for (const b of this.buttons) b.showNumber(false);
    for (const b of this.buttons) b.enableClick(() => this._onGuess(b));
    this.flash(this.STR.uiStrings.startPrompt);
    this.timer.start();
  }

  _scrambleOnce() {
    const cont = this.gameSpace;
    const contW = Math.max(0, cont.clientWidth);
    const contH = Math.max(0, cont.clientHeight);

    for (const b of this.buttons) {
      const w = b.el.offsetWidth || 0;
      const h = b.el.offsetHeight || 0;

      const maxLeft = Math.max(0, contW - w);
      const maxTop = Math.max(0, contH - h);

      const left = Math.floor(Math.random() * (maxLeft + 1));
      const top = Math.floor(Math.random() * (maxTop + 1));

      b.setAbsolutePosition(left, top, this.gameSpace);
    }
  }

  _onGuess(button) {
    if (this.isShuffling) return; // safety
    const expected = this.expectedOrder[this.currentIndex];
    const isCorrect = button.order === expected;

    this.score.recordClick(isCorrect);

    if (isCorrect) {
      // reveal and move to next
      button.showNumber(true);
      this.currentIndex += 1;

      if (this.currentIndex >= this.expectedOrder.length) {
        // Win
        this.timer.stop();
        this.flash(this.STR.uiStrings.excellent);
        // lock further clicks
        for (const b of this.buttons) b.disableClick();
        return;
      }
    } else {
      // Wrong → reveal all, stop timer, lock buttons
      this.timer.stop();
      for (const b of this.buttons) b.showNumber(true);
      for (const b of this.buttons) b.disableClick();
      this.flash(this.STR.uiStrings.wrong);
    }
  }
}
