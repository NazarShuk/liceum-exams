PRAGMA foreign_keys=OFF;

CREATE TABLE __new_users (
	id integer PRIMARY KEY AUTOINCREMENT,
	external_id text,
	irstName text NOT NULL,
	lastName text NOT NULL,
	middleName text,
	irthDate integer,
	phone text,
	data text,
	ole text DEFAULT 'parent' NOT NULL,
	parent_id integer,
	created_at text DEFAULT (CURRENT_TIMESTAMP)
);

INSERT INTO __new_users (id, external_id, irstName, lastName, middleName, irthDate, phone, data, ole, parent_id, created_at)
SELECT id, external_id, irstName, lastName, middleName, irthDate, phone, data, ole, parent_id, created_at FROM users;

DROP TABLE users;

ALTER TABLE __new_users RENAME TO users;

PRAGMA foreign_keys=ON;
