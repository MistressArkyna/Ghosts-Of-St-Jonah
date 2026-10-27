 The Ghostlight Archive

Canon record for **Ghosts of St. Jonah**.

A single self-contained HTML application with a small shared database, holding
girls, couples, houses, rooms, systems, arcs, changes, questions and images for
the Found Family across Ghost Haven, Specter Haven and Banshee Haven.

## Layout

| Path | What it is |
|---|---|
| `ghostlight-archive.html` | The built application. This file **is** the Archive — open it in a browser. |
| `src/` | Build sources. `01-shell.html`, `02-seed-a.js`, `03-seed-girls.js`, `04-seed-couples.js`, `05-app.js`, and `build.sh`. |
| `canon/` | JSON mirror of every record, one file per document, dumped from the build. |
| `tools/` | Verification. See below. |

## Building

```sh
cd src && bash build.sh        # concatenates src/ into ghostlight-archive.html
cd .. && node tools/dump-all.cjs   # refreshes the canon/ mirror from the build
```

`dump-all.cjs` must run after `build.sh` — the verifiers read the canon mirror,
not `src/`, and a stale mirror reports phantom errors.

## Verifying

```sh
node tools/verify.cjs        # unresolved links, malformed records
node tools/dupe-scan.cjs     # two records sharing an id; two keys in one object literal
node tools/verify-lens.cjs   # temporal assertions across the arc run
```

All three must come back clean before a publish.

## Canon states

`current` · `historical` · `draft` · `proposed` · `disputed` · `retired`

A retired record is never deleted. It is retired, pointed at whatever replaced
it, and kept for the one or two things only it can say.

## House rule

**The Archive does not guess.** An unruled detail is filed as a question with
the reading named and labelled a reading. Flagging an invention does not make it
wrong, and being right is not a reason to have filed it unflagged — the flag is
what makes it safe to be right.
