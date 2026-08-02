import { cn } from "../../lib/utils";

export default function Textarea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  error,
  disabled = false,
  className,
  id,
}) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <label htmlFor={textareaId} className="block mb-1.5 text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2 text-sm resize-y placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-red-500" : "border-border"
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
