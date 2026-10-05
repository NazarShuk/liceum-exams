<script lang="ts">
    import { forms } from "@db/schema";
    import { actions } from "astro:actions";
    import { onMount } from "svelte";
    type Schema = NonNullable<typeof forms.$inferSelect["schema"]>;

    const {loadedFields} : {loadedFields : Schema} = $props() 
    
    const fields : Schema = $state([])
    onMount(()=>{
        if (loadedFields){
            loadedFields.forEach(field=>{
                fields.push(field)
            })
        }
    })

    let result = $state<any|null>(null)

    function addNewField(){
        console.log("hello")
        fields.push({
            slug: "new-field",
            title: "Нове поле",
            type: "text",
            regex: "",
            max: 32,
            min: 0
        })
    }
    async function saveForm(){
        // generate slugs
        for (let i = 0; i < fields.length; i++) {
            const element = fields[i];
            element.slug = element.title.toLowerCase().replace(" ", "-")
        }
        console.log(fields)
        result = await actions.submitFormEdit({
            title: "New Form",
            description: "form description",
            schema: fields
        })
        
        
    }
</script>

<h1>Редактор</h1>
{#if result && !result.error}
    <p class="text-diia-green">Форму збережено!</p>
{/if}
<ul>
    {#each fields as field, i (i)}
        <li class="w-full h-24 p-1 border mb-5">
            <input placeholder={"Назва поля"} bind:value={field.title}>

            <select placeholder="Тип поля" bind:value={field.type}>
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
        </li>
    {/each}
</ul>


<button class="btn-default" onclick={addNewField}>+ Додати поле</button>
<button class="btn-default" onclick={saveForm}>Зберегти</button>