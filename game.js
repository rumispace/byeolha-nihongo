/* 별하 일본어 — "약국 영업" 모드
 *
 * 옆에서 본 2D 약국에 손님이 걸어 들어와 말을 걸고, 알맞은 일본어를 골라 응대한다.
 * 그림은 전부 이 파일에서 SVG 로 그린다(외부 그림·라이브러리 없음). 대본은 scenes.js.
 */
'use strict';

const SHOP_PER_DAY = 3;
const STAGE_W = 400, STAGE_H = 250;      // 무대 좌표. 화면 크기에 맞춰 통째로 확대한다
const CUST_DOOR_X = 52, CUST_STOP_X = 122;
let shop = null;

/* ───────── 캐릭터 ─────────
 * 머리가 크고 몸이 작은 2등신. look 으로 머리 모양·옷·소품을 바꾼다. */
const OL = '#4A3426';
function chibi(look) {
  const skin = look.pale ? '#F6E6DC' : '#FFE0C4';
  const hc = look.hairColor || '#3B2A20';
  const s = `stroke="${OL}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
  const back = {
    long: `<path d="M13 46 Q11 11 45 11 Q79 11 77 46 L80 86 Q70 93 62 86 L62 60 L28 60 L28 86 Q20 93 10 86 Z" fill="${hc}" ${s}/>`,
    bob: `<path d="M13 46 Q11 11 45 11 Q79 11 77 46 Q79 64 70 72 L20 72 Q11 64 13 46 Z" fill="${hc}" ${s}/>`,
    short: `<path d="M15 44 Q13 12 45 12 Q77 12 75 44 Q75 52 71 54 L19 54 Q15 52 15 44 Z" fill="${hc}" ${s}/>`,
    pony: `<ellipse cx="79" cy="42" rx="8" ry="17" transform="rotate(18 79 42)" fill="${hc}" ${s}/><path d="M15 44 Q13 12 45 12 Q77 12 75 44 Q75 52 71 54 L19 54 Q15 52 15 44 Z" fill="${hc}" ${s}/>`,
  }[look.hair || 'short'];
  const coat = look.coat;
  return `
  <svg viewBox="0 0 90 120" class="chr">
    <ellipse cx="45" cy="114" rx="22" ry="4.5" fill="rgba(60,40,20,.18)"/>
    <g class="bodyg">
      <g class="hairb">${back}</g>
      <g class="legs">
        <g class="leg l"><rect x="35" y="96" width="8.5" height="15" rx="3.5" fill="${look.pants}" ${s}/><ellipse cx="38.5" cy="112" rx="6.5" ry="3.6" fill="#5A4636" ${s}/></g>
        <g class="leg r"><rect x="46.5" y="96" width="8.5" height="15" rx="3.5" fill="${look.pants}" ${s}/><ellipse cx="51.5" cy="112" rx="6.5" ry="3.6" fill="#5A4636" ${s}/></g>
      </g>
      <rect class="arm l" x="20" y="73" width="9.5" height="22" rx="4.7" fill="${look.shirt}" ${s}/>
      <rect class="arm r" x="60.5" y="73" width="9.5" height="22" rx="4.7" fill="${look.shirt}" ${s}/>
      <circle cx="24.7" cy="96" r="4.6" fill="${skin}" ${s}/>
      <circle cx="65.3" cy="96" r="4.6" fill="${skin}" ${s}/>
      <path d="M29 73 Q45 66 61 73 L64 98 Q45 104 26 98 Z" fill="${look.shirt}" ${s}/>
      ${coat ? `<path d="M45 70 L40 82 M45 70 L50 82" fill="none" ${s}/><rect x="50" y="84" width="9" height="8" rx="1.5" fill="#fff" ${s}/><path d="M54.5 85.5 V90.5 M52 88 H57" stroke="#12A56B" stroke-width="2.2" stroke-linecap="round"/>` : ''}
      ${look.scarf ? `<rect x="27" y="68" width="36" height="10" rx="5" fill="#E94E5A" ${s}/><rect x="52" y="74" width="9" height="16" rx="3" fill="#E94E5A" ${s}/>` : ''}
      ${look.bag ? `<path d="M67 86 Q74 74 81 86" fill="none" ${s}/><rect x="64" y="86" width="20" height="21" rx="2.5" fill="#fff" ${s}/><rect x="64" y="92" width="20" height="5" fill="#FF8A5B"/>` : ''}
      ${look.phone ? `<rect x="61" y="84" width="10" height="16" rx="2.4" fill="#2B2D42" ${s}/><rect x="63" y="86.5" width="6" height="10" rx="1" fill="#9BD8FF"/>` : ''}
      <g class="head">
        <ellipse cx="45" cy="46" rx="29" ry="27" fill="${skin}" ${s}/>
        <path d="M17 43 Q18 16 45 15 Q72 16 73 43 Q66 30 56 33 Q50 24 40 33 Q30 28 17 43 Z" fill="${hc}" ${s}/>
        <g class="eyes e-open">
          <ellipse cx="34" cy="50" rx="4.6" ry="6.8" fill="#3B2A22"/><circle cx="35.7" cy="47.2" r="1.9" fill="#fff"/><circle cx="32.7" cy="52.6" r=".9" fill="#fff"/>
          <ellipse cx="56" cy="50" rx="4.6" ry="6.8" fill="#3B2A22"/><circle cx="57.7" cy="47.2" r="1.9" fill="#fff"/><circle cx="54.7" cy="52.6" r=".9" fill="#fff"/>
        </g>
        <g class="eyes e-happy" fill="none" stroke="#3B2A22" stroke-width="2.6" stroke-linecap="round"><path d="M29 52 Q34 44.5 39 52"/><path d="M51 52 Q56 44.5 61 52"/></g>
        ${look.pale ? `<path d="M28 41 L39 44 M62 41 L51 44" fill="none" stroke="${OL}" stroke-width="2" stroke-linecap="round"/><path d="M70 34 Q73 40 70 43 Q67 40 70 34Z" fill="#8FD3FF" stroke="#5AA9DD" stroke-width="1"/>` : ''}
        <ellipse class="blush" cx="25.5" cy="58" rx="5" ry="3" fill="#FF9AA2"/><ellipse class="blush" cx="64.5" cy="58" rx="5" ry="3" fill="#FF9AA2"/>
        ${look.mask ? `<path d="M27 56 Q45 51 63 56 L61 68 Q45 75 29 68 Z" fill="#fff" ${s}/><path d="M33 61 H57 M35 65 H55" stroke="#D5DCE8" stroke-width="1.4" stroke-linecap="round"/>`
      : `<path class="mouth m-idle" d="M41 61.5 Q45 64.5 49 61.5" fill="none" ${s}/>
           <path class="mouth m-happy" d="M39 59.5 Q45 70 51 59.5 Z" fill="#E8556D" ${s}/>
           <ellipse class="mouth m-oh" cx="45" cy="63" rx="2.8" ry="3.4" fill="#7A3B2E"/>`}
        ${look.tape ? `<rect x="40" y="52" width="10" height="5" rx="1.5" fill="#fff" stroke="#C9CED8" stroke-width="1"/><rect x="58" y="60" width="8" height="4.5" rx="1.5" fill="#fff" stroke="#C9CED8" stroke-width="1" transform="rotate(-12 62 62)"/>` : ''}
        ${look.hat ? `<path d="M22 24 Q22 3 45 3 Q68 3 68 24 Z" fill="#33405F" ${s}/><ellipse cx="45" cy="24" rx="35" ry="6.5" fill="#33405F" ${s}/><path d="M23 19 Q45 14 67 19" fill="none" stroke="#FFC94D" stroke-width="3"/>` : ''}
        ${coat ? `<circle cx="67" cy="24" r="4.5" fill="#FF8FA3" ${s}/>` : ''}
      </g>
    </g>
  </svg>`;
}

/* ───────── 배경 ───────── */
function shelfItems() {
  const cols = ['#FF9FB2', '#8ECAE6', '#FFD166', '#95D5B2', '#CDB4DB', '#F4A261', '#90E0EF', '#FFFFFF'];
  let out = '';
  [70, 97, 124].forEach((y, r) => {
    for (let k = 0; k < 8; k++) {
      const x = 240 + k * 12.2, c = cols[(k * 3 + r * 5) % cols.length], h = 12 + ((k * 7 + r * 3) % 4) * 2.2;
      out += (k + r) % 3 === 0
        ? `<rect x="${x}" y="${y - h}" width="8.5" height="${h}" rx="2.6" fill="${c}" stroke="${OL}" stroke-width="1.3"/><rect x="${x + 2}" y="${y - h - 3}" width="4.5" height="3.6" rx="1" fill="#fff" stroke="${OL}" stroke-width="1.1"/>`
        : `<rect x="${x}" y="${y - h}" width="9.5" height="${h}" rx="1.4" fill="${c}" stroke="${OL}" stroke-width="1.3"/><rect x="${x + 1.6}" y="${y - h + 3}" width="6.3" height="3" fill="rgba(255,255,255,.75)"/>`;
    }
  });
  return out;
}
function stageSVG() {
  let tiles = '';
  for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) if ((k + r) % 2 === 0) tiles += `<rect x="${k * 30 - 10}" y="${176 + r * 25}" width="30" height="25" fill="#E6BC84"/>`;
  let stripes = '';
  for (let x = 10; x < 400; x += 22) stripes += `<rect x="${x}" y="0" width="9" height="136" fill="#FFE8BF"/>`;
  return `
  <svg viewBox="0 0 400 250" class="stage-bg" preserveAspectRatio="none">
    <rect width="400" height="176" fill="#FFF2D9"/>${stripes}
    <rect y="136" width="400" height="40" fill="#F4D4A2"/><rect y="134" width="400" height="4" fill="#C99A62"/>
    <rect y="176" width="400" height="74" fill="#F1CD99"/>${tiles}<rect y="174" width="400" height="3.5" fill="#B98552"/>

    <rect x="150" y="62" width="58" height="52" rx="5" fill="#BFE6FF" stroke="${OL}" stroke-width="2.4"/>
    <ellipse cx="166" cy="80" rx="9" ry="4.5" fill="#fff"/><ellipse cx="174" cy="77" rx="8" ry="5" fill="#fff"/><ellipse cx="193" cy="96" rx="8" ry="4" fill="#fff"/>
    <path d="M179 62 V114 M150 88 H208" stroke="${OL}" stroke-width="2.2"/>
    <rect x="146" y="113" width="66" height="5" rx="2" fill="#fff" stroke="${OL}" stroke-width="2"/>
    <path d="M150 62 Q160 78 150 96 M208 62 Q198 78 208 96" fill="#FFB3C1" stroke="${OL}" stroke-width="1.8"/>

    <rect x="62" y="70" width="52" height="106" rx="4" fill="#DDF3FF" stroke="${OL}" stroke-width="2.6"/>
    <g class="door"><rect x="64" y="72" width="48" height="104" rx="3" fill="#E0965A" stroke="${OL}" stroke-width="2.4"/>
      <rect x="70" y="80" width="36" height="42" rx="3" fill="#CFEFFF" stroke="${OL}" stroke-width="2"/>
      <rect x="77" y="94" width="22" height="11" rx="2" fill="#fff" stroke="${OL}" stroke-width="1.4"/><text x="88" y="102.5" text-anchor="middle" font-size="7" font-weight="800" fill="#12A56B">OPEN</text>
      <circle cx="104" cy="132" r="3.2" fill="#FFC94D" stroke="${OL}" stroke-width="1.6"/></g>
    <path d="M88 62 q-5 6 -5 10 h10 q0 -4 -5 -10z" fill="#FFC94D" stroke="${OL}" stroke-width="1.6"/>

    <ellipse cx="136" cy="152" rx="10" ry="14" fill="#5DBB7A" stroke="${OL}" stroke-width="2"/><ellipse cx="128" cy="158" rx="7" ry="10" fill="#7BD694" stroke="${OL}" stroke-width="2"/><ellipse cx="144" cy="158" rx="7" ry="10" fill="#7BD694" stroke="${OL}" stroke-width="2"/>
    <path d="M127 164 H145 L142 177 H130 Z" fill="#D9895B" stroke="${OL}" stroke-width="2"/>

    <path d="M250 22 V34 M312 22 V34" stroke="${OL}" stroke-width="2"/>
    <rect x="232" y="32" width="98" height="24" rx="7" fill="#12A56B" stroke="${OL}" stroke-width="2.4"/>
    <path d="M243 39 V49 M238 44 H248" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
    <text x="291" y="49" text-anchor="middle" font-size="14" font-weight="900" fill="#fff" font-family="'Hiragino Maru Gothic ProN','Apple SD Gothic Neo',sans-serif">약국 薬局</text>

    <rect x="234" y="60" width="104" height="72" rx="3" fill="#C48A55" stroke="${OL}" stroke-width="2.4"/>
    <rect x="238" y="64" width="96" height="64" fill="#FFF6E5"/>
    ${shelfItems()}
    <path d="M238 70.5 H334 M238 97.5 H334 M238 124.5 H334" stroke="#C48A55" stroke-width="3"/>
    <path d="M222 0 V16" stroke="${OL}" stroke-width="1.8"/><path d="M212 26 Q222 10 232 26 Z" fill="#FFD166" stroke="${OL}" stroke-width="2"/>
  </svg>`;
}
function counterSVG() {
  return `
  <svg viewBox="0 0 400 250" class="stage-fg" preserveAspectRatio="none">
    <rect x="222" y="160" width="140" height="62" rx="4" fill="#E2A96B" stroke="${OL}" stroke-width="2.6"/>
    <path d="M222 182 H362 M222 202 H362" stroke="#C98B4F" stroke-width="1.6"/>
    <rect x="216" y="152" width="152" height="12" rx="4" fill="#FFDFA8" stroke="${OL}" stroke-width="2.6"/>
    <circle cx="254" cy="192" r="13" fill="#fff" stroke="${OL}" stroke-width="2.2"/><path d="M254 184 V200 M246 192 H262" stroke="#12A56B" stroke-width="5" stroke-linecap="round"/>
    <rect x="318" y="134" width="30" height="19" rx="3" fill="#4B5673" stroke="${OL}" stroke-width="2.2"/><rect x="322" y="126" width="22" height="10" rx="2" fill="#9BD8FF" stroke="${OL}" stroke-width="2"/>
    <g class="prod"><rect x="236" y="134" width="13" height="18" rx="2.4" fill="#FF9FB2" stroke="${OL}" stroke-width="2"/><rect x="238.5" y="139" width="8" height="4" fill="#fff"/><path d="M225 130 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2z" fill="#FFD166" stroke="${OL}" stroke-width="1"/></g>
  </svg>`;
}

/* ───────── 화면 ───────── */
const shopWon = n => n.toLocaleString('ko-KR') + '원';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PHARMACIST = { hair: 'pony', hairColor: '#6B4630', shirt: '#FFFFFF', pants: '#5C6B8A', coat: true };

function startShop() {
  stopSound();
  app.innerHTML = `
    <div class="shop">
      <div class="shop-view" id="sv">
        <div class="stage" id="stg">
          ${stageSVG()}
          <div class="actor pharm" id="spharm">${chibi(PHARMACIST)}<i class="emote"></i></div>
          ${counterSVG()}
          <div class="actor cust" id="scust" hidden></div>
          <div class="coin" id="scoin" hidden></div>
        </div>
        <div class="shop-hud">
          <button class="x" id="squit" aria-label="그만두기">✕</button>
          <span class="pill" id="scount"></span>
          <span class="pill" id="ssat"></span>
          <span class="pill" id="ssale"></span>
        </div>
        <div class="shop-bubble" id="sb" hidden></div>
      </div>
      <div class="shop-panel" id="sp"></div>
    </div>`;

  // 하루 손님: 같은 유형이 겹치지 않게
  const today = [], seen = new Set();
  shuffle(SHOP_SCRIPTS).forEach(sc => { if (today.length < SHOP_PER_DAY && !seen.has(sc.type)) { today.push(sc); seen.add(sc.type); } });

  const view = document.getElementById('sv'), stg = document.getElementById('stg');
  const fit = () => {
    if (!shop) return;
    // 가운데 290 폭(문~카운터)이 화면 폭에 꼭 맞게 확대한다. 무대 높이는 그 비율로 정하되 화면의 절반을 넘기지 않는다.
    // 넘치는 부분은 바닥을 조금, 나머지는 위(천장 쪽)에서 자른다
    const w = view.clientWidth, s = w / 290;
    const h = Math.round(Math.min((STAGE_H - 22) * s, window.innerHeight * 0.5));
    view.style.height = h + 'px';
    const over = STAGE_H * s - h, cutBottom = Math.min(22 * s, over);
    stg.style.transform = `translate(${(w - STAGE_W * s) / 2}px, ${-(over - cutBottom)}px) scale(${s})`;
  };
  shop = { today, idx: 0, sales: 0, sat: [], misses: [], view, fit };
  fit();
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) { shop.ro = new ResizeObserver(fit); shop.ro.observe(view); }
  document.getElementById('squit').onclick = () => {
    if (!confirm('영업을 그만둘까요? 오늘 기록은 저장되지 않습니다.')) return;
    closeShop(); renderHome();
  };
  runDay();
}

function closeShop() {
  if (!shop) return;
  window.removeEventListener('resize', shop.fit);
  if (shop.ro) shop.ro.disconnect();
  stopSound();
  shop = null;
}

/* 배우 다루기 */
function setMood(el, mood, emote) {
  if (!el) return;
  el.classList.remove('happy', 'confused', 'talk');
  void el.offsetWidth;                       // 같은 동작을 연달아 다시 재생하려면 한 번 끊어 줘야 한다
  if (mood) el.classList.add(mood);
  const em = el.querySelector('.emote');
  if (em) { em.textContent = emote || ''; em.classList.toggle('on', !!emote); }
}
async function walkTo(el, x, ms) {
  // 모션을 줄였으면 걷는 시간을 기다리지 않는다
  if (S.set.motion === false || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) ms = 60;
  el.classList.add('walking');
  el.style.transitionDuration = ms + 'ms';
  el.style.left = x + 'px';
  await wait(ms);
  el.classList.remove('walking');
}

/* ───────── 영업 진행 ───────── */
function hud() {
  if (!shop) return;
  const s = shop, cur = s.sat[s.idx];
  document.getElementById('scount').textContent = `손님 ${Math.min(s.idx + 1, s.today.length)}/${s.today.length}`;
  document.getElementById('ssat').textContent = cur == null ? '💗💗💗' : '💗'.repeat(cur) + '🤍'.repeat(3 - cur);
  document.getElementById('ssale').textContent = '💰 ' + shopWon(s.sales);
}

async function runDay() {
  const s = shop;
  for (s.idx = 0; s.idx < s.today.length; s.idx++) {
    if (shop !== s) return;
    await runCustomer(s.today[s.idx]);
  }
  if (shop === s) endDay();
}

async function runCustomer(sc) {
  const s = shop;
  s.sat[s.idx] = 3; hud();
  const view = s.view, c = document.getElementById('scust'), ph = document.getElementById('spharm');
  view.classList.remove('sold');
  c.innerHTML = chibi(sc.look) + `<i class="emote"></i><b class="tag">${sc.name}</b>`;
  c.style.transitionDuration = '0ms'; c.style.left = CUST_DOOR_X + 'px';
  c.hidden = false; c.classList.add('arrive');
  panel(`<p class="shop-wait">🔔 딸랑~ ${SHOP_TYPES[sc.type].em} 손님이 왔어요</p>`);
  view.classList.add('dooropen'); sfx('ok');
  await wait(450);
  if (shop !== s) return;
  c.classList.remove('arrive');
  await walkTo(c, CUST_STOP_X, 1500);
  view.classList.remove('dooropen');

  for (const turn of sc.turns) {
    if (shop !== s) return;
    await runTurn(turn, c, ph);
  }
  if (shop !== s) return;

  bubble(null);
  const sold = s.sat[s.idx] > 0;
  if (sold) {
    s.sales += sc.sale; sfx('win');
    const coin = document.getElementById('scoin');
    coin.textContent = '+' + shopWon(sc.sale); coin.hidden = false;
    setTimeout(() => { coin.hidden = true; }, 1300);
  }
  hud();
  panel(`<p class="shop-wait">${sold ? `💰 ${shopWon(sc.sale)} 판매!` : '손님이 그냥 나갔어요…'}</p>`);
  setMood(c, sold ? 'happy' : 'confused', sold ? '♪' : '…');
  setMood(ph, sold ? 'happy' : '', '');
  await wait(900);
  if (shop !== s) return;
  setMood(c, '', ''); setMood(ph, '', '');
  view.classList.add('dooropen');
  await walkTo(c, CUST_DOOR_X, 1300);
  c.classList.add('arrive');
  await wait(300);
  c.hidden = true; c.classList.remove('arrive');
  view.classList.remove('dooropen');
  await wait(200);
}

function bubble(turn) {
  const el = document.getElementById('sb');
  if (!el) return;
  if (!turn || !turn.c) { el.hidden = true; return; }
  const [jp, p, k] = turn.c;
  el.hidden = false;
  el.innerHTML = `<span class="jp">${jp}</span>${S.set.pron ? `<small>${p}</small>` : ''}` +
    (k ? `<small class="mean" id="sbk" hidden>${k}</small><i class="peek" id="sbp">뜻 보기</i>` : '') + `<i class="spk2">${ICON.spk}</i>`;
  el.onclick = e => {
    const kk = document.getElementById('sbk'), pp = document.getElementById('sbp');
    if (e.target === pp && kk) { kk.hidden = false; pp.remove(); return; }
    speak(jp);
  };
}
function panel(html) { const el = document.getElementById('sp'); if (el) el.innerHTML = html; }

function runTurn(turn, c, ph) {
  const s = shop;
  return new Promise(resolve => {
    bubble(turn);
    if (turn.c) { speak(turn.c[0]); setMood(c, 'talk', ''); }
    const isMeans = !!turn.means;
    const opts = isMeans
      ? shuffle(turn.means.map((m, i) => ({ ok: i === 0, html: `<span>${m}</span>` })))
      : shuffle([{ ok: true, d: turn.a }].concat(turn.x.map(d => ({ ok: false, d })))).map(o => Object.assign(o, {
        html: `<span class="jp">${o.d[0]}</span>${S.set.pron ? `<small>${o.d[1]}</small>` : ''}<small class="hintko" hidden>${o.d[2]}</small>`,
      }));

    panel(`
      ${turn.sit ? `<p class="shop-sit">📍 ${turn.sit}</p>` : ''}
      <div class="shop-q"><b>${isMeans ? '손님이 뭐라고 했을까요?' : '뭐라고 할까요?'}</b>${isMeans ? '' : `<button class="hintbtn" id="hint">💡 뜻 힌트</button>`}</div>
      <div class="shop-opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${o.html}</button>`).join('')}</div>`);
    const hint = document.getElementById('hint');
    if (hint) hint.onclick = () => { document.querySelectorAll('.hintko').forEach(x => { x.hidden = false; }); hint.remove(); };

    const btns = [...document.querySelectorAll('#sp .opt')];
    btns.forEach(b => b.onclick = () => {
      if (shop !== s) return;
      const chosen = opts[+b.dataset.i], ok = chosen.ok;
      btns.forEach((x, i) => { x.disabled = true; if (opts[i].ok) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      document.querySelectorAll('.hintko').forEach(x => { x.hidden = false; });
      if (hint) hint.remove();
      if (ok) {
        sfx('ok');
        setMood(c, 'happy', '♪'); setMood(ph, 'talk', '');
        if (!isMeans) speak(turn.a[0]);
        if (!isMeans && /おすすめ|人気|合っていますか/.test(turn.a[0])) s.view.classList.add('sold');
      } else {
        sfx('no');
        setMood(c, 'confused', '?'); setMood(ph, '', '💦');
        s.sat[s.idx] = Math.max(0, s.sat[s.idx] - 1);
        if (!isMeans) { s.misses.push(turn.a); setTimeout(() => { if (shop === s) speak(turn.a[0]); }, 600); }
      }
      hud();
      let detail = '';
      if (isMeans) detail = ok ? '' : `<div class="fb-ans"><b class="jp">${turn.c[0]}</b><br>= ${turn.means[0]}</div>`;
      else if (ok) detail = `<div class="fb-ans">${turn.a[2]}</div>`;
      else detail = `<div class="fb-why">${chosen.d[3]}</div><div class="fb-ans">이렇게 말해요 → <b class="jp">${turn.a[0]}</b><br>${turn.a[1]} · ${turn.a[2]}</div>`;
      const fb = document.createElement('div');
      fb.className = 'shop-fb ' + (ok ? 'good' : 'bad');
      fb.innerHTML = `<div><strong>${ok ? pick(REACT.ok) + ' 좋아요!' : pick(REACT.no) + ' 손님이 갸웃해요'}</strong>${detail}</div><button class="btn ${ok ? 'ok' : 'no'}" id="snext">계속</button>`;
      document.getElementById('sp').appendChild(fb);
      fb.scrollIntoView({ block: 'end' });
      document.getElementById('snext').onclick = () => { if (shop !== s) return; setMood(c, '', ''); setMood(ph, '', ''); resolve(); };
    });
  });
}

