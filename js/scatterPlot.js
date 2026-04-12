import { bindInteractiveSelection, CONTINENT_COLORS, createChartTransition } from "./chartUtils.js";

export default class ScatterPlot {
  constructor({ selector, dispatcher, tooltipSelector }) {
    // Core chart wiring (DOM refs, scales, layers, and reusable transition).
    this.root = d3.select(selector);
    this.dispatcher = dispatcher;
    this.tooltip = d3.select(tooltipSelector);

    this.margin = { top: 135, right: 40, bottom: 58, left: 78 };
    this.transition = createChartTransition();

    this.svg = this.root.append("svg").attr("class", "chart-svg").attr("role", "img");
    this.plot = this.svg.append("g");

    this.gridX = this.plot.append("g").attr("class", "grid grid-x");
    this.gridY = this.plot.append("g").attr("class", "grid grid-y");

    this.xAxisG = this.plot.append("g").attr("class", "axis axis-x");
    this.yAxisG = this.plot.append("g").attr("class", "axis axis-y");

    this.xLabel = this.svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle");
    this.yLabel = this.svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle");

    this.dotLayer = this.plot.append("g");
    this.legendLayer = this.svg.append("g").attr("class", "legend");

    this.emptyLabel = this.plot.append("text").attr("class", "empty-state").attr("opacity", 0);

    this.x = d3.scaleLinear();
    this.y = d3.scaleLinear();
    this.radius = d3.scaleSqrt();

    this.state = { selectedCountry: null, hoveredCountry: null };

    window.addEventListener("resize", () => {
      if (this.lastData) this.update(this.lastData, this.state);
    });
  }

  update(data, state) {
    // Full render cycle for data updates (including filtering from linked charts).
    this.lastData = data;
    this.state = { ...state };

    const { width, height, innerWidth, innerHeight } = this.getDimensions();

    this.svg.attr("viewBox", `0 0 ${width} ${height}`);
    this.svg.attr(
      "aria-label",
      "Bubble scatter plot comparing population, affected population, and climate risk for each country."
    );
    this.plot.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

    this.xAxisG.attr("transform", `translate(0, ${innerHeight})`);

    this.xLabel
      .attr("x", this.margin.left + innerWidth / 2)
      .attr("y", height - 14)
      .text("Population (millions)");

    this.yLabel
      .attr("transform", `translate(18, ${this.margin.top + innerHeight / 2}) rotate(-90)`)
      .text("People affected (millions)");

    if (!data.length) {
      this.renderEmpty(innerWidth, innerHeight);
      return;
    }

    this.emptyLabel.attr("opacity", 0);

    this.x.domain([0, d3.max(data, (d) => d.populationMillions) * 1.08]).range([0, innerWidth]).nice();

    this.y.domain([0, d3.max(data, (d) => d.affectedMillions) * 1.1]).range([innerHeight, 0]).nice();
    this.radius
      .domain(d3.extent(data, (d) => d.avgClimateRiskScore))
      .range(innerWidth < 520 ? [6, 13] : [7, 18]);

    const tickCount = innerWidth < 430 ? 4 : 6;
    const xAxis = d3.axisBottom(this.x).ticks(tickCount).tickFormat(d3.format(",.0f"));
    const yAxis = d3.axisLeft(this.y).ticks(tickCount).tickFormat(d3.format(",.0f"));

    const xGrid = d3
      .axisBottom(this.x)
      .ticks(tickCount)
      .tickSize(-innerHeight)
      .tickFormat("");

    const yGrid = d3
      .axisLeft(this.y)
      .ticks(tickCount)
      .tickSize(-innerWidth)
      .tickFormat("");

    this.xAxisG.transition(this.transition).call(xAxis);
    this.yAxisG.transition(this.transition).call(yAxis);
    this.gridX.attr("transform", `translate(0, ${innerHeight})`).transition(this.transition).call(xGrid);
    this.gridY.transition(this.transition).call(yGrid);

    const dots = this.dotLayer.selectAll("circle.dot").data(data, (d) => d.country);

    dots
      .exit()
      .transition(this.transition)
      .attr("r", 0)
      .style("opacity", 0)
      .remove();

    const dotsEnter = dots.enter().append("circle").attr("class", "dot").attr("r", 0);

    const mergedDots = dotsEnter
      .merge(dots)
      .style("fill", (d) => CONTINENT_COLORS[d.continent] || CONTINENT_COLORS.Unknown)
      .attr("aria-label", (d) => `${d.country}, climate risk score ${d.avgClimateRiskScore?.toFixed(1) ?? "unknown"}`);

    bindInteractiveSelection(mergedDots, {
      hover: (event, datum) => this.onHover(event, datum),
      leave: () => this.onLeave(),
      activate: (event, datum) => this.onClick(event, datum),
    });

    mergedDots
      .transition(this.transition)
      .attr("cx", (d) => this.x(d.populationMillions))
      .attr("cy", (d) => this.y(d.affectedMillions))
      .attr("r", (d) => this.radius(d.avgClimateRiskScore));

    this.updateHighlighting();
    this.renderLegend(data, width);
  }

