import { cn } from "../../lib/utils";

const colorMap = {
  green: "bg-green-500/15 text-green-700 dark:text-green-400",
  red: "bg-red-500/15 text-red-700 dark:text-red-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  navy: "bg-slate-800/10 text-slate-800 dark:text-slate-300",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  grey: "bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-300",
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
