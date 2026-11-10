import type { uk } from "./uk";

export const en: Record<keyof typeof uk, string> = {
    "common.appName": "Lyceum Admissions",
    "common.language": "Language",
    "common.themeToggle": "Toggle light or dark theme",
    "common.back": "Back",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.saved": "Changes saved!",
    "common.delete": "Delete",
    "common.deleting": "Deleting...",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.add": "Add",
    "common.remove": "Remove",
    "common.view": "View",
    "common.copy": "Copy",
    "common.share": "Share",
    "common.search": "Search",
    "common.reset": "Reset",
    "common.filter": "Filter",
    "common.filterPlaceholder": "Filter...",
    "common.all": "All",
    "common.yes": "Yes",
    "common.no": "No",
    "common.loading": "Loading...",
    "common.actions": "Actions",
    "common.status": "Status",
    "common.notes": "Notes",
    "common.firstName": "First name",
    "common.lastName": "Last name",
    "common.middleName": "Middle name",
    "common.birthDate": "Date of birth",
    "common.phone": "Phone",
    "common.description": "Description",
    "common.required": "Required",
    "common.optional": "Optional",
    "common.application": "Application",
    "common.notFound": "Page not found :(",
    "common.backHome": "Back to home",
    "common.serverError": "Server error D:",
    "common.viewFile": "View file",
    "common.downloadFile": "Download file",
    "common.retry": "Try again",
    "common.error": "Error",
    "common.noResults": "Nothing found.",

    "nav.myApplications": "My applications",
    "nav.createApplication": "New application",
    "nav.about": "About",
    "nav.contacts": "Contacts",
    "nav.administration": "Administration",
    "nav.applications": "Applications",
    "nav.groups": "Groups",
    "nav.campaigns": "Campaigns",
    "nav.news": "News",
    "nav.users": "Users",
    "nav.login": "Sign in",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",

    "auth.signInWithGoogle": "Sign in with Google",
    "auth.confirmNotRobot": "Confirm that you are not a robot",

    "home.heroTitle": "The lyceum enrollment portal",
    "home.heroSubtitle":
        "Submit an application, track its status, and receive entrance exam results all in one place.",
    "home.news": "News",
    "home.contacts": "Contacts",
    "home.allNews": "View all",
    "home.footerAria": "Site information",
    "home.footerAbout": "About",
    "home.footerContacts": "Contacts",
    "home.footerTerms": "Terms of service",
    "home.footerPrivacy": "Privacy policy",
    "home.footerLyceum": "Lyceum website",

    "news.title": "News",
    "news.searchLabel": "Search news",
    "news.searchPlaceholder": "Search news",
    "news.categoryLabel": "Category",
    "news.allCategories": "All categories",
    "news.find": "Search",
    "news.reset": "Reset",
    "news.empty": "No news yet.",
    "news.noResults": "No news found for this query.",
    "news.pinned": "Pinned news",
    "news.backToAll": "All news",
    "news.edit": "Edit",
    "news.hiddenNotice": "This news item is hidden from visitors.",
    "news.create": "+ Create news",
    "news.editorTitle": "News editor",
    "news.newTitle": "New news item",
    "news.titlePlaceholder": "News title",
    "news.tagPlaceholder": "Tag",
    "news.pin": "Pin news",
    "news.hide": "Hide from the site",
    "news.deleteConfirm": "Delete this news item?",
    "news.delete": "Delete news",
    "news.viewOnSite": "View on the site",
    "news.saveFailed": "Could not save the news item",
    "news.deleteFailed": "Could not delete the news item",
    "news.flagsFailed": "Could not update the news item",
    "news.pinnedBadge": "Pinned",
    "news.hiddenBadge": "Hidden",
    "news.unpin": "Unpin",
    "news.pinAction": "Pin",
    "news.show": "Show",
    "news.hideAction": "Hide",

    "applicant.title": "Your application",
    "applicant.greeting": "Hello, {name}!",
    "applicant.welcome": "Welcome!",
    "applicant.access":
        "You have been given access to the following application \"{profile}\". Create an account to track its status and see exam results.",
    "applicant.notes": "Notes:",

    "cabinet.title": "My applications",
    "cabinet.create": "New application",
    "cabinet.noCampaigns": "There are no admission campaigns available right now.",
    "cabinet.emptyApplicant": "You do not have any applications yet.",
    "cabinet.emptyParent":
        "You do not have any applications yet! Use the button above to create your first application.",
    "cabinet.applicationFallback": "Application",
    "cabinet.share": "Link",
    "cabinet.shareTooltip": "Applicant link",
    "cabinet.shareTitle": "Applicant link",
    "cabinet.copy": "Copy",
    "cabinet.shareAction": "Share",
    "cabinet.linkExplanation":
        "Send this link to the applicant. They will be able to register and track the application themselves.",
    "cabinet.deleteDraft": "Delete",
    "cabinet.deleteDraftTooltip": "Delete draft",
    "cabinet.deleteDraftConfirm": "Delete this draft?",
    "cabinet.draft": "Draft",

    "account.title": "Account",
    "account.logout": "Sign out",

    "application.title": "Application",
    "application.submittedTitle": "Application submitted!",
    "application.submittedText": "Your application has been received. You can review the information you entered.",
    "application.preview": "View application",
    "application.toMyApplications": "To my applications",
    "application.backToApplication": "Back to application",
    "application.backToProfiles": "Back to profiles",
    "application.studentInfo": "Applicant information",
    "application.chooseStudent": "Choose an applicant",
    "application.newStudent": "New applicant",
    "application.parentInfo": "Parent information",
    "application.notes": "Notes",
    "application.uploadAria": "File upload",
    "application.uploading": "Uploading... {progress}%",
    "application.uploaded": "File uploaded",
    "application.removeFile": "Remove file",
    "application.fileHint": "PDF, JPG, PNG or WEBP, up to {size} MB",
    "application.answerPlaceholder": "Your answer...",
    "application.optionalMark": "*Optional",
    "application.checkFields": "Check the highlighted fields",
    "application.savingDraft": "Saving draft...",
    "application.draftSaved": "Draft saved",
    "application.saving": "Saving...",
    "application.sending": "Sending...",
    "application.uploadingFiles": "Uploading files...",
    "application.saveChanges": "Save changes",
    "application.submit": "Submit",
    "application.consent":
        'By clicking "Submit", you consent to the processing of your personal data in accordance with the Law of Ukraine "On Personal Data Protection"',
    "application.chooseProfile": "Choose a profile",
    "application.noCampaignsTitle": "No campaigns available",
    "application.noCampaignsText": "There are no admission campaigns you can apply to right now.",
    "application.chooseCampaign": "Choose an admission campaign",
    "application.profileCount.one": "{count} profile",
    "application.profileCount.few": "{count} profiles",
    "application.profileCount.many": "{count} profiles",
    "application.profileCount.other": "{count} profiles",
    "application.turnstileFailed": "Verification failed. Refresh the page.",
    "application.turnstileLoadFailed": "Could not load the verification. Refresh the page.",
    "application.confirmRobotUpload": "Confirm that you are not a robot and try uploading again",
    "application.uploadFailed": "Could not upload the file",
    "application.waitUploads": "Please wait, files are still uploading",
    "application.confirmRobotSubmit": "Confirm that you are not a robot and submit again",
    "application.sendFailed": "Could not submit the application",
    "application.applicationFrom": "Application from {date}",
    "application.editApplication": "Edit application",
    "application.formTitle": "Application",

    "status.pending": "Under review",
    "status.accepted": "Accepted",
    "status.rejected": "Rejected",
    "status.attention": "Needs attention",
    "status.draft": "Draft",

    "roles.applicant": "Applicant",
    "roles.parent": "Guardian",
    "roles.teacher": "Teacher",
    "roles.admin": "Administrator",

    "admin.applications.title": "Applications",
    "admin.applications.emptyCampaigns": "No campaigns yet.",
    "admin.campaigns.title": "Campaigns",
    "admin.campaigns.create": "+ Create campaign",
    "admin.campaigns.editor": "Campaign editor",
    "admin.campaigns.new": "New campaign",
    "admin.campaigns.starts": "Starts {relative}",
    "admin.campaigns.ends": "Ends {relative}",
    "admin.campaigns.finished": "Ended {relative}",
    "admin.campaigns.applicationCount.one": "{count} application",
    "admin.campaigns.applicationCount.few": "{count} applications",
    "admin.campaigns.applicationCount.many": "{count} applications",
    "admin.campaigns.applicationCount.other": "{count} applications",
    "admin.campaigns.profiles": "Profiles",
    "admin.groups.title": "Groups",
    "admin.groups.empty": "No groups yet.",
    "admin.groups.applicationCount.one": "{count} application",
    "admin.groups.applicationCount.few": "{count} applications",
    "admin.groups.applicationCount.many": "{count} applications",
    "admin.groups.applicationCount.other": "{count} applications",
    "admin.groups.all": "All groups",
    "admin.news.title": "News",
    "admin.news.create": "+ Create news",
    "admin.news.editor": "News editor",
    "admin.news.new": "New news item",
    "admin.users.title": "Users",
    "admin.noCampaigns": "No campaigns yet.",
    "admin.groupEditor.title": "Edit group",
    "admin.groupEditor.name": "Group name",
    "admin.groupEditor.teachers": "Teachers",
    "admin.groupEditor.noTeachers": "No teachers.",
    "admin.groupEditor.create": "Create",
    "admin.groupEditor.add": "Add",
    "admin.groupEditor.deleteGroup": "Delete group",
    "admin.groupEditor.deleteConfirm": "Delete this group?",
    "admin.groupEditor.saveFailed": "Could not save the group",
    "admin.groupEditor.deleteFailed": "Could not delete the group",
    "admin.groupEditor.groupFallback": "Application",

    "campaignEditor.namePlaceholder": "Campaign name",
    "campaignEditor.begins": "Begins at",
    "campaignEditor.ends": "Ends at",
    "campaignEditor.profiles": "Profiles",
    "campaignEditor.createProfile": "Create a new profile",
    "campaignEditor.allowMultiple": "Allow submission of applications to multiple profiles",
    "campaignEditor.delete": "Delete campaign",
    "campaignEditor.deleteConfirm": "Delete this campaign?",
    "campaignEditor.titleRequired": "Enter the campaign name first",
    "campaignEditor.unsavedConfirm": "There are unsaved changes. Close without saving?",
    "campaignEditor.saveFailed": "Could not save the campaign",
    "campaignEditor.deleteFailed": "Could not delete the campaign",
    "campaignEditor.editProfile": "Edit profile",
    "campaignEditor.newProfile": "New profile",

    "profileEditor.namePlaceholder": "Profile name",
    "profileEditor.descriptionPlaceholder": "Description",
    "profileEditor.form": "Profile form",
    "profileEditor.noForm": "No form",
    "profileEditor.createForm": "+ Create a new form",
    "profileEditor.deleteProfile": "Delete profile",
    "profileEditor.deleteConfirm": "Delete this profile? This is only possible if it has no submitted applications.",
    "profileEditor.saveFailed": "Could not save the profile",
    "profileEditor.deleteFailed": "Could not delete the profile",
    "profileEditor.profileForm": "Profile form",
    "profileEditor.newForm": "New form",
    "profileEditor.noFormSelected": "No form has been selected for this profile yet.",
    "profileEditor.createFormButton": "Create form",

    "formEditor.titlePlaceholder": "Form name",
    "formEditor.descriptionPlaceholder": "Description",
    "formEditor.saved": "Form saved!",
    "formEditor.fieldName": "Field name",
    "formEditor.fieldType": "Field type",
    "formEditor.typeText": "Text",
    "formEditor.typeNumber": "Number",
    "formEditor.typeDate": "Date",
    "formEditor.typeFile": "File",
    "formEditor.typeSelect": "Select",
    "formEditor.typeMultiselect": "Multiple select",
    "formEditor.optionsPlaceholder": "Options (one per line)",
    "formEditor.regexPlaceholder": "Regular expression",
    "formEditor.required": "Required",
    "formEditor.addField": "+ Add field",
    "formEditor.duplicate": "Duplicate",
    "formEditor.delete": "Delete form",
    "formEditor.deleteConfirm": "Delete this form? This is only possible if it has no submitted applications.",
    "formEditor.saveFailed": "Could not save the form",
    "formEditor.deleteFailed": "Could not delete the form",
    "formEditor.copySuffix": " (Copy)",

    "editor.horizontalRule": "Horizontal rule",

    "table.student": "Student",
    "table.studentBirthDate": "Student date of birth",
    "table.studentPhone": "Student phone",
    "table.guardian": "Guardian",
    "table.guardianBirthDate": "Guardian date of birth",
    "table.guardianPhone": "Guardian phone",
    "table.campaign": "Campaign",
    "table.profile": "Profile",
    "table.noProfiles": "No profiles have been added to the campaign yet.",
    "table.noForm": "No form is assigned to this profile.",
    "table.groupEmpty": "The group has no applications yet.",
    "table.columns": "Configure column visibility",
    "table.selectAll": "Select all visible applications",
    "table.actions": "Actions",
    "table.delete": "Delete",
    "table.removeFromGroup": "Remove from group",
    "table.createGroup": "Create group",
    "table.exportCsv": "Export CSV",
    "table.selectApplication": "Select application {id}",
    "table.deleteApplication": "Delete application",
    "table.editStatus": "Change status and notes",
    "table.statusNotes": "Status and notes",
    "table.addToGroup": "Add to group",
    "table.noCampaigns": "No campaigns yet.",
    "table.notesPlaceholder": "Notes are visible to the applicant and administrators",
    "table.selectedCount": "Applications selected: {count}",
    "table.group": "Group",
    "table.newGroup": "New group",
    "table.groupName": "Group name",
    "table.teachers": "Teachers",
    "table.noTeachers": "No teachers.",
    "table.toGroups": "To groups",
    "table.saveStatusFailed": "Could not save the status",
    "table.deleteConfirmOne": "Delete this application?",
    "table.deleteConfirmMany": "Delete the selected applications ({count})?",
    "table.deleteFailed": "Could not delete the applications",
    "table.groupCreated": "Group created.",
    "table.applicationsAdded": "Applications added to the group.",
    "table.groupSaveFailed": "Could not save the group",
    "table.removeConfirmOne": "Remove this application from the group?",
    "table.removeConfirmMany": "Remove the selected applications from the group ({count})?",
    "table.removeFailed": "Could not remove the applications from the group",
    "table.groupFallback": "Application",

    "usersTable.id": "ID",
    "usersTable.user": "User",
    "usersTable.role": "Role",
    "usersTable.createdAt": "Created",
    "usersTable.googleConnected": "Google connected",
    "usersTable.changeRole": "Change role",
    "usersTable.cannotChangeOwnRole": "You cannot change your own role",
    "usersTable.changeRoleFailed": "Could not change the role",
    "usersTable.notFound": "No users found.",

    "contacts.title": "Contacts",
    "contacts.intro": "Contact us if you have questions about admissions or how the portal works.",
    "contacts.address": "Address",
    "contacts.addressValue": "103 Chudnivska St, Zhytomyr 10005",
    "contacts.email": "Email",
    "contacts.phone": "Phone",
    "contacts.director": "Director of the Scientific Lyceum",
    "contacts.directorValue": "Nataliia Ventsel",

    "legal.translationNotice":
        "This English translation is provided for convenience. The Ukrainian version is the authoritative one.",

    "validation.birthDateRequired": "Enter the date of birth",
    "validation.studentFirstNameRequired": "Enter the student's first name",
    "validation.studentLastNameRequired": "Enter the student's last name",
    "validation.phoneFormat": "Enter the number in the format 380XXXXXXXXX",
    "validation.firstNameRequired": "Enter the first name",
    "validation.lastNameRequired": "Enter the last name",
    "validation.multiselectRequired": '"{label}": select at least one option',
    "validation.invalidValue": '"{label}": invalid value',
    "validation.selectAtLeast": '"{label}": select at least {count}',
    "validation.selectAtMost": '"{label}": select no more than {count}',
    "validation.requiredField": '"{label}": required field',
    "validation.numberRequired": '"{label}": enter a number',
    "validation.min": '"{label}": minimum {count}',
    "validation.max": '"{label}": maximum {count}',
    "validation.invalidDate": '"{label}": invalid date',
    "validation.invalidFormat": '"{label}": invalid format',
    "validation.minChars": '"{label}": at least {count} characters',
    "validation.maxChars": '"{label}": no more than {count} characters',
    "validation.invalidFile": '"{label}": invalid file',

    "upload.tooLarge": "the file is too large (maximum {size} MB)",
    "upload.badType": "unsupported file type (PDF, JPG, PNG, WEBP)",

    "errors.tooManyRequests": "Too many requests. Try again later.",
    "errors.notAuthorized": "You need to sign in",
    "errors.tooManyUploads": "Too many uploads. Try again later.",
    "errors.turnstile": "Confirm that you are not a robot",
    "errors.fileNotSelected": "No file selected",
    "errors.fileFieldNotFound": "File field not found",
    "errors.applicantsCannotCreate": "Applicants cannot create applications",
    "errors.adminsOnly": "Only administrators can add files",
    "errors.campaignNotFound": "Campaign not found",
    "errors.profileNotFound": "Profile not found",
    "errors.profileNotInCampaign": "The profile does not belong to any campaign",
    "errors.campaignNotStarted": "The campaign has not started yet",
    "errors.campaignEnded": "The campaign has already ended",
    "errors.applicationExists": "An application for this child already exists in this campaign",
    "errors.applicationExistsForProfile":
        "An application for this child (for this profile) already exists in this campaign",
    "errors.applicationNotFound": "Application not found",
    "errors.editOnlyAttention": 'Editing is only available for applications with the "Needs attention" status',
    "errors.draftNotFound": "Draft not found",
    "errors.fieldsNeedNames": "All form fields must have a name",
    "errors.duplicateFieldNames": "Fields with the same name: “{title}”",
    "errors.saveProfileFirst": "Save the profile first",
    "errors.saveCampaignFirst": "Save the campaign first",
    "errors.formNotFound": "Form not found",
    "errors.formHasApplications": "This form already has submitted applications",
    "errors.invalidStatus": "Invalid status",
    "errors.applicationsNotFound": "Applications not found",
    "errors.someApplicationsNotFound": "One or more applications were not found",
    "errors.studentNotFound": "Student not found",
    "errors.studentHasAccount": "The student already has an account, no link is needed",
    "errors.studentInfoRequired": "Fill in the student information",
    "errors.studentNotAmongChildren": "The student was not found among your children",
    "errors.profilesNotFound": "One or more profiles were not found",
    "errors.profileAlreadyInCampaign": "The profile already belongs to another campaign",
    "errors.teachersNotFound": "One or more teachers were not found",
    "errors.groupNotFound": "Group not found",
    "errors.noChanges": "No changes",
    "errors.newsNotFound": "News item not found",
    "errors.campaignTitleRequired": "Enter the campaign name",
    "errors.invalidDate": "Invalid date",
    "errors.groupTitleRequired": "Enter the group name",
    "errors.selectOneApplication": "Select at least one application",
    "errors.newsTitleRequired": "Enter the news title",
    "errors.tagRequired": "Enter a tag",
    "errors.contentRequired": "Enter the news text",
    "errors.profileTitleRequired": "Enter the profile name",
    "errors.profileHasApplications": "This profile already has submitted applications",
    "errors.cannotChangeOwnRole": "You cannot change your own role",
    "errors.userNotFound": "User not found",

    "about.body": `
        <h1>About the site</h1>
        <p class="mt-4 text-black/70">
            This is the single admissions portal of the Scientific Lyceum of Zhytomyr Polytechnic. It was created to make
            admissions simple and transparent: you can submit an application, track its status, and receive exam results
            online.
        </p>

        <h2 class="mt-10">How the portal works</h2>
        <ol class="mt-3 list-decimal space-y-2 pl-6 text-black/70">
            <li>Sign in with Google</li>
            <li>Fill in the application and attach the required documents.</li>
            <li>Track the application status in your account.</li>
            <li>Receive your entrance exam results.</li>
        </ol>

        <h2 class="mt-10">Site development</h2>
        <p class="mt-4 text-black/70">
            The site was developed by
            <a href="https://www.nshis.com" target="_blank" rel="noopener noreferrer" class="name-link">Nazar Shukhardin</a>.
            Built with the Astro framework.
        </p>
        <p class="mt-3 text-black/70">
            Pages are rendered on the server, data is stored in the Cloudflare D1 database, and uploaded documents are
            stored in R2. The interface runs on a modern stack:
        </p>
        <ul class="mt-3 list-disc space-y-2 pl-6 text-black/70">
            <li>
                <a class="text-liceum-blue underline" href="https://astro.build" target="_blank" rel="noopener">Astro</a>
                - server-side page rendering with minimal client-side JavaScript.
            </li>
            <li>
                <a class="text-liceum-blue underline" href="https://svelte.dev" target="_blank" rel="noopener">Svelte 5</a>
                - interactive parts: application forms, news editors, and tables.
            </li>
            <li>
                <a class="text-liceum-blue underline" href="https://tailwindcss.com" target="_blank" rel="noopener">Tailwind CSS 4</a>
                - interface styling.
            </li>
            <li>
                <a class="text-liceum-blue underline" href="https://workers.cloudflare.com" target="_blank" rel="noopener">Cloudflare Workers</a>
                - hosting and server-side code execution.
            </li>
            <li>
                <a class="text-liceum-blue underline" href="https://developers.cloudflare.com/d1/" target="_blank" rel="noopener">Cloudflare D1</a>
                and
                <a class="text-liceum-blue underline" href="https://orm.drizzle.team" target="_blank" rel="noopener">Drizzle ORM</a>
                - the database for applications, news, and users.
            </li>
            <li>
                <a class="text-liceum-blue underline" href="https://www.typescriptlang.org" target="_blank" rel="noopener">TypeScript</a>
                - type safety.
            </li>
            <li>Google OAuth for signing in to the account with a Google account.</li>
        </ul>
        <p class="mt-4 text-black/70">
            Events and errors are collected through Cloudflare Analytics Engine, and the application is built and checked
            with Vite and Prettier.
        </p>

        <h2 class="mt-10">Contact</h2>
        <p class="mt-3 text-black/70">
            Learn more about the lyceum on the
            <a class="text-liceum-blue underline" href="https://lyceum.ztu.edu.ua/" target="_blank" rel="noopener">official website</a>.
            Have questions? See the
            <a class="text-liceum-blue underline" href="/contacts">contacts</a>
            or write to
            <a class="text-liceum-blue underline" href="mailto:liceum@ztu.edu.ua">liceum@ztu.edu.ua</a>.
        </p>
    `,

    "privacy.body": `
        <h1>Privacy policy</h1>
        <p class="mt-2 text-sm text-black/60">Updated 30 October 2026</p>

        <h2 class="mt-10">What data we collect</h2>
        <ul class="mt-3 list-disc space-y-2 pl-6 text-black/70">
            <li>Your name, email address, and profile photo from your Google account.</li>
            <li>Application data: contact information, education details, the selected profile, and exam choices.</li>
            <li>Documents you upload while submitting an application.</li>
            <li>Technical data about the session and the operation of the Portal.</li>
        </ul>

        <h2 class="mt-10">Why we use the data</h2>
        <p class="mt-3 text-black/70">
            We process data to receive and review your application, contact you about admissions, and ensure the
            operation and security of the Portal.
        </p>

        <h2 class="mt-10">Legal basis</h2>
        <p class="mt-3 text-black/70">
            Data is processed with your consent and only to the extent necessary to review the application and comply
            with legal requirements.
        </p>

        <h2 class="mt-10">Storage</h2>
        <p class="mt-3 text-black/70">
            Data is stored on Cloudflare infrastructure for the period required for the admission campaign and compliance
            with legal requirements. After that, it is deleted or anonymised.
        </p>

        <h2 class="mt-10">Data sharing</h2>
        <p class="mt-3 text-black/70">
            We do not sell your data. Data may only be shared with service providers needed to operate the Portal
            (including Google for sign-in and Cloudflare for hosting) or with authorised authorities as required by law.
        </p>

        <h2 class="mt-10">Your rights</h2>
        <p class="mt-3 text-black/70">
            You can access your data, correct it, delete it, or withdraw your consent to processing. To do so, write to
            <a class="text-liceum-blue underline" href="mailto:liceum@ztu.edu.ua">liceum@ztu.edu.ua</a>.
        </p>

        <h2 class="mt-10">Cookies</h2>
        <p class="mt-3 text-black/70">
            The Portal uses session cookies for signing in to your account. We do not use them for advertising tracking.
        </p>

        <h2 class="mt-10">Changes to this policy</h2>
        <p class="mt-3 text-black/70">
            We may update this policy. The current version is always available on this page.
        </p>
    `,

    // TODO(i18n-review): English Terms of Service are a translation of the Ukrainian document and need legal review.
    "terms.body": `
        <h1>Terms of service</h1>
        <p class="mt-2 text-sm text-black/60">Updated 30 October 2026</p>

        <h2 class="mt-10">General provisions</h2>
        <p class="mt-3 text-black/70">
            By using the lyceum admissions portal, you agree to these terms. If you do not agree with them, please do not
            use the Portal.
        </p>

        <h2 class="mt-10">Account</h2>
        <p class="mt-3 text-black/70">
            You sign in to the Portal through a Google account. You are responsible for the accuracy of the information
            you provide and for keeping access to your account secure. Do not share access with third parties.
        </p>

        <h2 class="mt-10">Submitting applications</h2>
        <p class="mt-3 text-black/70">
            An application submitted through the Portal is an official request to the institution. Submitting an
            application does not guarantee admission: the admissions committee makes the decision in accordance with the
            admission rules.
        </p>

        <h2 class="mt-10">Rules of use</h2>
        <ul class="mt-3 list-disc space-y-2 pl-6 text-black/70">
            <li>Provide truthful and up-to-date information.</li>
            <li>Do not submit applications on behalf of others without their consent.</li>
            <li>Do not attempt to disrupt the Portal or access other people's data.</li>
            <li>Do not use automated tools for bulk data collection.</li>
        </ul>

        <h2 class="mt-10">Liability</h2>
        <p class="mt-3 text-black/70">
            The Portal is provided "as is". We strive for uninterrupted operation but do not guarantee the absence of
            technical failures. If you notice an error, contact the administration.
        </p>

        <h2 class="mt-10">Changes to these terms</h2>
        <p class="mt-3 text-black/70">
            We may update these terms. The current version is always available on this page.
        </p>

        <h2 class="mt-10">Contacts</h2>
        <p class="mt-3 text-black/70">
            Send questions about these terms to
            <a class="text-liceum-blue underline" href="mailto:liceum@ztu.edu.ua">liceum@ztu.edu.ua</a>.
        </p>
    `,
};
