const completionCtx = document
  .getElementById("completionChart")
  .getContext("2d");
new Chart(completionCtx, {
  type: "pie",
  data: {
    labels: ["Completed", "Pending"],
    datasets: [
      {
        data: [12, 4],
        backgroundColor: ["#28a745", "#dc3545"],
      },
    ],
  },
});

// Grade Trend Line Chart
const trendCtx = document.getElementById("trendChart").getContext("2d");

new Chart(trendCtx, {
  type: "line",
  data: {
    labels: ["Assignment 1", "Quiz 1", "Midterm", "Assignment 2"],
    datasets: [
      {
        label: "Grade (%)",
        data: [72, 78, 85, 88],
        borderColor: "#b33149",
        backgroundColor: "rgba(145, 35, 56, 0.2)",
        fill: true,
        tension: 0.3,
      },
    ],
  },
  options: {
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  },
});
