/* AI-Assist Disclosure — Sep 6, 2025
   Tool: ChatGPT
   Scope: Helped select/compose the 21-color palette (palette21). Other code by me.
*/

(() => {
  if (window.LAB_STRINGS) return;

  const headerStrings = {
    title: "Memory Shuffle",
  };

  const uiStrings = {
    invalidRange: "Please enter a number between 3 and 7.",
    gameInProgress: "Please wait—shuffling in progress…",
    startPrompt: "Click the buttons in the original order.",
    excellent: "Excellent memory!",
    wrong: "Wrong order!",
    buttons: "How many buttons to create?",
    init: "Go!",
    gameStats: "Game Stats",
    moves: "Moves",
    time: "Time",
    score: "Score",
  };

  // 21 distinct colours (no duplicates)
  const palette21 = [
    "#FF6B6B", "#4ECDC4", "#556270", "#C7F464", "#C44D58",
    "#FFA600", "#B44CFF", "#2E86AB", "#3DA35D", "#F72585",
    "#4361EE", "#4CC9F0", "#43AA8B", "#F8961E", "#90BE6D",
    "#577590", "#E63946", "#A8DADC", "#457B9D", "#FFAFCC",
    "#06D6A0",
  ];

  const CONFIG = {
    MIN_N: 3,
    MAX_N: 7,
    SCRAMBLE_INTERVAL_MS: 2000, // every 2 seconds
  };

  window.LAB_STRINGS = { headerStrings, uiStrings, palette21, CONFIG };
})();