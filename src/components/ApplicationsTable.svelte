<script lang="ts">
    import { actions } from "astro:actions";
    import type {
        applications as applicationsType,
        campaigns as campaignsType,
        forms,
        profiles,
        users,
    } from "@db/schema";
    import { onMount } from "svelte";
    import { APPLICATION_STATUSES, statusClass, statusLabel } from "@lib/status";
    import { compareCellValues, formatCellValue } from "@lib/table";

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

    const {
        applications: allApplications,
        campaigns,
        teachers = [],
        groups = [],
        allowDelete = true,
        allowGroupCreate = false,
        allowGroupRemove = false,
        allowStatusEdit = false,
        allProfiles = false,
        groupId = null,
        fillHeight = false,
    }: {
        applications: Application[];
        campaigns: CampaignWithProfiles[];
        teachers?: User[];
        groups?: { id: number; title: string }[];
        allowDelete?: boolean;
        allowGroupCreate?: boolean;
        allowGroupRemove?: boolean;
        allowStatusEdit?: boolean;
        allProfiles?: boolean;
        groupId?: number | null;
        fillHeight?: boolean;
    } = $props();

    // svelte-ignore state_referenced_locally
    let applicationRecords = $state<Application[]>([...allApplications]);
    // svelte-ignore state_referenced_locally
    let selectedCampaignId = $state<number | null>(campaigns[0]?.id ?? null);
    // svelte-ignore state_referenced_locally
    let selectedProfileId = $state<number | null>(campaigns[0]?.profiles[0]?.id ?? null);
    let selectedApplicationIds = $state<number[]>([]);
    let deleting = $state(false);
    let deleteError = $state("");
    // svelte-ignore state_referenced_locally
    let groupOptions = $state<{ id: number; title: string }[]>([...groups]);
    // svelte-ignore state_referenced_locally
    let preferredGroupId = $state<number | "new">(groups[0]?.id ?? "new");
    let groupPanelOpen = $state(false);
    let groupApplicationIds = $state<number[]>([]);
    let targetGroupId = $state<number | "new">("new");
    let groupTitle = $state("");
    let selectedTeacherIds = $state<number[]>([]);
    let creatingGroup = $state(false);
    let groupError = $state("");
    let groupMessage = $state("");
    let removingGroupApplications = $state(false);
    let statusApplication = $state<Application | null>(null);
    let statusValue = $state<(typeof APPLICATION_STATUSES)[number]>("pending");
    let notesValue = $state("");
    let savingStatus = $state(false);
    let statusError = $state("");

    const selectedCampaign = $derived(campaigns.find((campaign) => campaign.id === selectedCampaignId));
    const selectedProfile = $derived(selectedCampaign?.profiles.find((profile) => profile.id === selectedProfileId));
    const form = $derived(selectedProfile?.form ?? null);
    const applications = $derived(
        allProfiles
            ? applicationRecords
            : applicationRecords.filter((application) => application.profileId === selectedProfileId),
    );
    const answerColumns = $derived(
        allProfiles
            ? (() => {
                  const columns = new Map<string, { key: string; title: string; type: string }>();
                  const profiles = campaigns.flatMap((campaign) => campaign.profiles);
                  for (const application of applications) {
                      const profile = profiles.find((profile) => profile.id === application.profileId);
                      for (const field of profile?.form?.schema ?? []) {
                          const key = `answer:${field.slug}`;
                          if (!columns.has(key)) columns.set(key, { key, title: field.title, type: field.type });
                      }
                  }
                  return [...columns.values()];
              })()
            : (form?.schema.map((field) => ({
                  key: `answer:${field.slug}`,
                  title: field.title,
                  type: field.type,
              })) ?? []),
    );
    const keyedColumns = $derived([
        { key: "status", title: "Статус", type: "status" },
        { key: "notes", title: "Нотатки", type: "text" },
        { key: "student.name", title: "Учень", type: "text" },
        { key: "student.birthDate", title: "Дата народження учня", type: "date" },
        { key: "student.phone", title: "Телефон учня", type: "text" },
        { key: "user.name", title: "Опікун", type: "text" },
        { key: "user.birthDate", title: "Дата народження опікуна", type: "date" },
        { key: "user.phone", title: "Телефон опікуна", type: "text" },
        ...answerColumns,
    ]);
    const columns = $derived(keyedColumns.filter((column) => !hiddenColumns.includes(column.key)));

    function fullName(user: User | null): string {
        if (!user) return "";
        return [user.firstName, user.lastName, user.middleName].filter(Boolean).join(" ");
    }

    function cellValue(application: Application, key: string): unknown {
        switch (key) {
            case "status":
                return statusLabel(application.status, !!application.notes);
            case "notes":
                return application.notes;
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
                return key.startsWith("answer:") ? application.answers[key.slice("answer:".length)] : "";
        }
    }

    function csvCell(value: unknown): string {
        let text = formatCellValue(value);
        if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replaceAll('"', '""')}"`;
    }

    function exportApplicationsToCsv() {
        const rows = [
            columns.map((column) => column.title),
            ...sortedApplications.map((application) =>
                columns.map((column) => {
                    const value = cellValue(application, column.key);
                    if (column.type === "file") {
                        const key = getFileKey(value);
                        return key
                            ? new URL(`/file?key=${encodeURIComponent(key)}`, window.location.origin).toString()
                            : "";
                    }
                    return value;
                }),
            ),
        ];
        const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = allProfiles
            ? "applications-group.csv"
            : `applications-${selectedCampaignId}-${selectedProfileId}.csv`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function handleCampaignChange(event: Event) {
        filters = {};
        sortKey = null;
        selectedApplicationIds = [];
        const campaignId = Number((event.currentTarget as HTMLSelectElement).value);
        selectedCampaignId = campaignId;
        const campaign = campaigns.find((campaign) => campaign.id === campaignId);
        selectedProfileId = campaign?.profiles[0]?.id ?? null;
    }

    function handleProfileChange() {
        filters = {};
        sortKey = null;
        hiddenColumns = [];
        selectedApplicationIds = [];
    }

    function toggleColumn(key: string) {
        hiddenColumns = hiddenColumns.includes(key)
            ? hiddenColumns.filter((hiddenKey) => hiddenKey !== key)
            : [...hiddenColumns, key];
        if (hiddenColumns.includes(key) && sortKey === key) sortKey = null;
    }

    let filters = $state<{ [key: string]: string }>({});
    let filteredApplications = $derived(
        applications.filter((application) => {
            for (const column of columns) {
                const filterValue = filters[column.key];
                if (!filterValue) continue;

                const value = formatCellValue(cellValue(application, column.key));
                if (!value.toLowerCase().includes(filterValue.toLowerCase())) {
                    return false;
                }
            }
            return true;
        }),
    );

    let sortKey = $state<string | null>(null);
    let sortDirection = $state<"asc" | "desc">("asc");
    const sortedApplications = $derived.by(() => {
        const key = sortKey;
        if (!key) return filteredApplications;
        const direction = sortDirection === "asc" ? 1 : -1;
        return [...filteredApplications].sort((a, b) => {
            const aValue = cellValue(a, key);
            const bValue = cellValue(b, key);
            const aEmpty = formatCellValue(aValue) === "";
            const bEmpty = formatCellValue(bValue) === "";
            if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
            return direction * compareCellValues(aValue, bValue);
        });
    });

    function toggleSort(key: string) {
        if (sortKey === key) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortKey = key;
            sortDirection = "asc";
        }
    }

    const allVisibleSelected = $derived(
        filteredApplications.length > 0 &&
            filteredApplications.every((application) => selectedApplicationIds.includes(application.id)),
    );

    function toggleApplication(id: number) {
        selectedApplicationIds = selectedApplicationIds.includes(id)
            ? selectedApplicationIds.filter((selectedId) => selectedId !== id)
            : [...selectedApplicationIds, id];
    }

    function toggleVisibleApplications() {
        const visibleIds = filteredApplications.map((application) => application.id);
        selectedApplicationIds = allVisibleSelected
            ? selectedApplicationIds.filter((id) => !visibleIds.includes(id))
            : [...new Set([...selectedApplicationIds, ...visibleIds])];
    }

    function getFileKey(value: unknown): string | null {
        if (typeof value !== "object" || value === null || !("key" in value)) return null;
        return typeof value.key === "string" && value.key.trim() ? value.key : null;
    }

    function openStatusPanel(application: Application) {
        statusApplication = application;
        statusValue = APPLICATION_STATUSES.find((status) => status === application.status) ?? "pending";
        notesValue = application.notes;
        statusError = "";
    }

    async function saveStatus() {
        if (!statusApplication || savingStatus) return;
        const applicationId = statusApplication.id;
        const status = statusValue;
        if (!status) return;

        savingStatus = true;
        statusError = "";
        try {
            const result = await actions.updateApplication({
                applicationId,
                status,
                notes: notesValue,
            });
            if (result.error || !result.data) {
                statusError = result.error?.message ?? "Не вдалося зберегти статус";
                return;
            }
            const updated = result.data;

            applicationRecords = applicationRecords.map((application) =>
                application.id === applicationId
                    ? { ...application, status: updated.status, notes: updated.notes }
                    : application,
            );
            statusApplication = null;
        } catch (error) {
            statusError = error instanceof Error ? error.message : "Не вдалося зберегти статус";
        } finally {
            savingStatus = false;
        }
    }

    async function deleteApplications(applicationIds: number[]) {
        if (deleting || applicationIds.length === 0) return;
        const message =
            applicationIds.length === 1 ? "Видалити цю заяву?" : `Видалити вибрані заяви (${applicationIds.length})?`;
        if (!window.confirm(message)) return;

        deleting = true;
        deleteError = "";
        try {
            const result = await actions.deleteApplications({ applicationIds });
            if (result.error) {
                deleteError = result.error.message;
                return;
            }

            const deletedIds = new Set(applicationIds);
            applicationRecords = applicationRecords.filter((application) => !deletedIds.has(application.id));
            selectedApplicationIds = selectedApplicationIds.filter((id) => !deletedIds.has(id));
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Не вдалося видалити заяви";
        } finally {
            deleting = false;
        }
    }

    function deleteSelectedApplications() {
        return deleteApplications(selectedApplicationIds);
    }

    function openGroupPanel(applicationIds: number[], existingGroupId: number | "new" = preferredGroupId) {
        groupApplicationIds = applicationIds;
        targetGroupId = existingGroupId;
        groupError = "";
        groupMessage = "";
        groupPanelOpen = true;
    }

    function toggleTeacher(id: number) {
        selectedTeacherIds = selectedTeacherIds.includes(id)
            ? selectedTeacherIds.filter((teacherId) => teacherId !== id)
            : [...selectedTeacherIds, id];
    }

    async function submitGroupPanel() {
        if (creatingGroup || groupApplicationIds.length === 0) return;
        if (targetGroupId === "new" && !groupTitle.trim()) return;

        creatingGroup = true;
        groupError = "";
        groupMessage = "";
        try {
            if (targetGroupId === "new") {
                const title = groupTitle.trim();
                const result = await actions.createGroup({
                    title,
                    applicationIds: groupApplicationIds,
                    teacherIds: selectedTeacherIds,
                });
                if (result.error) {
                    groupError = result.error.message;
                    return;
                }

                const createdGroupId = result.data?.groupId;
                if (createdGroupId) {
                    groupOptions = [...groupOptions, { id: createdGroupId, title }];
                    preferredGroupId = createdGroupId;
                    targetGroupId = createdGroupId;
                }
                groupMessage = "Групу створено.";
                window.location.pathname = "/admin/groups/" + createdGroupId;
            } else {
                const result = await actions.addApplicationsToGroup({
                    groupId: targetGroupId,
                    applicationIds: groupApplicationIds,
                });
                if (result.error) {
                    groupError = result.error.message;
                    return;
                }

                preferredGroupId = targetGroupId;
                groupMessage = "Заяви додано до групи.";
            }

            groupTitle = "";
            selectedTeacherIds = [];
            groupApplicationIds = [];
        } catch (error) {
            groupError = error instanceof Error ? error.message : "Не вдалося зберегти групу";
        } finally {
            creatingGroup = false;
        }
    }

    async function removeApplicationsFromGroup(applicationIds: number[]) {
        if (!groupId || applicationIds.length === 0 || removingGroupApplications) return;
        const message =
            applicationIds.length === 1
                ? "Прибрати цю заяву з групи?"
                : `Прибрати вибрані заяви з групи (${applicationIds.length})?`;
        if (!window.confirm(message)) return;

        removingGroupApplications = true;
        deleteError = "";
        try {
            const result = await actions.removeApplicationsFromGroup({
                groupId,
                applicationIds,
            });
            if (result.error) {
                deleteError = result.error.message;
                return;
            }

            window.location.reload();
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Не вдалося прибрати заяви з групи";
        } finally {
            removingGroupApplications = false;
        }
    }

    let hiddenColumns = $state<string[]>([]);

    onMount(() => {
        if (allProfiles) return;
        const url = new URL(location.toString());
        if (url.searchParams.has("campaign")) {
            const campaignId = Number(url.searchParams.get("campaign"));
            const foundCampaign = campaigns.find((campaign) => campaign.id === campaignId);
            if (foundCampaign) {
                selectedCampaignId = campaignId;
                selectedProfileId = foundCampaign.profiles[0].id;
            }
        }
    });
