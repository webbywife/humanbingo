"use strict";

const STORAGE_KEY = "aiThreeCommitmentsV1";
const BINGO_STORAGE_KEY = "aiHumanBingoV2"; // read-only peek, for prefilling the event name
const ANSWER_MAX = 120;

const COMMITMENTS = [
  { id: "c1", color: "--coral", prompt: "One problem in Quezon you'll point the next 12 months at." },
  { id: "c2", color: "--sky", prompt: "One workflow you own — instrument it, redesign it, don't just automate it." },
  { id: "c3", color: "--accent", prompt: "One younger scholar you'll mentor into the translator role." },
];

const nameInput = document.getElementById("nameInput");
const eventInput = document.getElementById("eventInput");
const shareSection = document.getElementById("shareSection");
const toastEl = document.getElementById("toast");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const shareButtons = {
  facebook: document.getElementById("shareFbBtn"),
  instagram: document.getElementById("shareIgBtn"),
};
const PLATFORM_LABEL = { facebook: "Facebook", instagram: "Instagram" };

const cEls = COMMITMENTS.map((c) => ({
  ...c,
  input: document.getElementById(c.id),
  counter: document.getElementById(`${c.id}Count`),
}));

let state = { name: "", event: "", c1: "", c2: "", c3: "" };
let toastTimer = null;

function showToast(message, duration = 2600) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        state = { ...state, ...parsed };
      }
    }
  } catch (err) {
    console.warn("3 Commitments: couldn't read saved draft.", err);
  }

  if (!state.event) {
    try {
      const bingoRaw = localStorage.getItem(BINGO_STORAGE_KEY);
      if (bingoRaw) {
        const bingo = JSON.parse(bingoRaw);
        if (bingo && typeof bingo.title === "string" && bingo.title.trim()) {
          state.event = bingo.title.trim();
        }
      }
    } catch (err) {
      // ignore — the bingo page may not have been visited, that's fine
    }
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("3 Commitments: couldn't persist draft (storage full?).", err);
  }
}

function isComplete() {
  return Boolean(state.name.trim() && state.c1.trim() && state.c2.trim() && state.c3.trim());
}

function refreshSaveButtonState() {
  const complete = isComplete();
  saveBtn.disabled = !complete;
  saveBtn.title = complete ? "" : "Fill in your name and all three commitments first";
}

function hideShareSection() { shareSection.hidden = true; }
function revealShareSection() { shareSection.hidden = false; }

function renderFromState() {
  nameInput.value = state.name;
  eventInput.value = state.event;
  cEls.forEach((c) => {
    c.input.value = state[c.id];
    c.counter.textContent = `${state[c.id].length}/${ANSWER_MAX}`;
  });
  refreshSaveButtonState();
}

nameInput.addEventListener("input", () => {
  state.name = nameInput.value;
  saveState();
  refreshSaveButtonState();
});

eventInput.addEventListener("input", () => {
  state.event = eventInput.value;
  saveState();
});

cEls.forEach((c) => {
  c.input.addEventListener("input", () => {
    state[c.id] = c.input.value;
    c.counter.textContent = `${c.input.value.length}/${ANSWER_MAX}`;
    saveState();
    refreshSaveButtonState();
  });
});

resetBtn.addEventListener("click", () => {
  const hasContent = state.name || state.c1 || state.c2 || state.c3;
  if (!hasContent) return;
  const ok = window.confirm("Clear everything you've written? This can't be undone.");
  if (!ok) return;
  state = { name: "", event: state.event, c1: "", c2: "", c3: "" };
  hideShareSection();
  saveState();
  renderFromState();
  showToast("Commitments cleared.");
});

/* ---------------- canvas render ---------------- */

const COMMIT_FONTS = [
  '400 50px "Permanent Marker"',
  '700 20px "IBM Plex Mono"',
  '700 15px "Work Sans"',
  '400 15px "Work Sans"',
];

function drawWavyDivider(ctx, x, y, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  const step = 24;
  let cx = x;
  let up = true;
  ctx.moveTo(cx, y);
  while (cx < x + width) {
    const nx = Math.min(cx + step, x + width);
    ctx.quadraticCurveTo(cx + step / 2, up ? y - 6 : y + 6, nx, y);
    cx = nx;
    up = !up;
  }
  ctx.stroke();
}

function drawGrain(ctx, w, h, color) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = color;
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 220; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rand() * 1.4 + 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

