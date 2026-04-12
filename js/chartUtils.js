export const CONTINENT_COLORS = {
  Asia: "var(--continent-asia)",
  Europe: "var(--continent-europe)",
  Africa: "var(--continent-africa)",
  "North America": "var(--continent-north-america)",
  "South America": "var(--continent-south-america)",
  Oceania: "var(--continent-oceania)",
  Unknown: "var(--continent-unknown)",
};

export const REGION_COLORS = CONTINENT_COLORS;

export const formatInteger = d3.format(",.0f");
export const formatOneDecimal = d3.format(",.1f");
export const formatPercent = d3.format(".0%");

const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

export function createChartTransition() {
  return d3
    .transition()
    .duration(reducedMotionQuery?.matches ? 0 : 650)
    .ease(d3.easeCubicOut);
}

export function bindInteractiveSelection(selection, { hover, leave, activate }) {
  selection
    .attr("tabindex", 0)
    .attr("role", "button")
    .on("mousemove", (event, d) => hover(event, d))
    .on("mouseleave", () => leave())
    .on("focus", (event, d) => hover(event, d))
    .on("blur", () => leave())
    .on("click", (event, d) => activate(event, d))
    .on("keydown", (event, d) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(event, d);
      }

      if (event.key === "Escape") {
        leave();
      }
    });
}

export function describeRankShift(rankChange) {
  if (!Number.isFinite(rankChange) || rankChange === 0) {
    return "holds the same position in both rankings";
  }

  if (rankChange > 0) {
    return `moves up ${formatInteger(rankChange)} place${rankChange === 1 ? "" : "s"} in impact rank`;
  }

  const absoluteShift = Math.abs(rankChange);
  return `moves down ${formatInteger(absoluteShift)} place${absoluteShift === 1 ? "" : "s"} in impact rank`;
}
