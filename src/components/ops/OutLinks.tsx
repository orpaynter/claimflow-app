import { ExternalLink } from "lucide-react";
import type { OutLink } from "@/lib/geo/links";
import { cn } from "@/lib/cn";

const GROUP: Record<OutLink["group"], string> = {
  lot: "Lot",
  weather: "Weather",
  records: "Records",
  ops: "Ops",
};

const ORDER: OutLink["group"][] = ["lot", "weather", "records", "ops"];

export function OutLinks({
  links,
  groups,
  className,
}: {
  links: OutLink[];
  groups?: OutLink["group"][];
  className?: string;
}) {
  const allow = groups ? new Set(groups) : null;
  const filtered = allow ? links.filter((l) => allow.has(l.group)) : links;
  const byGroup = ORDER.map((g) => [g, filtered.filter((l) => l.group === g)] as const).filter(
    ([, items]) => items.length > 0,
  );

  if (byGroup.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {byGroup.map(([g, items]) => (
        <div key={g}>
          <p className="text-xs tracking-[0.16em] text-muted uppercase">{GROUP[g]}</p>
          <ul className="mt-1">
            {items.map((l) => (
              <li key={l.id}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-between gap-3 rounded-md px-1 text-sm text-fg transition-colors duration-150 hover:bg-bg"
                >
                  <span>{l.label}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-subtle" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
