<script lang="ts">
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    import type { forms as formsType, profiles } from "@db/schema";
    import FormEditor from "./FormEditor.svelte";

    type Profile = typeof profiles.$inferSelect;
    type Form = typeof formsType.$inferSelect;

    const {
        loadedProfile,
        availableForms,
        campaignId,
        onSaved,
        onDeleted,
        onFormSaved,
        onFormDeleted,
    }: {
        loadedProfile: Profile | undefined;
        availableForms: Form[];
        campaignId?: number;
        onSaved?: (profile: Profile) => void;
        onDeleted?: (profileId: number) => void;
        onFormSaved?: (form: Form) => void;
        onFormDeleted?: (formId: number) => void;
    } = $props();

    // svelte-ignore state_referenced_locally
    let forms = $state<Form[]>([...availableForms]);
    // A form id that is not in the list points at a deleted form; treat it as "no form" instead of a blank editor.
    // svelte-ignore state_referenced_locally
    const initialFormId =
        loadedProfile?.formId && availableForms.some(({ id }) => id === loadedProfile.formId)
            ? loadedProfile.formId
            : null;
    // svelte-ignore state_referenced_locally
    let editingFormId = $state<number | "new" | null>(initialFormId);
    let editingForm = $derived(
        typeof editingFormId === "number" ? forms.find(({ id }) => id === editingFormId) : undefined,
    );
    let formEditor = $state<
        { save: (ownerProfileId?: number) => Promise<boolean>; isDirty: () => boolean } | undefined
    >();

    let profile = $state({
        // svelte-ignore state_referenced_locally
        id: loadedProfile?.id ?? -1,
        // svelte-ignore state_referenced_locally
        title: loadedProfile?.title ?? "",
        // svelte-ignore state_referenced_locally
        description: loadedProfile?.description ?? "",
        // svelte-ignore state_referenced_locally
        formId: initialFormId,
    });

    let formSelect = $state<HTMLSelectElement | undefined>();

    function syncFormSelect() {
        if (!formSelect) return;
        formSelect.value = profile.formId == null ? "" : String(profile.formId);
    }

    $effect(() => {
        // resync whenever the selected form or the option list changes
        profile.formId;
        forms.length;
        syncFormSelect();
    });

    function handleFormSelect(event: Event) {
        if (!(event.currentTarget instanceof HTMLSelectElement)) return;
        const select = event.currentTarget;
        if (select.value === "-1") {
            syncFormSelect();
            editingFormId = "new";
            return;
        }
        profile.formId = select.value === "" ? null : Number(select.value);
        editingFormId = profile.formId;
    }
    let loading = $state(false);
    let errorMessage = $state("");
    let saved = $state(false);
    let savedSnapshot = $state("");
    const currentSnapshot = () =>
        JSON.stringify({
            title: profile.title,
            description: profile.description,
            formId: profile.formId,
        });

    savedSnapshot = currentSnapshot();

    onMount(() => {
        const preventLeavingWithUnsavedChanges = (event: BeforeUnloadEvent) => {
            if (currentSnapshot() !== savedSnapshot) {
                event.preventDefault();
                event.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", preventLeavingWithUnsavedChanges);
        return () => window.removeEventListener("beforeunload", preventLeavingWithUnsavedChanges);
    });

    function handleFormSaved(updated: Form) {
        const exists = forms.some(({ id }) => id === updated.id);
        forms = exists ? forms.map((form) => (form.id === updated.id ? updated : form)) : [...forms, updated];
        profile.formId = updated.id;
        editingFormId = updated.id;
        onFormSaved?.(updated);
        // The action links the form to this profile too, so keep the profile snapshot in sync.
        savedSnapshot = JSON.stringify({ ...JSON.parse(savedSnapshot), formId: updated.id });
    }

    function handleFormDeleted(formId: number) {
        forms = forms.filter((form) => form.id !== formId);
        if (profile.formId === formId) profile.formId = null;
        editingFormId = null;
        onFormDeleted?.(formId);
        // The action already unlinks the form, so the deleted id must not keep the profile marked dirty.
        savedSnapshot = JSON.stringify({ ...JSON.parse(savedSnapshot), formId: null });
    }

    async function persistProfile(notify = true): Promise<boolean> {
        try {
            const result = await actions.submitProfileEdit({
                profileId: profile.id > 0 ? profile.id : undefined,
                campaignId,
                title: profile.title,
                description: profile.description,
                formId: profile.formId,
            });

            if (result.error) {
                errorMessage = result.error.message;
                return false;
            }

            profile.id = result.data.profileId;
            // The server may drop a form that no longer exists; keep the select in sync.
            profile.formId = result.data.formId;
            if (notify) {
                onSaved?.({
                    id: profile.id,
                    title: profile.title,
                    description: profile.description,
                    formId: profile.formId,
                });
            }
            return true;
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося зберегти профіль";
            return false;
        }
    }

    async function saveAll() {
        if (loading) return;

        loading = true;
        errorMessage = "";
        saved = false;

        try {
            const editor = editingFormId !== null ? formEditor : undefined;

            // A new profile must exist before its new form can be linked to it.
            if (profile.id <= 0 && editor) {
                if (!(await persistProfile(false))) return;
            }

            if (editor && !(await editor.save(profile.id > 0 ? profile.id : undefined))) return;

            if (!(await persistProfile(true))) return;

            saved = true;
            savedSnapshot = currentSnapshot();
        } finally {
            loading = false;
        }
    }

    export function hasUnsavedChanges(): boolean {
        return currentSnapshot() !== savedSnapshot || (editingFormId !== null && !!formEditor?.isDirty());
    }

    async function deleteProfile() {
        if (loading || profile.id <= 0) return;
        if (!window.confirm("Видалити профіль? Це можливо лише якщо за ним немає поданих заяв.")) return;

        loading = true;
        errorMessage = "";
        try {
            const result = await actions.deleteProfile({ profileId: profile.id });
            if (result.error) {
                errorMessage = result.error.message;
            } else {
                onDeleted?.(profile.id);
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося видалити профіль";
        } finally {
            loading = false;
        }
    }
</script>

<div class="grid gap-6 lg:grid-cols-5 lg:items-start">
    <div class="flex flex-col gap-5 lg:col-span-2">
        <input class="w-full" placeholder="Назва профілю" bind:value={profile.title} />
        <textarea class="w-full" placeholder="Опис" bind:value={profile.description}></textarea>

        <label class="flex flex-col gap-2">
            Форма для профілю
            <select class="w-full" bind:this={formSelect} onchange={handleFormSelect}>
                <option value="">Без форми</option>
                {#each forms as form (form.id)}
                    <option value={form.id}>
                        {form.title}
                    </option>
                {/each}
                <option value={-1}>+ Створити нову форму</option>
            </select>
        </label>

        {#if errorMessage}
            <p class="text-diia-red" role="alert">{errorMessage}</p>
        {/if}
        {#if saved}
            <p class="text-diia-green" role="status">Зміни збережено!</p>
        {/if}

        <div class="flex flex-row gap-5">
            <button
                type="button"
                class="btn-default {loading ? 'opacity-50' : ''}"
                disabled={loading || !profile.title.trim()}
                onclick={saveAll}
            >
                {loading ? "Збереження..." : "Зберегти"}
            </button>
            {#if profile.id > 0}
                <button
                    type="button"
                    class="btn-default bg-diia-red! {loading ? 'opacity-50' : ''}"
                    disabled={loading}
                    onclick={deleteProfile}
                >
                    Видалити профіль
                </button>
            {/if}
        </div>
    </div>

    {#if editingFormId !== null}
        <section class="card flex flex-col gap-5 bg-white lg:col-span-3">
            <h3>{editingForm ? "Форма профілю" : "Нова форма"}</h3>
            {#key editingFormId}
                <FormEditor
                    bind:this={formEditor}
                    loadedForm={editingForm}
                    profileId={profile.id > 0 ? profile.id : undefined}
                    onSaved={handleFormSaved}
                    onDeleted={handleFormDeleted}
                />
            {/key}
        </section>
    {:else}
        <section class="card flex flex-col items-start gap-5 bg-white lg:col-span-3">
            <h3>Форма профілю</h3>
            <p class="opacity-75">Для цього профілю ще не обрано форму.</p>
            <button type="button" class="btn-default" onclick={() => (editingFormId = "new")}> Створити форму </button>
        </section>
    {/if}
</div>
