import { cn } from "../../lib/utils";

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-4 transition-all hover:border-teal-500/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
