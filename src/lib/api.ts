import type { AuthResponse } from "../types";

const configuredBaseUrl = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.trim();

export const API_BASE_URL = (
  configuredBaseUrl || "http://localhost:3000/api/v1"
).replace(/\/+$/, "");

type ApiOptions = RequestInit & {
  token?: string;
  skipJson?: boolean;
  timeoutMs?: number;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Handler invoked when any request comes back with a 401. AuthContext
// registers `logout` here so a stale/expired session tears down cleanly no
// matter which screen triggered the call.
let unauthorizedHandler: ((requestToken?: string) => void) | null = null;

export function setUnauthorizedHandler(
  handler: ((requestToken?: string) => void) | null,
) {
  unauthorizedHandler = handler;
}

export async function request<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T | undefined> {
  const {
    token,
    skipJson,
    timeoutMs = 15_000,
    signal: callerSignal,
    headers: inputHeaders,
    ...init
  } = options;
  const headers = new Headers(inputHeaders);

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Combine the caller's AbortSignal (React Query unmount cancellation) with an
  // internal timeout controller. The timeout aborts with a TimeoutError so the
  // caller surfaces "Request timed out" instead of hanging indefinitely.
  const controller = new AbortController();
  const timeoutId =
    timeoutMs > 0
      ? window.setTimeout(
          () =>
            controller.abort(
              new DOMException("Request timed out", "TimeoutError"),
            ),
          timeoutMs,
        )
      : undefined;
  let onCallerAbort: (() => void) | undefined;
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason);
    } else {
      onCallerAbort = () => controller.abort(callerSignal.reason);
      callerSignal.addEventListener("abort", onCallerAbort, { once: true });
    }
  }

  try {
    const response = await fetch(apiUrl(path), {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      const body = text ? parseJson(text) : text;
      if (response.status === 401) unauthorizedHandler?.(token);
      throw new ApiError(
        readApiMessage(body, response.statusText),
        response.status,
      );
    }

    if (skipJson || text.length === 0) {
      return undefined;
    }

    const body = parseJson(text);
    if (!body || typeof body !== "object") {
      throw new ApiError("Unexpected response format", response.status);
    }

    return body as T;
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    if (onCallerAbort && callerSignal)
      callerSignal.removeEventListener("abort", onCallerAbort);
  }
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
}

export function refreshTokens(
  refreshToken: string,
  options: { signal?: AbortSignal } = {},
) {
  return request<
    Pick<AuthResponse, "accessToken" | "refreshToken" | "expiresIn">
  >("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    signal: options.signal,
  });
}

function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readApiMessage(body: unknown, fallback: string) {
  if (typeof body === "string") return body;
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.message)) return record.message.join(", ");
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;
  return fallback;
}
