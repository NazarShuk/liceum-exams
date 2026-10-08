<script lang="ts">
    import { forms } from "@db/schema";
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    type Form = typeof forms.$inferSelect;
    
    const {loadedForm} : {loadedForm: Form|undefined} = $props() 
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
            form = loadedForm
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
            min: 0
        })
    }
    async function saveForm(){
        if (loading)
            return

        loading = true
        // generate slugs
        for (let i = 0; i < form.schema.length; i++) {
            const element = form.schema[i];
            element.title = element.title.trim()
            element.slug = element.title.toLowerCase().replaceAll(" ", "-")
        }

        console.log(form)

        try {
            result = await actions.submitFormEdit({
                title: form.title,
                description: form.description || "",
                schema: form.schema,
                formId: form.id > 0 ? form.id : undefined,
            })
            if (!result.error) {
                form.id = result.data.formId
                savedSnapshot = currentSnapshot();
                const url = new URL(window.location.href)
                url.searchParams.set("form", String(form.id))
                window.history.replaceState(null, "", url)
            }
        } catch (error) {
            result = { error: { message: error instanceof Error ? error.message : "Не вдалося зберегти форму" } };
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
            } else {
                window.location.assign("/admin/forms")
            }
        } catch (error) {
            deleteError = error instanceof Error ? error.message : "Не вдалося видалити форму"
        } finally {
            loading = false
        }
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
        <li class="w-full h-24 p-1 border mb-5 flex flex-col">
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
                </select>
            </div>
            

            <button class="text-diia-red cursor-pointer" onclick={()=> form.schema = form.schema.filter((value, idx) => idx !== i)}>Видалити</button>
        </li>
    {/each}
</ul>


<button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={addNewField}>+ Додати поле</button>
<button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={saveForm}>{loading ? "Збереження..." : "Зберегти"}</button>
{#if form.id > 0}
    <button type="button" disabled={loading} class="btn-default text-diia-red {loading ? 'opacity-50' : ''}" onclick={deleteForm}>
        <span class="text-diia-red">
            Видалити форму
        </span>
    </button>
{/if}
