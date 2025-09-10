document.addEventListener('DOMContentLoaded', () => {
    const dateHeader = document.getElementById('current-date-header');
    const notesContainer = document.getElementById('notes-container');
    const addNoteBtn = document.getElementById('add-note-btn');
    const monthYearHeader = document.getElementById('month-year-header');
    const calendarDaysContainer = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const reminderText = document.getElementById('reminder-text');
    const setReminderBtn = document.getElementById('set-reminder-btn');
    const reminderDisplayContainer = document.getElementById('reminder-display-container');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalMessage = document.getElementById('modal-message');
    const modalButtons = document.getElementById('modal-buttons');
    const themeSwatches = document.querySelectorAll('.swatch');
    const liveClock = document.getElementById('live-clock');
    const sidebarDateHeader = document.getElementById('sidebar-date-header');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const connectingNightNotice = document.getElementById('connecting-night-notice');

    let currentViewDateStr;
    let calendarDate = new Date();
    let selectedReminderDates = [];
    
    function getApplicationDate() {
        const now = new Date();
        if (now.getHours() < 3) {
            const yesterday = new Date();
            yesterday.setDate(now.getDate() - 1);
            return yesterday;
        }
        return now;
    }
    
    let todayDateStr = getFormattedDate(getApplicationDate());

    function getFormattedDate(date) {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
    
    function getDisplayDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long'
        });
    }

    const DBNames = { NOTES: 'dailyNotesV9', REMINDERS: 'dailyRemindersV9', THEME: 'appThemeV9' };
    
    function loadData(dbName) {
        const data = localStorage.getItem(dbName);
        return data ? JSON.parse(data) : {};
    }

    function saveData(dbName, data) {
        localStorage.setItem(dbName, JSON.stringify(data));
    }
    
    function updateSidebarDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
        });
        sidebarDateHeader.textContent = dateString;
    }

    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        liveClock.textContent = `${hours}:${minutes}`;

        if (now.getHours() < 3) {
            const yesterday = new Date();
            yesterday.setDate(now.getDate() - 1);
            const yesterdayDisplay = yesterday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
            const todayDisplay = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
            connectingNightNotice.textContent = `${yesterdayDisplay} gününü ${todayDisplay} gününe bağlayan gece`;
            connectingNightNotice.classList.remove('hidden');
        } else {
            connectingNightNotice.classList.add('hidden');
        }

        const newAppDate = getFormattedDate(getApplicationDate());
        if (todayDateStr !== newAppDate) {
            todayDateStr = newAppDate;
            updateSidebarDate();
            renderCalendar();
        }
    }

    function handleModalKeys(event) {
        if (modalOverlay.classList.contains('hidden')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            const cancelBtn = modalButtons.querySelector('.cancel');
            if (cancelBtn) {
                cancelBtn.click();
            } else {
                closeModal();
            }
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            const confirmBtn = modalButtons.querySelector('.confirm');
            if (confirmBtn) {
                confirmBtn.click();
            }
        }
    }

    function showModal(message, type = 'alert', onConfirm = null) {
        modalMessage.textContent = message;
        modalButtons.innerHTML = '';
        if (type === 'confirm') {
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Evet';
            confirmBtn.className = 'modal-button confirm';
            confirmBtn.onclick = () => { closeModal(); if (onConfirm) onConfirm(true); };
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Hayır';
            cancelBtn.className = 'modal-button cancel';
            cancelBtn.onclick = () => { closeModal(); if (onConfirm) onConfirm(false); };
            modalButtons.append(confirmBtn, cancelBtn);
        } else {
            const okBtn = document.createElement('button');
            okBtn.textContent = 'Tamam';
            okBtn.className = 'modal-button confirm';
            okBtn.onclick = closeModal;
            modalButtons.appendChild(okBtn);
        }
        modalOverlay.classList.remove('hidden');
        window.addEventListener('keydown', handleModalKeys);
    }

    function closeModal() {
        window.removeEventListener('keydown', handleModalKeys);
        modalOverlay.classList.add('hidden');
    }

    function renderCalendar() {
        calendarDate.setDate(1);
        const month = calendarDate.getMonth();
        const year = calendarDate.getFullYear();
        monthYearHeader.textContent = calendarDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        calendarDaysContainer.innerHTML = '';
        const firstDayIndex = (calendarDate.getDay() + 6) % 7;
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const allNotes = loadData(DBNames.NOTES);
        const allReminders = loadData(DBNames.REMINDERS);
        for (let i = 0; i < firstDayIndex; i++) { calendarDaysContainer.innerHTML += `<div class="calendar-day empty"></div>`; }
        for (let day = 1; day <= lastDayOfMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;
            const fullDateStr = getFormattedDate(new Date(year, month, day));
            dayDiv.dataset.date = fullDateStr;
            if (allNotes[fullDateStr]?.notes.length > 0) dayDiv.classList.add('has-note');
            if (allReminders[fullDateStr]?.length > 0) dayDiv.classList.add('has-reminder');
            if (fullDateStr === currentViewDateStr) dayDiv.classList.add('active');
            if (fullDateStr === todayDateStr) dayDiv.classList.add('today');
            dayDiv.addEventListener('click', () => handleDayClick(fullDateStr));
            calendarDaysContainer.appendChild(dayDiv);
        }
    }

    function handleDayClick(dateStr) {
        if (reminderText.value.trim() !== '' || selectedReminderDates.length > 0) {
            const realToday = getFormattedDate(new Date());
            if (dateStr <= realToday) { 
                showModal('Sadece gelecek günler için hatırlatıcı kurabilirsiniz.', 'alert'); 
                return;
            }
            const index = selectedReminderDates.indexOf(dateStr);
            if (index > -1) {
                selectedReminderDates.splice(index, 1);
            } else {
                selectedReminderDates.push(dateStr);
            }
            renderCalendar();
        } else {
            renderNotesForDate(dateStr);
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        }
    }

    function renderNotesForDate(dateString) {
        currentViewDateStr = dateString;
        const allNotes = loadData(DBNames.NOTES);
        const dayData = allNotes[dateString] || { notes: [] };
        const isAppToday = dateString === todayDateStr;
        notesContainer.innerHTML = '';
        dateHeader.textContent = getDisplayDate(dateString);
        dayData.notes.forEach(note => createNoteElement(note, !isAppToday));
        
        if (!isAppToday) {
            addNoteBtn.classList.add('hidden');
        } else {
            addNoteBtn.classList.remove('hidden');
        }

        if (dayData.notes.length === 0) {
            let message = "Not bulunmuyor. Eklemek için '+' butonuna basın.";
            if (dateString < todayDateStr) message = "Bu tarih için not eklenmemiş.";
            if (dateString > todayDateStr) message = "Gelecek için henüz not eklenemez.";
            notesContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted);">${message}</p>`;
        }
        displayRemindersForDate(dateString);
        renderCalendar();
    }

    function createNoteElement(note, isReadOnly) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note';
        const noteContent = document.createElement('textarea');
        noteContent.className = 'note-content';
        noteContent.placeholder = 'Notunuzu yazın... (Yeni satır için Shift+Enter)';
        noteContent.value = note.text;
        noteContent.readOnly = isReadOnly;
        if (!isReadOnly) {
            noteContent.addEventListener('input', () => updateNoteText(note.id, noteContent.value));
            noteContent.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    addNote();
                }
                if (event.key === 'Backspace' && noteContent.value === '') {
                    event.preventDefault();
                    _performDelete(note.id);
                }
            });
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            deleteBtn.title = "Notu Sil";
            deleteBtn.onclick = () => deleteNote(note.id);
            noteDiv.appendChild(deleteBtn);
        }
        noteDiv.appendChild(noteContent);
        notesContainer.appendChild(noteDiv);
        return noteContent;
    }

    function addNote() {
        if (currentViewDateStr !== todayDateStr) return;
        const allNotes = loadData(DBNames.NOTES);
        if (!allNotes[currentViewDateStr]) { allNotes[currentViewDateStr] = { notes: [] }; }
        const newNote = { id: Date.now(), text: '' };
        allNotes[currentViewDateStr].notes.push(newNote);
        saveData(DBNames.NOTES, allNotes);
        if (allNotes[currentViewDateStr].notes.length === 1) {
            notesContainer.innerHTML = '';
        }
        const newNoteElement = createNoteElement(newNote, false);
        newNoteElement.focus();
    }

    function deleteNote(id) {
        showModal('Bu notu kalıcı olarak silmek istediğinizden emin misiniz?', 'confirm', (confirmed) => {
            if (confirmed) {
                _performDelete(id);
            }
        });
    }

    function _performDelete(id) {
        const allNotes = loadData(DBNames.NOTES);
        const dayNotes = allNotes[currentViewDateStr]?.notes;
        if (!dayNotes) return;
        allNotes[currentViewDateStr].notes = dayNotes.filter(note => note.id !== id);
        saveData(DBNames.NOTES, allNotes);
        renderNotesForDate(currentViewDateStr);
    }

    function updateNoteText(id, newText) {
        const allNotes = loadData(DBNames.NOTES);
        const dayData = allNotes[currentViewDateStr];
        if (!dayData) return;
        const noteToUpdate = dayData.notes.find(note => note.id === id);
        if (noteToUpdate) {
            noteToUpdate.text = newText;
            saveData(DBNames.NOTES, allNotes);
        }
    }

    function setReminder() {
        const text = reminderText.value.trim();
        if (text === '') { showModal('Lütfen bir hatırlatıcı metni girin.', 'alert'); return; }
        if (selectedReminderDates.length === 0) { showModal('Lütfen takvimden en az bir gelecek tarih seçin.', 'alert'); return; }
        const allReminders = loadData(DBNames.REMINDERS);
        selectedReminderDates.forEach(dateStr => { if (!allReminders[dateStr]) allReminders[dateStr] = []; allReminders[dateStr].push(text); });
        saveData(DBNames.REMINDERS, allReminders);
        reminderText.value = '';
        selectedReminderDates = [];
        renderCalendar();
        displayRemindersForDate(currentViewDateStr);
        showModal('Hatırlatıcı başarıyla kuruldu!', 'alert');
    }

    function displayRemindersForDate(dateString) {
        reminderDisplayContainer.innerHTML = '';
        const allReminders = loadData(DBNames.REMINDERS);
        const remindersForDay = allReminders[dateString];
        if (remindersForDay?.length > 0) {
            remindersForDay.forEach((text, index) => {
                const tag = document.createElement('div');
                tag.className = 'reminder-tag';
                const span = document.createElement('span');
                span.textContent = text;
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-reminder-btn';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.title = "Hatırlatıcıyı Sil";
                deleteBtn.onclick = () => deleteReminder(dateString, index);
                tag.append(span, deleteBtn);
                reminderDisplayContainer.appendChild(tag);
            });
        }
    }

    function deleteReminder(dateStr, reminderIndex) {
        showModal('Bu hatırlatıcıyı silmek istediğinizden emin misiniz?', 'confirm', (confirmed) => {
            if (confirmed) {
                const allReminders = loadData(DBNames.REMINDERS);
                allReminders[dateStr].splice(reminderIndex, 1);
                if (allReminders[dateStr].length === 0) {
                    delete allReminders[dateStr];
                }
                saveData(DBNames.REMINDERS, allReminders);
                displayRemindersForDate(dateStr);
                renderCalendar();
            }
        });
    }

    function applyTheme(themeName) {
        document.body.className = '';
        document.body.classList.add(`theme-${themeName}`);
        themeSwatches.forEach(swatch => {
            if (swatch.dataset.theme === themeName) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }
        });
    }

    function saveAndApplyTheme(themeName) {
        applyTheme(themeName);
        localStorage.setItem(DBNames.THEME, themeName);
    }

    function init() {
        addNoteBtn.addEventListener('click', addNote);
        setReminderBtn.addEventListener('click', setReminder);
        prevMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
        nextMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
        themeSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                saveAndApplyTheme(swatch.dataset.theme);
            });
        });

        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        const savedTheme = localStorage.getItem(DBNames.THEME) || 'dark-blue';
        applyTheme(savedTheme);

        updateClock();
        updateSidebarDate();
        setInterval(updateClock, 1000);

        renderNotesForDate(todayDateStr);
    }

    init();
});
