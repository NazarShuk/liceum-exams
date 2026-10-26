import { marked } from "marked";

// Raw HTML and unsafe link protocols are blocked so admin-authored markdown can't inject scripts.
marked.use({
    renderer: {
        html: () => "",
    },
    walkTokens: (token) => {
        if (token.type === "link" && !/^(https?:|mailto:|#|\/|\.)/i.test(token.href)) {
            token.href = "#";
        }
    },
});

export function renderMarkdown(content: string): string {
    return marked.parse(content, { async: false });
}

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
