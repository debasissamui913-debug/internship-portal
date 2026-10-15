# Security Checklist

| # | Check | How it is done | Where |
|---|---|---|---|
| 1 | Server-side validation | Every field of the application and internship data is checked on the server, even though the browser form checks it too | `app.js` (`validateApplication`, `validateInternship`) |
| 2 | Parameterized queries | All SQL uses `?` placeholders, user text is never added into the SQL string. A test tries a SQL injection string | `app.js`, `tests/api.test.js` |
| 3 | Rate limiting | 200 requests per 15 minutes for the API, and only 5 applications per 15 minutes per IP. Extra requests get `429` | `app.js` (`express-rate-limit`) |
| 4 | Secure headers | `helmet` sets Content-Security-Policy, `X-Content-Type-Options` and others, and hides `X-Powered-By` | `app.js` |
| 5 | No XSS | The frontend uses `textContent` and never `innerHTML` for API data. The CSP blocks inline scripts | `public/js/script.js` |
| 6 | Small request size | JSON body is limited to 10 KB (`413` if bigger) | `app.js` |
| 7 | Duplicate protection | The same email cannot apply twice for one internship (`UNIQUE` rule in the database and a `409` response) | `schema.sql`, `app.js` |
| 8 | Safe error messages | Unexpected errors return a generic message. Details stay in the server log, not in the response | `app.js` |
| 9 | Secrets and data not in Git | `.gitignore` keeps `node_modules` and the `.db` file out of the repository. No passwords or keys are used | `.gitignore` |
| 10 | Failure handling in the UI | Timeout, server down, 400, 409 and 429 all show a clear message, and the page does not break | `public/js/script.js` |

## Known limits (honest notes)

- The create, update and delete internship endpoints have **no login**, because authentication was not part of this task. In a real product they must be protected (admin login).
- The rate limit counts requests per IP in memory, so it resets when the server restarts.
