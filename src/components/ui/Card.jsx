import { cn } from "../../lib/utils";

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn("rounded-xl bg-card border border-border shadow-sm p-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}
