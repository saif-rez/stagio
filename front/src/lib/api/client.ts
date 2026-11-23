// HTTP client for the Stagio backend (/back).
// In dev, Vite proxies /api to the backend, so the session cookie is same-origin.
// In production, set VITE_API_URL (e.g. https://api.stagio.tn) if the API is on another origin.

const BASE = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

/** Error with the backend's { error: { code, message } } payload. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return `${BASE}/api${path}${qs ? `?${qs}` : ""}`;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  const isForm = options.body instanceof FormData;
  let res: Response;
  try {
    const init: RequestInit = { method: options.method ?? "GET", credentials: "include" };
    if (isForm) init.body = options.body as FormData;
    else if (options.body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(options.body);
    }
    res = await fetch(buildUrl(path, options.query), init);
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Le serveur est injoignable. Réessayez dans un instant.",
    );
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "HTTP_ERROR",
      err?.details?.[0]?.message
        ? `${err.message} ${err.details[0].message}`
        : (err?.message ?? "Une erreur est survenue."),
      err?.details,
    );
  }
  return data as T;
}

/** French message to show in a toast for any thrown error. */
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}
