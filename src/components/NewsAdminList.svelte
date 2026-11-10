<script lang="ts">
    import { actions } from "astro:actions";
    import type { news } from "@db/schema";
    import { parseDbDate } from "@lib/dates";
    import { formatDate } from "@i18n/dates";
    import { localizePath } from "@i18n/config";
    import type { Locale } from "@i18n/config";
    import { translate, translateMessage } from "@i18n/index";
    import type { MessageKey } from "@i18n/index";

    type News = typeof news.$inferSelect;
    type NewsListItem = Pick<News, "id" | "title" | "tag" | "pinned" | "hidden" | "createdAt">;

    const { news: initialNews, locale }: { news: NewsListItem[]; locale: Locale } = $props();
    const t = (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params);

    let items = $state<NewsListItem[]>([...initialNews]);
    let savingIds = $state<number[]>([]);
    let error = $state("");

    function sortItems(list: NewsListItem[]): NewsListItem[] {
        return [...list].sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return b.createdAt.localeCompare(a.createdAt);
        });
    }

    async function updateFlags(item: NewsListItem, flags: { pinned?: boolean; hidden?: boolean }) {
        if (savingIds.includes(item.id)) return;

        savingIds = [...savingIds, item.id];
        error = "";
        try {
            const result = await actions.updateNewsFlags({ newsId: item.id, ...flags });
            if (result.error) {
                error = translateMessage(locale, result.error.message);
                return;
            }
            items = sortItems(items.map((record) => (record.id === item.id ? { ...record, ...flags } : record)));
        } catch (e) {
            error = e instanceof Error ? e.message : t("news.flagsFailed");
        } finally {
            savingIds = savingIds.filter((id) => id !== item.id);
        }
    }
</script>

{#if error}
    <p class="mt-3 text-diia-red" role="alert">{error}</p>
{/if}

{#if items.length === 0}
    <p class="mt-5">{t("news.empty")}</p>
{:else}
    <ul class="mt-5 list-colors">
        {#each items as item (item.id)}
            <li>
                <div class="card mb-5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="rounded-full bg-diia-bright-grey px-3 py-1 text-sm text-liceum-blue">
                                {item.tag}
                            </span>
                            {#if item.pinned}
                                <span class="rounded-full bg-diia-gorse px-3 py-1 text-sm text-liceum-orange">
                                    {t("news.pinnedBadge")}
                                </span>
                            {/if}
                            {#if item.hidden}
                                <span class="rounded-full bg-diia-bright-grey px-3 py-1 text-sm text-black/60">
                                    {t("news.hiddenBadge")}
                                </span>
                            {/if}
                        </div>
                        <time datetime={parseDbDate(item.createdAt).toISOString()} class="text-sm text-black/60">
                            {formatDate(parseDbDate(item.createdAt), locale)}
                        </time>
                    </div>
                    <a href={localizePath(locale, `/admin/news/editor?news=${item.id}`)} class="mt-2 block">
                        <h4>{item.title}</h4>
                    </a>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            class="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-liceum-blue px-3.5 text-sm text-liceum-blue transition-colors hover:bg-liceum-blue/5 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={savingIds.includes(item.id)}
                            onclick={() => updateFlags(item, { pinned: !item.pinned })}
                        >
                            <span class="material-symbols-outlined text-[18px]">push_pin</span>
                            {item.pinned ? t("news.unpin") : t("news.pinAction")}
                        </button>
                        <button
                            type="button"
                            class={`flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${item.hidden ? "border-liceum-blue text-liceum-blue hover:bg-liceum-blue/5" : "border-liceum-red text-liceum-red hover:bg-liceum-red/10"}`}
                            disabled={savingIds.includes(item.id)}
                            onclick={() => updateFlags(item, { hidden: !item.hidden })}
                        >
                            <span class="material-symbols-outlined text-[18px]"> visibility </span>
                            {item.hidden ? t("news.show") : t("news.hideAction")}
                        </button>
                    </div>
                </div>
            </li>
        {/each}
    </ul>
{/if}
