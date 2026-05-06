import { Project, SceneItem } from "@/types/types";

const CANVAS_SIZE = 1600;
const PADDING = 120;

function getItemFootprint(item: SceneItem) {
  switch (item.type) {
    case "chair":
      return { width: 0.55, depth: 0.55, color: "#84a98c" };
    case "podium":
      return { width: 0.8, depth: 0.8, color: "#7f5539" };
    case "screen":
      return { width: 3.2, depth: 0.25, color: "#3d405b" };
    case "round_table":
      return { width: 1.6, depth: 1.6, color: "#d4a373" };
    case "rectangular_table":
      return { width: 1.8, depth: 0.8, color: "#c9ada7" };
    case "stage":
      return { width: 5, depth: 3, color: "#6d6875" };
    case "column":
      return { width: Math.max(0.25, item.scale[0]), depth: Math.max(0.25, item.scale[2]), color: "#777d7d" };
    case "sofa":
      return { width: Math.max(1.2, item.scale[0]), depth: Math.max(0.7, item.scale[2]), color: "#8f9ea1" };
    case "railing":
      return { width: Math.max(1, item.scale[0]), depth: Math.max(0.12, item.scale[2]), color: "#6f7775" };
    case "dance_floor":
      return {
        width: Math.max(2, item.scale[0]),
        depth: Math.max(2, item.scale[2]),
        color: "#d4a373",
      };
    case "aisle":
      return {
        width: Math.max(1, item.scale[0]),
        depth: Math.max(4, item.scale[2]),
        color: "#e9edc9",
      };
    case "plant":
      return { width: 0.6, depth: 0.6, color: "#6a994e" };
    default:
      return {
        width: Math.max(0.6, item.scale[0]),
        depth: Math.max(0.6, item.scale[2]),
        color: "#adb5bd",
      };
  }
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  return canvas;
}

export function renderProjectToFloorplanCanvas(project: Project) {
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create floorplan canvas.");
  }

  ctx.fillStyle = "#f8faf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const roomScale = Math.min(
    (canvas.width - PADDING * 2) / project.room.width,
    (canvas.height - PADDING * 2) / project.room.depth,
  );

  const roomPixelWidth = project.room.width * roomScale;
  const roomPixelDepth = project.room.depth * roomScale;
  const originX = (canvas.width - roomPixelWidth) / 2;
  const originY = (canvas.height - roomPixelDepth) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#354f52";
  ctx.lineWidth = 6;
  ctx.fillRect(originX, originY, roomPixelWidth, roomPixelDepth);
  ctx.strokeRect(originX, originY, roomPixelWidth, roomPixelDepth);

  project.items.forEach((item) => {
    const footprint = getItemFootprint(item);
    const centerX = originX + roomPixelWidth / 2 + item.x * roomScale;
    const centerY = originY + roomPixelDepth / 2 + item.z * roomScale;
    const width = footprint.width * roomScale;
    const depth = footprint.depth * roomScale;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(item.rotationY);
    ctx.fillStyle = footprint.color;
    ctx.strokeStyle = "#2f3e46";
    ctx.lineWidth = 2;

    if (item.type === "round_table" || item.type === "plant") {
      ctx.beginPath();
      ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-width / 2, -depth / 2, width, depth);
      ctx.strokeRect(-width / 2, -depth / 2, width, depth);
    }

    ctx.restore();
  });

  ctx.fillStyle = "#2f3e46";
  ctx.font = '600 40px "Space Grotesk", sans-serif';
  ctx.fillText(project.name, originX, originY - 34);

  ctx.fillStyle = "#52796f";
  ctx.font = '500 24px "Space Grotesk", sans-serif';
  ctx.fillText(
    `${project.room.width}m x ${project.room.depth}m`,
    originX,
    originY + roomPixelDepth + 40,
  );

  return canvas;
}

function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function exportProjectAsPng(project: Project) {
  const canvas = renderProjectToFloorplanCanvas(project);
  downloadDataUrl(
    `${project.name.toLowerCase().replace(/\s+/g, "-") || "layout"}.png`,
    canvas.toDataURL("image/png"),
  );
}

export function exportProjectAsPdf(project: Project) {
  const canvas = renderProjectToFloorplanCanvas(project);
  const imageUrl = canvas.toDataURL("image/png");
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument;

  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error("Failed to prepare PDF export.");
  }

  frameDocument.open();
  frameDocument.write(`
    <html>
      <head>
        <title>${project.name}</title>
        <style>
          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, sans-serif;
            background: #ffffff;
            color: #2f3e46;
          }
          h1 {
            margin: 0 0 12px;
            font-size: 24px;
          }
          p {
            margin: 0 0 20px;
            color: #52796f;
          }
          img {
            width: 100%;
            max-width: 1000px;
            border: 1px solid #d8ded7;
          }
          @page {
            size: auto;
            margin: 12mm;
          }
        </style>
      </head>
      <body>
        <h1>${project.name}</h1>
        <p>2D floorplan export</p>
        <img id="floorplan-image" src="${imageUrl}" alt="Floorplan export" />
      </body>
    </html>
  `);
  frameDocument.close();

  const image = frameDocument.getElementById("floorplan-image") as HTMLImageElement | null;

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  const print = () => {
    frameWindow.focus();
    frameWindow.print();
    cleanup();
  };

  if (image && !image.complete) {
    image.onload = print;
    image.onerror = cleanup;
    return;
  }

  print();
}
