"use server";

// Project CRUD Server Actions — SiteLens
//
// Data access: Supabase server client (anon key + authenticated session).
// All queries go through RLS — users can only read/write their own projects.
// Prisma will replace direct Supabase queries once DATABASE_URL is configured.
//
// ID generation: crypto.randomUUID() (UUID v4).
// The Prisma schema uses @default(cuid()) which is client-generated;
// since we're bypassing Prisma here, we use randomUUID() as a compatible
// alternative — both are unique string identifiers.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  assertSafeExternalHttpUrl,
  isUnsafeExternalUrlError,
} from "@/lib/security/url";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectActionState =
  | { error: string }
  | { fieldErrors: Record<string, string> }
  | undefined;

// ─── createProject ────────────────────────────────────────────────────────────

export async function createProject(
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const name = formData.get("name");
  const url = formData.get("url");

  // Validate fields
  const fieldErrors: Record<string, string> = {};

  if (typeof name !== "string" || !name.trim()) {
    fieldErrors.name = "Project name is required.";
  } else if (name.trim().length > 100) {
    fieldErrors.name = "Project name must be 100 characters or fewer.";
  }

  let projectUrl: string | null = null;

  if (typeof url !== "string" || !url.trim()) {
    fieldErrors.url = "URL is required.";
  } else {
    try {
      projectUrl = await assertSafeExternalHttpUrl(url.trim());
    } catch (error) {
      fieldErrors.url = isUnsafeExternalUrlError(error)
        ? error.message
        : "Enter a valid public URL.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!projectUrl) {
    return { fieldErrors: { url: "URL is required." } };
  }

  const projectName = (name as string).trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a project." };
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("Project").insert({
    id,
    name: projectName,
    url: projectUrl,
    userId: user.id,
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    console.error("[createProject]", error);
    return { error: "Failed to create project. Please try again." };
  }

  redirect(`/dashboard/${id}`);
}

// ─── deleteProject ────────────────────────────────────────────────────────────

export async function deleteProject(projectId: string): Promise<never> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("Project")
    .delete()
    .eq("id", projectId);

  if (error) {
    console.error("[deleteProject]", error);
  }

  redirect("/dashboard");
}
