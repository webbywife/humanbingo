"use strict";

/* ------------------------------------------------------------------
   Shared canvas + save/share helpers used by every page in this site
   (root Human Bingo game, /pledge). Keep this dependency-free and
   framework-agnostic — it only assumes a <canvas> element it's handed.
------------------------------------------------------------------- */

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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function ensureFontsReady(specs) {
  try {
    await Promise.all(specs.map((spec) => document.fonts.load(spec)));
    await document.fonts.ready;
  } catch (err) {
    console.warn("Font preload for export skipped.", err);
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function canShareFile(file) {
  return typeof navigator.share === "function"
    && typeof navigator.canShare === "function"
    && navigator.canShare({ files: [file] });
}

/**
 * Delivers a generated image to the user: tries the native share sheet
 * first (its "Save Image" action is the only way a website can put an
 * image into an iPhone/Android Photos library), falling back to a plain
 * file download only where file-sharing isn't supported.
 * Returns "shared" | "downloaded" | "cancelled".
 */
async function deliverImage(blob, filename, shareData) {
  const file = new File([blob], filename, { type: "image/png" });
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], ...shareData });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
      console.warn("Web Share failed, falling back to a direct download.", err);
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}
