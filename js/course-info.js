// Shows one course's info, average, and pending count

const params = new URLSearchParams(window.location.search);
const courseId = params.get("courseId");

if (!courseId) window.location.href = "dashboard.html";

async function loadCourseInfo() {
  try {
    const [course, avgData, assessments] = await Promise.all([
      apiGetCourse(courseId),
      apiGetCourseAverage(courseId),
      apiGetAssessments(courseId),
    ]);

    document.getElementById("courseTitle").textContent =
      `${course.code} — ${course.name}`;
    document.getElementById("courseInstructor").textContent =
      `Instructor: ${course.instructor || "N/A"}`;
    document.getElementById("courseTerm").textContent =
      `Term: ${course.term || "N/A"}`;
    document.getElementById("courseDescription").textContent =
      course.description || "No description available.";

    const avg = avgData.average;
    document.getElementById("courseAverage").textContent =
      avg !== null ? `${avg}%` : "—";
    document.getElementById("courseAverageBar").style.width =
      avg !== null ? `${avg}%` : "0%";

    const pending = assessments.filter((a) => !a.completed).length;
    let text;

    if (pending > 0) {
      const plural = pending > 1 ? "s" : "";
      text = `${pending} assessment${plural} pending`;
    } else {
      text = "All assessments completed";
    }

    document.getElementById("pendingCount").textContent = text;

    // Pass courseId to linked pages
    document.getElementById("gradesLink").href =
      `grades.html?courseId=${courseId}`;
    document.getElementById("assessmentsLink").href =
      `student-assessment.html?courseId=${courseId}`;
  } catch (err) {
    document.getElementById("courseTitle").textContent =
      "Failed to load course: " + err.message;
  }
}

loadCourseInfo();

document.getElementById('dropClassBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to drop this class?')) return;

  try {
    await apiFetch(`/courses/${courseId}/unenroll`, { method: 'POST' });
    alert('You have successfully dropped the course.');
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert('Failed to drop course: ' + err.message);
  }
});
