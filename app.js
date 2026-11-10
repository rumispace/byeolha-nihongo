/* 별하 일본어 — 레슨 엔진과 화면 */
'use strict';

const app = document.getElementById('app');
const KEY = 'bn_state_v1';
const DEF = {
  xp: 0, streak: 0, lastDay: null,
  done: {},            // 레슨 id → 완료 횟수
  srs: {},             // 항목 id → { box, due }
  set: { pron: true, slow: false, sfx: true },
  tab: 'learn', track: 'kana',
};
const SRS_DAYS = [1, 3, 7, 14, 30];

let S = loadState();
let sess = null;       // 진행 중인 레슨

/* ───────── 저장 ───────── */
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) return Object.assign({}, DEF, s, { set: Object.assign({}, DEF.set, s.set) });
  } catch (e) { /* 저장소를 못 쓰는 환경에서는 새로 시작 */ }
  return JSON.parse(JSON.stringify(DEF));
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ }
}

/* ───────── 날짜 ───────── */
function dayStr(off) {
  const d = new Date();
  d.setDate(d.getDate() + (off || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function curStreak() {
  return (S.lastDay === dayStr() || S.lastDay === dayStr(-1)) ? S.streak : 0;
}
const doneToday = () => S.lastDay === dayStr();

/* ───────── 도우미 ───────── */
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const won = n => n.toLocaleString('ko-KR') + '원';

/* ───────── 소리 ───────── */
let jaVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith('ja'));
  jaVoice = vs.find(v => /Kyoko|O-ren|Otoya|Hattori/i.test(v.name)) || vs[0] || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
/* 미리 만들어 둔 음성 파일을 먼저 쓰고, 없는 문장만 기기 내장 음성으로 읽는다 */
const VOICE_FILES = typeof AUDIO === 'object' ? AUDIO : {};
const player = new Audio();
function stopSound() {
  try { player.pause(); } catch (e) { /* 무시 */ }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
function speak(text) {
  if (!text) return;
  stopSound();
  const f = VOICE_FILES[text];
  if (!f) return speakTTS(text);
  player.src = 'audio/' + f;
  player.playbackRate = S.set.slow ? 0.75 : 1;
  const p = player.play();
  if (p && p.catch) p.catch(e => { if (e && e.name !== 'AbortError') speakTTS(text); });
}
function speakTTS(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = S.set.slow ? 0.65 : 0.9;
    speechSynthesis.speak(u);
  } catch (e) { /* 무시 */ }
}

let actx = null;
function sfx(kind) {
  if (!S.set.sfx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok: [660, 880], no: [220, 180], win: [523, 659, 784, 1047] }[kind];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      const t = actx.currentTime + i * 0.11;
      o.type = kind === 'no' ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + 0.25);
    });
  } catch (e) { /* 무시 */ }
}

/* ───────── 숫자 읽기 ───────── */
const D = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const DK = ['', '이치', '니', '산', '욘', '고', '로쿠', '나나', '하치', '큐-'];
function under10k(n) {
  const s = Math.floor(n / 1000), h = Math.floor(n / 100) % 10, j = Math.floor(n / 10) % 10, o = n % 10;
  let k = ''; const p = [];
  if (s) {
    const m = { 1: ['せん', '센'], 3: ['さんぜん', '산젠'], 8: ['はっせん', '핫센'] }[s] || [D[s] + 'せん', DK[s] + '센'];
    k += m[0]; p.push(m[1]);
  }
  if (h) {
    const m = { 1: ['ひゃく', '햐쿠'], 3: ['さんびゃく', '산뱌쿠'], 6: ['ろっぴゃく', '롭퍄쿠'], 8: ['はっぴゃく', '합퍄쿠'] }[h] || [D[h] + 'ひゃく', DK[h] + '햐쿠'];
    k += m[0]; p.push(m[1]);
  }
  if (j) {
    const m = j === 1 ? ['じゅう', '쥬-'] : [D[j] + 'じゅう', DK[j] + '쥬-'];
    k += m[0]; p.push(m[1]);
  }
  if (o) { k += D[o]; p.push(DK[o]); }
  return { k, p: p.join(' ') };
}
function numRead(n) {
  const man = Math.floor(n / 10000), rest = n % 10000;
  let k = ''; const p = [];
  if (man) { const a = under10k(man); k += a.k + 'まん'; p.push(a.p.replace(/ /g, '') + '만'); }
  if (rest) { const a = under10k(rest); k += a.k; p.push(a.p); }
  return { kana: k, pron: p.join(' ') };
}

