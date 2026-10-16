<script lang="ts">
    import type {
        applications as applicationsType,
        campaigns as campaignsType,
        forms,
        profiles,
        users,
    } from "@db/schema";

    type User = typeof users.$inferSelect;
    type Form = typeof forms.$inferSelect;
    type Profile = typeof profiles.$inferSelect;
    type Campaign = typeof campaignsType.$inferSelect;
    type Application = typeof applicationsType.$inferSelect & {
        student: User | null;
        user: User | null;
    };

    type ProfileWithForm = Profile & { form: Form | null };
    type CampaignWithProfiles = Campaign & { profiles: ProfileWithForm[] };

    const { applications: allApplications, campaigns }: {
        applications: Application[];
        campaigns: CampaignWithProfiles[];
    } = $props();

    let selectedCampaignId = $state<number | null>(campaigns[0]?.id ?? null);
    let selectedProfileId = $state<number | null>(campaigns[0]?.profiles[0]?.id ?? null);

    const selectedCampaign = $derived(
        campaigns.find((campaign) => campaign.id === selectedCampaignId),
    );
    const selectedProfile = $derived(
        selectedCampaign?.profiles.find((profile) => profile.id === selectedProfileId),
    );
    const form = $derived(selectedProfile?.form ?? null);
    const applications = $derived(
        allApplications.filter(
            (application) => application.profileId === selectedProfileId,
        ),
    );

    function fullName(user: User | null): string {
        if (!user) return "";
        return [user.firstName, user.lastName, user.middleName].filter(Boolean).join(" ");
    }

    function handleCampaignChange(event: Event) {
        filters = {};
        const campaignId = Number((event.currentTarget as HTMLSelectElement).value);
        selectedCampaignId = campaignId;
        const campaign = campaigns.find((campaign) => campaign.id === campaignId);
        selectedProfileId = campaign?.profiles[0]?.id ?? null;
    }

    function handleProfileChange() {
        filters = {};
    }

    let filters = $state<{[key:string]: string}>({})
    let filteredApplications = $derived(
      applications.filter((application) => {
        for (const field in filters) {
          const filterValue = filters[field]
          if (!filterValue) continue

          const answer = application.answers[field]
          if (answer == null) return false

          if (!answer.toString().toLowerCase().includes(filterValue.toLowerCase())) {
            return false
          }
        }
        return true
      })
    )
</script>

<select onchange={handleCampaignChange} bind:value={selectedCampaignId} class="mb-5">
    {#each campaigns as campaign (campaign.id)}
        <option value={campaign.id}>
            {campaign.title}
        </option>
    {/each}
</select>
{#if selectedCampaign}
    {#if selectedCampaign.profiles.length > 0}
        <select onchange={handleProfileChange} bind:value={selectedProfileId} class="mb-5">
            {#each selectedCampaign.profiles as profile (profile.id)}
                <option value={profile.id}>
                    {profile.title}
                </option>
            {/each}
        </select>
    {/if}
    {#if selectedCampaign.profiles.length === 0}
        <p>До кампанії ще не додано профілів.</p>
    {:else if !form}
        <p>Для цього профілю не призначено форму.</p>
    {:else if applications.length > 0}
        <div class="overflow-x-auto">
            <table class="table-fixed" style="width: {(form.schema.length + 2) * 12}rem; min-width: 100%">
                <thead class="bg-diia-bright-grey">
                    <tr>
                        <th class="px-4 py-5">Учень</th>
                        <th class="px-4 py-5">Опікун</th>
                        {#each form.schema as field (field.slug)}
                            <th class="px-4 py-5">
                            	{field.title}
                             	<input class="w-full" bind:value={filters[field.slug]} placeholder="Фільтр..." />
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each filteredApplications as application (application.id)}
                        <tr>
                            <td class="px-4 py-5 border-2 border-diia-bright-grey">
                                {fullName(application.student)}
                            </td>
                            <td class="px-4 py-5 border-2 border-diia-bright-grey">
                                {fullName(application.user)}
                            </td>
                            {#each form.schema as field (field.slug)}
                                <td class="px-4 py-5 border-2 border-diia-bright-grey">
                                	{(() => {
                                		const answer = application.answers[field.slug]
                                		if (Array.isArray(answer)) return answer.join(", ")
                                		return String(answer ?? "")
                                	})()}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <p>Поданих заяв поки що немає.</p>
    {/if}
{:else}
    <p>Кампаній ще немає.</p>
{/if}
