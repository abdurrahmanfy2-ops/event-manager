/* ==========================================
   CAMPUS EVENT MANAGER - FULL STACK INTEGRATION
   ==========================================

   This version integrates with the Python FastAPI backend
   Replaces localStorage with REST API calls to backend
*/

console.log('🏫 Campus Event Manager - Backend Integration Loading...');

// Global Variables - Now connecting to API
let currentUser = null;
let currentToken = null;
let users = []; // Will be fetched from API
let events = []; // Will be fetched from API
let loginAttempts = JSON.parse(localStorage.getItem('loginAttempts')) || {};
let currentView = 'dashboard';
const API_BASE = 'http://localhost:8001';

// Utility Functions
function showNotification(message, type = 'info', duration = 3000) {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }

    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.style.display='none'" style="margin-left: 10px; background: transparent; border: none; color: white; cursor: pointer;">×</button>
    `;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, duration);
}

async function apiRequest(endpoint, options = {}) {
    const defaultOpts = {
        headers: {
            'Content-Type': 'application/json',
            ...(currentToken && { 'Authorization': `Bearer ${currentToken}` })
        }
    };

    const response = await fetch(`${API_BASE}${endpoint}`, { ...defaultOpts, ...options });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
}

// Authentication Functions
async function checkLogin() {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');

    if (savedUser && savedToken) {
        try {
            currentUser = JSON.parse(savedUser);
            currentToken = savedToken;

            // Verify token is still valid
            const userData = await apiRequest('/users/' + currentUser.id);
            showMainApp();
            updateDashboard();
        } catch (error) {
            console.log('Token expired, returning to login');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            currentUser = null;
            currentToken = null;
            showAuth();
        }
    } else {
        showAuth();
    }
}

function setupAuthenticationButtons() {
    // Login/Register tab switches
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            authTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            showAuthTab(this.getAttribute('onclick').match(/'(.+)'/)[1]);
        });
    });

    // Forms - Update to use API
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }

    try {
        const result = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        currentUser = result.user;
        currentToken = result.access_token;

        // Store in localStorage for persistence
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('authToken', currentToken);

        // Initialize user-specific data
        await Promise.all([
            updateDashboard(),
            loadEvents()
        ]);

        showMainApp();
        showNotification(`Welcome back, ${currentUser.name}!`, 'success');

    } catch (error) {
        console.error('Login failed:', error);
        showNotification('Login failed: ' + error.message, 'error');
    }
}

async function handleRegistration(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    if (!name || !email || !password) {
        showNotification('All fields are required', 'error');
        return;
    }

    try {
        const result = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role })
        });

        currentUser = result.user;
        currentToken = result.access_token;

        // Store in localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('authToken', currentToken);

        showMainApp();
        updateDashboard();
        showNotification('Registration successful! Welcome!', 'success');

    } catch (error) {
        console.error('Registration failed:', error);
        showNotification('Registration failed: ' + error.message, 'error');
    }
}

function showAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');

    if (!loginForm || !registerForm || !forgotForm) return;

    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';

    if (tab === 'login') {
        loginForm.style.display = 'block';
    } else if (tab === 'register') {
        registerForm.style.display = 'block';
    } else if (tab === 'forgot') {
        forgotForm.style.display = 'block';
    }
}

// Navigation Functions
function setupNavigationButtons() {
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.onclick.toString().match(/showMainTab\('(.+)'\)/)?.[1];
            if (tabName) {
                showMainTab(tabName);
            }
        });
    });

    // Profile and logout buttons
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            showProfileModal();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }
}

function showMainTab(tab) {
    currentView = tab;

    // Hide all tabs
    const allTabs = [
        document.getElementById('dashboard'),
        document.getElementById('analytics'),
        document.getElementById('calendarView'),
        document.getElementById('eventForm'),
        document.getElementById('eventList')
    ];

    allTabs.forEach(tabElement => {
        if (tabElement) tabElement.classList.remove('show');
    });

    // Remove active class from all navigation tabs
    document.querySelectorAll('.nav-tab').forEach(navTab => {
        navTab.classList.remove('active');
    });

    // Show selected tab
    const targetTab = document.getElementById(tab);
    if (targetTab) {
        targetTab.classList.add('show');
    }

    // Update active nav tab
    document.querySelectorAll('.nav-tab').forEach(navTab => {
        const tabName = navTab.onclick.toString().match(/showMainTab\('(.+)'\)/)?.[1];
        if (tabName === tab) {
            navTab.classList.add('active');
        }
    });

    // Update content based on tab
    switch(tab) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'analytics':
            updateAnalytics();
            break;
        case 'calendar':
            renderCalendar();
            break;
        case 'events':
            loadEvents();
            break;
    }
}

function logout() {
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    showAuth();
    showNotification('Logged out successfully', 'info');
}

// Dashboard Functions
async function updateDashboard() {
    if (!currentUser) {
        document.getElementById('dashboard').innerHTML = '<h2>Dashboard</h2><p>Please login to view your dashboard.</p>';
        return;
    }

    try {
        const stats = await apiRequest('/dashboard');
        const gamificationStats = await apiRequest('/gamification/stats');

        // Update user info
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role;

        // Update gamification level
        const userLevel = gamificationStats.level;
        document.getElementById('userLevel').textContent = `Level ${userLevel}`;

        // Update dashboard stats
        for (const [key, value] of Object.entries(stats)) {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = value;
            }
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard', 'error');
    }
}

// Analytics Functions
async function updateAnalytics() {
    if (!currentUser) {
        document.getElementById('analytics').innerHTML = '<h2>Analytics</h2><p>Please login to view analytics.</p>';
        return;
    }

    try {
        const stats = await apiRequest('/analytics/overview');

        // Update analytics stats
        for (const [key, value] of Object.entries(stats)) {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = typeof value === 'number' ? value.toFixed(1) : value;
            }
        }

    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Failed to load analytics', 'error');
    }
}

// Event Functions
async function loadEvents(searchTerm = '', categoryFilter = '') {
    try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (categoryFilter) params.append('category', categoryFilter);

        events = await apiRequest(`/events/?${params}`);
        displayEvents(searchTerm, categoryFilter);

        // Update dashboard counts
        await updateDashboard();

    } catch (error) {
        console.error('Error loading events:', error);
        showNotification('Failed to load events', 'error');
    }
}

function displayEvents(searchTerm = '', categoryFilter = '', dateFilter = '') {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '';

    let filteredEvents = [...events];

    // Apply filters
    if (searchTerm) {
        filteredEvents = filteredEvents.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (categoryFilter) {
        filteredEvents = filteredEvents.filter(event => event.category === categoryFilter);
    }

    if (dateFilter) {
        filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.date);
            const today = new Date();
            switch(dateFilter) {
                case 'today': return eventDate.toDateString() === today.toDateString();
                case 'week': return eventDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                case 'month': return eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
                default: return true;
            }
        });
    }

    filteredEvents.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

    if (filteredEvents.length === 0) {
        container.innerHTML = '<p>No events found matching your criteria.</p>';
        return;
    }

    filteredEvents.forEach((event) => {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';

        const isAttending = event.attendees && event.attendees.includes(currentUser?.id);

        eventDiv.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-category">${event.category.charAt(0).toUpperCase() + event.category.slice(1)}</div>
            <div class="event-details">
                <strong>Date:</strong> ${event.date} | <strong>Time:</strong> ${event.time} | <strong>Location:</strong> ${event.location}
                ${event.description ? '<br><strong>Description:</strong> ' + event.description : ''}
            </div>
            ${event.image_url ? `<img src="${API_BASE}${event.image_url}" alt="Event image" class="event-image" style="max-width: 200px; margin: 10px 0;">` : ''}
            <div class="rating">
                ${[1,2,3,4,5].map(star => `<span class="star ${event.rating >= star ? 'active' : ''}" onclick="rateEvent('${event.id}', ${star})">★</span>`).join('')}
            </div>
            <div class="event-actions">
                <button class="rsvp-btn ${isAttending ? 'attending' : ''}" onclick="toggleRSVP('${event.id}')">
                    ${isAttending ? 'Attending ✓' : 'RSVP'}
                </button>
                <button class="share-btn" onclick="shareEvent('${event.id}')">Share</button>
                ${currentUser && event.created_by === currentUser.id ? `<button class="delete-btn" onclick="deleteEvent('${event.id}')">Delete</button>` : ''}
            </div>
            <div class="comments-section">
                <h4>Comments (${event.comments ? event.comments.length : 0})</h4>
                <div id="comments-${event.id}">
                    ${event.comments && event.comments.length > 0 ?
                        event.comments.slice(-3).map(comment => `<div class="comment"><strong>${comment.author}:</strong> ${comment.text}</div>`).join('')
                        : '<p>No comments yet.</p>'
                    }
                </div>
                <div class="comment-form">
                    <input type="text" id="comment-input-${event.id}" placeholder="Add a comment..." onkeypress="handleCommentKeypress(event, '${event.id}')">
                    <button onclick="addComment('${event.id}')">Comment</button>
                </div>
            </div>
        `;

        container.appendChild(eventDiv);
    });
}

