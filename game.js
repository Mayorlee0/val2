/* ============================================================================
Barbara’s Mini Love Quest 💘 — Vanilla Canvas Mini Game
Static-site friendly (no build step).
============================================================================ */

const CONFIG = {
  tileSize: 48,
  mapCols: 19,
  mapRows: 13,
  playerRadius: 14,
  playerSpeed: 160,
  tokenRadius: 12,
  gateWidth: 56,
  gateHeight: 18,
};

const REASONS = [
  "Your smile could fix my whole week.",
  "You make even boring days feel like a movie.",
  "You’re not just beautiful, you’re gorgeous, like gorgeousssssss",
  "You make me a better man",
  "You’re my peace and my favorite person.",
  "How can I forget 150kg",
  "I’d choose you in every universe.",
];

const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const state = {
  running: false,
  startedAtMs: 0,
  elapsedMs: 0,

  collected: 0,
  shownReasons: new Set(),

  player: { x: 0, y: 0, vx: 0, vy: 0 },

  tokens: [],
  gate: { unlocked: false, x: 0, y: 0 },

  input: {
    up: false,
    down: false,
    left: false,
    right: false,
  },

  frozen: true,

  swipe: {
    active: false,
    startX: 0,
    startY: 0,
    lastDir: null,
  },
};

const MAP = [
  "1111111111111111111",
  "1000000000000000001",
  "1011111100000111101",
  "1010000101110100001",
  "1010110101010101101",
  "1000100001010000001",
  "1010101111011110101",
  "1000100010001000101",
  "1011101011101011101",
  "1000000010000000001",
  "1010111110111110101",
  "1000000000000000001",
  "1111111111111111111",
].map((row) => row.split("").map((c) => (c === "1" ? 1 : 0)));

function tileToWorldCenter(tx, ty) {
  return {
    x: tx * CONFIG.tileSize + CONFIG.tileSize / 2,
    y: ty * CONFIG.tileSize + CONFIG.tileSize / 2,
  };
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hudReasons = document.getElementById("hudReasons");
const hudTime = document.getElementById("hudTime");
const soundToggleBtn = document.getElementById("soundToggle");

const openingOverlay = document.getElementById("openingOverlay");
const reasonOverlay = document.getElementById("reasonOverlay");
const reasonText = document.getElementById("reasonText");
const startBtn = document.getElementById("startBtn");
const reasonOkBtn = document.getElementById("reasonOkBtn");

const finalOverlay = document.getElementById("finalOverlay");
const thinkOverlay = document.getElementById("thinkOverlay");
const yesOverlay = document.getElementById("yesOverlay");
const yesMessage = document.getElementById("yesMessage");
const confettiLayer = document.getElementById("confettiLayer");

const yesBtn = document.getElementById("yesBtn");
const thinkBtn = document.getElementById("thinkBtn");
const okayYesBtn = document.getElementById("okayYesBtn");
const restartBtn = document.getElementById("restartBtn");

let soundEnabled = true;
let audioCtx = null;

function initAudio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
  } catch {
    audioCtx = null;
  }
}

async function resumeAudioIfNeeded() {
  try {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") await audioCtx.resume();
  } catch {
    // no-op
  }
}

function playCollectChime() {
  if (!soundEnabled) return;
  if (!audioCtx) return;

  try {
    const t = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    gain.connect(audioCtx.destination);

    const o1 = audioCtx.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(523.25, t);
    o1.frequency.exponentialRampToValueAtTime(587.33, t + 0.12);
    o1.connect(gain);
    o1.start(t);
    o1.stop(t + 0.24);

    const o2 = audioCtx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(659.25, t + 0.06);
    o2.connect(gain);
    o2.start(t + 0.06);
    o2.stop(t + 0.24);
  } catch {
    // no-op
  }
}

