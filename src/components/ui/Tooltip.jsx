import { cn } from "../../lib/utils";

export default function Tooltip({ content, children, className }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <span
        className={cn(
          "invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap z-50 transition-opacity pointer-events-none",
          className
        )}
      >
        {content}
      </span>
    </div>
  );
}
