async function loadStats() {
  try {
    const stats = await apiGetStats();

    document.getElementById('statCourses').textContent     = stats.totalCourses;
    document.getElementById('statAssessments').textContent = stats.totalAssessments;
    document.getElementById('statCompleted').textContent   = stats.completedAssessments;
    document.getElementById('statOverallAverage').textContent = `${stats.completionRate}%`;

    renderCompletionChart(stats);
    renderTrendChart(stats);

  } catch (err) {
    document.querySelector('.summary-section').innerHTML =
      `<p style="color:#c0392b">Failed to load statistics: ${err.message}</p>`;
  }
}

function renderCompletionChart(stats) {
  const ctx = document.getElementById('completionChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [
          stats.completedAssessments,
          stats.totalAssessments - stats.completedAssessments
        ],
        backgroundColor: ['#28a745', '#dc3545'],
      }]
    },
    options: { plugins: { legend: { position: 'bottom' } } }
  });
}

function renderTrendChart(stats) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Enabled Courses', 'Disabled Courses'],
      datasets: [{
        data: [stats.enabledCourses, stats.disabledCourses],
        backgroundColor: ['#007bff', '#6c757d'],
      }]
    },
    options: { plugins: { legend: { position: 'bottom' } } }
  });
}

loadStats();