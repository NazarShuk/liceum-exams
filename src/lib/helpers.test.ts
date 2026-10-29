import assert from "node:assert/strict";
import { test } from "node:test";
import { dbTimestamp, parseDbDate } from "./dates";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, uploadError } from "./uploads";

const fileOf = (size: number, type: string) => ({ size, type }) as unknown as File;

test("parseDbDate reads SQLite timestamps as UTC", () => {
    assert.equal(parseDbDate("2026-10-28 12:34:56").toISOString(), "2026-10-28T12:34:56.000Z");
    assert.equal(parseDbDate("2026-10-28T12:34:56Z").toISOString(), "2026-10-28T12:34:56.000Z");
    const date = new Date();
    assert.equal(parseDbDate(date).getTime(), date.getTime());
});

test("dbTimestamp keeps the SQLite layout in UTC", () => {
    assert.equal(dbTimestamp(new Date("2026-10-28T12:34:56.789Z")), "2026-10-28 12:34:56");
});

test("uploadError accepts allowed files up to the size limit", () => {
    assert.ok(ALLOWED_UPLOAD_TYPES.includes("application/pdf"));
    assert.equal(uploadError(fileOf(MAX_UPLOAD_BYTES, "application/pdf")), null);
});

test("uploadError rejects oversized and unsupported files", () => {
    assert.match(uploadError(fileOf(MAX_UPLOAD_BYTES + 1, "application/pdf")) ?? "", /завеликий/);
    assert.match(uploadError(fileOf(1024, "text/html")) ?? "", /тип/);
});
