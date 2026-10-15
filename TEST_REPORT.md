# Test Report

- Command: `npm test` (uses the test runner built into Node.js, no extra libraries)
- Tests use a temporary in-memory database, so your real data is never touched
- Result: **15 tests, 15 passed, 0 failed**

| # | Test | Result |
|---|---|---|
| 1 | List returns seeded records with pagination meta | Pass |
| 2 | List filters by mode and search text | Pass |
| 3 | List rejects bad `page` / `limit` (400) | Pass |
| 4 | SQL injection text in search is treated as plain text | Pass |
| 5 | Detail returns one record, or 404 | Pass |
| 6 | Create returns 201, invalid data returns 400 with details | Pass |
| 7 | Update and delete work, unknown ids return 404 | Pass |
| 8 | Broken JSON returns 400 `INVALID_JSON` | Pass |
| 9 | Valid application is saved (201) | Pass |
| 10 | Invalid application is rejected by the server (400, 4 problems listed) | Pass |
| 11 | Application for an unknown internship returns 404 | Pass |
| 12 | Duplicate application returns 409 | Pass |
| 13 | Security headers are set, `X-Powered-By` is hidden | Pass |
| 14 | Rate limit returns 429 after too many requests | Pass |
| 15 | Frontend page is served at `/` | Pass |

## Manual checks done in the browser

- Loading message is visible while data loads
- Stopping the server and refreshing shows an error with a **Try again** button
- Application form shows field errors without sending a request
- Search and domain filter work together, empty state shows when nothing matches
