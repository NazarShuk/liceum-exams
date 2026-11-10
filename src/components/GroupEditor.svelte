<script lang="ts">
    import { actions } from "astro:actions";
    import type { groups, users } from "@db/schema";
    import { localizePath } from "@i18n/config";
    import type { Locale } from "@i18n/config";
    import { translate, translateMessage } from "@i18n/index";
    import type { MessageKey } from "@i18n/index";

    type User = typeof users.$inferSelect;
    type Group = typeof groups.$inferSelect;

    const {
        group,
        teachers,
        locale,
    }: {
        group: Group & { teachers: User[]; applications: { id: number }[] };
        teachers: User[];
        locale: Locale;
    } = $props();
    const t = (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params);

    let title = $state(group.title);
    let selectedTeacherIds = $state<number[]>(group.teachers.map((teacher) => teacher.id));
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
        const name =
            fullName(application.student) || fullName(application.user) || t("admin.groupEditor.groupFallback");
        return application.profile ? `${name} — ${application.profile.title}` : name;
    }

    function toggleTeacher(id: number) {
        selectedTeacherIds = selectedTeacherIds.includes(id)
            ? selectedTeacherIds.filter((teacherId) => teacherId !== id)
            : [...selectedTeacherIds, id];
    }

    async function save() {
        if (saving || !title.trim() || group.applications.length === 0) return;

        saving = true;
        error = "";
        try {
            const result = await actions.submitGroupEdit({
                groupId: group.id,
                title: title.trim(),
                teacherIds: selectedTeacherIds,
                applicationIds: group.applications.map((application) => application.id),
            });
            if (result.error) {
                error = translateMessage(locale, result.error.message);
                return;
            }
            window.location.reload();
        } catch (e) {
            error = e instanceof Error ? e.message : t("admin.groupEditor.saveFailed");
        } finally {
            saving = false;
        }
    }

    async function remove() {
        if (deleting || !window.confirm(t("admin.groupEditor.deleteConfirm"))) return;

        deleting = true;
        error = "";
        try {
            const result = await actions.deleteGroup({ groupId: group.id });
            if (result.error) {
                error = translateMessage(locale, result.error.message);
                return;
            }
            window.location.assign(localizePath(locale, "/admin/groups"));
        } catch (e) {
            error = e instanceof Error ? e.message : t("admin.groupEditor.deleteFailed");
        } finally {
            deleting = false;
        }
    }
</script>

<div class="card mb-5 flex flex-col gap-3">
    <h4>{t("admin.groupEditor.title")}</h4>
    <label class="flex flex-col gap-1">
        {t("admin.groupEditor.name")}
        <input bind:value={title} placeholder="10-А" />
    </label>
    <fieldset class="flex flex-col gap-1">
        <legend>{t("admin.groupEditor.teachers")}</legend>
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
            <p class="text-sm opacity-75">{t("admin.groupEditor.noTeachers")}</p>
        {/each}
    </fieldset>
    {#if error}
        <p class="text-diia-red" role="alert">{error}</p>
    {/if}
    <div class="flex flex-row items-center gap-3">
        <button
            type="button"
            class="btn-default"
            disabled={saving || !title.trim() || group.applications.length === 0}
            onclick={save}
        >
            {saving ? t("common.saving") : t("common.save")}
        </button>
        <button
            type="button"
            class="btn-default bg-brand-red! disabled:opacity-50"
            disabled={deleting}
            onclick={remove}
        >
            {deleting ? t("common.deleting") : t("admin.groupEditor.deleteGroup")}
        </button>
    </div>
</div>
