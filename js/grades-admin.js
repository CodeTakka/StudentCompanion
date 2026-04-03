let selectedCourseId = null;
let selectedStudentId = null;
let gradingAssessmentId = null;
let gradingSubmissionId = null;

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
    // Fetch all assessments for the course
    const assessments = await apiGetAssessments(selectedCourseId);

    if (!assessments.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#888">No assessments yet.</td></tr>';
    } else {
      // Fetch submissions for this student to get their grades
      const submissionsByAssessment = {};
      for (const a of assessments) {
        try {
          const subs = await apiGetSubmissions(a._id, selectedStudentId);
          if (subs.length > 0) {
            submissionsByAssessment[a._id] = subs[0]; // Get latest submission
          }
        } catch (err) {
          // Ignore errors
        }
      }

      tbody.innerHTML = assessments
        .map(
          (a) => {
            const submission = submissionsByAssessment[a._id];
            const earnedMarks = submission && submission.earnedMarks !== null ? submission.earnedMarks : null;
            const submissionId = submission ? submission._id : null;

            return `
              <tr>
                <td>${a.name} <small>(${a.type})</small></td>
                <td>${earnedMarks !== null ? earnedMarks : "<em>—</em>"}</td>
                <td>${a.totalMarks !== null ? a.totalMarks : "—"}</td>
                <td>${Math.round(a.weight * 100)}%</td>
                <td>
                  <button class="btn small"
                      onclick="openGradeForm('${a._id}', '${a.name}', ${earnedMarks ?? "null"}, ${a.totalMarks ?? "null"}, '${selectedStudentId}', '${submissionId}')">
                    ${earnedMarks !== null ? "Edit" : "Enter Grade"}
                  </button>
                </td>
              </tr>
            `;
          }
        )
        .join("");
    }

    // Only calculate average if we have a valid student selected
    if (selectedStudentId && selectedStudentId.trim()) {
      const avgData = await apiGetCourseAverage(selectedCourseId, selectedStudentId);
      const avg = avgData.average;
      document.getElementById("courseAverage").textContent = avg ?? "—";
    } else {
      document.getElementById("courseAverage").textContent = "—";
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

window.openGradeForm = async function (id, name, earned, total, studentId, submissionId) {
  gradingAssessmentId = id;
  gradingSubmissionId = submissionId || null; // Store submission ID for grading
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
      gradingSubmissionId = latest._id; // Update with fetched submission ID
      submissionViewer.style.display = "block";

      const submittedTime = new Date(latest.submittedAt).toLocaleString();
      const lateFlag = latest.isLate ? ' <span class="late-flag">LATE</span>' : '';

      submissionInfo.innerHTML = `
        <p><span class="submission-label">File:</span> ${latest.fileName}</p>
        <p><span class="submission-label">Submitted:</span> ${submittedTime}${lateFlag}</p>
      `;

      submissionActions.innerHTML = `
        <button class="btn small" onclick="window.downloadSubmissionFile('${latest._id}')">⬇ Download File</button>
      `;
      
      // Load existing feedback if any
      if (latest.feedback) {
        feedbackEl.value = latest.feedback;
      }
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
    // If we have a submission, update it (per-student grading)
    if (gradingSubmissionId) {
      const updateData = {
        earnedMarks: earned,
        feedback: feedback || null,
      };
      await apiUpdateSubmission(gradingSubmissionId, updateData);
    } else {
      // Fallback to assessment update if no submission exists
      const updateData = {
        earnedMarks: earned,
        totalMarks: total,
      };
      if (feedback) {
        updateData.feedback = feedback;
      }
      await apiUpdateAssessment(gradingAssessmentId, updateData);
    }
    
    hideGradeForm();
    loadGrades();
  } catch (err) {
    msg.textContent = err.message;
  }
};

loadCourseSelector();
