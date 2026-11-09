// ==UserScript==
// @name         YT Playlist Prune
// @namespace    https://github.com/chirag127
// @version      1.0.0
// @description  Detect unavailable playlist rows and duplicate video IDs. Never removes anything.
// @author       chirag127
// @license      MIT
// @match        https://www.youtube.com/*
// @require https://raw.githubusercontent.com/chirag127/yt-core-lib/main/yt-core-lib-1.2.0.js
// @downloadURL  https://raw.githubusercontent.com/chirag127/yt-playlist-prune-userscript/main/yt-playlist-prune.user.js
// @updateURL    https://raw.githubusercontent.com/chirag127/yt-playlist-prune-userscript/main/yt-playlist-prune.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
  if (typeof Ytk === 'undefined') { console.error('[yt-playlist-prune] core did not load'); return; }
  if (!Ytk.featureOn('prune', true)) return;
  if (location.pathname !== '/playlist' && !document.querySelector('ytd-playlist-panel-renderer')) return;

  function options() { return Ytk.storeGet('settings', {}) || {}; }
  function limit(key, fallback, max) { return Math.max(1, Math.min(max, Number(options()[key]) || fallback)); }

  // Keep recommendations outside the playlist out of the scan.
  function readRows() {
    const root = location.pathname === '/playlist'
      ? document.querySelector('ytd-playlist-video-list-renderer, ytd-browse[page-subtype="playlist"]')
      : document.querySelector('ytd-playlist-panel-renderer');
    if (!root) return [];
    return Array.from(root.querySelectorAll('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer'))
      .slice(0, limit('pruneRowCap', 5000, 20000)).map(function (node, index) {
        const data = node.contentId ? node : (node.data && (node.data.lockupViewModel || node.data)) || node.lockupViewModel || node;
        const item = Ytk.lockupToItem(data) || {};
        const titleEl = node.querySelector('yt-lockup-metadata-view-model h3 a, a#video-title, #video-title');
        const link = titleEl && titleEl.getAttribute('href') ? titleEl : node.querySelector('a[href*="v="]');
        const match = ((link && link.getAttribute('href')) || '').match(/[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/);
        const id = item.id || (/^[A-Za-z0-9_-]{11}$/.test(data.videoId || '') ? data.videoId : null) || (match && match[1]);
        const title = (item.title || Ytk.textOf(data.title) || (titleEl && (titleEl.getAttribute('title') || titleEl.textContent)) || '').trim();
        const texts = Ytk.deepTexts(data).join(' ') + ' ' + (node.textContent || '');
        const unavailable = /\b(?:deleted|private|unavailable)\s*(?:video)?\b|video (?:is )?(?:not available|removed)/i.test(title)
          || (!id && /\b(?:deleted|private|unavailable|not available|removed)\b/i.test(texts))
          || data.isPlayable === false;
        return { index: index + 1, id: id, title: title, unavailable: unavailable };
      });
  }

  function prune() {
    if (location.pathname !== '/playlist' && !document.querySelector('ytd-playlist-panel-renderer')) {
      Ytk.toast('Open a playlist first.'); return;
    }
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
    Ytk.panel('Playlist prune — detection only', function (body) {
      Ytk.kv(body, 'Rendered rows scanned', rows.length);
      Ytk.kv(body, 'Unavailable rows', dead);
      Ytk.kv(body, 'Duplicate occurrences after first', duplicates);
      Ytk.note(body, 'Loaded rows only, including rows hidden by a filter. Scroll to load more, then scan again. Scan cap: ' + limit('pruneRowCap', 5000, 20000) + '.');
      if (!rows.length) Ytk.note(body, 'No playlist rows found yet. Wait for the playlist to load and try again.');
      else if (!findings.length) Ytk.note(body, 'No unavailable rows or duplicate video IDs detected in this scan.', 'ytk2-ok');
      const show = limit('pruneShowLimit', 80, 1000);
      findings.slice(0, show).forEach(function (finding) {
        const row = finding.row;
        const reasons = [row.unavailable ? 'unavailable' : '', finding.duplicate ? 'duplicate ID ' + row.id : ''].filter(Boolean);
        Ytk.note(body, '#' + row.index + ' · ' + (row.title || '(untitled unavailable row)') + ' — ' + reasons.join(' · '), 'ytk2-warn');
      });
      if (findings.length > show) Ytk.note(body, (findings.length - show) + ' more findings not displayed. Increase Rows to list in Settings…');
      Ytk.note(body, 'Nothing is removed. Removal belongs to yt-multiselect: select unavailable / duplicate rows there, then use Remove from this playlist.');
    });
    if (!rows.length) Ytk.toast('No loaded playlist rows to scan.');
  }

  GM_registerMenuCommand('Settings…', function () {
    const saved = options();
    const fields = [
      { key: 'pruneShowLimit', label: 'Rows to list', type: 'number', def: saved.pruneShowLimit ?? 80 },
      { key: 'pruneRowCap', label: 'Maximum loaded rows to scan (1–20000)', type: 'number', def: saved.pruneRowCap ?? 5000 }
    ];
    Ytk.openSettings({
      title: 'YT Playlist Prune', subtitle: 'Read-only detection; removal belongs to Multiselect.', sectionTitle: 'Scan limits', fields: fields,
      // Core 1.2.0 drops custom keys when saving; retain them without modifying the core.
      onSave: function (next) { Ytk.storeSet('settings', Object.assign({}, saved, Object.fromEntries(fields.map(function (f) { return [f.key, f.def]; })), next)); }
    });
  });
  Ytk.mountToolbar([{ label: 'Prune', run: prune }]);
})();
