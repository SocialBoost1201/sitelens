// New project page — SiteLens
// Form for registering a new website for auditing.
// At MVP, one URL per project (Assumption A-05).

import NewProjectForm from "./new-project-form";

export const metadata = {
  title: "New Project — SiteLens",
};

export default function NewProjectPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <a
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to projects
        </a>
        <h1 className="mt-3 text-xl font-semibold text-gray-900">
          New project
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a website to start auditing its performance, SEO, and
          accessibility.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <NewProjectForm />
      </div>
    </div>
  );
}
