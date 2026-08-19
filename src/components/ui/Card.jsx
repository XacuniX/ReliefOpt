import { cn } from "../../lib/utils";

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30 transition-all hover:border-teal-500/40 dark:hover:border-teal-500/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
