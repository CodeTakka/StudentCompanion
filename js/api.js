// shared utility for all fetch calls to the backend
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
  const query = studentId ? `?studentId=${studentId}` : '';
  return apiFetch(`/courses/${id}/average${query}`);
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

async function apiGetAssessments(courseId) {
  return apiFetch(`/assessments?courseId=${courseId}`);
}

async function apiGetUpcomingAssessments() {
  return apiFetch("/assessments/upcoming");
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
