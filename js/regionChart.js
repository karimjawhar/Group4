import { bindInteractiveSelection, createChartTransition, formatOneDecimal, REGION_COLORS } from "./chartUtils.js";

export default class RegionChart {
  constructor({ selector, dispatcher }) {
    this.root = d3.select(selector);
    this.dispatcher = dispatcher;

    this.margin = { top: 16, right: 20, bottom: 76, left: 74 };
    this.transition = createChartTransition();

    this.svg = this.root.append("svg").attr("class", "chart-svg").attr("role", "img");
    this.plot = this.svg.append("g");

    this.gridY = this.plot.append("g").attr("class", "grid grid-y");
    this.xAxisG = this.plot.append("g").attr("class", "axis axis-x");
    this.yAxisG = this.plot.append("g").attr("class", "axis axis-y");

    this.xLabel = this.svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle");
    this.yLabel = this.svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle");

    this.barLayer = this.plot.append("g");
    this.labelLayer = this.plot.append("g");
    this.emptyLabel = this.plot.append("text").attr("class", "empty-state").attr("opacity", 0);

    this.x = d3.scaleBand().padding(0.28);
    this.y = d3.scaleLinear();

    this.state = { selectedRegion: null, hoveredRegion: null };

    window.addEventListener("resize", () => {
      if (this.lastData) this.update(this.lastData, this.state);
    });
  }

  update(data, state) {
    this.lastData = data;
    this.state = { ...state };

    const chartData = [...data]
      .filter((d) => d.region && Number.isFinite(d.totalPopulationAffectedMillions))
      .sort((a, b) => d3.descending(a.totalPopulationAffectedMillions, b.totalPopulationAffectedMillions));

    const { width, height, innerWidth, innerHeight } = this.getDimensions();

    this.svg.attr("viewBox", `0 0 ${width} ${height}`);
    this.svg.attr("aria-label", "Vertical bar chart comparing total affected population by region.");
    this.plot.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
    this.xAxisG.attr("transform", `translate(0, ${innerHeight})`);

    this.xLabel
      .attr("x", this.margin.left + innerWidth / 2)
      .attr("y", height - 12)
      .text("Region");

    this.yLabel
      .attr("transform", `translate(20, ${this.margin.top + innerHeight / 2}) rotate(-90)`)
      .text("People affected (millions)");

    if (!chartData.length) {
      this.renderEmpty(innerWidth, innerHeight);
      return;
    }

    this.emptyLabel.attr("opacity", 0);

    this.x.domain(chartData.map((d) => d.region)).range([0, innerWidth]);
    this.y
      .domain([0, d3.max(chartData, (d) => d.totalPopulationAffectedMillions) * 1.08])
      .range([innerHeight, 0])
      .nice();

    const xAxis = d3.axisBottom(this.x);
    const yAxis = d3.axisLeft(this.y).ticks(6).tickFormat(d3.format(",.0f"));

    const yGrid = d3
      .axisLeft(this.y)
      .ticks(6)
      .tickSize(-innerWidth)
      .tickFormat("");

    this.xAxisG.transition(this.transition).call(xAxis);
    this.yAxisG.transition(this.transition).call(yAxis);
    this.gridY.transition(this.transition).call(yGrid);

    this.xAxisG
      .selectAll("text")
      .attr("transform", "rotate(-20)")
      .style("text-anchor", "end")
      .attr("dx", "-0.45em")
      .attr("dy", "0.6em");

    const bars = this.barLayer.selectAll("rect.region-bar").data(chartData, (d) => d.region);

    bars
      .exit()
      .transition(this.transition)
      .attr("y", innerHeight)
      .attr("height", 0)
      .remove();

    const barsEnter = bars
      .enter()
      .append("rect")
      .attr("class", "region-bar")
      .attr("x", (d) => this.x(d.region))
      .attr("y", innerHeight)
      .attr("width", this.x.bandwidth())
      .attr("height", 0)
      .attr("fill", (d) => REGION_COLORS[d.region] || "var(--region-bar)");

    const mergedBars = barsEnter
      .merge(bars)
      .attr("aria-label", (d) => `${d.region}, ${formatOneDecimal(d.totalPopulationAffectedMillions)} million people affected`);

    bindInteractiveSelection(mergedBars, {
      hover: (event, datum) => this.onHover(event, datum),
      leave: () => this.onLeave(),
      activate: (event, datum) => this.onClick(event, datum),
    });

    mergedBars
      .transition(this.transition)
      .attr("x", (d) => this.x(d.region))
      .attr("width", this.x.bandwidth())
      .attr("y", (d) => this.y(d.totalPopulationAffectedMillions))
      .attr("height", (d) => innerHeight - this.y(d.totalPopulationAffectedMillions));

    const labels = this.labelLayer.selectAll("text.region-value-label").data(chartData, (d) => d.region);

    labels.exit().remove();

    labels
      .enter()
      .append("text")
      .attr("class", "region-value-label")
      .merge(labels)
      .transition(this.transition)
      .attr("x", (d) => (this.x(d.region) || 0) + this.x.bandwidth() / 2)
      .attr("y", (d) => this.y(d.totalPopulationAffectedMillions) - 8)
      .text((d) => formatOneDecimal(d.totalPopulationAffectedMillions));

    this.updateHighlighting();
  }

  setInteractionState(state) {
    this.state = { ...state };
    this.updateHighlighting();
  }

  updateHighlighting() {
    const focus = this.state.hoveredRegion || this.state.selectedRegion || this.state.linkedRegion;

    this.barLayer
      .selectAll("rect.region-bar")
      .classed("highlight", (d) => !!focus && d.region === focus)
      .classed("dimmed", (d) => !!focus && d.region !== focus);
  }

  onHover(event, d) {
    this.dispatcher.call("regionHover", null, { event, datum: d, region: d.region, chart: "region" });
  }

  onLeave() {
    this.dispatcher.call("regionOut", null, { chart: "region" });
  }

  onClick(event, d) {
    this.dispatcher.call("regionClick", null, { event, datum: d, region: d.region, chart: "region" });
  }

  renderEmpty(innerWidth, innerHeight) {
    this.barLayer.selectAll("rect.region-bar").remove();
    this.labelLayer.selectAll("text.region-value-label").remove();
    this.emptyLabel
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("opacity", 1)
      .text("No regional summary data available");
  }

  getDimensions() {
    const bounds = this.root.node().getBoundingClientRect();
    const width = Math.max(320, bounds.width || 760);
    const height = Math.max(370, bounds.height || 370);
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;
    return { width, height, innerWidth, innerHeight };
  }
}
