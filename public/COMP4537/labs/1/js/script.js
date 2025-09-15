document.addEventListener("DOMContentLoaded", () => {
  const STR = window.LAB_STRINGS;
  if (!STR || !STR.htmlStrings) return;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText("title", STR.htmlStrings.title);
  setText("to_index", STR.htmlStrings.to_index);
  setText("to_reader", STR.htmlStrings.to_reader);
  setText("to_writer", STR.htmlStrings.to_writer);
});
