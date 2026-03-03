document.addEventListener('DOMContentLoaded', () => {
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    let isLightMode = localStorage.getItem('habitforge-theme') === 'light';

    if (isLightMode) {
        document.documentElement.classList.add('light-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggleBtn.addEventListener('click', () => {
        isLightMode = !isLightMode;
        if (isLightMode) {
            document.documentElement.classList.add('light-mode');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('habitforge-theme', 'light');
        } else {
            document.documentElement.classList.remove('light-mode');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('habitforge-theme', 'dark');
        }
        initCharts();
    });

    let trackerData = [];
    let hoursSlept = [];
    let dailyMoods = [];

    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const newHabitInput = document.getElementById('new-habit-input');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const weekRow = document.getElementById('week-row');
    const dayRow = document.getElementById('day-row');
    const habitBody = document.getElementById('habit-body');
    const trackerFoot = document.getElementById('tracker-foot');

    monthSelect.value = currentMonth;
    yearSelect.value = currentYear;

    function getDaysInMonth(month, year) {
        return new Date(year, month + 1, 0).getDate();
    }

    function getStorageKey() {
        return `habitforge-${currentYear}-${currentMonth}`;
    }

    function loadData() {
        daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const stored = localStorage.getItem(getStorageKey());

        if (stored) {
            const parsed = JSON.parse(stored);
            trackerData = parsed.trackerData || [];
            hoursSlept = parsed.hoursSlept || Array(daysInMonth).fill(0);
            dailyMoods = parsed.dailyMoods || Array(daysInMonth).fill(0);
        } else {
            trackerData = [];
            hoursSlept = Array(daysInMonth).fill(0);
            dailyMoods = Array(daysInMonth).fill(0);
        }
    }

    function saveData() {
        localStorage.setItem(getStorageKey(), JSON.stringify({
            trackerData,
            hoursSlept,
            dailyMoods
        }));
    }

    function checkYearChange(val) {
        let yr = parseInt(val);
        if (!isNaN(yr) && yr >= 2000 && yr <= 2100 && val.length === 4) {
            currentYear = yr;
            refreshApp();
        }
    }

    monthSelect.addEventListener('change', (e) => {
        currentMonth = parseInt(e.target.value);
        refreshApp();
    });

    yearSelect.addEventListener('input', (e) => checkYearChange(e.target.value));
    yearSelect.addEventListener('change', (e) => {
        let yr = parseInt(e.target.value);
        if (!isNaN(yr) && yr >= 2000 && yr <= 2100) {
            currentYear = yr;
            refreshApp();
        }
    });

    addHabitBtn.addEventListener('click', addNewHabit);
    newHabitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNewHabit();
    });

    function addNewHabit() {
        const hName = newHabitInput.value.trim();
        if (hName && !trackerData.find(h => h.name === hName)) {
            trackerData.push({
                name: hName,
                days: Array(daysInMonth).fill(false)
            });
            saveData();
            newHabitInput.value = '';
            renderTable();
        } else if (trackerData.find(h => h.name === hName)) {
            alert('This habit already exists in this month!');
        }
    }

    window.deleteHabit = (hIndex) => {
        trackerData.splice(hIndex, 1);
        saveData();
        renderTable();
    };

    window.toggleDay = (hIndex, dIndex) => {
        trackerData[hIndex].days[dIndex] = !trackerData[hIndex].days[dIndex];
        saveData();
        renderTable();
    };

    window.updateHours = (dIndex, val) => {
        let trimmed = val.trim();
        if (trimmed === "") {
            hoursSlept[dIndex] = 0;
        } else {
            let num = parseInt(trimmed) || 0;
            if (num > 24) num = 24;
            if (num < 0) num = 0;
            hoursSlept[dIndex] = num;

            const inputs = document.querySelectorAll('.hours-input');
            if (inputs[dIndex]) inputs[dIndex].value = num;
        }

        saveData();
        if (sleepChart) {
            const maxVal = hoursSlept.length ? Math.max(...hoursSlept) : 0;
            sleepChart.data.datasets[0].data = hoursSlept;
            sleepChart.options.scales.y.max = Math.max(12, Math.min(24, maxVal));
            sleepChart.update();
        }
    };

    window.cycleMood = (dIndex) => {
        dailyMoods[dIndex] = (dailyMoods[dIndex] + 1) % 4;
        saveData();

        const cells = document.querySelectorAll('.mood-cell');
        if (cells[dIndex]) {
            const emojis = ['<span style="opacity:0.2">-</span>', '\uD83D\uDE21', '\uD83D\uDE1E', '\uD83D\uDE00'];
            cells[dIndex].innerHTML = emojis[dailyMoods[dIndex]];
        }

        if (moodChart) {
            moodChart.data.datasets[0].data = dailyMoods;
            moodChart.update();
        }
    };

    function refreshApp() {
        loadData();
        renderTableHeaders();
        renderTable();
    }

    function renderTableHeaders() {
        weekRow.innerHTML = `<th rowspan="2" class="habit-name">Habits</th>`;
        dayRow.innerHTML = '';

        const numWeeks = Math.ceil(daysInMonth / 7);
        for (let w = 1; w <= numWeeks; w++) {
            const daysInThisWeek = (w === numWeeks) ? (daysInMonth - (w - 1) * 7) : 7;
            weekRow.innerHTML += `<th colspan="${daysInThisWeek}">W${w}</th>`;
        }
        weekRow.innerHTML += `<th rowspan="2" class="progress-cell">Prog</th><th rowspan="2" class="action-cell"></th>`;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(currentYear, currentMonth, d);
            const initial = dayNames[dateObj.getDay()];
            dayRow.innerHTML += `
                <th>
                    <div>${d}</div>
                    <div class="day-label">${initial}</div>
                </th>`;
        }
    }

    function renderTable() {
        habitBody.innerHTML = '';

        if (trackerData.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${daysInMonth + 3}" class="empty-message">Your list is empty. Add your first habit above!</td>`;
            habitBody.appendChild(tr);
        }

        let dailyTotals = Array(daysInMonth).fill(0);
        let totalPossible = trackerData.length * daysInMonth;

        trackerData.forEach((habit, hIndex) => {
            const tr = document.createElement('tr');
            tr.style.animation = `fadeSlideIn ${0.05 * hIndex}s ease forwards`;
            tr.style.opacity = '0';

            const tdName = document.createElement('td');
            tdName.className = 'habit-name';
            tr.appendChild(tdName);

            let completedDays = 0;
            habit.days.forEach((isDone, dIndex) => {
                if (isDone) {
                    completedDays++;
                    dailyTotals[dIndex]++;
                }

                const td = document.createElement('td');
                td.className = `checkbox-cell ${isDone ? 'checked' : ''}`;
                td.innerHTML = `
                    <label class="custom-checkbox">
                        <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleDay(${hIndex}, ${dIndex})">
                        <div class="checkmark"></div>
                    </label>
                `;
                tr.appendChild(td);
            });

            // Calculate percentage dynamically for tasks column
            const percent = daysInMonth === 0 ? 0 : Math.round((completedDays / daysInMonth) * 100);
            tdName.innerHTML = `
                <div class="habit-title" title="${habit.name}">${habit.name}</div>
                <div class="habit-percent">${percent}%</div>
            `;

            const tdProg = document.createElement('td');
            tdProg.className = 'progress-cell';
            tdProg.innerHTML = `
                <div class="prog-text">${completedDays}/${daysInMonth}</div>
                <div class="prog-bar-mini"><div class="prog-fill" style="width:${percent}%"></div></div>
            `;
            tr.appendChild(tdProg);

            const tdAction = document.createElement('td');
            tdAction.className = 'action-cell';
            tdAction.innerHTML = `<button class="del-btn" onclick="deleteHabit(${hIndex})" title="Delete"><i class="fa-solid fa-trash"></i></button>`;
            tr.appendChild(tdAction);

            habitBody.appendChild(tr);
        });

        const totalCompleted = dailyTotals.reduce((a, b) => a + b, 0);

        trackerFoot.innerHTML = '';

        const totalTr = document.createElement('tr');
        totalTr.innerHTML = `<td class="habit-name"><div class="habit-title">Total</div></td>`;
        dailyTotals.forEach(total => {
            if (total === trackerData.length && trackerData.length !== 0) {
                totalTr.innerHTML += `<td class="perfect-day">${total}</td>`;
            } else {
                totalTr.innerHTML += `<td>${total}</td>`;
            }
        });
        totalTr.innerHTML += `<td class="progress-cell">${totalCompleted}/${totalPossible}</td><td></td>`;
        trackerFoot.appendChild(totalTr);

        const hoursTr = document.createElement('tr');
        hoursTr.innerHTML = `<td class="habit-name"><div class="habit-title">Sleep</div></td>`;
        hoursSlept.forEach((hours, dIndex) => {
            const hStr = hours === 0 ? '' : hours;
            hoursTr.innerHTML += `
                <td>
                    <input type="number" class="hours-input" value="${hStr}" 
                           min="0" max="24"
                           onchange="updateHours(${dIndex}, this.value)">
                </td>
            `;
        });
        hoursTr.innerHTML += `<td class="progress-cell">-</td><td></td>`;
        trackerFoot.appendChild(hoursTr);

        const moodTr = document.createElement('tr');
        moodTr.innerHTML = `<td class="habit-name"><div class="habit-title">Mood</div></td>`;
        const emojis = ['<span style="opacity:0.2">-</span>', '\uD83D\uDE21', '\uD83D\uDE1E', '\uD83D\uDE00'];
        dailyMoods.forEach((mood, dIndex) => {
            moodTr.innerHTML += `
                <td class="mood-cell" onclick="cycleMood(${dIndex})" title="Click to change mood">
                    ${emojis[mood]}
                </td>
            `;
        });
        moodTr.innerHTML += `<td class="progress-cell">-</td><td></td>`;
        trackerFoot.appendChild(moodTr);

        updateCharts(dailyTotals, totalCompleted, totalPossible);
        updateStreaks(dailyTotals);
    }

    let lineChart, donutChart, sleepChart, moodChart;

    function initCharts() {
        if (lineChart) lineChart.destroy();
        if (donutChart) donutChart.destroy();
        if (sleepChart) sleepChart.destroy();
        if (moodChart) moodChart.destroy();

        const isLightMode = document.documentElement.classList.contains('light-mode');

        const textColor = isLightMode ? '#64748b' : '#8c8f96';
        const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
        const tooltipBg = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 20, 25, 0.95)';
        const tooltipText = isLightMode ? '#0f172a' : '#fff';
        const pointBg = isLightMode ? '#fff' : '#141419';
        const donutRemaining = isLightMode ? '#e2e8f0' : '#262630';

        Chart.defaults.color = textColor;
        Chart.defaults.font.family = "'Outfit', sans-serif";

        const ctxLine = document.getElementById('dailyChart').getContext('2d');

        let gradient = ctxLine.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, isLightMode ? 'rgba(79, 70, 229, 0.3)' : 'rgba(107, 76, 230, 0.4)');
        gradient.addColorStop(1, 'rgba(107, 76, 230, 0.0)');

        const accentCol = isLightMode ? '#4f46e5' : '#6b4ce6';

        let currentDailyTotals = Array(daysInMonth).fill(0);
        if (trackerData.length > 0) {
            trackerData.forEach(h => {
                h.days.forEach((val, i) => { if (val) currentDailyTotals[i]++; });
            });
        }

        const chartLabels = Array.from({ length: daysInMonth }, (_, i) => {
            const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dateObj = new Date(currentYear, currentMonth, i + 1);
            return `${i + 1} ${shortDays[dateObj.getDay()]}`;
        });

        lineChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Completed Tasks',
                    data: currentDailyTotals,
                    borderColor: accentCol,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: pointBg,
                    pointBorderColor: accentCol,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: trackerData.length || 5,
                        ticks: { stepSize: 1, padding: 10 },
                        grid: { color: gridColor },
                        border: { display: false }
                    },
                    x: {
                        ticks: {
                            padding: 5,
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 14,
                            font: { size: window.innerWidth < 768 ? 9 : 12 }
                        },
                        grid: { display: false },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: tooltipText,
                        bodyColor: tooltipText,
                        titleFont: { size: 14, family: "'Outfit', sans-serif" },
                        bodyFont: { size: 14, family: "'Outfit', sans-serif" },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                    }
                }
            }
        });

        const ctxDonut = document.getElementById('donutChart').getContext('2d');

        let totalPossible = trackerData.length * daysInMonth;
        let totalCompleted = currentDailyTotals.reduce((a, b) => a + b, 0);
        let remaining = totalPossible - totalCompleted;
        if (totalPossible === 0) { totalCompleted = 0; remaining = 1; }

        donutChart = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Missed'],
                datasets: [{
                    data: [totalCompleted, remaining],
                    backgroundColor: totalPossible === 0 ? [donutRemaining, donutRemaining] : ['#10b981', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' }
                    },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: tooltipText,
                        bodyColor: tooltipText,
                        padding: 12,
                        cornerRadius: 8
                    }
                }
            }
        });

        const ctxSleep = document.getElementById('sleepChart').getContext('2d');
        let sleepGradient = ctxSleep.createLinearGradient(0, 0, 0, 400);
        sleepGradient.addColorStop(0, isLightMode ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.7)');
        sleepGradient.addColorStop(1, isLightMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)');
        const sleepAccentCol = '#10b981';

        sleepChart = new Chart(ctxSleep, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Hours Slept',
                    data: hoursSlept,
                    backgroundColor: sleepGradient,
                    borderColor: sleepAccentCol,
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: sleepAccentCol
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: Math.max(12, Math.min(24, hoursSlept.length ? Math.max(...hoursSlept) : 0)),
                        ticks: {
                            stepSize: 2,
                            padding: 10,
                            callback: function (value) {
                                return value + 'hr';
                            }
                        },
                        grid: { color: gridColor },
                        border: { display: false }
                    },
                    x: {
                        ticks: {
                            padding: 5,
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 14,
                            font: { size: window.innerWidth < 768 ? 9 : 12 }
                        },
                        grid: { display: false },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: tooltipText,
                        bodyColor: tooltipText,
                        titleFont: { size: 14, family: "'Outfit', sans-serif" },
                        bodyFont: { size: 14, family: "'Outfit', sans-serif" },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                    }
                }
            }
        });

        const ctxMood = document.getElementById('moodChart').getContext('2d');
        moodChart = new Chart(ctxMood, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: 'Mood',
                        data: dailyMoods,
                        borderColor: '#e8a317',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        yAxisID: 'y',
                        tension: 0.4,
                        pointBackgroundColor: '#eab308',
                        pointHoverRadius: 6,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 3,
                        grid: { color: gridColor },
                        ticks: {
                            stepSize: 1,
                            callback: function (value) {
                                if (value === 1) return '\uD83D\uDE21';
                                if (value === 2) return '\uD83D\uDE1E';
                                if (value === 3) return '\uD83D\uDE00';
                                return '';
                            }
                        }
                    },
                    x: {
                        ticks: {
                            padding: 5,
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 14,
                            font: { size: window.innerWidth < 768 ? 9 : 12 }
                        },
                        grid: { display: false },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: textColor, padding: 10, usePointStyle: true, boxWidth: 8 }
                    },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: tooltipText,
                        bodyColor: tooltipText,
                        titleFont: { size: 14, family: "'Outfit', sans-serif" },
                        bodyFont: { size: 14, family: "'Outfit', sans-serif" },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.datasetIndex === 0) {
                                    if (context.raw === 0) return label + 'None';
                                    if (context.raw === 1) return label + '\uD83D\uDE21 Bad';
                                    if (context.raw === 2) return label + '\uD83D\uDE1E Neutral';
                                    if (context.raw === 3) return label + '\uD83D\uDE00 Good';
                                }
                                return label + context.raw;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateCharts(dailyTotals, totalCompleted, totalPossible) {
        if (!lineChart || !donutChart || !sleepChart || !moodChart) return;

        const isLightMode = document.documentElement.classList.contains('light-mode');
        const donutRemaining = isLightMode ? '#e2e8f0' : '#262630';

        const chartLabels = Array.from({ length: daysInMonth }, (_, i) => {
            const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dateObj = new Date(currentYear, currentMonth, i + 1);
            return `${i + 1} ${shortDays[dateObj.getDay()]}`;
        });

        lineChart.data.labels = chartLabels;
        lineChart.data.datasets[0].data = dailyTotals;
        lineChart.options.scales.y.max = trackerData.length || 5;
        lineChart.update();

        sleepChart.data.labels = chartLabels;
        sleepChart.data.datasets[0].data = hoursSlept;
        sleepChart.options.scales.y.max = Math.max(12, Math.min(24, hoursSlept.length ? Math.max(...hoursSlept) : 0));
        sleepChart.update();

        moodChart.data.labels = chartLabels;
        moodChart.data.datasets[0].data = dailyMoods;
        moodChart.update();

        let remaining = totalPossible - totalCompleted;
        if (totalPossible === 0) { totalCompleted = 0; remaining = 1; }

        donutChart.data.datasets[0].data = [totalCompleted, remaining];
        if (totalPossible === 0) {
            donutChart.data.datasets[0].backgroundColor = [donutRemaining, donutRemaining];
        } else {
            donutChart.data.datasets[0].backgroundColor = ['#10b981', '#ef4444'];
        }
        donutChart.update();

        const percentage = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);
        document.getElementById('progress-percentage-display').textContent = percentage + '%';
        document.getElementById('progress-numbers-display').textContent = `${totalCompleted} / ${totalPossible} Tasks`;

        const pctDisplay = document.getElementById('progress-percentage-display');
        if (percentage >= 50 && totalPossible > 0) {
            pctDisplay.style.color = '#10b981';
            pctDisplay.style.textShadow = isLightMode ? 'none' : '0 0 15px rgba(16, 185, 129, 0.3)';
        } else if (totalPossible > 0) {
            pctDisplay.style.color = '#ef4444';
            pctDisplay.style.textShadow = isLightMode ? 'none' : '0 0 15px rgba(239, 68, 68, 0.3)';
        } else {
            pctDisplay.style.color = isLightMode ? '#64748b' : '#8c8f96';
            pctDisplay.style.textShadow = 'none';
        }
    }

    function updateStreaks(dailyTotals) {
        let allKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key.startsWith('habitforge-') && key !== 'habitforge-theme') {
                allKeys.push(key);
            }
        }

        let monthRecords = {};
        allKeys.forEach(k => {
            const parts = k.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[1]);
                const m = parseInt(parts[2]);
                const stored = localStorage.getItem(k);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const tData = parsed.trackerData || [];
                    const dims = new Date(y, m + 1, 0).getDate();
                    if (tData.length > 0) {
                        let dTotals = Array(dims).fill(0);
                        tData.forEach(h => {
                            if (h.days) {
                                h.days.forEach((val, i) => { if (val) dTotals[i]++ });
                            }
                        });
                        monthRecords[`${y}-${m}`] = { dailyTotals: dTotals, habitCount: tData.length, daysInMonth: dims };
                    }
                }
            }
        });

        if (trackerData && trackerData.length > 0 && dailyTotals && dailyTotals.length > 0) {
            monthRecords[`${currentYear}-${currentMonth}`] = {
                dailyTotals: dailyTotals,
                habitCount: trackerData.length,
                daysInMonth: daysInMonth
            };
        } else {
            delete monthRecords[`${currentYear}-${currentMonth}`];
        }

        let bestStreak = 0;
        let perfectCount = 0;
        let globalTempStreak = 0;

        let sortedMonths = Object.keys(monthRecords).sort((a, b) => {
            let [yA, mA] = a.split('-').map(Number);
            let [yB, mB] = b.split('-').map(Number);
            if (yA !== yB) return yA - yB;
            return mA - mB;
        });

        let prevY = -1;
        let prevM = -1;

        sortedMonths.forEach(key => {
            let [y, m] = key.split('-').map(Number);
            let record = monthRecords[key];

            if (prevY !== -1) {
                let expectedM = prevM + 1;
                let expectedY = prevY;
                if (expectedM > 11) { expectedM = 0; expectedY++; }
                if (y !== expectedY || m !== expectedM) {
                    globalTempStreak = 0;
                }
            }

            prevY = y;
            prevM = m;

            for (let i = 0; i < record.daysInMonth; i++) {
                if (record.dailyTotals[i] === record.habitCount) {
                    perfectCount++;
                    globalTempStreak++;
                    if (globalTempStreak > bestStreak) bestStreak = globalTempStreak;
                } else {
                    globalTempStreak = 0;
                }
            }
        });

        let currentStreak = 0;
        let now = new Date();

        let traceY = currentYear;
        let traceM = currentMonth;
        let traceD = daysInMonth - 1;

        if (currentYear === now.getFullYear() && currentMonth === now.getMonth()) {
            traceD = now.getDate() - 1;
        } else if (currentYear > now.getFullYear() || (currentYear === now.getFullYear() && currentMonth > now.getMonth())) {
            traceD = -1;
        }

        if (traceD >= 0) {
            let isFirstDayChecked = true;
            let y = traceY;
            let m = traceM;
            let d = traceD;

            while (true) {
                let rec = monthRecords[`${y}-${m}`];
                if (!rec) break;

                let foundBreak = false;
                for (let i = d; i >= 0; i--) {
                    let isPerfect = (rec.dailyTotals[i] === rec.habitCount);

                    if (isFirstDayChecked) {
                        isFirstDayChecked = false;
                        let isActuallyToday = (y === now.getFullYear() && m === now.getMonth() && i === now.getDate() - 1);
                        if (isActuallyToday && !isPerfect) {
                            continue;
                        }
                    }

                    if (isPerfect) {
                        currentStreak++;
                    } else {
                        foundBreak = true;
                        break;
                    }
                }

                if (foundBreak) break;

                m--;
                if (m < 0) { m = 11; y--; }
                d = new Date(y, m + 1, 0).getDate() - 1;
            }
        }

        document.getElementById('current-streak').textContent = currentStreak + (currentStreak === 1 ? ' Day' : ' Days');
        document.getElementById('longest-streak').textContent = bestStreak + (bestStreak === 1 ? ' Day' : ' Days');
        document.getElementById('perfect-days').textContent = perfectCount + (perfectCount === 1 ? ' Day' : ' Days');
    }

    const clearMonthBtn = document.getElementById('clear-month-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    clearMonthBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data for this current month?\nThis action cannot be undone.')) {
            trackerData = [];
            hoursSlept = Array(daysInMonth).fill(0);
            dailyMoods = Array(daysInMonth).fill(0);
            saveData();
            refreshApp();
        }
    });

    clearAllBtn.addEventListener('click', () => {
        if (confirm('FACTORY RESET: This will delete ALL data across all months and years.\nAre you completely sure you want to proceed?')) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('habitforge-')) {
                    if (key !== 'habitforge-theme') {
                        keysToRemove.push(key);
                    }
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));

            trackerData = [];
            hoursSlept = Array(daysInMonth).fill(0);
            dailyMoods = Array(daysInMonth).fill(0);
            refreshApp();
        }
    });

    // Sticky Note functionality
    const stickyNote = document.getElementById('sticky-note');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const clearNoteBtn = document.getElementById('clear-note-btn');
    const formatBtns = document.querySelectorAll('.format-btn');

    // Load Note
    const savedNote = localStorage.getItem('habitforge-sticky-note');
    if (savedNote) {
        stickyNote.innerHTML = savedNote;
    }

    saveNoteBtn.addEventListener('click', () => {
        localStorage.setItem('habitforge-sticky-note', stickyNote.innerHTML);
        const originalText = saveNoteBtn.innerHTML;
        saveNoteBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
        setTimeout(() => {
            saveNoteBtn.innerHTML = originalText;
        }, 2000);
    });

    clearNoteBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the sticky note?')) {
            stickyNote.innerHTML = '';
            localStorage.removeItem('habitforge-sticky-note');
        }
    });

    // Formatting Toolbar
    formatBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;

            if (command) {
                document.execCommand(command, false, null);
            } else if (btn.id === 'overline-btn') {
                const selection = window.getSelection();
                if (!selection.isCollapsed) {
                    const span = document.createElement('span');
                    span.style.textDecoration = 'overline';
                    const range = selection.getRangeAt(0);
                    const contents = range.extractContents();
                    span.appendChild(contents);
                    range.insertNode(span);
                    selection.removeAllRanges();
                }
            }
            stickyNote.focus();
        });
    });

    refreshApp();
    initCharts();
});
