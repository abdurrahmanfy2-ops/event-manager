/* ==========================================
   CAMPUS EVENT MANAGER - ENHANCED VERSION
   ==========================================

   Enhanced features:
   - QR codes for events
   - Social sharing buttons
   - Bulk actions
   - Better notifications
   - Export functionality
   - Favorites/bookmarks
*/

console.log('🏫 Campus Event Manager - Enhanced Version Loading...');

// Global Variables
let currentUser = null;
let currentToken = null;
let users = [];
let events = [];
let loginAttempts = JSON.parse(localStorage.getItem('loginAttempts')) || {};
let currentView = 'dashboard';
let selectedEvents = []; // For bulk actions
const API_BASE = 'http://localhost:8001';

// Enhanced Utility Functions
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

// QR Code Generation Utility
function generateQRCode(eventId) {
    // Use a free QR code service or implement client-side QR generation
    const eventUrl = `${window.location.origin}/event/${eventId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(eventUrl)}`;
    return qrUrl;
}

// Social Sharing Functions
function shareOnFacebook(event) {
    const url = encodeURIComponent(`${window.location.origin}/event/${event.id}`);
    const text = encodeURIComponent(`Check out this event: ${event.title}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
}

function shareOnTwitter(event) {
    const url = encodeURIComponent(`${window.location.origin}/event/${event.id}`);
    const text = encodeURIComponent(`Check out "${event.title}" happening ${event.date} at ${event.location}! #CampusEvents`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
}

function shareViaEmail(event) {
    const subject = encodeURIComponent(`Check out: ${event.title}`);
    const body = encodeURIComponent(
        `Hi!\n\nI thought you might be interested in this event:\n\n` +
        `📅 ${event.title}\n` +
        `📍 ${event.location}\n` +
        `🕐 ${event.date} at ${event.time}\n\n` +
        `More details: ${window.location.origin}/event/${event.id}\n\n` +
        `See you there!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function shareViaWhatsApp(event) {
    const text = encodeURIComponent(
        `*${event.title}*\n\n` +
        `📅 Date: ${event.date}\n` +
        `🕐 Time: ${event.time}\n` +
        `📍 Location: ${event.location}\n\n` +
        `More info: ${window.location.origin}/event/${event.id}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// Authentication Functions
async function checkLogin() {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');

    if (savedUser && savedToken) {
        try {
            currentUser = JSON.parse(savedUser);
            currentToken = savedToken;
            const userData = await apiRequest('/users/' + currentUser.id);
            showMainApp();
            await updateDashboard();
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

// Event Functions
async function loadEvents(searchTerm = '', categoryFilter = '') {
    try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (categoryFilter) params.append('category', categoryFilter);

        events = await apiRequest(`/events/?${params}`);
        displayEvents(searchTerm, categoryFilter);

        await updateDashboard();

    } catch (error) {
        console.error('Error loading events:', error);
        showNotification('Failed to load events', 'error');
    }
}

function displayEvents(searchTerm = '', categoryFilter = '', dateFilter = '') {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '';

    // Bulk actions header
    if (currentUser) {
        container.innerHTML += `
            <div id="bulkActions" class="bulk-actions" style="display: none; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div class="bulk-actions-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${selectedEvents.length}</strong> events selected</span>
                    <div>
                        <button onclick="exportSelectedEvents()" class="btn-secondary" style="margin-right: 10px;">
                            <i class="fas fa-download"></i> Export Selected
                        </button>
                        <button onclick="deleteSelectedEvents()" class="btn-danger">
                            <i class="fas fa-trash"></i> Delete Selected
                        </button>
                        <button onclick="clearSelection()" class="btn-secondary" style="margin-left: 10px;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Favorites/bookmarks section
    const favorites = getFavorites();
    if (favorites.length > 0) {
        container.innerHTML += `
            <div class="favorites-section" style="margin-bottom: 30px;">
                <h3 style="color: #4CAF50; margin-bottom: 15px;">
                    <i class="fas fa-star"></i> Your Favorite Events
                </h3>
                <div class="favorites-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                    ${favorites.map(eventId => {
                        const event = events.find(e => e.id === eventId);
                        return event ? createEventCard(event, 'favorite') : '';
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Search and Filter Bar
    if (currentUser) {
        container.innerHTML += `
            <div class="search-filter-bar" style="margin-bottom: 30px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div class="search-section" style="margin-bottom: 15px;">
                    <div class="search-input-group" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                        <div style="flex: 1; min-width: 200px;">
                            <input type="text" id="globalEventSearch" placeholder="🔍 Search events by title, location, or description..." style="width: 100%; padding: 12px 16px; border: 2px solid #e1e7ef; border-radius: 25px; font-size: 16px; outline: none;" oninput="filterEvents()">
                            <button onclick="clearSearch()" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px;">×</button>
                        </div>
                        <button onclick="toggleFilters()" id="filterToggle" style="padding: 12px 20px; background: #f3f4f6; border: none; border-radius: 25px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-filter"></i>
                            <span>Filters</span>
                        </button>
                    </div>
                </div>

                <div id="filtersSection" style="display: none;">
                    <div class="filter-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div class="filter-group">
                            <label class="filter-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Category</label>
                            <select id="categoryFilter" onchange="filterEvents()" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                                <option value="">All Categories</option>
                                <option value="academic">🎓 Academic</option>
                                <option value="sports">⚽ Sports</option>
                                <option value="cultural">🎨 Cultural</option>
                                <option value="social">🎉 Social</option>
                                <option value="club">👥 Club Activity</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label class="filter-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Date Range</label>
                            <select id="dateFilter" onchange="filterEvents()" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                                <option value="">All Dates</option>
                                <option value="today">📅 Today</option>
                                <option value="week">📅 This Week</option>
                                <option value="month">📅 This Month</option>
                                <option value="upcoming">📅 Upcoming Only</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label class="filter-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Sort By</label>
                            <select id="sortFilter" onchange="filterEvents()" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                                <option value="date">📅 Date (Soonest)</option>
                                <option value="title">📝 Title (A-Z)</option>
                                <option value="category">🏷️ Category</option>
                                <option value="popular">⭐ Most Popular</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label class="filter-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Status</label>
                            <select id="statusFilter" onchange="filterEvents()" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                                <option value="">All Events</option>
                                <option value="not-attending">❌ Not Attending</option>
                                <option value="attending">✅ Attending</option>
                                <option value="favorited">💝 Favorited</option>
                            </select>
                        </div>
                    </div>

                    <div class="filter-actions" style="display: flex; justify-content: space-between; align-items: center;">
                        <button onclick="clearAllFilters()" style="background: #f3f4f6; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; color: #4b5563;">
                            <i class="fas fa-times"></i> Clear All
                        </button>
                        <div class="active-filters" id="activeFilters" style="font-size: 14px; color: #6b7280;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Main events grid
    const mainEventsGrid = document.createElement('div');
    mainEventsGrid.className = 'events-grid';
    mainEventsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;';

    // Mobile responsive grid
    if (window.innerWidth < 768) {
        mainEventsGrid.style.gridTemplateColumns = '1fr';
    }

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
        mainEventsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: #666;">No events found matching your criteria. Try adjusting your filters.</div>';
    } else {
        filteredEvents.forEach((event) => {
            const eventCard = createEventCard(event);
            mainEventsGrid.appendChild(eventCard);
        });
    }

    container.appendChild(mainEventsGrid);
}

function createEventCard(event, type = 'regular') {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-card';
    eventDiv.style.cssText = `
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    `;

    eventDiv.onmouseover = () => eventDiv.style.transform = 'translateY(-2px)';
    eventDiv.onmouseout = () => eventDiv.style.transform = 'translateY(0)';

    const isAttending = event.attendees && event.attendees.includes(currentUser?.id);
    const isFavorite = isEventFavorited(event.id);

    let bulkCheckbox = '';
    if (currentUser && type !== 'favorite') {
        bulkCheckbox = `
            <div class="bulk-checkbox" style="position: absolute; top: 10px; left: 10px;">
                <input type="checkbox" class="event-checkbox" onchange="toggleEventSelection('${event.id}')" id="checkbox-${event.id}">
                <label for="checkbox-${event.id}" style="margin-left: 5px;"></label>
            </div>
        `;
    }

    let favoriteButton = '';
    if (currentUser) {
        favoriteButton = `
            <button class="favorite-btn ${isFavorite ? 'active' : ''}"
                    onclick="toggleFavorite('${event.id}')"
                    title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                    style="position: absolute; top: 10px; right: 10px; background: ${isFavorite ? '#ff6b6b' : '#f0f0f0'}; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-heart" style="color: ${isFavorite ? 'white' : '#666'}; font-size: 14px;"></i>
            </button>
        `;
    }

    let qrCodeSection = '';
    if (currentUser && event.created_by === currentUser.id) {
        qrCodeSection = `
            <div class="qr-section" style="padding: 15px; border-top: 1px solid #eee; background: #f8f9fa;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-weight: 500; color: #333;">Event Check-in QR:</span>
                    <button onclick="showQRCode('${event.id}', '${event.title}')" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-qrcode"></i> Show QR
                    </button>
                </div>
            </div>
        `;
    }

    let socialButtons = '';
    if (currentUser) {
        socialButtons = `
            <div class="social-share" style="padding: 15px; border-top: 1px solid #eee;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">Share this event:</div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="shareOnFacebook(${JSON.stringify(event).replace(/"/g, '"')})" title="Share on Facebook" style="background: #1877f2; color: white; border: none; border-radius: 4px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="fab fa-facebook-f"></i>
                    </button>
                    <button onclick="shareOnTwitter(${JSON.stringify(event).replace(/"/g, '"')})" title="Share on Twitter" style="background: #1da1f2; color: white; border: none; border-radius: 4px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="fab fa-twitter"></i>
                    </button>
                    <button onclick="shareViaEmail(${JSON.stringify(event).replace(/"/g, '"')})" title="Share via Email" style="background: #ea4335; color: white; border: none; border-radius: 4px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button onclick="shareViaWhatsApp(${JSON.stringify(event).replace(/"/g, '"')})" title="Share on WhatsApp" style="background: #25d366; color: white; border: none; border-radius: 4px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
            </div>
        `;
    }

    eventDiv.innerHTML = `
        ${bulkCheckbox}
        ${favoriteButton}
        <div style="padding: 20px;">
            <div class="event-title" style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #333;">${event.title}</div>
            <div class="event-category" style="display: inline-block; padding: 4px 8px; background: #e3f2fd; color: #1565c0; border-radius: 12px; font-size: 12px; text-transform: capitalize; margin-bottom: 12px;">${event.category}</div>
            <div class="event-details" style="margin-bottom: 15px; line-height: 1.5;">
                <div style="margin-bottom: 4px;"><strong>📅</strong> ${event.date} at ${event.time}</div>
                <div style="margin-bottom: 4px;"><strong>📍</strong> ${event.location}</div>
                ${event.description ? `<div style="margin-top: 8px; color: #666; font-size: 14px;">${event.description}</div>` : ''}
            </div>
            ${event.image_url ? `<img src="${API_BASE}${event.image_url}" alt="Event image" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">` : ''}

            <div class="rating" style="margin-bottom: 15px;">
                ${[1,2,3,4,5].map(star => `<span class="star ${event.rating >= star ? 'active' : ''}" onclick="rateEvent('${event.id}', ${star})" style="cursor: pointer; color: ${event.rating >= star ? '#ffd700' : '#ddd'}; margin-right: 2px;">★</span>`).join('')}
            </div>

            <div class="event-actions" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">
                <button class="rsvp-btn ${isAttending ? 'attending' : ''}" onclick="toggleRSVP('${event.id}')" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s; ${isAttending ? 'background: #32cd32; color: white;' : 'background: #007bff; color: white;'}">
                    ${isAttending ? '✓ Attending' : 'RSVP'}
                </button>
                <button class="share-btn" onclick="shareEvent('${event.id}')" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    <i class="fas fa-share"></i> Share
                </button>
                ${currentUser && event.created_by === currentUser.id ? `<button class="delete-btn" onclick="deleteEvent('${event.id}')" style="padding: 8px 16px; border: none; background: #dc3545; color: white; border-radius: 6px; cursor: pointer; font-size: 14px;">Delete</button>` : ''}
            </div>

            <div class="comments-section" style="margin-top: 15px;">
                <div style="border-top: 1px solid #eee; padding-top: 15px;">
                    <h4 style="font-size: 14px; margin-bottom: 8px;">💬 Comments (${event.comments ? event.comments.length : 0})</h4>
                    <div id="comments-${event.id}" style="margin-bottom: 10px; max-height: 100px; overflow-y: auto;">
                        ${event.comments && event.comments.length > 0 ?
                            event.comments.slice(-2).map(comment => `
                                <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; margin-bottom: 5px; font-size: 12px;">
                                    <strong>${comment.author}:</strong> ${comment.text}
                                </div>
                            `).join('')
                            : '<div style="color: #666; font-style: italic; font-size: 12px;">No comments yet</div>'
                        }
                    </div>
                    <div class="comment-form" style="display: flex; gap: 8px;">
                        <input type="text" id="comment-input-${event.id}" placeholder="Add a comment..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" onkeypress="handleCommentKeypress(event, '${event.id}')">
                        <button onclick="addComment('${event.id}')" style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Post</button>
                    </div>
                </div>
            </div>
        </div>
        ${qrCodeSection}
        ${socialButtons}
    `;

    return eventDiv;
}

// Favorites/Bookmarks Functions
function getFavorites() {
    return JSON.parse(localStorage.getItem('favoriteEvents') || '[]');
}

function addToFavorites(eventId) {
    const favorites = getFavorites();
    if (!favorites.includes(eventId)) {
        favorites.push(eventId);
        localStorage.setItem('favoriteEvents', JSON.stringify(favorites));
    }
}

function removeFromFavorites(eventId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(eventId);
    if (index > -1) {
        favorites.splice(index, 1);
        localStorage.setItem('favoriteEvents', JSON.stringify(favorites));
    }
}

function isEventFavorited(eventId) {
    const favorites = getFavorites();
    return favorites.includes(eventId);
}

async function toggleFavorite(eventId) {
    if (!isEventFavorited(eventId)) {
        addToFavorites(eventId);
        showNotification('Added to favorites!', 'success');
    } else {
        removeFromFavorites(eventId);
        showNotification('Removed from favorites', 'info');
    }
    await loadEvents(); // Refresh to update favorites display
}

// QR Code Modal Functions
function showQRCode(eventId, eventTitle) {
    const qrUrl = generateQRCode(eventId);

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; width: 90%;">
            <h3 style="margin-bottom: 20px;">${eventTitle}</h3>
            <img src="${qrUrl}" alt="QR Code" style="max-width: 200px; width: 100%; margin-bottom: 20px;">
            <p style="margin-bottom: 20px; color: #666; font-size: 14px;">Scan this QR code to check into the event</p>
            <button onclick="downloadQR('${qrUrl}', '${eventTitle}')" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px;">
                <i class="fas fa-download"></i> Download
            </button>
            <button onclick="this.closest('div').parentElement.remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                Close
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

function downloadQR(qrUrl, eventTitle) {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${eventTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('QR code downloaded!', 'success');
}

// Bulk Actions Functions
function toggleEventSelection(eventId) {
    const index = selectedEvents.indexOf(eventId);
    if (index > -1) {
        selectedEvents.splice(index, 1);
    } else {
        selectedEvents.push(eventId);
    }

    const bulkActions = document.getElementById('bulkActions');
    if (selectedEvents.length > 0) {
        bulkActions.style.display = 'block';
        bulkActions.querySelector('.bulk-actions-header strong').textContent = selectedEvents.length;
    } else {
        bulkActions.style.display = 'none';
    }
}

async function exportSelectedEvents() {
    try {
        const selectedEventData = events.filter(e => selectedEvents.includes(e.id));
        const dataStr = JSON.stringify(selectedEventData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'selected-events-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Selected events exported successfully!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Failed to export selected events', 'error');
    }
}

async function deleteSelectedEvents() {
    if (!confirm(`Are you sure you want to delete ${selectedEvents.length} events?`)) {
        return;
    }

    try {
        for (const eventId of selectedEvents) {
            await apiRequest(`/events/${eventId}`, { method: 'DELETE' });
        }

        showNotification(`${selectedEvents.length} events deleted successfully!`, 'success');
        selectedEvents = [];
        document.getElementById('bulkActions').style.display = 'none';
        await loadEvents(); // Refresh the list
    } catch (error) {
        console.error('Bulk delete failed:', error);
        showNotification('Failed to delete selected events', 'error');
    }
}

function clearSelection() {
    selectedEvents = [];
    document.querySelectorAll('.event-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('bulkActions').style.display = 'none';
}

function showLoginModal() {
    document.getElementById('authContainer').style.display = 'block';
}

// Enhanced Notification System
function showDetailedNotification(title, message, type = 'info', actions = []) {
    let notification = document.getElementById('detailed-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'detailed-notification';
        notification.className = 'detailed-notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; max-width: 400px;
            background: white; border-left: 4px solid #007bff; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1001; padding: 20px;
            transform: translateX(420px); transition: transform 0.3s ease;
        `;

        switch(type) {
            case 'success': notification.style.borderLeftColor = '#32cd32'; break;
            case 'error': notification.style.borderLeftColor = '#dc3545'; break;
            case 'warning': notification.style.borderLeftColor = '#ffc107'; break;
        }

        document.body.appendChild(notification);
    }

    const actionsHtml = actions.length > 0 ?
        `<div style="margin-top: 15px; display: flex; gap: 10px;">
            ${actions.map(action =>
                `<button onclick="${action.onclick}" style="padding: 6px 12px; background: ${action.primary ? '#007bff' : '#6c757d'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">${action.text}</button>`
            ).join('')}
        </div>` : '';

    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #333; font-size: 16px;">${title}</h4>
            <button onclick="closeDetailedNotification()" style="background: none; border: none; color: #666; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <p style="margin: 0 0 15px 0; color: #666; line-height: 1.4;">${message}</p>
        ${actionsHtml}
    `;

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto close after 10 seconds if no actions
    if (actions.length === 0) {
        setTimeout(closeDetailedNotification, 10000);
    }
}

function closeDetailedNotification() {
    const notification = document.getElementById('detailed-notification');
    if (notification) {
        notification.style.transform = 'translateX(420px)';
        setTimeout(() => notification.remove(), 300);
    }
}

// Export/Import Functions
async function exportAllData() {
    try {
        const events = await apiRequest('/events/');
        const dashboard = await apiRequest('/dashboard');
        const gamification = await apiRequest('/gamification/stats');

        const exportData = {
            events,
            dashboard,
            gamification,
            exportDate: new Date().toISOString(),
            user: currentUser
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `event-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('All data exported successfully!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Failed to export data', 'error');
    }
}

