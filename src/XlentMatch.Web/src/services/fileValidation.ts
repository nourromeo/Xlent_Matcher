import { translateStatic } from "../i18n";

export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024;

export function validateDocumentFile(file: File): string | null {
  if (!/\.(pdf|txt)$/i.test(file.name)) return translateStatic("file_unsupported");
  if (file.size <= 0) return translateStatic("file_empty");
  if (file.size > MAX_DOCUMENT_FILE_SIZE) return translateStatic("file_too_large");
  return null;
}