/* ───────── 진도 ───────── */
const trackLessons = t => LESSONS.filter(l => l.track === t);
function unlocked(L) {
  const ls = trackLessons(L.track), i = ls.indexOf(L);
  // 단원의 첫 레슨은 언제나 열려 있다: 필요한 단원부터 골라 배울 수 있게
  return i === 0 || !!S.done[ls[i - 1].id] || (!!L.unit && L.unit !== ls[i - 1].unit);
}
const nextIn = t => trackLessons(t).find(l => !S.done[l.id]) || null;
function recommended() {
  const k = nextIn('kana'), p = nextIn('pharm');
  if (!k) return p;
  if (!p) return k;
  const kd = trackLessons('kana').filter(l => S.done[l.id]).length;
  const pd = trackLessons('pharm').filter(l => S.done[l.id]).length;
  return pd <= kd ? p : k;   // 처음엔 약국 길부터: 첫날 바로 써먹을 말을 배운다
}
function dueItems() {
  const t = dayStr();
  return Object.keys(S.srs).filter(id => ITEMS[id] && S.srs[id].due <= t);
}
function grade(id, ok) {
  if (!id || !ITEMS[id]) return;
  const r = S.srs[id] || { box: -1, due: dayStr() };
  r.box = ok ? Math.min(r.box + 1, SRS_DAYS.length - 1) : 0;
  r.due = dayStr(ok ? SRS_DAYS[r.box] : 1);
  S.srs[id] = r;
}

/* ───────── 문제 만들기 ───────── */
function face(it, f) {
  switch (f) {
    case 'jponly': return `<span class="jp xl ${it.jp.length > 3 ? 'long' : ''}">${it.jp}</span>`;
    case 'jp': return `<span class="jp">${it.jp}</span>` + (S.set.pron ? `<small>${it.pron}</small>` : '');
    case 'pron': return `<span>${it.pron}</span>`;
    case 'pronko': return `<span>${it.em ? it.em + ' ' : ''}${it.pron}</span><small>${it.ko}</small>`;
    case 'read': return `<span>${it.pron}</span><small class="jp">${it.kana}</small>`;
    default: return `<span>${it.em ? `<i class="em">${it.em}</i>` : ''}${it.ko}</span>`;
  }
}
/* 종류별로 "듣고 고르기"와 "보고 고르기"에 쓸 얼굴 */
const FACES = {
  kana: { listen: 'jponly', show: 'pron', label: '이 글자는 어떻게 읽을까요?' },
  word: { listen: 'jponly', show: 'pronko', label: '이 단어는 어떻게 읽을까요?' },
  num: { listen: 'ko', show: 'read', label: '일본어로 어떻게 읽을까요?' },
  phrase: { listen: 'ko', show: 'jp', label: '일본어로 뭐라고 할까요?' },
};

let curMates = [];   // 지금 푸는 레슨의 항목들
function distract(it, known, n) {
  const same = id => id !== it.id && ITEMS[id].g === it.g;
  // 글자·단어 읽기는 같은 레슨의 것을 먼저 보기로 쓴다.
  // 가타카나 문제에 히라가나만 섞이면 모양만 보고 답을 알 수 있기 때문이다
  const mates = (it.g === 'word' || it.g === 'kana') ? shuffle(curMates.filter(same)) : [];
  let pool = mates.concat(shuffle(known.filter(id => same(id) && !mates.includes(id))));
  if (pool.length < n + 2) pool = pool.concat(shuffle(Object.keys(ITEMS).filter(id => same(id) && !pool.includes(id))));
  // 뜻이나 소리가 같은 보기가 둘이면 정답이 둘이 되거나 같은 보기가 두 번 나온다 (お·を, こ·コ)
  const out = [], seenP = new Set([it.pron]), seenK = new Set([it.ko]);
  for (const id of pool) {
    const o = ITEMS[id];
    if (seenP.has(o.pron) || seenK.has(o.ko)) continue;
    seenP.add(o.pron); seenK.add(o.ko);
    out.push(o);
    if (out.length === n) break;
  }
  return out;
}
function options(it, known, f) {
  return shuffle([it].concat(distract(it, known, 3))).map(o => ({ id: o.id, html: face(o, f) }));
}
function answerLine(it) {
  if (it.g === 'kana') return `<b class="jp">${it.jp}</b> = ${it.pron}`;
  return `<b class="jp">${it.jp}</b> · ${it.pron}` + (it.g === 'num' ? '' : ` · ${it.ko}`);
}