// Enhanced Dashboard with Quick Stats
async function updateDashboard() {
    if (!currentUser) {
        const dashboardEl = document.getElementById('dashboard');
        if (dashboardEl) {
            dashboardEl.innerHTML = '<h2>Dashboard</h2><p>Please login to view your dashboard.</p>';
        }
        return;
    }

    try {
        const stats = await apiRequest('/dashboard');
        const gamificationStats = await apiRequest('/gamification/stats');
        const favorites = getFavorites();
        const recentActivity = await getRecentActivity();

        const dashboardEl = document.getElementById('dashboard');
        dashboardEl.innerHTML = `
            <h2>📊 Dashboard Overview</h2>

            <div class="dashboard-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📅</div>
                    <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${stats.totalEvents}</div>
                    <div>Total Events</div>
                </div>

                <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
                    <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${stats.upcomingEvents}</div>
                    <div>Upcoming Events</div>
                </div>

                <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">⭐</div>
                    <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${gamificationStats.points}</div>
                    <div>Gamification Points</div>
                </div>

                <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">💝</div>
                    <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${favorites.length}</div>
                    <div>Favorite Events</div>
                </div>
            </div>

            <div class="dashboard-notifications" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <h3>🎯 Gamification Progress</h3>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Level ${gamificationStats.level}</span>
                                <span>${gamificationStats.points}/${gamificationStats.next_level_points || 1000}</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${gamificationStats.progress_to_next || 0}%; height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);"></div>
                            </div>
                        </div>
                        <div><strong>${gamificationStats.streak}</strong> day streak! 🔥</div>
                        <div style="margin-top: 10px; font-size: 12px; color: #666;">
                            Earn more points by creating events, RSVPing, commenting, and rating!
                        </div>
                    </div>
                </div>

                <div>
                    <h3>📈 Recent Activity</h3>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; max-height: 200px; overflow-y: auto;">
                        ${recentActivity.length > 0 ? recentActivity.map(activity =>
                            `<div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px; font-size: 12px;">${activity}</div>`
                        ).join('') : '<div style="text-align: center; color: #666; font-style: italic;">No recent activity</div>'}
                    </div>
                    <button onclick="exportAllData()" style="margin-top: 15px; width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-download"></i> Export All Data
                    </button>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard', 'error');
    }
}

