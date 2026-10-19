<script lang="ts">
    import type {
        applications as applicationsType,
        campaigns as campaignsType,
        forms,
        profiles,
        users,
    } from "@db/schema";
    import { onMount } from "svelte";

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
    const keyedColumns = $derived([
        { key: "student.name", title: "Учень" },
        { key: "student.birthDate", title: "Дата народження учня" },
        { key: "student.phone", title: "Телефон учня" },
        { key: "user.name", title: "Опікун" },
        { key: "user.birthDate", title: "Дата народження опікуна" },
        { key: "user.phone", title: "Телефон опікуна" },
        ...(form?.schema.map((field) => ({
            key: `answer:${field.slug}`,
            title: field.title,
        })) ?? []),
    ]);
    const columns = $derived(keyedColumns.filter(column=> !hiddenColumns.includes(column.key)))

    function fullName(user: User | null): string {
        if (!user) return "";
        return [user.firstName, user.lastName, user.middleName].filter(Boolean).join(" ");
    }

    function cellValue(application: Application, key: string): unknown {
        switch (key) {
            case "student.name":
                return fullName(application.student);
            case "student.birthDate":
                return application.student?.birthDate;
            case "student.phone":
                return application.student?.phone;
            case "user.name":
                return fullName(application.user);
            case "user.birthDate":
                return application.user?.birthDate;
            case "user.phone":
                return application.user?.phone;
            default:
                return key.startsWith("answer:")
                    ? application.answers[key.slice("answer:".length)]
                    : "";
        }
    }

    function formatCellValue(value: unknown): string {
        if (value == null) return "";
        if (value instanceof Date) return value.toLocaleDateString("uk-UA");
        if (Array.isArray(value)) return value.map(formatCellValue).join(", ");
        return String(value);
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
        hiddenColumns = [];
    }

    function toggleColumn(key: string) {
        hiddenColumns = hiddenColumns.includes(key)
            ? hiddenColumns.filter((hiddenKey) => hiddenKey !== key)
            : [...hiddenColumns, key];
    }

    let filters = $state<{[key:string]: string}>({})
    let filteredApplications = $derived(
      applications.filter((application) => {
        for (const column of columns) {
          const filterValue = filters[column.key]
          if (!filterValue) continue

          const value = formatCellValue(cellValue(application, column.key))
          if (!value.toLowerCase().includes(filterValue.toLowerCase())) {
            return false
          }
        }
        return true
      })
    )

    let hiddenColumns = $state<string[]>([])

    onMount(()=>{
    	const url = new URL(location.toString())
     	if (url.searchParams.has("campaign")){
      		const campaignId = Number(url.searchParams.get("campaign"))
        	const foundCampaign = campaigns.find((campaign) => campaign.id === campaignId)
     		if (foundCampaign){
       			selectedCampaignId = campaignId
          		selectedProfileId = foundCampaign.profiles[0].id
       		}
      	}
    })
</script>

<div class="flex flex-row gap-5">
    <label>
        Кампанія
        <select onchange={handleCampaignChange} bind:value={selectedCampaignId} class="mb-5">
            {#each campaigns as campaign (campaign.id)}
                <option value={campaign.id}>
                    {campaign.title}
                </option>
            {/each}
            </select>
    </label>


    {#if selectedCampaign && selectedCampaign.profiles.length > 0}
        <label>
            Профіль
            <select onchange={handleProfileChange} bind:value={selectedProfileId} class="mb-5">
                {#each selectedCampaign.profiles as profile (profile.id)}
                    <option value={profile.id}>
                        {profile.title}
                    </option>
                {/each}
            </select>
        </label>
    {/if}
</div>

{#if selectedCampaign}
    {#if selectedCampaign.profiles.length === 0}
        <p>До кампанії ще не додано профілів.</p>
    {:else if !form}
        <p>Для цього профілю не призначено форму.</p>
    {:else}
        <div class="relative">
            <details class="absolute right-2 top-2 z-20">
                <summary
                    aria-label="Налаштувати видимість колонок"
                    class="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-diia-grey hover:bg-diia-bright-grey hover:text-black"
                >
                    <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
                </summary>
                <div class="absolute right-0 z-10 mt-2 max-h-80 min-w-64 overflow-y-auto rounded border border-diia-bright-grey bg-white p-3 shadow-lg">
                    {#each keyedColumns as column (column.key)}
                        <label class="flex min-h-10 cursor-pointer items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                checked={!hiddenColumns.includes(column.key)}
                                onchange={() => toggleColumn(column.key)}
                            />
                            <span class="text-[16px]/[24px] font-light text-black">{column.title}</span>
                        </label>
                    {/each}
                </div>
            </details>
            <div class="overflow-x-auto">
                <table class="table-fixed" style="width: {columns.length * 12}rem; min-width: 100%">
                    <thead class="bg-diia-bright-grey">
                        <tr>
                            {#each columns as column (column.key)}
                                <th class="px-4 py-5">
                                    <div class="flex min-h-24 flex-col justify-between relative">
                                        <p>{column.title}</p>
                                        <input class="mt-auto w-full" bind:value={filters[column.key]} placeholder="Фільтр..." />
                                    </div>
                                </th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody>
                        {#each filteredApplications as application (application.id)}
                            <tr>
                                {#each columns as column (column.key)}
                                    <td class="px-4 py-5 border-2 border-diia-bright-grey">
                                        {formatCellValue(cellValue(application, column.key))}
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
{:else}
    <p>Кампаній ще немає.</p>
{/if}