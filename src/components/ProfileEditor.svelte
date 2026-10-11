<script lang="ts">
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    import type { forms as formsType, profiles } from "@db/schema";
  import ProfileDisplay from "./ProfileDisplay.svelte";
  import FormEditor from "./FormEditor.svelte";

    type Profile = typeof profiles.$inferSelect;
    type Form = typeof formsType.$inferSelect;

    const { loadedProfile, availableForms, onSaved, onDeleted, standalone = true }: {
        loadedProfile: Profile | undefined;
        availableForms: Form[];
        onSaved?: (profile: Profile) => void;
        onDeleted?: (profileId: number) => void;
        standalone?: boolean;
    } = $props();

    // svelte-ignore state_referenced_locally
    let forms = $state<Form[]>([...availableForms]);
    let editingFormId = $state<number | "new" | null>(null);
    let editingForm = $derived(
        typeof editingFormId === "number" ? forms.find(({ id }) => id === editingFormId) : undefined,
    );

    let profile = $state({
        // svelte-ignore state_referenced_locally
        id: loadedProfile?.id ?? -1,
        // svelte-ignore state_referenced_locally
        title: loadedProfile?.title ?? "",
        // svelte-ignore state_referenced_locally
        description: loadedProfile?.description ?? "",
        // svelte-ignore state_referenced_locally
        formId: loadedProfile?.formId ?? null,
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
            openFormEditor("new");
            return;
        }
        profile.formId = select.value === "" ? null : Number(select.value);
    }
    let loading = $state(false);
    let errorMessage = $state("");
    let saved = $state(false);
    let savedSnapshot = $state("");
    const currentSnapshot = () => JSON.stringify({
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

    function openFormEditor(formId: number | "new") {
        editingFormId = formId;
    }

    function closeFormEditor() {
        editingFormId = null;
    }

    function handleFormSaved(updated: Form) {
        const exists = forms.some(({ id }) => id === updated.id);
        forms = exists
            ? forms.map((form) => (form.id === updated.id ? updated : form))
            : [...forms, updated];
        profile.formId = updated.id;
        closeFormEditor();
    }

    function handleFormDeleted(formId: number) {
        forms = forms.filter((form) => form.id !== formId);
        if (profile.formId === formId) profile.formId = null;
        closeFormEditor();
    }

    async function saveProfile() {
        if (loading) return;

        loading = true;
        errorMessage = "";
        saved = false;

        try {
            const result = await actions.submitProfileEdit({
                profileId: profile.id > 0 ? profile.id : undefined,
                title: profile.title,
                description: profile.description,
                formId: profile.formId,
            });

            if (result.error) {
                errorMessage = result.error.message;
            } else {
                profile.id = result.data.profileId;
                saved = true;
                savedSnapshot = currentSnapshot();
                onSaved?.({
                    id: profile.id,
                    title: profile.title,
                    description: profile.description,
                    formId: profile.formId,
                });
                if (standalone && typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("profile", String(profile.id));
                    window.history.replaceState(null, "", url);
                }
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Не вдалося зберегти профіль";
        } finally {
            loading = false;
        }
    }

    async function deleteProfile() {
        if (loading || profile.id <= 0) return;
        if (!window.confirm("Видалити профіль?")) return;

        loading = true;
        errorMessage = "";
        try {
            const result = await actions.deleteProfile({ profileId: profile.id });
            if (result.error) {
                errorMessage = result.error.message;
            } else if (standalone) {
                window.location.assign("/admin/profiles");
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

<div class="flex flex-col gap-5">
    <input class="w-full" placeholder="Назва профілю" bind:value={profile.title}>
    <textarea class="w-full" placeholder="Опис" bind:value={profile.description}></textarea>

    <label class="flex flex-col gap-2">
        Форма для профілю
        <select
            class="w-full"
            bind:this={formSelect}
            onchange={handleFormSelect}
        >
            <option value={null}>Без форми</option>
            {#each forms as form (form.id)}
                <option value={form.id}>
                    {form.title}
                </option>
            {/each}
            <option value={-1}>+ Створити нову форму</option>
        </select>
    </label>

    <div class="flex flex-row gap-5">
        <button
            type="button"
            class="btn-default {loading ? 'opacity-50' : ''}"
            disabled={loading || profile.formId == null}
            onclick={() => {
                if (profile.formId != null) openFormEditor(profile.formId);
            }}
        >
            Редагувати форму
        </button>
    </div>

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
            onclick={saveProfile}
        >
            {loading ? "Збереження..." : "Зберегти"}
        </button>
        {#if profile.id > 0}
            <button
                type="button"
                class="btn-default text-diia-red {loading ? 'opacity-50' : ''}"
                disabled={loading}
                onclick={deleteProfile}
            >
                <span class="text-diia-red ">
                    Видалити профіль
                </span>
            </button>
        {/if}
    </div>
    <ProfileDisplay profile={profile} />

    {#if editingFormId !== null}
        <div
            class="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-5"
            role="presentation"
            onclick={closeFormEditor}
        >
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="card flex w-full max-w-2xl flex-col gap-5 bg-white"
                role="dialog"
                aria-modal="true"
                onclick={(event) => event.stopPropagation()}
            >
                <div class="flex flex-row items-center justify-between">
                    <h3>{editingForm ? "Редагувати форму" : "Нова форма"}</h3>
                    <button
                        type="button"
                        class="cursor-pointer"
                        aria-label="Закрити"
                        onclick={closeFormEditor}
                    >X</button>
                </div>
                {#key editingFormId}
                    <FormEditor
                        loadedForm={editingForm}
                        standalone={false}
                        onSaved={handleFormSaved}
                        onDeleted={handleFormDeleted}
                    />
                {/key}
            </div>
        </div>
    {/if}
</div>
