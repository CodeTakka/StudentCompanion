// student-assessment.js — read-only assessment view for students

const params = new URLSearchParams(window.location.search);
const courseId = params.get("courseId");

if (courseId) {
  loadAssessments(courseId);
} else {
  console.log("No course selected yet.");
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(a) {
  if (a.completed) return '<span class="status done">Completed</span>';
  if (a.dueDate && new Date(a.dueDate) < new Date())
    return '<span class="status done">Past Due</span>';
  return '<span class="status comingup">Coming up</span>';
}

async function loadAssessments(courseIdParam = courseId) {
  const tbody = document.getElementById("assessmentTableBody");
  try {
    const [course, assessments] = await Promise.all([
      apiGetCourse(courseIdParam),
      apiGetAssessments(courseIdParam),
    ]);

    document.getElementById("pageTitle").textContent =
      `${course.code} — Assessments`;

    if (!assessments.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#888">No assessments yet.</td></tr>';
      return;
    }

    tbody.innerHTML = assessments
      .map(
        (a) => `
      <tr>
        <td>${a.name}</td>
        <td>${a.type}</td>
        <td>${formatDate(a.dueDate)}</td>
        <td>${a.earnedMarks !== null ? `${a.earnedMarks} / ${a.totalMarks ?? "?"}` : "Not graded"}</td>
        <td>${Math.round(a.weight * 100)}%</td>
        <td>${statusBadge(a)}</td>
        <td>
          <button class="btn small" onclick="toggleComplete('${a._id}', ${a.completed})">
            ${a.completed ? "Mark Pending" : "Mark Done"}
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

window.toggleComplete = async function (id, currentStatus) {
  try {
    await apiUpdateAssessment(id, { completed: !currentStatus });
    loadAssessments(); // re-render
  } catch (err) {
    alert("Failed to update: " + err.message);
  }
};

// If courseId exists and it isn't null, load the assessments
if (courseId && courseId !== "null") {
  loadAssessments();
} else {
  console.log("No course selected yet.");
  const tbody = document.getElementById("assessmentTableBody");
  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#888">Please select a course from the dashboard.</td></tr>';
  }
}
