export const APPLICATION_STATUSES = ["pending", "accepted", "rejected", "attention"] as const;

const LABELS: Record<string, string> = {
    pending: "На розгляді",
    accepted: "Прийнято",
    rejected: "Відхилено",
    attention: "Зверніть увагу",
};

const CLASSES: Record<string, string> = {
    pending: "bg-liceum-green/15 text-liceum-green",
    accepted: "bg-diia-blue/15 text-diia-blue",
    rejected: "bg-liceum-red/15 text-liceum-red",
    attention: "bg-diia-grey/15 text-black/55",
};

export function statusLabel(status: string, hasNotes = false) {
    return `${LABELS[status] ?? status}${hasNotes ? " *" : ""}`;
}

export function statusClass(status: string) {
    return CLASSES[status] ?? "bg-diia-grey/15 text-black/55";
}
