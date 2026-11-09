# AGENTS.md — YT Playlist Prune

Read the collection rules first: [`../AGENTS.md`](../AGENTS.md). Documentation lives once in
`c:\ws\docs\okf\` — do not create an `okf/` copy here.

## What this repo is

One userscript, one job: **detect** unavailable and duplicate rows in a playlist. It does not
write to YouTube, ever.

## Non-negotiables

1. **Exactly one context-menu entry**, `Settings…`, calling `Ytk.openSettings`. No other
   `GM_registerMenuCommand` call.
2. **Detection only.** Do not add removal, playlist edits, or an InnerTube write. Removal
   belongs to `yt-multiselect-userscript`. If someone asks for it here, point them there.
3. **No `innerHTML`.** Build UI with `Ytk.h` / `Ytk.panel` / `Ytk.kv` / `Ytk.note` / `Ytk.toast`.
4. **The shared toolbar is the only chrome.** `Ytk.mountToolbar([{ label: 'Prune', run: prune }])`.
   No custom bar, floating chip or badge.
5. **Core is required, pinned:** `@require …/yt-core-lib-1.3.0.js`. Never copy a core helper here.
   The pin is versioned because a stale cached core is how consumers once got
   `Ytk.featureOn is not a function`; bump it when the core repo bumps.

## Why the code looks the way it does

- **Row scoping matters.** The scan starts at `ytd-playlist-video-list-renderer` (or the watch
  sidebar panel) so recommendation rails, which also use `yt-lockup-view-model`, are excluded.
  A naive `document.querySelectorAll('yt-lockup-view-model')` counted videos that are not in
  the playlist.
- **Two DOM generations.** Current playlists render `yt-lockup-view-model` with the data in
  `node.data.lockupViewModel`; older sessions render `ytd-playlist-video-renderer` /
  `ytd-playlist-panel-video-renderer`. Both shapes are read. Row data is read from the
  view-model object, the rendered `href`'s `v=` parameter, and — last resort — `node.contentId`.
- **Do not deep-walk a DOM node for text.** `Ytk.deepTexts` is meant for the view-model object.
  Calling it with an element walks DOM properties; pass the data object or use `textContent`.
- **Core 1.3.0, not 1.2.0, is the floor.** Every script runs in its own sandbox, so 1.2.0
  drew one `.ytk2-bar` per installed script. 1.3.0 reuses the bar already in the DOM. Four
  collection scripts on one playlist page would otherwise show four toolbars.
- **The AI grants are not optional.** The shared settings popup always renders its AI
  section, which calls `GM_xmlhttpRequest`. Dropping `@grant GM_xmlhttpRequest` / `@connect *`
  makes “Test connection” fail with the core's own error message.
- **Settings survive because of `onSave`.** Core 1.3.0's `openSettings` rebuilds
  `ytk.settings` from the core's own defaults, so keys it does not know (`pruneShowLimit`,
  `pruneRowCap`) are dropped on save. The `onSave` merge puts them back. Remove the shim only
  after the core preserves unknown keys on its own.
- **SPA navigation and late panels.** YouTube swaps the page without a reload, and the
  watch-page playlist panel renders after `document-idle`. `mount()` is therefore idempotent
  (`mounted` flag) and retried on both `yt-navigate-finish` and `yt-page-data-updated`.
  Without the flag, every navigation that reaches a playlist adds a second Prune button.

## Verification before claiming a change works

```bash
node --check yt-playlist-prune.user.js
grep -c "GM_registerMenuCommand(" yt-playlist-prune.user.js   # must be 1
grep -c "innerHTML" yt-playlist-prune.user.js                 # must be 0
```

Then load a real playlist in the browser and confirm the panel counts match the visible rows.
A DOM check is not a live test; say which one you actually ran.
