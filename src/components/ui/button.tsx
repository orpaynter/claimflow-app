import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "outline";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-base font-semibold",
        "transition-[opacity,transform,background-color,color] duration-150 ease-out",
        "active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "primary" && "bg-accent text-accent-fg hover:opacity-90",
        variant === "ghost" && "bg-transparent text-fg hover:bg-bg",
        variant === "outline" && "bg-surface text-fg shadow-border hover:shadow-border-hover",
        className,
      )}
      {...props}
    />
  );
}
