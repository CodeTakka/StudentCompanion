const CURRENT_TERM = "Winter 2026";

const COURSE = {
  code: "SOEN 287",
  name: "Web Programming",
  instructor: "Professor",
  term: CURRENT_TERM,
};

const ASSESSMENTS = [
  {
    assessment: "Quiz 1",
    type: "Quiz",
    due: "2026-02-12",
    gradeOutOf100: 87,
    weightPercent: 5,
    completed: true,
  },
  {
    assessment: "Midterm 1",
    type: "Exam",
    due: "2026-02-20",
    gradeOutOf100: 76,
    weightPercent: 25,
    completed: true,
  },
  {
    assessment: "Quiz 2",
    type: "Quiz",
    due: "2026-03-06",
    gradeOutOf100: null,
    weightPercent: 5,
    completed: false,
  },
  {
    assessment: "Final Exam",
    type: "Exam",
    due: "2026-04-15",
    gradeOutOf100: null,
    weightPercent: 45,
    completed: false,
  },
];

// Elements
const statCourses = document.getElementById("statCourses");
const statAvgProgress = document.getElementById("statAvgProgress");
const statAvgGrade = document.getElementById("statAvgGrade");
const statTerm = document.getElementById("statTerm");
const chart = document.getElementById("courseChart");

const courseSnapshot = document.getElementById("courseSnapshot");
const logoutBtn = document.getElementById("logoutBtn");

// Calendar elements
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const todayBtn = document.getElementById("todayBtn");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const dayItems = document.getElementById("dayItems");

// Calendar state
let calCursor = new Date();
let selectedDate = new Date();

// -------- Utils --------
function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (s) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[s],
  );
}

function clampPercent(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function fmtISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// -------- Progress + Avg Grade logic --------
// Progress = sum(weights of completed) / sum(weights of all listed) * 100
// Avg Grade = weighted average over completed only (normalized by completed weight)
function computeCourseProgressAndAvg() {
  const totalWeight = ASSESSMENTS.reduce(
    (s, a) => s + clampPercent(a.weightPercent),
    0,
  );
  const completed = ASSESSMENTS.filter((a) => a.completed);
  const completedWeight = completed.reduce(
    (s, a) => s + clampPercent(a.weightPercent),
    0,
  );

  const progress = totalWeight
    ? Math.round((completedWeight / totalWeight) * 100)
    : 0;

  let avgGrade = null;
  if (completed.length && completedWeight > 0) {
    let weightedSum = 0;
    for (const a of completed) {
      const g = clampPercent(a.gradeOutOf100);
      const w = clampPercent(a.weightPercent);
      weightedSum += g * w;
    }
    avgGrade = Math.round(weightedSum / completedWeight);
  }

  return { progress, avgGrade };
}

// -------- Render Snapshot + Stats + Chart --------
function renderSnapshotAndStats() {
  const { progress, avgGrade } = computeCourseProgressAndAvg();

  // Stats
  statCourses.textContent = "1";
  statAvgProgress.textContent = `${progress}%`;
  statAvgGrade.textContent = avgGrade === null ? "—" : `${avgGrade}%`;
  statTerm.textContent = COURSE.term;

  // Snapshot card
  courseSnapshot.innerHTML = `
    <div class="course">
      <div class="course-top">
        <div class="course-title">
          <strong>${escapeHtml(COURSE.code)} — ${escapeHtml(COURSE.name)}</strong>
          <div class="course-meta">${escapeHtml(COURSE.term)} • ${escapeHtml(COURSE.instructor)}</div>

          <div class="pills">
            <span class="pill good">Progress: ${progress}%</span>
            <span class="pill">Avg Grade: ${avgGrade === null ? "—" : `${avgGrade}%`}</span>
          </div>

          <div class="progress" aria-label="Course progress bar">
            <div style="width:${progress}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Chart: two bars (Grade + Progress)
  chart.innerHTML = "";

  const gradeBar = document.createElement("div");
  gradeBar.className = "bar";
  gradeBar.style.height = `${Math.max(8, avgGrade ?? 0)}%`;
  gradeBar.title = `Average Grade: ${avgGrade === null ? "—" : `${avgGrade}%`}`;
  const gradeLabel = document.createElement("span");
  gradeLabel.textContent = "Grade";
  gradeBar.appendChild(gradeLabel);

  const progressBar = document.createElement("div");
  progressBar.className = "bar";
  progressBar.style.height = `${Math.max(8, progress)}%`;
  progressBar.title = `Progress: ${progress}%`;
  const progressLabel = document.createElement("span");
  progressLabel.textContent = "Progress";
  progressBar.appendChild(progressLabel);

  chart.appendChild(gradeBar);
  chart.appendChild(progressBar);
}

// -------- Calendar items (due dates) --------
function getCalendarItems() {
  return ASSESSMENTS.map((a) => ({
    date: a.due,
    title: `${COURSE.code} — ${a.assessment}`,
    note: `${a.type} • Weight ${a.weightPercent}% • ${a.completed ? "Completed" : "Pending"}`,
  }));
}

function renderDayPanel() {
  const iso = fmtISO(selectedDate);
  selectedDateLabel.textContent = iso;

  const items = getCalendarItems().filter((it) => it.date === iso);

  dayItems.innerHTML = "";
  if (!items.length) {
    dayItems.innerHTML = `<p class="hint">No items for this day.</p>`;
    return;
  }

  for (const it of items) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <b>${escapeHtml(it.title)}</b>
      <div class="small">${escapeHtml(it.note)}</div>
    `;
    dayItems.appendChild(div);
  }
}

