-- ============================================================
-- seed.sql — wipe & fill the liceum-exams database
-- Run AFTER migrations, e.g.:
--   npx wrangler d1 execute liceum-exams --local  --file seed.sql
--   npx wrangler d1 execute liceum-exams --remote --file seed.sql
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ---------- 1. wipe (children first) ----------
DELETE FROM applications;
DELETE FROM campaigns_to_profiles;
DELETE FROM profiles;
DELETE FROM forms;
DELETE FROM campaigns;
DELETE FROM users;
DELETE FROM sqlite_sequence
 WHERE name IN ('users','forms','profiles','campaigns','applications');

PRAGMA foreign_keys = ON;

-- ---------- 2. campaigns (unix SECONDS, as drizzle timestamp mode stores) ----------
INSERT INTO campaigns (id, title, begins_at, ends_at) VALUES
  (1, 'Вступна кампанія 2026', 1756684800, 1760918400),  -- 2025-09-01 .. 2025-10-20 (закрита)
  (2, 'Вступна кампанія 2027', 1788220800, 1793491200);  -- 2026-09-01 .. 2026-11-01 (активна)

-- ---------- 3. forms (однаковий schema — всі поля обов'язкові для submitForm) ----------
INSERT INTO forms (id, title, description, created_at, updated_at, `schema`) VALUES
(1, 'Заява на вступ на техніко-технологічний профіль',
    'Вступ на відділення техніко-технологічного напряму',
    '2026-01-15 10:00:00', '2026-06-01 12:00:00',
    '[{"slug":"birthDate","title":"Дата народження","type":"date","regex":"","max":0,"min":0},{"slug":"phone","title":"Телефон","type":"text","regex":"^\\+380[0-9]{9}$","max":0,"min":0},{"slug":"school","title":"Заклад освіти","type":"text","regex":"","max":0,"min":0},{"slug":"averageScore","title":"Середній бал документа","type":"number","regex":"","max":12,"min":1},{"slug":"certificate","title":"Скан документа про освіту","type":"file","regex":"","max":0,"min":0}]'),
(2, 'Заява на вступ на природно-математичний профіль',
    'Вступ на відділення природно-математичного напряму',
    '2026-01-15 10:05:00', '2026-06-01 12:00:00',
    '[{"slug":"birthDate","title":"Дата народження","type":"date","regex":"","max":0,"min":0},{"slug":"phone","title":"Телефон","type":"text","regex":"^\\+380[0-9]{9}$","max":0,"min":0},{"slug":"school","title":"Заклад освіти","type":"text","regex":"","max":0,"min":0},{"slug":"averageScore","title":"Середній бал документа","type":"number","regex":"","max":12,"min":1},{"slug":"certificate","title":"Скан документа про освіту","type":"file","regex":"","max":0,"min":0}]'),
(3, 'Заява на вступ на філологічний профіль',
    'Вступ на відділення філологічного напряму',
    '2026-01-15 10:10:00', '2026-06-01 12:00:00',
    '[{"slug":"birthDate","title":"Дата народження","type":"date","regex":"","max":0,"min":0},{"slug":"phone","title":"Телефон","type":"text","regex":"^\\+380[0-9]{9}$","max":0,"min":0},{"slug":"school","title":"Заклад освіти","type":"text","regex":"","max":0,"min":0},{"slug":"averageScore","title":"Середній бал документа","type":"number","regex":"","max":12,"min":1},{"slug":"certificate","title":"Скан документа про освіту","type":"file","regex":"","max":0,"min":0}]'),
(4, 'Заява на вступ на економічний профіль',
    'Вступ на відділення економічного напряму',
    '2026-01-15 10:15:00', '2026-06-01 12:00:00',
    '[{"slug":"birthDate","title":"Дата народження","type":"date","regex":"","max":0,"min":0},{"slug":"phone","title":"Телефон","type":"text","regex":"^\\+380[0-9]{9}$","max":0,"min":0},{"slug":"school","title":"Заклад освіти","type":"text","regex":"","max":0,"min":0},{"slug":"averageScore","title":"Середній бал документа","type":"number","regex":"","max":12,"min":1},{"slug":"certificate","title":"Скан документа про освіту","type":"file","regex":"","max":0,"min":0}]');

-- ---------- 4. profiles (formId завжди валідний: profile.formId === form.id) ----------
INSERT INTO profiles (id, title, description, formId) VALUES
  (1, 'техніко-технологічний', 'математика і інформатика',                1),
  (2, 'природно-математичний', 'математика, фізика, інформатика',          2),
  (3, 'філологічний',          'українська мова та література, іноземна',  3),
  (4, 'економічний',           'математика, географія, економіка',         4),
  (5, 'медичний',              'біологія, хімія, математика',              2);

-- ---------- 5. campaign <-> profile (профіль належить максимум одній кампанії) ----------
INSERT INTO campaigns_to_profiles (campaign_id, profile_id) VALUES
  (1, 1), (1, 2),                            -- 2026: два профілі
  (2, 3), (2, 4), (2, 5);                    -- 2027: решта

-- ---------- 6. users (2 admins, 3 teachers, 14 parents, 13 applicants) ----------
INSERT INTO users (id, external_id, firstName, lastName, middleName,
                   birthDate, phone, data, role, parent_id, created_at) VALUES
-- адміністратори
(1, NULL, 'Олена',   'Ковальчук',  'Сергіївна',      473380800, '+380671111111', NULL, 'admin', NULL, '2026-01-05 09:00:00'),
(2, NULL, 'Андрій',  'Шевчук',     'Петрович',       441676800, '+380672222222', NULL, 'admin', NULL, '2026-01-05 09:05:00'),
-- вчителі
(3, NULL, 'Ірина',   'Мельник',    'Володимирівна',  157766400, '+380673333333', '{"subject":"математика","cabinet":214}', 'teacher', NULL, '2026-01-08 08:30:00'),
(4, NULL, 'Тарас',   'Бондаренко', 'Ігорович',       252460800, '+380674444444', '{"subject":"інформатика","cabinet":307}', 'teacher', NULL, '2026-01-08 08:35:00'),
(5, NULL, 'Наталія', 'Гаврилюк',   'Романівна',      315532800, '+380675555555', '{"subject":"українська мова","cabinet":112}', 'teacher', NULL, '2026-01-08 08:40:00'),
-- батьки (id 6..19)
(6,  NULL, 'Оксана',   'Петренко',   'Іванівна',      473380800, '+380675001111', NULL, 'parent', NULL, '2026-01-12 10:14:00'),
(7,  NULL, 'Сергій',   'Марченко',   'Володимирович', 441676800, '+380675002222', NULL, 'parent', NULL, '2026-01-12 10:21:00'),
(8,  NULL, 'Галина',   'Лисенко',    'Петрівна',      504748800, '+380675003333', NULL, 'parent', NULL, '2026-01-14 19:02:00'),
(9,  NULL, 'Віктор',   'Ткаченко',   'Анатолійович',  536452800, '+380675004444', NULL, 'parent', NULL, '2026-01-19 21:47:00'),
(10, NULL, 'Марія',    'Романюк',    'Василівна',     567820800, '+380675005555', NULL, 'parent', NULL, '2026-02-02 12:33:00'),
(11, NULL, 'Дмитро',   'Коваленко',  'Олександрович', 599443200, '+380675006666', NULL, 'parent', NULL, '2026-02-03 14:09:00'),
(12, NULL, 'Світлана', 'Бойко',      'Миколаївна',    631152000, '+380675007777', NULL, 'parent', NULL, '2026-02-11 08:56:00'),
(13, NULL, 'Юрій',     'Захаренко',  'Ігорович',      662688000, '+380675008888', NULL, 'parent', NULL, '2026-02-18 17:41:00'),
(14, NULL, 'Алла',     'Поліщук',    'Леонідівна',    694224000, '+380675009999', NULL, 'parent', NULL, '2026-03-01 11:25:00'),
(15, NULL, 'Руслан',   'Мороз',      'Павлович',      725760000, '+380675010000', NULL, 'parent', NULL, '2026-03-04 20:18:00'),
(16, NULL, 'Тетяна',   'Гриценко',   'Юріївна',       757296000, '+380675011111', NULL, 'parent', NULL, '2026-03-09 09:44:00'),
(17, NULL, 'Ігор',     'Савченко',   'Романович',     788918400, '+380675012222', NULL, 'parent', NULL, '2026-03-15 13:07:00'),
(18, NULL, 'Олена',    'Данилюк',    'Михайлівна',    820454400, '+380675013333', NULL, 'parent', NULL, '2026-03-21 16:52:00'),
(19, NULL, 'Олег',     'Шкіль',      'Васильович',    852076800, '+380675014444', NULL, 'parent', NULL, '2026-03-22 18:30:00'),
-- абітурієнти (id 20..32, parent_id = id - 14)
(20, NULL, 'Дарина',    'Петренко',   'Оксанівна',      1262304000, '+380951000001', '{"school":"Ліцей №15","grade":9}',            'applicant', 6,  '2026-04-02 10:11:00'),
(21, NULL, 'Максим',    'Марченко',   'Володимирович',  1272672000, '+380951000002', '{"school":"Гімназія №7","grade":9}',           'applicant', 7,  '2026-04-02 10:22:00'),
(22, NULL, 'Софія',     'Лисенко',    'Петрівна',       1288483200, '+380951000003', '{"school":"Школа №42","grade":9}',             'applicant', 8,  '2026-04-05 15:38:00'),
(23, NULL, 'Богдан',    'Ткаченко',   'Анатолійович',   1293840000, '+380951000004', NULL,                                            'applicant', 9,  '2026-04-05 15:44:00'),
(24, NULL, 'Анастасія', 'Романюк',    'Василівна',      1262304000, '+380951000005', '{"school":"Ліцей №15","grade":9}',            'applicant', 10, '2026-04-11 09:29:00'),
(25, NULL, 'Кирило',    'Коваленко',  'Олександрович',  1304208000, '+380951000006', '{"school":"Гімназія №7","grade":9}',           'applicant', 11, '2026-04-11 09:37:00'),
(26, NULL, 'Вероніка',  'Бойко',      'Миколаївна',     1272672000, '+380951000007', NULL,                                            'applicant', 12, '2026-04-19 22:05:00'),
(27, NULL, 'Артем',     'Захаренко',  'Ігорович',       1293840000, '+380951000008', '{"school":"Школа №42","grade":9}',             'applicant', 13, '2026-04-25 12:16:00'),
(28, NULL, 'Юлія',      'Поліщук',    'Леонідівна',     1288483200, '+380951000009', NULL,                                            'applicant', 14, '2026-05-03 19:58:00'),
(29, NULL, 'Владислав', 'Мороз',      'Павлович',       1304208000, '+380951000010', '{"school":"Ліцей №15","grade":9}',            'applicant', 15, '2026-05-03 20:04:00'),
(30, NULL, 'Катерина',  'Гриценко',   'Юріївна',        1262304000, '+380951000011', NULL,                                            'applicant', 16, '2026-05-17 11:43:00'),
(31, NULL, 'Назар',     'Савченко',   'Романович',      1272672000, '+380951000012', '{"school":"Гімназія №7","grade":9}',           'applicant', 17, '2026-05-17 11:51:00'),
(32, NULL, 'Єва',       'Данилюк',    'Михайлівна',     1293840000, '+380951000013', NULL,                                            'applicant', 18, '2026-05-30 14:26:00');

-- ---------- 7. applications: 26 rows (20 submitted / 6 draft) ----------
-- Одна заява на дитину на кампанію: 13 абітурієнтів × 2 кампанії.
-- parent_id завжди = student_id - 14, профіль у межах кампанії,
-- campaign_id = кампанія вибраного профілю,
-- відповіді містять УСІ slug'и форми (це вимагає submitForm)
WITH RECURSIVE seq(n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 26
)
INSERT INTO applications
    (user_id, student_id, created_at, updated_at, form_id, profile_id, campaign_id, answers, state)
SELECT
    (20 + (n % 13)) - 14,                                        -- батько
    20 + (n % 13),                                               -- абітурієнт 20..32
    datetime('2026-06-15', '+' || (n * 2) || ' days'),
    datetime('2026-06-15', '+' || (n * 2 + (n % 5) + 1) || ' days'),
    CASE WHEN n <= 13 THEN CASE WHEN (n % 2) = 0 THEN 1 ELSE 2 END  -- форма відповідає профілю
                          ELSE CASE (n % 3) WHEN 2 THEN 2 ELSE 3 + (n % 3) END END,
    CASE WHEN n <= 13 THEN 1 + (n % 2) ELSE 3 + (n % 3) END,     -- профіль з кампанії
    CASE WHEN n <= 13 THEN 1 ELSE 2 END,                         -- кампанія
    json_object(
        'birthDate',     date('2010-01-01', (n % 500) || ' days'),
        'phone',         '+380' || (50 + (n % 40)) || printf('%07d', 1000000 + ((n * 7919) % 9000000)),
        'school',        CASE n % 3 WHEN 0 THEN 'Ліцей №15'
                                    WHEN 1 THEN 'Гімназія №7'
                                    ELSE 'Школа №42' END,
        'averageScore',  CAST(printf('%.1f', 7 + (n % 5) + ((n * 3) % 10) / 10.0) AS REAL),
        'certificate',   'doc_' || n || '.pdf'
    ),
    CASE WHEN n % 4 = 0 THEN 'draft' ELSE 'submitted' END
FROM seq;