function qListen(it, known) {
  return {
    t: 'choice', item: it.id, label: '듣고 알맞은 것을 고르세요', audio: it.say,
    opts: options(it, known, FACES[it.g].listen), ans: it.id, ansHtml: answerLine(it),
  };
}
function qShow(it, known) {
  const F = FACES[it.g];
  const big = it.g === 'phrase'
    ? `<div class="prompt-ko">${it.em ? `<i class="em">${it.em}</i>` : ''}${it.ko}</div>`
    : `<div class="prompt-big jp">${it.jp}</div>`;
  return {
    t: 'choice', item: it.id, label: F.label, promptHtml: big,
    opts: options(it, known, F.show), ans: it.id, ansHtml: answerLine(it), sayAfter: it.say,
  };
}
function qTiles(it, known) {
  const mine = it.parts.map(p => p[0]);
  const others = [];
  // 헷갈리게 섞는 조각은 이미 배운 문장에서 먼저 고르고, 모자랄 때만 뒤 레슨에서 빌린다
  const collect = ids => ids.forEach(id => {
    const o = ITEMS[id];
    if (o.g !== 'phrase' || !o.parts || o.id === it.id) return;
    o.parts.forEach(p => { if (!mine.includes(p[0]) && !others.some(x => x[0] === p[0])) others.push(p); });
  });
  collect(shuffle(known));
  if (others.length < 3) collect(shuffle(Object.keys(ITEMS)));
  const pool = shuffle(it.parts.concat(others.slice(0, 3)));
  return {
    t: 'tiles', item: it.id, label: '순서대로 눌러 문장을 만드세요', ko: (it.em ? `<i class="em">${it.em}</i>` : '') + it.ko,
    pool, correct: mine, ansHtml: answerLine(it), sayAfter: it.say,
  };
}
function qRole(r, known) {
  const it = ITEMS[r.ans];
  // 손님 대사가 있으면 그림을 말풍선 안에 넣는다. 따로 두면 보기가 화면 밖으로 밀린다
  let html = r.em && !r.cust ? `<div class="scene">${r.em}</div>` : '';
  if (r.sit) html += `<div class="sit">${r.sit}</div>`;
  if (r.cust) {
    html += `<div class="bubble">${r.em ? `<i class="bem">${r.em}</i>` : ''}<span class="who">손님</span><span class="jp">${r.cust.jp}</span>` +
      (S.set.pron ? `<small>${r.cust.pron}</small>` : '') + `<small class="mean">${r.cust.ko}</small></div>`;
  }
  return {
    t: 'choice', item: it.id, label: '이럴 때 뭐라고 할까요?', promptHtml: html,
    audio: r.cust ? r.cust.jp : null,
    opts: options(it, known, 'jp'), ans: it.id, ansHtml: answerLine(it), sayAfter: it.say, role: true,
  };
}
function qMatch(items) {
  const f = items[0].g === 'kana' || items[0].g === 'num' ? 'pron' : 'ko';
  return { t: 'match', label: '짝을 맞추세요', pairs: shuffle(items).slice(0, 5).map(it => ({ id: it.id, l: it.jp, r: it[f], say: it.say })) };
}
function qPrice(range, listen) {
  const gen = () => range === 'sen'
    ? (1 + rnd(9)) * 1000 + (Math.random() < 0.4 ? 500 : 0)
    : (1 + rnd(9)) * 10000 + rnd(10) * 1000;
  const n = gen();
  const set = new Set([n]);
  // 헷갈리기 쉬운 값부터 보기로 넣는다
  const near = range === 'sen'
    ? [n + 1000, n - 1000, n % 1000 ? n - 500 : n + 500]
    : [Math.floor(n % 10000 / 1000) * 10000 + Math.floor(n / 10000) * 1000, n + 1000, n - 10000];
  shuffle(near).forEach(v => { if (set.size < 3 && v >= 1000 && v < 100000) set.add(v); });
  while (set.size < 4) set.add(gen());
  const r = numRead(n);
  const q = {
    t: 'choice', item: null, ans: n,
    ansHtml: `<b>${won(n)}</b> · ${r.pron} 원데스 <span class="jp">(${r.kana}ウォンです)</span>`,
  };
  if (listen) {
    q.label = '가격을 듣고 고르세요';
    q.audio = r.kana + 'ウォンです';
    q.opts = shuffle([...set]).map(v => ({ id: v, html: `<span>${won(v)}</span>` }));
  } else {
    q.label = '일본어로 어떻게 읽을까요?';
    q.promptHtml = `<div class="scene">🏷️</div><div class="prompt-big">${won(n)}</div>`;
    q.sayAfter = r.kana + 'ウォンです';
    q.opts = shuffle([...set]).map(v => { const x = numRead(v); return { id: v, html: `<span>${x.pron}</span><small class="jp">${x.kana}</small>` }; });
  }
  return q;
}

/* 레슨 하나를 문제 묶음으로 */
function buildLesson(L) {
  if (L.type === 'price') {
    const steps = [];
    for (let i = 0; i < 10; i++) steps.push(qPrice(L.range, i < 6));
    return shuffle(steps);
  }
  const ls = trackLessons(L.track);
  const known = [];
  ls.slice(0, ls.indexOf(L) + 1).forEach(l => (l.items || []).forEach(id => known.push(id)));
  const items = L.items.map(id => ITEMS[id]);
  const steps = [];

  // 두 개 소개하고 바로 귀로 확인
  items.forEach((it, i) => {
    steps.push({ t: 'intro', item: it.id });
    if (i % 2 === 1 || i === items.length - 1) {
      const fresh = items.slice(i % 2 === 1 ? i - 1 : i, i + 1);
      shuffle(fresh).forEach(x => steps.push(qListen(x, known)));
    }
  });

  const tail = [];
  if (L.type === 'vocab') {
    shuffle(items).slice(0, 3).forEach(it => tail.push(qShow(it, known)));
  } else if (L.type === 'phrase') {
    const withParts = shuffle(items.filter(it => it.parts)).slice(0, 2);
    withParts.forEach(it => tail.push(qTiles(it, known)));
    shuffle(items.filter(it => !withParts.includes(it))).slice(0, 2).forEach(it => tail.push(qShow(it, known)));
    (L.role || []).forEach(r => tail.push(qRole(r, known)));
  } else {
    shuffle(items).slice(0, 3).forEach(it => tail.push(qShow(it, known)));
  }
  steps.push(...shuffle(tail));
  if (L.type !== 'phrase') steps.push(qMatch(items));
  return steps;
}

