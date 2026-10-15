# InternBoard Portal (Frontend + API)

My Task 04 project for the EdVyro Full-Stack Development Internship (Secure Application Integration). The internship board frontend now loads its data from my own Express + SQLite API, and users can send an application through a form that is validated on both the browser and the server.

## Features

- Frontend loads internships from the API with a **loading state**, an **error state with a Try again button**, and an empty state
- Search and domain filter
- Accessible application form (labels, field errors, keyboard friendly, uses the native `<dialog>`)
- Client-side and **server-side validation**
- API endpoints for internships (list with pagination, detail, create, update, delete) and applications
- Rate limiting, secure headers and parameterized SQL queries
- 15 automated tests

## Built with

HTML, CSS, JavaScript, Node.js, Express, SQLite (built into Node), `helmet`, `express-rate-limit`

## How to run

You need Node.js 22.13 or newer.

```bash
npm install
npm start
```

Open `http://localhost:3000`. The database file is created and filled with sample data automatically on the first start.

Run the tests:

```bash
npm test
```

On Windows PowerShell, if `npm` is blocked, use `npm.cmd install`, `npm.cmd start` and `npm.cmd test`.

## Folder structure

```
internship-portal/
├── app.js            API routes, validation, security
├── server.js         starts the server
├── db.js             database connection
├── seed.js           sample data loader
├── schema.sql        tables
├── data/internships-seed.json
├── public/           frontend (index.html, css/style.css, js/script.js)
├── tests/api.test.js
├── SECURITY.md       security checklist
├── TEST_REPORT.md    test results
└── README.md
```

## API

| Method | URL | What it does |
|---|---|---|
| GET | `/api/internships?page=1&limit=10&domain=&mode=&q=` | List (paginated) |
| GET | `/api/internships/:id` | One internship |
| POST | `/api/internships` | Create |
| PUT | `/api/internships/:id` | Update |
| DELETE | `/api/internships/:id` | Delete |
| POST | `/api/applications` | Send an application |

Success responses look like `{ "success": true, "data": ... }`. Errors look like `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`.

Status codes used: 200, 201, 400 (validation), 404, 409 (duplicate application), 413 (body too large), 429 (rate limit), 500.

### Application example

```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"internshipId":"INT-101","fullName":"Debasis Samui","email":"debasis@example.com","phone":"9876543210","coverNote":"I enjoy building web projects and want to learn more."}'
```

Application rules: name 2 to 80 characters, valid email, optional phone with 10 to 15 digits, cover note 20 to 1000 characters.

## Security

See [SECURITY.md](SECURITY.md) for the checklist and [TEST_REPORT.md](TEST_REPORT.md) for the test results.

## Author

Debasis Samui, https://github.com/debasissamui913-debug
