"use strict";

const STORAGE_KEY = "aiPersonalChallengeV1";
const BINGO_STORAGE_KEY = "aiHumanBingoV2"; // read-only peek, for prefilling the event name
const ANSWER_MAX = 200;

const QUESTIONS = [
  { id: "q1", tag: "Redesign", color: "--sky", text: "What task do I currently do manually that I could redesign — not just automate?" },
  { id: "q2", tag: "Skill", color: "--accent", text: "What skill do I need to build so I add value AI can't replace?" },
  { id: "q3", tag: "Resistance", color: "--coral", text: "Where am I resistant to change out of comfort rather than good reason?" },
];

const nameInput = document.getElementById("nameInput");
const eventInput = document.getElementById("eventInput");
const revisitCheck = document.getElementById("revisitCheck");
const revisitDate = document.getElementById("revisitDate");
const shareSection = document.getElementById("shareSection");
const toastEl = document.getElementById("toast");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const shareButtons = {
  facebook: document.getElementById("shareFbBtn"),
  instagram: document.getElementById("shareIgBtn"),
};
const PLATFORM_LABEL = { facebook: "Facebook", instagram: "Instagram" };

const qEls = QUESTIONS.map((q) => ({
  ...q,
  textarea: document.getElementById(q.id),
  counter: document.getElementById(`${q.id}Count`),
}));

let state = { name: "", event: "", q1: "", q2: "", q3: "", revisit: false };
let toastTimer = null;
let pledgeSaved = false;

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
    console.warn("Personal Challenge: couldn't read saved draft.", err);
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
    console.warn("Personal Challenge: couldn't persist draft (storage full?).", err);
  }
}

function isPledgeComplete() {
  return Boolean(state.name.trim() && state.q1.trim() && state.q2.trim() && state.q3.trim());
}

function refreshSaveButtonState() {
  const complete = isPledgeComplete();
  saveBtn.disabled = !complete;
  saveBtn.title = complete ? "" : "Fill in your name and all three answers first";
}

function hideShareSection() {
  pledgeSaved = false;
  shareSection.hidden = true;
}

function revealShareSection() {
  pledgeSaved = true;
  shareSection.hidden = false;
}

function plus90Days() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function updateRevisitLabel() {
  revisitDate.textContent = revisitCheck.checked ? ` — ${plus90Days()}` : "";
}

/* ---------------- form wiring ---------------- */

