type Point = { x: number; y: number };

interface DrawCommand {
  draw(ctx: CanvasRenderingContext2D): void;
}

function makeStroke(
  points: Point[],
  width: number,
  color: string,
): DrawCommand {
  return {
    draw(ctx) {
      if (points.length === 0) return;

      ctx.save();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      ctx.restore();
    },
  };
}

const committed: DrawCommand[] = [];

type ActiveStroke = { points: Point[]; width: number; color: string };
let activeGesture: ActiveStroke | null = null;

const app = document.querySelector<HTMLElement>("#app")!;

const heading = document.createElement("h1");
heading.textContent = "Sticker Sketchpad";

const instructions = document.createElement("p");
instructions.textContent = "Drag on the canvas to draw.";

const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
canvas.style.border = "1px solid #ec0101";
canvas.style.touchAction = "none";
const ctx = canvas.getContext("2d")!;

const debugPanel = document.createElement("details");
const debugSummary = document.createElement("summary");
debugSummary.textContent = "Debug";
const clearPixelsButton = document.createElement("button");
clearPixelsButton.textContent = "Clear pixels";
const redrawButton = document.createElement("button");
redrawButton.textContent = "Redraw";
debugPanel.append(debugSummary, clearPixelsButton, redrawButton);

app.append(heading, instructions, canvas, debugPanel);

let renderQueued = false;

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const command of committed) command.draw(ctx);
  if (activeGesture) {
    const { points, width, color } = activeGesture;
    makeStroke(points, width, color).draw(ctx);
  }
}

function toDocPoint(e: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * canvas.width) / rect.width,
    y: ((e.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function cancelGesture() {
  if (!activeGesture) return;
  activeGesture = null;
  requestRender();
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  activeGesture = { points: [toDocPoint(e)], width: 4, color: "#0ef3d0" };
  requestRender();
});

canvas.addEventListener("pointermove", (e) => {
  if (!activeGesture) return;
  activeGesture.points.push(toDocPoint(e));
  requestRender();
});

canvas.addEventListener("pointerup", () => {
  if (!activeGesture) return;
  const { points, width, color } = activeGesture;
  // Placeholder: becomes commit(), which also clears redo (step 4)
  committed.push(makeStroke([...points], width, color));
  activeGesture = null;
  requestRender();
});

canvas.addEventListener("pointercancel", cancelGesture);
canvas.addEventListener("lostpointercapture", cancelGesture);

clearPixelsButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

redrawButton.addEventListener("click", () => {
  render();
});
