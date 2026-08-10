import test from "node:test";
import assert from "node:assert/strict";
import { validateQrValue } from "../src/lib/qr-access-core.ts";

const records = [
  { qrValue: "active-pass", status: "active" },
  { qrValue: "pending-pass", status: "pending" },
  { qrValue: "consumed-session", status: "consumed" },
];

test("accepts an active QR record", () => {
  const result = validateQrValue("active-pass", records);
  assert.equal(result.ok, true);
  assert.equal(result.reason, "valid");
  assert.equal(result.record?.qrValue, "active-pass");
});

test("rejects pending and consumed access", () => {
  assert.equal(validateQrValue("pending-pass", records).reason, "pending");
  assert.equal(validateQrValue("consumed-session", records).reason, "consumed");
});

test("rejects empty and unknown QR values", () => {
  assert.equal(validateQrValue("  ", records).reason, "empty");
  assert.equal(validateQrValue("missing", records).reason, "notFound");
});