const learnedIds = () => Object.keys(S.srs).filter(id => ITEMS[id]);
const doneRoles = () => LESSONS.filter(l => S.done[l.id]).reduce((a, l) => a.concat(l.role || []), []);
function qAny(it, known) {
  if (it.g === 'phrase' && it.parts && Math.random() < 0.35) return qTiles(it, known);
  return Math.random() < 0.5 ? qListen(it, known) : qShow(it, known);
}
function buildReview() {
  const known = learnedIds();
  return shuffle(dueItems()).slice(0, 12).map(id => qAny(ITEMS[id], known));
}
/* 오늘의 연습: 배운 것 전체에서 매번 다르게 뽑는다. 덜 익은 것(상자 번호가 낮은 것)일수록 자주 나온다 */
function buildPractice() {
  const known = learnedIds();
  const key = id => Math.pow(Math.random(), (1 + (S.srs[id].box || 0)) * (ITEMS[id].must ? 0.6 : 1));   // 꼭 외울 문장은 더 자주
  const ids = known.map(id => [key(id), id]).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
  const steps = ids.map(id => qAny(ITEMS[id], known));
  shuffle(doneRoles()).slice(0, 2).forEach(r => steps.push(qRole(r, known)));
  if (S.done.n4) steps.push(qPrice('sen', true));
  if (S.done.n5) steps.push(qPrice('man', Math.random() < 0.6));
  return shuffle(steps);
}
/* 상황극 연습: 끝낸 레슨의 상황만 모아서 */
function buildRoles() {
  const known = learnedIds();
  return shuffle(doneRoles()).slice(0, 8).map(r => qRole(r, known));
}
const MODES = {
  review: { id: 'review', title: '복습', doneTitle: '복습 끝!', build: buildReview },
  practice: { id: 'practice', title: '오늘의 연습', doneTitle: '연습 끝!', build: buildPractice },
  roles: { id: 'roles', title: '상황극 연습', doneTitle: '상황극 끝!', build: buildRoles },
};
const canPractice = () => learnedIds().length >= 5;

/* ───────── 레슨 진행 ───────── */
function startLesson(L) {
  curMates = L.items || [];
  const steps = L.build ? L.build() : buildLesson(L);
  if (!steps.length) return;
  sess = { L, steps, i: 0, total: steps.length, cleared: 0, wrong: 0, graded: {} };
  renderStep();
}
function quitLesson() {
  if (sess && sess.i > 0 && !confirm('레슨을 그만둘까요? 여기까지 한 내용은 저장되지 않습니다.')) return;
  stopSound();
  sess = null;
  renderHome();
}
function shell(body, footer) {
  const pct = Math.round(sess.cleared / sess.total * 100);
  app.innerHTML = `
    <div class="lesson">
      <header class="lbar">
        <button class="x" id="quit" aria-label="그만두기">✕</button>
        <div class="prog"><i style="width:${pct}%"></i></div>
      </header>
      <main class="lbody">${body}</main>
      <footer class="lfoot" id="foot">${footer}</footer>
    </div>`;
  document.getElementById('quit').onclick = quitLesson;
}
function advance(ok, step) {
  if (ok) sess.cleared++;
  else {
    sess.wrong++;
    sess.steps.push(Object.assign({}, step, { retry: true }));   // 틀린 문제는 끝에 다시
  }
  if (step.item && !(step.item in sess.graded)) sess.graded[step.item] = ok;
  sess.i++;
  if (sess.i >= sess.steps.length) finishLesson(); else renderStep();
}
function feedback(ok, step) {
  sfx(ok ? 'ok' : 'no');
  if (step.sayAfter) speak(step.sayAfter);
  const foot = document.getElementById('foot');
  foot.className = 'lfoot ' + (ok ? 'good' : 'bad');
  foot.innerHTML = `
    <div class="fb">
      <strong><i class="react">${pick(ok ? REACT.ok : REACT.no)}</i> ${ok ? '정답이에요!' : '아쉬워요'}</strong>
      ${ok && !step.sayAfter ? '' : `<div class="fb-ans">${step.ansHtml || ''}</div>`}
    </div>
    <button class="btn ${ok ? 'ok' : 'no'}" id="go">계속</button>`;
  document.getElementById('go').onclick = () => advance(ok, step);
}

