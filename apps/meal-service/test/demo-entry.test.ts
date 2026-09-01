import test from "node:test";
import assert from "node:assert/strict";
import { demoDestination } from "../src/components/demo-entry";
import { DEMO_ROLE_GALLERY_IMAGES, DEMO_ROLE_GALLERY_ORDER, demoRoleGalleryItems } from "../src/lib/demo-role-gallery";
import { getTranslations } from "../src/lib/locale";

test("mỗi nút Demo mở thẳng màn nghiệp vụ tương ứng", () => {
  assert.equal(demoDestination("nurse"), "/bao-suat");
  assert.equal(demoDestination("dietitian"), "/thuc-don");
  assert.equal(demoDestination("kitchen"), "/bep");
  assert.equal(demoDestination("sonde"), "/bep");
  assert.equal(demoDestination("admin"), "/quan-ly");
});


test("/demo role gallery exposes patient first and all committed guide assets", () => {
  assert.deepEqual(DEMO_ROLE_GALLERY_ORDER, ["patient", "nurse", "dietitian", "kitchen", "admin"]);
  assert.deepEqual(Object.values(DEMO_ROLE_GALLERY_IMAGES), [
    "/demo/role-guides/patient.jpg",
    "/demo/role-guides/nurse.jpg",
    "/demo/role-guides/dietitian.jpg",
    "/demo/role-guides/kitchen.jpg",
    "/demo/role-guides/admin.jpg",
  ]);

  const items = demoRoleGalleryItems(getTranslations("vi").public.roleGallery, [
    { key: "patient", label: "Patient", description: "Public", href: "/?patient=1" },
    { key: "nurse", label: "Nurse", description: "Staff", email: "nurse@demo.local", password: "secret" },
    { key: "dietitian", label: "Dietitian", description: "Staff", email: "dietitian@demo.local", password: "secret" },
    { key: "kitchen", label: "Kitchen", description: "Staff", email: "kitchen@demo.local", password: "secret" },
    { key: "admin", label: "Admin", description: "Staff", email: "admin@demo.local", password: "secret" },
  ]);

  assert.equal(items[0]?.role, "patient");
  assert.equal(items[0]?.entry?.href, "/?patient=1");
  assert.notEqual(items[0]?.entry?.href, "/bao-suat");
  assert.equal(items.length, 5);
});
