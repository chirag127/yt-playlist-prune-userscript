# YT Playlist Prune

Finds the broken and repeated rows in a YouTube playlist: `[Deleted]`, `[Private]` and
unavailable videos, plus any video ID that appears more than once.

**It detects. It never deletes.** Removal is owned by
[yt-multiselect-userscript](https://github.com/chirag127/yt-multiselect-userscript):
select the rows there and use *Remove from this playlist*. A second removal path would be a
second way to destroy a playlist by accident.

## Where it runs

- `youtube.com/playlist?list=…`
- the playlist panel on a watch page (`ytd-playlist-panel-renderer`)

The **Prune** button appears on the shared toolbar. It is the only UI this script adds.

## What the panel shows

| Line | Meaning |
|---|---|
| Rows scanned | playlist rows currently rendered (not recommendations) |
| Unavailable rows | title or row text says deleted / private / unavailable |
| Duplicate occurrences after first | same 11-character video ID seen again |

Findings are listed with their row number, title and reason, up to the configured limit.

## Settings

One entry — **Settings…** — opens the shared settings popup.

| Field | Default | Purpose |
|---|---|---|
| Rows to list | 80 | findings shown in the panel (1–1000) |
| Maximum loaded rows to scan | 5000 | caps work on a huge playlist (1–20000) |

## Limits

- **Loaded rows only.** YouTube renders more rows as you scroll. Scroll first, then scan.
- A playlist row can be unavailable and carry no video ID at all. It is still reported as
  unavailable, but no tool can target it by ID — remove it by hand.
- The check reads the DOM, not the API, so nothing is sent anywhere.

## Install

Follow the [install guide](https://github.com/chirag127/userscript-install-guide). The script
`@require`s [yt-core-lib](https://github.com/chirag127/yt-core-lib), which is never installed
on its own.

## Docs

Collection documentation is single-sourced in the workspace bundle: `c:\ws\docs\okf\`.
