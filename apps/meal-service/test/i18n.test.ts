import assert from "node:assert/strict";
import test from "node:test";
import { getTranslations, normalizeLanguage } from "../src/lib/i18n";

test("language defaults to vi and accepts only vi/en", () => {
  assert.equal(normalizeLanguage(undefined), "vi");
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("fr"), "vi");
});

test("dictionary exposes public feedback/kitchen note labels", () => {
  assert.equal(typeof getTranslations("vi").public.feedbackKitchenNote, "string");
  assert.equal(getTranslations("vi").public.feedbackKitchenNote.length > 0, true);
  assert.equal(getTranslations("en").public.feedbackKitchenNote, "Feedback / Kitchen Note");
});
