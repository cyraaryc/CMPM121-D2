type Point = { x: number; y: number };
type Tool =
  | { id: string; kind: "brush" }
  | { id: string; emoji: string; kind: "sticker" };
const tools: Tool[] = [
  { id: "emoji1", emoji: "emoji1", kind: "sticker" },
  { id: "emoji2", emoji: "emoji12", kind: "sticker" },
  { id: "emoji3", emoji: "emoji13", kind: "sticker" },
  { id: "brush", kind: "brush" },
];
let currentTool = "brush";
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
function makeSticker(
  x: number,
  y: number,
  emoji: string,
): DrawCommand {
  return {
    draw(ctx) {
      ctx.save();
      ctx.fillText(emoji, x, y);
      ctx.restore();
    },
  };
}

const committed: DrawCommand[] = [];
const redoStack: DrawCommand[] = [];
const undoStack: DrawCommand[] = [];

type ActiveStroke = { points: Point[]; width: number; color: string };
let activeGesture: ActiveStroke | null = null;
let strokeWidth = 4;
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
const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
const strokePlus = document.createElement("button");
strokePlus.textContent = "Size+";
const strokeMinus = document.createElement("button");
strokeMinus.textContent = "Size -";
const emojiButton1 = document.createElement("button");
emojiButton1.textContent = "emoji1";
const emojiButton2 = document.createElement("button");
emojiButton2.textContent = "emoji2";
const emojiButton3 = document.createElement("button");
emojiButton3.textContent = "emoji3";
const brush = document.createElement("button");
brush.textContent = "brush";
debugPanel.append(
  debugSummary,
  clearPixelsButton,
  redrawButton,
  undoButton,
  redoButton,
  strokePlus,
  strokeMinus,
  emojiButton1,
  emojiButton2,
  emojiButton3,
  brush,
);

app.append(heading, instructions, canvas, debugPanel);

let renderQueued = false;

function addObj(cmd: DrawCommand) {
  committed.push(cmd);
  undoStack.push(cmd);
  redoStack.length = 0;
  requestRender();
}
function undo() {
  const input = undoStack.pop();
  if (!input) return;
  committed.pop();
  redoStack.push(input);
  requestRender();
}
function redo() {
  const input = redoStack.pop();
  if (!input) return;
  committed.push(input);
  undoStack.push(input);
  requestRender();
}

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
  const tool = tools.find((t) => t.id === currentTool)!;
  if (!tool) return;
  if (tool.kind == "brush") {
    canvas.setPointerCapture(e.pointerId);
    activeGesture = {
      points: [toDocPoint(e)],
      width: strokeWidth,
      color: "#0ef3d0",
    };
    requestRender();
  } else if (tool.kind == "sticker") {
    addObj(makeSticker(toDocPoint(e).x, toDocPoint(e).y, tool.emoji));
  }
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
  activeGesture = null;
  addObj(makeStroke([...points], width, color));
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

undoButton.addEventListener("click", () => {
  undo();
});

redoButton.addEventListener("click", () => {
  redo();
});

strokePlus.addEventListener("click", () => {
  strokeWidth += 1;
});

strokeMinus.addEventListener("click", () => {
  strokeWidth -= 1;
});

emojiButton1.addEventListener("click", () => {
  currentTool = "emoji1";
});
emojiButton2.addEventListener("click", () => {
  currentTool = "emoji2";
});
emojiButton3.addEventListener("click", () => {
  currentTool = "emoji3";
});
brush.addEventListener("click", () => {
  currentTool = "brush";
});
