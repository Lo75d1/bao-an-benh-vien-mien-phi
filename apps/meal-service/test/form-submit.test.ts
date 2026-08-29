import assert from "node:assert/strict";
import test from "node:test";
import { isDirectFormSubmit } from "../src/lib/form-submit";

test("accepts a submit originating from the form itself", () => {
  const reportForm = {} as EventTarget;
  assert.equal(isDirectFormSubmit(reportForm, reportForm), true);
});

test("ignores a submit bubbling through the React tree from a dialog form", () => {
  const reportForm = {} as EventTarget;
  const dialogForm = {} as EventTarget;
  assert.equal(isDirectFormSubmit(dialogForm, reportForm), false);
});