function renderFromState() {
  nameInput.value = state.name;
  eventInput.value = state.event;
  revisitCheck.checked = Boolean(state.revisit);
  qEls.forEach((q) => {
    q.textarea.value = state[q.id];
    q.counter.textContent = `${state[q.id].length}/${ANSWER_MAX}`;
  });
  updateRevisitLabel();
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

revisitCheck.addEventListener("change", () => {
  state.revisit = revisitCheck.checked;
  updateRevisitLabel();
  saveState();
});

qEls.forEach((q) => {
  q.textarea.addEventListener("input", () => {
    state[q.id] = q.textarea.value;
    q.counter.textContent = `${q.textarea.value.length}/${ANSWER_MAX}`;
    saveState();
    refreshSaveButtonState();
  });
});

resetBtn.addEventListener("click", () => {
  const hasContent = state.name || state.q1 || state.q2 || state.q3;
  if (!hasContent) return;
  const ok = window.confirm("Clear everything you've written? This can't be undone.");
  if (!ok) return;
  state = { name: "", event: state.event, q1: "", q2: "", q3: "", revisit: false };
  hideShareSection();
  saveState();
  renderFromState();
  showToast("Pledge cleared.");
});

/* ---------------- canvas render ---------------- */

const PLEDGE_FONTS = [
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
  let seed = 42;
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

async function renderPledgeCanvas() {
  await ensureFontsReady(PLEDGE_FONTS);

  const kraft = "#f1e4c9";
  const kraftDeep = "#ddc79c";
  const paper = "#fffaf3";
  const ink = "#2b2620";
  const inkSoft = "#4a4033";
  const muted = "#8a7a61";
  const coral = "#ef6a4c";
  const sky = "#4f7fb3";
  const accent = "#2f8f5b";
  const TAG_COLOR = { "--sky": sky, "--accent": accent, "--coral": coral };

  const W = 1080;
  const OUTER = 48;
  const TOP_CLEAR = 88; // room for washi tape above the card
  const CARD_PAD = 60;
  const CARD_W = W - OUTER * 2;
  const contentW = CARD_W - CARD_PAD * 2;

  // pass 1: measure with a throwaway context (font metrics don't need real canvas size)
  const measure = document.createElement("canvas").getContext("2d");

  measure.font = '700 20px "IBM Plex Mono", monospace';
  const nameStr = (state.name && state.name.trim()) || "Someone at this event";

  measure.font = '400 50px "Permanent Marker", cursive';
  const nameLines = wrapLines(measure, nameStr, contentW, 1);

  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const metaStr = state.event && state.event.trim() ? `for ${state.event.trim()} · ${dateStr}` : dateStr;

  const qaBlocks = qEls.map((q) => {
    measure.font = '700 15px "Work Sans", sans-serif';
    const qLines = wrapLines(measure, q.text, contentW, 3);
    measure.font = '400 16px "Work Sans", sans-serif';
    const answer = state[q.id].trim() || "(left blank)";
    const aLines = wrapLines(measure, answer, contentW, 8);
    return { ...q, qLines, aLines };
  });

  let cardH = 40; // top inner padding before kicker
  cardH += 20 + 14; // kicker line + gap
  cardH += nameLines.length * 54 + 6; // name (signature)
  cardH += 18 + 26; // meta line + gap
  cardH += 14 + 22; // wavy divider + gap
  qaBlocks.forEach((b, i) => {
    cardH += 24; // tag pill
    cardH += b.qLines.length * 21 + 6;
    cardH += b.aLines.length * 23;
    cardH += i === qaBlocks.length - 1 ? 6 : 26;
  });
  if (state.revisit) cardH += 46;
  cardH += 30; // footer line
  cardH += 44; // bottom inner padding

  const CARD_H = cardH;
  const H = TOP_CLEAR + CARD_H + OUTER;

  const canvas = document.getElementById("exportCanvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  // background
  ctx.fillStyle = kraft;
  ctx.fillRect(0, 0, W, H);
  drawGrain(ctx, W, H, "#c9b284");

  const cardX = OUTER;
  const cardY = TOP_CLEAR;

  // stacked-paper depth behind the card
  ctx.save();
  ctx.translate(cardX + CARD_W / 2, cardY + CARD_H / 2);
  ctx.rotate((-1.6 * Math.PI) / 180);
  ctx.fillStyle = kraftDeep;
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2 + 4, CARD_W, CARD_H, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cardX + CARD_W / 2, cardY + CARD_H / 2);
  ctx.rotate((1.1 * Math.PI) / 180);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = kraftDeep;
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2 + 7, CARD_W, CARD_H, 10);
  ctx.fill();
  ctx.restore();

  // main card
  ctx.save();
  ctx.shadowColor = "rgba(43,38,32,0.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = paper;
  roundRect(ctx, cardX, cardY, CARD_W, CARD_H, 10);
  ctx.fill();
  ctx.restore();

  // washi tape, top corners
  function tape(cx, cy, rotateDeg, colorA, colorB) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotateDeg * Math.PI) / 180);
    const tw = 130, th = 46;
    for (let i = -tw; i < tw; i += 18) {
      ctx.fillStyle = (i / 18) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(i, -th / 2, 13, th);
    }
    ctx.globalAlpha = 0.88;
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = 0.88;
  tape(cardX + 100, cardY + 8, -7, coral, "#f3987e");
  tape(cardX + CARD_W - 90, cardY + 6, 6, sky, "#82a6c9");
  ctx.restore();

  // content
  const contentX = cardX + CARD_PAD;
  let cy = cardY + CARD_PAD;

  ctx.fillStyle = coral;
  ctx.font = '700 20px "IBM Plex Mono", monospace';
  ctx.fillText("THE PERSONAL CHALLENGE", contentX, cy + 16);
  cy += 20 + 14;

  ctx.fillStyle = ink;
  ctx.font = '400 50px "Permanent Marker", cursive';
  nameLines.forEach((line) => {
    ctx.fillText(`— ${line}`, contentX, cy + 40);
    cy += 54;
  });
  cy += 6;

  ctx.fillStyle = muted;
  ctx.font = '500 18px "Work Sans", sans-serif';
  ctx.fillText(metaStr, contentX, cy + 14);
  cy += 18 + 26;

  drawWavyDivider(ctx, contentX, cy, contentW, "#d8cbb0");
  cy += 14 + 22;

  qaBlocks.forEach((b, i) => {
    const tagColor = TAG_COLOR[b.color] || accent;
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    const tagLabel = b.tag.toUpperCase();
    const tagW = ctx.measureText(tagLabel).width + 22;
    ctx.fillStyle = tagColor;
    roundRect(ctx, contentX, cy, tagW, 22, 11);
    ctx.fill();
    ctx.fillStyle = paper;
    ctx.fillText(tagLabel, contentX + 11, cy + 15);
    cy += 24;

    ctx.fillStyle = ink;
    ctx.font = '700 15px "Work Sans", sans-serif';
    b.qLines.forEach((line) => {
      ctx.fillText(line, contentX, cy + 12);
      cy += 21;
    });
    cy += 6;

    ctx.fillStyle = inkSoft;
    ctx.font = '400 16px "Work Sans", sans-serif';
    b.aLines.forEach((line) => {
      ctx.fillText(line, contentX, cy + 13);
      cy += 23;
    });
    cy += i === qaBlocks.length - 1 ? 6 : 26;
  });

  if (state.revisit) {
    const stampY = cy + 6;
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.6;
    roundRect(ctx, contentX, stampY, contentW, 34, 8);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#1f6b42";
    ctx.font = '700 13px "IBM Plex Mono", monospace';
    ctx.fillText(`↺ REVISIT BY ${plus90Days().toUpperCase()}`, contentX + 12, stampY + 22);
    cy += 46;
  }

  cy += 4;
  ctx.fillStyle = muted;
  ctx.font = '500 13px "IBM Plex Mono", monospace';
  ctx.fillText("made with AI Human Bingo · The Personal Challenge", contentX, cy + 10);

  return canvas;
}

