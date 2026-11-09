# AGENTS.md — yt-playlist-prune-userscript

Read the collection [`AGENTS.md`](../AGENTS.md) and [`PLAN.md`](../PLAN.md) first.

## Rules for this script

1. Requires `yt-core-lib` for everything shared. Never copy InnerTube, AI or storage code here.
2. EXACTLY ONE context-menu entry: `Settings…` calling `Ytk.openSettings({...})`.
3. Its action goes on the shared toolbar via `Ytk.mountToolbar`. Never draw its own bar.
4. No `innerHTML` — YouTube enforces Trusted Types and the throw is silent inside handlers.
5. Read-only. This script must never write to YouTube.
6. Playlist rows come in two shapes: current `yt-lockup-view-model` and legacy
   `ytd-playlist-video-renderer`. Handle both.
7. Gate on `Ytk.featureOn(<id>, true)` and return early when off.
