const colorMap = {
  green: {
    background: "rgba(39, 174, 96, 0.12)",
    color: "var(--color-green-text, #1E8449)",
  },
  red: {
    background: "rgba(192, 57, 43, 0.12)",
    color: "#C0392B",
  },
  amber: {
    background: "rgba(243, 156, 18, 0.14)",
    color: "var(--color-amber-text, #D4880F)",
  },
  navy: {
    background: "rgba(44, 62, 80, 0.10)",
    color: "var(--color-navy)",
  },
  teal: {
    background: "rgba(22, 160, 133, 0.12)",
    color: "var(--color-teal)",
  },
  blue: {
    background: "rgba(37, 99, 235, 0.12)",
    color: "#1D4ED8",
  },
  orange: {
    background: "rgba(234, 88, 12, 0.12)",
    color: "#C2410C",
  },
  grey: {
    background: "var(--color-grey-bg, #BDC3C7)",
    color: "var(--color-grey-text, #636E72)",
  },
};

export default function Badge({ color = "teal", text }) {
  const palette = colorMap[color] || colorMap.teal;

  const style = {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.3px",
    whiteSpace: "nowrap",
    ...palette,
  };

  return <span style={style}>{text}</span>;
}
