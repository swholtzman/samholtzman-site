# COMP 4537 - Lab 5 (Client)

This repository contains the **client-side (Server 1)** for a two-origin, SQL-over-HTTP application.

This front-end is built with vanilla JavaScript, HTML, and a `lang.json` file for localization. It provides a user interface for sending `SELECT` and `INSERT` queries to a separate, remote backend API (Server 2) using the `fetch` API.

## Features

- **Static Insert:** A button to send a predefined `POST` request, inserting a static set of four patient records.
- **Query Form:** A text area that accepts user-written `SELECT` or `INSERT` SQL queries.
- **Request Logic:** Automatically determines whether to use `GET` (for `SELECT`) or `POST` (for `INSERT`).

## File Structure

```
/
├── index.html     # Main UI page with the form, buttons, and result area
├── script.js      # Handles all fetch requests, DOM updates, and request logic
├── lang.json      # Stores user-facing strings for localization
└── README.md      # This file
```

## Usage

1.  Serve the files from a static server.
2.  Ensure the backend API (Server 2) is running and accessible.
3.  Update the `API_BASE_URL` constant in `script.js` to point to the correct backend API endpoint.
4.  Open the `index.html` page in your browser.

## Expected API Contract (Server 2)

This client is hard-coded to communicate with a backend API that adheres to the following contract:

### `GET /api/v1/sql/<query>`

- **Description:** Executes a read-only `SELECT` query.
- **URL Parameter:** The `<query>` must be a URL-encoded `SELECT` statement appended directly to the path.
- **Example:** `GET .../api/v1/sql/select%20*%20from%20patient`

### `POST /api/v1/sql`

- **Description:** Executes an `INSERT` query.
- **Request Body (JSON):** The request must send a JSON object with a single `query` key.
- **Example:**
  ```json
  {
    "query": "INSERT INTO patient (name, date_of_birth) VALUES ('Test User', '2000-01-01')"
  }
  ```
