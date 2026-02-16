document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("createCourseForm");
    const messageDiv = document.getElementById("message");

    const requiredFields = [
        { name: "code", label: "Course Code" },
        { name: "name", label: "Course Name" },
        { name: "instructor", label: "Instructor Name" },
        { name: "termSeason", label: "Term/Season" },
        { name: "termYear", label: "Year" }
    ];

    function validateForm() {
        let isValid = true;
        const errors = []; // collect all error messages

        // Clear previous highlights
        const inputs = form.querySelectorAll("input, select, textarea");
        inputs.forEach(input => input.classList.remove("error-field"));

        requiredFields.forEach(field => {
            const input = form.querySelector(`[name="${field.name}"]`);
            if (!input) {
                console.warn(`Field ${field.name} not found`);
                return;
            }

            // Check if empty
            if (!input.value.trim()) {
                input.classList.add("error-field");
                isValid = false;
                errors.push(`Please fill "${field.label}"`);
            }

            // Extra check for termYear
            if (field.name === "termYear") {
                const year = Number(input.value);
                if (isNaN(year) || year < 1900 || year > 2100) {
                    input.classList.add("error-field");
                    isValid = false;
                    errors.push("Year must be a number between 1900 and 2100");
                }
            }
        });

        if (!isValid) {
            messageDiv.className = "message error";
            // Join errors with line breaks for readability
            messageDiv.innerHTML = errors.join("<br>");
        }

        return isValid;
    }

    form.addEventListener("submit", function(e) {
        e.preventDefault();

        // Stops the submit event listener if the form isn't valid
        if (!validateForm()) return;

        const code = form.code.value.trim();
        const name = form.name.value.trim();
        const instructor = form.instructor.value.trim();
        const termSeason = form.termSeason.value;
        const termYear = form.termYear.value;
        const description = form.description.value.trim();
        const enabled = form.enabled.checked;

        const term = termSeason + " " + termYear;

        messageDiv.className = "message success";
        messageDiv.textContent = `Course "${code}" (${term}) created successfully!`;

        console.log({ code, name, instructor, term, enabled });

        form.reset();
    });
});
