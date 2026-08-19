import { cn } from "../../lib/utils";

const colorMap = {
  green: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  navy: "bg-slate-200 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300",
  teal: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-400",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-400",
  grey: "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300",
};

export default function Badge({ color = "teal", text, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap",
        colorMap[color] || colorMap.teal,
        className
      )}
    >
      {text}
    </span>
  );
}
