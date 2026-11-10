/* 별하 일본어 — "약국 영업" 모드
 *
 * 3D 약국 카운터에 손님이 들어와 말을 걸고, 알맞은 일본어를 골라 응대한다.
 * 문장과 음성은 레슨의 것을 그대로 쓴다(data.js, audio/). 대본은 scenes.js.
 * three.js 는 이 모드를 처음 열 때만 불러온다.
 */
'use strict';

const SHOP_PER_DAY = 3;
const SHOP_STOP_Z = 1.9;   // 손님이 카운터 앞에 서는 자리
let shop = null;   // 진행 중인 영업

function loadThree() {
  if (window.THREE) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'vendor/three.min.js';
    s.onload = ok;
    s.onerror = () => fail(new Error('three'));
    document.head.appendChild(s);
  });
}

/* ───────── 3D 약국 ───────── */
function buildPharmacy(T) {
  const scene = new T.Scene();
  scene.background = new T.Color(0xDCE8FA);
  const mat = c => new T.MeshLambertMaterial({ color: c });
  const box = (w, h, d, c, x, y, z) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z); scene.add(m); return m;
  };

  scene.add(new T.HemisphereLight(0xffffff, 0xB9B2A6, 0.82));
  const sun = new T.DirectionalLight(0xffffff, 0.42);
  sun.position.set(2.5, 5, 4); scene.add(sun);

  // 바닥·벽
  box(8, 0.1, 11, 0xD9CBB3, 0, -0.05, -0.5);
  for (let i = 0; i < 5; i++) box(8, 0.012, 0.06, 0xC8B89C, 0, 0.005, -4 + i * 1.6);
  box(8, 3.4, 0.12, 0xF8F4EC, 0, 1.7, -4.3);            // 뒷벽
  box(0.12, 3.4, 9, 0xF3EEE4, -3.0, 1.7, -0.5);
  box(0.12, 3.4, 9, 0xF3EEE4, 3.0, 1.7, -0.5);
  // 천장: 아래에서 올려다보는 면이라 조명을 받지 못한다. 스스로 밝은 재질로
  const ceil = new T.Mesh(new T.BoxGeometry(8, 0.1, 11), new T.MeshBasicMaterial({ color: 0xF4F1EA }));
  ceil.position.set(0, 3.45, -0.5); scene.add(ceil);
  box(1.8, 0.02, 1.0, 0x4257E8, 0, 0.012, -3.5);        // 문 앞 매트

  // 문: 경첩 쪽을 축으로 열린다
  box(1.5, 2.5, 0.06, 0xBFD9F2, 0, 1.25, -4.22);        // 문 너머 바깥 빛
  box(0.1, 2.6, 0.2, 0xFFFFFF, -0.8, 1.3, -4.2);
  box(0.1, 2.6, 0.2, 0xFFFFFF, 0.8, 1.3, -4.2);
  box(1.7, 0.1, 0.2, 0xFFFFFF, 0, 2.6, -4.2);
  const door = new T.Group();
  door.position.set(-0.75, 0, -4.12);
  const leaf = new T.Mesh(new T.BoxGeometry(1.5, 2.5, 0.06), new T.MeshLambertMaterial({ color: 0x8FC1EA, transparent: true, opacity: 0.75 }));
  leaf.position.set(0.75, 1.25, 0);
  const knob = new T.Mesh(new T.BoxGeometry(0.06, 0.4, 0.1), mat(0xFFC94D));
  knob.position.set(1.3, 1.2, 0.05);
  door.add(leaf, knob); scene.add(door);

  // 간판: 글자는 그려서 붙인다
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#12A56B'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff'; g.font = 'bold 76px "Hiragino Sans","Apple SD Gothic Neo",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('약국  薬局', 256, 68);
  const sign = new T.Mesh(new T.PlaneGeometry(2.4, 0.6), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv) }));
  sign.position.set(0, 3.0, -4.22); scene.add(sign);
  // 초록 십자
  box(0.5, 0.16, 0.05, 0x12A56B, 2.0, 2.3, -4.22); box(0.16, 0.5, 0.05, 0x12A56B, 2.0, 2.3, -4.22);
  box(0.5, 0.16, 0.05, 0x12A56B, -2.0, 2.3, -4.22); box(0.16, 0.5, 0.05, 0x12A56B, -2.0, 2.3, -4.22);

  // 양옆 진열대와 제품 상자
  const colors = [0xFF8FA3, 0x8ECAE6, 0xFFD166, 0x95D5B2, 0xCDB4DB, 0xFFFFFF, 0xF4A261, 0x90E0EF];
  const pg = new T.BoxGeometry(0.2, 0.3, 0.3);
  const pm = colors.map(mat);
  [-1, 1].forEach(side => {
    box(0.45, 2.5, 5.6, 0xFFFFFF, side * 2.72, 1.25, -1.3);
    for (let r = 0; r < 4; r++) {
      box(0.5, 0.05, 5.6, 0xE7EBF5, side * 2.68, 0.3 + r * 0.6, -1.3);
      for (let k = 0; k < 13; k++) {
        const m = new T.Mesh(pg, pm[(r * 5 + k * 3 + (side > 0 ? 2 : 0)) % pm.length]);
        m.position.set(side * 2.46, 0.48 + r * 0.6, -3.9 + k * 0.43);
        m.scale.y = 0.75 + ((k * 7 + r * 3) % 5) * 0.08;
        scene.add(m);
      }
    }
  });
  // 화분
  const pot = new T.Mesh(new T.CylinderGeometry(0.2, 0.15, 0.35, 10), mat(0xC97B4A)); pot.position.set(1.5, 0.175, -3.7); scene.add(pot);
  const leaf1 = new T.Mesh(new T.SphereGeometry(0.38, 8, 6), mat(0x4CAF7A)); leaf1.position.set(1.5, 0.75, -3.7); leaf1.scale.y = 1.4; scene.add(leaf1);

  // 카운터(화면 아래쪽)와 계산대
  box(3.6, 1.0, 0.7, 0xB98A5A, 0, 0.5, 3.35);
  box(3.7, 0.06, 0.8, 0xDDBF95, 0, 1.03, 3.35);
  box(0.46, 0.26, 0.34, 0x2B2D42, 1.05, 1.19, 3.3);
  box(0.38, 0.22, 0.03, 0x8ECAE6, 1.05, 1.38, 3.16);
  box(0.1, 0.22, 0.1, 0x95D5B2, -1.15, 1.17, 3.25);
  // 손님이 고른 제품: 추천에 성공하면 카운터에 올라온다
  const product = box(0.2, 0.28, 0.14, 0xFF8FA3, -0.3, 1.2, 3.15);
  product.visible = false;

  const cam = new T.PerspectiveCamera(52, 1, 0.1, 40);
  cam.position.set(0, 1.75, 4.6);
  cam.lookAt(0, 1.45, 0);
  return { scene, cam, door, product };
}

