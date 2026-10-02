/* ============================================================
   admin/md.js — 마크다운 → HTML, 개발 비화/상세 글 HTML 틀
   관리자 페이지에서만 씁니다. (Node에서도 require 가능)
   ============================================================ */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(javascript|vbscript|data:text)/i.test(u)) return '#';
    return u;
  }

  /* 한 줄 안의 문법: 코드, 이미지, 링크, 굵게, 기울임, 취소선 */
  function inline(src, resolve) {
    var codes = [];
    var s = String(src).replace(/`([^`]+)`/g, function (_, c) { codes.push('<code>' + esc(c) + '</code>'); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (_, alt, u, title) {
      var real = u.replace(/&amp;/g, '&');
      var shown = resolve ? resolve(real) : real;
      return '<img src="' + esc(safeUrl(shown)) + '" alt="' + alt + '"' + (title ? ' title="' + title + '"' : '') + ' loading="lazy">';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, text, u) {
      var real = u.replace(/&amp;/g, '&');
      var ext = /^https?:/i.test(real);
      return '<a href="' + esc(safeUrl(real)) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + text + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return codes[Number(i)]; });
    return s;
  }

  /* 블록: 제목, 문단, 목록, 인용, 코드 블록, 구분선, 이미지 한 줄 */
  function render(md, resolve) {
    var lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;
    function isBlank(l) { return /^\s*$/.test(l); }
    while (i < lines.length) {
      var l = lines[i];
      if (isBlank(l)) { i++; continue; }
      var m;
      if ((m = l.match(/^```\s*([\w+-]*)\s*$/))) {
        var buf = []; i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre><code' + (m[1] ? ' class="lang-' + esc(m[1]) + '"' : '') + '>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }
      if ((m = l.match(/^(#{2,4})\s+(.*)$/))) {
        var lv = m[1].length;
        out.push('<h' + lv + '>' + inline(m[2].replace(/\s+#+\s*$/, ''), resolve) + '</h' + lv + '>');
        i++; continue;
      }
      if (/^#\s+/.test(l)) { // 본문 안의 h1은 h2로 (페이지 제목은 위에 따로 있음)
        out.push('<h2>' + inline(l.replace(/^#\s+/, ''), resolve) + '</h2>'); i++; continue;
      }
      if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(l.trim())) { out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(l)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + render(q.join('\n'), resolve) + '</blockquote>');
        continue;
      }
      if (/^\s*([-*+])\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l)) {
        var ordered = /^\s*\d+[.)]\s+/.test(l);
        var items = [];
        while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/).test(lines[i])) {
          var item = lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/, '');
          i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) { item += ' ' + lines[i].trim(); i++; }
          items.push('<li>' + inline(item, resolve) + '</li>');
        }
        out.push(ordered ? '<ol>' + items.join('') + '</ol>' : '<ul>' + items.join('') + '</ul>');
        continue;
      }
      var para = [];
      while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,4}\s|```|>\s?|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      var text = para.join('\n');
      if (/^!\[[^\]]*\]\([^)]+\)$/.test(text.trim())) out.push(inline(text.trim(), resolve));
      else out.push('<p>' + inline(text, resolve).replace(/\n/g, '<br>') + '</p>');
    }
    return out.join('\n');
  }

  /* 스크립트 안에 넣을 때 </script 와 <!-- 를 깨지지 않게 */
  function packMd(md) { return String(md).replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--'); }
  function unpackMd(s) { return String(s).replace(/<\\\/(script)/gi, '</$1').replace(/<\\!--/g, '<!--'); }

  var PRETENDARD = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

  /* opts: { kind: 'project'|'devlog', id, title, siteName, md, depth } */
  function buildPage(opts) {
    var up = new Array((opts.depth == null ? 1 : opts.depth) + 1).join('../');
    var body = render(opts.md || '');
    return '<!doctype html>\n' +
      '<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(opts.title || '') + (opts.siteName ? ' | ' + esc(opts.siteName) : '') + '</title>\n' +
      '<meta name="theme-color" content="#cdc8b6">\n' +
      '<link rel="stylesheet" href="' + PRETENDARD + '">\n' +
      '<link rel="stylesheet" href="' + up + 'assets/css/site.css">\n' +
      '<link rel="stylesheet" href="' + up + 'assets/css/story.css">\n' +
      '</head>\n' +
      '<body data-page="story" data-kind="' + esc(opts.kind) + '" data-id="' + esc(opts.id) + '">\n' +
      '<header id="top"></header>\n' +
      '<main class="wrap story">\n' +
      '  <div id="story-head"></div>\n' +
      '  <div class="story-gallery" id="story-gallery"></div>\n' +
      '  <div class="story-cols">\n' +
      '    <article class="story-body" id="story-body">\n' + body + '\n    </article>\n' +
      '    <aside class="story-side" id="story-side"></aside>\n' +
      '  </div>\n' +
      '  <nav class="pager" id="pager" aria-label="다른 글"></nav>\n' +
      '</main>\n' +
      '<footer id="foot"></footer>\n' +
      '<!-- 아래는 관리자 페이지에서 다시 열어 고칠 때 쓰는 마크다운 원문입니다 -->\n' +
      '<script type="text/markdown" id="story-md">\n' + packMd(opts.md || '') + '\n<\/script>\n' +
      '<script src="' + up + 'assets/js/site.js"><\/script>\n' +
      '</body>\n</html>\n';
  }

  /* 기존 HTML에서 마크다운 원문 꺼내기 */
  function extractMd(html) {
    var m = String(html).match(/<script type="text\/markdown" id="story-md">\n?([\s\S]*?)\n?<\/script>/);
    return m ? unpackMd(m[1]) : null;
  }

  var api = { render: render, inline: inline, buildPage: buildPage, extractMd: extractMd, packMd: packMd, unpackMd: unpackMd, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MD = api;
})(this);
