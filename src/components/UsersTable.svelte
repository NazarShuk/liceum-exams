<script lang="ts">
    import { actions } from "astro:actions";
    import type { users } from "@db/schema";
    import { parseDbDate } from "@lib/dates";

    type User = typeof users.$inferSelect;
    type UserWithParent = User & { parent: User | null };

    const {
        users: allUsers,
        currentUserId,
    }: {
        users: UserWithParent[];
        currentUserId: number;
    } = $props();

    const roles = [
        { value: "applicant", label: "Абітурієнт" },
        { value: "parent", label: "Опікун" },
        { value: "teacher", label: "Викладач" },
        { value: "admin", label: "Адміністратор" },
    ] as const;

    const columns = [
        { key: "id", title: "ID" },
        { key: "name", title: "Користувач" },
        { key: "parent", title: "Опікун" },
        { key: "role", title: "Роль" },
        { key: "phone", title: "Телефон" },
        { key: "birthDate", title: "Дата народження" },
        { key: "createdAt", title: "Створено" },
        { key: "externalId", title: "Google підключено"}
    ] as const;

    let userRecords = $state<UserWithParent[]>([...allUsers]);
    let filters = $state<Record<string, string>>({});
    let savingUserId = $state<number | null>(null);
    let error = $state("");

    function fullName(user: User): string {
        return [user.firstName, user.lastName, user.middleName].filter(Boolean).join(" ");
    }

    function roleLabel(role: User["role"]): string {
        return roles.find((item) => item.value === role)?.label ?? role;
    }

    function cellValue(user: UserWithParent, key: (typeof columns)[number]["key"]): unknown {
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
                return user.externalId ? "Так" : "Ні";
        }
    }

    function formatCellValue(value: unknown): string {
        if (value == null) return "";
        if (value instanceof Date) return value.toLocaleDateString("uk-UA");
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
            return parseDbDate(value).toLocaleDateString("uk-UA");
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
                error = result.error.message;
                select.value = user.role;
                return;
            }
            userRecords = userRecords.map((record) => (record.id === user.id ? { ...record, role } : record));
        } catch (e) {
            error = e instanceof Error ? e.message : "Не вдалося змінити роль";
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
                                    <option value="">Усі</option>
                                    {#each roles as role (role.value)}
                                        <option value={role.value}>{role.label}</option>
                                    {/each}
                                </select>
                            {:else}
                                <input
                                    class="mt-auto w-full"
                                    bind:value={filters[column.key]}
                                    placeholder="Фільтр..."
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
                                    title={user.id === currentUserId ? "Не можна змінити власну роль" : "Змінити роль"}
                                >
                                    {#each roles as role (role.value)}
                                        <option value={role.value} selected={user.role === role.value}>
                                            {role.label}
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
    <p class="mt-5">Користувачів не знайдено.</p>
{/if}