function resetGame() {
  state.running = false;
  state.frozen = true;
  state.startedAtMs = 0;
  state.elapsedMs = 0;
  state.collected = 0;
  state.shownReasons = new Set();

  const spawn = tileToWorldCenter(1, CONFIG.mapRows - 2);
  state.player.x = spawn.x;
  state.player.y = spawn.y;
  state.player.vx = 0;
  state.player.vy = 0;

  const gateTileX = Math.floor(CONFIG.mapCols / 2);
  const gateTileY = 1;
  const gatePos = tileToWorldCenter(gateTileX, gateTileY);
  state.gate = {
    unlocked: false,
    x: gatePos.x,
    y: gatePos.y,
  };

  state.tokens = [
    { id: 0, ...tileToWorldCenter(3, 1), collected: false },
    { id: 1, ...tileToWorldCenter(15, 1), collected: false },
    { id: 2, ...tileToWorldCenter(5, 5), collected: false },
    { id: 3, ...tileToWorldCenter(13, 5), collected: false },
    { id: 4, ...tileToWorldCenter(2, 9), collected: false },
    { id: 5, ...tileToWorldCenter(16, 9), collected: false },
    { id: 6, ...tileToWorldCenter(9, 11), collected: false },
  ];

  updateHud();
}

function updateHud() {
  hudReasons.textContent = `Reasons collected: ${state.collected} / 7`;
  hudTime.textContent = `Time: ${formatTime(state.elapsedMs)}`;
  soundToggleBtn.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
  soundToggleBtn.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setDir(key, isDown) {
  if (key === "ArrowUp" || key === "w" || key === "W") state.input.up = isDown;
  if (key === "ArrowDown" || key === "s" || key === "S") state.input.down = isDown;
  if (key === "ArrowLeft" || key === "a" || key === "A") state.input.left = isDown;
  if (key === "ArrowRight" || key === "d" || key === "D") state.input.right = isDown;
}

window.addEventListener("keydown", async (e) => {
  setDir(e.key, true);
  initAudio();
  await resumeAudioIfNeeded();
});

window.addEventListener("keyup", (e) => {
  setDir(e.key, false);
});

function bindDpad() {
  const btns = document.querySelectorAll(".dpad-btn");
  btns.forEach((btn) => {
    const dir = btn.getAttribute("data-dir");
    const down = (ev) => {
      ev.preventDefault();
      pressDir(dir, true);
      initAudio();
      resumeAudioIfNeeded();
    };
    const up = (ev) => {
      ev.preventDefault();
      pressDir(dir, false);
    };

    btn.addEventListener("pointerdown", down, { passive: false });
    btn.addEventListener("pointerup", up, { passive: false });
    btn.addEventListener("pointercancel", up, { passive: false });
    btn.addEventListener("pointerleave", up, { passive: false });
  });
}

function pressDir(dir, isDown) {
  if (dir === "up") state.input.up = isDown;
  if (dir === "down") state.input.down = isDown;
  if (dir === "left") state.input.left = isDown;
  if (dir === "right") state.input.right = isDown;
}

function bindSwipe() {
  const onStart = async (e) => {
    if (e.touches && e.touches.length > 1) return;
    state.swipe.active = true;
    const t = e.touches ? e.touches[0] : e;
    state.swipe.startX = t.clientX;
    state.swipe.startY = t.clientY;
    state.swipe.lastDir = null;

    initAudio();
    await resumeAudioIfNeeded();
  };

  const onMove = (e) => {
    if (!state.swipe.active) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - state.swipe.startX;
    const dy = t.clientY - state.swipe.startY;
    const dist = Math.hypot(dx, dy);
    if (dist < 18) return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    let dir = null;

    if (absX > absY) dir = dx > 0 ? "right" : "left";
    else dir = dy > 0 ? "down" : "up";

    if (dir !== state.swipe.lastDir) {
      state.input.up = false;
      state.input.down = false;
      state.input.left = false;
      state.input.right = false;
      pressDir(dir, true);
      state.swipe.lastDir = dir;
    }
  };

  const onEnd = () => {
    state.swipe.active = false;
    state.input.up = false;
    state.input.down = false;
    state.input.left = false;
    state.input.right = false;
  };

  canvas.addEventListener("touchstart", onStart, { passive: true });
  canvas.addEventListener("touchmove", onMove, { passive: true });
  canvas.addEventListener("touchend", onEnd, { passive: true });
  canvas.addEventListener("touchcancel", onEnd, { passive: true });
}

function isWallAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= CONFIG.mapCols || ty >= CONFIG.mapRows) return true;
  return MAP[ty][tx] === 1;
}

