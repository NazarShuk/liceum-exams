<script lang="ts">
    import type {campaigns, profiles} from "@db/schema"
    import ProfileDisplay from "./ProfileDisplay.svelte";
  import { onMount } from "svelte";
    type Campaign = typeof campaigns.$inferSelect & {profiles: typeof profiles.$inferSelect[]}

    const {loadedCampaign} : {loadedCampaign : Campaign|undefined} = $props()
    let campaign : Campaign = $state({
        id: -1,
        title: "",
        beginsAt: null,
        endsAt: null,
        profiles: []
    })
    onMount(()=>{
        if(loadedCampaign){
            campaign = loadedCampaign
            console.log(loadedCampaign)
        }
    })
</script>

<div class="flex flex-col gap-5">
    <input placeholder="Назва кампанії" bind:value={campaign.title}>
    <div class="flex flex-row w-full gap-5">
        <label class="w-full">
            Починається
            <input type="date" bind:value={campaign.beginsAt}>
        </label>
        <label class="w-full">
            Закінчується
            <input type="date" bind:value={campaign.endsAt}>
        </label>
    </div>
    <h3>Профілі</h3>
    <ul>
        {#each campaign?.profiles as profile (profile.id)}
            <li>
                <ProfileDisplay profile={profile} />
            </li>
        {/each}

        <li class="mt-5 flex flex-row justify-center gap-5">
            <button class="btn-default">Додати профіль</button>
            <button class="btn-default">Створити профіль</button>
        </li>
    </ul>
    <p>{JSON.stringify(campaign)}</p>
    <button class="btn-default">Зберегти</button>
</div>
