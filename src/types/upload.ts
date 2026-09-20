export type FileStatus = "queued" | "extracting" | "parsing" | "embedding" | "done" | "error";
export type UploadFile = { id: string; name: string; size: number; status: FileStatus; progress: number; error?: string };
