import { cn } from "../../lib/utils";

export default function Avatar({ name, size = "md", className }) {
  const initials = (name || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeMap = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };

  return (
    <span
      aria-label={`${name} avatar`}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold",
        sizeMap[size] || sizeMap.md,
        className
      )}
    >
      {initials}
    </span>
  );
}