function renderStep() {
  const step = sess.steps[sess.i];
  if (step.t === 'intro') return renderIntro(step);
  if (step.t === 'choice') return renderChoice(step);
  if (step.t === 'tiles') return renderTiles(step);
  if (step.t === 'match') return renderMatch(step);
}

function renderIntro(step) {
  const it = ITEMS[step.item];
  const isKana = it.g === 'kana';
  const ribbons = [];
  if (it.must) ribbons.push(['must', '⭐ 꼭 외우세요!']);
  if (it.sales) ribbons.push(['sales', '💰 판매 꿀팁 표현!']);
  if (it.cust) ribbons.push(['cust', '👂 손님이 하는 말']);
  const kind = ribbons.length ? ribbons[0][0] : '';
  const body = `
    <p class="qlabel">${it.must ? '이 문장은 꼭 외우세요' : it.sales ? '매출을 올리는 한마디' : it.cust ? '알아듣기만 하면 돼요' : '새로 배워요'}</p>
    <button class="card intro ${isKana ? 'kana' : ''} ${kind}" id="play">
      ${ribbons.length ? `<span class="ribbons">${ribbons.map(r => `<i class="ribbon ${r[0]}">${r[1]}</i>`).join('')}</span>` : ''}
      ${it.em ? `<span class="pic">${it.em}</span>` : ''}
      <span class="jp ${isKana ? 'huge' : it.g !== 'phrase' ? 'xxl' : it.jp.length > 13 ? 'lg sm' : it.jp.length > 9 ? 'lg md' : 'lg'}">${it.jp}</span>
      ${!isKana && it.kana !== it.jp ? `<span class="jp furi">${it.kana}</span>` : ''}
      <span class="pron">${it.pron}</span>
      ${isKana ? '' : `<span class="mean">${it.g === 'num' ? '' : it.ko}</span>`}
      <span class="spk">🔊 눌러서 다시 듣기</span>
    </button>
    ${it.sales ? `<p class="tip sales">💰 ${it.sales}</p>` : ''}
    ${it.tip ? `<p class="tip">💡 ${it.tip}</p>` : ''}`;
  shell(body, `<button class="btn" id="go">알겠어요</button>`);
  document.getElementById('play').onclick = () => speak(it.say);
  document.getElementById('go').onclick = () => { sess.cleared++; sess.i++; renderStep(); };
  speak(it.say);
}

function renderChoice(step) {
  const body = `
    <p class="qlabel">${step.retry ? '<em>다시 한 번</em> ' : ''}${step.label}</p>
    ${step.audio && !step.promptHtml ? `<button class="bigspk" id="play" aria-label="듣기">🔊</button>` : ''}
    ${step.promptHtml || ''}
    ${step.audio && step.promptHtml ? `<button class="minispk" id="play">🔊 손님 말 듣기</button>` : ''}
    <div class="opts ${step.opts.some(o => o.html.includes('xl')) ? 'grid' : ''}">
      ${step.opts.map((o, i) => `<button class="opt" data-i="${i}">${o.html}</button>`).join('')}
    </div>`;
  shell(body, `<button class="btn" id="check" disabled>확인</button>`);
  let sel = null;
  const btns = [...app.querySelectorAll('.opt')];
  btns.forEach(b => b.onclick = () => {
    if (document.getElementById('check') === null) return;
    sel = +b.dataset.i;
    btns.forEach(x => x.classList.toggle('sel', x === b));
    document.getElementById('check').disabled = false;
  });
  const play = document.getElementById('play');
  if (play) play.onclick = () => speak(step.audio);
  if (step.audio) speak(step.audio);
  document.getElementById('check').onclick = () => {
    const ok = step.opts[sel].id === step.ans;
    btns.forEach((b, i) => {
      b.disabled = true;
      if (step.opts[i].id === step.ans) b.classList.add('right');
      else if (i === sel) b.classList.add('wrong');
    });
    feedback(ok, step);
  };
}

function renderTiles(step) {
  const body = `
    <p class="qlabel">${step.retry ? '<em>다시 한 번</em> ' : ''}${step.label}</p>
    <div class="prompt-ko">${step.ko}</div>
    <div class="tray" id="tray"></div>
    <div class="pool" id="pool"></div>`;
  shell(body, `<button class="btn" id="check" disabled>확인</button>`);
  const chosen = [];
  let locked = false;
  const tile = (p, i, used) => `<button class="tile ${used ? 'used' : ''}" data-i="${i}" ${used ? 'disabled' : ''}><span class="jp">${p[0]}</span>${S.set.pron ? `<small>${p[1]}</small>` : ''}</button>`;
  function draw() {
    document.getElementById('tray').innerHTML = chosen.map(i => tile(step.pool[i], i, false)).join('') || '<span class="hint">아래 조각을 순서대로 누르세요</span>';
    document.getElementById('pool').innerHTML = step.pool.map((p, i) => tile(p, i, chosen.includes(i))).join('');
    document.getElementById('check').disabled = !chosen.length;
    if (locked) return;
    document.querySelectorAll('#pool .tile:not(.used)').forEach(b => b.onclick = () => { chosen.push(+b.dataset.i); draw(); });
    document.querySelectorAll('#tray .tile').forEach(b => b.onclick = () => { chosen.splice(chosen.indexOf(+b.dataset.i), 1); draw(); });
  }
  draw();
  document.getElementById('check').onclick = () => {
    locked = true;
    const ok = chosen.map(i => step.pool[i][0]).join('|') === step.correct.join('|');
    document.getElementById('tray').classList.add(ok ? 'right' : 'wrong');
    app.querySelectorAll('.tile').forEach(b => { b.onclick = null; });
    feedback(ok, step);
  };
}

