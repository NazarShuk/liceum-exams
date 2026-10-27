import { env } from "cloudflare:workers";

export function logErrorEvent(params: {
  source: "server" | "client" | "user";
  type: string;
  message?: string;
  path?: string;
  field?: string;
  value?: string;
  userId?: number;
  status?: string;
}) {
  try {
    const analytics = (env as any).ANALYTICS_ENGINE;
    if (!analytics) return;
    const indexes: string[] = [
      params.source,
      params.type,
      params.path || "",
      params.status || "",
    ];
    const blobs: (string | null)[] = [
      params.message || "",
      params.field || "",
      params.value || "",
      params.userId ? String(params.userId) : "",
    ];
    analytics.writeDataPoint({
      indexes,
      blobs,
    });
  } catch {
    // analytics failures must not break app
  }
}