async function getRecentActivity() {
    // Mock recent activity - in real app, this would come from API
    return [
        "Created new event: Welcome Party",
        "RSVP'd to 3 upcoming events",
        "Posted 2 comments on events",
        "Achieved 'Event Creator' milestone",
        "Rated 5 events with 5-star reviews"
    ];
}

// Initialize the enhanced app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Enhanced Event Manager Ready!');

    await checkLogin();

    // Setup all enhanced functionality
    setupAuthenticationButtons();
    setupNavigationButtons();
    setupQuickActionButtons();
    setupFormButtons();
    setupEventManagementButtons();
    setupProfileButtons();

    console.log('🎯 New Features Available:');
    console.log('  ✓ QR codes for event check-in');
    console.log('  ✓ Social media sharing');
    console.log('  ✓ Bulk actions');
    console.log('  ✓ Favorites/bookmarks');
    console.log('  ✓ Enhanced notifications');
    console.log('  ✓ Data export functionality');
});

function continueAsGuest() {
    // Redirect to login page
    window.location.href = 'login.html';
}

// Enhanced Login Functions
function showLoginForm() {
    const loginForm = document.getElementById('enhancedLoginForm');
    const registerForm = document.getElementById('enhancedRegisterForm');
    const forgotForm = document.getElementById('enhancedForgotForm');

    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    forgotForm.classList.remove('active');
}