function endDay() {
  const s = shop;
  const avg = s.sat.reduce((a, b) => a + b, 0) / s.sat.length;
  const stars = Math.max(1, Math.round(avg));
  const gain = 15 + (s.misses.length === 0 ? 5 : 0);
  S.xp += gain;
  const t = dayStr();
  if (S.lastDay !== t) { S.streak = S.lastDay === dayStr(-1) ? S.streak + 1 : 1; S.lastDay = t; }
  S.shop = S.shop || { days: 0, total: 0, best: 0 };
  S.shop.days++; S.shop.total += s.sales; S.shop.best = Math.max(S.shop.best, s.sales);
  save();
  const miss = s.misses.filter((m, i, a) => a.findIndex(x => x[0] === m[0]) === i);
  const sales = s.sales;
  closeShop();
  sfx('win');
  app.innerHTML = `
    <div class="finish shopend">
      <div class="endchr">${chibi(PHARMACIST)}</div>
      <h1>오늘 영업 끝!</h1>
      <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="stats">
        <div><b>${shopWon(sales)}</b><span>오늘 매출</span></div>
        <div><b>+${gain}</b><span>경험치</span></div>
        <div><b>${S.streak}일</b><span>연속 학습</span></div>
      </div>
      ${miss.length ? `<div class="todaycard"><span class="tag">다시 볼 문장</span>${miss.map(m =>
    `<button class="say" data-say="${m[0]}"><span class="jp">${m[0]}</span><small>${m[1]}</small><small class="mean">${m[2]} ${ICON.spk}</small></button>`).join('')}</div>`
      : `<p class="note">한 번도 틀리지 않았어요. 완벽한 응대였습니다.</p>`}
      <p class="note">지금까지 ${S.shop.days}일 영업 · 누적 매출 ${shopWon(S.shop.total)}</p>
      <button class="btn" id="again">하루 더 영업하기</button>
      <button class="btn ghost" id="home">홈으로</button>
    </div>`;
  app.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
  document.getElementById('again').onclick = startShop;
  document.getElementById('home').onclick = renderHome;
}
