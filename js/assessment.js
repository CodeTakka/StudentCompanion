class Assessment {
    constructor(name, type, weight, dueDate = null, visible = false, completed = false, progress = 0) {
        this.name = name;
        this.type = type; // e.g. "Exam", "Quiz", "Assignment", "Project"
        this.weight = Math.min(weight, 1);
        this.dueDate = dueDate;
        this.visible = visible;
        this.completed = completed;
        this.progress = progress;
    }

    toggleCompleted() {
        // Changes the status from completed to not completed or from not completed to completed
        this.completed = !this.completed;
    }

    clone() {
        return new Assessment(
            this.name,
            this.type,
            this.weight,
            this.dueDate,
            this.visible,
            this.completed
        );
    }

    calculateGrade(grade) {
        const safeGrade = Math.min(grade, 100);
        const safeWeight = Math.min(this.weight, 1);
        return safeGrade * safeWeight;
    }

    getPercentage() {
        if (this.earnedMarks === null) return 0;
        return (this.earnedMarks / this.totalMarks) * 100;
    }

    getWeightedContribution() {
        return this.getPercentage() * this.weight;
    }

    // Format due date as "Feb 12, 2026"
    formattedDueDate() {
        if (!this.dueDate) return "No due date";
        return this.dueDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

function createSampleAssessments() {
    return [
        new Assessment("Assignment 1", "Assignment", 0.1, new Date(2026, 1, 12)),
        new Assessment("Quiz 1",       "Quiz",       0.2, new Date(2026, 2, 5)),
        new Assessment("Midterm",      "Exam",       0.2, new Date(2026, 2, 20)),
        new Assessment("Final",        "Exam",       0.5, new Date(2026, 3, 15))
    ];
}

/* Example usage:
    const a = new Assessment("Project", "Project", 0.25, new Date(2026, 1, 12));
    console.log(a.formattedDueDate()); // "Feb 12, 2026"
    console.log(a.calculateGrade(90)); // 22.5
*/