function showRegisterForm() {
    const loginForm = document.getElementById('enhancedLoginForm');
    const registerForm = document.getElementById('enhancedRegisterForm');
    const forgotForm = document.getElementById('enhancedForgotForm');

    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    forgotForm.classList.remove('active');
}

function showForgotPassword() {
    const loginForm = document.getElementById('enhancedLoginForm');
    const registerForm = document.getElementById('enhancedRegisterForm');
    const forgotForm = document.getElementById('enhancedForgotForm');

    forgotForm.classList.add('active');
    loginForm.classList.remove('active');
    registerForm.classList.remove('active');
}

function togglePasswordVisibility(button) {
    const input = button.previousElementSibling;
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    button.classList.toggle('fa-eye');
    button.classList.toggle('fa-eye-slash');
}

function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    const strengthMeter = document.getElementById('passwordStrengthMeter');
    const strengthText = document.getElementById('strengthText');

    if (strengthMeter && strengthText) {
        const percentage = (strength / 5) * 100;
        strengthMeter.style.width = `${percentage}%`;

        switch(strength) {
            case 0:
            case 1:
                strengthMeter.style.background = '#ef4444';
                strengthText.textContent = 'Weak';
                strengthText.style.color = '#ef4444';
                break;
            case 2:
            case 3:
                strengthMeter.style.background = '#f59e0b';
                strengthText.textContent = 'Medium';
                strengthText.style.color = '#f59e0b';
                break;
            case 4:
            case 5:
                strengthMeter.style.background = '#22c55e';
                strengthText.textContent = 'Strong';
                strengthText.style.color = '#22c55e';
                break;
        }
    }

    return strength;
}

