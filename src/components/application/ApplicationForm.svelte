<script lang="ts">
    import { actions, isInputError } from "astro:actions";
    import { tick } from "svelte";
    import type { campaigns, forms, profiles, users } from "@db/schema";

    type Form = typeof forms.$inferSelect;
    type Campaign = typeof campaigns.$inferSelect;
    type Profile = typeof profiles.$inferSelect;
    type User = typeof users.$inferSelect;

    interface ProfileWithForm extends Profile {
        form: Form | null;
    }

    interface CampaignWithProfiles extends Campaign {
        profiles: ProfileWithForm[];
    }

    const {
        selectedForm,
        selectedCampaign,
        selectedProfile,
        user,
        userChildren = [],
        actionUrl,
        draft,
    }: {
        selectedForm: Form;
        selectedCampaign: CampaignWithProfiles | undefined;
        selectedProfile: ProfileWithForm;
        user: User;
        userChildren?: User[];
        actionUrl: string;
        draft?: {
            id: number;
            studentId: number | null;
            student: User | null;
            answers: Record<string, unknown>;
        };
    } = $props();

    const toDateInput = (value: unknown) =>
        value ? new Date(value as string | number | Date).toISOString().slice(0, 10) : "";

    const draftStudent = (draft?.answers?.__student ?? {}) as Record<string, string | undefined>;
    const answerOf = (slug: string) => draft?.answers?.[slug];

    let draftId = $state(draft?.id ?? 0);
    let selectedChildId = $state(draft?.studentId ? String(draft.studentId) : "");
    let studentId = $state(draft?.studentId ? String(draft.studentId) : "");
    let student = $state({
        firstName: draft?.student?.firstName ?? draftStudent.firstName ?? "",
        lastName: draft?.student?.lastName ?? draftStudent.lastName ?? "",
        middleName: draft?.student?.middleName ?? draftStudent.middleName ?? "",
        birthDate: draft?.student?.birthDate ? toDateInput(draft.student.birthDate) : (draftStudent.birthDate ?? ""),
        telephone: draft?.student?.phone ?? draftStudent.telephone ?? "",
    });

    let fieldErrors = $state<Record<string, string>>({});
    let message = $state("");
    let sending = $state(false);
    let formElement = $state<HTMLFormElement>();

    let saveStatus = $state<"idle" | "saving" | "saved">("idle");
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let saving = false;
    let dirty = false;

    function scheduleSave() {
        if (sending) return;
        dirty = true;
        saveStatus = "idle";
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveDraft, 800);
    }

    async function saveDraft() {
        if (saving || sending || !formElement) return;

        saving = true;
        dirty = false;
        saveStatus = "saving";
        try {
            const result = await actions.saveDraft(new FormData(formElement));
            if (result.error || !result.data.id) {
                saveStatus = "idle";
                return;
            }
            if (result.data.id !== draftId) {
                draftId = result.data.id;
                const url = new URL(window.location.href);
                url.searchParams.set("draft", String(draftId));
                window.history.replaceState(null, "", url);
            }
            saveStatus = dirty ? "idle" : "saved";
        } catch {
            saveStatus = "idle";
        } finally {
            saving = false;
            if (dirty) scheduleSave();
        }
    }

    function selectChild(event: Event) {
        if (!(event.currentTarget instanceof HTMLSelectElement)) return;
        selectedChildId = event.currentTarget.value;

        const child = userChildren.find((c) => String(c.id) === selectedChildId);
        if (!child) {
            studentId = "";
            student = { firstName: "", lastName: "", middleName: "", birthDate: "", telephone: "" };
            return;
        }
        studentId = String(child.id);
        student = {
            firstName: child.firstName ?? "",
            lastName: child.lastName ?? "",
            middleName: child.middleName ?? "",
            birthDate: toDateInput(child.birthDate),
            telephone: child.phone ?? "",
        };
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (sending || !formElement) return;

        clearTimeout(saveTimer);
        dirty = false;
        sending = true;
        message = "";
        fieldErrors = {};

        try {
            const result = await actions.submitForm(new FormData(formElement));

            if (result.error) {
                message = result.error.message;
                if (isInputError(result.error)) {
                    fieldErrors = Object.fromEntries(
                        Object.entries(result.error.fields ?? {}).map(([key, errors]) => [key, (errors || []).join(", ")]),
                    );
                }
            } else if (!result.data.success) {
                message = result.data.message || "";
                fieldErrors = result.data.fieldErrors || {};
            } else {
                window.location.assign(`/cabinet/application?success=true&preview=${result.data.id}`);
                return;
            }

            await tick();
            formElement.querySelector<HTMLElement>('[aria-invalid="true"]:is(input, select, textarea)')?.focus();
        } catch (error) {
            message = error instanceof Error ? error.message : "Не вдалося надіслати заяву";
        } finally {
            sending = false;
        }
    }