function circleVsWalls(nextX, nextY, r) {
  const points = [
    { x: nextX, y: nextY - r },
    { x: nextX, y: nextY + r },
    { x: nextX - r, y: nextY },
    { x: nextX + r, y: nextY },
    { x: nextX - r * 0.7, y: nextY - r * 0.7 },
    { x: nextX + r * 0.7, y: nextY - r * 0.7 },
    { x: nextX - r * 0.7, y: nextY + r * 0.7 },
    { x: nextX + r * 0.7, y: nextY + r * 0.7 },
  ];

  for (const p of points) {
    const tx = Math.floor(p.x / CONFIG.tileSize);
    const ty = Math.floor(p.y / CONFIG.tileSize);
    if (isWallAt(tx, ty)) return true;
  }
  return false;
}

function update(dt) {
  if (!state.running || state.frozen) return;

  state.elapsedMs = performance.now() - state.startedAtMs;

  const ix = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
  const iy = (state.input.down ? 1 : 0) - (state.input.up ? 1 : 0);

  let vx = ix;
  let vy = iy;

  if (vx !== 0 || vy !== 0) {
    const len = Math.hypot(vx, vy);
    vx /= len;
    vy /= len;
  }

  const speed = CONFIG.playerSpeed;
  const stepX = vx * speed * dt;
  const stepY = vy * speed * dt;

  const px = state.player.x;
  const py = state.player.y;
  const r = CONFIG.playerRadius;

  let nx = px + stepX;
  let ny = py;

  if (!circleVsWalls(nx, ny, r)) {
    state.player.x = nx;
  }

  nx = state.player.x;
  ny = py + stepY;

  if (!circleVsWalls(nx, ny, r)) {
    state.player.y = ny;
  }

  for (const token of state.tokens) {
    if (token.collected) continue;
    const d = Math.hypot(state.player.x - token.x, state.player.y - token.y);
    if (d <= CONFIG.playerRadius + CONFIG.tokenRadius) {
      collectToken(token);
      break;
    }
  }

  if (state.collected >= 7) state.gate.unlocked = true;

  if (state.gate.unlocked) {
    const insideGate =
      Math.abs(state.player.x - state.gate.x) <= CONFIG.gateWidth / 2 &&
      Math.abs(state.player.y - state.gate.y) <= 26;
    if (insideGate) {
      openFinalAsk();
    }
  }

  updateHud();
}

function collectToken(token) {
  token.collected = true;
  playCollectChime();

  const idx = token.id;
  state.collected = Math.min(7, state.collected + 1);

  const reason = REASONS[idx] ?? "You’re wonderful. 💘";
  showReason(reason);
}

function showReason(text) {
  state.frozen = true;
  reasonText.textContent = text;
  showOverlay(reasonOverlay);
}

function openFinalAsk() {
  state.frozen = true;
  showOverlay(finalOverlay);
}

function resizeCanvasToDisplaySize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssWidth = Math.min(920, Math.floor(window.innerWidth * 0.96));
  const cssHeight = Math.floor((cssWidth * 2) / 3);

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const w = Math.floor(cssWidth * dpr);
  const h = Math.floor(cssHeight * dpr);

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function worldToScreen(x, y) {
  const pad = 18;
  const mapW = CONFIG.mapCols * CONFIG.tileSize;
  const mapH = CONFIG.mapRows * CONFIG.tileSize;

  const cw = canvas.width;
  const ch = canvas.height;

  const scale = Math.min((cw - pad * 2) / mapW, (ch - pad * 2) / mapH);

  const ox = (cw - mapW * scale) / 2;
  const oy = (ch - mapH * scale) / 2;

  return { x: ox + x * scale, y: oy + y * scale, scale, ox, oy };
}