function renderMatch(step) {
  const rights = shuffle(step.pairs);
  const body = `
    <p class="qlabel">${step.label}</p>
    <div class="match">
      <div class="col">${step.pairs.map(p => `<button class="mt jp ${p.l.length > 3 ? 'long' : ''}" data-side="l" data-id="${p.id}">${p.l}</button>`).join('')}</div>
      <div class="col">${rights.map(p => `<button class="mt" data-side="r" data-id="${p.id}">${p.r}</button>`).join('')}</div>
    </div>`;
  shell(body, `<button class="btn" id="go" disabled>계속</button>`);
  let cur = null, left = step.pairs.length;
  app.querySelectorAll('.mt').forEach(b => b.onclick = () => {
    if (b.classList.contains('gone')) return;
    if (b.dataset.side === 'l') {
      const p = step.pairs.find(x => x.id === b.dataset.id);
      speak(p.say);
    }
    if (!cur || cur.dataset.side === b.dataset.side) {
      if (cur) cur.classList.remove('sel');
      cur = b; b.classList.add('sel');
      return;
    }
    const a = cur; cur = null;
    a.classList.remove('sel');
    if (a.dataset.id === b.dataset.id) {
      a.classList.add('gone'); b.classList.add('gone');
      sfx('ok');
      if (--left === 0) document.getElementById('go').disabled = false;
    } else {
      sfx('no');
      [a, b].forEach(x => { x.classList.add('shake'); setTimeout(() => x.classList.remove('shake'), 400); });
    }
  });
  document.getElementById('go').onclick = () => advance(true, step);
}

function finishLesson() {
  const L = sess.L;
  const isReview = !!L.build;   // 복습·연습은 레슨 진도에 넣지 않는다
  Object.keys(sess.graded).forEach(id => grade(id, sess.graded[id]));
  // 소개만 하고 문제로 안 나온 항목도 내일 복습에 올린다
  if (!isReview) (L.items || []).forEach(id => { if (!S.srs[id]) grade(id, true); });

  const gain = 10 + (sess.wrong === 0 ? 5 : 0);
  S.xp += gain;
  if (!isReview) S.done[L.id] = (S.done[L.id] || 0) + 1;
  const t = dayStr();
  const firstToday = S.lastDay !== t;
  if (firstToday) { S.streak = S.lastDay === dayStr(-1) ? S.streak + 1 : 1; S.lastDay = t; }
  save();

  const asked = sess.steps.filter(s => s.t !== 'intro' && s.t !== 'match').length;
  const acc = asked ? Math.round((asked - sess.wrong) / asked * 100) : 100;
  const tp = L.today ? ITEMS[L.today] : null;
  sess = null;
  sfx('win');
  app.innerHTML = `
    <div class="finish">
      <div class="mascot big">🦅</div>
      <h1>${L.doneTitle || '레슨 완료!'}</h1>
      <div class="stats">
        <div><b>+${gain}</b><span>경험치</span></div>
        <div><b>${acc}%</b><span>정확도</span></div>
        <div><b>🔥 ${S.streak}</b><span>연속 학습일</span></div>
      </div>
      ${firstToday ? `<p class="note">오늘 목표를 달성했어요.</p>` : ''}
      ${tp ? `
      <div class="todaycard">
        <span class="tag">오늘 카운터에서 한 번 써 보기</span>
        <button class="say" id="tplay"><span class="jp">${tp.jp}</span><small>${tp.pron}</small><small class="mean">${tp.ko} 🔊</small></button>
      </div>` : ''}
      <button class="btn" id="home">계속</button>
    </div>`;
  if (tp) document.getElementById('tplay').onclick = () => speak(tp.say);
  document.getElementById('home').onclick = renderHome;
}

/* ───────── 홈 ───────── */
function renderHome() {
  if (needReload) { const v = needReload; needReload = false; reloadOnce(v); }
  const tabs = { learn: viewLearn, review: viewReview, book: viewBook, set: viewSet };
  const due = dueItems().length;
  app.innerHTML = `
    <div class="home">
      <header class="top">
        <div class="brand"><span class="mascot">🦅</span>별하 일본어</div>
        <div class="chips"><span class="chip">🔥 ${curStreak()}</span><span class="chip">⭐ ${S.xp}</span></div>
      </header>
      <main class="page" id="page"></main>
      <nav class="nav">
        ${[['learn', '📚', '배우기'], ['review', '🎯', '연습'], ['book', '📒', '수첩'], ['set', '⚙️', '설정']].map(([k, ic, nm]) =>
    `<button class="${S.tab === k ? 'on' : ''}" data-tab="${k}"><i>${ic}</i>${nm}${k === 'review' && due ? `<b class="dot">${due}</b>` : ''}</button>`).join('')}
      </nav>
    </div>`;
  app.querySelectorAll('.nav button').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; save(); renderHome(); });
  (tabs[S.tab] || viewLearn)(document.getElementById('page'));
}

