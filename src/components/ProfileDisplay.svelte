<script lang="ts">
    import type { profiles } from "@db/schema"
    type Profile = typeof profiles.$inferSelect

    const {
        profile,
        onRemove,
        selectable = false,
        href,
    }: {
        profile: Profile;
        onRemove?: () => void;
        selectable?: boolean;
        href?: string;
    } = $props()
</script>

{#if selectable}
    <a
        href={href}
        class="flex w-full cursor-pointer flex-col items-center justify-center border p-4 text-center"
    >
        <p>{profile.title}</p>
        <p>{profile.description}</p>
    </a>
{:else}
    <div class="flex flex-col h-24 border items-center justify-center relative">
        {#if onRemove}
            <button
                type="button"
                onclick={onRemove}
                class="absolute top-2 right-2 cursor-pointer"
                aria-label={`Видалити профіль ${profile.title}`}
            >X</button>
        {/if}
        <p>{profile.title}</p>
        <p>{profile.description}</p>
    </div>
{/if}