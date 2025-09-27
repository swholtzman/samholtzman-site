/* AI-Assist Disclosure — Sep 14, 2025
   Tools: ChatGPT (GPT-5 Thinking)
   Scope: Fixed syntax errors; added safe defaults.
*/

document.addEventListener("DOMContentLoaded", () => {
  const STR = window.LAB_STRINGS ?? {};
  const HTML = STR.htmlStrings ?? {};

  // Helper to set textContent if the element exists
  const setElementTextById = (id, text, fallback = "") => {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? fallback;
  };

  // Populate visible UI strings
  setElementTextById("title", HTML.title, "Untitled"); // structure of a function: setElementTextById("element_id", "text_content", "fallback_text");
  setElementTextById("to_index", HTML.to_index, "Index");
  setElementTextById("to_reader", HTML.to_reader, "Reader");
  setElementTextById("to_writer", HTML.to_writer, "Writer");

  // Also set the browser tab title if provided
  if (HTML.doc_title || HTML.title) {
    document.title = HTML.doc_title ?? HTML.title;
  }

  // Make any element with a [link] attribute navigate on click
  document.querySelectorAll("[link]").forEach((el) => {
    const href = el.getAttribute("link");
    if (!href) return;

    // Prevent accidental form submission if it's a <button>
    if (el.tagName === "BUTTON" && !el.hasAttribute("type")) {
      el.setAttribute("type", "button");
    }

    el.addEventListener("click", () => {
      window.location.href = href;
    });
  });
});
