"use strict";

/* ------------------------------------------------------------------
   Board sizes. Each is a square grid (cols = sqrt(size)) with one task
   flagged free: true, placed near the center. Edit the task lists to
   customise prompts for your own event — keep categories roughly
   balanced across BUILDER / EXPLORER / CONNECTOR / ETHICIST / VISIONARY
   so the persona reveal stays meaningful.
------------------------------------------------------------------- */

const CATEGORY_META = {
  BUILDER: { name: "The Builder", tagline: "You don't just use AI — you make things with it.", color: "#4f7fb3" },
  EXPLORER: { name: "The Explorer", tagline: "New tool just dropped? You've already tried it.", color: "#ef6a4c" },
  CONNECTOR: { name: "The Connector", tagline: "You bring people along — AI is better with company.", color: "#2f8f5b" },
  ETHICIST: { name: "The Critical Thinker", tagline: "You ask the questions everyone else forgets to.", color: "#7c6fb0" },
  VISIONARY: { name: "The Visionary", tagline: "You're already living five years ahead.", color: "#c9678f" },
};
const CATEGORY_ORDER = ["BUILDER", "EXPLORER", "CONNECTOR", "ETHICIST", "VISIONARY"];

const BOARD_SIZES = {
  9: {
    cols: 3,
    showLetters: false,
    tasks: [
      { text: "Has built something with AI's help (app, doc, deck, code)", cat: "BUILDER" },
      { text: "Has tried 3+ different AI tools this month", cat: "EXPLORER" },
      { text: "Has taught someone else how to use an AI tool", cat: "CONNECTOR" },
      { text: "Has fact-checked something AI wrote", cat: "ETHICIST" },
      { text: "FREEBIE — your favorite “AI made me smile” moment", cat: "EXPLORER", free: true },
      { text: "Has an idea for an AI tool that doesn't exist yet", cat: "VISIONARY" },
      { text: "Has automated a boring task using AI", cat: "BUILDER" },
      { text: "Has talked a skeptic into trying AI", cat: "CONNECTOR" },
      { text: "Has a strong opinion on AI and jobs", cat: "ETHICIST" },
    ],
  },
  16: {
    cols: 4,
    showLetters: false,
    tasks: [
      { text: "Has built something with AI's help (app, doc, deck, code)", cat: "BUILDER" },
      { text: "Has tried 3+ different AI tools this month", cat: "EXPLORER" },
      { text: "Has taught someone else how to use an AI tool", cat: "CONNECTOR" },
      { text: "Has fact-checked something AI wrote", cat: "ETHICIST" },
      { text: "Has an idea for an AI tool that doesn't exist yet", cat: "VISIONARY" },
      { text: "FREEBIE — your favorite “AI made me smile” moment", cat: "EXPLORER", free: true },
      { text: "Has automated a boring task using AI", cat: "BUILDER" },
      { text: "Thinks AI will change their field a lot in 5 years", cat: "VISIONARY" },
      { text: "Has talked a skeptic into trying AI", cat: "CONNECTOR" },
      { text: "Has a strong opinion on AI and jobs", cat: "ETHICIST" },
      { text: "Has an AI tool on their phone's home screen", cat: "EXPLORER" },
      { text: "Has used AI to design or edit an image", cat: "BUILDER" },
      { text: "Has explained a prompt trick to a coworker", cat: "CONNECTOR" },
      { text: "Is here because they're curious about what's next", cat: "VISIONARY" },
      { text: "Believes in human-in-the-loop (say why!)", cat: "ETHICIST" },
      { text: "Has used AI to plan a trip or event", cat: "EXPLORER" },
    ],
  },
  25: {
    cols: 5,
    showLetters: true,
    tasks: [
      { text: "Has built something with AI's help (app, doc, deck, code)", cat: "BUILDER" },
      { text: "Has tried 3+ different AI tools this month", cat: "EXPLORER" },
      { text: "Has taught someone else how to use an AI tool", cat: "CONNECTOR" },
      { text: "Has fact-checked something AI wrote", cat: "ETHICIST" },
      { text: "Has an idea for an AI tool that doesn't exist yet", cat: "VISIONARY" },
      { text: "Has an AI tool on their phone's home screen", cat: "EXPLORER" },
      { text: "Has automated a boring task using AI", cat: "BUILDER" },
      { text: "Thinks AI will change their field a lot in 5 years", cat: "VISIONARY" },
      { text: "Has talked a skeptic into trying AI", cat: "CONNECTOR" },
      { text: "Has a strong opinion on AI and jobs", cat: "ETHICIST" },
      { text: "Follows an AI creator, newsletter, or podcast", cat: "CONNECTOR" },
      { text: "Reads the fine print on AI data privacy", cat: "ETHICIST" },
      { text: "FREEBIE — your favorite “AI made me smile” moment", cat: "EXPLORER", free: true },
      { text: "Has a favorite sci-fi AI character", cat: "VISIONARY" },
      { text: "Has debugged code with an AI's help", cat: "BUILDER" },
      { text: "Has caught an AI “hallucinating”", cat: "ETHICIST" },
      { text: "Would trust an AI co-pilot for a big decision", cat: "VISIONARY" },
      { text: "Has used AI to design or edit an image", cat: "BUILDER" },
      { text: "Has asked an AI a genuinely weird question", cat: "EXPLORER" },
      { text: "Has explained a prompt trick to a coworker", cat: "CONNECTOR" },
      { text: "Is here because they're curious about what's next", cat: "VISIONARY" },
      { text: "Has used AI in a group project or class", cat: "CONNECTOR" },
      { text: "Believes in human-in-the-loop (say why!)", cat: "ETHICIST" },
      { text: "Has written a prompt they're proud of", cat: "BUILDER" },
      { text: "Has used AI to plan a trip or event", cat: "EXPLORER" },
    ],
  },
};

