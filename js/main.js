import { loadDatasets } from "./dataLoader.js";
import PopulationBarChart from "./barChart.js";
import EventsBarChart from "./eventsChart.js";
import HeatmapChart from "./heatmapChart.js";
import { initialState, wireInteractions } from "./interactions.js";
import LineChart from "./lineChart.js";
import RankShiftChart from "./rankShiftChart.js";
import RegionChart from "./regionChart.js";
import ScatterPlot from "./scatterPlot.js";

function setupStoryNavigation() {
  const sections = Array.from(document.querySelectorAll("[data-chapter]"));
  const links = Array.from(document.querySelectorAll("[data-chapter-link]"));

  if (!sections.length || !links.length || !("IntersectionObserver" in window)) {
    return;
  }

  const setActiveLink = (sectionId) => {
    links.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.chapterLink === sectionId);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visibleEntry) {
        setActiveLink(visibleEntry.target.id);
      }
    },
    {
      rootMargin: "-30% 0px -48% 0px",
      threshold: [0.2, 0.35, 0.5, 0.7],
    }
  );

  sections.forEach((section) => observer.observe(section));
}

const app = async () => {
  const statusNode = document.getElementById("selection-status");
  const insightNode = document.getElementById("dynamic-insight");
  const storyCalloutNode = document.getElementById("story-callout");
  const alertNode = document.getElementById("app-alert");
  const resetButton = document.getElementById("reset-selection");
  const tooltip = d3.select("#tooltip");

  if (resetButton) {
    resetButton.disabled = false;
  }

  const kpiNodes = {
    focus: document.getElementById("kpi-focus"),
    events: document.getElementById("kpi-events"),
    region: document.getElementById("kpi-region"),
    shift: document.getElementById("kpi-shift"),
  };

  setupStoryNavigation();

  try {
    const allData = await loadDatasets();

    const dispatcher = d3.dispatch(
      "countryHover",
      "countryOut",
      "countryClick",
      "regionHover",
      "regionOut",
      "regionClick",
      "trendHover",
      "trendOut",
      "resetSelection"
    );

    const state = { ...initialState };

    const lineChart = new LineChart({
      selector: "#line-chart",
      dispatcher,
    });

    const scatterPlot = new ScatterPlot({
      selector: "#scatter-chart",
      dispatcher,
      tooltipSelector: "#tooltip",
    });

    const populationBarChart = new PopulationBarChart({
      selector: "#population-bar-chart",
      dispatcher,
    });

    const eventsBarChart = new EventsBarChart({
      selector: "#events-bar-chart",
      dispatcher,
    });

    const heatmapChart = new HeatmapChart({
      selector: "#heatmap-chart",
      dispatcher,
      referenceData: allData.countryComparison,
    });

    const rankShiftChart = new RankShiftChart({
      selector: "#rank-shift-chart",
      dispatcher,
    });

    const regionChart = new RegionChart({
      selector: "#region-chart",
      dispatcher,
    });

    const charts = {
      lineChart,
      regionChart,
      countryCharts: [scatterPlot, populationBarChart, eventsBarChart, heatmapChart, rankShiftChart],
    };

    const { applyFilterAndRender, resetSelection } = wireInteractions({
      dispatcher,
      charts,
      allData,
      state,
      statusNode,
      insightNode,
      tooltip,
      storyCalloutNode,
      kpiNodes,
    });

    if (resetButton) {
      resetButton.addEventListener("click", resetSelection);
    }

    applyFilterAndRender();
  } catch (error) {
    statusNode.textContent = "Data loading error";
    statusNode.setAttribute("role", "alert");
    insightNode.textContent =
      "Unable to load one or more CSV files. Start the project with a local server such as run_app.bat so the browser can fetch the datasets correctly.";
    if (storyCalloutNode) {
      storyCalloutNode.textContent = "The application could not build the story because one or more datasets failed to load.";
    }
    if (alertNode) {
      alertNode.textContent =
        "The application failed to load its datasets. Run the page through a local server and confirm the CSV files are present.";
    }
    console.error("Application initialization failed:", error);
  }
};

app();

