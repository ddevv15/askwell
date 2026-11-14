// Owner routes: projects CRUD and widget config (§8 Owner).
import { z } from "zod";
import { MAX_PROJECT_NAME_LENGTH } from "../../limits";
import { widgetConfigSchema } from "../widget";
import { idSchema, publicKeySchema, timestampSchema } from "./common";

export const projectSchema = z.object({
  id: idSchema,
  name: z.string(),
  publicKey: publicKeySchema,
  messagesUsed: z.int().nonnegative(),
  periodStart: timestampSchema,
  createdAt: timestampSchema,
});
export type Project = z.infer<typeof projectSchema>;

const projectNameSchema = z.string().trim().min(1, "Name is required").max(MAX_PROJECT_NAME_LENGTH);

// GET /api/projects
export const listProjectsResponseSchema = z.object({ projects: z.array(projectSchema) });
export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;

// POST /api/projects
export const createProjectRequestSchema = z.strictObject({ name: projectNameSchema });
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export const createProjectResponseSchema = z.object({ project: projectSchema });
export type CreateProjectResponse = z.infer<typeof createProjectResponseSchema>;

// PATCH /api/projects/:id (rename only)
export const updateProjectRequestSchema = z.strictObject({ name: projectNameSchema });
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export const updateProjectResponseSchema = z.object({ project: projectSchema });
export type UpdateProjectResponse = z.infer<typeof updateProjectResponseSchema>;

// DELETE /api/projects/:id → DeleteResponse (./common)

// PATCH /api/projects/:id/config (Pro only; 402 plan_required on Free)
export const updateWidgetConfigRequestSchema = widgetConfigSchema
  .partial()
  .strict()
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: "Change at least one field",
  });
export type UpdateWidgetConfigRequest = z.infer<typeof updateWidgetConfigRequestSchema>;
export const updateWidgetConfigResponseSchema = z.object({ config: widgetConfigSchema });
export type UpdateWidgetConfigResponse = z.infer<typeof updateWidgetConfigResponseSchema>;
