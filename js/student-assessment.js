// student-assessment.js — student assessment view with submission capability

const params = new URLSearchParams(window.location.search);
const initialCourseId = params.get("courseId");
const courseFilter = document.getElementById("courseFilter");
const tbody = document.getElementById("assessmentTableBody");
let allAssessments = [];
let allSubmissions = [];
let currentAssessmentId = null;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[s]);
}

async function initAssessments() {
  try {
    const courses = await apiGetCourses();
    const options = ['<option value="all">All courses</option>', ...courses.map(c => `<option value="${c._id}">${escapeHtml(c.code)} — ${escapeHtml(c.name)}</option>` )];
    courseFilter.innerHTML = options.join('');

    if (initialCourseId && courses.some(c => c._id === initialCourseId)) {
      courseFilter.value = initialCourseId;
    }

    courseFilter.addEventListener('change', renderAssessments);
    await loadAssessments();
  } catch (err) {
    if (tbody) { tbody.innerHTML = `<tr><td colspan="7" style="color:#c0392b">${escapeHtml(err.message)}</td></tr>`; }
  }
}


function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper: Check if this assessment has been submitted by current user
function isSubmitted(assessmentId) {
  const sub = allSubmissions.find(s => s.assessmentId === assessmentId);
  return sub && sub.status !== "cancelled";
}

// Helper: Get earned marks from assessment (admin-set grades)
function getEarnedMarks(assessment) {
  return assessment.earnedMarks !== null ? `${assessment.earnedMarks} / ${assessment.totalMarks ?? '?'}` : 'Not graded';
}

function statusBadge(a) {
  const sub = allSubmissions.find(s => s.assessmentId === a._id);
  const submitted = sub && sub.status !== "cancelled";
  const graded = a.earnedMarks !== null;

  if (graded && sub && sub.status === "cancelled")
    return '<span class="status graded-missing">Unsubmitted (graded)</span>';

  if (graded)
    return '<span class="status done">Graded</span>';

  if (submitted)
    return '<span class="status submitted">Submitted</span>';

  const overdue = a.dueDate && new Date(a.dueDate) < new Date();
  if (overdue)
    return '<span class="status overdue">Overdue</span>';

  return '<span class="status comingup">Upcoming</span>';
}

function rowClass(a) {
  const submitted = isSubmitted(a._id);
  if (!submitted && a.dueDate && new Date(a.dueDate) < new Date()) return 'overdue-row';
  return '';
}

async function loadAssessments() {
  try {
    allAssessments = await apiGetAssessments();
    allSubmissions = await apiGetAllSubmissions();
    renderAssessments();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#c0392b">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderAssessments() {
  const selectedCourse = courseFilter.value;
  const filtered = selectedCourse === 'all'
    ? allAssessments
    : allAssessments.filter(a => a.courseId && a.courseId._id === selectedCourse);

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888">No assessments yet.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const dueDate = formatDate(a.dueDate);
    const courseInfo = a.courseId
      ? `${escapeHtml(a.courseId.code)} — ${escapeHtml(a.courseId.name)}`
      : 'Unknown';

    const gradeText = getEarnedMarks(a);
    const submitted = isSubmitted(a._id);
    const actionLabel = submitted ? 'Resubmit' : 'Submit';
    const escapedName = escapeHtml(a.name).replace(/'/g, "\\'");

    return `
      <tr class="${rowClass(a)}">
        <td>${escapeHtml(a.name)}</td>
        <td>${escapeHtml(a.type)}</td>
        <td>${dueDate}</td>
        <td>${gradeText}</td>
        <td>${Math.round((a.weight || 0) * 100)}%</td>
        <td>${statusBadge(a)}</td>
        <td>
          <button class="btn small"
            onclick="openSubmissionModal('${a._id}', '${escapedName}', '${dueDate}', ${a.totalMarks || 'null'}, ${submitted})">
            ${actionLabel}
          </button>

          ${submitted ? `
            <button class="btn small danger" style="margin-top:6px"
              onclick="cancelSubmission('${a._id}')">
              Cancel
            </button>
          ` : ''}

          <div style="font-size: 12px; margin-top: 5px; color: #666;">
            ${submitted ? 'Submitted' : 'Not submitted'}
          </div>
          <div style="font-size: 12px; color: #999;">
            ${courseInfo}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

if (courseFilter) {
  courseFilter.addEventListener('change', renderAssessments);
}

initAssessments();

window.openSubmissionModal = function (assessmentId, name, dueDate, totalMarks, completed) {
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

  if (completed === 'true' || completed === true) {
    statusDiv.textContent = 'This assessment has already been submitted. Uploading again will resubmit.';
    statusDiv.className = 'submission-status info';
  }
  
  // Show modal
  modal.classList.remove('hidden');
};

window.cancelSubmission = async function (assessmentId) {
  if (!confirm("Are you sure you want to cancel your submission?")) return;

  try {
    await apiCancelSubmission(assessmentId);
    alert("Submission cancelled.");
    loadAssessments();
  } catch (err) {
    alert("Error cancelling submission: " + err.message);
  }
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

// Initialize page
initAssessments();

