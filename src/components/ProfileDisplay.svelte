<script lang="ts">
    import type { profiles } from "@db/schema"
    type Profile = typeof profiles.$inferSelect

    const {
        profile,
        onRemove,
        selectable = false,
        href,
        className
    }: {
        profile: Profile;
        onRemove?: () => void;
        selectable?: boolean;
        href?: string;
        className?: string;
    } = $props()
</script>

<a href={href}>
    <div class="card relative flex min-h-24 h-fit flex-col {className}">
        {#if onRemove}
            <button
                type="button"
                onclick={onRemove}
                class="absolute top-2 right-2 cursor-pointer"
                aria-label={`Видалити профіль ${profile.title}`}
            >X</button>
        {/if}
        <h4>{profile.title}</h4>
        <p>{profile.description}</p>
    </div>
</a>