const STORAGE_KEY = "aiHumanBingoV2";
const DEFAULT_SIZE = 25;
const PHOTO_MAX_DIM = 640;
const PHOTO_QUALITY = 0.85;
const RING_R = 15.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

const TILTS = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 2.5];

const boardEl = document.getElementById("board");
const lettersRow = document.getElementById("lettersRow");
const titleInput = document.getElementById("eventTitle");
const progressCount = document.getElementById("progressCount");
const progressTotal = document.getElementById("progressTotal");
const progressCircle = document.getElementById("progressCircle");
const winBanner = document.getElementById("winBanner");
const winBannerTitle = winBanner.querySelector("strong");
const winBannerBody = winBanner.querySelector("p");
const personaHint = document.getElementById("personaHint");
const toastEl = document.getElementById("toast");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const confettiCanvas = document.getElementById("confetti");
const sizeButtons = document.querySelectorAll(".size-btn");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** @type {{title: string, size: number, photos: Record<string, string>}} */
let state = { title: "", size: DEFAULT_SIZE, photos: {} };
let wasComplete = false;
let completedLines = new Set();
let toastTimer = null;

function config() { return BOARD_SIZES[state.size]; }
function cols() { return config().cols; }
function taskAt(idx) { return config().tasks[idx]; }

function buildLines(n) {
  const lines = [];
  for (let r = 0; r < n; r++) lines.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) lines.push(Array.from({ length: n }, (_, r) => r * n + c));
  lines.push(Array.from({ length: n }, (_, i) => i * n + i));
  lines.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
  return lines;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        state.title = typeof parsed.title === "string" ? parsed.title : "";
        state.size = BOARD_SIZES[parsed.size] ? parsed.size : DEFAULT_SIZE;
        state.photos = parsed.photos && typeof parsed.photos === "object" ? parsed.photos : {};
      }
    }
  } catch (err) {
    console.warn("AI Human Bingo: couldn't read saved progress.", err);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("AI Human Bingo: couldn't persist progress (storage full?).", err);
    showToast("Storage is full on this device — your board still works, it just won't survive a reload.");
  }
}

function showToast(message, duration = 2600) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
}

/* ---------------- board rendering ---------------- */

const cameraIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
const checkIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const retakeIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`;

function buildBoard() {
  boardEl.innerHTML = "";
  boardEl.style.setProperty("--cols", String(cols()));
  lettersRow.hidden = !config().showLetters;

  config().tasks.forEach((task, idx) => {
    const label = document.createElement("label");
    label.className = "cell" + (task.free ? " free" : "");
    label.dataset.index = String(idx);
    label.style.setProperty("--tilt", `${TILTS[idx % TILTS.length]}deg`);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "user";
    input.hidden = true;
    input.setAttribute("aria-label", `Take a photo: ${task.text}`);
    input.addEventListener("change", (e) => onFileChange(idx, e.target));

    const photoWrap = document.createElement("div");
    photoWrap.className = "cell-photo";
    photoWrap.innerHTML = cameraIconSVG;

    const badge = document.createElement("span");
    badge.className = "check-badge";
    badge.innerHTML = checkIconSVG;

    const retake = document.createElement("span");
    retake.className = "cell-retake";
    retake.innerHTML = retakeIconSVG;

    const caption = document.createElement("div");
    caption.className = "cell-caption";
    caption.textContent = task.text;

    photoWrap.appendChild(badge);
    photoWrap.appendChild(retake);
    label.appendChild(input);
    label.appendChild(photoWrap);
    label.appendChild(caption);
    boardEl.appendChild(label);
  });
}

function applyPhotosToBoard() {
  const cells = boardEl.querySelectorAll(".cell");
  cells.forEach((cell) => {
    const idx = cell.dataset.index;
    const dataUrl = state.photos[idx];
    const photoWrap = cell.querySelector(".cell-photo");
    let img = photoWrap.querySelector("img");
    if (dataUrl) {
      if (!img) {
        img = document.createElement("img");
        img.alt = "";
        photoWrap.insertBefore(img, photoWrap.firstChild);
      }
      img.src = dataUrl;
      cell.classList.add("done");
    } else if (img) {
      img.remove();
      cell.classList.remove("done");
    }
  });
}

function updateSizeButtons() {
  sizeButtons.forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.size) === state.size);
  });
}

/* ---------------- capture + compress ---------------- */

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't load photo."));
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const dim = Math.min(PHOTO_MAX_DIM, side);
        const canvas = document.createElement("canvas");
        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, dim, dim);
        resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function onFileChange(idx, inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  try {
    const dataUrl = await compressImage(file);
    state.photos[String(idx)] = dataUrl;
    saveState();
    applyPhotosToBoard();
    updateProgress(true);
  } catch (err) {
    console.error(err);
    showToast("That photo didn't load — try again?");
  } finally {
    inputEl.value = "";
  }
}

/* ---------------- persona + progress ---------------- */

function computeCategoryCounts() {
  const counts = {};
  CATEGORY_ORDER.forEach((k) => (counts[k] = 0));
  Object.keys(state.photos).forEach((idxStr) => {
    const task = taskAt(Number(idxStr));
    if (task) counts[task.cat]++;
  });
  return counts;
}

function dominantCategory(counts) {
  let best = null;
  let bestCount = 0;
  for (const key of CATEGORY_ORDER) {
    if (counts[key] > bestCount) {
      best = key;
      bestCount = counts[key];
    }
  }
  return best;
}

function updatePersonaHint(counts) {
  const total = Object.keys(state.photos).length;
  const key = total > 0 ? dominantCategory(counts) : null;
  if (!key) {
    personaHint.hidden = true;
    return;
  }
  const meta = CATEGORY_META[key];
  personaHint.hidden = false;
  personaHint.style.setProperty("--persona-color", meta.color);
  personaHint.textContent = `Leaning toward: ${meta.name}`;
}

function checkNewLines(triggerEffects) {
  const lines = buildLines(cols());
  let newlyCompleted = false;
  lines.forEach((line, i) => {
    if (completedLines.has(i)) return;
    const full = line.every((idx) => Boolean(state.photos[String(idx)]));
    if (full) {
      completedLines.add(i);
      newlyCompleted = true;
    }
  });
  if (newlyCompleted && triggerEffects && !wasComplete) {
    if (!prefersReducedMotion) confettiBurst(60);
    showToast("BINGO line! Keep going for the full board.", 2800);
  }
}

function updateProgress(triggerEffects) {
  const total = state.size;
  const count = Object.keys(state.photos).length;
  progressCount.textContent = String(count);
  progressTotal.textContent = String(total);
  const offset = RING_CIRCUMFERENCE * (1 - count / total);
  progressCircle.style.strokeDashoffset = String(Math.max(0, offset));

  const counts = computeCategoryCounts();
  updatePersonaHint(counts);
  checkNewLines(triggerEffects);

  const isComplete = count >= total;
  winBanner.classList.toggle("show", isComplete);

  if (isComplete) {
    const key = dominantCategory(counts) || CATEGORY_ORDER[0];
    const meta = CATEGORY_META[key];
    winBannerTitle.textContent = `You're ${meta.name}!`;
    winBannerBody.textContent = `${meta.tagline} Save your souvenir below.`;
  }

  if (isComplete && !wasComplete && triggerEffects) {
    if (!prefersReducedMotion) confettiBurst(140);
    showToast("Board complete! Tap “Save souvenir” to keep it.", 3400);
  }
  wasComplete = isComplete;
}

