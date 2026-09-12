export function readLotParam(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("at")?.trim() ?? "";
}

export function writeLotParam(address: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (address) url.searchParams.set("at", address);
  else url.searchParams.delete("at");
  window.history.replaceState(window.history.state, "", url);
}
