/**
 * overlay.js
 * ---------------------------------------------------------------
 * Draws the detected skeleton on the canvas that sits on top of the
 * video. Color-coded: green while form looks good, amber the moment
 * an issue is flagged - so judges can SEE the AI reacting in real
 * time, not just read a number.
 */
import { POSE_CONNECTIONS } from '../pose/landmarks.js';

export function drawSkeleton(ctx, landmarks, width, height, { goodForm = true } = {}) {
  const color = goodForm ? '#3ddc84' : '#f5a623';
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (const [i, j] of POSE_CONNECTIONS) {
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  const drawnPoints = new Set(POSE_CONNECTIONS.flat());
  for (const idx of drawnPoints) {
    const p = landmarks[idx];
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}
