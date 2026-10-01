export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024;

export function validateDocumentFile(file: File): string | null {
  if (!/\.(pdf|txt)$/i.test(file.name)) return "Unsupported file type. Use PDF or TXT.";
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_DOCUMENT_FILE_SIZE) return "File is larger than 10 MB.";
  return null;
}
