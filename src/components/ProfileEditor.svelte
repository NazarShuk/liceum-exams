<script lang="ts">
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    import type { forms, profiles } from "@db/schema";
  import ProfileDisplay from "./ProfileDisplay.svelte";

    type Profile = typeof profiles.$inferSelect;
    type Form = typeof forms.$inferSelect;

    const { loadedProfile, availableForms }: {
        loadedProfile: Profile | undefined;
        availableForms: Form[];
    } = $props();

    let profile = $state({
        // svelte-ignore state_referenced_locally
        id: loadedProfile?.id ?? -1,
        // svelte-ignore state_referenced_locally
        title: loadedProfile?.title ?? "",
        // svelte-ignore state_referenced_locally
        description: loadedProfile?.description ?? "",
        // svelte-ignore state_referenced_locally
        formId: loadedProfile?.formId ?? null,
    });
    let loading = $state(false);
    let errorMessage = $state("");
    let saved = $state(false);
    let savedSnapshot = $state("");
    const currentSnapshot = () => JSON.stringify({
        title: profile.title,
        description: profile.description,
        formId: profile.formId,
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

    async function saveProfile() {
        if (loading) return;

        loading = true;
        errorMessage = "";
        saved = false;

        try {
            const result = await actions.submitProfileEdit({
                profileId: profile.id > 0 ? profile.id : undefined,
                title: profile.title,
                description: profile.description,
                formId: profile.formId,
            });

            if (result.error) {
                errorMessage = result.error.message;
            } else {
                profile.id = result.data.profileId;
                saved = true;
                savedSnapshot = currentSnapshot();
                if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("profile", String(profile.id));
                    window.history.replaceState(null, "", url);
                }
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося зберегти профіль";
        } finally {
            loading = false;
        }
    }

    async function deleteProfile() {
        if (loading || profile.id <= 0) return;
        if (!window.confirm("Видалити профіль?")) return;

        loading = true;
        errorMessage = "";
        try {
            const result = await actions.deleteProfile({ profileId: profile.id });
            if (result.error) {
                errorMessage = result.error.message;
            } else {
                window.location.assign("/admin/profiles");
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося видалити профіль";
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex flex-col gap-5">
    <input class="w-full" placeholder="Назва профілю" bind:value={profile.title}>
    <textarea class="w-full" placeholder="Опис" bind:value={profile.description}></textarea>

    <label class="flex flex-col gap-2">
        Форма для профілю
        <select class="w-full" bind:value={profile.formId}>
            <option value={null}>Без форми</option>
            {#each availableForms as form (form.id)}
                <option value={form.id}>
                    {form.title} — {form.visibility === "public" ? "Опубліковано" : "Чернетка"}
                </option>
            {/each}
        </select>
    </label>

    {#if errorMessage}
        <p class="text-diia-red" role="alert">{errorMessage}</p>
    {/if}
    {#if saved}
        <p class="text-diia-green" role="status">Зміни збережено!</p>
    {/if}

    <div class="flex flex-row gap-5">
        <button
            type="button"
            class="btn-default {loading ? 'opacity-50' : ''}"
            disabled={loading || !profile.title.trim()}
            onclick={saveProfile}
        >
            {loading ? "Збереження..." : "Зберегти"}
        </button>
        {#if profile.id > 0}
            <button
                type="button"
                class="btn-default text-diia-red {loading ? 'opacity-50' : ''}"
                disabled={loading}
                onclick={deleteProfile}
            >
                <span class="text-diia-red ">
                    Видалити профіль
                </span>
            </button>
        {/if}
    </div>
    <ProfileDisplay profile={profile} />
</div>
