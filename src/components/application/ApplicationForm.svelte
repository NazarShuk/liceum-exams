<script lang="ts">
    import { actions, isInputError } from "astro:actions";
    import { onDestroy, tick } from "svelte";
    import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, uploadError } from "@lib/uploads";
    import type { campaigns, forms, profiles, users } from "@db/schema";

    type Form = typeof forms.$inferSelect;
    type Campaign = typeof campaigns.$inferSelect;
    type Profile = typeof profiles.$inferSelect;
    type User = typeof users.$inferSelect;
    type Field = Form["schema"][number];

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
        edit,
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
        edit?: {
            id: number;
            studentId: number | null;
            student: User | null;
            user: User | null;
            answers: Record<string, unknown>;
            notes: string;
        };
    } = $props();

    const toDateInput = (value: unknown) =>
        value ? new Date(value as string | number | Date).toISOString().slice(0, 10) : "";

    const source = edit ?? draft;
    const draftStudent = (source?.answers?.__student ?? {}) as Record<string, string | undefined>;
    const draftParent = (source?.answers?.__parent ?? {}) as Record<string, string | undefined>;
    const answerOf = (slug: string) => source?.answers?.[slug];

    let draftId = $state(draft?.id ?? 0);
    let selectedChildId = $state(!edit && draft?.studentId ? String(draft.studentId) : "");
    let studentId = $state(source?.studentId ? String(source.studentId) : "");
    let student = $state({
        firstName: source?.student?.firstName ?? draftStudent.firstName ?? "",
        lastName: source?.student?.lastName ?? draftStudent.lastName ?? "",
        middleName: source?.student?.middleName ?? draftStudent.middleName ?? "",
        birthDate: source?.student?.birthDate ? toDateInput(source.student.birthDate) : (draftStudent.birthDate ?? ""),
        telephone: source?.student?.phone ?? draftStudent.telephone ?? "",
    });

    let fieldErrors = $state<Record<string, string>>({});
    let message = $state("");
    let sending = $state(false);
    let formElement = $state<HTMLFormElement>();
    const parentUser = edit?.user ?? user;
    let parent = $state({
        firstName: draftParent.firstName ?? parentUser.firstName ?? "",
        lastName: draftParent.lastName ?? parentUser.lastName ?? "",
        middleName: draftParent.middleName ?? parentUser.middleName ?? "",
        birthDate: draftParent.birthDate ?? toDateInput(parentUser.birthDate),
        telephone: draftParent.telephone ?? parentUser.phone ?? "",
    });

    let saveStatus = $state<"idle" | "saving" | "saved">("idle");
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let saving = false;
    let dirty = false;

    type UploadState = {
        key: string;
        progress: number;
        error: string;
        uploading: boolean;
        previewUrl: string;
        previewIsImage: boolean | null;
    };
    const draftUploads: Record<string, UploadState> = {};
    for (const field of selectedForm.schema) {
        if (field.type !== "file") continue;
        const answer = answerOf(field.slug);
        const key =
            typeof answer === "object" && answer !== null && "key" in answer && typeof answer.key === "string"
                ? answer.key
                : "";
        draftUploads[field.slug] = {
            key,
            progress: key ? 100 : 0,
            error: "",
            uploading: false,
            previewUrl: key ? `/file?key=${encodeURIComponent(key)}&inline=1` : "",
            // Saved answers only keep the key, so the type is discovered by the preview image.
            previewIsImage: null,
        };
    }
    let uploads = $state(draftUploads);
    let uploading = $derived(Object.values(uploads).some((upload) => upload.uploading));
    const uploadTokens: Record<string, number> = {};
    const objectUrls = new Set<string>();

    onDestroy(() => {
        for (const url of objectUrls) URL.revokeObjectURL(url);
    });

    function previewForFile(file: File) {
        const url = URL.createObjectURL(file);
        objectUrls.add(url);
        return url;
    }

    function previewFailed(slug: string) {
        const upload = uploads[slug];
        if (!upload || upload.previewIsImage === false) return;
        uploads[slug] = { ...upload, previewIsImage: false };
    }

    function scheduleSave() {
        if (sending || edit) return;
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

    function uploadFile(file: File, field: Field, input: HTMLInputElement) {
        const slug = field.slug;
        const token = (uploadTokens[slug] ?? 0) + 1;
        uploadTokens[slug] = token;
        // Keep the previous key until the replacement succeeds, so a failed upload does not lose it.
        const previous = uploads[slug];
        const previousKey = previous?.key ?? "";
        const previousPreview = previous?.previewUrl ?? "";
        const previousIsImage = previous?.previewIsImage ?? null;
        const previewIsImage = file.type.startsWith("image/");
        const previewUrl = previewForFile(file);
        uploads[slug] = {
            key: previousKey,
            progress: 0,
            error: "",
            uploading: true,
            previewUrl,
            previewIsImage,
        };

        const data = new FormData();
        data.set("file", file);
        data.set("formId", String(selectedForm.id));
        data.set("field", slug);

        const finish = (upload: UploadState) => {
            if (uploadTokens[slug] !== token) return;
            uploads[slug] = upload;
            if (!upload.key) input.value = "";
            scheduleSave();
        };

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/application-upload");
        xhr.upload.onprogress = (event) => {
            if (uploadTokens[slug] !== token || !event.lengthComputable) return;
            uploads[slug] = { ...uploads[slug], progress: Math.round((event.loaded / event.total) * 100) };
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const key = (JSON.parse(xhr.responseText) as { key?: string }).key;
                    if (key) {
                        finish({ key, progress: 100, error: "", uploading: false, previewUrl, previewIsImage });
                        return;
                    }
                } catch {
                    // fall through to the error below
                }
            }
            let error = "Не вдалося завантажити файл";
            try {
                error = (JSON.parse(xhr.responseText) as { error?: string }).error || error;
            } catch {
                // keep the generic message
            }
            input.value = "";
            finish({
                key: previousKey,
                progress: previousKey ? 100 : 0,
                error,
                uploading: false,
                previewUrl: previousPreview,
                previewIsImage: previousIsImage,
            });
        };
        const fail = () => {
            input.value = "";
            finish({
                key: previousKey,
                progress: previousKey ? 100 : 0,
                error: "Не вдалося завантажити файл",
                uploading: false,
                previewUrl: previousPreview,
                previewIsImage: previousIsImage,
            });
        };
        xhr.onerror = fail;
        xhr.send(data);
    }

    function selectFile(event: Event, field: Field) {
        if (!(event.currentTarget instanceof HTMLInputElement)) return;
        const input = event.currentTarget;
        const file = input.files?.[0];
        const slug = field.slug;
        const previous = uploads[slug];
        const previousKey = previous?.key ?? "";
        const previousPreview = previous?.previewUrl ?? "";
        const previousIsImage = previous?.previewIsImage ?? null;

        // A new selection cancels any upload still running for this field.
        uploadTokens[slug] = (uploadTokens[slug] ?? 0) + 1;
        if (!file) {
            uploads[slug] = {
                key: previousKey,
                progress: previousKey ? 100 : 0,
                error: "",
                uploading: false,
                previewUrl: previousPreview,
                previewIsImage: previousIsImage,
            };
            scheduleSave();
            return;
        }

        const error = uploadError(file);
        if (error) {
            input.value = "";
            uploads[slug] = {
                key: previousKey,
                progress: previousKey ? 100 : 0,
                error,
                uploading: false,
                previewUrl: previousPreview,
                previewIsImage: previousIsImage,
            };
            scheduleSave();
            return;
        }

        uploadFile(file, field, input);
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
        if (uploading) {
            message = "Зачекайте, файли ще завантажуються";
            return;
        }

        clearTimeout(saveTimer);
        dirty = false;
        sending = true;
        message = "";
        fieldErrors = {};

        try {
            const formData = new FormData(formElement);
            const result = edit ? await actions.updateApplicationAnswers(formData) : await actions.submitForm(formData);

            if (result.error) {
                message = result.error.message;
                if (isInputError(result.error)) {
                    fieldErrors = Object.fromEntries(
                        Object.entries(result.error.fields ?? {}).map(([key, errors]) => [
                            key,
                            (errors || []).join(", "),
                        ]),
                    );
                }
            } else if (!result.data.success) {
                message = result.data.message || "";
                fieldErrors = result.data.fieldErrors || {};
            } else {
                window.location.assign(
                    edit
                        ? `/cabinet/application?preview=${result.data.id}`
                        : `/cabinet/application?success=true&preview=${result.data.id}`,
                );
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
        href={edit
            ? `/cabinet/application?preview=${edit.id}`
            : `/cabinet/application?campaignId=${selectedCampaign?.id}`}
        class="self-start"
    >
        {"<-"}
        {edit ? "Назад до заяви" : "Назад до профілів"}
    </a>

    <div>
        <h2>{selectedForm.title}</h2>
        {#if selectedForm.description}
            <p class="pt-2">{selectedForm.description}</p>
        {/if}
    </div>

    {#if edit?.notes}
        <div class="card flex flex-col gap-2">
            <h3>Нотатки</h3>
            <p class="whitespace-pre-wrap">{edit.notes}</p>
        </div>
    {/if}

    <form
        class="flex flex-col"
        bind:this={formElement}
        action={actionUrl}
        method="POST"
        onsubmit={submit}
        oninput={scheduleSave}
        onchange={scheduleSave}
    >
        {#if edit}
            <input type="hidden" name="applicationId" value={edit.id} />
        {:else}
            <input type="hidden" name="draftId" value={draftId || ""} />
        {/if}
        <div class="card flex flex-col gap-5 mb-5">
            <h3>Інформація учня</h3>
            {#if !edit && userChildren.length > 0}
                <label class="flex flex-col gap-1">
                    Оберіть учня
                    <select onchange={selectChild}>
                        <option value="">Новий учень</option>
                        {#each userChildren as child (child.id)}
                            {@const childName = `${child.firstName} ${child.lastName} ${child.middleName ?? ""}`.trim()}
                            <option value={String(child.id)}>{childName}</option>
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
                        bind:value={parent.firstName}
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
                        bind:value={parent.lastName}
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
                        bind:value={parent.middleName}
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
                    bind:value={parent.birthDate}
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
                    bind:value={parent.telephone}
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
            {@const upload = field.type === "file" ? uploads[field.slug] : undefined}
            <div
                class="card mb-5"
                style={error || upload?.error ? "--card-accent: var(--color-diia-scarlet)" : undefined}
            >
                <h4 class="mb-5">{field.title}</h4>
                {#if field.type === "select" || field.type === "multiselect"}
                    <fieldset class="flex flex-col gap-2 lg:w-3/4 w-full" aria-invalid={error ? "true" : undefined}>
                        {#each field.options ?? [] as option}
                            <label class="flex items-center gap-2">
                                <input
                                    type={field.type === "multiselect" ? "checkbox" : "radio"}
                                    {name}
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
                {:else if field.type === "file"}
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
                        <div class="flex flex-1 flex-col gap-2">
                            <input
                                class="w-full"
                                name={upload && (upload.key || upload.uploading) ? "" : name}
                                type="file"
                                accept={ALLOWED_UPLOAD_TYPES.join(",")}
                                required={field.required !== false && !upload?.key}
                                onchange={(event) => selectFile(event, field)}
                                aria-invalid={error || upload?.error ? "true" : undefined}
                            />
                            <input type="hidden" name={`upload-${field.slug}`} value={upload?.key ?? ""} />
                            {#if upload?.uploading}
                                <div class="flex flex-col gap-1">
                                    <div
                                        class="h-2 w-full overflow-hidden rounded bg-black/10"
                                        role="progressbar"
                                        aria-label="Завантаження файлу"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={upload.progress}
                                    >
                                        <div
                                            class="h-full bg-liceum-blue transition-[width] duration-200"
                                            style={`width: ${upload.progress}%`}
                                        ></div>
                                    </div>
                                    <span class="opacity-75">Завантаження... {upload.progress}%</span>
                                </div>
                            {/if}
                            {#if upload?.error}
                                <p class="text-diia-red" role="alert">{upload.error}</p>
                            {/if}
                            {#if upload?.key && !upload.uploading}
                                <p class="text-diia-green">Файл завантажено</p>
                            {/if}
                            <p class="opacity-75">
                                PDF, JPG, PNG або WEBP, до {MAX_UPLOAD_BYTES / 1024 / 1024} МБ
                            </p>
                        </div>
                        {#if upload?.previewUrl}
                            {#if upload.previewIsImage === false}
                                <iframe
                                    src={upload.previewUrl}
                                    title={field.title}
                                    class="h-56 w-full rounded lg:w-1/3"
                                ></iframe>
                            {:else}
                                <img
                                    src={upload.previewUrl}
                                    alt={field.title}
                                    class="max-h-56 w-full rounded object-contain lg:w-1/3"
                                    onerror={() => previewFailed(field.slug)}
                                />
                            {/if}
                            {:else}
                                <!--so the layout stays the same-->
                                <div class="w-full lg:w-1/3"></div>
                        {/if}
                    </div>
                {:else}
                    <input
                        class="lg:w-3/4 w-full"
                        {name}
                        placeholder="Ваша відповідь..."
                        type={field.type}
                        value={(answerOf(field.slug) as string | undefined) ?? ""}
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
        <button class="btn-default" disabled={sending || uploading}>
            {sending
                ? edit
                    ? "Збереження..."
                    : "Надсилання..."
                : uploading
                  ? "Завантаження файлів..."
                  : edit
                    ? "Зберегти зміни"
                    : "Надіслати"}
        </button>
        {#if !edit}
            <p class="opacity-75">
                Натискаючи кнопку "Надіслати", ви надаєте згоду на обробку ваших персональних даних відповідно до Закону
                України "Про захист персональних даних"
            </p>
        {/if}
    </form>
</section>