/* ---------------- size switching ---------------- */

function setSize(newSize) {
  if (!BOARD_SIZES[newSize] || newSize === state.size) return;
  const hasPhotos = Object.keys(state.photos).length > 0;
  if (hasPhotos) {
    const ok = window.confirm(`Switch to a ${Math.sqrt(newSize)}×${Math.sqrt(newSize)} board? This clears your current photos.`);
    if (!ok) return;
  }
  state.size = newSize;
  state.photos = {};
  completedLines = new Set();
  wasComplete = false;
  saveState();
  updateSizeButtons();
  buildBoard();
  applyPhotosToBoard();
  updateProgress(false);
}

sizeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setSize(Number(btn.dataset.size)));
});

/* ---------------- reset ---------------- */

resetBtn.addEventListener("click", () => {
  const count = Object.keys(state.photos).length;
  if (count === 0) return;
  const ok = window.confirm("Clear every photo on this board? This can't be undone.");
  if (!ok) return;
  state.photos = {};
  completedLines = new Set();
  wasComplete = false;
  saveState();
  applyPhotosToBoard();
  updateProgress(false);
  showToast("Board cleared.");
});

titleInput.addEventListener("input", () => {
  state.title = titleInput.value;
  saveState();
});

/* ---------------- confetti ---------------- */

function confettiBurst(count = 140) {
  const ctx = confettiCanvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  confettiCanvas.width = w * dpr;
  confettiCanvas.height = h * dpr;
  confettiCanvas.style.width = w + "px";
  confettiCanvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ["#2f8f5b", "#ef6a4c", "#4f7fb3", "#7c6fb0", "#c9678f", "#faf5ea"];
  const particles = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.4,
    y: h * 0.35 + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 9,
    vy: Math.random() * -9 - 4,
    size: Math.random() * 7 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    life: 0,
  }));

  const gravity = 0.28;
  const maxLife = 130;
  let frame = 0;

  function step() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of particles) {
      if (p.life > maxLife) continue;
      alive = true;
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      const fade = Math.max(0, 1 - p.life / maxLife);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (alive && frame < maxLife + 10) {
      requestAnimationFrame(step);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  }
  requestAnimationFrame(step);
}

/* ---------------- souvenir export ---------------- */

