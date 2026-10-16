<script lang="ts">
    import { forms } from "@db/schema";
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    type Form = typeof forms.$inferSelect;

    const { loadedForm, onSaved, onDeleted, standalone = true }: {
        loadedForm: Form | undefined;
        onSaved?: (form: Form) => void;
        onDeleted?: (formId: number) => void;
        standalone?: boolean;
    } = $props()
    let form : Form = $state({
        id: 0,
        title: "Нова Форма",
        description: "",
        schema: [],
        createdAt: "0",
        updatedAt: "0",
        visibility: "private"
    })

    let savedSnapshot = $state("");
    const currentSnapshot = () => JSON.stringify({
        title: form.title,
        description: form.description,
        schema: form.schema,
    });
    let deleteError = $state("");

    onMount(()=>{
        if (loadedForm){
            form = {
                ...loadedForm,
                schema: loadedForm.schema.map((field) => ({
                    ...field,
                    required: field.required !== false,
                    options: field.options ?? [],
                })),
            }
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
    })

    let result = $state<any|null>(null)
    let loading = $state(false)

    function addNewField(){
        if (loading)
            return
        console.log("hello")
        form.schema.push({
            slug: "new-field",
            title: "Нове поле",
            type: "text",
            regex: "",
            max: 32,
            min: 0,
            required: true,
            options: []
        })
    }

    async function saveForm(duplicate = false) {
        if (loading) return
        loading = true

        for (const element of form.schema) {
            element.title = element.title.trim()
            element.slug = element.title.toLowerCase().replaceAll(" ", "-")
            if (element.options) {
                element.options = element.options.map((option) => option.trim()).filter(Boolean)
            }
        }

        try {
            result = await actions.submitFormEdit({
                title: form.title + (duplicate ? " (Копія)" : ""),
                description: form.description || "",
                schema: form.schema,
                formId: duplicate ? undefined : form.id > 0 ? form.id : undefined,
            })

            if (result.error) return undefined

            const savedId = result.data.formId

            if (duplicate) {
                onSaved?.({ ...form, id: savedId, title: form.title + " (Копія)" })
                return savedId
            }

            form.id = savedId
            savedSnapshot = currentSnapshot()
            onSaved?.({ ...form })
            if (standalone) {
                const url = new URL(window.location.href)
                url.searchParams.set("form", String(form.id))
                window.history.replaceState(null, "", url)
            }
            return savedId
        } catch (error) {
            result = { error: { message: error instanceof Error ? error.message : "Не вдалося зберегти форму" } }
        } finally {
            loading = false
        }
    }

    async function deleteForm(){
        if (loading || form.id <= 0)
            return
        if (!window.confirm("Видалити форму? Пов’язані заявки буде видалено, а профілі залишаться без форми."))
            return

        loading = true
        deleteError = ""
        try {
            const deletion = await actions.deleteForm({ formId: form.id })
            if (deletion.error) {
                deleteError = deletion.error.message
            } else if (standalone) {
                window.location.assign("/admin/forms")
            } else {
                onDeleted?.(form.id)
            }
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Не вдалося видалити форму"
        } finally {
            loading = false
        }
    }

    async function duplicateForm(){
   		await saveForm()
      	const newId = await saveForm(true)
       	loading = true
       	window.location.assign(`/admin/forms/editor?form=${newId}`)
    }
</script>

<input class="w-full mb-2.5" placeholder="Назва форми" bind:value={form.title}>
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
             		<input class="w-full" placeholder={"Назва поля"} bind:value={field.title}>
	                <select class="w-full" placeholder="Тип поля" bind:value={field.type}>
	                    <option value="text">
	                        Текст
	                    </option>
	                    <option value="number">
	                        Число
	                    </option>
	                    <option value="date">
	                        Дата
	                    </option>
	                    <option value="file">
	                        Файл
	                    </option>
	                    <option value="select">
	                        Вибір
	                    </option>
	                    <option value="multiselect">
	                        Множинний вибір
	                    </option>
	               </select>
            </div>

            {#if field.type === "select" || field.type === "multiselect"}
                <textarea
                    class="w-full mt-2.5"
                    placeholder={"Варіанти (по одному в рядку)"}
                    value={(field.options ?? []).join("\n")}
                    oninput={(e) => field.options = (e.currentTarget as HTMLTextAreaElement).value.split("\n")}
                ></textarea>
            {/if}

            <div class="w-full flex flex-row gap-5 mt-10 items-end justify-between">
	            <label class="flex flex-col gap-1">
	                Regex
	                <input class="w-full" placeholder="Регулярний вираз" bind:value={field.regex}>
	            </label>
                <div class="flex flex-row items-center gap-5">
	              	<label class="flex flex-row items-center gap-2 pb-2">
	                    <input type="checkbox" bind:checked={field.required}>
	                    Обов'язкове
	                </label>
	                <label class="flex flex-col gap-1 w-12">
	                    Min
	                    <input class="w-full" type="number" bind:value={field.min}>
	                </label>
	                <label class="flex flex-col gap-1 w-12">
	                    Max
	                    <input class="w-full" type="number" bind:value={field.max}>
	                </label>
                </div>
            </div>

            <button
                type="button"
                class="absolute top-2 right-2 cursor-pointer"
                onclick={()=> form.schema = form.schema.filter((value, idx) => idx !== i)}
            >X</button>

        </li>
    {/each}
</ul>


<button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={() => saveForm()}>{loading ? "Збереження..." : "Зберегти"}</button>
<button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={addNewField}>+ Додати поле</button>
{#if form.id > 0}
    <button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={duplicateForm}>Зробити копію</button>
    <button type="button" disabled={loading} class="btn-default text-diia-red {loading ? 'opacity-50' : ''}" onclick={deleteForm}>
        <span class="text-diia-red">
            Видалити форму
        </span>
    </button>
{/if}