// Event Interaction Functions
async function toggleRSVP(eventId) {
    if (!currentUser) {
        showNotification('Please login to RSVP', 'info');
        return;
    }

    try {
        await apiRequest(`/events/${eventId}/rsvp`, { method: 'POST' });
        await loadEvents(); // Refresh the events list
        showNotification('RSVP updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating RSVP:', error);
        showNotification('Failed to update RSVP', 'error');
    }
}

async function addComment(eventId) {
    if (!currentUser) {
        showNotification('Please login to comment', 'info');
        return;
    }

    const commentInput = document.getElementById(`comment-input-${eventId}`);
    const commentText = commentInput.value.trim();

    if (!commentText) {
        return;
    }

    try {
        await apiRequest(`/events/${eventId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text: commentText })
        });

        commentInput.value = '';
        await loadEvents(); // Refresh to show new comment
        showNotification('Comment added!', 'success');
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

function handleCommentKeypress(event, eventId) {
    if (event.key === 'Enter') {
        addComment(eventId);
    }
}

async function rateEvent(eventId, rating) {
    if (!currentUser) {
        showNotification('Please login to rate events', 'info');
        return;
    }

    try {
        await apiRequest(`/events/${eventId}/rate`, {
            method: 'PUT',
            body: JSON.stringify({ rating })
        });

        await loadEvents(); // Refresh to show updated rating
        showNotification(`Event rated ${rating} stars!`, 'success');
    } catch (error) {
        console.error('Error rating event:', error);
        showNotification('Failed to rate event', 'error');
    }
}

function shareEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (event) {
        const shareText = `Check out "${event.title}" on ${event.date} at ${event.location}!`;
        if (navigator.share) {
            navigator.share({
                title: event.title,
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                showNotification('Event link copied to clipboard!', 'success');
            });
        }
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    try {
        await apiRequest(`/events/${eventId}`, { method: 'DELETE' });
        await loadEvents(); // Refresh the list
        showNotification('Event deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting event:', error);
        showNotification('Failed to delete event', 'error');
    }
}

// Form handling functions
function setupFormButtons() {
    const eventForm = document.getElementById('eventFormElement');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }

    // Event template selector
    const eventTemplate = document.getElementById('eventTemplate');
    if (eventTemplate) {
        eventTemplate.addEventListener('change', function() {
            populateEventTemplate(this.value);
        });
    }
}

async function handleEventSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
        showNotification('Please login to create events', 'error');
        return;
    }

    const formData = new FormData(event.target);
    const eventData = {
        title: formData.get('title') || document.getElementById('title').value,
        category: formData.get('category') || document.getElementById('category').value,
        date: formData.get('date') || document.getElementById('date').value,
        time: formData.get('time') || document.getElementById('time').value,
        location: formData.get('location') || document.getElementById('location').value,
        description: formData.get('description') || document.getElementById('description').value,
        max_attendees: parseInt(formData.get('maxAttendees')) || null,
        enable_reminders: formData.get('enableReminders') === 'on'
    };

    // Validate required fields
    if (!eventData.title || !eventData.category || !eventData.date || !eventData.location) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const imageFile = document.getElementById('eventImage').files[0];

        let newEvent;
        if (imageFile) {
            // Handle file upload
            const uploadFormData = new FormData();
            Object.keys(eventData).forEach(key => {
                uploadFormData.append(key, eventData[key]);
            });
            uploadFormData.append('image', imageFile);

            const response = await fetch(`${API_BASE}/events/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                },
                body: uploadFormData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            newEvent = await response.json();
        } else {
            newEvent = await apiRequest('/events/', {
                method: 'POST',
                body: JSON.stringify(eventData)
            });
        }

        // Clear form
        event.target.reset();
        document.getElementById('imagePreview').src = '';
        document.getElementById('imagePreview').style.display = 'none';

        // Refresh events and switch to list view
        await loadEvents();
        showMainTab('events');

        showNotification('Event created successfully!', 'success');

    } catch (error) {
        console.error('Error creating event:', error);
        showNotification('Failed to create event: ' + error.message, 'error');
    }
}

