<script lang="ts">
    import type { applications as applicationsType, forms, users } from "@db/schema";

    type User = typeof users.$inferSelect;
    type Form = typeof forms.$inferSelect;
    type Application = typeof applicationsType.$inferSelect & {
        student: User | null;
        user: User | null;
        form: Form | null;
    };

    const { applications: allApplications, forms: availableForms }: {
        applications: Application[];
        forms: Form[];
    } = $props();

    let selectedFormId = $state<number | null>(availableForms[0]?.id ?? null);

    const form = $derived(
        availableForms.find((availableForm) => availableForm.id === selectedFormId),
    );
    const applications = $derived(
        allApplications.filter((application) => application.formId === selectedFormId),
    );

    function fullName(user: User | null): string {
        if (!user) return "";
        return [user.firstName, user.lastName, user.middleName].filter(Boolean).join(" ");
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

<select onchange={() => (filters = {})} bind:value={selectedFormId} class="mb-5">
    {#each availableForms as availableForm (availableForm.id)}
        <option value={availableForm.id}>
            {availableForm.title}
        </option>
    {/each}
</select>
{#if form}
    {#if applications.length > 0}
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
                                	{String(application.answers[field.slug] ?? "")}
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
    <p>Форму заяви ще не створено.</p>
{/if}