function showQRLogin() {
    const modal = document.getElementById('qrLoginModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeQRLogin() {
    const modal = document.getElementById('qrLoginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function loginWithGoogle() {
    showNotification('Google login coming soon!', 'info');
}

function loginWithFacebook() {
    showNotification('Facebook login coming soon!', 'info');
}

function loginWithTwitter() {
    showNotification('Twitter login coming soon!', 'info');
}

function loginWithEmail() {
    showLoginForm();
}

function loginWithGoogle() {
    alert('Google social login is not implemented yet, but this demonstrates the button functionality!');
}

function loginWithFacebook() {
    alert('Facebook social login is not implemented yet, but this demonstrates the button functionality!');
}

function loginWithTwitter() {
    alert('Twitter social login is not implemented yet, but this demonstrates the button functionality!');
}

// Enhanced form handlers
document.addEventListener('DOMContentLoaded', function() {
    // Enhanced login form
    const loginForm = document.getElementById('enhancedLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('enhancedEmail')?.value;
            const password = document.getElementById('enhancedPassword')?.value;

            if (!email || !password) {
                showCustomError('loginError', 'Please fill in all fields');
                return;
            }

            const btn = document.getElementById('enhancedLoginBtn');
            setLoading(btn, true);

            try {
                // TODO: Replace with actual API call
                console.log('Attempting login with:', email);

                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 2000));

                // For demo purposes, accept any email/password combo
                showCustomSuccess('loginSuccess', 'Welcome Back!', 'Login successful. Redirecting to dashboard...');

                setTimeout(() => {
                    window.location.hash = 'main-app';
                    showMainApp();
                }, 2000);

            } catch (error) {
                showCustomError('loginError', error.message || 'Login failed. Please check your credentials.');
            } finally {
                setLoading(btn, false);
            }
        });
    }

    // Enhanced register form
    const registerForm = document.getElementById('enhancedRegisterForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const firstName = document.getElementById('registerFirstName')?.value;
            const lastName = document.getElementById('registerLastName')?.value;
            const email = document.getElementById('registerEmail')?.value;
            const password = document.getElementById('registerPassword')?.value;
            const confirmPassword = document.getElementById('registerConfirmPassword')?.value;
            const role = document.getElementById('registerRole')?.value;
            const termsAccepted = document.getElementById('termsAgreement')?.checked;

            if (!firstName || !lastName || !email || !password || !confirmPassword || !role) {
                showCustomError('registerError', 'Please fill in all required fields');
                return;
            }

            if (password !== confirmPassword) {
                showCustomError('registerError', 'Passwords do not match');
                return;
            }

            if (checkPasswordStrength(password) < 3) {
                showCustomError('registerError', 'Password is too weak. Please choose a stronger password.');
                return;
            }

            if (!termsAccepted) {
                showCustomError('registerError', 'Please accept the Terms of Service');
                return;
            }

            const btn = document.getElementById('enhancedRegisterBtn');
            setLoading(btn, true);

            try {
                // TODO: Replace with actual API call
                console.log('Attempting registration with:', email);

                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 2000));

                showCustomSuccess('registerSuccess', 'Account Created!', 'Welcome to Campus Event Hub! Check your email for verification.');

                setTimeout(() => {
                    showLoginForm();
                }, 2000);

            } catch (error) {
                showCustomError('registerError', error.message || 'Registration failed. Please try again.');
            } finally {
                setLoading(btn, false);
            }
        });
    }

    // Password strength checker
    const passwordInput = document.getElementById('registerPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }

    // Forgot password form
    const forgotForm = document.getElementById('enhancedForgotForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('forgotEmail')?.value;

            if (!email) {
                showCustomError('forgotError', 'Please enter your email address');
                return;
            }

            const btn = document.getElementById('enhancedResetBtn');
            setLoading(btn, true);

            try {
                // TODO: Replace with actual API call
                console.log('Sending reset link to:', email);

                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1500));

                showCustomSuccess('resetSuccess', 'Reset Link Sent!', 'Please check your email for password reset instructions.');

                setTimeout(() => {
                    showLoginForm();
                }, 2000);

            } catch (error) {
                showCustomError('forgotError', error.message || 'Failed to send reset link. Please try again.');
            } finally {
                setLoading(btn, false);
            }
        });
    }
});

