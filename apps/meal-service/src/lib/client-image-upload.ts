const FORM_IMAGE_BUDGET_BYTES = 800 * 1024;
const INITIAL_MAX_DIMENSION = 1600;
const MIN_TARGET_BYTES = 48 * 1024;

export function imageTargetBytes(fileCount: number) {
  if (!Number.isInteger(fileCount) || fileCount < 1) return FORM_IMAGE_BUDGET_BYTES;
  return Math.max(MIN_TARGET_BYTES, Math.floor(FORM_IMAGE_BUDGET_BYTES / fileCount));
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Không thể tối ưu ảnh đã chọn.")),
      "image/jpeg",
      quality,
    );
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không thể đọc ảnh đã chọn."));
    };
    image.src = url;
  });
}

async function optimizeImage(file: File, targetBytes: number) {
  if (file.size <= targetBytes) return file;

  const image = await loadImage(file);
  let maxDimension = INITIAL_MAX_DIMENSION;
  let best: Blob | null = null;

  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.44, 0.36]) {
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ tối ưu ảnh.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await canvasBlob(canvas, quality);
    best = blob;
    if (blob.size <= targetBytes) break;
    maxDimension = Math.round(maxDimension * 0.82);
  }

  if (!best) throw new Error("Không thể tối ưu ảnh đã chọn.");
  return new File([best], `${file.name.replace(/\.[^.]+$/, "") || "anh-mon"}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

export async function optimizeFormImages(form: HTMLFormElement) {
  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"]'))
    .filter((input) => input.files?.[0]);
  if (inputs.length === 0) return;
  if (typeof DataTransfer === "undefined") {
    throw new Error("Trình duyệt chưa hỗ trợ gửi ảnh. Vui lòng cập nhật trình duyệt.");
  }

  const targetBytes = imageTargetBytes(inputs.length);
  await Promise.all(inputs.map(async (input) => {
    const source = input.files?.[0];
    if (!source) return;
    const optimized = await optimizeImage(source, targetBytes);
    const transfer = new DataTransfer();
    transfer.items.add(optimized);
    input.files = transfer.files;
  }));
}
