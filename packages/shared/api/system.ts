// System routes (§8 System). POST /api/clerk/webhook takes Clerk's own payload,
// verified with Clerk's SDK, so it has no schema here.
import { z } from "zod";

// GET /api/posthog-config
export const posthogConfigResponseSchema = z.object({
  key: z.string().min(1),
  host: z.url(),
});
export type PosthogConfigResponse = z.infer<typeof posthogConfigResponseSchema>;
