const logoutBtn = document.getElementById('logoutBtn');

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = 'home-page.html';
  });
}