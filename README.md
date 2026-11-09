# YT Playlist Prune

Lists [Deleted] / [Private] / unavailable rows and duplicate video ids. DETECTION ONLY — removal belongs to yt-multiselect-userscript.

## Where it runs

playlist pages

## Install

Read the [install guide](https://github.com/chirag127/userscript-install-guide), then:

```
https://github.com/chirag127/yt-playlist-prune-userscript/raw/main/yt-playlist-prune.user.js
```

Requires [`yt-core-lib`](https://github.com/chirag127/yt-core-lib), pulled in with `@require`.
You do not install the core yourself.

## Settings

Exactly one context-menu entry, called **Settings…**. It opens the shared in-page popup with:

- this script's own settings
- the shared AI section (the key is entered once and used by every script)
- buttons that run this script's actions

## What it does NOT do

- It never removes anything. Removal is owned by yt-multiselect-userscript.

## License

MIT