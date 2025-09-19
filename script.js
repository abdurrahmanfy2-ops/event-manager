/* ==========================================
   CAMPUS EVENT MANAGER - FRONTEND WITH BACKEND API
   ========================================== */

console.log('🏫 Campus Event Manager Loading...');

// Global Variables
const API_BASE_URL = 'http://127.0.0.1:8001';
let accessToken = localStorage.getItem('accessToken') || null;
let currentUserInfo = JSON.parse(localStorage.getItem('currentUserInfo') || 'null');

let currentUser = null;
let events = [];

// ==========================================
// API FUNCTIONS
// ==========================================

// Generic API call with authentication
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API call error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Auth API calls
async function apiLogin(email, password) {
    return apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

async function apiRegister(name, email, password, role = 'user') {
    return apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
    });
}

// Event API calls
async function apiGetEvents(search = '', category = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);

    return apiCall(`/events/?${params.toString()}`);
}

async function apiCreateEvent(eventData, imageFile = null) {
    const formData = new FormData();

    // Add event data
    Object.keys(eventData).forEach(key => {
        formData.append(key, eventData[key]);
    });

    // Add image if provided
    if (imageFile) {
        formData.append('image', imageFile);
    }

    return apiCall('/events/', {
        method: 'POST',
        headers: {}, // Remove Content-Type so browser sets it for FormData
        body: formData
    });
}

async function apiRsvpEvent(eventId, attending = true) {
    if (attending) {
        return apiCall(`/events/${eventId}/rsvp`, { method: 'POST' });
    } else {
        // For cancelling RSVP, we can call the same endpoint (backend handles the logic)
        return apiCall(`/events/${eventId}/rsvp`, { method: 'POST' });
    }
}

