"use strict";

// Make main function async to allow 'await' for fetching language file
document.addEventListener("DOMContentLoaded", async function () {
  let messages;
  try {
    // 1. Fetch language file first
    const response = await fetch("lang.json");
    if (!response.ok) {
      throw new Error("Failed to load language file.");
    }
    messages = await response.json();
  } catch (error) {
    console.error(error);

    // NOTE: Fallback messages if lang.json fails. NOT primary source.
    messages = {
      sending: "Sending query...",
      errorPrefix: "Error: ",
      emptyQuery: "Please enter a SQL query.",
      unsupportedQuery: "Error: Only SELECT and INSERT queries are supported.",
    };
    // Display the error on the page
    document.getElementById("query-result").textContent =
      "Critical Error: Could not load page text.";
  }

  const API_BASE_URL =
    "https://assignments.isaaclauzon.com/comp4537/labs/5/api/v1/sql/";

  // Get elements ONCE and store them
  const postButton = document.getElementById("static-post-btn");
  const queryForm = document.getElementById("query-form");
  const queryInput = document.getElementById("query-input");
  const queryResult = document.getElementById("query-result");

  // --- Listener for Static Post Button (Part A) ---
  postButton.addEventListener("click", function () {
    // 2. Define the static data
    const staticData = [
      { name: "Sara Brown", dob: "1901-01-01" },
      { name: "John Smith", dob: "1941-01-01" },
      { name: "Jack Ma", dob: "1961-01-30" },
      { name: "Elon Musk", dob: "1999-01-01" },
    ];

    // 3. Build the SQL query string from the data
    const values = staticData
      .map((patient) => `('${patient.name}', '${patient.dob}')`)
      .join(", ");

    const query = `INSERT INTO patient (name, date_of_birth) VALUES ${values};`;

    // 4. Send the query to the server, matching the API contract
    // Use string from lang.json
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
        // 5. Display the server's response
        queryResult.textContent = JSON.stringify(data, null, 2);
      })
      .catch((error) => {
        console.error("Error:", error);
        // Use string from lang.json
        queryResult.textContent = `${messages.errorPrefix}${error.message}`;
      });
  });

  // --- Listener for Custom Query Form (Part B) ---
  queryForm.addEventListener("submit", function (event) {
    // Prevent form from reloading page
    event.preventDefault();

    const query = queryInput.value.trim();

    if (!query) {
      // Use string from lang.json
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
      // Use string from lang.json
      queryResult.textContent = messages.unsupportedQuery;
      return;
    }

    fetchOptions.method = method;
    // Use string from lang.json
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
        // Use string from lang.json
        queryResult.textContent = `${messages.errorPrefix}${error.message}`;
      });
  });
});
