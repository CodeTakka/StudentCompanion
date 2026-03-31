async function loadStats() {
  try {
    // Getting stats and all courses/averages
    const [stats, courses] = await Promise.all([
      apiGetStats(),
      apiGetCourses()
    ]);

    // Summary cards
    document.getElementById('statCourses').textContent     = stats.totalCourses;
    document.getElementById('statAssessments').textContent = stats.totalAssessments;
    document.getElementById('statCompleted').textContent   = stats.completedAssessments;
    document.getElementById('statOverallAverage').textContent = `${stats.completionRate}%`;

    // Getting the average for each course
    const averages = await Promise.all(
      courses.map(c => apiGetCourseAverage(c._id).catch(() => ({ average: null })))
    );

    renderProgressBars(courses, averages);
    renderCompletionChart(stats);
    renderAvgPerCourseChart(courses, averages);

  } catch (err) {
    document.querySelector('.summary-section').innerHTML =
      `<p style="color:#c0392b">Failed to load statistics: ${err.message}</p>`;
  }
}

// Per-course progress bars
function renderProgressBars(courses, averages) {
  const container = document.getElementById('courseAveragesContainer');

  if (!courses.length) {
    container.innerHTML = '<p style="color:#888">No courses yet.</p>';
    return;
  }

  container.innerHTML = courses.map((c, i) => {
    const avg = averages[i]?.average;
    const pct = avg !== null ? avg : 0;
    return `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span><strong>${c.code}</strong> — ${c.name}</span>
          <span>${avg !== null ? avg + '%' : 'No grades yet'}</span>
        </div>
        <div style="background:#e9ecef;border-radius:6px;height:14px;width:100%">
          <div style="background:#b33149;width:${pct}%;height:100%;border-radius:6px"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Pie chart: completed vs pending assessments
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

// Bar chart: current average per course
function renderAvgPerCourseChart(courses, averages) {
  const ctx = document.getElementById('avgPerCourseChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: courses.map(c => c.code),
      datasets: [{
        label: 'Average Grade (%)',
        data: averages.map(a => a?.average ?? 0),
        backgroundColor: '#b33149',
        borderRadius: 4,
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, max: 100 }
      },
      plugins: { legend: { display: false } }
    }
  });
}

loadStats();