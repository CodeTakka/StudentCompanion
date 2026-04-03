// Student Grades Page

requireAuth();

const courseSelect = document.getElementById("courseSelect");
const gradesTableBody = document.getElementById("gradesTableBody");
const courseAverageEl = document.getElementById("courseAverage");

// Load all courses for dropdown
async function loadCourseList() {
  try {
    const courses = await apiGetCourses();

    if (!courses.length) {
      gradesTableBody.innerHTML = `
        <tr><td colspan="4" style="text-align:center;color:#888">
          You are not enrolled in any courses.
        </td></tr>`;
      return;
    }

    // Populate dropdown
    courseSelect.innerHTML =
      `<option value="">— Select a Course —</option>` +
      courses
        .map(c => `<option value="${c._id}">${c.code} — ${c.name}</option>`)
        .join("");

    // If URL has ?courseId=, preselect it
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("courseId");

    if (courseId) {
      courseSelect.value = courseId;
      loadGrades(courseId);
    }

  } catch (err) {
    gradesTableBody.innerHTML =
      `<tr><td colspan="4" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

// Load grades for selected course
async function loadGrades(courseId) {
  try {
    const [course, assessments, avgData] = await Promise.all([
      apiGetCourse(courseId),
      apiGetAssessments(courseId),
      apiGetCourseAverage(courseId, getUser().id)
    ]);

    if (!assessments.length) {
      gradesTableBody.innerHTML =
        `<tr><td colspan="4" style="text-align:center;color:#888">
          No assessments yet.
        </td></tr>`;
      courseAverageEl.textContent = "—";
      return;
    }

    gradesTableBody.innerHTML = assessments
      .map(a => {
        const earned = a.earnedMarks ?? null;
        const weightPct = Math.round(a.weight * 100);

        const weightedGrade =
          earned !== null && a.totalMarks
            ? ((earned / a.totalMarks) * weightPct).toFixed(1) + "%"
            : "—";

        return `
          <tr>
            <td>${a.name}</td>
            <td>${earned !== null ? earned : "<em>Not graded</em>"}</td>
            <td>${weightPct}%</td>
            <td>${weightedGrade}</td>
          </tr>
        `;
      })
      .join("");

    courseAverageEl.textContent =
      avgData.average !== null ? `${avgData.average}%` : "—";

  } catch (err) {
    gradesTableBody.innerHTML =
      `<tr><td colspan="4" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

// When user selects a course
courseSelect.addEventListener("change", () => {
  const selected = courseSelect.value;

  if (!selected) {
    gradesTableBody.innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:#888">
        Please select a course to view your progress.
      </td></tr>`;
    courseAverageEl.textContent = "—";
    return;
  }

  // Update URL
  window.history.replaceState({}, "", `grades.html?courseId=${selected}`);

  loadGrades(selected);
});

// Initialize page
loadCourseList();