function viewLearn(el) {
  const rec = recommended();
  const started = Object.keys(S.done).length > 0;
  const msg = pick(!started ? CHEERS.first : doneToday() ? CHEERS.done : CHEERS.todo);
  const ls = trackLessons(S.track);
  let lastUnit = null;
  el.innerHTML = `
    <section class="hero">
      <div class="mascot big">🦅</div>
      <div class="say-box">
        <p>${msg}</p>
        ${rec ? `<button class="btn" id="rec">${doneToday() ? '하나 더 하기' : '오늘의 학습 시작'}<small>${TRACKS[rec.track].name} · ${rec.title}</small></button>`
      : `<button class="btn" id="prac">오늘의 연습<small>배운 것에서 매일 다른 문제</small></button>`}
        ${rec && canPractice() ? `<button class="link" id="prac">🎯 오늘의 연습도 하기</button>` : ''}
      </div>
    </section>
    <button class="shopcard" id="shopgo">
      <span class="si">🏪</span>
      <span class="st"><b>약국 영업</b><small>3D 약국에서 손님을 일본어로 응대해요</small></span>
      <span class="sgo">▶</span>
    </button>
    <div class="seg">
      ${Object.keys(TRACKS).map(k => `<button class="${S.track === k ? 'on' : ''}" data-track="${k}">${TRACKS[k].name}<small>${TRACKS[k].desc}</small></button>`).join('')}
    </div>
    <div class="path">
      ${ls.map((L, i) => {
    const open = unlocked(L), done = !!S.done[L.id];
    const cur = open && !done;
    const head = L.unit && L.unit !== lastUnit ? `<h3 class="unit">${L.unit}</h3>` : '';
    lastUnit = L.unit || lastUnit;
    return `${head}<button class="node ${done ? 'done' : cur ? 'cur' : open ? '' : 'lock'} s${i % 4}" data-id="${L.id}" ${open ? '' : 'disabled'}>
          <span class="ball">${done ? '✓' : open ? (L.type === 'kana' ? L.title[0] : i + 1) : '🔒'}</span>
          <span class="txt"><b>${L.title}</b><small class="${L.type === 'kana' ? 'jp' : ''}">${L.sub}</small></span>
        </button>`;
  }).join('')}
      <p class="soon">다음 단원은 준비 중이에요.</p>
    </div>`;
  if (rec) document.getElementById('rec').onclick = () => startLesson(rec);
  document.getElementById('shopgo').onclick = () => startShop();
  const prac = document.getElementById('prac');
  if (prac) prac.onclick = () => startLesson(MODES.practice);
  el.querySelectorAll('.seg button').forEach(b => b.onclick = () => { S.track = b.dataset.track; save(); renderHome(); });
  el.querySelectorAll('.node').forEach(b => b.onclick = () => startLesson(LESSONS.find(l => l.id === b.dataset.id)));
}

function viewReview(el) {
  const due = dueItems().length;
  const total = learnedIds().length;
  const roles = doneRoles().length;
  const card = (ic, name, desc, btn) => `
    <section class="panel mode"><div class="mi">${ic}</div><div class="mb"><h3>${name}</h3><p>${desc}</p>${btn}</div></section>`;
  el.innerHTML = `
    <h2 class="ptitle">연습</h2>
    <p class="note">배운 항목 ${total}개 · 매일 조금씩 다시 만나야 입에 붙어요.</p>
    ${card('🎯', '오늘의 연습', '배운 것 전체에서 매일 다른 문제. 덜 익은 것이 더 자주 나와요.',
    canPractice() ? `<button class="btn" data-mode="practice">시작<small>약 10문제</small></button>` : `<p class="note">레슨을 하나 마치면 열려요.</p>`)}
    ${card('🎭', '상황극 연습', '이럴 때 뭐라고 할까요? 손님 상황만 모았어요.',
    roles >= 3 ? `<button class="btn" data-mode="roles">시작<small>${Math.min(roles, 8)}문제</small></button>` : `<p class="note">약국 회화 레슨을 2개쯤 마치면 열려요.</p>`)}
    ${card('🔁', '복습', due ? `오늘 다시 볼 것이 <b>${due}개</b> 있어요.` : '틀린 것은 내일, 맞힌 것은 며칠 뒤에 다시 나와요.',
    due ? `<button class="btn" data-mode="review">시작<small>${Math.min(due, 12)}문제</small></button>` : `<p class="note">오늘 복습할 것은 없어요.</p>`)}`;
  el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => startLesson(MODES[b.dataset.mode]));
}

