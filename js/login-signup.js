// If already logged in, skip these pages entirely
redirectIfLoggedIn();

const form = document.getElementById("login-signupForm");
const isSignup = !!document.getElementById("firstNameInput");

// Show an error message inside the form
function showError(msg) {
  let el = document.getElementById("authError");
  if (!el) {
    el = document.createElement("p");
    el.id = "authError";
    el.style.cssText =
      "color:#c0392b; margin-top:10px; font-size:0.9rem; text-align:center;";
    form.appendChild(el);
  }
  el.textContent = msg;
}

function clearError() {
  const el = document.getElementById("authError");
  if (el) el.textContent = "";
}

// Get the selected role from radio buttons
function getSelectedRole() {
  const radios = document.getElementsByName("role");
  for (const r of radios) {
    if (r.checked) return r.value.toLowerCase(); // 'admin' or 'student'
  }
  return null;
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  clearError();

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Please wait…";

  try {
    if (isSignup) {
      // Signup
      const firstName = document.getElementById("firstNameInput").value.trim();
      const lastName = document.getElementById("lastNameInput").value.trim();
      const email = document.getElementById("emailInput").value.trim();
      const password = document.getElementById("passwordInput").value;
      const role = getSelectedRole();

      if (!firstName || !lastName || !email || !password) {
        showError("Please fill in all fields.");
        return;
      }

      if (!role) {
        showError("Please select a role (Student or Admin).");
        return;
      }

      const username = `${firstName} ${lastName}`;
      const data = await apiRegister(username, email, password, role);

      saveSession(data);
      window.location.href =
        data.user.role === "admin" ? "manage-course.html" : "dashboard.html";
    } else {
      // Login
      const email = document.querySelector('input[type="text"]').value.trim();
      const password = document.querySelector('input[type="password"]').value;
      const role = getSelectedRole();

      if (!email || !password) {
        showError("Please enter your email and password.");
        return;
      }
      if (!role) {
        showError("Please select a role (Student or Admin).");
        return;
      }

      const data = await apiLogin(email, password);

      // Warn if the role selected doesn't match what the account actually is
      if (data.user.role !== role) {
        showError(
          `This account is registered as "${data.user.role}", not "${role}". Redirecting…`,
        );
        await new Promise((r) => setTimeout(r, 1500));
      }

      saveSession(data);
      window.location.href =
        data.user.role === "admin" ? "manage-course.html" : "dashboard.html";
    }
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isSignup ? "Signup" : "Login";
  }
});