</script>

<div class={`flex min-h-0 flex-col ${fillHeight ? "flex-1" : ""}`}>
    {#if !allProfiles}
        <div class="flex shrink-0 flex-row gap-5">
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
    {/if}

    {#if allProfiles || selectedCampaign}
        {#if !allProfiles && selectedCampaign!.profiles.length === 0}
            <p>До кампанії ще не додано профілів.</p>
        {:else if !allProfiles && !form}
            <p>Для цього профілю не призначено форму.</p>
        {:else if allProfiles && applications.length === 0}
            <p>У групі ще немає заяв.</p>
        {:else}
            <div class={`relative ${fillHeight ? "flex min-h-0 flex-1 flex-col" : ""}`}>
                <details class="absolute right-2 top-2 z-20">
                    <summary
                        aria-label="Налаштувати видимість колонок"
                        class="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-diia-grey hover:bg-diia-bright-grey hover:text-black"
                    >
                        <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
                    </summary>
                    <div
                        class="absolute right-0 z-10 mt-2 max-h-80 min-w-64 overflow-y-auto rounded border border-diia-bright-grey bg-white p-3 shadow-lg"
                    >
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
                <div class={fillHeight ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto"}>
                    <table class="table-fixed" style="width: {(columns.length + 1) * 12}rem; min-width: 100%">
                        <thead class="bg-diia-bright-grey">
                            <tr>
                                <th class="sticky top-0 z-10 bg-diia-bright-grey px-4 py-5">
                                    <div class="flex min-h-24 items-center gap-2">
                                        {#if allowDelete || allowGroupRemove}
                                            <input
                                                type="checkbox"
                                                aria-label="Вибрати всі видимі заяви"
                                                checked={allVisibleSelected}
                                                onchange={toggleVisibleApplications}
                                            />
                                        {/if}
                                        <span>Дії</span>
                                    </div>

                                    <div class="flex flex-row w-full justify-between">
                                        {#if allowDelete}
                                            <button
                                                type="button"
                                                disabled={deleting || selectedApplicationIds.length === 0}
                                                onclick={deleteSelectedApplications}
                                                class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                aria-label="Видалити"
                                                title="Видалити"
                                            >
                                                <span class="material-symbols-outlined"> delete </span>
                                            </button>
                                        {/if}

                                        {#if allowGroupRemove}
                                            <button
                                                type="button"
                                                disabled={removingGroupApplications ||
                                                    selectedApplicationIds.length === 0}
                                                onclick={() => removeApplicationsFromGroup(selectedApplicationIds)}
                                                class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                aria-label="Прибрати з групи"
                                                title="Прибрати з групи"
                                            >
                                                <span class="material-symbols-outlined"> group_remove </span>
                                            </button>
                                        {/if}

                                        {#if allowGroupCreate}
                                            <button
                                                type="button"
                                                disabled={selectedApplicationIds.length === 0}
                                                onclick={() => openGroupPanel(selectedApplicationIds, "new")}
                                                class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                aria-label="Створити групу"
                                                title="Створити групу"
                                            >
                                                <span class="material-symbols-outlined"> group_add </span>
                                            </button>
                                        {/if}

                                        <button
                                            type="button"
                                            class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                            aria-label="Експортувати CSV"
                                            title="Експортувати CSV"
                                            disabled={filteredApplications.length === 0 || columns.length === 0}
                                            onclick={exportApplicationsToCsv}
                                        >
                                            <span class="material-symbols-outlined"> export_notes </span>
                                        </button>
                                    </div>
                                    {#if deleteError}
                                        <p class="text-diia-red" role="alert">{deleteError}</p>
                                    {/if}
                                </th>
                                {#each columns as column (column.key)}
                                    <th
                                        class="sticky top-0 z-10 bg-diia-bright-grey px-4 py-5"
                                        aria-sort={sortKey === column.key
                                            ? sortDirection === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : "none"}
                                    >
                                        <div class="flex min-h-24 flex-col justify-between relative">
                                            <button
                                                type="button"
                                                class="flex cursor-pointer items-center gap-1 text-left"
                                                onclick={() => toggleSort(column.key)}
                                            >
                                                {column.title}
                                                {#if sortKey === column.key}
                                                    <span
                                                        class="material-symbols-outlined text-[18px]"
                                                        aria-hidden="true"
                                                    >
                                                        {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
                                                    </span>
                                                {/if}
                                            </button>
                                            <input
                                                class="mt-auto w-full"
                                                bind:value={filters[column.key]}
                                                placeholder="Фільтр..."
                                            />
                                        </div>
                                    </th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each sortedApplications as application (application.id)}
                                <tr>
                                    <td class="border-2 border-diia-bright-grey px-4 py-5">
                                        <div class="flex items-center gap-2">
                                            {#if allowDelete || allowGroupRemove}
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Вибрати заяву ${application.id}`}
                                                    checked={selectedApplicationIds.includes(application.id)}
                                                    onchange={() => toggleApplication(application.id)}
                                                />
                                            {/if}
                                            {#if allowDelete}
                                                <button
                                                    type="button"
                                                    disabled={deleting}
                                                    onclick={() => deleteApplications([application.id])}
                                                    class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                    aria-label="Видалити заяву"
                                                    title="Видалити"
                                                >
                                                    <span class="material-symbols-outlined"> delete </span>
                                                </button>
                                            {/if}
                                            {#if allowStatusEdit}
                                                <button
                                                    type="button"
                                                    onclick={() => openStatusPanel(application)}
                                                    class="cursor-pointer"
                                                    aria-label="Змінити статус і нотатки"
                                                    title="Статус і нотатки"
                                                >
                                                    <span class="material-symbols-outlined"> edit_note </span>
                                                </button>
                                            {/if}
                                            {#if allowGroupCreate}
                                                <button
                                                    type="button"
                                                    onclick={() => openGroupPanel([application.id])}
                                                    class="cursor-pointer"
                                                    aria-label="Додати до групи"
                                                    title="Додати до групи"
                                                >
                                                    <span class="material-symbols-outlined"> group_add </span>
                                                </button>
                                            {/if}
                                            {#if allowGroupRemove && groupId}
                                                <button
                                                    type="button"
                                                    disabled={removingGroupApplications}
                                                    onclick={() => removeApplicationsFromGroup([application.id])}
                                                    class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                    aria-label="Прибрати з групи"
                                                    title="Прибрати з групи"
                                                >
                                                    <span class="material-symbols-outlined"> group_remove </span>
                                                </button>
                                            {/if}
                                        </div>
                                    </td>
                                    {#each columns as column (column.key)}
                                        <td class="px-4 py-5 border-2 border-diia-bright-grey">
                                            {#if column.type === "status"}
                                                <span
                                                    class={`inline-block rounded-full px-3 py-0.5 text-sm ${statusClass(application.status)}`}
                                                >
                                                    {statusLabel(application.status, !!application.notes)}
                                                </span>
                                            {:else if column.type === "file"}
                                                {@const key = getFileKey(cellValue(application, column.key))}
                                                {#if key}
                                                    <a target="_blank" href="/file?key={encodeURIComponent(key)}"
                                                        >Переглянути файл</a
                                                    >
                                                {/if}
                                            {:else if cellValue(application, column.key)}
                                                <span
                                                    class={column.key === "notes" ? "whitespace-pre-wrap" : undefined}
                                                >
                                                    {formatCellValue(cellValue(application, column.key))}
                                                </span>
                                            {/if}
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
</div>

{#if statusApplication}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-5"
        role="presentation"
        onclick={(event) => {
            if (event.target === event.currentTarget) statusApplication = null;
        }}
    >
        <div
            class="card flex w-full max-w-lg flex-col gap-3 bg-white"
            role="dialog"
            aria-modal="true"
            aria-label="Статус і нотатки"
        >
            <h4>Статус і нотатки</h4>
            <p class="text-sm opacity-75">{fullName(statusApplication.student) || "Заява"}</p>
            <label class="flex flex-col gap-1">
                Статус
                <select bind:value={statusValue}>
                    {#each APPLICATION_STATUSES as option (option)}
                        <option value={option}>{statusLabel(option)}</option>
                    {/each}
                </select>
            </label>
            <label class="flex flex-col gap-1">
                Нотатки
                <textarea
                    bind:value={notesValue}
                    rows="5"
                    maxlength="5000"
                    placeholder="Нотатки бачать заявник та адміністратори"></textarea>
            </label>
            {#if statusError}
                <p class="text-diia-red" role="alert">{statusError}</p>
            {/if}
            <div class="flex flex-row justify-end gap-3">
                <button type="button" class="cursor-pointer" onclick={() => (statusApplication = null)}>Закрити</button>
                <button
                    type="button"
                    class="btn-default"
                    disabled={savingStatus || !statusValue.trim()}
                    onclick={saveStatus}
                >
                    {savingStatus ? "Збереження..." : "Зберегти"}
                </button>
            </div>
        </div>
    </div>
{/if}

{#if allowGroupCreate && groupPanelOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-5"
        role="presentation"
        onclick={(event) => {
            if (event.target === event.currentTarget) groupPanelOpen = false;
        }}
    >
        <div
            class="card flex w-full max-w-md flex-col gap-3 bg-white"
            role="dialog"
            aria-modal="true"
            aria-label="Додати до групи"
        >
            <h4>Додати до групи</h4>
            <p class="text-sm opacity-75">Вибрано заяв: {groupApplicationIds.length}</p>
            {#if groupOptions.length > 0}
                <label class="flex flex-col gap-1">
                    Група
                    <select bind:value={targetGroupId}>
                        <option value="new">Нова група</option>
                        {#each groupOptions as group (group.id)}
                            <option value={group.id}>{group.title}</option>
                        {/each}
                    </select>
                </label>
            {/if}
            {#if targetGroupId === "new"}
                <label class="flex flex-col gap-1">
                    Назва групи
                    <input bind:value={groupTitle} placeholder="10-А" />
                </label>
                <fieldset class="flex flex-col gap-1">
                    <legend>Викладачі</legend>
                    {#each teachers as teacher (teacher.id)}
                        <label class="flex min-h-10 cursor-pointer items-center gap-2 py-1">
                            <input
                                type="checkbox"
                                checked={selectedTeacherIds.includes(teacher.id)}
                                onchange={() => toggleTeacher(teacher.id)}
                            />
                            <span>{fullName(teacher)}</span>
                        </label>
                    {:else}
                        <p class="text-sm opacity-75">Немає викладачів.</p>
                    {/each}
                </fieldset>
            {/if}
            {#if groupError}
                <p class="text-diia-red" role="alert">{groupError}</p>
            {/if}
            {#if groupMessage}
                <p class="text-liceum-green" role="status">
                    {groupMessage} <a href="/admin/groups" class="text-liceum-blue! cursor-pointer">До груп</a>
                </p>
            {/if}
            <div class="flex flex-row justify-end gap-3">
                <button type="button" class="cursor-pointer" onclick={() => (groupPanelOpen = false)}>Закрити</button>
                <button
                    type="button"
                    class="btn-default"
                    disabled={creatingGroup ||
                        groupApplicationIds.length === 0 ||
                        (targetGroupId === "new" && !groupTitle.trim())}
                    onclick={submitGroupPanel}
                >
                    {creatingGroup ? "Збереження..." : targetGroupId === "new" ? "Створити" : "Додати"}
                </button>
            </div>
        </div>
    </div>
{/if}
