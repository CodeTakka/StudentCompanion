let selectedCourseId = null;
let selectedStudentId = null;
let gradingAssessmentId = null;

// Course selector
async function loadCourseSelector() {
  const select = document.getElementById('courseSelect');
  try {
    const courses = await apiGetCourses();
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c._id;
      opt.textContent = `${c.code} — ${c.name}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load courses:', err);
  }
}

document.getElementById('courseSelect').addEventListener('change', function () {
  selectedCourseId = this.value;
  const panel = document.getElementById('studentPanel');
  if (selectedCourseId) {
    panel.style.display = 'block';
    loadStudents();
  } else {
    panel.style.display = 'none';
    document.getElementById('gradesPanel').style.display = 'none';
  }
  hideGradeForm();
});

async function loadStudents() {
  const select = document.getElementById("studentSelect");
  select.innerHTML = '<option value="">— choose a student —</option>';
  try {
    const course = await apiGetCourse(selectedCourseId);
    for (const studentId of course.students) {
      const user = await apiGetUser(studentId);
      const opt = document.createElement("option");
      opt.value = studentId;
      opt.textContent = user.username;
      select.appendChild(opt);
    }
  } catch (err) {
    console.error("Failed to load students:", err);
  }
}

document.getElementById("studentSelect").addEventListener("change", function () {
  selectedStudentId = this.value;
  const panel = document.getElementById("gradesPanel");
  if (selectedStudentId) {
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
    const assessments = await apiGetAssessments(selectedCourseId);
    const studentAssessments = assessments.filter(a => a.studentId === selectedStudentId);

    // If the earnedMarks of an assignment is null or undefined, it sets it as null
    if (!studentAssessments.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#888">No assessments yet.</td></tr>';
    } else {
      tbody.innerHTML = studentAssessments
        .map(
          (a) => `
        <tr>
          <td>${a.name} <small>(${a.type})</small></td>
          <td>${a.earnedMarks !== null ? a.earnedMarks : "<em>—</em>"}</td>
          <td>${a.totalMarks !== null ? a.totalMarks : "—"}</td>
          <td>${Math.round(a.weight * 100)}%</td>
          <td>
            <button class="btn small"
                onclick="openGradeForm('${a._id}', '${a.name}', ${a.earnedMarks ?? "null"}, ${a.totalMarks ?? "null"}, '${selectedStudentId}')">
              ${a.earnedMarks !== null ? "Edit" : "Enter Grade"}
            </button>
          </td>
        </tr>
      `,
        )
        .join("");
    }

    const avgData = await apiGetCourseAverage(selectedCourseId, selectedStudentId);
    const avg = avgData.average;
    document.getElementById("courseAverage").textContent = avg ?? "—";
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

window.openGradeForm = async function (id, name, earned, total, studentId) {
  gradingAssessmentId = id;
  const nameEl = document.getElementById("gradeAssessmentName");
  const earnedEl = document.getElementById("gEarned");
  const totalEl = document.getElementById("gTotal");
  const feedbackEl = document.getElementById("gFeedback");
  const submissionViewer = document.getElementById("submissionViewer");
  const submissionInfo = document.getElementById("submissionInfo");
  const submissionActions = document.getElementById("submissionActions");

  nameEl.textContent = name;
  earnedEl.value = earned ?? "";
  totalEl.value = total ?? "";
  feedbackEl.value = "";

  document.getElementById("gradeFormMessage").textContent = "";

  // Fetch submission if it exists
  try {
    const submissions = await apiGetSubmissions(id, studentId);
    if (submissions.length > 0) {
      const latest = submissions[0];
      submissionViewer.style.display = "block";

      const submittedTime = new Date(latest.submittedAt).toLocaleString();
      const lateFlag = latest.isLate ? ' <span class="late-flag">LATE</span>' : '';

      submissionInfo.innerHTML = `
        <p><span class="submission-label">File:</span> ${latest.fileName}</p>
        <p><span class="submission-label">Submitted:</span> ${submittedTime}${lateFlag}</p>
      `;

      submissionActions.innerHTML = `
        <a href="/api/submissions/${latest._id}/download" target="_blank">⬇ Download File</a>
      `;
    } else {
      submissionViewer.style.display = "none";
    }
  } catch (err) {
    submissionViewer.style.display = "none";
    console.warn("Failed to fetch submissions:", err);
  }

  // Try to fetch existing feedback
  try {
    const assessment = await apiGetAssessment(id);
    if (assessment && assessment.feedback) {
      feedbackEl.value = assessment.feedback;
    }
  } catch (err) {
    console.warn("Failed to fetch assessment feedback:", err);
  }

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
  const feedback = document.getElementById("gFeedback").value.trim();

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
    const updateData = {
      earnedMarks: earned,
      totalMarks: total,
    };
    if (feedback) {
      updateData.feedback = feedback;
    }
    
    await apiUpdateAssessment(gradingAssessmentId, updateData);
    hideGradeForm();
    loadGrades();
  } catch (err) {
    msg.textContent = err.message;
  }
};

loadCourseSelector();
