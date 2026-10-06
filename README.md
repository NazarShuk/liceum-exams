[https://liceum-exams.nazarshuxardinissuper.workers.dev/](https://liceum-exams.nazarshuxardinissuper.workers.dev/)


separate table for subjects, profiles, exams, forms, groups, різні вступні компанії
admin role for users, can create groups, subjects
manager - principal
class teacher

groups with names (10-A, 10-B ...)

---
opencode -s ses_eed355d17ffehu4EqD33EsuTMk
# Plan: School Entry System Structure

Parents log in (Google OAuth), pick a grade → pick a profile → fill the admin-designed form,
wait for exams, then see published results. Admins manage campaigns, profiles, subjects, forms,
exams and groups; teachers see their groups and enter exam results.

## Key decisions

- **Option A: one campaign per grade.** A campaign = year + grade ("Вступ 2027 · 8 клас",
  "Вступ 2027 · 10 клас"). Nothing shares data between grades (profiles, forms, exams, groups
  all differ), so nesting everything under campaign costs no extra tables.
  `campaigns.year` allows a "all 2027 applicants" filter across grades.
- **Profiles belong to a campaign** (year-scoped snapshots); **subjects** are a global
  reusable dictionary (english profile → media-literacy + culture-dialogues, math → 1).
- **One form per profile**, forms tied to a campaign; the same form can be reused by
  several profiles.
- **Exams are taken separately per subject**; results are entered **manually** by
  teachers or admins and only visible to parents after being published.
- **File uploads stored in Cloudflare R2**, metadata in D1.
- **Roles: admin, parent, teacher.** Applicants are records (`role: applicant`) linked to a
  parent, not logins. Teacher views live inside `/cabinet` — no separate `/teacher` area.
- One student applies to **one profile per campaign**; a parent can have several children,
  each with their own application. A student who didn't get in last year simply appears in
  the preselect list (via `users.parentId`).
- Acceptance is a **manual accept/reject** decision by an admin (informed by, but not
  computed from, results).

## 1. Data model (Drizzle / D1)

```
campaigns        id, name "Вступ 2027", year, grade (8 | 10, plain integer),
                 opensAt, closesAt, status: draft|open|closed
subjects         id, name, description                     ← global dictionary
profiles         id, campaignId → campaigns, title, slug,
                 description, orderIndex, formId → forms   ← belongs to ONE campaign
profile_subjects profileId + subjectId  (m2m; english → 2 subjects, math → 1)

forms            (existing) + campaignId (nullable for old rows);
                 field schema (text|number|date|file) unchanged, "file" becomes functional

applications     (existing) + campaignId, profileId,
                 status: draft → submitted → in_review → accepted | rejected
                 answers JSON stays as-is;
                 group membership is a separate table, not a status

exams            id, campaignId, subjectId → subjects,
                 title, startsAt, location, notes
exam_results     id, examId + applicationId (unique pair),
                 score, comment, enteredById, published: bool
                 ← manually typed in; parent sees only published rows

groups           id, campaignId, name "10-А", teacherId → users (class teacher)
group_members    groupId + applicationId (unique)

files            id, applicationId, fieldSlug, r2Key, filename,
                 contentType, size, createdAt
                 ← R2 holds bytes; D1 holds metadata; answers JSON holds a pointer
```

## 2. Application flow (parent)

1. **`/cabinet/application/new`** — pick grade (open campaigns) → profile cards showing
   their subject focuses (chips)
2. **Form page** — parent info + student info (preselect from existing children via
   `users.parentId`, or "new student") + the profile's form fields incl. uploads →
   `submitForm`
3. **`/cabinet`** — applications list with status badges
4. **`/cabinet/application/[id]`** — status detail: exam schedule per subject of the chosen
   profile, published results, assigned group

## 3. Admin area (`/admin`)

```
/campaigns                  create year+grade, open/close, set dates
/campaigns/[id]/profiles    profiles + subject focus + form assignment
/subjects                   global dictionary CRUD
/forms                      existing editor (attach to campaign)
/applications               filter by campaign/profile/status, view answers,
                            download files, mark accepted/rejected
/exams                      create exams per subject, enter/edit results manually,
                            toggle publish
/groups                     create groups, assign teacher, move accepted students in
```

## 4. Teacher views (in `/cabinet`)

- **My groups** — groups where `teacherId = me`, with member lists
- **Exams & results** — enter/edit results for exams; admins see all, teachers see theirs

Assumption: teachers can enter results for any exam of the school year; no per-subject
teacher assignment yet (add later via a `subject_teachers` join if needed).

## 5. Infrastructure & fixes

- Add **R2 binding** to `wrangler.jsonc` + authenticated download route
  `/api/files/[id]` (owner or admin only)
- **Middleware hardening**: current code crashes on `/admin` when `locals.user` is
  undefined (`src/middleware.ts:29`); needs proper per-role guards
  (admin → `/admin`, teacher sections, parent → `/cabinet`)
- Tighten `submitForm` validation (existing `TODO` — field types/regex currently
  unchecked) and replace `forms.visibility: public` with campaign-scoped publishing

## 6. Build order

| # | Step | Depends on |
|---|------|-----------|
| 1 | Schema + migration (all new tables, FKs on forms/applications) | — |
| 2 | Middleware/role guards | 1 |
| 3 | Admin: campaigns → subjects → profiles UIs | 1 |
| 4 | Parent: campaign/profile picker + preselect + status page | 1–3 |
| 5 | R2 uploads (binding, action, download route) | 1 |
| 6 | Exams + manual result entry + publish | 1, 3 |
| 7 | Groups + teacher cabinet sections | 1, 3 |
