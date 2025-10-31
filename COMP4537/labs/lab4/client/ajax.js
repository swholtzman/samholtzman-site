
"use strict";

/**
 * Minimal front-end for Lab 4.
 * - Uses Fetch (no libraries).
 * - Talks to the partner API hosted on a different origin.
 * - Avoids CORS preflight by using a "simple" Content-Type for POST.
 * - Performs basic input validation on both forms.
 *
 * API:
 *   GET  https://assignments.isaaclauzon.com/comp4537/labs/4/api/definitions/?word={word}
 *   POST https://assignments.isaaclauzon.com/comp4537/labs/4/api/definitions
 *        Body (application/json): { "word": "{word}", "definition": "{definition}" }
 *
 * Server returns JSON. Examples (shape may vary slightly based on backend):
 *   { "requestId": 102, "word": "book", "definition": "..." }
 *   { "requestId": 103, "message": "word 'book' not found!" }
 */
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL =
    "https://assignments.isaaclauzon.com/comp4537/labs/4/api/definitions";

  /**
   * validates a dictionary word: non-empty, alphabetic start, letters/spaces/-/' allowed
   * keeps UI simple while rejecting numbers and obviously invalid input
   */
  function isValidWord(word) {
    if (typeof word !== "string") return false;
    const trimmed = word.trim();
    if (trimmed.length === 0) return false;
    return /^[A-Za-z](?:[A-Za-z]|[ \-'][A-Za-z])*$/.test(trimmed);
  }

  function isValidDefinition(definition) {
    if (typeof definition !== "string") return false;
    return definition.trim().length > 0;
  }

  function clearElement(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  /**
   * build and insert a “pretty result card”.
   * shows common fields if present (status, message, httpStatus,
   * requestId, word, definition, word_count, entries, etc.).
   */
  function renderCard(targetElement, payload) {
    clearElement(targetElement);

    const status =
      payload?.status ||
      payload?.data?.status ||
      (payload?.message ? "ok" : "ok"); // default

    const message =
      payload?.message ||
      payload?.data?.message ||
      payload?.server?.message ||
      payload?.data ||
      "";

    const httpStatus =
      payload?.httpStatus ??
      payload?.code ??
      payload?.statusCode ??
      payload?.data?.code;

    // pull common data points if they exist
    const definition = payload?.data?.definition ?? payload?.definition ?? null;
    const requestId =
      payload?.data?.requestId ??
      payload?.requestId ??
      payload?.server?.requestId ??
      null;
    const word =
      payload?.word ?? payload?.data?.word ?? payload?.server?.word ?? null;
    const wordCount =
      payload?.data?.word_count ??
      payload?.word_count ??
      payload?.data?.count ??
      null;

    const card = document.createElement("section");
    card.className = "notice-card";

    const head = document.createElement("div");
    head.className = "notice-head";

    const title = document.createElement("h3");
    title.className = "notice-title";
    title.textContent = word ? `Result for “${word}”` : "Request Result";

    const badge = document.createElement("span");
    badge.className = `badge ${String(status).toLowerCase()}`;
    badge.textContent = String(status);

    head.appendChild(title);
    head.appendChild(badge);

    const body = document.createElement("div");
    body.className = "notice-body";
    if (message && typeof message === "string") {
      body.textContent = message;
    } else if (message && typeof message === "object") {

      // fallback if server returns nested data as object
      body.textContent = JSON.stringify(message, null, 2);
    }

    const meta = document.createElement("div");
    meta.className = "notice-meta";

    function addMeta(label, value) {
      if (value === undefined || value === null || value === "") return;
      const row = document.createElement("div");
      const k = document.createElement("span");
      k.textContent = `${label}: `;
      const v = document.createElement("strong");
      v.textContent = String(value);
      row.appendChild(k);
      row.appendChild(v);
      meta.appendChild(row);
    }

    addMeta("HTTP Status", httpStatus);
    addMeta("Request ID", requestId);
    addMeta("Word", word);
    addMeta("Definition", definition);
    addMeta("Word Count", wordCount);

    card.appendChild(head);
    card.appendChild(body);
    card.appendChild(meta);
    targetElement.appendChild(card);
  }

  /* ---------- STORE (POST) ---------- */
  const storeForm = document.getElementById("storeForm");
  const storeFeedback = document.getElementById("storeFeedback");

  if (storeForm && storeFeedback) {
    storeForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const wordInput = document.getElementById("wordInput");
      const definitionInput = document.getElementById("definitionInput");

      const word = (wordInput?.value ?? "").trim();
      const definition = (definitionInput?.value ?? "").trim();

      if (!isValidWord(word)) {
        renderCard(storeFeedback, {
          status: "error",
          message:
            "Please enter a valid English word (letters, spaces, hyphens, and apostrophes only).",
          httpStatus: 422,
        });
        return;
      }

      if (!isValidDefinition(definition)) {
        renderCard(storeFeedback, {
          status: "error",
          message: "Please enter a valid definition (non-empty).",
          httpStatus: 422,
        });
        return;
      }

      try {
        // use application/json Content-Type (note: this will trigger a CORS preflight)
        const response = await fetch(API_BASE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ word, definition }),
        });

        const contentType = response.headers.get("Content-Type") || "";
        if (!response.ok) {
          
          //  attempt to parse error JSON if provided
          if (contentType.includes("application/json")) {
            const errorData = await response.json();
            renderCard(storeFeedback, {
              status: "error",
              httpStatus: response.status,
              ...errorData,
            });
          } else {
            const text = await response.text();
            renderCard(storeFeedback, {
              status: "error",
              httpStatus: response.status,
              message: text || response.statusText,
            });
          }
          return;
        }

        const data = contentType.includes("application/json")
          ? await response.json()
          : { message: await response.text() };

        renderCard(storeFeedback, {
          status: "ok",
          httpStatus: response.status,
          ...data,
        });
        storeForm.reset();
      } catch (error) {
        renderCard(storeFeedback, {
          status: "network-error",
          message:
            "The request could not be completed. Please check your connection or try again.",
          detail: String(error),
          httpStatus: 0,
        });
      }
    });
  }

  /* ---------- SEARCH (GET) ---------- */
  const searchForm = document.getElementById("searchForm");
  const searchFeedback = document.getElementById("searchFeedback");

  if (searchForm && searchFeedback) {
    searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const searchWordInput = document.getElementById("searchWordInput");
      const word = (searchWordInput?.value ?? "").trim();

      if (!isValidWord(word)) {
        renderCard(searchFeedback, {
          status: "error",
          message:
            "Please enter a valid English word (letters, spaces, hyphens, and apostrophes only).",
          httpStatus: 422,
        });
        return;
      }

      try {
        const url = `${API_BASE_URL}/?word=${encodeURIComponent(word)}`;
        const response = await fetch(url, { method: "GET" });

        const contentType = response.headers.get("Content-Type") || "";
        if (!response.ok) {
          if (contentType.includes("application/json")) {
            const errorData = await response.json();
            renderCard(searchFeedback, {
              status: "error",
              httpStatus: response.status,
              ...errorData,
            });
          } else {
            const text = await response.text();
            renderCard(searchFeedback, {
              status: "error",
              httpStatus: response.status,
              message: text || response.statusText,
            });
          }
          return;
        }

        const data = contentType.includes("application/json")
          ? await response.json()
          : { message: await response.text() };

        renderCard(searchFeedback, {
          status: "ok",
          httpStatus: response.status,
          ...data,
        });
        searchForm.reset();
      } catch (error) {
        renderCard(searchFeedback, {
          status: "network-error",
          message:
            "The request could not be completed. Please check your connection or try again.",
          detail: String(error),
          httpStatus: 0,
        });
      }
    });
  }
});
