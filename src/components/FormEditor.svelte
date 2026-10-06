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

    onMount(()=>{
        console.log(loadedForm)
        if (loadedForm){
            form = loadedForm
        }
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
            element.slug = element.title.toLowerCase().replace(" ", "-")
        }

        result = await actions.submitFormEdit({
            title: form.title,
            description: form.description || "",
            schema: form.schema,
            formId: loadedForm?.id,
            visibility: form.visibility
        })
        loading = false
    }
    async function changeVisibility(){
        if (loading)
            return

        form.visibility = form.visibility === "public" ? "private" : "public"
        await saveForm()
    }
</script>

<h1 class="mb-5">Редактор форми</h1>

<input class="w-full mb-2.5" placeholder="Назва форми" bind:value={form.title}>
<textarea class="w-full" placeholder="Опис" bind:value={form.description}></textarea>
{#if result && !result.error}
    <p class="text-diia-green">Форму збережено!</p>
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
<button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={saveForm}>Зберегти</button>
<button disabled={loading} class="btn-default {loading ? 'opacity-50' : ''}" onclick={changeVisibility}><span class="text-diia-red">{form.visibility === "private" ? "Опублікувати" : "Приховати"}</span></button>
