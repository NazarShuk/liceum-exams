<script lang="ts">
    import { onMount } from "svelte";
    import { Tween } from "svelte/motion";
    import type { profiles } from "@db/schema";
    type Profile = typeof profiles.$inferSelect;

    const {
        profile,
        onRemove,
        onClick,
        selectable = false,
        href,
        className,
        count,
    }: {
        profile: Profile;
        onRemove?: () => void;
        onClick?: () => void;
        selectable?: boolean;
        href?: string;
        className?: string;
        count?: number;
    } = $props();

    const displayCount = new Tween(count ?? 0, { duration: 700 });
    onMount(() => {
        if (!count) return;
        displayCount.set(0, { duration: 0 });
        displayCount.set(count);
    });

    const countNumber = $derived(Math.round(displayCount.current));
</script>

<a {href}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
        class="card relative flex min-h-24 h-fit flex-row items-center gap-4 {className} {onClick
            ? 'cursor-pointer'
            : ''}"
        role={onClick ? "button" : undefined}
        tabindex={onClick ? 0 : undefined}
        onclick={onClick}
        onkeydown={(event) => {
            if (!onClick) return;
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
            }
        }}
    >
        {#if onRemove}
            <button
                type="button"
                onclick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemove();
                }}
                class="absolute top-2 right-2 cursor-pointer"
                aria-label={`Видалити профіль ${profile.title}`}>X</button
            >
        {/if}
        <div class="flex min-w-0 flex-1 flex-col">
            <h4>{profile.title}</h4>
            <p class="whitespace-pre-wrap">{profile.description}</p>
        </div>
        {#if count !== undefined}
            <span class="shrink-0 text-6xl! leading-none! font-bold! text-(--card-accent)">{countNumber}</span>
        {/if}
    </div>
</a>
