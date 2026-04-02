requireAuth();

// Makes it so the browser displays text instead of running code if a code is injected via <script> tags
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[s]
  );
}

// Date format
function fmtISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function sameDay(a,b) {
  return a.getFullYear()===b.getFullYear() &&
         a.getMonth()===b.getMonth() &&
         a.getDate()===b.getDate();
}

const statCourses       = document.getElementById('statCourses');
const statAvgProgress   = document.getElementById('statAvgProgress');
const statAvgGrade      = document.getElementById('statAvgGrade');
const statTerm          = document.getElementById('statTerm');
const chart             = document.getElementById('courseChart');
const courseSnapshot    = document.getElementById('courseSnapshot');
const availableCourses  = document.getElementById('availableCourses');
const prevMonthBtn      = document.getElementById('prevMonthBtn');
const nextMonthBtn      = document.getElementById('nextMonthBtn');
const todayBtn          = document.getElementById('todayBtn');
const calendarTitle     = document.getElementById('calendarTitle');
const calendarGrid      = document.getElementById('calendarGrid');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const dayItems          = document.getElementById('dayItems');

let calCursor    = new Date();
let selectedDate = new Date();
let calendarItems = [];

async function loadDashboard() {
  try {
    const [allCourses, enrolledCourses, upcoming] = await Promise.all([
      apiGetAllCourses(),
      apiGetCourses(),
      apiGetUpcomingAssessments()
    ]);

    // Filter available courses: enabled courses not enrolled in
    const enrolledIds = new Set(enrolledCourses.map(c => c._id));
    const available = allCourses.filter(c => !enrolledIds.has(c._id));

    calendarItems = upcoming
    // removes items without due dates
      .filter(a => a.dueDate)
      .map(a => ({
        date:  a.dueDate.slice(0, 10),
        // If the course code is missing, it displays "Course".
        title: `${a.courseId?.code || 'Course'} — ${a.name}`,
        note:  `${a.type} • Weight ${Math.round(a.weight * 100)}% • ${a.completed ? 'Completed' : 'Pending'}`
      }));

    await renderStats(enrolledCourses);
    renderSnapshot(enrolledCourses);
    renderAvailableCourses(available);
    renderCalendar();

  } catch (err) {
    console.error('Dashboard load error:', err);
    courseSnapshot.innerHTML = `<p style="color:#c0392b">Failed to load data: ${escapeHtml(err.message)}</p>`;
  }
}

// Stats
async function renderStats(courses) {
  if (!courses.length) {
    statCourses.textContent     = '0';
    statAvgProgress.textContent = '—';
    statAvgGrade.textContent    = '—';
    statTerm.textContent        = '—';
    return;
  }

  const userId = getUser()?.id || null;
  const averages = await Promise.all(
    courses.map(c => apiGetCourseAverage(c._id, userId).catch(() => ({ average: null })))
  );

  // Removes any null average
  const validAvgs = averages.map(r => r.average).filter(v => v !== null);
  const overallAvg = validAvgs.length
    ? Math.round(validAvgs.reduce((s,v) => s+v, 0) / validAvgs.length)
    : null;

  statCourses.textContent     = courses.length;
  statAvgProgress.textContent = overallAvg !== null ? `${overallAvg}%` : '—';
  statAvgGrade.textContent    = overallAvg !== null ? `${overallAvg}%` : '—';
  statTerm.textContent        = courses[0]?.term || '—';

  renderChart(courses, averages);
}

function renderSnapshot(courses) {
  if (!courses.length) {
    courseSnapshot.innerHTML = `<p class="hint">No courses yet.</p>`;
    return;
  }

  courseSnapshot.innerHTML = courses.map(c => `
    <div class="course">
      <div class="course-top">
        <div class="course-title">
          <strong>${escapeHtml(c.code)} — ${escapeHtml(c.name)}</strong>
          <div class="course-meta">${escapeHtml(c.term || '')} • ${escapeHtml(c.instructor || '')}</div>
        </div>
      </div>
      <div class="course-actions" style="margin-top:8px;">
        <a class="btn primary" href="course-info.html?courseId=${c._id}">View Course</a>
      </div>
    </div>
  `).join('');

  const viewBtn = document.getElementById('viewCourseBtn');
  if (viewBtn) viewBtn.style.display = 'none';
}

