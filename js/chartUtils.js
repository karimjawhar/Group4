// Color palette mapping continents to CSS custom properties for consistent visual encoding
export const CONTINENT_COLORS = {
  Asia: "var(--continent-asia)",
  Europe: "var(--continent-europe)",
  Africa: "var(--continent-africa)",
  "North America": "var(--continent-north-america)",
  "South America": "var(--continent-south-america)",
  Oceania: "var(--continent-oceania)",
  Unknown: "var(--continent-unknown)",
};

// Alias for region colors to maintain consistency with continent colors
export const REGION_COLORS = CONTINENT_COLORS;

// D3 number formatters for consistent data presentation
export const formatInteger = d3.format(",.0f");      // e.g., 1,234
export const formatOneDecimal = d3.format(",.1f");   // e.g., 1,234.5
export const formatPercent = d3.format(".0%");       // e.g., 45%

/**
 * Formats population values intelligently based on magnitude.
 * Shows millions for populations under 1 billion, billions for 1B+.
 * This prevents showing "0.0 billion" for smaller countries.
 */
export function formatBillion(valueInMillions) {
  if (!Number.isFinite(valueInMillions)) return "N/A";
  
  // For populations under 1 billion (1000 million), show in millions
  if (valueInMillions < 1000) {
    return `${valueInMillions.toFixed(1)} million`;
  }
  
  // For populations 1 billion and above, show in billions
  const billions = valueInMillions / 1000;
  return `${billions.toFixed(1)} billion`;
}

// Detect user's motion preferences for accessibility
const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

/**
 * Creates a fresh D3 transition with consistent timing and easing.
 * Respects user's reduced motion preference by disabling animations when requested.
 */
export function createChartTransition() {
  return d3
    .transition()
    .duration(reducedMotionQuery?.matches ? 0 : 650)
    .ease(d3.easeCubicOut);
}

/**
 * Binds mouse, keyboard, and touch interactions to a D3 selection for accessibility.
 * Adds tabindex, ARIA role, and event handlers for hover, click, focus, and keyboard navigation.
 */
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

/**
 * Generates a human-readable description of rank change between two rankings.
 * Used to explain how a country's climate impact rank differs from its population rank.
 */
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