async function apiAddComment(eventId, text) {
    return apiCall(`/events/${eventId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text })
    });
}

async function apiRateEvent(eventId, rating) {
    return apiCall(`/events/${eventId}/rate`, {
        method: 'PUT',
        body: JSON.stringify({ rating })
    });
}

// Dashboard API
async function apiGetDashboard() {
    return apiCall('/dashboard');
}

// ==========================================
// AUTHENTICATION FUNCTIONS
// ==========================================

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }

    try {
        const response = await apiLogin(email, password);
        accessToken = response.access_token;
        currentUser = {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
            points: response.user.points,
            level: response.user.level
        };

        // Save to localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('currentUserInfo', JSON.stringify(currentUser));

        showMainApp();
        updateDashboard();
        showNotification(`Welcome back, ${currentUser.name}!`, 'success');

    } catch (error) {
        console.error('Login failed:', error);
        // Error already shown in apiCall
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
        const response = await apiRegister(name, email, password, role);
        accessToken = response.access_token;
        currentUser = {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
            points: response.user.points,
            level: response.user.level
        };

        // Save to localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('currentUserInfo', JSON.stringify(currentUser));

        showNotification('Registration successful! Welcome!', 'success');
        showMainApp();
        updateDashboard();

    } catch (error) {
        console.error('Registration failed:', error);
    }
}

// ==========================================
// CORE SYSTEM FUNCTIONS
// ==========================================

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

// ==========================================
// NAVIGATION FUNCTIONS
// ==========================================

function showMainTab(tab) {
    currentView = tab;

    // Hide all tabs
    const allTabs = [
        document.getElementById('dashboard'),
        document.getElementById('analytics'),
        document.getElementById('calendarView'),
        document.getElementById('eventList')
    ];

    allTabs.forEach(tabElement => {
        if (tabElement) tabElement.classList.remove('show');
    });

    // Show selected tab
    const targetTab = document.getElementById(tab);
    if (targetTab) {
        targetTab.classList.add('show');
    }

    // Update content based on tab
    if (tab === 'dashboard') {
        updateDashboard();
    } else if (tab === 'events') {
        loadEvents();
    }
}

// ==========================================
// DATA LOADING FUNCTIONS
// ==========================================

async function loadEvents() {
    try {
        const eventsData = await apiGetEvents();
        events = eventsData;
        displayEvents();
    } catch (error) {
        console.error('Failed to load events:', error);
        events = []; // Show empty if error
        displayEvents();
    }
}

async function updateDashboard() {
    if (!currentUser) {
        document.getElementById('dashboard').innerHTML = '<h2>Dashboard</h2><p>Please login to view your dashboard.</p>';
        return;
    }

    try {
        const dashboardData = await apiGetDashboard();
        updateDashboardUI(dashboardData);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        // Show fallback dashboard
        updateDashboardUI({
            totalEvents: 0,
            upcomingEvents: 0,
            myEvents: 0,
            averageRating: 0,
            totalAttendees: 0,
            totalComments: 0
        });
    }
}

function updateDashboardUI(data) {
    document.getElementById('totalEvents').textContent = data.totalEvents || 0;
    document.getElementById('upcomingEvents').textContent = data.upcomingEvents || 0;
    document.getElementById('myEvents').textContent = data.myEvents || 0;
    document.getElementById('averageRating').textContent = data.averageRating || 0;
    document.getElementById('totalAttendees').textContent = data.totalAttendees || 0;
    document.getElementById('totalComments').textContent = data.totalComments || 0;
}

// ==========================================
// EVENT MANAGEMENT FUNCTIONS
// ==========================================

function displayEvents(searchTerm = '') {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '';

    let filteredEvents = events.filter(event => {
        if (!searchTerm) return true;
        return event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               event.description.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (filteredEvents.length === 0) {
        container.innerHTML = '<p>No events found.</p>';
        return;
    }

    filteredEvents.forEach((event) => {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';
        eventDiv.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-category">${event.category}</div>
            <div class="event-details">
                <strong>Date:</strong> ${event.date} | <strong>Time:</strong> ${event.time}
                ${event.description ? '<br><strong>Description:</strong> ' + event.description : ''}
            </div>
            ${event.image_url ? `<img src="${API_BASE_URL}${event.image_url}" alt="Event image" class="event-image">` : ''}
            <div class="rating">Rating: ${event.rating}/5 ⭐</div>
            <button class="rsvp-btn" onclick="handleRSVP('${event.id}')">RSVP</button>
            <button class="comment-btn" onclick="showCommentForm('${event.id}')">💬 Comment</button>

            <div id="comments-${event.id}" class="comments-section" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                <h4 style="font-size: 14px; margin-bottom: 8px; color: #666;">💬 Comments (${event.comments ? event.comments.length : 0})</h4>
                <div class="comments-display" style="margin-bottom: 10px;">
                    ${event.comments && event.comments.length > 0 ?
                        event.comments.slice(-3).map(comment => `
                            <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; margin-bottom: 5px; font-size: 12px;">
                                <strong>${comment.author}</strong>: ${comment.text}
                                <span style="color: #999; margin-left: 10px;">${new Date(comment.timestamp || Date.now()).toLocaleDateString()}</span>
                            </div>
                        `).join('')
                        : '<div style="color: #666; font-style: italic; font-size: 12px;">No comments yet</div>'
                    }
                </div>
                <div class="comment-form" style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="comment-input-${event.id}" placeholder="Share your thoughts..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; display: none;" onkeypress="handleCommentKeypress(event, '${event.id}')">
                    <button onclick="addComment('${event.id}')" style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: none;">Post</button>
                </div>
            </div>
        `;
        container.appendChild(eventDiv);
    });
}

async function saveEvent() {
    const title = document.getElementById('title').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const location = document.getElementById('location').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const imageFile = document.getElementById('eventImage').files[0];

    if (!title || !date || !time || !location) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const eventData = {
            title, date, time, location, category, description,
            enable_reminders: document.getElementById('enableReminders').checked,
            is_featured: false,
            max_attendees: null
        };

        const response = await apiCreateEvent(eventData, imageFile);

        showNotification('Event created successfully!', 'success');
        document.getElementById('eventFormElement').reset();
        loadEvents();

    } catch (error) {
        console.error('Failed to create event:', error);
    }
}

async function handleRSVP(eventId) {
    try {
        const response = await apiRsvpEvent(eventId);
        showNotification(response.message, 'success');
        loadEvents(); // Refresh to show updated RSVP status
    } catch (error) {
        console.error('RSVP failed:', error);
    }
}