function viewBook(el) {
  const kanaDone = trackLessons('kana').filter(l => l.type === 'kana' && S.done[l.id]);
  const phDone = trackLessons('pharm').filter(l => S.done[l.id] && l.type !== 'price');
  let html = `<h2 class="ptitle">현장 수첩</h2><p class="note">배운 것을 눌러서 다시 들어요.</p>`;
  if (!kanaDone.length && !phDone.length) html += `<section class="panel center"><p>레슨을 마치면 배운 글자와 문장이 여기에 모여요.</p></section>`;
  if (kanaDone.length) {
    html += `<h3 class="unit">글자</h3><div class="kgrid">` +
      kanaDone.map(l => l.items.map(id => `<button class="kcell" data-say="${ITEMS[id].say}"><span class="jp">${ITEMS[id].jp}</span><small>${ITEMS[id].pron}</small></button>`).join('')).join('') + `</div>`;
  }
  const mustDone = phDone.reduce((x, l) => x.concat((l.items || []).filter(id => ITEMS[id].must)), []);
  if (mustDone.length) {
    html += `<h3 class="unit">⭐ 꼭 외울 문장</h3>` + mustDone.map(id => {
      const it = ITEMS[id];
      return `<button class="brow must" data-say="${it.say}"><span class="jp">${it.jp}</span><small>${it.pron}</small><small class="mean">${it.em ? it.em + ' ' : ''}${it.ko}</small></button>`;
    }).join('');
  }
  phDone.forEach(l => {
    html += `<h3 class="unit">${l.unit} · ${l.title}</h3>` + l.items.map(id => {
      const it = ITEMS[id];
      return `<button class="brow" data-say="${it.say}">
        <span class="jp">${it.jp}</span><small>${it.pron}</small><small class="mean">${it.must ? '⭐ ' : ''}${it.sales ? '💰 ' : ''}${it.em ? it.em + ' ' : ''}${it.ko}</small>
        ${it.g === 'phrase' && !it.ok ? '<i class="badge">검수 전</i>' : ''}</button>`;
    }).join('');
  });
  el.innerHTML = html;
  el.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
}

function viewSet(el) {
  const row = (k, name, desc) => `
    <label class="srow"><span><b>${name}</b><small>${desc}</small></span>
      <input type="checkbox" data-k="${k}" ${S.set[k] ? 'checked' : ''}><i class="sw"></i></label>`;
  const noVoice = !('speechSynthesis' in window);
  el.innerHTML = `
    <h2 class="ptitle">설정</h2>
    <section class="panel">
      ${row('pron', '한글 발음 표시', '글자에 익숙해지면 꺼 보세요')}
      ${row('slow', '천천히 듣기', '일본어 음성을 느리게')}
      ${row('sfx', '효과음', '정답·오답 소리')}
    </section>
    <section class="panel">
      <button class="btn ghost" id="test">🔊 일본어 음성 시험</button>
      ${noVoice ? '<p class="note">이 브라우저는 음성 읽기를 지원하지 않아요.</p>' : '<p class="note">소리가 안 나면 무음 스위치와 음량을 확인하세요.</p>'}
    </section>
    <section class="panel">
      <button class="btn ghost danger" id="reset">진도 초기화</button>
      <p class="note">진도는 이 기기에만 저장돼요.</p>
    </section>`;
  el.querySelectorAll('input[data-k]').forEach(i => i.onchange = () => { S.set[i.dataset.k] = i.checked; save(); });
  document.getElementById('test').onclick = () => speak('いらっしゃいませ');
  document.getElementById('reset').onclick = () => {
    if (!confirm('진도와 연속 학습일을 모두 지울까요? 되돌릴 수 없습니다.')) return;
    S = JSON.parse(JSON.stringify(DEF)); save(); renderHome();
  };
}

/* ───────── 시작 ───────── */
/* ───────── 새 내용 자동 반영 ─────────
 * ver.js 의 APP_VER 는 지금 화면에 올라온 파일의 번호, version.json 은 서버의 최신 번호.
 * 앱을 열 때와 다른 앱에 갔다 돌아올 때 비교해서, 다르면 새로 불러온다.
 * 레슨 중에는 끊지 않고 홈으로 돌아올 때 불러온다. */
let needReload = false;
function reloadOnce(v) {
  try {
    if (sessionStorage.getItem('bn_reloaded') === String(v)) return;   // 같은 번호로 두 번 돌지 않는다
    sessionStorage.setItem('bn_reloaded', String(v));
  } catch (e) { return; }
  location.reload();
}
async function checkVersion() {
  if (typeof APP_VER === 'undefined') return;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const v = (await r.json()).v;
    if (v === APP_VER) return;
    if (sess) needReload = v; else reloadOnce(v);
  } catch (e) { /* 인터넷이 없으면 지금 내용 그대로 */ }
}

renderHome();
checkVersion();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
window.addEventListener('pageshow', e => { if (e.persisted) checkVersion(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
