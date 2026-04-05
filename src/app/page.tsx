export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-white px-6 dark:bg-zinc-950">
      <main className="w-full max-w-2xl py-24">
        <div className="mb-10 inline-block rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium tracking-widest text-zinc-400 uppercase dark:border-zinc-800 dark:text-zinc-500">
          Foundation Setup
        </div>

        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          SiteLens
        </h1>

        <p className="mb-12 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
          Unified website analysis and audit dashboard.
        </p>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-6 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
            Repository status
          </p>
          <p>
            This repository is in the <strong>foundation / setup phase</strong>.
            Architecture definition is in progress. Dashboard implementation has
            not started.
          </p>
        </div>
      </main>
    </div>
  );
}
