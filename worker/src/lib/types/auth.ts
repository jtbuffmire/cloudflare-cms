export interface LoginRequest {
  email: string;
  password: string;
  domain: string;
}

export interface LoginResponse {
  token: string;
}

export interface ErrorResponse {
  error?: string;
} 