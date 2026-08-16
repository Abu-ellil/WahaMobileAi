// src/store/preview.ts
// Hand-off slot between the chat screen and /preview. Route params would mean
// serializing potentially huge HTML documents, so the payload travels in memory.

export interface PreviewPayload {
  html: string;
  fileName: string; // suggested name when saving the composed document
}

let current: PreviewPayload | null = null;

export function setPreview(payload: PreviewPayload): void {
  current = payload;
}

export function getPreview(): PreviewPayload | null {
  return current;
}
