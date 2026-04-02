// student-assessment.js — student assessment view with submission capability

const params = new URLSearchParams(window.location.search);
const courseId = params.get("courseId");
let currentAssessmentId = null;

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
  if (a.earnedMarks !== null) return '<span class="status done">Graded</span>';
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

    // For each assessment, fetch its submission status
    const rows = await Promise.all(assessments.map(async (a) => {
      let submissionStatus = "Not submitted";
      let submissionClass = "";
      
      try {
        const submissions = await apiGetSubmissions(a._id);
        if (submissions.length > 0) {
          const latest = submissions[0];
          submissionStatus = latest.isLate 
            ? `Submitted late (${formatDate(latest.submittedAt)})`
            : `Submitted (${formatDate(latest.submittedAt)})`;
          submissionClass = latest.isLate ? "late" : "submitted";
        }
      } catch (err) {
        // No submission yet, keep default
      }

      return `
        <tr>
          <td>${a.name}</td>
          <td>${a.type}</td>
          <td>${formatDate(a.dueDate)}</td>
          <td>${a.earnedMarks !== null ? `${a.earnedMarks} / ${a.totalMarks ?? "?"}` : "Not graded"}</td>
          <td>${Math.round(a.weight * 100)}%</td>
          <td>${statusBadge(a)}</td>
          <td>
            <button class="btn small" onclick="openSubmissionModal('${a._id}', '${a.name}', '${formatDate(a.dueDate)}', ${a.totalMarks})">
              ${a.earnedMarks !== null ? "View" : "Submit"}
            </button>
            <div style="font-size: 12px; margin-top: 5px; color: #666;">
              ${submissionStatus}
            </div>
          </td>
        </tr>
      `;
    }));

    tbody.innerHTML = rows.join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

window.openSubmissionModal = function (assessmentId, name, dueDate, totalMarks) {
  currentAssessmentId = assessmentId;
  const modal = document.getElementById("submissionModal");
  const detailsDiv = document.getElementById("assessmentDetails");
  const statusDiv = document.getElementById("submissionStatus");
  const form = document.getElementById("submitForm");
  
  // Show assessment details
  detailsDiv.innerHTML = `
    <p><strong>Assessment:</strong> ${name}</p>
    <p><strong>Due Date:</strong> ${dueDate}</p>
    <p><strong>Total Marks:</strong> ${totalMarks || 'Not specified'}</p>
  `;
  
  // Clear previous status
  statusDiv.innerHTML = '';
  statusDiv.className = 'submission-status';
  
  // Show form
  form.style.display = 'block';
  form.reset();
  
  // Show modal
  modal.classList.remove('hidden');
};

window.closeSubmissionModal = function () {
  const modal = document.getElementById("submissionModal");
  modal.classList.add('hidden');
  currentAssessmentId = null;
};

// Form submission
document.getElementById("submitForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  
  if (!file) {
    showSubmissionStatus("Please select a file", "error");
    return;
  }
  
  // Validating file size (50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    showSubmissionStatus("File size exceeds 50MB limit", "error");
    return;
  }
  
  // Validating file type
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  
  if (!allowedTypes.includes(file.type)) {
    showSubmissionStatus("File type not allowed. Use PDF, Word, Excel, Text, or Images.", "error");
    return;
  }
  
  try {
    showSubmissionStatus("Uploading...", "info");
    const result = await apiSubmitAssessment(currentAssessmentId, file);
    showSubmissionStatus("✓ Assessment submitted successfully!", "success");
    
    // Close modal and reload after 1.5 seconds
    setTimeout(() => {
      closeSubmissionModal();
      loadAssessments();
    }, 1500);
  } catch (err) {
    showSubmissionStatus(`Error: ${err.message}`, "error");
  }
});

function showSubmissionStatus(message, type) {
  const statusDiv = document.getElementById("submissionStatus");
  statusDiv.textContent = message;
  statusDiv.className = `submission-status ${type}`;
}

// Close modal when clicking outside the modal content
document.getElementById("submissionModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeSubmissionModal();
  }
});

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

