/* AI-Assist Disclosure — Sep 13, 2025
   Tool: GitHub Copilot / ChatGPT
   Scope: Strings & config only.
*/
(() => {
  if (window.LAB_STRINGS) return;

  const htmlStrings = {
    title: "Note Taker App",
    to_index: "Back",
    to_reader: "Read",
    to_writer: "Write",
  };

  const uiStrings = {
    addNote: "Add Note",
    remove: "Remove",
    placeholder: "Type your note...",
    lastSavedPrefix: "Last saved:",
    lastRetrievedPrefix: "Last retrieved:",
    emptyList: "No notes yet.",
  };

  const CONFIG = {
    storageKey: "lab1.state", // single LS key
    debounceMs: 500, // writer debounce for input saves
    timeFormat: "en-CA", // locale for timestamps
  };

  window.LAB_STRINGS = { htmlStrings, uiStrings, CONFIG };
})();
