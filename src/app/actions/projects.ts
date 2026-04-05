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

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectActionState =
  | { error: string }
  | { fieldErrors: Record<string, string> }
  | undefined;

// ─── Validation helpers ───────────────────────────────────────────────────────

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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

  if (typeof url !== "string" || !url.trim()) {
    fieldErrors.url = "URL is required.";
  } else if (!isValidHttpUrl(url.trim())) {
    fieldErrors.url = "Enter a valid URL starting with http:// or https://";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const projectName = (name as string).trim();
  const projectUrl = (url as string).trim();

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
