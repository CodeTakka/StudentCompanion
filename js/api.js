// Shared utility for all fetch calls to the backend
// Every page that needs the API should load this script first.

const API_BASE = "/api";

// Token helpers

function saveSession(data) {
  // data = { token, user: { id, username, email, role } }
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function isLoggedIn() {
  /* getToken() could return a string (the actual token) or null (if no one is logged in)
       so !!getToken() is used to force a boolean (true or false)
    */
  return !!getToken();
}

/* Redirect to login if not authenticated.
   This method should be called at the top of every protected page.

*/

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

/* Redirect to login if not admin.
   This method should be called at the top of every admin page.
*/

function requireAdmin() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  const user = getUser();
  if (user.role !== "admin") {
    window.location.href = "dashboard.html";
  }
}

/* Redirect to dashboard/admin if already logged in.
   This method should be called on login and sign-up pages.
*/

function redirectIfLoggedIn() {
  if (!isLoggedIn()) return;
  const user = getUser();
  window.location.href =
    user.role === "admin" ? "manage-course.html" : "dashboard.html";
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = { "Content-Type": "application/json", ...options.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If token expired or invalid, kick back to login
  if (res.status === 401) {
    clearSession();
    window.location.href = "login.html";
    return;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// Authentification

async function apiRegister(username, email, password, role) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password, role }),
  });
}

async function apiLogin(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Courses

async function apiGetCourses() {
  return apiFetch("/courses");
}

async function apiGetAllCourses() {
  return apiFetch("/courses?all=true");
}

async function apiGetCourse(id) {
  return apiFetch(`/courses/${id}`);
}

async function apiGetCourseAverage(id, studentId = null) {
  const query = studentId ? `?studentId=${studentId}` : "";
  return apiFetch(`/courses/${id}/average${query}`);
}

async function apiGetCourseAverageGlobal(courseId) {
  return apiFetch(`/courses/${courseId}/average-global`);
}

async function apiCreateCourse(data) {
  return apiFetch("/courses", { method: "POST", body: JSON.stringify(data) });
}

async function apiUpdateCourse(id, data) {
  return apiFetch(`/courses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

async function apiDeleteCourse(id) {
  return apiFetch(`/courses/${id}`, { method: "DELETE" });
}

async function apiEnrollCourse(id) {
  return apiFetch(`/courses/${id}/enroll`, { method: "POST" });
}

// Assessments

async function apiGetAssessments(courseId = null) {
  return apiFetch(
    courseId ? `/assessments?courseId=${courseId}` : "/assessments",
  );
}

async function apiGetUpcomingAssessments() {
  return apiFetch("/assessments/upcoming");
}

async function apiGetAssessment(id) {
  return apiFetch(`/assessments/${id}`);
}

async function apiCreateAssessment(data) {
  return apiFetch("/assessments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function apiUpdateAssessment(id, data) {
  return apiFetch(`/assessments/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

async function apiDeleteAssessment(id) {
  return apiFetch(`/assessments/${id}`, { method: "DELETE" });
}

// Submissions

async function apiSubmitAssessment(assessmentId, file) {
  const formData = new FormData();
  formData.append("assessmentId", assessmentId);
  formData.append("file", file);

  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/submissions`, {
    method: "POST",
    headers,
    body: formData,
  });

  // If token expired or invalid, kick back to login
  if (res.status === 401) {
    clearSession();
    window.location.href = "login.html";
    return;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to submit assessment.");
  }

  return data;
}

async function apiSubmitAssessmentWithoutFile(assessmentId) {
  const fd = new FormData();
  fd.append("assessmentId", assessmentId);
  fd.append("noFile", "true");

  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/submissions`, {
    method: "POST",
    headers,
    body: fd
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

async function apiGetSubmissions(assessmentId, studentId = null) {
  const query = studentId
    ? `?assessmentId=${assessmentId}&studentId=${studentId}`
    : `?assessmentId=${assessmentId}`;
  return apiFetch(`/submissions/by-assessment${query}`);
}

async function apiGetAllSubmissions() {
  return apiFetch("/submissions");
}

async function apiUpdateSubmission(submissionId, data) {
  return apiFetch(`/submissions/${submissionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

async function apiGradeSubmission(data) {
  return apiFetch("/submissions/grade", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function apiGetAssessmentSubmissions(assessmentId) {
  return apiFetch(`/submissions/assessment/${assessmentId}/all`);
}

async function apiCancelSubmission(assessmentId) {
  const res = await fetch(`/api/submissions/${assessmentId}/cancel`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + getToken() },
  });
  if (!res.ok) throw new Error("Failed to cancel submission");
  return res.json();
}

// Admin

async function apiGetStats() {
  return apiFetch("/admin/stats");
}

async function apiGetTemplates() {
  return apiFetch("/admin/templates");
}

async function apiGetUser(id) {
  return apiFetch(`/admin/users/${id}`);
}

// Download submission file with proper authorization header
async function downloadSubmissionFile(submissionId) {
  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `${API_BASE}/submissions/${submissionId}/download`,
      {
        headers,
      },
    );

    if (res.status === 401) {
      clearSession();
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to download file.");
    }

    // Get the filename from Content-Disposition header
    const contentDisposition = res.headers.get("Content-Disposition");
    let filename = "download";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(
        /filename[^;=\n]*=(["\']?)([^\n"\']*)\1/,
      );
      if (filenameMatch) filename = filenameMatch[2];
    }

    // Create blob and trigger download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (err) {
    alert("Download failed: " + err.message);
  }
}
