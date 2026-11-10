import { apiFetch } from "./api";
import type { AuthUser } from "@/types/auth";
import type { LoginFormValues, RegisterFormValues } from "@/features/auth/schemas";

interface AuthResponse {
  user: AuthUser;
}

export async function loginUser(values: LoginFormValues): Promise<AuthUser> {
  const { user } = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(values),
  });
  return user;
}

export async function registerUser(values: RegisterFormValues): Promise<AuthUser> {
  const { email, phone, firstName, lastName, password } = values;
  const { user } = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ firstName, lastName, password, email, phone }),
  });
  return user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>("/auth/me");
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resendVerificationEmail(): Promise<void> {
  await apiFetch<{ success: boolean }>("/auth/resend-verification", { method: "POST" });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch<{ success: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiFetch<{ success: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}
