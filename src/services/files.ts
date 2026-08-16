// src/services/files.ts
// Saves a code block as a real file inside app storage, then opens the system
// share sheet so the user can export it (Downloads, Drive…). On web it falls
// back to a browser download.

import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppError } from './types';
import { normalizeLang } from '../utils/code';

export const CODE_DIR = 'code';

const MIME: Record<string, string> = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  json: 'application/json',
  py: 'text/x-python',
};

function mimeFor(lang: string): string {
  return MIME[normalizeLang(lang)] ?? 'text/plain';
}

export interface SavedCodeFile {
  fileName: string;
  uri: string | null; // null on web (no persistent file was created)
}

export async function saveCodeFile(code: string, rawLang: string, fileName: string): Promise<SavedCodeFile> {
  if (Platform.OS === 'web') {
    downloadOnWeb(code, fileName, mimeFor(rawLang));
    return { fileName, uri: null };
  }

  try {
    const dir = new Directory(Paths.document, CODE_DIR);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const file = new File(dir, fileName);
    file.create({ overwrite: true });
    file.write(code);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: mimeFor(rawLang),
        dialogTitle: 'حفظ / مشاركة الملف',
      });
    }
    return { fileName, uri: file.uri };
  } catch (e) {
    throw new AppError('تعذر حفظ الملف: ' + (e instanceof Error ? e.message : String(e)));
  }
}

function downloadOnWeb(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
