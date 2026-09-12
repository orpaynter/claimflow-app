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
    <div className="pointer-events-none absolute inset-0 z-20 overflow-y-auto px-4 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-[9.5rem]">
      <form
        id="roof-form"
        className="pointer-events-auto mx-auto w-full max-w-lg pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          startRoof({ name, address, note, files });
        }}
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-muted">
          <span className="grid size-8 place-items-center rounded-sm bg-navy text-sm font-semibold tracking-tight text-fg">OP</span>
          ClaimFlow
        </p>
        <h1 className="font-display mt-4 text-4xl leading-tight text-fg">Your roof</h1>
        <p className="mt-3 text-base leading-relaxed text-fg">
          Type the address. Drop photos. Put your name on the lock. AI drafts a package. You still own it.
        </p>

        <label className="mt-5 block text-sm font-semibold text-fg" htmlFor="roof-name">
          Your name
        </label>
        <input
          id="roof-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="The name that signs the package"
          className="mt-1 h-12 w-full rounded-md bg-surface px-3 text-base text-fg shadow-border placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />

        <label className="mt-4 block text-sm font-semibold text-fg" htmlFor="roof-address">
          Street address
        </label>
        <input
          id="roof-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="street-address"
          placeholder="Any U.S. street address"
          className="mt-1 h-12 w-full rounded-md bg-surface px-3 text-base text-fg shadow-border placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />

        <label className="mt-4 block text-sm font-semibold text-fg" htmlFor="roof-note">
          What happened
        </label>
        <textarea
          id="roof-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Hail, wind, leak — in your words. Optional."
          className="mt-1 w-full rounded-md bg-surface px-3 py-3 text-base text-fg shadow-border placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />

        <label className="mt-4 flex min-h-12 cursor-pointer items-center gap-2 rounded-md bg-surface px-3 text-base text-fg">
          <Paperclip className="size-5" />
          {files.length ? `${files.length} photo(s) attached` : "Attach photos"}
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            className="sr-only"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 8))}
          />
        </label>

        {loadError ? <p className="mt-3 text-base text-danger">{loadError}</p> : null}

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Exposure is not a damage determination. The package is a draft until you lock it. Nothing files itself.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
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
      <div className="pointer-events-auto fixed inset-x-0 bottom-[4.75rem] z-30 px-3 pb-2">
        <div className="mx-auto max-w-lg">
          <Button type="submit" form="roof-form" className="h-12 w-full" disabled={loading}>
            {loading ? "Finding the house" : "Open this roof"}
          </Button>
        </div>
      </div>
    </div>
  );
}