// Display and Navigation Functions
function showAuth() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'none';
    document.querySelectorAll('.nav, .tab-content, #mainNav, #dashboard, #analytics, #calendarView, #eventForm, #eventList, #profileContainer').forEach(el => {
        el.classList.remove('show');
    });
}

function showMainApp() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('profileContainer').classList.remove('show');
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('mainNav').classList.add('show');
    document.getElementById('userInfo').style.display = 'block';

    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role;
    }

    showMainTab(currentView);
}

// Quick Actions
function setupQuickActionButtons() {
    const quickActions = document.querySelectorAll('.quick-action-btn, .nav-actions .quick-actions button');
    quickActions.forEach(btn => {
        if (btn.hasAttribute('data-tooltip')) {
            const tooltip = btn.getAttribute('data-tooltip');

            if (tooltip.includes('Quick Add Event')) {
                btn.addEventListener('click', () => {
                    showMainTab('events');
                    document.getElementById('title').focus();
                });
            } else if (tooltip.includes('Export Data')) {
                btn.addEventListener('click', exportData);
            } else if (tooltip.includes('Notifications')) {
                btn.addEventListener('click', () => showNotification('This would show notifications in a real implementation'));
            }
        }
    });
}

async function exportData() {
    try {
        const data = await apiRequest('/events/');
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'events-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Events exported successfully!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Failed to export data', 'error');
    }
}

