import { cn } from "../../lib/utils";

const sizes = {
  sm: "h-5 w-5 border-2",
  md: "h-9 w-9 border-[3px]",
  lg: "h-13 w-13 border-4",
};

export default function Loader({ size = "md", className }) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <div
        className={cn(
          "rounded-full border-muted border-t-primary animate-[spin_0.7s_linear_infinite]",
          sizes[size] || sizes.md
        )}
      />
    </div>
  );
}