function showCommentForm(eventId) {
    const commentInput = document.getElementById(`comment-input-${eventId}`);
    const addButton = document.querySelector(`button[onclick="addComment('${eventId}')"]`);

    if (commentInput && addButton) {
        const isVisible = commentInput.style.display !== 'none';

        if (isVisible) {
            // Hide comment input
            commentInput.style.display = 'none';
            addButton.style.display = 'none';
        } else {
            // Show comment input
            commentInput.style.display = 'inline-block';
            addButton.style.display = 'inline-block';
            commentInput.focus();
        }
    }
}

function handleCommentKeypress(event, eventId) {
    if (event.key === 'Enter') {
        addComment(eventId);
    }
}

async function addComment(eventId) {
    const commentInput = document.getElementById(`comment-input-${eventId}`);
    if (!commentInput || !commentInput.value.trim()) return;

    const text = commentInput.value.trim();
    const addButton = document.querySelector(`button[onclick="addComment('${eventId}')"]`);

    // Disable button during submission
    if (addButton) {
        addButton.disabled = true;
        addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    try {
        await apiAddComment(eventId, text);
        commentInput.value = '';
        loadEvents(); // Refresh to show new comment
        showNotification('Comment added successfully!', 'success');

        // Show feedback animation
        showCommentFeedback(eventId, 'Comment posted!', 'success');

    } catch (error) {
        console.error('Failed to add comment:', error);
        showCommentFeedback(eventId, 'Failed to add comment', 'error');
    } finally {
        // Re-enable button
        if (addButton) {
            addButton.disabled = false;
            addButton.innerHTML = 'Post';
        }
    }
}

function showCommentFeedback(eventId, message, type) {
    const commentSection = document.getElementById(`comments-${eventId}`);
    if (!commentSection) return;

    // Remove existing feedback
    const existingFeedback = commentSection.querySelector('.comment-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    // Add new feedback
    const feedback = document.createElement('div');
    feedback.className = `comment-feedback ${type}`;
    feedback.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="margin-left: 10px; background: transparent; border: none; color: inherit; cursor: pointer;">×</button>
    `;
    feedback.style.cssText = `
        padding: 8px 12px;
        margin: 8px 0;
        border-radius: 4px;
        font-size: 12px;
        ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'}
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    commentSection.appendChild(feedback);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (feedback.parentElement) {
            feedback.remove();
        }
    }, 3000);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function checkLogin() {
    if (accessToken && currentUserInfo) {
        currentUser = currentUserInfo;
        showMainApp();
        updateDashboard();
    } else {
        accessToken = null;
        currentUserInfo = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUserInfo');
        showAuth();
    }
}

function logout() {
    currentUser = null;
    accessToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUserInfo');
    showAuth();
    showNotification('Logged out successfully', 'info');
}

function showAuth() {
    document.getElementById('authContainer').classList.add('show');
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('mainNav').classList.remove('show');
    ['dashboard', 'analytics', 'calendarView', 'eventList'].forEach(id => {
        document.getElementById(id)?.classList.remove('show');
    });
}

function showMainApp() {
    if (!currentUser || !accessToken) {
        showAuth();
        return;
    }

    document.getElementById('authContainer').classList.remove('show');
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('mainNav').classList.add('show');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;

    showMainTab('dashboard');
}

// ==========================================
// EVENT LISTENERS AND INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM Loaded - Initializing...');

    checkLogin();

    // Set up form event listeners
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement')?.addEventListener('submit', handleRegistration);
    document.getElementById('eventFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEvent();
    });

    // Search functionality
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        displayEvents(e.target.value);
    });

    // Handle URL hash for tab navigation
    handleUrlHash();

    console.log('🚀 Campus Event Manager Ready!');
});

// Handle URL hash for tab navigation (e.g., #events, #dashboard)
function handleUrlHash() {
    const hash = window.location.hash.substring(1); // Remove the '#'
    if (hash) {
        switch (hash) {
            case 'events':
                showMainTab('events');
                break;
            case 'dashboard':
                showMainTab('dashboard');
                break;
            case 'calendar':
                showMainTab('calendar');
                break;
            case 'analytics':
                showMainTab('analytics');
                break;
            default:
                break;
        }
    }
}

console.log('Campus Event Manager Ready!');
