document.addEventListener("DOMContentLoaded", function() {
    var form = document.getElementById("createCourseForm");
    var messageDiv = document.getElementById("message");

    form.addEventListener("submit", function(e) {
        e.preventDefault(); // Prevent page reload

        // Collect form data
        var code = form.code.value.trim();
        var name = form.name.value.trim();
        var instructor = form.instructor.value.trim();
        var termSeason = form.termSeason.value;
        var termYear = form.termYear.value;
        var description = form.description.value.trim();
        var enabled = form.enabled.checked;

        // Validation
        if (!code || !name || !instructor || !termSeason || !termYear) {
            messageDiv.className = "message error";
            messageDiv.textContent = "Please fill all required fields!";
            return;
        }

        if (isNaN(termYear) || termYear < 1900 || termYear > 2100) {
            messageDiv.className = "message error";
            messageDiv.textContent = "Please enter a valid year!";
            return;
        }

        // Combine term for display
        var term = termSeason + " " + termYear;

        // Mock success (Deliverable 1)
        messageDiv.className = "message success";
        messageDiv.textContent = "Course \"" + code + "\" (" + term + ") created successfully!";

        console.log("Course submitted: " + code + ", " + name + ", " + instructor + ", " + term + ", enabled=" + enabled);

        form.reset();
    });
});
