export interface AuthActionState {
  status: "idle" | "error" | "success";
  message: string | null;
}
