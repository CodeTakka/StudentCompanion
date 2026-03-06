const form = document.getElementById('login-signupForm');

form.addEventListener('submit', function(event) {
    event.preventDefault();

    const roles = document.getElementsByName('role');
    let selectedRole = "";

    for (let i = 0; i < roles.length; i++) {
        if (roles[i].checked) {
            selectedRole = roles[i].value;
            break; // Leave the loop once selected radio button is found
        }
    }

    if (selectedRole === 'Admin') {
        window.location.href = 'manage-course.html';
    } else if (selectedRole === 'Student') {
        window.location.href = 'dashboard.html';
    } else {
        console.log("No role selected")
    }
});