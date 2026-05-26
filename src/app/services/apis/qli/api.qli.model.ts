export interface AuthResponse {
  success?: boolean;
  token?: string | null;
  refreshToken?: string | null;
  privileges?: Array<string> | null;
}
