<script lang="ts">
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    import type { news } from "@db/schema";
    import { MarkdownEditor } from "carta-md";
    import { carta } from "@lib/markdown";

    type News = typeof news.$inferSelect;

    const { loadedNews }: { loadedNews: News | undefined } = $props();

    let item = $state({
        // svelte-ignore state_referenced_locally
        id: loadedNews?.id ?? -1,
        // svelte-ignore state_referenced_locally
        title: loadedNews?.title ?? "",
        // svelte-ignore state_referenced_locally
        tag: loadedNews?.tag ?? "",
        // svelte-ignore state_referenced_locally
        content: loadedNews?.content ?? "",
    });
    let loading = $state(false);
    let errorMessage = $state("");
    let saved = $state(false);
    let savedSnapshot = $state("");
    const currentSnapshot = () =>
        JSON.stringify({
            title: item.title,
            tag: item.tag,
            content: item.content,
        });

    savedSnapshot = currentSnapshot();

    onMount(() => {
        const preventLeavingWithUnsavedChanges = (event: BeforeUnloadEvent) => {
            if (currentSnapshot() !== savedSnapshot) {
                event.preventDefault();
                event.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", preventLeavingWithUnsavedChanges);
        return () => window.removeEventListener("beforeunload", preventLeavingWithUnsavedChanges);
    });

    async function saveNews() {
        if (loading) return;

        loading = true;
        errorMessage = "";
        saved = false;

        try {
            const result = await actions.submitNewsEdit({
                newsId: item.id > 0 ? item.id : undefined,
                title: item.title,
                tag: item.tag,
                content: item.content,
            });

            if (result.error) {
                errorMessage = result.error.message;
            } else {
                item.id = result.data.newsId;
                saved = true;
                savedSnapshot = currentSnapshot();
                if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("news", String(item.id));
                    window.history.replaceState(null, "", url);
                }
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося зберегти новину";
        } finally {
            loading = false;
        }
    }

    async function deleteNews() {
        if (loading || item.id <= 0) return;
        if (!window.confirm("Видалити новину?")) return;

        loading = true;
        errorMessage = "";
        try {
            const result = await actions.deleteNews({ newsId: item.id });
            if (result.error) {
                errorMessage = result.error.message;
            } else {
                window.location.assign("/admin/news");
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося видалити новину";
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex flex-col gap-5">
    <input class="w-full" placeholder="Заголовок новини" bind:value={item.title} />
    <input class="w-full" placeholder="Тег" bind:value={item.tag} />

    <MarkdownEditor {carta} bind:value={item.content} />

        
    <p class="text-diia-green {saved && item.id !== -1 ? '' : "opacity-0 select-none"}" role="status">
        Зміни збережено!
    </p>

    <div class="flex flex-row gap-5">
        <button
            type="button"
            class="btn-default {loading ? 'opacity-50' : ''}"
            disabled={loading || !item.title.trim() || !item.tag.trim() || !item.content.trim()}
            onclick={saveNews}
        >
            {loading ? "Збереження..." : "Зберегти"}
        </button>
        {#if item.id > 0}
            <button
                type="button"
                class="btn-default {loading ? 'opacity-50' : ''} bg-diia-red!"
                disabled={loading}
                onclick={deleteNews}
            >
                Видалити новину
            </button>
        {/if}
    </div>

    {#if item.id > 0}
        <a href={`/news/${item.id}`} target="_blank" rel="noopener">Переглянути на сайті</a>
    {/if}

    <p class="text-diia-red" role="alert">
        {#if errorMessage}
            {errorMessage}
        {/if}
    </p>
</div>
