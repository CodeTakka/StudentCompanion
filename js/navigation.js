const navigationLogoutBtn = document.getElementById('logoutBtn');

// Logout
if (navigationLogoutBtn) {
  navigationLogoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = 'home-page.html';
  });
}