function setLoading(button, isLoading) {
    if (isLoading) {
        button.style.opacity = '0.7';
        button.style.pointerEvents = 'none';
        button.innerHTML = '<span class="btn-text" style="display: none;">' + button.innerHTML + '</span><span class="loading-text">' +
            '<i class="fas fa-spinner fa-spin"></i> Processing...</span>';
    } else {
        button.style.opacity = '1';
        button.style.pointerEvents = 'auto';
        button.innerHTML = button.querySelector('.btn-text').textContent;
    }
}

function showCustomError(errorId, message) {
    const errorDiv = document.getElementById(errorId);
    if (errorDiv) {
        errorDiv.style.display = 'block';
        const errorText = errorDiv.querySelector('p');
        if (errorText) errorText.textContent = message;

        // Hide success message
        const successDiv = document.getElementById(errorId.replace('Error', 'Success'));
        if (successDiv) successDiv.style.display = 'none';
    }
}

function showCustomSuccess(successId, title, message) {
    const successDiv = document.getElementById(successId);
    if (successDiv) {
        successDiv.style.display = 'block';

        const successTitle = successDiv.querySelector('h4');
        if (successTitle) successTitle.textContent = title;

        const successMessage = successDiv.querySelector('p');
        if (successMessage) successMessage.textContent = message;

        // Hide error message
        const errorDiv = document.getElementById(successId.replace('Success', 'Error'));
        if (errorDiv) errorDiv.style.display = 'none';
    }
}

