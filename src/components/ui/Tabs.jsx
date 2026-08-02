import { cn } from "../../lib/utils";

export function Tabs({ value, onValueChange, children, className }) {
  return (
    <div className={cn("flex gap-1 border-b border-border overflow-x-auto", className)}>
      {children.map((child, i) => {
        const tabValue = child.props.value;
        const active = tabValue === value;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tabValue)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-[3px] transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {child.props.children}
          </button>
        );
      })}
    </div>
  );
}

export function TabsContent({ value, activeValue, children }) {
  if (value !== activeValue) return null;
  return children;
}
