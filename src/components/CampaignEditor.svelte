<script lang="ts">
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    import type { campaigns, forms, profiles } from "@db/schema";
    import ProfileDisplay from "./ProfileDisplay.svelte";
    import ProfileEditor from "./ProfileEditor.svelte";

    type Profile = typeof profiles.$inferSelect;
    type Form = typeof forms.$inferSelect;
    type Campaign = typeof campaigns.$inferSelect & { profiles: Profile[] };

    const { loadedCampaign, availableProfiles, availableForms }: {
        loadedCampaign: Campaign | undefined;
        availableProfiles: Profile[];
        availableForms: Form[];
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
    });
    let loading = $state(false);
    let errorMessage = $state("");
    let saved = $state(false);
    let savedSnapshot = $state("");
    let editingProfileId = $state<number | "new" | null>(null);
    let editingProfile = $derived(
        typeof editingProfileId === "number"
            ? campaign.profiles.find(({ id }) => id === editingProfileId)
            : undefined,
    );
    const currentSnapshot = () => JSON.stringify({
        title: campaign.title,
        beginsAt: campaign.beginsAt,
        endsAt: campaign.endsAt,
        profiles: campaign.profiles.map(({ id }) => id),
    });
    let profilesToAdd = $derived(
        availableProfiles.filter((profile) => !campaign.profiles.some(({ id }) => id === profile.id)),
    );

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

    function addProfile(event: Event) {
        if (!(event.currentTarget instanceof HTMLSelectElement)) return;

        const select = event.currentTarget;
        const selectedId = select.value;
        if (selectedId === "__new__") {
            select.value = "";
            openNewProfile();
            return;
        }
        const profile = profilesToAdd.find(({ id }) => String(id) === selectedId);
        if (!profile) return;

        campaign.profiles = [...campaign.profiles, profile];
        select.value = "";
        saved = false;
        errorMessage = "";
    }

    function openNewProfile() {
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
        editingProfileId = null;
    }

    function handleProfileSaved(updated: Profile) {
        const exists = campaign.profiles.some(({ id }) => id === updated.id);
        campaign.profiles = exists
            ? campaign.profiles.map((profile) =>
                profile.id === updated.id ? { ...profile, ...updated } : profile,
            )
            : [...campaign.profiles, updated];
        closeProfileEditor();
    }

    function handleProfileDeleted(profileId: number) {
        campaign.profiles = campaign.profiles.filter(({ id }) => id !== profileId);
        closeProfileEditor();
    }

    async function saveCampaign() {
        if (loading) return;

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
            });

            if (result.error) {
                errorMessage = result.error.message;
            } else {
                campaign.id = result.data.campaignId;
                saved = true;
                savedSnapshot = currentSnapshot();
                if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("campaign", String(campaign.id));
                    window.history.replaceState(null, "", url);
                }
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося зберегти кампанію";
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
    <input placeholder="Назва кампанії" bind:value={campaign.title}>
    <div class="flex flex-row w-full gap-5">
        <label class="w-full">
            Починається
            <input class="w-full" type="date" bind:value={campaign.beginsAt}>
        </label>
        <label class="w-full">
            Закінчується
            <input class="w-full" type="date" bind:value={campaign.endsAt}>
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

    <label class="flex flex-col gap-2">
        Додати профіль
        <select
            class="w-full"
            onchange={addProfile}
        >
            <option value="">Оберіть профіль</option>
            <option value="__new__">+ Створити новий профіль</option>
            {#each profilesToAdd as profile (profile.id)}
                <option value={profile.id}>{profile.title}</option>
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
            disabled={loading || !campaign.title.trim()}
            onclick={saveCampaign}
        >
            {loading ? "Збереження..." : "Зберегти"}
        </button>
        {#if campaign.id > 0}
            <button
                type="button"
                class="btn-default{loading ? 'opacity-50' : ''}"
                disabled={loading}
                onclick={deleteCampaign}
            >
                <span class="text-diia-red ">
                    Видалити кампанію
                </span>
            </button>
        {/if}
    </div>

    {#if editingProfileId !== null}
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5"
            role="presentation"
            onclick={closeProfileEditor}
        >
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="card flex w-full max-w-2xl flex-col gap-5 bg-white"
                role="dialog"
                aria-modal="true"
                onclick={(event) => event.stopPropagation()}
            >
                <div class="flex flex-row items-center justify-between">
                    <h3>{editingProfile ? "Редагувати профіль" : "Новий профіль"}</h3>
                    <button
                        type="button"
                        class="cursor-pointer"
                        aria-label="Закрити"
                        onclick={closeProfileEditor}
                    >X</button>
                </div>
                {#key editingProfileId}
                    <ProfileEditor
                        loadedProfile={editingProfile}
                        {availableForms}
                        standalone={false}
                        onSaved={handleProfileSaved}
                        onDeleted={handleProfileDeleted}
                    />
                {/key}
            </div>
        </div>
    {/if}

</div>