/* 손님: 단순한 도형으로 만든 캐릭터 */
function makeCustomer(T, look) {
  const mat = c => new T.MeshLambertMaterial({ color: c });
  const skin = 0xFFD9B8;
  const g = new T.Group();
  const add = (geo, c, x, y, z, parent) => { const m = new T.Mesh(geo, mat(c)); m.position.set(x, y, z); (parent || g).add(m); return m; };

  const legL = add(new T.CylinderGeometry(0.075, 0.075, 0.78, 8), look.pants, -0.11, 0.39, 0);
  const legR = add(new T.CylinderGeometry(0.075, 0.075, 0.78, 8), look.pants, 0.11, 0.39, 0);
  add(new T.CylinderGeometry(0.2, 0.27, 0.68, 12), look.shirt, 0, 1.08, 0);
  add(new T.SphereGeometry(0.2, 12, 8), look.shirt, 0, 1.4, 0).scale.y = 0.5;
  const armL = add(new T.CylinderGeometry(0.055, 0.055, 0.58, 8), look.shirt, -0.3, 1.1, 0);
  const armR = add(new T.CylinderGeometry(0.055, 0.055, 0.58, 8), look.shirt, 0.3, 1.1, 0);
  armL.rotation.z = -0.15; armR.rotation.z = 0.15;
  add(new T.SphereGeometry(0.06, 8, 6), skin, -0.345, 0.8, 0);
  add(new T.SphereGeometry(0.06, 8, 6), skin, 0.345, 0.8, 0);

  const head = new T.Group(); head.position.set(0, 1.68, 0); g.add(head);
  add(new T.SphereGeometry(0.23, 16, 12), skin, 0, 0, 0, head);
  const hair = add(new T.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), look.hair, 0, 0.02, -0.02, head);
  hair.rotation.x = -0.25;
  if (look.long) add(new T.BoxGeometry(0.44, 0.5, 0.16), look.hair, 0, -0.2, -0.16, head);
  const eyeL = add(new T.SphereGeometry(0.028, 8, 6), 0x222222, -0.085, 0.02, 0.21, head);
  const eyeR = add(new T.SphereGeometry(0.028, 8, 6), 0x222222, 0.085, 0.02, 0.21, head);
  const cheekL = add(new T.SphereGeometry(0.04, 8, 6), 0xFF9AA2, -0.14, -0.05, 0.18, head);
  const cheekR = add(new T.SphereGeometry(0.04, 8, 6), 0xFF9AA2, 0.14, -0.05, 0.18, head);
  cheekL.scale.z = cheekR.scale.z = 0.3;
  cheekL.visible = cheekR.visible = false;
  // 입: 웃음(∪), 보통(—), 갸웃(o)
  const smile = add(new T.TorusGeometry(0.055, 0.013, 6, 12, Math.PI), 0xC0392B, 0, -0.075, 0.215, head);
  smile.rotation.z = Math.PI;
  const flat = add(new T.BoxGeometry(0.07, 0.014, 0.01), 0xA0522D, 0, -0.1, 0.225, head);
  const oh = add(new T.SphereGeometry(0.028, 8, 6), 0xA0522D, 0, -0.1, 0.22, head);
  const mouths = { smile, flat, oh };

  if (look.mask) { const m = add(new T.BoxGeometry(0.3, 0.16, 0.06), 0xFFFFFF, 0, -0.09, 0.2, head); m.rotation.x = 0.1; }
  if (look.tape) { add(new T.BoxGeometry(0.1, 0.035, 0.02), 0xFFFFFF, 0, 0.0, 0.235, head); add(new T.BoxGeometry(0.035, 0.09, 0.02), 0xFFFFFF, 0.13, -0.02, 0.19, head); }
  if (look.hat) { add(new T.CylinderGeometry(0.33, 0.33, 0.03, 16), 0x2B2D42, 0, 0.14, 0, head); add(new T.CylinderGeometry(0.2, 0.22, 0.16, 16), 0x2B2D42, 0, 0.22, 0, head); }
  if (look.scarf) add(new T.CylinderGeometry(0.2, 0.22, 0.14, 12), 0xE63946, 0, 1.46, 0);
  if (look.bag) { add(new T.BoxGeometry(0.26, 0.3, 0.1), 0xFFFFFF, 0.36, 0.6, 0.05); add(new T.BoxGeometry(0.26, 0.06, 0.1), 0xFF7A45, 0.36, 0.72, 0.05); }

  // 발밑 그림자
  const sh = new T.Mesh(new T.CircleGeometry(0.34, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.13 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; g.add(sh);

  function face(kind) {
    const masked = !!look.mask;
    Object.keys(mouths).forEach(k => { mouths[k].visible = !masked && k === (kind === 'happy' ? 'smile' : kind === 'confused' ? 'oh' : 'flat'); });
    cheekL.visible = cheekR.visible = kind === 'happy';
    const sq = kind === 'happy' ? 0.35 : 1;      // 웃으면 눈이 가늘어진다(마스크를 써도 보인다)
    eyeL.scale.y = eyeR.scale.y = sq;
  }
  face('idle');
  return { g, head, legL, legR, armL, armR, face, mood: 'idle', t: 0 };
}

/* ───────── 화면 ───────── */
const shopWon = n => n.toLocaleString('ko-KR') + '원';

function startShop() {
  stopSound();
  app.innerHTML = `<div class="shop"><div class="shop-load"><div class="mascot big">🏪</div><p>약국 문 여는 중…</p></div></div>`;
  loadThree().then(openShop).catch(() => {
    app.innerHTML = `<div class="shop"><div class="shop-load"><p>3D 화면을 불러오지 못했어요.<br>인터넷 연결을 확인하고 다시 열어 주세요.</p><button class="btn" id="back">돌아가기</button></div></div>`;
    document.getElementById('back').onclick = renderHome;
  });
}

function openShop() {
  const T = window.THREE;
  app.innerHTML = `
    <div class="shop">
      <div class="shop-view" id="sv">
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
  const view = document.getElementById('sv');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  } catch (e) {
    app.innerHTML = `<div class="shop"><div class="shop-load"><p>이 기기에서는 3D 화면을 열 수 없어요.</p><button class="btn" id="back">돌아가기</button></div></div>`;
    document.getElementById('back').onclick = renderHome;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  view.insertBefore(renderer.domElement, view.firstChild);
  const world = buildPharmacy(T);

  // 하루 손님: 유형이 겹치지 않게 뽑는다
  const byType = {};
  SHOP_SCRIPTS.forEach(s => { (byType[s.type] = byType[s.type] || []).push(s); });
  const today = shuffle(Object.keys(byType)).slice(0, SHOP_PER_DAY).map(t => pick(byType[t]));

  shop = {
    T, renderer, world, view, today, idx: 0, sales: 0, sat: [], misses: [], cust: null,
    alive: true, anims: [], clock: new T.Clock(), doorOpen: 0, doorTarget: 0,
  };
  const fit = () => {
    if (!shop) return;
    const w = view.clientWidth, h = view.clientHeight;
    renderer.setSize(w, h, false);
    world.cam.aspect = w / h;
    world.cam.fov = w / h < 0.9 ? 60 : 52;      // 세로로 긴 화면에서는 조금 넓게
    world.cam.updateProjectionMatrix();
  };
  shop.fit = fit; fit();
  window.addEventListener('resize', fit);
  document.getElementById('squit').onclick = () => {
    if (!confirm('영업을 그만둘까요? 오늘 기록은 저장되지 않습니다.')) return;
    closeShop(); renderHome();
  };
  loop();
  runDay();
}

function closeShop() {
  if (!shop) return;
  shop.alive = false;
  window.removeEventListener('resize', shop.fit);
  stopSound();
  try { shop.renderer.dispose(); } catch (e) { /* 무시 */ }
  shop = null;
}

/* 그리기와 움직임 */
function loop() {
  if (!shop || !shop.alive) return;
  const s = shop, dt = Math.min(s.clock.getDelta(), 0.05), now = s.clock.elapsedTime;
  s.anims = s.anims.filter(a => {
    a.t += dt;
    const k = Math.min(a.t / a.dur, 1);
    a.step(k, dt);
    if (k >= 1) { a.done(); return false; }
    return true;
  });
  s.doorOpen += (s.doorTarget - s.doorOpen) * Math.min(1, dt * 6);
  s.world.door.rotation.y = -s.doorOpen * 1.35;
  const c = s.cust;
  if (c) {
    c.t += dt;
    if (c.mood === 'idle') { c.g.position.y = Math.sin(now * 2) * 0.008; c.head.rotation.z *= 0.9; c.head.rotation.x = Math.sin(now * 1.3) * 0.03; }
    if (c.mood === 'happy') { c.g.position.y = Math.abs(Math.sin(c.t * 9)) * 0.12 * Math.max(0, 1 - c.t); c.head.rotation.z *= 0.9; }
    if (c.mood === 'confused') { c.head.rotation.z = Math.sin(c.t * 5) * 0.22 * Math.max(0.3, 1 - c.t * 0.5); }
  }
  s.world.cam.position.x = Math.sin(now * 0.4) * 0.03;
  s.world.cam.lookAt(0, 1.45, 0);
  s.renderer.render(s.world.scene, s.world.cam);
  requestAnimationFrame(loop);
}
const anim = (dur, step) => new Promise(done => { if (!shop) return done(); shop.anims.push({ t: 0, dur, step, done }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

function walk(c, fromZ, toZ, dur) {
  return anim(dur, k => {
    const e = ease(k);
    c.g.position.z = fromZ + (toZ - fromZ) * e;
    const sw = Math.sin(k * dur * 9);
    c.g.position.y = Math.abs(sw) * 0.035;
    c.legL.rotation.x = sw * 0.5; c.legR.rotation.x = -sw * 0.5;
    c.armL.rotation.x = -sw * 0.4; c.armR.rotation.x = sw * 0.4;
    if (k >= 1) { c.legL.rotation.x = c.legR.rotation.x = c.armL.rotation.x = c.armR.rotation.x = 0; }
  });
}
function setMood(c, mood) { c.mood = mood; c.t = 0; c.face(mood); }

/* ───────── 영업 진행 ───────── */
function hud() {
  if (!shop) return;
  const s = shop, cur = s.sat[s.idx];
  document.getElementById('scount').textContent = `손님 ${Math.min(s.idx + 1, s.today.length)}/${s.today.length}`;
  document.getElementById('ssat').textContent = cur == null ? '🙂🙂🙂' : '😊'.repeat(cur) + '😶'.repeat(3 - cur);
  document.getElementById('ssale').textContent = '💰 ' + shopWon(s.sales);
}

async function runDay() {
  const s = shop;
  for (s.idx = 0; s.idx < s.today.length; s.idx++) {
    if (!shop || shop !== s) return;
    await runCustomer(s.today[s.idx]);
  }
  if (shop === s) endDay();
}

async function runCustomer(sc) {
  const s = shop, T = s.T;
  s.sat[s.idx] = 3; hud();
  s.world.product.visible = false;
  const c = makeCustomer(T, sc.look);
  c.g.position.set(0, 0, -3.9);
  s.world.scene.add(c.g); s.cust = c;
  panel(`<p class="shop-wait">${SHOP_TYPES[sc.type].em} 손님이 오고 있어요…</p>`);
  s.doorTarget = 1; sfx('ok');
  await wait(350);
  await walk(c, -3.9, SHOP_STOP_Z, 1.9);
  s.doorTarget = 0;
  setMood(c, 'idle');

  for (const turn of sc.turns) {
    if (shop !== s) return;
    await runTurn(sc, turn, c);
  }
  if (shop !== s) return;

  // 배웅: 만족했으면 매출로 잡힌다
  bubble(null);
  if (s.sat[s.idx] > 0) { s.sales += sc.sale; sfx('win'); }
  hud();
  panel(`<p class="shop-wait">${s.sat[s.idx] > 0 ? `💰 ${shopWon(sc.sale)} 판매!` : '손님이 그냥 나갔어요…'}</p>`);
  setMood(c, s.sat[s.idx] > 0 ? 'happy' : 'idle');
  await wait(700);
  setMood(c, 'idle');
  await anim(0.35, k => { c.g.rotation.y = Math.PI * ease(k); });
  s.doorTarget = 1;
  await walk(c, SHOP_STOP_Z, -4.3, 1.7);
  s.world.scene.remove(c.g); s.cust = null; s.doorTarget = 0;
  await wait(250);
}

function bubble(turn) {
  const el = document.getElementById('sb');
  if (!el) return;
  if (!turn || !turn.c) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span class="jp">${turn.c}</span>${S.set.pron ? `<small>${turn.p}</small>` : ''}` +
    (turn.k ? `<small class="mean" id="sbk" hidden>${turn.k}</small><i class="peek" id="sbp">뜻 보기</i>` : '') + `<i class="spk2">🔊</i>`;
  el.onclick = e => {
    const k = document.getElementById('sbk'), p = document.getElementById('sbp');
    if (e.target === p && k) { k.hidden = false; p.remove(); return; }
    speak(turn.c);
  };
}
function panel(html) { const el = document.getElementById('sp'); if (el) el.innerHTML = html; }

/* 보기 만들기: 같은 대본의 다른 대답을 하나 섞어 그럴듯하게 만든다 */
function shopOptions(sc, it) {
  const usable = id => ITEMS[id] && ITEMS[id].g === 'phrase' && !ITEMS[id].cust && !/^[vr]_/.test(id) && id !== it.id;
  const mates = shuffle(sc.turns.map(t => t.ans).filter(id => id && usable(id)));
  const others = shuffle(Object.keys(ITEMS).filter(id => usable(id) && !mates.includes(id)));
  const out = [], seen = new Set([it.ko]);
  for (const id of mates.slice(0, 1).concat(others, mates.slice(1))) {
    if (seen.has(ITEMS[id].ko)) continue;
    seen.add(ITEMS[id].ko); out.push(ITEMS[id]);
    if (out.length === 2) break;
  }
  return shuffle([it].concat(out));
}

function runTurn(sc, turn, c) {
  const s = shop;
  return new Promise(resolve => {
    bubble(turn);
    if (turn.c) speak(turn.c);
    let label, opts, right, rightHtml, sayOk;

    if (turn.means) {
      label = '손님이 뭐라고 했을까요?';
      opts = shuffle(turn.means).map(m => ({ key: m, html: `<span>${m}</span>` }));
      right = turn.means[0];
      rightHtml = `<b class="jp">${turn.c}</b> · ${turn.p}<br>= ${right}`;
    } else if (turn.price) {
      label = '가격을 일본어로 말해요';
      const set = new Set([turn.price]);
      const near = turn.price >= 10000
        ? [Math.floor(turn.price % 10000 / 1000) * 10000 + Math.floor(turn.price / 10000) * 1000, turn.price + 10000, turn.price - 1000, turn.price + 3000]
        : [turn.price + 1000, turn.price - 1000, turn.price + 2000];
      shuffle(near).forEach(v => { if (set.size < 3 && v >= 1000 && v < 100000) set.add(v); });
      opts = shuffle([...set]).map(v => { const r = numRead(v); return { key: v, html: `<span>${r.pron} 원데스</span><small class="jp">${r.kana}ウォンです</small>` }; });
      right = turn.price;
      const r = numRead(turn.price);
      sayOk = r.kana + 'ウォンです';
      rightHtml = `<b>${shopWon(turn.price)}</b> · ${r.pron} 원데스`;
      label = `${shopWon(turn.price)} — 일본어로 말해요`;
    } else {
      const it = ITEMS[turn.ans];
      label = '뭐라고 할까요?';
      opts = shopOptions(sc, it).map(o => ({
        key: o.id,
        html: `<span class="jp">${o.jp}</span>${S.set.pron ? `<small>${o.pron}</small>` : ''}<small class="hintko" hidden>${o.ko}</small>`,
      }));
      right = it.id; sayOk = it.say;
      rightHtml = `<b class="jp">${it.jp}</b> · ${it.pron}<br>= ${it.ko}`;
    }

    panel(`
      ${turn.sit ? `<p class="shop-sit">📍 ${turn.sit}</p>` : ''}
      <div class="shop-q"><b>${label}</b>${turn.ans ? `<button class="hintbtn" id="hint">💡 뜻 힌트</button>` : ''}</div>
      <div class="shop-opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${o.html}</button>`).join('')}</div>`);
    const hint = document.getElementById('hint');
    if (hint) hint.onclick = () => { document.querySelectorAll('.hintko').forEach(x => { x.hidden = false; }); hint.remove(); };

    const btns = [...document.querySelectorAll('#sp .opt')];
    btns.forEach(b => b.onclick = () => {
      if (shop !== s) return;
      const pickd = opts[+b.dataset.i];
      const ok = pickd.key === right;
      btns.forEach((x, i) => { x.disabled = true; if (opts[i].key === right) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      document.querySelectorAll('.hintko').forEach(x => { x.hidden = false; });
      if (ok) {
        setMood(c, 'happy'); sfx('ok');
        if (sayOk) speak(sayOk);
        if (turn.ans && /osusume|ichiban|kochira|zaiko|omatase|kashikomari/.test(turn.ans)) s.world.product.visible = true;
      } else {
        setMood(c, 'confused'); sfx('no');
        s.sat[s.idx] = Math.max(0, s.sat[s.idx] - 1);
        if (turn.ans) s.misses.push(turn.ans);
        if (sayOk) setTimeout(() => { if (shop === s) speak(sayOk); }, 500);
      }
      if (turn.ans) grade(turn.ans, ok);
      hud();
      const sp = document.getElementById('sp');
      const fb = document.createElement('div');
      fb.className = 'shop-fb ' + (ok ? 'good' : 'bad');
      fb.innerHTML = `<div><strong>${ok ? pick(REACT.ok) + ' 좋아요!' : pick(REACT.no) + ' 손님이 갸웃해요'}</strong>${ok && turn.ans ? '' : `<div class="fb-ans">${rightHtml}</div>`}</div><button class="btn ${ok ? 'ok' : 'no'}" id="snext">계속</button>`;
      sp.appendChild(fb);
      fb.scrollIntoView({ block: 'end' });
      document.getElementById('snext').onclick = () => { if (shop !== s) return; setMood(c, 'idle'); resolve(); };
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
  const miss = [...new Set(s.misses)].map(id => ITEMS[id]);
  const sales = s.sales;
  closeShop();
  sfx('win');
  app.innerHTML = `
    <div class="finish shopend">
      <div class="mascot big">🏪</div>
      <h1>오늘 영업 끝!</h1>
      <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="stats">
        <div><b>${shopWon(sales)}</b><span>오늘 매출</span></div>
        <div><b>+${gain}</b><span>경험치</span></div>
        <div><b>🔥 ${S.streak}</b><span>연속 학습일</span></div>
      </div>
      ${miss.length ? `<div class="todaycard"><span class="tag">다시 볼 문장</span>${miss.map(it =>
    `<button class="say" data-say="${it.say}"><span class="jp">${it.jp}</span><small>${it.pron}</small><small class="mean">${it.ko} 🔊</small></button>`).join('')}</div>`
      : `<p class="note">한 번도 틀리지 않았어요. 완벽한 응대였습니다.</p>`}
      <p class="note">지금까지 ${S.shop.days}일 영업 · 누적 매출 ${shopWon(S.shop.total)}</p>
      <button class="btn" id="again">하루 더 영업하기</button>
      <button class="btn ghost" id="home">홈으로</button>
    </div>`;
  app.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
  document.getElementById('again').onclick = startShop;
  document.getElementById('home').onclick = renderHome;
}