  setInteractionState(state) {
    // Lightweight style-only update for hover/selection syncing across charts.
    this.state = { ...state };
    this.updateHighlighting();
  }

  updateHighlighting() {
    const focusCountry = this.state.hoveredCountry || this.state.selectedCountry;
    const focusRegion = this.state.hoveredRegion || this.state.selectedRegion;
    const dots = this.dotLayer.selectAll("circle.dot");

    dots
      .classed("highlight", (d) => !!focusCountry && d.country === focusCountry)
      .classed(
        "dimmed",
        (d) =>
          (Boolean(focusCountry) && d.country !== focusCountry) ||
          (!focusCountry && Boolean(focusRegion) && d.region !== focusRegion)
      );
  }

  renderLegend(data, width) {
    // Static legend for continent color encoding.
    const continents = Object.keys(CONTINENT_COLORS).filter((c) => c !== "Unknown");
    const itemHeight = 18;
    const legendWidth = 160;
    const legendHeight = continents.length * itemHeight + 14;

    const chosen = { x: width - this.margin.right - legendWidth - 8, y: 8 };

    const bg = this.legendLayer.selectAll("rect.legend-bg").data([chosen]);
    bg
      .enter()
      .append("rect")
      .attr("class", "legend-bg")
      .attr("rx", 8)
      .merge(bg)
      .attr("x", chosen.x)
      .attr("y", chosen.y)
      .attr("width", legendWidth)
      .attr("height", legendHeight);

    const legendItems = this.legendLayer.selectAll("g.legend-item").data(continents, (d) => d);

    legendItems.exit().remove();

    const enter = legendItems.enter().append("g").attr("class", "legend-item");
    enter.append("circle").attr("r", 5);
    enter.append("text").attr("x", 10).attr("y", 4);

    const merged = enter.merge(legendItems);

    merged.attr("transform", (_, i) => `translate(${chosen.x + 12}, ${chosen.y + 16 + i * itemHeight})`);

    merged.select("circle").attr("fill", (d) => CONTINENT_COLORS[d]);
    merged.select("text").text((d) => d);
  }

  onHover(event, d) {
    // Forward events to central interaction controller.
    this.dispatcher.call("countryHover", null, { event, datum: d, country: d.country, chart: "scatter" });
  }

  onLeave() {
    this.dispatcher.call("countryOut", null, { chart: "scatter" });
  }

  onClick(event, d) {
    this.dispatcher.call("countryClick", null, { event, datum: d, country: d.country, chart: "scatter" });
  }

  renderEmpty(innerWidth, innerHeight) {
    this.dotLayer.selectAll("circle.dot").remove();
    this.xAxisG.call(d3.axisBottom(this.x.domain([0, 1]).range([0, innerWidth])).tickFormat(() => ""));
    this.yAxisG.call(d3.axisLeft(this.y.domain([0, 1]).range([innerHeight, 0])).tickFormat(() => ""));

    this.emptyLabel
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("opacity", 1)
      .text("No data available for current filter");
  }

  getDimensions() {
    const bounds = this.root.node().getBoundingClientRect();
    const width = Math.max(320, bounds.width || 640);
    const height = Math.max(width < 560 ? 380 : 460, bounds.height || 460);
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;

    return { width, height, innerWidth, innerHeight };
  }
}
