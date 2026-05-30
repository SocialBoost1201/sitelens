// New project page — SiteLens

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import NewProjectForm from "./new-project-form"

export const metadata = {
  title: "New Project — SiteLens",
}

export default function NewProjectPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Back to projects
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a website to start auditing its performance, SEO, and accessibility.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Project details</CardTitle>
          <CardDescription className="text-xs">
            One URL per project. You can add more pages later via the crawler.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProjectForm />
        </CardContent>
      </Card>
    </div>
  )
}
