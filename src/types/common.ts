export type Id = string;
export type LoadingState = "idle" | "loading" | "success" | "error";
export type ApiError = { message: string; status?: number };