// Profile Functions
function showProfileModal() {
    if (!currentUser) return;

    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profilePassword').value = '';

    document.getElementById('profileContainer').classList.add('show');
    document.getElementById('mainNav').classList.remove('show');
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('show'));
}

function setupProfileButtons() {
    const profileForm = document.getElementById('profileForm');
    const backBtn = document.getElementById('backToMainBtn');

    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    if (backBtn) {
        backBtn.addEventListener('click', showMainApp);
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();

    const updates = {
        name: document.getElementById('profileName').value,
        email: document.getElementById('profileEmail').value
    };

    const password = document.getElementById('profilePassword').value;
    if (password) {
        updates.password = password;
    }

    try {
        const updatedUser = await apiRequest(`/users/${currentUser.id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showMainApp();
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Profile update failed:', error);
        showNotification('Failed to update profile', 'error');
    }
}

// Search and Filter Functions
function setupEventManagementButtons() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');
    const clearFiltersBtn = document.querySelector('button[onclick*="clearFilters"]');

    if (searchInput) {
        searchInput.addEventListener('input', () => filterEvents());
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => filterEvents());
    }
    if (dateFilter) {
        dateFilter.addEventListener('change', () => filterEvents());
    }
}

function filterEvents() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';

    displayEvents(searchTerm, categoryFilter, dateFilter);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('dateFilter').value = '';
    filterEvents();
}

// Calendar Functions
function renderCalendar() {
    // Simple placeholder calendar
    const calendar = document.getElementById('calendar');
    if (!calendar) return;

    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();

    calendar.innerHTML = `
        <div class="calendar-header">
            <div class="calendar-month">${month} ${year}</div>
            <div class="calendar-days">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-grid">
                ${Array.from({length: 42}, (_, i) => `<div class="calendar-day">${i < 7 ? '' : Math.floor(Math.random() * 28) + 1}</div>`).join('')}
            </div>
        </div>
    `;
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Campus Event Manager - Full Stack Integration Ready!');

    // Initialize all systems
    await checkLogin();

    // Setup all button functionality
    setupAuthenticationButtons();
    setupNavigationButtons();
    setupQuickActionButtons();
    setupFormButtons();
    setupEventManagementButtons();
    setupProfileButtons();

    console.log('🚀 Event Manager Connected to Backend API at:', API_BASE);
});

// Guest mode function
function continueAsGuest() {
    // Redirect to login page
    window.location.href = 'login.html';
}

// Export for global access
window.showAuth = showAuth;
window.showMainTab = showMainTab;
window.showProfileModal = showProfileModal;
window.showMainApp = showMainApp;
window.toggleRSVP = toggleRSVP;
window.addComment = addComment;
window.rateEvent = rateEvent;
window.shareEvent = shareEvent;
window.deleteEvent = deleteEvent;
window.filterEvents = filterEvents;
window.clearFilters = clearFilters;
window.continueAsGuest = continueAsGuest;
