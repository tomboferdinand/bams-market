const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Message renvoyé par le backend (403) quand une action exige un e-mail vérifié. */
export const EMAIL_NOT_VERIFIED_MESSAGE = "Vérifiez votre adresse e-mail pour effectuer cette action.";
/** Événement navigateur émis dans ce cas : la fenêtre de vérification s'ouvre alors toute seule. */
export const EMAIL_NOT_VERIFIED_EVENT = "bams:email-not-verified";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include", // indispensable : transmet/reçoit le cookie httpOnly
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message ?? `Erreur API (${res.status})`;
    if (res.status === 403 && message === EMAIL_NOT_VERIFIED_MESSAGE && typeof window !== "undefined") {
      window.dispatchEvent(new Event(EMAIL_NOT_VERIFIED_EVENT));
    }
    throw new ApiError(message, res.status);
  }

  return res.json();
}
