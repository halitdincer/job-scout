# Installation & CLI Usage

This project supports both a local CLI install and a Homebrew formula.

## Option A: Local CLI (fastest)

```bash
nvm use
npm install
npm run build
npm link
jobscout --db data/jobscout.sqlite
```

Add/update a board:

```bash
jobscout --db data/jobscout.sqlite --add-board boards.example.json
```

List boards:

```bash
jobscout --db data/jobscout.sqlite --list-boards
```

Remove a board:

```bash
jobscout --db data/jobscout.sqlite --remove-board "Microsoft Toronto"
```

To unlink:

```bash
npm unlink -g job-scout
```

## Option B: Homebrew (shareable)

1) Create a separate tap repo, e.g. `github.com/your-org/homebrew-jobscout`.

2) Copy the formula from `brew/jobscout.rb` into the tap repo:
```
Formula/jobscout.rb
```

3) Update `homepage`, `url`, and `sha256` to point at your release tarball.

To compute `sha256` for a release tarball:

```bash
shasum -a 256 job-scout-1.0.0.tar.gz
```

4) Publish a GitHub release and then install:

```bash
brew tap your-org/jobscout
brew install jobscout
```

5) Run:

```bash
jobscout --db /path/to/jobscout.sqlite
```

## Notes

- The Homebrew formula expects `npm run build` to produce `dist/index.js`.
- The CLI script is `bin/jobscout` and delegates to the built output.
