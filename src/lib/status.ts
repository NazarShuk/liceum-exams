import type { Locale } from "@i18n/config";
import { translate } from "@i18n/index";
import type { MessageKey } from "@i18n/index";

export const APPLICATION_STATUSES = ["pending", "accepted", "rejected", "attention"] as const;

const LABEL_KEYS: Record<string, MessageKey> = {
    pending: "status.pending",
    accepted: "status.accepted",
    rejected: "status.rejected",
    attention: "status.attention",
    draft: "status.draft",
};

const CLASSES: Record<string, string> = {
    pending: "bg-liceum-green/15 text-liceum-green",
    accepted: "bg-diia-blue/15 text-diia-blue",
    rejected: "bg-liceum-red/15 text-liceum-red",
    attention: "bg-diia-grey/15 text-black/55",
};

export function statusLabel(status: string, locale: Locale, hasNotes = false) {
    const label = LABEL_KEYS[status] ? translate(locale, LABEL_KEYS[status]) : status;
    return `${label}${hasNotes ? " *" : ""}`;
}

export function statusClass(status: string) {
    return CLASSES[status] ?? "bg-diia-grey/15 text-black/55";
}
