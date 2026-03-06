const logoutBtn = document.getElementById("logoutBtn")

// Logout
logoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "home-page.html";
});