"use strict";

// 1. Import the messages object directly from the .js file
import messages from "./lang/en.js";

/**
 * Populates the DOM with text content from the language module.
 */
function populateText() {
  // Set page title
  document.title = messages.pageTitle;

  // Find all elements with a data-lang attribute
  document.querySelectorAll("[data-lang]").forEach((element) => {
    const key = element.dataset.lang;
    if (messages[key]) {
      element.textContent = messages[key];
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // 2. Run the function to populate all HTML text
  try {
    populateText();
  } catch (error) {
    console.error("Failed to populate UI text:", error);
    document.getElementById("query-result").textContent = messages.loadError;
    // Stop execution if we can't even load the UI
    return;
  }

  // NOTE: The async wrapper and the fetch('lang.json') are gone.
  // The 'messages' object is already available from the import.

  const API_BASE_URL =
    "https://assignments.isaaclauzon.com/comp4537/labs/5/api/v1/sql/";

  // Get elements ONCE and store them
  const postButton = document.getElementById("static-post-btn");
  const queryForm = document.getElementById("query-form");
  const queryInput = document.getElementById("query-input");
  const queryResult = document.getElementById("query-result");

  // --- Listener for Static Post Button (Part A) ---
  postButton.addEventListener("click", function () {
    // Define the static data
    const staticData = [
      { name: "Sara Brown", dob: "1901-01-01" },
      { name: "John Smith", dob: "1941-01-01" },
      { name: "Jack Ma", dob: "1961-01-30" },
      { name: "Elon Musk", dob: "1999-01-01" },
    ];

    // Build the SQL query string from the data
    const values = staticData
      .map((patient) => `('${patient.name}', '${patient.dob}')`)
      .join(", ");

    const query = `INSERT INTO patient (name, date_of_birth) VALUES ${values};`;

    // Send the query to the server, matching the API contract
    // Use string from en.js module
    queryResult.textContent = messages.sending;

    fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Display the server's response
        queryResult.textContent = JSON.stringify(data, null, 2);
      })
      .catch((error) => {
        console.error("Error:", error);
        // Use string from en.js module
        queryResult.textContent = `${messages.errorPrefix}${error.message}`;
      });
  });

  // --- Listener for Custom Query Form (Part B) ---
  queryForm.addEventListener("submit", function (event) {
    // Prevent form from reloading page
    event.preventDefault();

    const query = queryInput.value.trim();

    if (!query) {
      // Use string from en.js module
      queryResult.textContent = messages.emptyQuery;
      return;
    }

    let method = "";
    let url = API_BASE_URL;
    const fetchOptions = {};

    // 1. Determine the correct method (GET or POST)
    if (query.toUpperCase().startsWith("SELECT")) {
      method = "GET";

      // For GET, the query goes in the URL, properly encoded
      url = `${API_BASE_URL}${encodeURIComponent(query)}`;
    } else if (query.toUpperCase().startsWith("INSERT")) {
      method = "POST";
      fetchOptions.headers = {
        "Content-Type": "application/json",
      };

      // For POST, the query goes in the body
      fetchOptions.body = JSON.stringify({ query: query });
    } else {
      // Use string from en.js module
      queryResult.textContent = messages.unsupportedQuery;
      return;
    }

    fetchOptions.method = method;
    // Use string from en.js module
    queryResult.textContent = messages.sending;

    // 2. Send the fetch request
    fetch(url, fetchOptions)
      .then((response) => response.json())
      .then((data) => {
        // 3. Display the server's response
        queryResult.textContent = JSON.stringify(data, null, 2);
      })
      .catch((error) => {
        console.error("Error:", error);
        // Use string from en.js module
        queryResult.textContent = `${messages.errorPrefix}${error.message}`;
      });
  });
});