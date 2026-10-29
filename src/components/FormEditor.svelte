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
        title: "Нова Форма",
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
        const preventLeavingWithUnsavedChanges = (event: BeforeUnloadEvent) => {
            if (currentSnapshot() !== savedSnapshot) {
                event.preventDefault();
                event.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", preventLeavingWithUnsavedChanges);
        return () => window.removeEventListener("beforeunload", preventLeavingWithUnsavedChanges);
    });

    let result = $state<
        { data: { formId: number }; error?: undefined } | { data?: undefined; error: { message: string } } | null
    >(null);
    let loading = $state(false);

    function addNewField() {
        if (loading) return;
        form.schema.push({
            slug: "new-field",
            title: "Нове поле",
            type: "text",
            regex: "",
            max: 32,
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
        if (!isDirty()) return true;
        return (await saveForm(false, ownerProfileId ?? profileId)) !== undefined;
    }

    export function isDirty(): boolean {
        return currentSnapshot() !== savedSnapshot;
    }
</script>

<input class="w-full mb-2.5" placeholder="Назва форми" bind:value={form.title} />
<textarea class="w-full" placeholder="Опис" bind:value={form.description}></textarea>
{#if result && !result.error}
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
                class="absolute top-2 right-2 cursor-pointer"
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
        class="btn-default text-diia-red {loading ? 'opacity-50' : ''}"
        onclick={deleteForm}
    >
        <span class="text-diia-red"> Видалити форму </span>
    </button>
{/if}
