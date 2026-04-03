// Student read-only grades view for one course

const params   = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');

if (!courseId || courseId === "null") {
  const tbody = document.getElementById("gradesTableBody");
  tbody.innerHTML = `
    <tr><td colspan="4" style="text-align:center;color:#888">
      Please select a course from the dashboard.
    </td></tr>`;
  return;
}

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
      // Fetch submissions to get grades
      const submissionsByAssessment = {};
      for (const a of assessments) {
        try {
          const subs = await apiGetSubmissions(a._id);
          if (subs.length > 0) {
            submissionsByAssessment[a._id] = subs[0]; // Get latest submission
          }
        } catch (err) {
          // Ignore errors
        }
      }

      tbody.innerHTML = assessments.map(a => {
        const submission = submissionsByAssessment[a._id];
        const earnedMarks = submission?.earnedMarks !== undefined && submission?.earnedMarks !== null
          ? submission.earnedMarks
          : (a.earnedMarks !== null && a.earnedMarks !== undefined ? a.earnedMarks : null);
        const gradeText = earnedMarks !== null ? earnedMarks : '<em>Not graded</em>';

        return `
          <tr>
            <td>${a.name}</td>
            <td>${gradeText}</td>
            <td>${a.totalMarks !== null ? `0 – ${a.totalMarks}` : '—'}</td>
            <td>${Math.round(a.weight * 100)}%</td>
          </tr>
        `;
      }).join('');
    }

    const avg = avgData.average;
    document.getElementById('courseAverage').textContent = avg !== null ? `${avg}%` : '—';

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

loadGrades();
