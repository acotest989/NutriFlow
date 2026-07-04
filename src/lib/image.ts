// Compress a picked image File into a small JPEG suitable for AI analysis and
// JSON upload. Scales the longest side down to `maxDim` and re-encodes as JPEG so
// the base64 payload stays comfortably under the server's 1 MB body limit
// (a 1024px q0.7 JPEG is typically ~150–300 KB → ~200–400 KB base64).

export interface AnalyzableImage {
  base64: string; // raw base64, no data: prefix
  mimeType: string; // always image/jpeg after compression
  previewUrl: string; // object URL for showing the picked photo (caller must revoke)
}

export async function fileToAnalyzableImage(
  file: File,
  maxDim = 1024,
  quality = 0.7
): Promise<AnalyzableImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const previewUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(previewUrl);
  } catch (err) {
    URL.revokeObjectURL(previewUrl);
    throw err;
  }

  const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
  const scale = Math.min(1, maxDim / longest);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(previewUrl);
    throw new Error("Couldn't process the image on this device.");
  }
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) {
    URL.revokeObjectURL(previewUrl);
    throw new Error("Couldn't read that image. Try a different photo.");
  }

  return { base64, mimeType: "image/jpeg", previewUrl };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image. Try a different photo."));
    img.src = src;
  });
}

// Grab the current frame of a live <video> as a compressed JPEG. Used by the
// in-page camera capture (same getUserMedia stream the barcode scanner uses).
export function captureVideoFrame(
  video: HTMLVideoElement,
  maxDim = 1024,
  quality = 0.7
): { base64: string; dataUrl: string } {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const scale = Math.min(1, maxDim / Math.max(vw, vh));
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't capture the photo on this device.");
  ctx.drawImage(video, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("Couldn't capture the photo. Try again.");
  return { base64, dataUrl };
}
