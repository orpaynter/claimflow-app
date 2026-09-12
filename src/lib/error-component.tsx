import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Something broke. Reload and try this roof again.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-xl font-semibold">ClaimFlow hit a wall</h1>
      <p className="max-w-md text-base leading-relaxed text-muted">{errorMessage(error)}</p>
      <button
        type="button"
        className="mt-2 inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-4 text-base font-semibold text-accent-fg"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </main>
  );
}
