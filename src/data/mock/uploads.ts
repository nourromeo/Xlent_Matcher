import type { UploadFile } from "../../types";
export const DEMO_FILES: UploadFile[] = [
  { id: "f1", name: "anna_kovacs_consultant_cv.pdf", size: 182400, status: "done", progress: 100 },
  { id: "f2", name: "marcus_lee_consultant_cv.docx", size: 94208, status: "parsing", progress: 55 },
  { id: "f3", name: "priya_sharma_cv.pdf", size: 213504, status: "extracting", progress: 20 },
  { id: "f4", name: "tobias_renz_cv.pdf", size: 156672, status: "queued", progress: 0 },
  { id: "f5", name: "sofia_yun_consultant_cv.pdf", size: 128000, status: "error", progress: 0, error: "Text extraction failed: scanned image quality is too low" },
];