console.log('✨ Campus Event Manager Enhanced Version Loaded - API Connected!');

// Filter Functions
function toggleFilters() {
    const filtersSection = document.getElementById('filtersSection');
    const filterToggle = document.getElementById('filterToggle');
    const icon = filterToggle.querySelector('i');
    const span = filterToggle.querySelector('span');

    if (filtersSection.style.display === 'none') {
        filtersSection.style.display = 'block';
        icon.className = 'fas fa-times';
        span.textContent = 'Hide Filters';
    } else {
        filtersSection.style.display = 'none';
        icon.className = 'fas fa-filter';
        span.textContent = 'Show Filters';
    }
}

function filterEvents() {
    const searchTerm = document.getElementById('globalEventSearch')?.value?.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    const sortFilter = document.getElementById('sortFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    let filteredEvents = [...events];

    // Text search
    if (searchTerm) {
        filteredEvents = filteredEvents.filter(event =>
            event.title.toLowerCase().includes(searchTerm) ||
            event.description.toLowerCase().includes(searchTerm) ||
            event.location.toLowerCase().includes(searchTerm)
        );
    }

    // Category filter
    if (categoryFilter) {
        filteredEvents = filteredEvents.filter(event => event.category === categoryFilter);
    }

    // Date filter
    if (dateFilter) {
        const today = new Date();
        filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.date);
            switch(dateFilter) {
                case 'today':
                    return eventDate.toDateString() === today.toDateString();
                case 'week':
                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return eventDate >= today && eventDate <= weekFromNow;
                case 'month':
                    return eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
                case 'upcoming':
                    return eventDate >= today;
                default:
                    return true;
            }
        });
    }

    // Status filter
    if (statusFilter && currentUser) {
        switch(statusFilter) {
            case 'attending':
                filteredEvents = filteredEvents.filter(event =>
                    event.attendees && event.attendees.includes(currentUser.id)
                );
                break;
            case 'not-attending':
                filteredEvents = filteredEvents.filter(event =>
                    !event.attendees || !event.attendees.includes(currentUser.id)
                );
                break;
            case 'favorited':
                const favorites = getFavorites();
                filteredEvents = filteredEvents.filter(event =>
                    favorites.includes(event.id)
                );
                break;
        }
    }

    // Sort
    filteredEvents.sort((a, b) => {
        switch(sortFilter) {
            case 'date':
                return new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time);
            case 'title':
                return a.title.localeCompare(b.title);
            case 'category':
                return a.category.localeCompare(b.category);
            case 'popular':
                const aRating = a.rating || 0;
                const bRating = b.rating || 0;
                return bRating - aRating;
            default:
                return new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time);
        }
    });

    // Update UI
    displayFilteredEvents(filteredEvents);
    updateActiveFilters(searchTerm, categoryFilter, dateFilter, sortFilter, statusFilter);
}

