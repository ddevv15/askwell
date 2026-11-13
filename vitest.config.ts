import { defineConfig } from "vitest/config";

// One Vitest run across the workspace. Each package is a project; a package
// without tests is fine (passWithNoTests).
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
    passWithNoTests: true,
  },
});
