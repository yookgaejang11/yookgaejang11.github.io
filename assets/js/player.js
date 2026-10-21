/* ============================================================
   막넣 플레이어 — 유튜브 링크를 붙여넣으면 대기열에 넣고 이어서 재생
   대기열은 보는 사람 각자의 브라우저(localStorage)에만 저장됩니다.
   ============================================================ */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const KEY = 'makneot.queue.v1';
  const KIND = { video: '영상', short: '쇼츠', live: '라이브', playlist: '플리' };
  const REPEAT_LABEL = { off: '반복 꺼짐', all: '전체 반복', one: '한 곡 반복' };

  let queue = [], cur = -1, repeat = 'off', volume = 100;
  let player = null, ready = false, loadState = 'loading';
  let idle = true, finished = false;

  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && Array.isArray(d.queue)) {
      queue = d.queue.filter(x => x && x.id && KIND[x.kind]);
      cur = Math.min(typeof d.cur === 'number' ? d.cur : -1, queue.length - 1);
      repeat = REPEAT_LABEL[d.repeat] ? d.repeat : 'off';
    }
  } catch (e) { /* 저장된 게 없거나 막혀 있으면 빈 대기열로 시작 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ queue, cur, repeat })); } catch (e) { /* 저장 못 해도 재생은 됨 */ } };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 링크 해석 ---------- */
  const URL_RE = /(?:https?:\/\/)?(?:[\w-]+\.)*(?:youtube(?:-nocookie)?\.com|youtu\.be)\/[A-Za-z0-9\-._~:\/?#@!$&*+;=%]+/gi;
  const ID11 = /^[\w-]{11}/;

  function parseTime(t) {
    if (!t) return 0;
    if (/^\d+s?$/.test(t)) return parseInt(t, 10);
    const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!m) return 0;
    return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
  }

  function parseOne(raw) {
    let s = raw.replace(/[.!?;:]+$/, '');
    if (!/^https?:/i.test(s)) s = 'https://' + s;
    let u;
    try { u = new URL(s); } catch (e) { return null; }
    const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
    const p = u.pathname.split('/').filter(Boolean);
    const q = u.searchParams;
    const start = parseTime(q.get('t') || q.get('start') || '');

    if (host === 'youtu.be') {
      const m = (p[0] || '').match(ID11);
      return m ? { kind: 'video', id: m[0], start } : null;
    }
    if (p[0] === 'watch') {
      const m = (q.get('v') || '').match(ID11);
      if (m) return { kind: 'video', id: m[0], start };
    }
    if (['shorts', 'embed', 'live', 'v', 'e'].includes(p[0])) {
      const m = (p[1] || '').match(ID11);
      if (m) return { kind: p[0] === 'shorts' ? 'short' : p[0] === 'live' ? 'live' : 'video', id: m[0], start };
    }
    const list = q.get('list');
    if (list && /^[\w-]{10,}$/.test(list)) return { kind: 'playlist', id: list, start: 0 };
    return null;
  }

  const keyOf = it => (it.kind === 'playlist' ? 'p:' : 'v:') + it.id;

  function addFromText(text) {
    // 공백 없이 붙어 있는 링크(…abchttps://…)를 떼어 놓는다
    text = text.replace(/(\S)(https?:\/\/)/g, '$1 $2');
    const toks = text.match(URL_RE) || [];
    const others = (text.match(/https?:\/\/[^\s]+/gi) || []).filter(u => !/youtu\.?be/i.test(u)).length;
    const seen = new Set(queue.map(keyOf));
    const added = [];
    let dup = 0, bad = others;
    for (const t of toks) {
      const r = parseOne(t);
      if (!r) { bad++; continue; }
      const k = keyOf(r);
      if (seen.has(k)) { dup++; continue; }
      seen.add(k);
      added.push({ uid: uid(), ...r, title: '', author: '', thumb: '' });
    }
    if (toks.length || others) report(added, dup, bad);
    if (added.length) {
      const first = queue.length;
      queue.push(...added);
      save(); render(); fetchMeta();
      if (ready && idle) playAt(finished || cur < 0 ? first : cur);
      else if (cur < 0) { cur = first; save(); render(); }
    }
    return toks.length;
  }

  function report(added, dup, bad) {
    const by = {};
    added.forEach(a => { by[a.kind] = (by[a.kind] || 0) + 1; });
    const parts = [];
    const got = Object.keys(KIND).filter(k => by[k]).map(k => `${KIND[k]} ${by[k]}`).join(', ');
    if (got) parts.push(`<b>${got} 넣음</b>`);
    if (dup) parts.push(`중복 ${dup}개 건너뜀`);
    if (bad) parts.push(`못 알아본 링크 ${bad}개`);
    $('#result').innerHTML = parts.length ? parts.join(', ') : '유튜브 링크를 찾지 못했어요';
  }

  /* ---------- 제목 · 썸네일 ---------- */
  let metaBusy = false;
  async function getJSON(u) {
    try { const r = await fetch(u); if (!r.ok) return null; const j = await r.json(); return j && !j.error ? j : null; }
    catch (e) { return null; }
  }
  async function fetchMeta() {
    if (metaBusy) return;
    metaBusy = true;
    for (const it of [...queue]) {
      if (it.title || it.metaTried || !queue.includes(it)) continue;
      it.metaTried = true;
      const page = it.kind === 'playlist'
        ? `https://www.youtube.com/playlist?list=${it.id}`
        : `https://www.youtube.com/watch?v=${it.id}`;
      const d = await getJSON('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(page))
             || await getJSON('https://noembed.com/embed?url=' + encodeURIComponent(page));
      if (d && d.title) {
        it.title = d.title;
        it.author = d.author_name || '';
        if (it.kind === 'playlist' && d.thumbnail_url) it.thumb = d.thumbnail_url;
        save(); render();
      }
    }
    metaBusy = false;
  }

  /* ---------- 화면 그리기 ---------- */
  const fmtTime = s => { const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; };
  const labelOf = it => it.title || (it.kind === 'playlist' ? `플레이리스트 ${it.id.slice(0, 12)}…` : it.id);
  const urlOf = it => it.kind === 'playlist'
    ? `https://www.youtube.com/playlist?list=${it.id}`
    : `https://www.youtube.com/watch?v=${it.id}${it.start ? '&t=' + it.start + 's' : ''}`;

  function render() {
    const list = $('#list');
    list.innerHTML = queue.map((it, i) => {
      const thumb = it.kind === 'playlist'
        ? (it.thumb ? `<img class="thumb" src="${esc(it.thumb)}" alt="" loading="lazy">` : '<div class="thumb pl">PLAYLIST</div>')
        : `<img class="thumb" src="https://i.ytimg.com/vi/${esc(it.id)}/mqdefault.jpg" alt="" loading="lazy">`;
      const chips = [];
      if (it.kind === 'short') chips.push('<span class="sticker dim">쇼츠</span>');
      if (it.kind === 'live') chips.push('<span class="sticker dev">라이브</span>');
      if (it.kind === 'playlist') chips.push('<span class="sticker jam">플리</span>');
      if (it.start) chips.push(`<span>${fmtTime(it.start)}부터</span>`);
      if (it.blocked) chips.push('<span class="sticker bad">퍼가기 막힘</span>');
      if (it.author) chips.push(`<span class="who">${esc(it.author)}</span>`);
      return `<li class="item${i === cur ? ' cur' : ''}" draggable="true" tabindex="0" data-i="${i}" aria-label="${i + 1}번 ${esc(labelOf(it))}${i === cur ? ', 현재 곡' : ''}">
        <span class="idx">${i === cur ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' : i + 1}</span>
        ${thumb}
        <div class="info"><div class="ttl">${esc(labelOf(it))}</div>${chips.length ? `<div class="qmeta">${chips.join('')}</div>` : ''}</div>
        <div class="acts">
          <button class="ib" type="button" data-act="up" aria-label="위로">▲</button>
          <button class="ib" type="button" data-act="down" aria-label="아래로">▼</button>
          <button class="ib del" type="button" data-act="del" aria-label="빼기">✕</button>
        </div>
      </li>`;
    }).join('');
    $('#empty').hidden = queue.length > 0;

    const by = {};
    queue.forEach(a => { by[a.kind] = (by[a.kind] || 0) + 1; });
    $('#counts').textContent = queue.length
      ? `${queue.length}개: ` + Object.keys(KIND).filter(k => by[k]).map(k => `${KIND[k]} ${by[k]}`).join(', ')
      : '';

    // YouTube 자체 임시 재생목록 링크 (영상만, 최대 50개)
    const from = Math.max(cur, 0);
    const ids = queue.slice(from).concat(queue.slice(0, from)).filter(x => x.kind !== 'playlist').map(x => x.id).slice(0, 50);
    const yt = $('#ytOpen');
    if (ids.length) { yt.href = 'https://www.youtube.com/watch_videos?video_ids=' + ids.join(','); yt.removeAttribute('aria-disabled'); yt.removeAttribute('tabindex'); }
    else { yt.removeAttribute('href'); yt.setAttribute('aria-disabled', 'true'); yt.setAttribute('tabindex', '-1'); }

    $('#repeatLbl').textContent = REPEAT_LABEL[repeat];
    $('#repeatBtn').setAttribute('aria-pressed', String(repeat !== 'off'));
    $('#repeatBtn').setAttribute('aria-label', '반복 방식: ' + REPEAT_LABEL[repeat]);
    renderIdle();
    renderNow();
  }

  /* 영상이 없을 때 화면에 액정 안내를 띄움 */
  function renderIdle() {
    const show = !ready || cur < 0 || !queue[cur];
    $('#idle').hidden = !show;
    if (!show) return;
    $('#idleText').textContent =
      loadState === 'failed' ? '플레이어를 불러오지 못했어요' :
      !ready ? '플레이어 불러오는 중…' :
      queue.length ? 'A 버튼을 누르면 1번부터 시작해요' : '유튜브 링크를 붙여넣으면 여기서 재생돼요';
  }

  function renderNow(sub) {
    const it = queue[cur];
    $('#nowTitle').textContent = it ? labelOf(it) : '재생 대기 중';
    if (sub !== undefined) { $('#nowSub').textContent = sub; return; }
    if (!it) { $('#nowSub').textContent = queue.length ? 'A 버튼을 누르면 1번부터 시작해요' : '링크를 붙여넣으면 바로 시작해요'; return; }
    if (finished) { $('#nowSub').textContent = '대기열 끝까지 다 틀었어요'; return; }
    let s = `${cur + 1} / ${queue.length}, ${KIND[it.kind]}`;
    if (it.kind === 'playlist' && ready) {
      try {
        const pl = player.getPlaylist() || [], idx = player.getPlaylistIndex();
        const vd = player.getVideoData() || {};
        if (pl.length && idx >= 0) s += ` ${idx + 1}/${pl.length}${vd.title ? ': ' + vd.title : ''}`;
      } catch (e) { /* 플레이리스트 정보가 아직 없음 */ }
    }
    $('#nowSub').textContent = s;
  }

  function setPlaying(on) {
    document.body.classList.toggle('is-playing', on);
    $('#playLbl').textContent = on ? '일시정지' : '재생';
    $('#playBtn').setAttribute('aria-label', on ? '일시정지' : '재생');
  }

  /* ---------- 재생 제어 ---------- */
  function playAt(i) {
    if (i < 0 || i >= queue.length) return;
    cur = i; finished = false; save(); render();
    if (!ready) return;
    const it = queue[i];
    if (it.kind === 'playlist') player.loadPlaylist({ list: it.id, listType: 'playlist', index: 0 });
    else player.loadVideoById({ videoId: it.id, startSeconds: it.start || 0 });
  }

  function inPlaylist() {
    const it = queue[cur];
    if (!it || it.kind !== 'playlist' || !ready) return null;
    try { return { idx: player.getPlaylistIndex(), len: (player.getPlaylist() || []).length }; } catch (e) { return null; }
  }

  function next(auto) {
    const pl = inPlaylist();
    if (!auto && pl && pl.idx < pl.len - 1) { player.nextVideo(); return; }
    let n = cur + 1;
    if (n >= queue.length) {
      if (repeat === 'all' && queue.length) n = 0;
      else { finished = true; idle = true; setPlaying(false); renderNow(); return; }
    }
    playAt(n);
  }

  function prev() {
    const pl = inPlaylist();
    if (pl && pl.idx > 0) { player.previousVideo(); return; }
    if (ready) {
      try { if (player.getCurrentTime() > 4) { player.seekTo(queue[cur]?.start || 0, true); return; } } catch (e) { /* 무시 */ }
    }
    let n = cur - 1;
    if (n < 0) n = repeat === 'all' ? queue.length - 1 : 0;
    playAt(n);
  }

  function togglePlay() {
    if (!queue.length) { $('#box').focus(); return; }
    if (!ready) return;
    if (cur < 0 || finished) { playAt(finished ? 0 : Math.max(cur, 0)); return; }
    const s = player.getPlayerState();
    if (s === 1 || s === 3) player.pauseVideo();
    else if (s === 2 || s === 5) player.playVideo();
    else playAt(cur);
  }

  let volTimer = null;
  function changeVolume(d) {
    if (!ready) return;
    try {
      volume = Math.max(0, Math.min(100, volume + d));
      if (volume === 0) player.mute();
      else { if (player.isMuted()) player.unMute(); player.setVolume(volume); }
    } catch (e) { return; }
    renderNow(volume === 0 ? '소리 끔' : '볼륨 ' + volume);
    clearTimeout(volTimer);
    volTimer = setTimeout(() => renderNow(), 1500);
  }

  function handleEnded() {
    const pl = inPlaylist();
    if (pl && pl.idx >= 0 && pl.idx < pl.len - 1) return; // 플레이리스트 안에서 다음 곡으로 넘어가는 중
    if (repeat === 'one') { playAt(cur); return; }
    next(true);
  }

  function onStateChange(e) {
    const s = e.data;
    setPlaying(s === 1 || s === 3);
    if (s === 1) {
      idle = false; finished = false;
      const it = queue[cur];
      if (it) {
        let changed = false;
        try {
          const vd = player.getVideoData() || {};
          if (it.kind !== 'playlist' && !it.title && vd.title) { it.title = vd.title; it.author = it.author || vd.author || ''; changed = true; }
        } catch (err) { /* 영상 정보가 아직 없음 */ }
        if (it.blocked) { it.blocked = false; changed = true; }
        if (changed) { save(); render(); }
      }
      renderNow();
    }
    if (s === 0) handleEnded();
  }

  function onError(e) {
    const c = e.data;
    if (c === 153) { showNotice('referrer'); return; }
    const it = queue[cur];
    if (!it) return;
    if (it.kind === 'playlist') { try { player.nextVideo(); } catch (err) { /* 무시 */ } return; }
    it.blocked = c; save(); render();
    renderNow(c === 101 || c === 150 ? '올린 사람이 퍼가기를 막은 영상이라 건너뛰어요' : '재생할 수 없는 영상이라 건너뛰어요');
    setTimeout(() => next(true), 1500);
  }

  /* ---------- 목록 편집 ---------- */
  function move(from, to) {
    if (to < 0 || to >= queue.length || from === to) return;
    const curUid = queue[cur]?.uid;
    const [x] = queue.splice(from, 1);
    queue.splice(to, 0, x);
    cur = curUid ? queue.findIndex(q => q.uid === curUid) : -1;
    save(); render();
  }

  function removeAt(i) {
    const wasCur = i === cur;
    queue.splice(i, 1);
    if (i < cur) cur--;
    else if (wasCur) {
      if (i < queue.length && !idle) { playAt(i); return; }
      cur = queue.length ? Math.min(i, queue.length - 1) : -1;
      if (ready) try { player.stopVideo(); } catch (e) { /* 무시 */ }
      idle = true; finished = false; setPlaying(false);
      if (ready && queue[cur]) cue(queue[cur]);
    }
    save(); render();
  }

  function cue(it) {
    if (it.kind === 'playlist') player.cuePlaylist({ list: it.id, listType: 'playlist', index: 0 });
    else player.cueVideoById({ videoId: it.id, startSeconds: it.start || 0 });
  }

  function shuffleRest() {
    const from = cur + 1;
    const rest = queue.slice(from);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    queue.splice(from, rest.length, ...rest);
    save(); render();
    $('#result').textContent = rest.length > 1 ? `남은 ${rest.length}개를 섞었어요` : '섞을 곡이 없어요';
  }

  /* ---------- 이벤트 ---------- */
  const list = $('#list');
  list.addEventListener('click', e => {
    const li = e.target.closest('li.item'); if (!li) return;
    const i = +li.dataset.i;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'up') move(i, i - 1);
    else if (act === 'down') move(i, i + 1);
    else if (act === 'del') removeAt(i);
    else playAt(i);
  });
  list.addEventListener('keydown', e => {
    const li = e.target.closest('li.item'); if (!li || e.target !== li) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playAt(+li.dataset.i); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeAt(+li.dataset.i); }
  });

  // 대기열 안에서 끌어서 순서 바꾸기
  let dragFrom = null;
  list.addEventListener('dragstart', e => {
    const li = e.target.closest('li.item'); if (!li) return;
    dragFrom = +li.dataset.i; li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('application/x-makneot', String(dragFrom)); } catch (err) { /* 무시 */ }
  });
  list.addEventListener('dragover', e => {
    if (dragFrom === null) return;
    const li = e.target.closest('li.item'); if (!li) return;
    e.preventDefault();
    list.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    li.classList.add('over');
  });
  list.addEventListener('drop', e => {
    if (dragFrom === null) return;
    e.preventDefault(); e.stopPropagation();
    const li = e.target.closest('li.item');
    const from = dragFrom; dragFrom = null;
    if (li) move(from, +li.dataset.i); else render();
  });
  list.addEventListener('dragend', () => { dragFrom = null; render(); });

  // 다른 탭에서 링크를 끌어다 놓기
  const drop = $('#drop');
  document.addEventListener('dragover', e => {
    if (dragFrom !== null) return;
    const types = Array.from(e.dataTransfer?.types || []);
    if (types.includes('text/uri-list') || types.includes('text/plain')) { e.preventDefault(); drop.classList.add('hot'); }
  });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) drop.classList.remove('hot'); });
  document.addEventListener('drop', e => {
    drop.classList.remove('hot');
    if (dragFrom !== null) return;
    e.preventDefault();
    const t = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (t) addFromText(t);
  });

  // 어디서든 붙여넣기
  const box = $('#box');
  document.addEventListener('paste', e => {
    const t = e.clipboardData?.getData('text') || '';
    if (!t) return;
    const n = addFromText(t);
    if (n > 0) { e.preventDefault(); if (e.target === box) box.value = ''; }
  });
  $('#addBtn').addEventListener('click', () => { if (addFromText(box.value) > 0) box.value = ''; else if (!box.value.trim()) box.focus(); });
  box.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (addFromText(box.value) > 0) box.value = ''; }
  });

  $('#playBtn').addEventListener('click', togglePlay);
  $('#nextBtn').addEventListener('click', () => next(false));
  $('#prevBtn').addEventListener('click', prev);
  $('#volUp').addEventListener('click', () => changeVolume(10));
  $('#volDown').addEventListener('click', () => changeVolume(-10));
  $('#repeatBtn').addEventListener('click', () => {
    repeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
    save(); render();
  });
  $('#shuffleBtn').addEventListener('click', shuffleRest);

  $('#copyBtn').addEventListener('click', () => {
    if (!queue.length) { $('#result').textContent = '복사할 링크가 없어요'; return; }
    const text = queue.map(urlOf).join('\n');
    const done = () => { $('#result').textContent = `링크 ${queue.length}개를 복사했어요`; };
    const fallback = () => { box.value = text; box.select(); $('#result').textContent = '복사가 막혀 있어요. 위 칸에 골라 둔 걸 Ctrl+C 해 주세요'; };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  });

  let clearArmed = null;
  $('#clearBtn').addEventListener('click', e => {
    const b = e.currentTarget;
    if (!clearArmed) {
      b.textContent = '한 번 더 누르면 비워요'; b.classList.add('warn');
      clearArmed = setTimeout(() => { clearArmed = null; b.textContent = '전부 비우기'; b.classList.remove('warn'); }, 3000);
      return;
    }
    clearTimeout(clearArmed); clearArmed = null;
    b.textContent = '전부 비우기'; b.classList.remove('warn');
    queue = []; cur = -1; idle = true; finished = false;
    if (ready) try { player.stopVideo(); } catch (err) { /* 무시 */ }
    setPlaying(false); save(); render();
    $('#result').textContent = '대기열을 비웠어요';
  });

  /* ---------- 안내 ---------- */
  function showNotice(kind) {
    const n = $('#notice');
    const how = '사이트 주소(https://…github.io/player.html)로 열면 됩니다. 내 컴퓨터에서 확인하려면 사이트 폴더에서 <code>python -m http.server</code>를 실행하고 <code>http://localhost:8000/player.html</code>로 여세요.';
    if (kind === 'file') n.innerHTML = '파일을 더블클릭해서 열면 유튜브가 재생을 막을 수 있어요(오류 153). ' + how;
    else if (kind === 'referrer') n.innerHTML = '유튜브가 이 주소에서의 재생을 막았어요(오류 153). ' + how;
    else if (kind === 'api') n.innerHTML = '유튜브 플레이어를 불러오지 못했어요. 인터넷 연결이나 광고 차단 확장을 확인해 주세요. 오른쪽 YouTube 버튼으로 유튜브에서 이어 트는 건 그래도 됩니다.';
    n.hidden = false;
  }
  if (location.protocol === 'file:') showNotice('file');

  /* ---------- 유튜브 플레이어 ---------- */
  window.onYouTubeIframeAPIReady = function () {
    const vars = { playsinline: 1, rel: 0 };
    if (/^https?:/.test(location.protocol)) vars.origin = location.origin;
    player = new YT.Player('player', {
      width: '100%', height: '100%', playerVars: vars,
      events: {
        onReady: () => {
          ready = true; loadState = 'ok';
          const n = $('#notice'); if (/불러오지 못했어요/.test(n.textContent)) n.hidden = true;
          try { volume = player.isMuted() ? 0 : player.getVolume(); } catch (e) { volume = 100; }
          if (queue[cur]) cue(queue[cur]);
          render();
        },
        onStateChange, onError
      }
    });
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => { loadState = 'failed'; renderIdle(); showNotice('api'); };
  document.head.appendChild(tag);
  setTimeout(() => { if (!ready) { loadState = 'failed'; renderIdle(); showNotice('api'); } }, 10000);

  render();
  fetchMeta();
})();
