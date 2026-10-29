import { env } from "cloudflare:workers";

type Event = {
    source: "server" | "client" | "user" | "admin";
    type: string;
    message?: string;
    path?: string;
    field?: string;
    value?: string;
    userId?: number;
    status?: string;
};

function write(event: Event) {
    try {
        const analytics = env.ANALYTICS_ENGINE;
        if (!analytics) return;
        // Analytics Engine drops the whole datapoint if more than one index is sent.
        analytics.writeDataPoint({
            indexes: [event.type],
            blobs: [
                event.source,
                event.path || "",
                event.status || "",
                event.message || "",
                event.field || "",
                event.value || "",
                event.userId ? String(event.userId) : "",
            ],
        });
    } catch {
        // analytics failures must not break app
    }
}

export function logErrorEvent(params: Omit<Event, "source"> & { source: "server" | "client" | "user" }) {
    write(params);
}

// Successful actions, i.e. the audit trail shown at /admin/logs.
export function logEvent(params: {
    type: string;
    user?: { id: number; role: string } | null;
    path?: string;
    target?: string;
    targetId?: number | string | null;
    detail?: string;
}) {
    write({
        source: params.user?.role === "admin" ? "admin" : "user",
        type: params.type,
        message: params.detail,
        path: params.path,
        field: params.target,
        value: params.targetId == null ? undefined : String(params.targetId),
        userId: params.user?.id,
    });
}
