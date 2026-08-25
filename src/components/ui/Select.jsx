import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

export default function Select({
  label,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  className,
  id,
  ...props
}) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block mb-1.5 text-sm font-semibold text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...props}
          className={cn(
            "w-full appearance-none rounded-md border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-red-500" : "border-border",
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