function draw() {
  resizeCanvasToDisplaySize();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pad = 18;
  const mapW = CONFIG.mapCols * CONFIG.tileSize;
  const mapH = CONFIG.mapRows * CONFIG.tileSize;

  const cw = canvas.width;
  const ch = canvas.height;

  const scale = Math.min((cw - pad * 2) / mapW, (ch - pad * 2) / mapH);
  const ox = (cw - mapW * scale) / 2;
  const oy = (ch - mapH * scale) / 2;

  const g = ctx.createLinearGradient(0, 0, cw, ch);
  g.addColorStop(0, "rgba(255, 240, 246, 0.95)");
  g.addColorStop(1, "rgba(236, 252, 255, 0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);

  drawDotsPattern(cw, ch);

  for (let y = 0; y < CONFIG.mapRows; y++) {
    for (let x = 0; x < CONFIG.mapCols; x++) {
      const isWall = MAP[y][x] === 1;
      const sx = ox + x * CONFIG.tileSize * scale;
      const sy = oy + y * CONFIG.tileSize * scale;
      const ts = CONFIG.tileSize * scale;

      if (isWall) {
        ctx.fillStyle = "rgba(255, 77, 125, 0.14)";
        ctx.fillRect(sx, sy, ts, ts);

        ctx.strokeStyle = "rgba(38, 18, 26, 0.12)";
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.strokeRect(sx + 1, sy + 1, ts - 2, ts - 2);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(sx, sy, ts, ts);
      }
    }
  }

  for (const token of state.tokens) {
    if (token.collected) continue;
    const p = worldToScreen(token.x, token.y);
    drawHeart(p.x, p.y, CONFIG.tokenRadius * p.scale, "rgba(255, 77, 125, 0.95)");
  }

  const gate = worldToScreen(state.gate.x, state.gate.y);
  drawGate(gate.x, gate.y, gate.scale);

  const pl = worldToScreen(state.player.x, state.player.y);
  drawHeart(pl.x, pl.y, CONFIG.playerRadius * pl.scale, "rgba(255, 77, 125, 1)");
  drawPlayerGlow(pl.x, pl.y, CONFIG.playerRadius * pl.scale);
}

function drawDotsPattern(cw, ch) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "rgba(38, 18, 26, 1)";
  const step = 26;
  for (let y = 10; y < ch; y += step) {
    for (let x = 10; x < cw; x += step) {
      if ((x + y) % 52 === 0) ctx.beginPath();
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHeart(cx, cy, r, fillStyle) {
  ctx.save();
  ctx.fillStyle = fillStyle;

  ctx.beginPath();
  const topCurveHeight = r * 0.55;
  ctx.moveTo(cx, cy + r * 0.35);

  ctx.bezierCurveTo(
    cx - r,
    cy - topCurveHeight,
    cx - r * 0.05,
    cy - topCurveHeight,
    cx,
    cy - r * 0.15
  );

  ctx.bezierCurveTo(
    cx + r * 0.05,
    cy - topCurveHeight,
    cx + r,
    cy - topCurveHeight,
    cx,
    cy + r * 0.35
  );

  ctx.lineTo(cx, cy + r * 1.15);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.25, cy - r * 0.15, r * 0.18, r * 0.26, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlayerGlow(cx, cy, r) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.2);
  glow.addColorStop(0, "rgba(255, 77, 125, 0.45)");
  glow.addColorStop(1, "rgba(255, 77, 125, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGate(cx, cy, scale) {
  const w = CONFIG.gateWidth * scale;
  const h = CONFIG.gateHeight * scale;

  ctx.save();

  if (state.gate.unlocked) {
    ctx.fillStyle = "rgba(255, 77, 125, 0.95)";
    ctx.shadowColor = "rgba(255, 77, 125, 0.35)";
    ctx.shadowBlur = 18 * scale;
  } else {
    ctx.fillStyle = "rgba(38, 18, 26, 0.35)";
    ctx.shadowColor = "rgba(38, 18, 26, 0.18)";
    ctx.shadowBlur = 12 * scale;
  }

  roundRect(cx - w / 2, cy - h / 2, w, h, 10 * scale);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = `${Math.max(10, 12 * scale)}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.gate.unlocked ? "VALENTINE" : "LOCKED", cx, cy);

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function showOverlay(el) {
  hideAllOverlays();
  el.classList.add("show");
}

function hideAllOverlays() {
  [openingOverlay, reasonOverlay, finalOverlay, thinkOverlay, yesOverlay].forEach((el) =>
    el.classList.remove("show")
  );
}

function resumeGame() {
  hideAllOverlays();
  state.frozen = false;
}

startBtn.addEventListener("click", async () => {
  initAudio();
  await resumeAudioIfNeeded();

  hideAllOverlays();
  state.running = true;
  state.frozen = false;
  state.startedAtMs = performance.now();
});

reasonOkBtn.addEventListener("click", () => {
  resumeGame();
});

soundToggleBtn.addEventListener("click", async () => {
  soundEnabled = !soundEnabled;
  updateHud();

  initAudio();
  await resumeAudioIfNeeded();
});

yesBtn.addEventListener("click", () => {
  showYesFlow();
});

thinkBtn.addEventListener("click", () => {
  showOverlay(thinkOverlay);
});

okayYesBtn.addEventListener("click", () => {
  showYesFlow();
});

restartBtn.addEventListener("click", () => {
  clearConfetti();
  resetGame();
  showOverlay(openingOverlay);
});

function showYesFlow() {
  showOverlay(yesOverlay);
  state.running = false;
  state.frozen = true;

  yesMessage.textContent =
    "Barbara, you just made this tiny heart the happiest heart on Earth. 💘";

  if (!prefersReducedMotion) {
    launchConfetti(90);
  }
}

function launchConfetti(count) {
  clearConfetti();
  const vw = window.innerWidth;
  const colors = [
    "rgba(255, 77, 125, 0.95)",
    "rgba(255, 143, 178, 0.95)",
    "rgba(255, 255, 255, 0.95)",
    "rgba(170, 240, 255, 0.95)",
  ];

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("i");
    const left = Math.random() * vw;
    const delay = Math.random() * 0.25;
    const dur = 1.4 + Math.random() * 1.0;
    const sizeW = 7 + Math.random() * 8;
    const sizeH = 10 + Math.random() * 12;
    const color = colors[Math.floor(Math.random() * colors.length)];

    piece.style.left = `${left}px`;
    piece.style.animationDelay = `${delay}s`;
    piece.style.animationDuration = `${dur}s`;
    piece.style.width = `${sizeW}px`;
    piece.style.height = `${sizeH}px`;
    piece.style.background = color;
    piece.style.transform = `translateY(-10vh) rotate(${Math.random() * 180}deg)`;

    confettiLayer.appendChild(piece);

    setTimeout(() => {
      piece.remove();
    }, (delay + dur + 0.2) * 1000);
  }
}

function clearConfetti() {
  confettiLayer.innerHTML = "";
}

let lastT = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function boot() {
  resetGame();
  bindDpad();
  bindSwipe();

  const firstGesture = async () => {
    initAudio();
    await resumeAudioIfNeeded();
    window.removeEventListener("pointerdown", firstGesture);
    window.removeEventListener("touchstart", firstGesture);
  };
  window.addEventListener("pointerdown", firstGesture, { passive: true });
  window.addEventListener("touchstart", firstGesture, { passive: true });

  window.addEventListener("resize", () => draw());

  showOverlay(openingOverlay);
  requestAnimationFrame(loop);
}

boot();
