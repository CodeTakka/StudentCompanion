/**
 * DASHBOARD ONLY (Deliverable 1)
 * - No login logic
 * - No assessments module
 * - Read-only display of: courses + calendar + progression
 */

// ---------------------------
// 1) student + courses
// ---------------------------
const student = {
  name: "Student Name" // change to your name for demo
};

// Term dates (progress is based on this)
const term = {
  name: "Winter 2026",
  start: "2026-01-06", // YYYY-MM-DD
  end:   "2026-04-20"
};

/**
 * Courses contain weekly meeting patterns.
 * meeting.days: array of weekday numbers 
 * type: "lecture" | "lab" | "tutorial"
 */
const courses = [
  {
    id: "c1",
    code: "SOEN 287",
    name: "Web Programming",
    instructor: "TBA",
    meeting: { type: "lecture", days: [1, 3], time: "10:15–11:30" } // Mon/Wed
  },
  {
    id: "c2",
    code: "SOEN 228",
    name: "System Hardware",
    instructor: "TBA",
    meeting: { type: "lab", days: [4], time: "14:45–17:15" } // Thu
  },
  {
    id: "c3",
    code: "ENGR 201",
    name: "Ethics & Professional Practice",
    instructor: "TBA",
    meeting: { type: "tutorial", days: [2], time: "13:15–14:30" } // Tue
  }
];

// ---------------------------
// 2) Elements
// ---------------------------
const el = {
  studentName: document.getElementById("studentName"),
  courseCount: document.getElementById("courseCount"),
  termProgress: document.getElementById("termProgress"),
  todayLabel: document.getElementById("todayLabel"),

  weekdays: document.getElementById("weekdays"),
  calGrid: document.getElementById("calGrid"),
  calTitle: document.getElementById("calTitle"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),

  courseGrid: document.getElementById("courseGrid"),
  logoutBtn: document.getElementById("logoutBtn")
};

// ---------------------------
// 3) Calendar state
// ---------------------------
const calState = {
  month: new Date().getMonth(),
  year: new Date().getFullYear()
};

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ---------------------------
// 4) Date helpers
// ---------------------------
function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function parseISO(iso) {
  // iso = "YYYY-MM-DD"
  return new Date(iso + "T00:00:00");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatTodayLong() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function isWithinTerm(isoDate) {
  return isoDate >= term.start && isoDate <= term.end;
}

// ---------------------------
// 5) Progress calculation
// ---------------------------
function termProgressPercent() {
  const t0 = parseISO(term.start).getTime();
  const t1 = parseISO(term.end).getTime();
  const now = parseISO(isoToday()).getTime();

  const pct = ((now - t0) / (t1 - t0)) * 100;
  return Math.round(clamp(pct, 0, 100));
}

/**
 * Course progress: same as term progress (Deliverable 1).
 * Later, you can replace this with real course completion metrics.
 */
function courseProgressPercent() {
  return termProgressPercent();
}

// ---------------------------
// 6) Rendering: Header + Summary
// ---------------------------
function renderHeaderAndSummary() {
  el.studentName.textContent = student.name;
  el.courseCount.textContent = String(courses.length);
  el.termProgress.textContent = String(termProgressPercent());
  el.todayLabel.textContent = formatTodayLong();
}

// ---------------------------
// 7) Rendering: Courses grid
// ---------------------------
function renderCourses() {
  el.courseGrid.innerHTML = "";

  for (const c of courses) {
    const pct = courseProgressPercent(); // same for now

    const card = document.createElement("div");
    card.className = "course";
    card.innerHTML = `
      <div class="code">${escapeHtml(c.code)}</div>
      <div class="info">${escapeHtml(c.name)} • ${escapeHtml(term.name)}</div>
      <div class="info">Instructor: ${escapeHtml(c.instructor || "—")}</div>
      <div class="info">${capitalize(c.meeting.type)}: ${daysText(c.meeting.days)} • ${escapeHtml(c.meeting.time)}</div>

      <div class="progress" aria-label="Course progress">
        <div style="width:${pct}%"></div>
      </div>
      <div class="pct">${pct}% of the term completed</div>
    `;

    el.courseGrid.appendChild(card);
  }
}

function daysText(daysArr) {
  // ex: [1,3] => "Mon, Wed"
  return daysArr.map(d => WEEKDAYS[d]).join(", ");
}

// ---------------------------
// 8) Rendering: Calendar
// ---------------------------
function renderWeekdays() {
  el.weekdays.innerHTML = WEEKDAYS.map(d => `<div>${d}</div>`).join("");
}

function renderCalendar() {
  const { month, year } = calState;
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  el.calTitle.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const startDay = first.getDay();       // 0..6 weekday of the 1st
  const daysInMonth = last.getDate();    // 28..31

  // previous month info (to fill leading cells)
  const prevLast = new Date(year, month, 0);
  const prevDays = prevLast.getDate();

  el.calGrid.innerHTML = "";

  // 42 cells (6 weeks) keeps layout stable
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement("div");
    cell.className = "day";

    let dayNum, cellMonth = month, cellYear = year, otherMonth = false;

    if (i < startDay) {
      // previous month
      dayNum = prevDays - (startDay - 1 - i);
      otherMonth = true;
      cellMonth = month - 1;
      if (cellMonth < 0) { cellMonth = 11; cellYear = year - 1; }
    } else if (i >= startDay + daysInMonth) {
      // next month
      dayNum = i - (startDay + daysInMonth) + 1;
      otherMonth = true;
      cellMonth = month + 1;
      if (cellMonth > 11) { cellMonth = 0; cellYear = year + 1; }
    } else {
      // current month
      dayNum = i - startDay + 1;
    }

    if (otherMonth) cell.classList.add("other-month");

    const iso = new Date(cellYear, cellMonth, dayNum).toISOString().slice(0, 10);
    const weekday = new Date(cellYear, cellMonth, dayNum).getDay();

    // badges: show course meetings that fall on this weekday
    const badges = isWithinTerm(iso)
      ? meetingsForWeekday(weekday).slice(0, 3) // show up to 3 badges
      : [];

    cell.innerHTML = `
      <div class="num">${dayNum}</div>
      <div class="badges">
        ${badges.map(b => `
          <span class="badge ${b.type}" title="${escapeHtml(b.full)}">
            ${escapeHtml(b.short)}
          </span>
        `).join("")}
      </div>
    `;

    el.calGrid.appendChild(cell);
  }
}

function meetingsForWeekday(weekday) {
  // returns badges for courses meeting on that weekday
  const results = [];
  for (const c of courses) {
    if (c.meeting.days.includes(weekday)) {
      results.push({
        type: c.meeting.type,              // lecture/lab/tutorial (used in CSS)
        short: `${c.code}`,                // visible
        full: `${c.code} • ${c.meeting.type} • ${c.meeting.time}` // tooltip
      });
    }
  }
  return results;
}

// ---------------------------
// 9) Events
// ---------------------------
el.prevMonthBtn.addEventListener("click", () => {
  calState.month--;
  if (calState.month < 0) { calState.month = 11; calState.year--; }
  renderCalendar();
});

el.nextMonthBtn.addEventListener("click", () => {
  calState.month++;
  if (calState.month > 11) { calState.month = 0; calState.year++; }
  renderCalendar();
});

// Demo logout (since login not your part)
el.logoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Logout is handled by the login/auth module (not part of dashboard).");
});

// ---------------------------
// 10) Utilities
// ---------------------------
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

// ---------------------------
// 11) Init
// ---------------------------
renderWeekdays();
renderHeaderAndSummary();
renderCourses();
renderCalendar();
