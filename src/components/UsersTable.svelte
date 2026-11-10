<script lang="ts">
    import { actions } from "astro:actions";
    import type { users } from "@db/schema";
    import { parseDbDate } from "@lib/dates";
    import { formatNumericDate } from "@i18n/dates";
    import type { Locale } from "@i18n/config";
    import { translate, translateMessage } from "@i18n/index";
    import type { MessageKey } from "@i18n/index";

    type User = typeof users.$inferSelect;
    type UserWithParent = User & { parent: User | null };

    const {
        users: allUsers,
        currentUserId,
        locale,
    }: {
        users: UserWithParent[];
        currentUserId: number;
        locale: Locale;
    } = $props();
    const t = (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params);

    const roles = [
        { value: "applicant", labelKey: "roles.applicant" },
        { value: "parent", labelKey: "roles.parent" },
        { value: "teacher", labelKey: "roles.teacher" },
        { value: "admin", labelKey: "roles.admin" },
    ] as const;

    const columnKeys = [
        { key: "id", titleKey: "usersTable.id" },
        { key: "name", titleKey: "usersTable.user" },
        { key: "parent", titleKey: "table.guardian" },
        { key: "role", titleKey: "usersTable.role" },
        { key: "phone", titleKey: "common.phone" },
        { key: "birthDate", titleKey: "common.birthDate" },
        { key: "createdAt", titleKey: "usersTable.createdAt" },
        { key: "externalId", titleKey: "usersTable.googleConnected" },
    ] as const;
    const columns = $derived(columnKeys.map((column) => ({ ...column, title: t(column.titleKey) })));

    let userRecords = $state<UserWithParent[]>([...allUsers]);
    let filters = $state<Record<string, string>>({});
    let savingUserId = $state<number | null>(null);
    let error = $state("");

    function fullName(user: User): string {
        return [user.firstName, user.lastName, user.middleName].filter(Boolean).join(" ");
    }

    function roleLabel(role: User["role"]): string {
        const item = roles.find((entry) => entry.value === role);
        return item ? t(item.labelKey) : role;
    }

    function cellValue(user: UserWithParent, key: (typeof columnKeys)[number]["key"]): unknown {
        switch (key) {
            case "id":
                return user.id;
            case "name":
                return fullName(user);
            case "parent":
                return user.parent ? `${user.parent.id}: ${fullName(user.parent)}` : "";
            case "role":
                return roleLabel(user.role);
            case "phone":
                return user.phone;
            case "birthDate":
                return user.birthDate;
            case "createdAt":
                return user.createdAt;
            case "externalId":
                return user.externalId ? t("common.yes") : t("common.no");
        }
    }

    function formatCellValue(value: unknown): string {
        if (value == null) return "";
        if (value instanceof Date) return formatNumericDate(value, locale);
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
            return formatNumericDate(parseDbDate(value), locale);
        }
        return String(value);
    }

    const filteredUsers = $derived(
        userRecords.filter((user) => {
            for (const column of columns) {
                const filterValue = filters[column.key];
                if (!filterValue) continue;

                if (column.key === "role") {
                    if (user.role !== filterValue) return false;
                    continue;
                }

                const value = formatCellValue(cellValue(user, column.key));
                if (!value.toLowerCase().includes(filterValue.toLowerCase())) return false;
            }
            return true;
        }),
    );

    async function changeRole(user: UserWithParent, event: Event) {
        const select = event.currentTarget as HTMLSelectElement;
        const role = select.value as User["role"];
        if (role === user.role) return;

        savingUserId = user.id;
        error = "";
        try {
            const result = await actions.updateUserRole({ userId: user.id, role });
            if (result.error) {
                error = translateMessage(locale, result.error.message);
                select.value = user.role;
                return;
            }
            userRecords = userRecords.map((record) => (record.id === user.id ? { ...record, role } : record));
        } catch (e) {
            error = e instanceof Error ? e.message : t("usersTable.changeRoleFailed");
            select.value = user.role;
        } finally {
            savingUserId = null;
        }
    }
</script>

{#if error}
    <p class="text-diia-red" role="alert">{error}</p>
{/if}

<div class="overflow-x-auto">
    <table class="table-fixed" style="width: {columns.length * 12}rem; min-width: 100%">
        <thead class="bg-diia-bright-grey">
            <tr>
                {#each columns as column (column.key)}
                    <th class="px-4 py-5">
                        <div class="flex min-h-24 flex-col justify-between">
                            <p>{column.title}</p>
                            {#if column.key === "role"}
                                <select bind:value={filters[column.key]}>
                                    <option value="">{t("common.all")}</option>
                                    {#each roles as role (role.value)}
                                        <option value={role.value}>{t(role.labelKey)}</option>
                                    {/each}
                                </select>
                            {:else}
                                <input
                                    class="mt-auto w-full"
                                    bind:value={filters[column.key]}
                                    placeholder={t("common.filterPlaceholder")}
                                />
                            {/if}
                        </div>
                    </th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each filteredUsers as user (user.id)}
                <tr>
                    {#each columns as column (column.key)}
                        <td class="px-4 py-5 border-2 border-diia-bright-grey">
                            {#if column.key === "role"}
                                <select
                                    disabled={user.id === currentUserId || savingUserId === user.id}
                                    onchange={(event) => changeRole(user, event)}
                                    title={user.id === currentUserId
                                        ? t("usersTable.cannotChangeOwnRole")
                                        : t("usersTable.changeRole")}
                                >
                                    {#each roles as role (role.value)}
                                        <option value={role.value} selected={user.role === role.value}>
                                            {t(role.labelKey)}
                                        </option>
                                    {/each}
                                </select>
                            {:else}
                                {formatCellValue(cellValue(user, column.key))}
                            {/if}
                        </td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>

{#if filteredUsers.length === 0}
    <p class="mt-5">{t("usersTable.notFound")}</p>
{/if}
