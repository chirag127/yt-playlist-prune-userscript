// ==UserScript==
// @name         YT Playlist Prune
// @namespace    https://github.com/chirag127
// @version      1.0.1
// @description  Detect unavailable playlist rows and duplicate video IDs. Never removes anything.
// @author       chirag127
// @license      MIT
// @match        https://www.youtube.com/*
// @require      https://raw.githubusercontent.com/chirag127/yt-core-lib/main/yt-core-lib-1.3.0.js
// @downloadURL  https://raw.githubusercontent.com/chirag127/yt-playlist-prune-userscript/main/yt-playlist-prune.user.js
// @updateURL    https://raw.githubusercontent.com/chirag127/yt-playlist-prune-userscript/main/yt-playlist-prune.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (typeof Ytk === 'undefined') { console.error('[yt-playlist-prune] core did not load'); return; }
  if (!Ytk.featureOn('prune', true)) return;

  const ROW_SEL = 'yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer';

  function onPlaylistSurface() {
    return location.pathname === '/playlist' || !!document.querySelector('ytd-playlist-panel-renderer');
  }

  function raw() { return Ytk.storeGet('settings', {}) || {}; }
  function cap(key, fallback, max) { return Math.max(1, Math.min(max, parseInt(raw()[key], 10) || fallback)); }

  function rowRoot() {
    const root = location.pathname === '/playlist'
      ? document.querySelector('ytd-playlist-video-list-renderer') || document.querySelector('ytd-browse[page-subtype="playlist"]')
      : document.querySelector('ytd-playlist-panel-renderer');
    return root || null;
  }

  // Scoped to the playlist itself so recommendation rails are never counted.
  function readRows() {
    const root = rowRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll(ROW_SEL)).slice(0, cap('pruneRowCap', 5000, 20000))
      .map(function (node, index) {
        const vm = node.data && node.data.lockupViewModel ? Ytk.lockupToItem(node.data.lockupViewModel) : null;
        const titleEl = node.querySelector('yt-lockup-metadata-view-model h3 a, a#video-title, #video-title');
        const link = titleEl || node.querySelector('a[href*="v="]');
        const match = ((link && link.getAttribute('href')) || '').match(/[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/);

        // Two ID sources: the view-model object and the rendered watch link.
        let id = vm && vm.id;
        if (!id && /^[A-Za-z0-9_-]{11}$/.test(node.contentId || '')) id = node.contentId;
        if (!id && match) id = match[1];

        const title = String(
          (vm && vm.title)
          || (titleEl && (titleEl.getAttribute('title') || titleEl.textContent))
          || ''
        ).trim();

        // Unavailable rows carry wording the API title no longer carries ("[Private video]",
        // "Video unavailable") and sometimes have no playable link at all.
        const unavailable = /^\s*\[(deleted|private|unavailable)/i.test(title)
          || /\b(private|deleted|unavailable)\s+video\b|\bvideo (?:is )?(?:unavailable|private|removed)\b/i.test(title)
          || !!(node.data && node.data.isPlayable === false)
          || (!id && /(private|deleted|unavailable|not available|removed)/i.test(node.textContent || ''));

        return { index: index + 1, id: id || null, title: title, unavailable: unavailable };
      });
  }

  function prune() {
    if (!onPlaylistSurface()) { Ytk.toast('Open a playlist first.'); return; }
    const rows = readRows();
    const seen = new Set();
    const findings = [];
    let dead = 0;
    let duplicates = 0;
    rows.forEach(function (row) {
      const duplicate = !!row.id && seen.has(row.id);
      if (row.id) seen.add(row.id);
      if (row.unavailable) dead++;
      if (duplicate) duplicates++;
      if (row.unavailable || duplicate) findings.push({ row: row, duplicate: duplicate });
    });

    Ytk.panel('Prune — detection only', function (body) {
      Ytk.kv(body, 'Rows scanned', rows.length);
      Ytk.kv(body, 'Unavailable rows', dead);
      Ytk.kv(body, 'Duplicate occurrences after first', duplicates);
      Ytk.note(body, 'Scans the rows currently loaded in the playlist, including rows a filter has hidden. Scroll first to load more, then scan again. Row cap: ' + cap('pruneRowCap', 5000, 20000) + '.');

      if (!rows.length) {
        Ytk.note(body, 'No playlist rows found. Wait for the playlist to render, then try again.');
      } else if (!findings.length) {
        Ytk.note(body, 'No unavailable rows and no duplicate video IDs in this scan.', 'ytk2-ok');
      }

      const show = cap('pruneShowLimit', 80, 1000);
      findings.slice(0, show).forEach(function (f) {
        const reasons = [];
        if (f.row.unavailable) reasons.push('unavailable');
        if (f.duplicate) reasons.push('duplicate ID ' + f.row.id);
        Ytk.note(body, '#' + f.row.index + ' · ' + (f.row.title || '(untitled unavailable row)') + ' — ' + reasons.join(' · '), 'ytk2-warn');
      });
      if (findings.length > show) {
        Ytk.note(body, (findings.length - show) + ' more not listed. Raise “Rows to list” in Settings…');
      }

      Ytk.note(body, 'Nothing is removed here. To remove these, open yt-multiselect, select unavailable / duplicate rows there, and use “Remove from this playlist”.');
    });
    if (!rows.length) Ytk.toast('No loaded rows to scan.');
  }

  const fields = [
    { key: 'pruneShowLimit', label: 'Rows to list', type: 'number', def: parseInt(raw().pruneShowLimit, 10) || 80, hint: 'Findings shown in the panel (1–1000).' },
    { key: 'pruneRowCap', label: 'Maximum loaded rows to scan', type: 'number', def: parseInt(raw().pruneRowCap, 10) || 5000, hint: '1–20000. Keeps a very long playlist from freezing the page.' }
  ];

  GM_registerMenuCommand('Settings…', function () {
    const before = raw();
    Ytk.openSettings({
      title: 'YT Playlist Prune',
      subtitle: 'Read-only detection of unavailable rows and duplicate IDs.',
      sectionTitle: 'Scan',
      fields: fields,
      // Core 1.2.0 rebuilds the settings object from its own defaults, so a key it does
      // not know is dropped when the popup saves. Re-merge this script's keys afterwards.
      onSave: function (next) { Ytk.storeSet('settings', Object.assign({}, before, next)); }
    });
  });

  let mounted = false;
  function mount() {
    if (mounted || !onPlaylistSurface()) return;
    mounted = true;
    Ytk.mountToolbar([{ label: 'Prune', run: prune }]);
  }
  mount();
  if (!mounted) document.addEventListener('yt-navigate-finish', mount);
})();
