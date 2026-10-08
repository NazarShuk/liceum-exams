<script lang="ts">
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    import type { campaigns, profiles } from "@db/schema";
    import ProfileDisplay from "./ProfileDisplay.svelte";

    type Profile = typeof profiles.$inferSelect;
    type Campaign = typeof campaigns.$inferSelect & { profiles: Profile[] };

    const { loadedCampaign, availableProfiles }: {
        loadedCampaign: Campaign | undefined;
        availableProfiles: Profile[];
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
        const profile = profilesToAdd.find(({ id }) => String(id) === selectedId);
        if (!profile) return;

        campaign.profiles = [...campaign.profiles, profile];
        select.value = "";
        saved = false;
        errorMessage = "";
    }

    function removeProfile(idx: number) {
        campaign.profiles = campaign.profiles.filter((profile, i) => i !== idx);
        saved = false;
        errorMessage = "";
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
                <ProfileDisplay onRemove={()=> removeProfile(idx)} {profile} />
            </li>
        {/each}
    </ul>

    <label class="flex flex-col gap-2">
        Додати профіль
        <select
            class="w-full"
            onchange={addProfile}
            disabled={profilesToAdd.length === 0}
        >
            <option value="">Оберіть профіль</option>
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

</div>
