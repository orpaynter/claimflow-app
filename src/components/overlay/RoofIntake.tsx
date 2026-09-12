import { HelpCircle, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLot } from "@/lib/house/store";

export function RoofIntake() {
  const hydrateBook = useLot((s) => s.hydrateBook);
  const hydrateStorms = useLot((s) => s.hydrateStorms);
  const startRoof = useLot((s) => s.startRoof);
  const loading = useLot((s) => s.loading);
  const loadError = useLot((s) => s.loadError);
  const operatorName = useLot((s) => s.operatorName);
  const setGuideOpen = useLot((s) => s.setGuideOpen);
  const setBookOpen = useLot((s) => s.setBookOpen);
  const book = useLot((s) => s.book);

  const [name, setName] = useState(operatorName);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    hydrateBook();
    void hydrateStorms();
  }, [hydrateBook, hydrateStorms]);

  useEffect(() => {
    if (operatorName && !name) setName(operatorName);
  }, [operatorName, name]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-y-auto px-5 pt-[calc(8.5rem+env(safe-area-inset-top))] pb-40">
      <form
        id="roof-form"
        className="pointer-events-auto stagger mx-auto w-full max-w-md pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          startRoof({ name, address, note, files });
        }}
      >
        <p className="max-w-prose text-lg leading-8 text-muted">
          Type the address. Drop photos if you have them. Put your name on the lock.
        </p>
        <p className="mt-3 max-w-prose text-base leading-7 text-muted">
          AI drafts. You still own it.
        </p>

        <label className="mt-8 block text-sm text-muted" htmlFor="roof-name">
          Your name
        </label>
        <input
          id="roof-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="The name that signs the package"
          className="mt-2 h-12 w-full rounded-lg bg-surface px-4 text-base text-fg shadow-border placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />

        <label className="mt-6 block text-sm text-muted" htmlFor="roof-address">
          Street address
        </label>
        <input
          id="roof-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="street-address"
          placeholder="Any U.S. street address"
          className="mt-2 h-12 w-full rounded-lg bg-surface px-4 text-base text-fg shadow-border placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />

        <label className="mt-6 block text-sm text-muted" htmlFor="roof-note">
          What happened
        </label>
        <textarea
          id="roof-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Hail, wind, leak — in your words. Optional."
          className="mt-2 w-full rounded-lg bg-surface px-4 py-3 text-base leading-6 text-fg shadow-border placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />

        <label className="mt-6 flex min-h-12 cursor-pointer items-center gap-3 rounded-lg bg-surface px-4 text-base text-fg shadow-border">
          <Paperclip className="size-5 text-muted" />
          {files.length ? `${files.length} photo(s) attached` : "Attach photos"}
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            className="sr-only"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 8))}
          />
        </label>

        {loadError ? <p className="mt-5 text-base leading-6 text-danger">{loadError}</p> : null}

        <p className="mt-8 text-sm leading-6 text-muted">
          Exposure is not a damage determination. Nothing files itself.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => setGuideOpen(true)}>
            <HelpCircle className="size-4" />
            How this works
          </Button>
          <Button type="button" variant="ghost" onClick={() => setBookOpen(true)}>
            Your houses{book.length ? ` (${book.length})` : ""}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.location.assign("/?install=1")}>
            Install on phone
          </Button>
        </div>
      </form>
      <div className="pointer-events-auto fixed inset-x-0 bottom-[4.75rem] z-30 px-4 pb-3">
        <div className="mx-auto max-w-md">
          <Button type="submit" form="roof-form" className="h-12 w-full" disabled={loading}>
            {loading ? "Finding the house" : "Open this roof"}
          </Button>
        </div>
      </div>
    </div>
  );
}
