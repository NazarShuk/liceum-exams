import { attachment } from "@cartamd/plugin-attachment";
import { Carta, type Plugin } from "carta-md";
import type { Element, Root } from "hast";
import { ALLOWED_UPLOAD_TYPES } from "@lib/uploads";
import HrIcon from "@components/icons/HrIcon.svelte";

// Raw HTML is dropped by Carta's remark-rehype pipeline; block unsafe URLs like the old marked setup did.
const isUnsafeUrl = (url: string) => !/^(https?:|mailto:|#|\/|\.)/i.test(url);

function walk(node: Root | Element) {
    for (const child of node.children) {
        if (child.type !== "element") continue;

        for (const key of ["href", "src"] as const) {
            const value = child.properties[key];
            if (typeof value === "string" && isUnsafeUrl(value)) {
                child.properties[key] = "#";
            }
        }

        walk(child);
    }
}

const safeLinks: Plugin = {
    transformers: [
        {
            execution: "sync",
            type: "rehype",
            transform: ({ processor }) => {
                processor.use(() => (tree: Root) => walk(tree));
            },
        },
    ],
};

const horizontalRule: Plugin = {
    icons: [
        {
            id: "horizontalRule",
            label: "Горизонтальна лінія",
            component: HrIcon,
            action: (input) => {
                const line = input.getLine();
                const insertion = `${line.value.trim() ? "\n\n" : ""}---\n\n`;
                const position = line.end + insertion.length;
                input.insertAt(line.end, insertion);
                input.textarea.setSelectionRange(position, position);
            },
        },
    ],
};

const newsAttachment = attachment({
    supportedMimeTypes: ALLOWED_UPLOAD_TYPES,
    upload: async (file) => {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/news-attachment", { method: "POST", body });
        if (!response.ok) return null;

        const { url } = (await response.json()) as { url?: string };
        return url ?? null;
    },
});

export const carta = new Carta({
    extensions: [safeLinks, horizontalRule, newsAttachment],
    sanitizer: false,
});

export function markdownExcerpt(content: string, maxLength = 160): string {
    return content
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#>*_~`|-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}
