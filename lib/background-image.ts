export function backgroundImageUrl(slug: string, version?: number) {
  return `/api/public/${encodeURIComponent(slug)}/background?v=${version || 1}`;
}

export function emojiImageUrl(slug: string, version?: number) {
  return `/api/public/${encodeURIComponent(slug)}/emoji?v=${version || 1}`;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("לא הצלחנו לעבד את התמונה"));
    }, "image/jpeg", quality);
  });
}

export async function compressBackgroundImage(file: File) {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new Error("אפשר להעלות רק קובץ תמונה");
  }
  if (file.size > 12_000_000) {
    throw new Error("התמונה גדולה מדי. בחרו קובץ עד 12MB");
  }

  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 1600 / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("הדפדפן לא מצליח לעבד תמונות");
  context.fillStyle = "#111111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const maxBytes = 350_000;
  let quality = 0.78;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > maxBytes && quality > 0.48) {
    quality -= 0.1;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > maxBytes) {
    throw new Error("התמונה כבדה מדי גם אחרי כיווץ. נסו תמונה אחרת");
  }
  return blob;
}

export async function compressSymbolImage(file: File) {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new Error("אפשר להעלות רק קובץ תמונה");
  }
  if (file.size > 12_000_000) {
    throw new Error("התמונה גדולה מדי. בחרו קובץ עד 12MB");
  }

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.max(0, (bitmap.width - side) / 2);
  const sy = Math.max(0, (bitmap.height - side) / 2);
  const size = Math.max(1, Math.min(512, side));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("הדפדפן לא מצליח לעבד תמונות");
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  const maxBytes = 180_000;
  let quality = 0.84;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > maxBytes && quality > 0.48) {
    quality -= 0.1;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > maxBytes) {
    throw new Error("התמונה כבדה מדי גם אחרי כיווץ. נסו תמונה אחרת");
  }
  return blob;
}
