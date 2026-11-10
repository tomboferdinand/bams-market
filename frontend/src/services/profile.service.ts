import { apiFetch } from "./api";
import type { AuthUser } from "@/types/auth";
import type { PersonalInfoValues, ChangePasswordValues } from "@/features/profile/schemas";

export async function updateMyProfile(values: PersonalInfoValues): Promise<AuthUser> {
    return apiFetch<AuthUser>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email || undefined,
            phone: values.phone || undefined,
        }),
    });
}

export async function changeMyPassword(values: ChangePasswordValues): Promise<void> {
    await apiFetch<{ success: boolean }>("/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
        }),
    });
}