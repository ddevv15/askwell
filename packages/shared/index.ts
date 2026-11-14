// Contract shared by apps/web and apps/widget: types, API shapes, plan limits.
// Full entry (with zod schemas) for apps/web. The widget uses `./constants`.
export * from "./constants";
export * from "./schemas/enums";
export * from "./schemas/errors";
export * from "./schemas/widget";
export * from "./schemas/api/common";
export * from "./schemas/api/widget";
export * from "./schemas/api/projects";
export * from "./schemas/api/knowledge";
export * from "./schemas/api/conversations";
export * from "./schemas/api/system";
