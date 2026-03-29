// Student read-only grades view for one course

const params   = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');

if (!courseId) window.location.href = 'dashboard.html';

async function loadGrades() {
  const tbody = document.getElementById('gradesTableBody');
  try {
    const [course, assessments, avgData] = await Promise.all([
      apiGetCourse(courseId),
      apiGetAssessments(courseId),
      apiGetCourseAverage(courseId)
    ]);

    document.getElementById('pageTitle').textContent = `Grades for ${course.code} — ${course.name}`;

    if (!assessments.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888">No assessments yet.</td></tr>';
    } else {
      tbody.innerHTML = assessments.map(a => `
        <tr>
          <td>${a.name}</td>
          <td>${a.earnedMarks !== null ? a.earnedMarks : '<em>Not graded</em>'}</td>
          <td>${a.totalMarks !== null ? `0 – ${a.totalMarks}` : '—'}</td>
          <td>${Math.round(a.weight * 100)}%</td>
        </tr>
      `).join('');
    }

    const avg = avgData.average;
    document.getElementById('courseAverage').textContent = avg !== null ? `${avg}%` : '—';

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

loadGrades();
