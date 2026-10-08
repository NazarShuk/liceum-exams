<script lang="ts">
    import type {profiles} from "@db/schema"
    type Profile = typeof profiles.$inferSelect

    const {profile, onRemove} : {profile: Profile, onRemove?: () => void} = $props()
</script>

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