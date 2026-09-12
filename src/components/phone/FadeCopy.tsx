import { cn } from "@/lib/cn";

export function FadeCopy({
  text,
  className,
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  as?: "p" | "h1" | "h2" | "span";
}) {
  return (
    <Tag key={text} className={cn("fade-copy", className)}>
      {text}
    </Tag>
  );
}