function displayFilteredEvents(filteredEvents) {
    const container = document.getElementById('eventsContainer');
    const mainEventsGrid = container.querySelector('.events-grid');
    if (!mainEventsGrid) return;

    mainEventsGrid.innerHTML = '';

    if (filteredEvents.length === 0) {
        mainEventsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: #666;">No events found matching your criteria. Try adjusting your filters.</div>';
        return;
    }

    // Mobile responsive grid
    if (window.innerWidth < 768) {
        mainEventsGrid.style.gridTemplateColumns = '1fr';
    }

    filteredEvents.forEach((event) => {
        const eventCard = createEventCard(event);
        mainEventsGrid.appendChild(eventCard);
    });
}

function updateActiveFilters(searchTerm, categoryFilter, dateFilter, sortFilter, statusFilter) {
    const activeFiltersDiv = document.getElementById('activeFilters');
    if (!activeFiltersDiv) return;

    const activeFilters = [];

    if (searchTerm) activeFilters.push(`Search: "${searchTerm}"`);
    if (categoryFilter) activeFilters.push(`Category: ${categoryFilter}`);
    if (dateFilter) activeFilters.push(`Date: ${dateFilter}`);
    if (sortFilter && sortFilter !== 'date') activeFilters.push(`Sort: ${sortFilter}`);
    if (statusFilter) activeFilters.push(`Status: ${statusFilter}`);

    if (activeFilters.length > 0) {
        activeFiltersDiv.innerHTML = `Active filters: ${activeFilters.join(', ')}`;
        activeFiltersDiv.style.display = 'block';
    } else {
        activeFiltersDiv.style.display = 'none';
    }
}

function clearAllFilters() {
    document.getElementById('globalEventSearch').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('dateFilter').value = '';
    document.getElementById('sortFilter').value = 'date';
    document.getElementById('statusFilter').value = '';

    filterEvents();
    updateActiveFilters('', '', '', 'date', '');
}

function clearSearch() {
    document.getElementById('globalEventSearch').value = '';
    filterEvents();
}

// Mobile responsiveness
function handleMobileResponsiveness() {
    const eventsGrid = document.querySelector('.events-grid');
    if (!eventsGrid) return;

    if (window.innerWidth < 768) {
        eventsGrid.style.gridTemplateColumns = '1fr';
        // Adjust card styling for mobile
        const eventCards = document.querySelectorAll('.event-card');
        eventCards.forEach(card => {
            card.style.margin = '10px';
        });
    } else {
        eventsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
        // Reset styling for desktop
        const eventCards = document.querySelectorAll('.event-card');
        eventCards.forEach(card => {
            card.style.margin = '';
        });
    }
}

// Initialize mobile responsiveness
window.addEventListener('resize', handleMobileResponsiveness);
window.addEventListener('DOMContentLoaded', handleMobileResponsiveness);