async function renderCommitmentCanvas() {
  await ensureFontsReady(COMMIT_FONTS);

  const navy = "#3d4a63";
  const paperDim = "#efe7d8";
  const paper = "#faf5ea";
  const ink = "#3d4a63";
  const mutedOnPaper = "#6b6459";
  const coral = "#d99aa6";
  const coralDeep = "#b06e7a";
  const sky = "#a9c6de";
  const accent = "#9dbb8a";
  const accentInk = "#232c3e";
  const BADGE_COLOR = { "--coral": coral, "--sky": sky, "--accent": accent };

  const W = 1080;
  const OUTER = 48;
  const TOP_CLEAR = 88;
  const CARD_PAD = 60;
  const CARD_W = W - OUTER * 2;
  const contentW = CARD_W - CARD_PAD * 2;
  const badgeD = 52;
  const badgeGap = 18;

  const measure = document.createElement("canvas").getContext("2d");

  const nameStr = (state.name && state.name.trim()) || "Someone at this event";
  measure.font = '400 50px "Permanent Marker", cursive';
  const nameLines = wrapLines(measure, nameStr, contentW, 1);

  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const metaStr = state.event && state.event.trim() ? `for ${state.event.trim()} · committed ${dateStr}` : `committed ${dateStr}`;

  const blocks = cEls.map((c) => {
    measure.font = '700 14.5px "Work Sans", sans-serif';
    const promptLines = wrapLines(measure, c.prompt, contentW - badgeD - badgeGap, 3);
    measure.font = '400 17px "Work Sans", sans-serif';
    const answer = state[c.id].trim() || "(left blank)";
    const answerLines = wrapLines(measure, answer, contentW - badgeD - badgeGap, 4);
    return { ...c, promptLines, answerLines };
  });

  let cardH = 40;
  cardH += 20 + 14; // kicker
  cardH += nameLines.length * 54 + 6; // name
  cardH += 18 + 26; // meta
  cardH += 14 + 24; // divider
  blocks.forEach((b, i) => {
    const linesH = b.promptLines.length * 19 + 8 + b.answerLines.length * 24;
    cardH += Math.max(badgeD, linesH) + (i === blocks.length - 1 ? 0 : 26);
  });
  cardH += 30; // footer
  cardH += 44; // bottom padding

  const CARD_H = cardH;
  const H = TOP_CLEAR + CARD_H + OUTER;

  const canvas = document.getElementById("exportCanvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = navy;
  ctx.fillRect(0, 0, W, H);
  drawGrain(ctx, W, H, "#4a5872");

  const cardX = OUTER;
  const cardY = TOP_CLEAR;

  ctx.save();
  ctx.translate(cardX + CARD_W / 2, cardY + CARD_H / 2);
  ctx.rotate((-1.6 * Math.PI) / 180);
  ctx.fillStyle = paperDim;
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2 + 4, CARD_W, CARD_H, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cardX + CARD_W / 2, cardY + CARD_H / 2);
  ctx.rotate((1.1 * Math.PI) / 180);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = paperDim;
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2 + 7, CARD_W, CARD_H, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(15,19,28,0.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = paper;
  roundRect(ctx, cardX, cardY, CARD_W, CARD_H, 10);
  ctx.fill();
  ctx.restore();

  function tape(cx, cy, rotateDeg, colorA, colorB) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotateDeg * Math.PI) / 180);
    const tw = 130, th = 46;
    for (let i = -tw; i < tw; i += 18) {
      ctx.fillStyle = (i / 18) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(i, -th / 2, 13, th);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = 0.88;
  tape(cardX + 100, cardY + 8, -7, coral, "#e8bbc7");
  tape(cardX + CARD_W - 90, cardY + 6, 6, sky, "#c3d9ec");
  ctx.restore();

  const contentX = cardX + CARD_PAD;
  let cy = cardY + CARD_PAD;

  ctx.fillStyle = coralDeep;
  ctx.font = '700 20px "IBM Plex Mono", monospace';
  ctx.fillText("THE COMMITMENT", contentX, cy + 16);
  cy += 20 + 14;

  ctx.fillStyle = ink;
  ctx.font = '400 50px "Permanent Marker", cursive';
  nameLines.forEach((line) => {
    ctx.fillText(`— ${line}`, contentX, cy + 40);
    cy += 54;
  });
  cy += 6;

  ctx.fillStyle = mutedOnPaper;
  ctx.font = '500 18px "Work Sans", sans-serif';
  ctx.fillText(metaStr, contentX, cy + 14);
  cy += 18 + 26;

  drawWavyDivider(ctx, contentX, cy, contentW, "#d8cbb0");
  cy += 14 + 24;

  const textX = contentX + badgeD + badgeGap;

  blocks.forEach((b, i) => {
    const linesH = b.promptLines.length * 19 + 8 + b.answerLines.length * 24;
    const rowH = Math.max(badgeD, linesH);
    const badgeColor = BADGE_COLOR[b.color] || accent;

    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(contentX + badgeD / 2, cy + rowH / 2, badgeD / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accentInk;
    ctx.font = '400 26px "Permanent Marker", cursive';
    const numLabel = String(i + 1);
    const nw = ctx.measureText(numLabel).width;
    ctx.fillText(numLabel, contentX + badgeD / 2 - nw / 2, cy + rowH / 2 + 9);

    let ty = cy + (rowH - linesH) / 2;

    ctx.fillStyle = mutedOnPaper;
    ctx.font = '700 14.5px "Work Sans", sans-serif';
    b.promptLines.forEach((line) => {
      ctx.fillText(line, textX, ty + 12);
      ty += 19;
    });
    ty += 8;

    ctx.fillStyle = ink;
    ctx.font = '400 17px "Work Sans", sans-serif';
    b.answerLines.forEach((line) => {
      ctx.fillText(line, textX, ty + 14);
      ty += 24;
    });

    cy += rowH + (i === blocks.length - 1 ? 0 : 26);
  });

  cy += 30;
  ctx.fillStyle = mutedOnPaper;
  ctx.font = '500 13px "IBM Plex Mono", monospace';
  ctx.fillText("made with AI Human Bingo · 3 Commitments", contentX, cy);

  return canvas;
}

function slugify(text) {
  return (text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function commitmentFilename() {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = slugify(state.name) || "my-commitments";
  return `3-commitments-${slug}-${stamp}.png`;
}

function eventHashtag() {
  const clean = (state.event || "").replace(/[^a-zA-Z0-9]+/g, "");
  return clean ? `#AIHumanBingo #3Commitments #${clean}` : "#AIHumanBingo #3Commitments";
}

/* ---------------- save / share ---------------- */

async function downloadCommitments() {
  if (!isComplete()) {
    showToast("Fill in your name and all three commitments first.");
    return;
  }
  saveBtn.disabled = true;
  const originalLabel = saveBtn.innerHTML;
  saveBtn.innerHTML = "Preparing…";

  try {
    const canvas = await renderCommitmentCanvas();
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      showToast("Couldn't create the image — try again.");
      return;
    }
    const result = await deliverImage(blob, commitmentFilename(), { title: "My 3 Commitments" });
    if (result === "cancelled") return;
    if (result === "shared") {
      showToast("Choose “Save Image” in the share sheet to add it to your Photos.", 4200);
    } else {
      showToast("Commitments downloaded to this device.");
    }
    revealShareSection();
  } catch (err) {
    console.error(err);
    showToast("Something went wrong saving your commitments.");
  } finally {
    saveBtn.disabled = !isComplete();
    saveBtn.innerHTML = originalLabel;
  }
}

saveBtn.addEventListener("click", downloadCommitments);

async function shareCommitments(platform) {
  if (!isComplete()) {
    showToast("Fill in your name and all three commitments first.");
    return;
  }
  const btn = shareButtons[platform];
  btn.disabled = true;

  try {
    const canvas = await renderCommitmentCanvas();
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      showToast("Couldn't prepare the image — try again.");
      return;
    }
    const file = new File([blob], commitmentFilename(), { type: "image/png" });
    const hashtag = eventHashtag();

    if (canShareFile(file)) {
      try {
        await navigator.share({
          files: [file],
          title: "My 3 Commitments",
          text: `Made 3 commitments today — holding myself to them. ${hashtag}`,
        });
        showToast(`Opened your share sheet — pick ${PLATFORM_LABEL[platform]} there.`);
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
        console.warn("Web Share failed, falling back.", err);
      }
    }

    if (platform === "facebook") {
      const parts = hashtag.split(" ");
      const fbHashtag = parts[parts.length - 1];
      const shareUrl = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(location.href) + "&hashtag=" + encodeURIComponent(fbHashtag);
      window.open(shareUrl, "_blank", "noopener,noreferrer");
      showToast("This browser can't attach your commitments directly — download them below, then add them to your Facebook post.");
    } else {
      showToast(`Instagram doesn't support sharing straight from a browser — download your commitments below, then post them with ${hashtag}.`, 3600);
    }
  } catch (err) {
    console.error(err);
    showToast("Something went wrong preparing the share.");
  } finally {
    btn.disabled = false;
  }
}

shareButtons.facebook.addEventListener("click", () => shareCommitments("facebook"));
shareButtons.instagram.addEventListener("click", () => shareCommitments("instagram"));

/* ---------------- init ---------------- */

loadState();
renderFromState();
