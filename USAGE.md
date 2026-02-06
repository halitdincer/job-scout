# JobScout (Run-Once CLI)

JobScout runs once, scrapes the configured boards, compares against SQLite history, and prints only new jobs to the console. It does not manage cron/scheduling.

## Quick Start

```bash
nvm use
npm install
npm run build
npx ts-node src/index.ts --db data/jobscout.sqlite
```

## CLI Options

- `--db <path>` Path to the SQLite database (default: `data/jobscout.sqlite`)
- `--days <number>` Only show jobs posted within the last N days (when `postedDate` exists)
- `--add-board <path>` Add or update a board from a JSON file
- `--list-boards` List board names stored in SQLite
- `--remove-board <name>` Remove a board by name
- `-h, --help` Show help

## Board Config Storage (SQLite Only)

Boards are stored **only** in SQLite. You can insert or update them with SQL, or via the CLI.

Add/update a board:

```bash
npx ts-node src/index.ts --db data/jobscout.sqlite --add-board boards.example.json
```

List boards:

```bash
npx ts-node src/index.ts --db data/jobscout.sqlite --list-boards
```

Remove a board:

```bash
npx ts-node src/index.ts --db data/jobscout.sqlite --remove-board "Microsoft Toronto"
```

Example SQL:

```sql
INSERT INTO boards (name, url, config_json, updated_at)
VALUES (
  'Microsoft Toronto',
  'https://apply.careers.microsoft.com/careers?start=0&location=Toronto%2C++ON%2C++Canada&pid=1970393556649678&sort_by=distance&filter_distance=160&filter_include_remote=1&filter_career_discipline=Software+Engineering&filter_seniority=Entry%2CMid-Level',
  '{
    \"name\": \"Microsoft Toronto\",
    \"url\": \"https://apply.careers.microsoft.com/careers?start=0&location=Toronto%2C++ON%2C++Canada&pid=1970393556649678&sort_by=distance&filter_distance=160&filter_include_remote=1&filter_career_discipline=Software+Engineering&filter_seniority=Entry%2CMid-Level\",
    \"selectors\": {
      \"jobCard\": \"div[role=\\\"listitem\\\"]\",
      \"title\": \"h3\",
      \"location\": \"div[class*=\\\"location\\\"]\",
      \"link\": \"a\",
      \"company\": null,
      \"postedDate\": \"\",
      \"nextPage\": \"a[aria-label=\\\"Next\\\"]\"
    },
    \"pagination\": { \"type\": \"click\", \"maxPages\": 5, \"delayMs\": 1000 },
    \"waitForSelector\": \"div[role=\\\"listitem\\\"]\"
  }',
  '2026-02-06T00:00:00.000Z'
);
```

## Pagination Options

- `pagination.type = "click"`
  - Uses `pagination.nextPageSelector` (or `selectors.nextPage`) to move to the next page.
- `pagination.type = "url"`
  - Uses `pagination.urlTemplate` with a `{page}` placeholder, e.g. `https://example.com/jobs?page={page}`.

## Output

- Console only. Each new job prints as:

```
[Board] Title @ Company — Location
https://job-url | Posted: 2025-01-01
```

## SQLite

The DB stores job history in `data/jobscout.sqlite`. It is created automatically if it does not exist.

## Node Version Note

This project uses `sqlite3`, which is most reliable with Node LTS. The repository includes a `.nvmrc` file pinned to Node 22.
Avoid running `npm audit fix --force` here, as it can downgrade `sqlite3` to an older version with fewer prebuilt binaries.

## CLI Install Options

See `INSTALL.md` for local CLI and Homebrew installation steps.