function renderAvailableCourses(courses) {
  if (!courses.length) {
    availableCourses.innerHTML = `<p class="hint">No available courses to enroll in.</p>`;
    return;
  }

  availableCourses.innerHTML = courses.map(c => `
    <div class="course-card">
      <div class="course-info">
        <h3>${escapeHtml(c.code)} — ${escapeHtml(c.name)}</h3>
        <p class="course-meta">${escapeHtml(c.term || '')} • ${escapeHtml(c.instructor || '')}</p>
        <p class="course-desc">${escapeHtml(c.description || 'No description available.')}</p>
      </div>
      <button class="btn primary enroll-btn" data-course-id="${c._id}">Enroll</button>
    </div>
  `).join('');

  // Add event listeners for enroll buttons
  document.querySelectorAll('.enroll-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const courseId = e.target.dataset.courseId;
      try {
        await apiEnrollCourse(courseId);
        alert('Successfully enrolled in the course!');
        loadDashboard(); // Reload to update the lists
      } catch (err) {
        alert(`Failed to enroll: ${err.message}`);
      }
    });
  });
}

// Chart
function renderChart(courses, averages) {
  chart.innerHTML = '';
  courses.forEach((c, i) => {
    const avg = averages[i]?.average;
    const bar = document.createElement('div');
    bar.className = 'bar';
    // The bar is at least 8% tall, so even the lowest possible grades are visible
    bar.style.height = `${Math.max(8, avg ?? 0)}%`;
    // If average isn't null and isn't undefined, it puts the average%, otherwise it displays "No grades yet"
    bar.title = `${c.code}: ${avg !== null && avg !== undefined ? avg + '%' : 'No grades yet'}`;
    const label = document.createElement('span');
    label.textContent = c.code;
    bar.appendChild(label);
    chart.appendChild(bar);
  });
}

// Calendar
function renderDayPanel() {
  // Ensures the correct format is used 
  const iso = fmtISO(selectedDate);
  selectedDateLabel.textContent = iso;
  const items = calendarItems.filter(it => it.date === iso);
  dayItems.innerHTML = '';
  if (!items.length) {
    dayItems.innerHTML = `<p class="hint">No items for this day.</p>`;
    return;
  }
  for (const it of items) {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<b>${escapeHtml(it.title)}</b><div class="small">${escapeHtml(it.note)}</div>`;
    dayItems.appendChild(div);
  }
}

function dayCell(dateObj, isMuted) {
  const iso = fmtISO(dateObj);
  const itemsOnDay = calendarItems.filter(it => it.date === iso);
  // Creating a new cell for the day
  const cell = document.createElement('div');
  cell.className = 'day' + (isMuted ? ' muted' : '');
  if (sameDay(dateObj, selectedDate)) cell.classList.add('selected');
  // Grabs only the first 4 items (to avoid the elements overflowing the screen)
  const dots = itemsOnDay.slice(0,4).map(() => `<span class="cdot"></span>`).join('');
  cell.innerHTML = `<div class="num">${dateObj.getDate()}</div><div class="dotline">${dots}</div>`;
  cell.addEventListener('click', () => {
    selectedDate = new Date(dateObj);
    [...calendarGrid.querySelectorAll('.day')].forEach(el => el.classList.remove('selected'));
    cell.classList.add('selected');
    renderDayPanel();
  });
  return cell;
}

function renderCalendar() {
  const monthName = calCursor.toLocaleString('en-US', { month: 'long' });
  calendarTitle.textContent = `${monthName} ${calCursor.getFullYear()}`;
  calendarGrid.innerHTML = '';

  const year = calCursor.getFullYear();
  const month = calCursor.getMonth();
  const first = new Date(year, month, 1);
  // Months go from 0 (January) to 11 (December)
  const last  = new Date(year, month+1, 0);
  const startDow    = first.getDay();
  const daysInMonth = last.getDate();
  const prevLastDay = new Date(year, month, 0).getDate();

  // Calculates how many days from the previous month are needed to fill the first row
  for (let i=0; i<startDow; i++) {
    calendarGrid.appendChild(dayCell(new Date(year, month-1, prevLastDay-(startDow-1-i)), true));
  }
  // Puts the days of the current month
  for (let day=1; day<=daysInMonth; day++) {
    calendarGrid.appendChild(dayCell(new Date(year, month, day), false));
  }

  // Adds days of the next month to fill in the rows
  const remainder = calendarGrid.children.length % 7;
  const fill = remainder === 0 ? 0 : 7 - remainder;
  for (let i=1; i<=fill; i++) {
    calendarGrid.appendChild(dayCell(new Date(year, month+1, i), true));
  }
  renderDayPanel();
}

prevMonthBtn.addEventListener('click', () => {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth()-1, 1);
  renderCalendar();
});
nextMonthBtn.addEventListener('click', () => {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth()+1, 1);
  renderCalendar();
});
todayBtn.addEventListener('click', () => {
  const now = new Date();
  calCursor = new Date(now.getFullYear(), now.getMonth(), 1);
  selectedDate = new Date(now);
  renderCalendar();
});

loadDashboard();