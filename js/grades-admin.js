let selectedCourseId = null;
let gradingAssessmentId = null;

async function loadCourseSelector() {
  const select = document.getElementById("courseSelect");
  try {
    const courses = await apiGetCourses();
    courses.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c._id;
      opt.textContent = `${c.code} — ${c.name}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load courses:", err);
  }
}

document.getElementById("courseSelect").addEventListener("change", function () {
  selectedCourseId = this.value;
  const panel = document.getElementById("gradesPanel");
  if (selectedCourseId) {
    panel.style.display = "block";
    loadGrades();
  } else {
    panel.style.display = "none";
  }
  hideGradeForm();
});

async function loadGrades() {
  const tbody = document.getElementById("gradesTableBody");
  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align:center;color:#888">Loading…</td></tr>';
  try {
    const [assessments, avgData] = await Promise.all([
      apiGetAssessments(selectedCourseId),
      apiGetCourseAverage(selectedCourseId),
    ]);

    // If the earnedMarks of an assignment is null or undefined, it sets it as null
    if (!assessments.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#888">No assessments yet.</td></tr>';
    } else {
      tbody.innerHTML = assessments
        .map(
          (a) => `
        <tr>
          <td>${a.name} <small>(${a.type})</small></td>
          <td>${a.earnedMarks !== null ? a.earnedMarks : "<em>—</em>"}</td>
          <td>${a.totalMarks !== null ? a.totalMarks : "—"}</td>
          <td>${Math.round(a.weight * 100)}%</td>
          <td>
            <button class="btn small"
                onclick="openGradeForm('${a._id}', '${a.name}', ${a.earnedMarks ?? "null"}, ${a.totalMarks ?? "null"})">
              ${a.earnedMarks !== null ? "Edit" : "Enter Grade"}
            </button>
          </td>
        </tr>
      `,
        )
        .join("");
    }

    const avg = avgData.average;
    document.getElementById("courseAverage").textContent = avg ?? "—";
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

window.openGradeForm = function (id, name, earned, total) {
  gradingAssessmentId = id;
  const nameEl = document.getElementById("gradeAssessmentName");
  const earnedEl = document.getElementById("gEarned");
  const totalEl = document.getElementById("gTotal");

  nameEl.textContent = name;
  earnedEl.value = earned ?? "";
  totalEl.value = total ?? "";

  document.getElementById("gradeFormMessage").textContent = "";
  document.getElementById("gradeForm").style.display = "block";
};

window.hideGradeForm = function () {
  document.getElementById("gradeForm").style.display = "none";
  gradingAssessmentId = null;
};

window.submitGradeForm = async function () {
  const msg = document.getElementById("gradeFormMessage");
  const earned = parseFloat(document.getElementById("gEarned").value);
  const total = parseFloat(document.getElementById("gTotal").value);

  if (isNaN(earned) || isNaN(total)) {
    msg.textContent = "Both earned and total marks are required.";
    return;
  }
  if (earned < 0) {
    msg.textContent = "Earned marks cannot be negative.";
    return;
  }
  if (earned > total) {
    msg.textContent = "Earned marks cannot exceed total marks.";
    return;
  }

  try {
    await apiUpdateAssessment(gradingAssessmentId, {
      earnedMarks: earned,
      totalMarks: total,
    });
    hideGradeForm();
    loadGrades();
  } catch (err) {
    msg.textContent = err.message;
  }
};

loadCourseSelector();
