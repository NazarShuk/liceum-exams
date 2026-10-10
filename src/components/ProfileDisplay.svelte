<script lang="ts">
    import type { profiles } from "@db/schema"
    type Profile = typeof profiles.$inferSelect

    const {
        profile,
        onRemove,
        onClick,
        selectable = false,
        href,
        className
    }: {
        profile: Profile;
        onRemove?: () => void;
        onClick?: () => void;
        selectable?: boolean;
        href?: string;
        className?: string;
    } = $props()
</script>

<a href={href}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
        class="card relative flex min-h-24 h-fit flex-col {className} {onClick ? 'cursor-pointer' : ''}"
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
                aria-label={`Видалити профіль ${profile.title}`}
            >X</button>
        {/if}
        <h4>{profile.title}</h4>
        <p>{profile.description}</p>
    </div>
</a>
