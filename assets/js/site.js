/* ============================================================
   site.js — data.js를 읽어 화면을 그립니다.
   HTML에는 틀만 있고, 목록과 카드는 전부 여기서 만들어요.
   ============================================================ */
(function () {
  'use strict';

  var ME = document.currentScript;
  // 사이트 루트 주소 (dev/, devlog/ 아래 페이지에서도 같은 기준을 쓰기 위해)
  var BASE = ME ? ME.src.replace(/assets\/js\/site\.js[^]*$/, '') : './';

  var STATUS = { dev: '개발 중', paused: '일시 중지', done: '완료' };
  var TIERS = ['전국', '공모전', '지방', '교내'];
  var TIER_CLASS = { '전국': 't-national', '공모전': 't-contest', '지방': 't-regional', '교내': 't-school' };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var S = null; // window.SITE

  /* ---------- 도우미 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function url(p) {
    if (!p) return '';
    if (/^(https?:|mailto:|data:|blob:|#|\/)/.test(p)) return p;
    return BASE + p.replace(/^\.\//, '');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmtDate(d) { return d ? String(d).replace(/-/g, '.') : ''; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function projectById(id) {
    for (var i = 0; i < S.projects.length; i++) if (S.projects[i].id === id) return S.projects[i];
    return null;
  }
  function isLog(l) { return l.kind !== 'interlude'; }
  function displayName() { return (S.profile.name || '').trim() || S.profile.handle || ''; }

  function medalOf(result) {
    var r = String(result || '');
    if (/대상|최우수/.test(r)) return { cls: 'grand', ch: r.charAt(0), rank: 0 };
    if (/금/.test(r)) return { cls: 'gold', ch: '금', rank: 1 };
    if (/은/.test(r)) return { cls: 'silver', ch: '은', rank: 2 };
    if (/동/.test(r)) return { cls: 'bronze', ch: '동', rank: 3 };
    return { cls: 'other', ch: r.charAt(0) || '상', rank: 4 };
  }
  function tierIndex(t) { var i = TIERS.indexOf(t); return i < 0 ? TIERS.length : i; }
  function sortedAwards() {
    return (S.awards || []).map(function (a, i) { return { a: a, i: i }; }).sort(function (x, y) {
      return tierIndex(x.a.tier) - tierIndex(y.a.tier) ||
        (Number(y.a.year) || 0) - (Number(x.a.year) || 0) ||
        medalOf(x.a.result).rank - medalOf(y.a.result).rank ||
        x.i - y.i;
    }).map(function (o) { return o.a; });
  }
  function awardLabel(a) { return ((a.short || a.contest || '') + ' ' + (a.result || '')).trim(); }
  function awardsFor(id) { return (S.awards || []).filter(function (a) { return a.project && a.project === id; }); }
  function jamsFor(id) { return (S.jams || []).filter(function (j) { return j.project && j.project === id; }); }

  /* 스크린샷 자리. src가 없거나 깨지면 SCREENSHOT SOON */
  var SOON = '<div class="shot-soon">SCREENSHOT<br>SOON</div>';
  function shot(src, alt, still) {
    if (!src) return '<div class="shot">' + SOON + '</div>';
    var isGif = /\.gif(\?|$)/i.test(src);
    if (isGif) {
      // 평소엔 정지 이미지, 재생할 때만 GIF
      var first = still ? url(still) : '';
      return '<div class="shot" data-anim><img alt="' + esc(alt) + '" loading="lazy" decoding="async"' +
        ' src="' + esc(first || url(src)) + '" data-gif="' + esc(url(src)) + '"' +
        (first ? ' data-still="' + esc(first) + '"' : ' data-needs-still') + '></div>';
    }
    return '<div class="shot"><img alt="' + esc(alt) + '" loading="lazy" decoding="async" src="' + esc(url(src)) + '"></div>';
  }
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('shot')) {
      t.parentNode.removeAttribute('data-anim');
      t.parentNode.innerHTML = SOON;
    }
  }, true);

  function tagsHtml(tags) {
    if (!tags || !tags.length) return '';
    return '<ul class="tags">' + tags.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  }
  function stickers(p) {
    var h = '';
    if (p.status && STATUS[p.status]) h += '<span class="sticker ' + esc(p.status) + '">' + STATUS[p.status] + '</span>';
    if (p.dim) h += '<span class="sticker dim">' + esc(p.dim) + '</span>';
    awardsFor(p.id).forEach(function (a) { h += '<span class="sticker prize ' + medalOf(a.result).cls + '">' + esc(awardLabel(a)) + '</span>'; });
    if (jamsFor(p.id).length || p.jam) h += '<span class="sticker jam">게임잼</span>';
    return '<div class="meta">' + h + '</div>';
  }
  function actions(p, opts) {
    opts = opts || {};
    var h = '';
    if (p.play) h += '<a class="btn primary" href="' + esc(url(p.play)) + '" target="_blank" rel="noopener">플레이</a>';
    if (p.story && !opts.noStory) h += '<a class="btn ghost" href="' + esc(url(p.story)) + '">개발 비화</a>';
    if (opts.info) h += '<a class="btn ghost" href="' + esc(url('projects.html#' + p.id)) + '">프로젝트 정보</a>';
    return h ? '<div class="actions">' + h + '</div>' : '';
  }

  /* ---------- 상단 바 / 푸터 ---------- */
  function renderChrome(page) {
    var top = $('#top');
    if (top) {
      var nav = [['home', '홈', 'index.html'], ['projects', '프로젝트', 'projects.html'], ['devlogs', '개발 일지', 'devlogs.html']];
      top.className = 'topbar';
      top.innerHTML = '<div class="wrap"><a class="brand" href="' + url('index.html') + '"><span class="led" aria-hidden="true"></span>' +
        esc(displayName()) + '</a><nav class="nav" aria-label="주 메뉴">' +
        nav.map(function (n) {
          return '<a href="' + url(n[2]) + '"' + (page === n[0] ? ' aria-current="page"' : '') + '>' + n[1] + '</a>';
        }).join('') + '</nav></div>';
    }
    var foot = $('#foot');
    if (foot) {
      foot.className = 'wrap foot';
      var gh = (S.profile.socials || []).filter(function (s) { return /github/i.test(s.label || s.url); })[0];
      foot.innerHTML = '<span>© ' + new Date().getFullYear() + ' ' + esc(displayName()) + '</span>' +
        (gh ? '<a class="px" href="' + esc(gh.url) + '" target="_blank" rel="noopener">GitHub</a>' : '');
    }
  }

  /* ---------- 메인 ---------- */
  function renderHome() {
    var p = S.profile;
    var now = projectById(p.nowPlaying);
    var logCount = (S.devlogs || []).filter(isLog).length;
    var email = (p.email || '').trim();
    var gh = (p.socials || [])[0];
    var bLabel = email ? '메일 복사' : (gh ? gh.label : '');

    var hero = $('#hero');
    hero.innerHTML =
      '<section class="console booting" aria-label="소개">' +
        '<div class="bezel"><div class="bezel-top" aria-hidden="true"><span class="pwr"></span>POWER<span class="line"></span></div>' +
          '<div class="lcd"><div class="screen">' +
            '<div><h1 class="hello-name' + (displayName().length > 9 ? ' long' : '') + '">' + esc(displayName()) + '</h1>' +
              '<p class="hello-tag">' + esc(p.tagline || '게임을 만듭니다') + '</p>' +
              (p.affiliation ? '<p class="hello-tag">' + esc(p.affiliation) + '</p>' : '') +
              '<ul class="menu" id="lcd-menu">' +
                '<li><a href="#featured">대표 프로젝트</a></li>' +
                '<li><a href="#awards">수상</a></li>' +
                '<li><a href="' + url('projects.html') + '">전체 프로젝트</a></li>' +
                '<li><a href="' + url('devlogs.html') + '">개발 일지</a></li>' +
                '<li><a href="#contact">연락처</a></li>' +
              '</ul></div>' +
            '<div class="status"><h2>STATUS</h2><dl>' +
              '<dt>프로젝트</dt><dd>' + pad2(S.projects.length) + '</dd>' +
              '<dt>개발 일지</dt><dd>' + pad2(logCount) + '</dd>' +
              '<dt>수상</dt><dd>' + pad2((S.awards || []).length) + '</dd>' +
              '<dt>게임잼</dt><dd>' + pad2((S.jams || []).length) + '</dd>' +
            '</dl>' +
            (now ? '<div class="now"><small>지금 만드는 중</small><a href="' + url('projects.html#' + now.id) + '">' + esc(now.title) + '</a></div>' : '') +
            '</div>' +
          '</div></div>' +
        '</div>' +
        '<div class="controls">' +
          '<div class="dpad" role="group" aria-label="메뉴 커서">' +
            '<button class="u" type="button" data-dir="-1" aria-label="메뉴 위로">▲</button>' +
            '<button class="l" type="button" data-dir="-1" tabindex="-1" aria-hidden="true">◀</button>' +
            '<span class="c"></span>' +
            '<button class="r" type="button" data-dir="1" tabindex="-1" aria-hidden="true">▶</button>' +
            '<button class="d" type="button" data-dir="1" aria-label="메뉴 아래로">▼</button>' +
          '</div>' +
          '<div class="ab">' +
            (bLabel ? '<button class="btn-round" type="button" id="btn-b"><span class="cap">B</span><span class="lbl">' + esc(bLabel) + '</span></button>' : '<span></span>') +
            '<button class="btn-round" type="button" id="btn-a"><span class="cap">A</span><span class="lbl">선택</span></button>' +
          '</div>' +
          '<div class="pills">' +
            '<a class="pill" href="#lcd-menu" id="btn-select"><span class="cap"></span><span class="lbl">SELECT</span></a>' +
            '<a class="pill" href="' + url('projects.html') + '"><span class="cap"></span><span class="lbl">START</span></a>' +
          '</div>' +
          '<div class="grille" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
        '</div>' +
      '</section>';
    wireConsole(email, gh);

    renderFeatured();
    renderTrophies();
    renderPreview();
    renderRecent();
    renderTools();
    renderContact();
  }

  function wireConsole(email, gh) {
    var menu = $all('#lcd-menu a');
    var cur = 0;
    function setCursor(i, focus) {
      cur = (i + menu.length) % menu.length;
      menu.forEach(function (a, k) { a.classList.toggle('is-cursor', k === cur); });
      if (focus) menu[cur].focus({ preventScroll: true });
    }
    setCursor(0);
    menu.forEach(function (a, k) {
      a.addEventListener('mouseenter', function () { setCursor(k); });
      a.addEventListener('focus', function () { setCursor(k); });
      a.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setCursor(cur + 1, true); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setCursor(cur - 1, true); }
      });
    });
    $all('.dpad button').forEach(function (b) {
      b.addEventListener('click', function () { setCursor(cur + Number(b.getAttribute('data-dir'))); });
    });
    $('#btn-select').addEventListener('click', function (e) { e.preventDefault(); setCursor(cur + 1); });
    $('#btn-a').addEventListener('click', function () { menu[cur].click(); });
    var b = $('#btn-b');
    if (b) b.addEventListener('click', function () {
      if (email) copyText(email, function (ok) { flash(ok ? '메일 주소를 복사했어요' : '복사하지 못했어요. 직접 선택해 주세요'); });
      else if (gh) window.open(gh.url, '_blank', 'noopener');
    });

    var c = $('.console');
    if (reduceMotion) { c.classList.remove('booting'); c.classList.add('powered'); return; }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { c.classList.remove('booting'); c.classList.add('powered'); });
    });
  }

  function flash(msg) {
    var el = $('#copied');
    if (el) { el.textContent = msg; clearTimeout(flash.t); flash.t = setTimeout(function () { el.textContent = ''; }, 2600); }
  }
  function copyText(text, cb) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(fallback()); });
    } else cb(fallback());
    function fallback() {
      var t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(t); return ok;
    }
  }

  function featuredList() {
    var out = [];
    (S.featured || []).forEach(function (id) {
      var p = projectById(id);
      if (p) out.push(p);
      else console.warn('[site] featured에 있는 "' + id + '" 프로젝트를 projects에서 찾지 못했어요. id 철자를 확인하세요.');
    });
    return out.slice(0, 3);
  }

  function renderFeatured() {
    var el = $('#featured-list');
    var list = featuredList();
    if (!list.length) { el.innerHTML = '<div class="empty"><strong>대표작이 비어 있어요</strong>관리자 페이지의 프로필·대표작 탭에서 골라 주세요.</div>'; return; }
    el.innerHTML = list.map(function (p, i) {
      var lead = i === 0;
      var pts = (p.points || []).slice(0, lead ? 5 : 2);
      return '<article class="cart' + (lead ? ' is-lead' : '') + '"><div class="label">' +
        shot(p.thumb, p.title + ' 스크린샷', p.still) +
        '<div class="info">' + stickers(p) +
          '<h3><a href="' + url('projects.html#' + p.id) + '">' + esc(p.title) + '</a></h3>' +
          (p.summary ? '<p class="sum">' + esc(p.summary) + '</p>' : '') +
          (pts.length ? '<ul class="points">' + pts.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
          tagsHtml(p.tags) + actions(p) +
        '</div></div></article>';
    }).join('');
  }

  function awardRow(a) {
    var m = medalOf(a.result);
    var p = a.project ? projectById(a.project) : null;
    return '<li class="award"><span class="medal ' + m.cls + '" aria-hidden="true">' + esc(m.ch) + '</span>' +
      '<div><div class="title">' + esc(awardLabel(a)) + '</div><div class="sub">' + esc(a.contest || '') +
      (p ? ', <a href="' + url('projects.html#' + p.id) + '">' + esc(p.title) + '</a>' : '') + '</div></div>' +
      '<span class="year">' + esc(a.year || '') + '</span></li>';
  }
  function renderTrophies() {
    var el = $('#trophies');
    var awards = sortedAwards();
    var jams = S.jams || [];
    var groups = TIERS.map(function (t) { return { t: t, items: awards.filter(function (a) { return a.tier === t; }) }; });
    var other = awards.filter(function (a) { return TIERS.indexOf(a.tier) < 0; });
    if (other.length) groups.push({ t: '기타', items: other });
    var aHtml = groups.filter(function (g) { return g.items.length; }).map(function (g) {
      return '<div class="tier ' + (TIER_CLASS[g.t] || 't-school') + '"><h3 class="tier-name">' + esc(g.t) + '</h3>' +
        '<ul class="award-list">' + g.items.map(awardRow).join('') + '</ul></div>';
    }).join('');
    if (!aHtml) aHtml = '<div class="empty"><strong>수상 기록 없음</strong>관리자 페이지의 수상 탭에서 추가할 수 있어요.</div>';
    var jHtml = '';
    if (jams.length) {
      jHtml = '<div><h3 class="tier-name">게임잼</h3><ul class="jam-list">' + jams.map(function (j) {
        var p = j.project ? projectById(j.project) : null;
        return '<li class="jam"><div class="when">' + esc(j.period || '') + '</div><h3>' + esc(j.name || '') + '</h3>' +
          (j.theme ? '<p>주제: ' + esc(j.theme) + '</p>' : '') +
          (j.result ? '<p>결과: ' + esc(j.result) + '</p>' : '') +
          (p ? '<p>만든 게임: <a href="' + url('projects.html#' + p.id) + '">' + esc(p.title) + '</a></p>' : '') + '</li>';
      }).join('') + '</ul></div>';
    }
    el.className = 'trophies' + (jHtml ? '' : ' solo');
    el.innerHTML = '<div>' + aHtml + '</div>' + jHtml;
    var head = $('#awards-title');
    if (head) head.textContent = jHtml ? '수상과 게임잼' : '수상';
  }

  function cartLink(p) {
    return '<a class="cart-btn" href="' + url('projects.html#' + p.id) + '"><article class="cart"><div class="label">' +
      shot(p.thumb, p.title + ' 스크린샷', p.still) + stickers(p) +
      '<h3>' + esc(p.title) + '</h3>' + (p.summary ? '<p class="sum">' + esc(p.summary) + '</p>' : '') +
      '</div></article></a>';
  }
  function renderPreview() {
    var el = $('#preview');
    var feat = (S.featured || []);
    var rest = S.projects.filter(function (p) { return feat.indexOf(p.id) < 0; }).slice(0, 6);
    if (!rest.length) { $('#projects').hidden = true; return; }
    el.innerHTML = '<div class="grid-carts">' + rest.map(cartLink).join('') + '</div>';
  }

  function logHref(l) { return l.url ? url(l.url) : url('devlogs.html' + (l.project ? '?project=' + encodeURIComponent(l.project) : '') + '#log-' + l.no); }
  function renderRecent() {
    var el = $('#recent');
    var logs = (S.devlogs || []).filter(isLog).slice().sort(byDateDesc).slice(0, 5);
    if (!logs.length) { el.innerHTML = '<div class="empty"><strong>아직 올린 개발 일지가 없어요</strong>첫 기록이 올라오면 여기에 최근 5개가 보입니다.</div>'; return; }
    el.innerHTML = '<ul class="saves">' + logs.map(function (l) {
      var p = projectById(l.project);
      return '<li><a class="save" href="' + logHref(l) + '"><span class="no">#' + esc(l.no) + '</span>' +
        shot(l.thumb, l.title, l.still) +
        '<div><h3>' + esc(l.title) + '</h3><div class="d">' + fmtDate(l.date) + (p ? ' / ' + esc(p.title) : '') + '</div></div></a></li>';
    }).join('') + '</ul>';
  }

  function renderTools() {
    var el = $('#tools');
    var groups = S.profile.tools || [];
    if (!groups.length) { $('#sec-tools').hidden = true; return; }
    el.innerHTML = groups.map(function (g) {
      return '<div class="tool-group"><h3>' + esc(g.group) + '</h3><ul>' +
        (g.items || []).map(function (t) { return '<li class="key">' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }

  function renderContact() {
    var el = $('#contact-box');
    var p = S.profile;
    var email = (p.email || '').trim();
    var socials = (p.socials || []).filter(function (s) { return s.url; });
    el.innerHTML = '<div>' +
      (email ? '<a class="mail" href="mailto:' + esc(email) + '">' + esc(email) + '</a>' : (socials.length ? '' : '<p class="mail">연락처 준비 중</p>')) +
      (socials.length ? '<ul class="socials' + (email ? '' : ' big') + '">' + socials.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label || s.url) + '</a></li>';
      }).join('') + '</ul>' : '') +
      '<p class="copied" id="copied" aria-live="polite"></p></div>' +
      (email ? '<button class="btn" type="button" id="copy-mail">주소 복사</button>' : '');
    var b = $('#copy-mail');
    if (b) b.addEventListener('click', function () {
      copyText(email, function (ok) { flash(ok ? '메일 주소를 복사했어요' : '복사하지 못했어요. 직접 선택해 주세요'); });
    });
  }

  function byDateDesc(a, b) { return String(b.date).localeCompare(String(a.date)) || (Number(b.no) || 0) - (Number(a.no) || 0); }
  function byDateAsc(a, b) { return -byDateDesc(a, b); }

  /* ---------- 프로젝트 페이지 ---------- */
  var FILTERS = [
    ['all', '전체', function () { return true; }],
    ['dev', '개발 중', function (p) { return p.status === 'dev'; }],
    ['award', '수상작', function (p) { return awardsFor(p.id).length > 0; }],
    ['jam', '게임잼', function (p) { return jamsFor(p.id).length > 0 || !!p.jam; }],
    ['3d', '3D', function (p) { return String(p.dim).toUpperCase() === '3D'; }],
    ['2d', '2D', function (p) { return String(p.dim).toUpperCase() === '2D'; }],
    ['etc', '기타', function (p) { var d = String(p.dim || '').toUpperCase(); return d !== '2D' && d !== '3D'; }]
  ];
  function renderProjects() {
    var params = new URLSearchParams(location.search);
    var cur = params.get('filter') || 'all';
    if (!FILTERS.some(function (f) { return f[0] === cur; })) cur = 'all';
    var bar = $('#filters');
    var grid = $('#project-grid');

    function draw() {
      bar.innerHTML = FILTERS.map(function (f) {
        var n = S.projects.filter(f[2]).length;
        return '<button class="chip" type="button" data-f="' + f[0] + '" aria-pressed="' + (f[0] === cur) + '"' +
          (n === 0 && f[0] !== 'all' ? ' disabled' : '') + '>' + f[1] + '<span class="n">' + n + '</span></button>';
      }).join('');
      var fn = FILTERS.filter(function (f) { return f[0] === cur; })[0][2];
      var list = S.projects.filter(fn);
      grid.innerHTML = list.length ? '<div class="grid-carts">' + list.map(function (p) {
        return '<button class="cart-btn" type="button" data-id="' + esc(p.id) + '" aria-haspopup="dialog"><article class="cart"><div class="label">' +
          shot(p.thumb, p.title + ' 스크린샷', p.still) + stickers(p) +
          '<h3>' + esc(p.title) + '</h3>' + (p.summary ? '<p class="sum">' + esc(p.summary) + '</p>' : '') +
          '</div></article></button>';
      }).join('') + '</div>' : '<div class="empty"><strong>프로젝트가 없어요</strong>다른 필터를 골라 보세요.</div>';
      wireAnim(grid);
    }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b || b.disabled) return;
      cur = b.getAttribute('data-f');
      var q = new URLSearchParams(location.search);
      if (cur === 'all') q.delete('filter'); else q.set('filter', cur);
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
      draw();
    });
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (b) openProject(b.getAttribute('data-id'), b);
    });
    draw();

    var dlg = $('#project-sheet');
    var opener = null;
    function openProject(id, from) {
      var p = projectById(id);
      if (!p) return;
      opener = from || null;
      var imgs = [p.thumb].concat(p.images || []).filter(Boolean);
      var aw = awardsFor(p.id), jm = jamsFor(p.id);
      dlg.innerHTML = '<div class="sheet-body">' +
        '<div class="sheet-top"><div>' + stickers(p) + '<h2 id="sheet-title" style="margin-top:8px">' + esc(p.title) + '</h2></div>' +
        '<button class="close" type="button" data-close>닫기</button></div>' +
        '<div class="gallery">' + (imgs.length ? imgs.map(function (s) { return shot(s, p.title + ' 스크린샷'); }).join('') : shot('', '')) + '</div>' +
        (p.summary ? '<p>' + esc(p.summary) + '</p>' : '') +
        '<dl class="facts">' +
          (p.status ? '<dt>상태</dt><dd>' + esc(STATUS[p.status] || p.status) + '</dd>' : '') +
          (p.dim ? '<dt>형태</dt><dd>' + esc(p.dim) + '</dd>' : '') +
          (p.year ? '<dt>연도</dt><dd>' + esc(p.year) + '</dd>' : '') +
          (p.platform ? '<dt>플랫폼</dt><dd>' + esc(p.platform) + '</dd>' : '') +
          (p.role ? '<dt>맡은 일</dt><dd>' + esc(p.role) + '</dd>' : '') +
          (aw.length ? '<dt>수상</dt><dd>' + aw.map(function (a) { return esc(a.year + ' ' + a.contest + ' ' + a.result); }).join('<br>') + '</dd>' : '') +
          (jm.length ? '<dt>게임잼</dt><dd>' + jm.map(function (j) { return esc(j.name + (j.theme ? ' (주제: ' + j.theme + ')' : '')); }).join('<br>') + '</dd>' : '') +
        '</dl>' +
        ((p.points || []).length ? '<ul class="points">' + p.points.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
        tagsHtml(p.tags) + actions(p) +
        '</div>';
      dlg.setAttribute('aria-labelledby', 'sheet-title');
      if (!dlg.open) dlg.showModal();
      if (location.hash !== '#' + p.id) history.replaceState(null, '', location.pathname + location.search + '#' + p.id);
    }
    function closeSheet() {
      if (dlg.open) dlg.close();
    }
    dlg.addEventListener('close', function () {
      history.replaceState(null, '', location.pathname + location.search);
      if (opener) opener.focus();
    });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-close]')) closeSheet();
    });
    function fromHash() {
      var id = decodeURIComponent(location.hash.slice(1));
      if (id && projectById(id)) {
        var btn = $('button[data-id="' + id.replace(/"/g, '') + '"]');
        openProject(id, btn);
      }
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* ---------- 개발 일지 페이지 ---------- */
  function seasonOf(l) {
    var seasons = S.seasons || [];
    for (var i = 0; i < seasons.length; i++) {
      var s = seasons[i];
      if (s.start && l.date >= s.start && (!s.end || l.date <= s.end)) return s.id;
    }
    return null;
  }
  function renderDevlogs() {
    var all = (S.devlogs || []).slice();
    var seasons = (S.seasons || []).slice().sort(function (a, b) { return String(b.start).localeCompare(String(a.start)); });
    var params = new URLSearchParams(location.search);
    var st = {
      season: params.get('season') || (seasons[0] ? seasons[0].id : 'all'),
      project: params.get('project') || '',
      tag: params.get('tag') || '',
      q: params.get('q') || '',
      sort: params.get('sort') === 'old' ? 'old' : 'new'
    };
    if (st.season !== 'all' && !seasons.some(function (s) { return s.id === st.season; })) st.season = seasons[0] ? seasons[0].id : 'all';

    // 2번 이상 쓰인 태그만
    var tagCount = {};
    all.forEach(function (l) { (l.tags || []).forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; }); });
    var tags = Object.keys(tagCount).filter(function (t) { return tagCount[t] >= 2; }).sort(function (a, b) { return tagCount[b] - tagCount[a] || a.localeCompare(b); });

    var projIds = [];
    all.forEach(function (l) { if (l.project && projIds.indexOf(l.project) < 0) projIds.push(l.project); });

    var tabs = $('#season-tabs'), sel = $('#f-project'), q = $('#f-q'), sortBtn = $('#f-sort');
    var tagbar = $('#tagbar'), card = $('#proj-summary'), list = $('#log-list'), tl = $('#timeline');

    sel.innerHTML = '<option value="">모든 프로젝트</option>' + projIds.map(function (id) {
      var p = projectById(id);
      return '<option value="' + esc(id) + '">' + esc(p ? p.title : id) + '</option>';
    }).join('');
    if (st.project && projIds.indexOf(st.project) < 0) st.project = '';
    sel.value = st.project;
    q.value = st.q;

    function inSeason(l) { return st.season === 'all' || seasonOf(l) === st.season; }
    function syncUrl() {
      var p = new URLSearchParams();
      if (seasons.length && st.season !== seasons[0].id) p.set('season', st.season);
      if (st.project) p.set('project', st.project);
      if (st.tag) p.set('tag', st.tag);
      if (st.q) p.set('q', st.q);
      if (st.sort === 'old') p.set('sort', 'old');
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
    }
    function match(l) {
      if (!inSeason(l)) return false;
      if (st.project && l.project !== st.project) return false;
      if (st.tag && (l.tags || []).indexOf(st.tag) < 0) return false;
      if (st.q) {
        var hay = [l.title, l.summary, (l.tags || []).join(' '), (l.events || []).map(function (e) { return e.text; }).join(' ')].join(' ').toLowerCase();
        if (hay.indexOf(st.q.toLowerCase()) < 0) return false;
      }
      return true;
    }

    function draw() {
      tabs.innerHTML = seasons.map(function (s) {
        var n = all.filter(function (l) { return seasonOf(l) === s.id; }).length;
        return '<button type="button" role="tab" data-s="' + esc(s.id) + '" aria-selected="' + (st.season === s.id) + '">' + esc(s.name || s.id) + '<small>' + n + '</small></button>';
      }).join('') + '<button type="button" role="tab" data-s="all" aria-selected="' + (st.season === 'all') + '">전체 기록<small>' + all.length + '</small></button>';

      tagbar.innerHTML = tags.map(function (t) {
        return '<button class="chip" type="button" data-t="' + esc(t) + '" aria-pressed="' + (st.tag === t) + '">#' + esc(t) + '</button>';
      }).join('');
      tagbar.hidden = !tags.length;

      sortBtn.textContent = st.sort === 'new' ? '최신순' : '처음부터';
      sortBtn.setAttribute('aria-label', '정렬: ' + sortBtn.textContent + ' (누르면 바뀜)');

      if (st.project) {
        var p = projectById(st.project);
        var pl = all.filter(function (l) { return l.project === st.project && isLog(l); }).sort(byDateAsc);
        card.hidden = false;
        card.innerHTML = '<h2>' + esc(p ? p.title : st.project) + '</h2>' +
          '<div>로그<b>' + pl.length + '개</b></div>' +
          '<div>첫 기록<b>' + (pl[0] ? fmtDate(pl[0].date) : '-') + '</b></div>' +
          '<div>최근 기록<b>' + (pl.length ? fmtDate(pl[pl.length - 1].date) : '-') + '</b></div>';
      } else { card.hidden = true; card.innerHTML = ''; }

      var shown = all.filter(match).sort(st.sort === 'new' ? byDateDesc : byDateAsc);
      var months = [];
      var byMonth = {};
      shown.forEach(function (l) {
        var m = String(l.date || '').slice(0, 7) || '날짜 없음';
        if (!byMonth[m]) { byMonth[m] = []; months.push(m); }
        byMonth[m].push(l);
      });
      tl.innerHTML = months.length ? '<h2>타임라인</h2><ol>' + months.map(function (m) {
        return '<li><a href="#m-' + m + '">' + monthLabel(m, true) + '<span>' + byMonth[m].length + '</span></a></li>';
      }).join('') + '</ol>' : '';

      if (!all.length) {
        list.innerHTML = '<div class="empty"><strong>아직 올린 개발 일지가 없어요</strong>첫 기록이 올라오면 시즌과 달별로 정리돼 보입니다.</div>';
      } else if (!shown.length) {
        list.innerHTML = '<div class="empty"><strong>조건에 맞는 기록이 없어요</strong>검색어나 필터를 풀면 다시 보입니다. <button class="btn ghost" type="button" id="reset-f" style="margin-top:12px">필터 모두 풀기</button></div>';
        $('#reset-f').addEventListener('click', function () { st.project = ''; st.tag = ''; st.q = ''; sel.value = ''; q.value = ''; st.season = 'all'; syncUrl(); draw(); });
      } else {
        list.innerHTML = months.map(function (m) {
          return '<section class="month" id="m-' + m + '"><h2>' + monthLabel(m) + '</h2><ol class="logs">' +
            byMonth[m].map(logItem).join('') + '</ol></section>';
        }).join('') + '<p class="count-line">' + shown.filter(isLog).length + '개 기록' + (shown.some(function (l) { return !isLog(l); }) ? ', 쉬어 간 기간 포함' : '') + '</p>';
      }
      wireAnim(list);
      syncUrl();
    }
    function monthLabel(m, short) {
      if (!/^\d{4}-\d{2}$/.test(m)) return m;
      return short ? m.replace('-', '.') : m.slice(0, 4) + '년 ' + Number(m.slice(5)) + '월';
    }
    function logItem(l) {
      if (!isLog(l)) {
        return '<li id="log-' + esc(l.no) + '" class="interlude"><div class="top">쉬어 간 기간, ' + fmtDate(l.date) + (l.end ? ' ~ ' + fmtDate(l.end) : '') + '</div>' +
          '<h3>' + esc(l.title || '') + '</h3>' + (l.summary ? '<p>' + esc(l.summary) + '</p>' : '') +
          ((l.events || []).length ? '<ol>' + l.events.map(function (e) {
            return '<li><time>' + fmtDate(e.date) + '</time><span>' + esc(e.text) + '</span></li>';
          }).join('') + '</ol>' : '') + '</li>';
      }
      var p = projectById(l.project);
      var inner = shot(l.thumb, l.title, l.still) +
        '<div><div class="top"><span>#' + esc(l.no) + '</span><time>' + fmtDate(l.date) + '</time>' + (p ? '<span>' + esc(p.title) + '</span>' : '') + '</div>' +
        '<h3>' + esc(l.title) + '</h3>' + (l.summary ? '<p>' + esc(l.summary) + '</p>' : '') + tagsHtml(l.tags) + '</div>';
      return '<li id="log-' + esc(l.no) + '">' + (l.url ? '<a class="log" href="' + esc(url(l.url)) + '">' + inner + '</a>' : '<article class="log">' + inner + '</article>') + '</li>';
    }

    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-s]'); if (!b) return;
      st.season = b.getAttribute('data-s'); draw();
    });
    tabs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var bs = $all('button', tabs), i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      var n = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length];
      st.season = n.getAttribute('data-s'); draw();
      $('button[data-s="' + st.season + '"]', tabs).focus();
    });
    tagbar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]'); if (!b) return;
      var t = b.getAttribute('data-t'); st.tag = st.tag === t ? '' : t; draw();
    });
    sel.addEventListener('change', function () { st.project = sel.value; draw(); });
    var qt;
    q.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { st.q = q.value.trim(); draw(); }, 150); });
    sortBtn.addEventListener('click', function () { st.sort = st.sort === 'new' ? 'old' : 'new'; draw(); });
    draw();
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  /* ---------- 개발 비화 / 상세 글 ---------- */
  function renderStory() {
    var body = document.body;
    var kind = body.getAttribute('data-kind');
    var id = body.getAttribute('data-id');
    var head = $('#story-head'), side = $('#story-side'), pager = $('#pager'), gallery = $('#story-gallery');
    var item, p, imgs, prev, next;

    if (kind === 'devlog') {
      var logs = (S.devlogs || []).filter(function (l) { return isLog(l) && l.url; }).sort(byDateAsc);
      item = (S.devlogs || []).filter(function (l) { return String(l.no) === String(id); })[0];
      if (!item) { console.warn('[site] data.js에 ' + id + '번 개발 일지가 없어요.'); return; }
      p = projectById(item.project);
      document.title = item.title + ' | ' + displayName();
      head.innerHTML = '<a class="story-back" href="' + url('devlogs.html') + '">◀ 개발 일지</a>' +
        '<div class="story-head"><div class="story-kind">개발 일지 #' + esc(item.no) + ', ' + fmtDate(item.date) + '</div>' +
        '<h1>' + esc(item.title) + '</h1>' +
        (item.summary ? '<div class="lcd oneliner"><b>한 줄 요약</b>' + esc(item.summary) + '</div>' : '') +
        (p ? actions(p, { info: true }) : '') + '</div>';
      imgs = item.images || [];
      side.innerHTML = '<div><h2>정보</h2><dl class="facts">' +
        (p ? '<dt>프로젝트</dt><dd><a href="' + url('projects.html#' + p.id) + '">' + esc(p.title) + '</a></dd>' : '') +
        '<dt>날짜</dt><dd>' + fmtDate(item.date) + '</dd></dl></div>' +
        ((item.tags || []).length ? '<div><h2>태그</h2>' + tagsHtml(item.tags) + '</div>' : '');
      var i = logs.indexOf(item);
      prev = i > 0 ? logs[i - 1] : null; next = i >= 0 && i < logs.length - 1 ? logs[i + 1] : null;
      pager.innerHTML = (prev ? '<a class="prev" href="' + url(prev.url) + '"><small>이전 일지</small><strong>' + esc(prev.title) + '</strong></a>' : '') +
        (next ? '<a class="next" href="' + url(next.url) + '"><small>다음 일지</small><strong>' + esc(next.title) + '</strong></a>' : '');
    } else {
      var stories = S.projects.filter(function (x) { return x.story; });
      item = projectById(id);
      if (!item) { console.warn('[site] data.js에 "' + id + '" 프로젝트가 없어요. body의 data-id를 확인하세요.'); return; }
      document.title = item.title + ' 개발 비화 | ' + displayName();
      head.innerHTML = '<a class="story-back" href="' + url('projects.html#' + item.id) + '">◀ 프로젝트</a>' +
        '<div class="story-head"><div class="story-kind">개발 비화</div>' + stickers(item) +
        '<h1>' + esc(item.title) + '</h1>' +
        (item.summary ? '<div class="lcd oneliner"><b>한 줄 요약</b>' + esc(item.summary) + '</div>' : '') +
        actions(item, { noStory: true, info: true }) + '</div>';
      imgs = [item.thumb].concat(item.images || []).filter(Boolean);
      side.innerHTML = '<div><h2>정보</h2><dl class="facts">' +
        (item.status ? '<dt>상태</dt><dd>' + esc(STATUS[item.status] || item.status) + '</dd>' : '') +
        (item.year ? '<dt>연도</dt><dd>' + esc(item.year) + '</dd>' : '') +
        (item.platform ? '<dt>플랫폼</dt><dd>' + esc(item.platform) + '</dd>' : '') +
        (item.role ? '<dt>맡은 일</dt><dd>' + esc(item.role) + '</dd>' : '') +
        '</dl></div>' +
        ((item.tags || []).length ? '<div><h2>사용 기술</h2>' + tagsHtml(item.tags) + '</div>' : '');
      var k = stories.indexOf(item);
      prev = k > 0 ? stories[k - 1] : null; next = k >= 0 && k < stories.length - 1 ? stories[k + 1] : null;
      pager.innerHTML = (prev ? '<a class="prev" href="' + url(prev.story) + '"><small>이전 개발 비화</small><strong>' + esc(prev.title) + '</strong></a>' : '') +
        (next ? '<a class="next" href="' + url(next.story) + '"><small>다음 개발 비화</small><strong>' + esc(next.title) + '</strong></a>' : '');
    }

    if (gallery) {
      gallery.innerHTML = (imgs.length ? imgs : ['']).map(function (s, n) {
        return s ? '<button class="shot-btn" type="button" data-n="' + n + '" aria-label="스크린샷 ' + (n + 1) + ' 크게 보기">' + shot(s, '스크린샷 ' + (n + 1)) + '</button>' : shot('', '');
      }).join('');
      wireAnim(gallery);
      wireZoom(gallery, imgs);
    }
  }

  function wireZoom(gallery, imgs) {
    var dlg = document.createElement('dialog');
    dlg.className = 'zoom';
    dlg.setAttribute('aria-label', '스크린샷 크게 보기');
    document.body.appendChild(dlg);
    var cur = 0;
    function show(n) {
      cur = (n + imgs.length) % imgs.length;
      dlg.innerHTML = '<img src="' + esc(url(imgs[cur])) + '" alt="스크린샷 ' + (cur + 1) + '">' +
        '<div class="zoom-bar">' + (imgs.length > 1 ? '<button type="button" data-z="-1">이전</button>' : '<span></span>') +
        '<button type="button" data-z="0">닫기</button>' + (imgs.length > 1 ? '<button type="button" data-z="1">다음</button>' : '<span></span>') + '</div>';
      if (!dlg.open) dlg.showModal();
    }
    gallery.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-n]');
      if (b && !b.querySelector('.shot-soon')) show(Number(b.getAttribute('data-n')));
    });
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-z]');
      if (b) { var z = Number(b.getAttribute('data-z')); if (z === 0) dlg.close(); else show(cur + z); }
      else if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
  }

  /* ---------- GIF는 필요한 것만 재생 ---------- */
  var io = null;
  function wireAnim(root) {
    var shots = $all('.shot[data-anim] img', root);
    shots.forEach(function (img) {
      if (img.hasAttribute('data-wired')) return;
      img.setAttribute('data-wired', '');
      if (img.hasAttribute('data-needs-still')) makeStill(img);
      if (reduceMotion) return;
      var host = img.closest('.cart-btn, .save, .log, .cart, .shot-btn') || img.parentNode;
      if (canHover) {
        host.addEventListener('mouseenter', function () { play(img, true); });
        host.addEventListener('mouseleave', function () { play(img, false); });
        host.addEventListener('focusin', function () { play(img, true); });
        host.addEventListener('focusout', function () { play(img, false); });
      } else {
        if (!io && 'IntersectionObserver' in window) {
          // 화면 가운데 띠에 들어온 카드만 재생
          io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { play(en.target, en.isIntersecting); });
          }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
        }
        if (io) io.observe(img);
      }
    });
  }
  function play(img, on) {
    var gif = img.getAttribute('data-gif'), still = img.getAttribute('data-still');
    if (!gif || !still) return;
    var want = on ? gif : still;
    if (img.getAttribute('src') !== want) img.setAttribute('src', want);
  }
  // 정지 이미지가 없는 GIF는 첫 화면을 캔버스로 떠서 씀
  function makeStill(img) {
    img.removeAttribute('data-needs-still');
    function grab() {
      try {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w) return;
        var scale = Math.min(1, 480 / w);
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var still = c.toDataURL('image/webp', 0.8);
        img.setAttribute('data-still', still);
        img.setAttribute('src', still);
      } catch (e) { /* 다른 도메인 이미지면 그대로 둠 */ }
    }
    if (img.complete && img.naturalWidth) grab(); else img.addEventListener('load', grab, { once: true });
  }

  /* ---------- 시작 ---------- */
  function normalize(d) {
    d.profile = d.profile || {};
    ['featured', 'seasons', 'awards', 'jams', 'projects', 'devlogs'].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    return d;
  }
  function start(data) {
    if (!data) {
      var m = document.querySelector('main');
      if (m) m.innerHTML = '<div class="wrap"><div class="empty" style="margin-top:40px"><strong>내용을 불러오지 못했어요</strong>assets/js/data.js 파일이 있는지, 문법 오류가 없는지 확인하세요.</div></div>';
      return;
    }
    S = normalize(data);
    var page = document.body.getAttribute('data-page');
    renderChrome(page);
    if (page === 'home') renderHome();
    else if (page === 'projects') renderProjects();
    else if (page === 'devlogs') renderDevlogs();
    else if (page === 'story') renderStory();
    wireAnim(document);
  }
  function load() {
    // GitHub Pages는 data.js를 최대 10분 캐시함 → 1분 단위 숫자를 붙여 새로 받기
    var s = document.createElement('script');
    s.src = BASE + 'assets/js/data.js?v=' + Math.floor(Date.now() / 60000);
    s.onload = function () { start(window.SITE); };
    s.onerror = function () { start(window.SITE || null); };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