function slugify(text) {
  return (text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function pledgeFilename() {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = slugify(state.name) || "my-pledge";
  return `personal-challenge-${slug}-${stamp}.png`;
}

function eventHashtag() {
  const clean = (state.event || "").replace(/[^a-zA-Z0-9]+/g, "");
  return clean ? `#AIHumanBingo #PersonalChallenge #${clean}` : "#AIHumanBingo #PersonalChallenge";
}

/* ---------------- save / share ---------------- */

async function downloadPledge() {
  if (!isPledgeComplete()) {
    showToast("Fill in your name and all three answers first.");
    return;
  }
  saveBtn.disabled = true;
  const originalLabel = saveBtn.innerHTML;
  saveBtn.innerHTML = "Preparing…";

  try {
    const canvas = await renderPledgeCanvas();
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      showToast("Couldn't create the image — try again.");
      return;
    }
    const result = await deliverImage(blob, pledgeFilename(), { title: "My Personal Challenge pledge" });
    if (result === "cancelled") return;
    if (result === "shared") {
      showToast("Choose “Save Image” in the share sheet to add it to your Photos.", 4200);
    } else {
      showToast("Pledge downloaded to this device.");
    }
    revealShareSection();
  } catch (err) {
    console.error(err);
    showToast("Something went wrong saving your pledge.");
  } finally {
    saveBtn.disabled = !isPledgeComplete();
    saveBtn.innerHTML = originalLabel;
  }
}

saveBtn.addEventListener("click", downloadPledge);

async function sharePledge(platform) {
  if (!isPledgeComplete()) {
    showToast("Fill in your name and all three answers first.");
    return;
  }
  const btn = shareButtons[platform];
  btn.disabled = true;

  try {
    const canvas = await renderPledgeCanvas();
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      showToast("Couldn't prepare the image — try again.");
      return;
    }
    const file = new File([blob], pledgeFilename(), { type: "image/png" });
    const hashtag = eventHashtag();

    if (canShareFile(file)) {
      try {
        await navigator.share({
          files: [file],
          title: "My Personal Challenge pledge",
          text: `I made a personal pledge — holding myself to it. ${hashtag}`,
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
      showToast("This browser can't attach your pledge directly — download it below, then add it to your Facebook post.");
    } else {
      showToast(`Instagram doesn't support sharing straight from a browser — download your pledge below, then post it with ${hashtag}.`, 3600);
    }
  } catch (err) {
    console.error(err);
    showToast("Something went wrong preparing the share.");
  } finally {
    btn.disabled = false;
  }
}

shareButtons.facebook.addEventListener("click", () => sharePledge("facebook"));
shareButtons.instagram.addEventListener("click", () => sharePledge("instagram"));

/* ---------------- init ---------------- */

loadState();
renderFromState();