function dayCell(dateObj, isMuted) {
  const iso = fmtISO(dateObj);
  const itemsOnDay = getCalendarItems().filter((it) => it.date === iso);

  const cell = document.createElement("div");
  cell.className = "day" + (isMuted ? " muted" : "");
  if (sameDay(dateObj, selectedDate)) cell.classList.add("selected");

  const dots = itemsOnDay
    .slice(0, 4)
    .map(() => `<span class="cdot"></span>`)
    .join("");

  cell.innerHTML = `
    <div class="num">${dateObj.getDate()}</div>
    <div class="dotline">${dots}</div>
  `;

  cell.addEventListener("click", () => {
    selectedDate = new Date(dateObj);
    [...calendarGrid.querySelectorAll(".day")].forEach((el) =>
      el.classList.remove("selected"),
    );
    cell.classList.add("selected");
    renderDayPanel();
  });

  return cell;
}

function renderCalendar() {
  const monthName = calCursor.toLocaleString("en-US", { month: "long" });
  calendarTitle.textContent = `${monthName} ${calCursor.getFullYear()}`;

  calendarGrid.innerHTML = "";

  const year = calCursor.getFullYear();
  const month = calCursor.getMonth();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const startDow = first.getDay();
  const daysInMonth = last.getDate();

  // Previous month trailing
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = 0; i < startDow; i++) {
    const dayNum = prevLastDay - (startDow - 1 - i);
    calendarGrid.appendChild(dayCell(new Date(year, month - 1, dayNum), true));
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarGrid.appendChild(dayCell(new Date(year, month, day), false));
  }

  // Next month fill
  const totalCells = calendarGrid.children.length;
  const remainder = totalCells % 7;
  const fill = remainder === 0 ? 0 : 7 - remainder;
  for (let i = 1; i <= fill; i++) {
    calendarGrid.appendChild(dayCell(new Date(year, month + 1, i), true));
  }

  renderDayPanel();
}

// Controls
prevMonthBtn.addEventListener("click", () => {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1);
  renderCalendar();
});
nextMonthBtn.addEventListener("click", () => {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1);
  renderCalendar();
});
todayBtn.addEventListener("click", () => {
  const now = new Date();
  calCursor = new Date(now.getFullYear(), now.getMonth(), 1);
  selectedDate = new Date(now);
  renderCalendar();
});

// Logout
logoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "login.html";
});

// -------- Initial render --------
function rerenderAll() {
  renderSnapshotAndStats();

  // Start calendar on Feb 2026 so due dates are visible immediately
  calCursor = new Date(2026, 1, 1); // February 2026
  selectedDate = new Date(2026, 1, 12); // Feb 12, 2026
  renderCalendar();
}

rerenderAll();
