<script lang="ts">
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    import type { campaigns, forms as formsType, profiles } from "@db/schema";
    import ProfileDisplay from "./ProfileDisplay.svelte";
    import ProfileEditor from "./ProfileEditor.svelte";

    type Profile = typeof profiles.$inferSelect;
    type Form = typeof formsType.$inferSelect;
    type Campaign = typeof campaigns.$inferSelect & { profiles: Profile[] };

    const {
        loadedCampaign,
        availableForms,
        initialProfileId,
    }: {
        loadedCampaign: Campaign | undefined;
        availableForms: Form[];
        initialProfileId?: number;
    } = $props();

    function dateInputValue(date: Date | null): string {
        return date ? new Date(date).toISOString().slice(0, 10) : "";
    }

    let campaign = $state({
        // svelte-ignore state_referenced_locally
        id: loadedCampaign?.id ?? -1,
        // svelte-ignore state_referenced_locally
        title: loadedCampaign?.title ?? "",
        // svelte-ignore state_referenced_locally
        beginsAt: dateInputValue(loadedCampaign?.beginsAt ?? null),
        // svelte-ignore state_referenced_locally
        endsAt: dateInputValue(loadedCampaign?.endsAt ?? null),
        // svelte-ignore state_referenced_locally
        profiles: loadedCampaign?.profiles ?? [],
        // svelte-ignore state_referenced_locally
        allowMultipleProfiles: loadedCampaign?.allowMultipleProfiles,
    });
    let loading = $state(false);
    let errorMessage = $state("");
    let saved = $state(false);
    let savedSnapshot = $state("");
    // svelte-ignore state_referenced_locally
    let forms = $state<Form[]>([...availableForms]);
    let editingProfileId = $state<number | "new" | null>(
        // svelte-ignore state_referenced_locally
        initialProfileId && campaign.profiles.some(({ id }) => id === initialProfileId) ? initialProfileId : null,
    );
    let editingProfile = $derived(
        typeof editingProfileId === "number" ? campaign.profiles.find(({ id }) => id === editingProfileId) : undefined,
    );
    let profileEditor = $state<{ hasUnsavedChanges: () => boolean } | undefined>();
    const currentSnapshot = () =>
        JSON.stringify({
            title: campaign.title,
            beginsAt: campaign.beginsAt,
            endsAt: campaign.endsAt,
            profiles: campaign.profiles.map(({ id }) => id),
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

    async function openNewProfile() {
        if (campaign.id <= 0) {
            if (!campaign.title.trim()) {
                errorMessage = "Спочатку введіть назву кампанії";
                return;
            }
            if (!(await saveCampaign())) return;
        }
        editingProfileId = "new";
    }

    function removeProfile(idx: number) {
        campaign.profiles = campaign.profiles.filter((profile, i) => i !== idx);
        saved = false;
        errorMessage = "";
    }

    function openProfileEditor(profileId: number) {
        editingProfileId = profileId;
    }

    function closeProfileEditor() {
        if (profileEditor?.hasUnsavedChanges() && !window.confirm("Є незбережені зміни. Закрити без збереження?"))
            return;
        editingProfileId = null;
    }

    function handleProfileSaved(updated: Profile) {
        const exists = campaign.profiles.some(({ id }) => id === updated.id);
        campaign.profiles = exists
            ? campaign.profiles.map((profile) => (profile.id === updated.id ? { ...profile, ...updated } : profile))
            : [...campaign.profiles, updated];
        if (!exists) {
            saved = false;
            errorMessage = "";
        }
        editingProfileId = null;
    }

    function handleProfileDeleted(profileId: number) {
        campaign.profiles = campaign.profiles.filter(({ id }) => id !== profileId);
        saved = false;
        errorMessage = "";
        editingProfileId = null;
    }

    // Forms created inside the modal must survive reopening the profile.
    function handleFormSaved(updated: Form) {
        forms = forms.some(({ id }) => id === updated.id)
            ? forms.map((form) => (form.id === updated.id ? updated : form))
            : [...forms, updated];
    }

    function handleFormDeleted(formId: number) {
        forms = forms.filter((form) => form.id !== formId);
    }

    async function saveCampaign() {
        if (loading) return false;

        loading = true;
        errorMessage = "";
        saved = false;

        try {
            const result = await actions.submitCampaignEdit({
                campaignId: campaign.id > 0 ? campaign.id : undefined,
                title: campaign.title,
                beginsAt: campaign.beginsAt,
                endsAt: campaign.endsAt,
                profileIds: campaign.profiles.map(({ id }) => id),
                allowMultipleProfiles: campaign.allowMultipleProfiles || false,
            });

            if (result.error) {
                errorMessage = result.error.message;
                return false;
            }

            campaign.id = result.data.campaignId;
            saved = true;
            savedSnapshot = currentSnapshot();
            if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.set("campaign", String(campaign.id));
                window.history.replaceState(null, "", url);
            }
            return true;
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося зберегти кампанію";
            return false;
        } finally {
            loading = false;
        }
    }

    async function deleteCampaign() {
        if (loading || campaign.id <= 0) return;
        if (!window.confirm("Видалити кампанію?")) return;

        loading = true;
        errorMessage = "";
        try {
            const result = await actions.deleteCampaign({ campaignId: campaign.id });
            if (result.error) {
                errorMessage = result.error.message;
            } else {
                window.location.assign("/admin/campaigns");
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося видалити кампанію";
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex flex-col gap-5">
    <input placeholder="Назва кампанії" bind:value={campaign.title} />
    <div class="flex flex-row w-full gap-5">
        <label class="w-full">
            Починається
            <input class="w-full" type="date" bind:value={campaign.beginsAt} />
        </label>
        <label class="w-full">
            Закінчується
            <input class="w-full" type="date" bind:value={campaign.endsAt} />
        </label>
    </div>

    <h3>Профілі</h3>
    <ul class="flex flex-col gap-3">
        {#each campaign.profiles as profile, idx (profile.id)}
            <li>
                <ProfileDisplay
                    onRemove={() => removeProfile(idx)}
                    onClick={() => openProfileEditor(profile.id)}
                    {profile}
                />
            </li>
        {/each}
    </ul>
    <button
        type="button"
        class="border-dashed border-2 border-diia-grey py-7 px-6 flex flex-row justify-center items-center gap-1 rounded cursor-pointer"
        onclick={openNewProfile}
    >
        <span class="material-symbols-outlined"> add_circle </span>
        <h4>Створити новий профіль</h4>
    </button>

    <label class="flex flex-row items-center gap-1">
        <input type="checkbox" bind:checked={campaign.allowMultipleProfiles} />
        Дозволити подачу заяв на декілька профілів
    </label>

    <p class="text-diia-red {errorMessage ? 'opacity-100' : 'opacity-0 select-none'}" role="alert">{errorMessage}</p>
    <p class="text-diia-green {saved ? 'opacity-100' : 'opacity-0 select-none'}" role="status">Зміни збережено!</p>

    <div class="flex flex-row gap-5">
        <button
            type="button"
            class="btn-default {loading ? 'opacity-50' : ''}"
            disabled={loading || !campaign.title.trim()}
            onclick={saveCampaign}
        >
            {loading ? "Збереження..." : "Зберегти"}
        </button>
        {#if campaign.id > 0}
            <button
                type="button"
                class="btn-default{loading ? 'opacity-50' : ''} bg-diia-red!"
                disabled={loading}
                onclick={deleteCampaign}
            >
                Видалити кампанію
            </button>
        {/if}
    </div>

    {#if editingProfileId !== null}
        <div
            class="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-2 sm:p-4"
            role="presentation"
            onclick={closeProfileEditor}
        >
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="flex h-[calc(100svh-1rem)] w-full max-w-[95%] flex-col overflow-hidden rounded border-2 border-liceum-blue bg-white sm:h-[calc(100svh-2rem)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-editor-title"
                onclick={(event) => event.stopPropagation()}
                tabindex={0}
            >
                <header
                    class="flex shrink-0 flex-row items-center justify-between gap-5 border-b border-diia-bright-grey px-4 py-3 sm:px-6"
                >
                    <h3 id="profile-editor-title">
                        {editingProfile ? "Редагувати профіль" : "Новий профіль"}
                    </h3>
                    <button type="button" class="cursor-pointer" aria-label="Закрити" onclick={closeProfileEditor}
                        >X</button
                    >
                </header>
                <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    {#key editingProfileId}
                        <ProfileEditor
                            bind:this={profileEditor}
                            loadedProfile={editingProfile}
                            availableForms={forms}
                            campaignId={campaign.id > 0 ? campaign.id : undefined}
                            onSaved={handleProfileSaved}
                            onDeleted={handleProfileDeleted}
                            onFormSaved={handleFormSaved}
                            onFormDeleted={handleFormDeleted}
                        />
                    {/key}
                </div>
            </div>
        </div>
    {/if}
</div>