</script>

<section class="flex flex-col gap-5">
    <a
        href={`/cabinet/application?campaignId=${selectedCampaign?.id}`}
        class="self-start"
    >
        {"<-"} Назад до профілів
    </a>

    <div>
        <h2>{selectedForm.title}</h2>
        {#if selectedForm.description}
            <p class="pt-2">{selectedForm.description}</p>
        {/if}
    </div>

    <form
        class="flex flex-col"
        bind:this={formElement}
        action={actionUrl}
        method="POST"
        onsubmit={submit}
        oninput={scheduleSave}
        onchange={scheduleSave}
    >
        <input type="hidden" name="draftId" value={draftId || ""} />
        <div class="card flex flex-col gap-5 mb-5">
            <h3>Інформація учня</h3>
            {#if userChildren.length > 0}
                <label class="flex flex-col gap-1">
                    Оберіть учня
                    <select onchange={selectChild}>
                        <option value="">Новий учень</option>
                        {#each userChildren as child (child.id)}
                            <option value={String(child.id)}>{child.firstName} {child.lastName} {child.middleName ?? ""}</option>
                        {/each}
                    </select>
                </label>
            {/if}
            <input type="hidden" name="studentId" value={studentId} />
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <label class="flex flex-col gap-1">
                    Ім'я
                    <input
                        name="studentfirstName"
                        required
                        placeholder="..."
                        readonly={selectedChildId !== ""}
                        bind:value={student.firstName}
                        aria-invalid={fieldErrors.studentfirstName ? "true" : undefined}
                    />
                    {#if fieldErrors.studentfirstName}
                        <span class="text-diia-red" role="alert">{fieldErrors.studentfirstName}</span>
                    {/if}
                </label>
                <label class="flex flex-col gap-1">
                    Прізвище
                    <input
                        name="studentlastName"
                        required
                        placeholder="..."
                        readonly={selectedChildId !== ""}
                        bind:value={student.lastName}
                        aria-invalid={fieldErrors.studentlastName ? "true" : undefined}
                    />
                    {#if fieldErrors.studentlastName}
                        <span class="text-diia-red" role="alert">{fieldErrors.studentlastName}</span>
                    {/if}
                </label>
                <label class="flex flex-col gap-1">
                    По батькові
                    <input
                        name="studentmiddleName"
                        placeholder="..."
                        readonly={selectedChildId !== ""}
                        bind:value={student.middleName}
                        aria-invalid={fieldErrors.studentmiddleName ? "true" : undefined}
                    />
                    {#if fieldErrors.studentmiddleName}
                        <span class="text-diia-red" role="alert">{fieldErrors.studentmiddleName}</span>
                    {/if}
                </label>
            </div>
            <label class="flex flex-col gap-1">
                Дата народження
                <input
                    name="studentBirthDate"
                    type="date"
                    required
                    readonly={selectedChildId !== ""}
                    bind:value={student.birthDate}
                    aria-invalid={fieldErrors.studentBirthDate ? "true" : undefined}
                />
                {#if fieldErrors.studentBirthDate}
                    <span class="text-diia-red" role="alert">{fieldErrors.studentBirthDate}</span>
                {/if}
            </label>
            <label class="flex flex-col gap-1">
                Телефон
                <input
                    name="studentTelephone"
                    type="tel"
                    pattern={"380\\d{9}"}
                    required
                    placeholder="380XXXXXXXXX"
                    readonly={selectedChildId !== ""}
                    bind:value={student.telephone}
                    aria-invalid={fieldErrors.studentTelephone ? "true" : undefined}
                />
                {#if fieldErrors.studentTelephone}
                    <span class="text-diia-red" role="alert">{fieldErrors.studentTelephone}</span>
                {/if}
            </label>
        </div>

        <div class="card flex flex-col gap-5 mb-5">
            <h3>Інформація батьків</h3>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <label class="flex flex-col gap-1">
                    Ім'я
                    <input
                        name="parentfirstName"
                        required
                        value={user.firstName}
                        placeholder="..."
                        aria-invalid={fieldErrors.parentfirstName ? "true" : undefined}
                    />
                    {#if fieldErrors.parentfirstName}
                        <span class="text-diia-red" role="alert">{fieldErrors.parentfirstName}</span>
                    {/if}
                </label>
                <label class="flex flex-col gap-1">
                    Прізвище
                    <input
                        name="parentlastName"
                        required
                        value={user.lastName}
                        placeholder="..."
                        aria-invalid={fieldErrors.parentlastName ? "true" : undefined}
                    />
                    {#if fieldErrors.parentlastName}
                        <span class="text-diia-red" role="alert">{fieldErrors.parentlastName}</span>
                    {/if}
                </label>
                <label class="flex flex-col gap-1">
                    По батькові
                    <input
                        name="parentmiddleName"
                        value={user.middleName}
                        placeholder="..."
                        aria-invalid={fieldErrors.parentmiddleName ? "true" : undefined}
                    />
                    {#if fieldErrors.parentmiddleName}
                        <span class="text-diia-red" role="alert">{fieldErrors.parentmiddleName}</span>
                    {/if}
                </label>
            </div>
            <label class="flex flex-col gap-1">
                Дата народження
                <input
                    name="parentBirthDate"
                    type="date"
                    required
                    value={toDateInput(user.birthDate)}
                    aria-invalid={fieldErrors.parentBirthDate ? "true" : undefined}
                />
                {#if fieldErrors.parentBirthDate}
                    <span class="text-diia-red" role="alert">{fieldErrors.parentBirthDate}</span>
                {/if}
            </label>
            <label class="flex flex-col gap-1">
                Телефон
                <input
                    name="parentTelephone"
                    type="tel"
                    required
                    value={user.phone}
                    pattern={"380\\d{9}"}
                    placeholder="380XXXXXXXXX"
                    aria-invalid={fieldErrors.parentTelephone ? "true" : undefined}
                />
                {#if fieldErrors.parentTelephone}
                    <span class="text-diia-red" role="alert">{fieldErrors.parentTelephone}</span>
                {/if}
            </label>
        </div>

        {#each selectedForm.schema as field (field.slug)}
            {@const name = "form-" + field.slug}
            {@const error = fieldErrors[name]}
            <div class="card mb-5" style={error ? "--card-accent: var(--color-diia-scarlet)" : undefined}>
                <h4 class="mb-5">{field.title}</h4>
                {#if field.type === "select" || field.type === "multiselect"}
                    <fieldset class="flex flex-col gap-2 lg:w-3/4 w-full" aria-invalid={error ? "true" : undefined}>
                        {#each field.options ?? [] as option}
                            <label class="flex items-center gap-2">
                                <input
                                    type={field.type === "multiselect" ? "checkbox" : "radio"}
                                    name={name}
                                    value={option}
                                    checked={field.type === "multiselect"
                                        ? (answerOf(field.slug) as string[] | undefined)?.includes(option)
                                        : answerOf(field.slug) === option}
                                    required={field.type === "select" && field.required !== false}
                                    aria-invalid={error ? "true" : undefined}
                                />
                                <span>{option}</span>
                            </label>
                        {/each}
                    </fieldset>
                {:else}
                    <input
                        class="lg:w-3/4 w-full"
                        name={name}
                        placeholder="Ваша відповідь..."
                        type={field.type}
                        value={field.type === "file" ? undefined : (answerOf(field.slug) as string | undefined) ?? ""}
                        required={field.required !== false}
                        minlength={field.type === "text" && field.min > 0 ? field.min : undefined}
                        maxlength={field.type === "text" && field.max > 0 ? field.max : undefined}
                        min={field.type === "number" && field.min > 0 ? field.min : undefined}
                        max={field.type === "number" && field.max > 0 ? field.max : undefined}
                        pattern={field.type === "text" && field.regex ? field.regex : undefined}
                        aria-invalid={error ? "true" : undefined}
                    />
                {/if}
                {#if error}
                    <p class="text-diia-red mt-2" role="alert">{error}</p>
                {/if}
                {#if field.required === false}
                    <p class="opacity-75 mt-5">*Не обов'язкове</p>
                {/if}
            </div>
        {/each}

        <input type="hidden" name="formId" value={selectedForm.id} />
        <input type="hidden" name="profileId" value={selectedProfile.id} />
        {#if Object.keys(fieldErrors).length > 0}
            <p class="text-diia-red" role="alert">Перевірте виділені поля</p>
        {:else if message}
            <p class="text-diia-red" role="alert">{message}</p>
        {/if}
        {#if saveStatus !== "idle"}
            <p class="opacity-75 mb-2" role="status">
                {saveStatus === "saving" ? "Збереження чернетки..." : "Чернетку збережено"}
            </p>
        {/if}
        <button class="btn-default" disabled={sending}>
            {sending ? "Надсилання..." : "Надіслати"}
        </button>
        <p class="opacity-75">Натискаючи кнопку "Надіслати", ви надаєте згоду на обробку ваших персональних даних відповідно до Закону України "Про захист персональних даних"</p>
    </form>
</section>
