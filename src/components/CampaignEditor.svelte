<script lang="ts">
    import { actions } from "astro:actions";
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

    let profilesToAdd = $derived(
        availableProfiles.filter((profile) => !campaign.profiles.some(({ id }) => id === profile.id)),
    );

    function addProfile(idx: number) {
        campaign.profiles = [...campaign.profiles, availableProfiles[idx]];
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

    <button
        type="button"
        class="btn-default"
        popovertarget="profile-select"
    >
        Додати профіль
    </button>
    <div class="w-1/2 min-h-32 border fixed m-auto p-1" id="profile-select" popover>
        <p>Оберіть профіль</p>

        <ul>
            {#each profilesToAdd as profile, idx (profile.id)}
                <li>
                    <button class="w-full cursor-pointer" onclick={()=> addProfile(idx)}>
                        <ProfileDisplay profile={profile} />
                    </button>
                </li>
            {/each}
        </ul>
    </div>
    
    {#if errorMessage}
        <p class="text-diia-red" role="alert">{errorMessage}</p>
    {/if}
    {#if saved}
        <p class="text-diia-green" role="status">Зміни збережено!</p>
    {/if}
    
    <button
        type="button"
        class="btn-default {loading ? 'opacity-50' : ''}"
        disabled={loading || !campaign.title.trim()}
        onclick={saveCampaign}
    >
        {loading ? "Збереження..." : "Зберегти"}
    </button>
</div>
