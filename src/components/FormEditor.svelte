<script lang="ts">
    import { forms } from "@db/schema";
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    type Form = typeof forms.$inferSelect;

    const {
        loadedForm,
        profileId,
        onSaved,
        onDeleted,
    }: {
        loadedForm: Form | undefined;
        profileId?: number;
        onSaved?: (form: Form) => void;
        onDeleted?: (formId: number) => void;
    } = $props();
    let form: Form = $state({
        id: 0,
        title: "",
        description: "",
        schema: [],
        createdAt: "0",
        updatedAt: "0",
    });

    let savedSnapshot = $state("");
    const currentSnapshot = () =>
        JSON.stringify({
            title: form.title,
            description: form.description,
            schema: form.schema,
        });
    let deleteError = $state("");
    let mounted = false;
    let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
    let autosavePromise: Promise<unknown> | undefined;

    onMount(() => {
        if (loadedForm) {
            form = {
                ...loadedForm,
                schema: loadedForm.schema.map((field) => ({
                    ...field,
                    required: field.required !== false,
                    options: field.options ?? [],
                })),
            };
        }

        savedSnapshot = currentSnapshot();
        mounted = true;
        const preventLeavingWithUnsavedChanges = (event: BeforeUnloadEvent) => {
            if (currentSnapshot() !== savedSnapshot) {
                event.preventDefault();
                event.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", preventLeavingWithUnsavedChanges);
        return () => {
            clearTimeout(autosaveTimer);
            window.removeEventListener("beforeunload", preventLeavingWithUnsavedChanges);
        };
    });

    let result = $state<
        { data: { formId: number }; error?: undefined } | { data?: undefined; error: { message: string } } | null
    >(null);
    let loading = $state(false);

    function addNewField() {
        if (loading) return;
        form.schema.push({
            slug: "",
            title: "",
            type: "text",
            regex: "",
            max: 64,
            min: 0,
            required: true,
            options: [],
        });
    }

    async function saveForm(duplicate = false, ownerProfileId = profileId) {
        if (loading) return;
        loading = true;

        for (const element of form.schema) {
            element.title = element.title.trim();
            element.slug = element.title.toLowerCase().replaceAll(" ", "-");
            if (element.options) {
                element.options = element.options.map((option) => option.trim()).filter(Boolean);
            }
        }

        try {
            result = await actions.submitFormEdit({
                title: form.title + (duplicate ? " (Копія)" : ""),
                description: form.description || "",
                schema: form.schema,
                formId: duplicate ? undefined : form.id > 0 ? form.id : undefined,
                profileId: ownerProfileId,
            });

            if (result.error) return undefined;

            const savedId = result.data.formId;

            if (duplicate) {
                onSaved?.({ ...form, id: savedId, title: form.title + " (Копія)" });
                return savedId;
            }

            form.id = savedId;
            savedSnapshot = currentSnapshot();
            onSaved?.({ ...form });
            return savedId;
        } catch (error) {
            result = { error: { message: error instanceof Error ? error.message : "Не вдалося зберегти форму" } };
        } finally {
            loading = false;
        }
    }

    function scheduleAutosave() {
        clearTimeout(autosaveTimer);
        if (!mounted || loading || !isDirty()) return;
        if (!form.title.trim() || form.schema.length === 0) return;
        // shortcut: a new form inside a brand-new profile needs the profile saved first
        if (form.id <= 0 && profileId == null) return;
        autosaveTimer = setTimeout(() => {
            autosavePromise = saveForm(false, profileId);
        }, 1000);
    }

    $effect(() => {
        // Track every editable value, then save once the user pauses.
        currentSnapshot();
        scheduleAutosave();
    });

    async function deleteForm() {
        if (loading || form.id <= 0) return;
        if (!window.confirm("Видалити форму? Це можливо лише якщо за нею немає поданих заяв.")) return;

        loading = true;
        deleteError = "";
        try {
            const deletion = await actions.deleteForm({ formId: form.id });
            if (deletion.error) {
                deleteError = deletion.error.message;
            } else {
                onDeleted?.(form.id);
            }
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Не вдалося видалити форму";
        } finally {
            loading = false;
        }
    }

    async function duplicateForm() {
        if (loading) return;
        const originalId = await saveForm();
        if (originalId === undefined) return;
        await saveForm(true);
    }

    export async function save(ownerProfileId?: number): Promise<boolean> {
        clearTimeout(autosaveTimer);
        // A manual save can arrive while an autosave is in flight.
        if (loading) await autosavePromise;
        if (!isDirty()) return true;
        return (await saveForm(false, ownerProfileId ?? profileId)) !== undefined;
    }

    export function isDirty(): boolean {
        return currentSnapshot() !== savedSnapshot;
    }
</script>

<input class="w-full mb-2.5" placeholder="Назва форми" bind:value={form.title} />
<textarea class="w-full" placeholder="Опис" bind:value={form.description}></textarea>
{#if loading}
    <p class="opacity-75">Збереження...</p>
{:else if result && !result.error}
    <p class="text-diia-green">Форму збережено!</p>
{/if}
{#if result?.error}
    <p class="text-diia-red" role="alert">{result.error.message}</p>
{/if}
{#if deleteError}
    <p class="text-diia-red" role="alert">{deleteError}</p>
{/if}
<ul>
    {#each form.schema as field, i (i)}
        <li class="card mb-5 relative">
            <div class="w-full flex flex-row gap-5">
                <input class="w-full" placeholder={"Назва поля"} bind:value={field.title} />
                <select class="w-full" placeholder="Тип поля" bind:value={field.type}>
                    <option value="text"> Текст </option>
                    <option value="number"> Число </option>
                    <option value="date"> Дата </option>
                    <option value="file"> Файл </option>
                    <option value="select"> Вибір </option>
                    <option value="multiselect"> Множинний вибір </option>
                </select>
            </div>

            {#if field.type === "select" || field.type === "multiselect"}
                <textarea
                    class="w-full mt-2.5"
                    placeholder={"Варіанти (по одному в рядку)"}
                    value={(field.options ?? []).join("\n")}
                    oninput={(e) => (field.options = (e.currentTarget as HTMLTextAreaElement).value.split("\n"))}
                ></textarea>
            {/if}

            <div class="w-full flex flex-row gap-5 mt-10 items-end justify-between">
                <label class="flex flex-col gap-1">
                    Regex
                    <input class="w-full" placeholder="Регулярний вираз" bind:value={field.regex} />
                </label>
                <div class="flex flex-row items-center gap-5">
                    <label class="flex flex-row items-center gap-2 pb-2">
                        <input type="checkbox" bind:checked={field.required} />
                        Обов'язкове
                    </label>
                    <label class="flex flex-col gap-1 w-12">
                        Min
                        <input class="w-full" type="number" bind:value={field.min} />
                    </label>
                    <label class="flex flex-col gap-1 w-12">
                        Max
                        <input class="w-full" type="number" bind:value={field.max} />
                    </label>
                </div>
            </div>

            <button
                type="button"
                class="absolute top-2 right-2 cursor-pointer rounded-full bg-diia-red/25 text-diia-red w-8 h-8"
                onclick={() => (form.schema = form.schema.filter((value, idx) => idx !== i))}>X</button
            >
        </li>
    {/each}
</ul>

<button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={addNewField}>+ Додати поле</button
>
{#if form.id > 0}
    {#if profileId}
        <button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={duplicateForm}
            >Зробити копію</button
        >
    {/if}
    <button
        type="button"
        disabled={loading}
        class="btn-default bg-diia-red! {loading ? 'opacity-50' : ''}"
        onclick={deleteForm}
    >
        Видалити форму
    </button>
{/if}