async function ensureFontsReady() {
  try {
    await Promise.all([
      document.fonts.load('700 44px "Permanent Marker"'),
      document.fonts.load('600 20px "IBM Plex Mono"'),
      document.fonts.load('700 20px "Work Sans"'),
      document.fonts.load('600 15px "Work Sans"'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    console.warn("Font preload for export skipped.", err);
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  const last = lines.length - 1;
  if (last >= 0 && ctx.measureText(lines[last]).width > maxWidth) {
    while (lines[last].length > 1 && ctx.measureText(lines[last] + "…").width > maxWidth) {
      lines[last] = lines[last].slice(0, -1);
    }
    lines[last] += "…";
  }
  return lines;
}

function slugifyTitle() {
  return (state.title || "my-board").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "my-board";
}

function souvenirFilename() {
  const stamp = new Date().toISOString().slice(0, 10);
  return `ai-human-bingo-${slugifyTitle()}-${state.size}-${stamp}.png`;
}

async function renderSouvenirCanvas() {
  await ensureFontsReady();

  const n = cols();
  const showLetters = config().showLetters;
  const W = 1080;
  const PAD = 48;
  const GAP = 14;
  const CELL = (W - PAD * 2 - GAP * (n - 1)) / n;
  const HEADER_H = 220;
  const LETTERS_H = showLetters ? CELL * 0.62 : 0;
  const LETTERS_GAP = showLetters ? GAP : 0;
  const CAPTION_H = 66;
  const CELL_TOTAL = CELL + CAPTION_H;
  const FOOTER_H = 76;
  const H = HEADER_H + LETTERS_H + LETTERS_GAP + (CELL_TOTAL + GAP) * n + FOOTER_H;

  const canvas = document.getElementById("exportCanvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const ink = "#1b1815";
  const paper = "#faf5ea";
  const accent = "#2f8f5b";
  const accentInk = "#0e2e1c";
  const coral = "#ef6a4c";
  const sky = "#4f7fb3";
  const muted = "#a89f92";

  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.fillStyle = coral;
  ctx.font = '600 20px "IBM Plex Mono", monospace';
  ctx.textBaseline = "alphabetic";
  ctx.fillText("AI HUMAN BINGO", PAD, 56);

  const title = (state.title && state.title.trim()) || "My AI Human Bingo Souvenir";
  ctx.fillStyle = paper;
  ctx.font = '400 50px "Permanent Marker", cursive';
  const titleLines = wrapLines(ctx, title, W - PAD * 2 - 260, 2);
  let ty = 106;
  titleLines.forEach((line) => {
    ctx.fillText(line, PAD, ty);
    ty += 50;
  });

  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  ctx.fillStyle = muted;
  ctx.font = '600 18px "Work Sans", sans-serif';
  ctx.fillText(dateStr, PAD, HEADER_H - 14);

  // persona badge (top-right of header)
  const counts = computeCategoryCounts();
  const personaKey = dominantCategory(counts);
  if (personaKey) {
    const meta = CATEGORY_META[personaKey];
    const badgeW = 300;
    const badgeX = W - PAD - badgeW;
    const badgeY = 30;
    ctx.fillStyle = meta.color;
    roundRect(ctx, badgeX, badgeY, badgeW, 40, 20);
    ctx.fill();
    ctx.fillStyle = "#1b1815";
    ctx.font = '700 15px "Work Sans", sans-serif';
    const label = meta.name.toUpperCase();
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, badgeX + badgeW / 2 - lw / 2, badgeY + 26);

    ctx.fillStyle = muted;
    ctx.font = '500 15px "Work Sans", sans-serif';
    const taglineLines = wrapLines(ctx, meta.tagline, badgeW, 2);
    let py = badgeY + 40 + 22;
    taglineLines.forEach((line) => {
      const pw = ctx.measureText(line).width;
      ctx.fillText(line, badgeX + badgeW / 2 - pw / 2, py);
      py += 19;
    });
  }

  // letters row (5x5 only)
  let gridTop = HEADER_H;
  if (showLetters) {
    const letters = ["B", "I", "N", "G", "O"];
    const letterColors = [coral, sky, accent, sky, coral];
    let lx = PAD;
    const ly = HEADER_H;
    letters.forEach((letter, i) => {
      ctx.fillStyle = letterColors[i];
      roundRect(ctx, lx, ly, CELL, LETTERS_H, 16);
      ctx.fill();
      ctx.fillStyle = i === 1 || i === 3 ? paper : ink;
      ctx.font = '400 40px "Permanent Marker", cursive';
      const tw = ctx.measureText(letter).width;
      ctx.fillText(letter, lx + CELL / 2 - tw / 2, ly + LETTERS_H / 2 + 14);
      lx += CELL + GAP;
    });
    gridTop = HEADER_H + LETTERS_H + LETTERS_GAP;
  }

  // grid
  const tasks = config().tasks;
  const photoEntries = [];
  tasks.forEach((task, idx) => {
    const dataUrl = state.photos[String(idx)];
    if (dataUrl) photoEntries.push([idx, dataUrl]);
  });
  const loaded = new Map();
  const imgs = await Promise.all(photoEntries.map(([, src]) => loadImage(src)));
  photoEntries.forEach(([idx], i) => loaded.set(idx, imgs[i]));

  tasks.forEach((task, idx) => {
    const row = Math.floor(idx / n);
    const col = idx % n;
    const x = PAD + col * (CELL + GAP);
    const y = gridTop + row * (CELL_TOTAL + GAP);

    ctx.fillStyle = paper;
    roundRect(ctx, x, y, CELL, CELL_TOTAL, 12);
    ctx.fill();

    const photoPad = 8;
    const px = x + photoPad, py = y + photoPad, pSize = CELL - photoPad * 2;
    const img = loaded.get(idx);
    ctx.save();
    roundRect(ctx, px, py, pSize, pSize, 8);
    ctx.clip();
    if (img) {
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, px, py, pSize, pSize);
    } else {
      ctx.fillStyle = task.free ? accent : "#322c25";
      ctx.fillRect(px, py, pSize, pSize);
      ctx.fillStyle = task.free ? accentInk : muted;
      ctx.font = `${Math.round(pSize * 0.32)}px sans-serif`;
      const glyph = "\u{1F4F7}";
      const gw = ctx.measureText(glyph).width;
      ctx.fillText(glyph, px + pSize / 2 - gw / 2, py + pSize / 2 + pSize * 0.12);
    }
    ctx.restore();

    if (img) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x + CELL - 16, y + 16, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = paper;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + CELL - 21, y + 16);
      ctx.lineTo(x + CELL - 17, y + 20.5);
      ctx.lineTo(x + CELL - 10.5, y + 11);
      ctx.stroke();
    }

    ctx.fillStyle = task.free ? accentInk : ink;
    ctx.font = '700 15px "Work Sans", sans-serif';
    const lines = wrapLines(ctx, task.text, CELL - 12, 3);
    let cy = y + CELL + 22;
    lines.forEach((line) => {
      ctx.fillText(line, x + 8, cy);
      cy += 18;
    });
  });

  // footer
  const footerY = H - FOOTER_H / 2;
  const count = Object.keys(state.photos).length;
  ctx.fillStyle = muted;
  ctx.font = '600 16px "IBM Plex Mono", monospace';
  ctx.fillText(`${count}/${state.size} captured`, PAD, footerY + 5);
  const madeWith = "made with AI Human Bingo";
  ctx.font = '500 15px "IBM Plex Mono", monospace';
  const mw = ctx.measureText(madeWith).width;
  ctx.fillText(madeWith, W - PAD - mw, footerY + 5);

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function exportSouvenir() {
  if (Object.keys(state.photos).length === 0) {
    showToast("Capture at least one photo first.");
    return;
  }
  saveBtn.disabled = true;
  const originalLabel = saveBtn.innerHTML;
  saveBtn.innerHTML = "Preparing…";

  try {
    const canvas = await renderSouvenirCanvas();
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      showToast("Couldn't create the image — try again.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = souvenirFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast("Souvenir saved to your device.");
  } catch (err) {
    console.error(err);
    showToast("Something went wrong saving the souvenir.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalLabel;
  }
}

saveBtn.addEventListener("click", exportSouvenir);

/* ---------------- social share ---------------- */

const shareButtons = {
  facebook: document.getElementById("shareFbBtn"),
  instagram: document.getElementById("shareIgBtn"),
};

const PLATFORM_LABEL = { facebook: "Facebook", instagram: "Instagram" };

async function shareSouvenir(platform) {
  if (Object.keys(state.photos).length === 0) {
    showToast("Capture at least one photo before sharing.");
    return;
  }

  const btn = shareButtons[platform];
  btn.disabled = true;

  try {
    const canvas = await renderSouvenirCanvas();
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      showToast("Couldn't prepare the image — try again.");
      return;
    }

    const file = new File([blob], souvenirFilename(), { type: "image/png" });
    const canShareFiles = typeof navigator.share === "function"
      && typeof navigator.canShare === "function"
      && navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: "My AI Human Bingo board",
          text: "I filled my AI Human Bingo board — check it out!",
        });
        showToast(`Opened your share sheet — pick ${PLATFORM_LABEL[platform]} there.`);
      } catch (err) {
        if (err && err.name !== "AbortError") throw err;
      }
      return;
    }

    // No file-sharing support in this browser (mainly desktop): fall back per platform,
    // and never send the photo itself anywhere — only ever a plain page link.
    if (platform === "facebook") {
      const shareUrl = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(location.href);
      window.open(shareUrl, "_blank", "noopener,noreferrer");
      showToast("This browser can't attach your photo directly — save your souvenir below, then add it to your Facebook post.");
    } else {
      showToast("Instagram doesn't support sharing straight from a browser — save your souvenir below, then post it from your camera roll.");
    }
  } catch (err) {
    console.error(err);
    showToast("Something went wrong preparing the share.");
  } finally {
    btn.disabled = false;
  }
}

shareButtons.facebook.addEventListener("click", () => shareSouvenir("facebook"));
shareButtons.instagram.addEventListener("click", () => shareSouvenir("instagram"));

/* ---------------- init ---------------- */

function init() {
  loadState();
  titleInput.value = state.title || "";
  updateSizeButtons();
  buildBoard();
  applyPhotosToBoard();
  updateProgress(false);
}

init();
