<script lang="ts">
    import { actions } from "astro:actions";
    import type { groups, users } from "@db/schema";

    type User = typeof users.$inferSelect;
    type Group = typeof groups.$inferSelect;

    const {
        group,
        teachers,
        applications,
    }: {
        group: Group & { teachers: User[]; applications: { id: number }[] };
        teachers: User[];
        applications: { id: number; student: User | null; user: User | null; profile: { title: string } | null }[];
    } = $props();

    let title = $state(group.title);
    let selectedTeacherIds = $state<number[]>(group.teachers.map((teacher) => teacher.id));
    let selectedApplicationIds = $state<number[]>(group.applications.map((application) => application.id));
    let saving = $state(false);
    let deleting = $state(false);
    let error = $state("");

    function fullName(user: User | null): string {
        if (!user) return "";
        return [user.firstName, user.lastName, user.middleName].filter(Boolean).join(" ");
    }

    function applicationLabel(application: {
        student: User | null;
        user: User | null;
        profile: { title: string } | null;
    }) {
        const name = fullName(application.student) || fullName(application.user) || "Заява";
        return application.profile ? `${name} — ${application.profile.title}` : name;
    }

    function toggleTeacher(id: number) {
        selectedTeacherIds = selectedTeacherIds.includes(id)
            ? selectedTeacherIds.filter((teacherId) => teacherId !== id)
            : [...selectedTeacherIds, id];
    }

    function toggleApplication(id: number) {
        selectedApplicationIds = selectedApplicationIds.includes(id)
            ? selectedApplicationIds.filter((applicationId) => applicationId !== id)
            : [...selectedApplicationIds, id];
    }

    async function save() {
        if (saving || !title.trim() || selectedApplicationIds.length === 0) return;

        saving = true;
        error = "";
        try {
            const result = await actions.submitGroupEdit({
                groupId: group.id,
                title: title.trim(),
                teacherIds: selectedTeacherIds,
                applicationIds: selectedApplicationIds,
            });
            if (result.error) {
                error = result.error.message;
                return;
            }
            window.location.reload();
        } catch (e) {
            error = e instanceof Error ? e.message : "Не вдалося зберегти групу";
        } finally {
            saving = false;
        }
    }

    async function remove() {
        if (deleting || !window.confirm("Видалити цю групу?")) return;

        deleting = true;
        error = "";
        try {
            const result = await actions.deleteGroup({ groupId: group.id });
            if (result.error) {
                error = result.error.message;
                return;
            }
            window.location.assign("/admin/groups");
        } catch (e) {
            error = e instanceof Error ? e.message : "Не вдалося видалити групу";
        } finally {
            deleting = false;
        }
    }
</script>

<div class="card mb-5 flex flex-col gap-3">
    <h4>Редагувати групу</h4>
    <label class="flex flex-col gap-1">
        Назва групи
        <input bind:value={title} placeholder="10-А" />
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
    {#if error}
        <p class="text-diia-red" role="alert">{error}</p>
    {/if}
    <div class="flex flex-row items-center gap-3">
        <button
            type="button"
            class="btn-default"
            disabled={saving || !title.trim() || selectedApplicationIds.length === 0}
            onclick={save}
        >
            {saving ? "Збереження..." : "Зберегти"}
        </button>
        <button
            type="button"
            class="cursor-pointer text-diia-red disabled:cursor-not-allowed disabled:opacity-50"
            disabled={deleting}
            onclick={remove}
        >
            {deleting ? "Видалення..." : "Видалити групу"}
        </button>
    </div>
</div>
