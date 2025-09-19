// API Integration Layer for College Event Hub
// Connects frontend with FastAPI backend running on port 8001

const API_BASE_URL = 'http://localhost:8001';

// ============== API UTILITY FUNCTIONS ==============

class APIClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    // GET requests
    async get(endpoint, options = {}) {
        return this.makeRequest(endpoint, { ...options, method: 'GET' });
    }

    // POST requests
    async post(endpoint, data = {}, options = {}) {
        return this.makeRequest(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT requests
    async put(endpoint, data = {}, options = {}) {
        return this.makeRequest(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE requests
    async delete(endpoint, options = {}) {
        return this.makeRequest(endpoint, { ...options, method: 'DELETE' });
    }
}

// Initialize API client
const api = new APIClient();

// ============== AUTHENTICATION APIS ==============

const authAPI = {
    async login(email, password) {
        return api.post('/auth/login', { email, password });
    },

    async register(firstName, lastName, email, password, role = 'student') {
        return api.post('/auth/register', {
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            role
        });
    },

    async forgotPassword(email) {
        return api.post('/auth/forgot-password', { email });
    },

    async getProfile() {
        return api.get('/profile');
    },

    async updateProfile(profileData) {
        return api.put('/profile', profileData);
    }
};

// ============== EVENTS APIS ==============

const eventsAPI = {
    async getAllEvents() {
        return api.get('/events/');
    },

    async createEvent(eventData) {
        return api.post('/events/', eventData);
    },

    async getEvent(eventId) {
        return api.get(`/events/${eventId}`);
    },

    async updateEvent(eventId, eventData) {
        return api.put(`/events/${eventId}`, eventData);
    },

    async deleteEvent(eventId) {
        return api.delete(`/events/${eventId}`);
    },

    async attendEvent(eventId, userId) {
        return api.post(`/events/${eventId}/attend`, { user_id: userId });
    },

    async addComment(eventId, comment) {
        return api.post(`/events/${eventId}/comments`, { text: comment });
    }
};

// ============== ANALYTICS & DASHBOARD APIS ==============

const analyticsAPI = {
    async getDashboardStats() {
        return api.get('/dashboard');
    },

    async getEventAnalytics(timeRange = 'month') {
        return api.get(`/analytics/events?time_range=${timeRange}`);
    },

    async getUserAnalytics() {
        return api.get('/analytics/users');
    },

    async getGamificationStats() {
        return api.get('/gamification/stats');
    }
};

// ============== NOTIFICATIONS APIS ==============

const notificationsAPI = {
    async getNotifications() {
        return api.get('/notifications');
    },

    async markAsRead(notificationId) {
        return api.put(`/notifications/${notificationId}/read`);
    }
};

// ============== FAVORITES APIS ==============

const favoritesAPI = {
    async getFavorites() {
        return api.get('/favorites');
    },

    async addToFavorites(eventId) {
        return api.post(`/favorites/${eventId}`);
    },

    async removeFromFavorites(eventId) {
        return api.delete(`/favorites/${eventId}`);
    }
};

// ============== FILE UPLOAD APIS ==============

const uploadAPI = {
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload/file`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload Error: ${response.statusText}`);
        }

        return response.json();
    }
};

// ============== UTILITY FUNCTIONS ==============

const utils = {
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="loading-spinner">Loading...</div>';
        }
    },

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element && element.innerHTML.includes('loading-spinner')) {
            element.innerHTML = '';
        }
    },

    showError(message, elementId = null) {
        const errorHtml = `<div class="error-message" style="color: #dc2626; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; margin: 10px 0;">${message}</div>`;

        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = errorHtml;
                setTimeout(() => element.innerHTML = '', 5000);
            }
        } else {
            console.error(message);
        }
    },

    showSuccess(message, elementId = null) {
        const successHtml = `<div class="success-message" style="color: #059669; padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; margin: 10px 0;">${message}</div>`;

        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = successHtml;
                setTimeout(() => element.innerHTML = '', 5000);
            }
        } else {
            console.log(message);
        }
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    debounce(func, delay = 300) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
};

// ============== FORM VALIDATION ==============

const validation = {
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    isValidPassword(password) {
        return password.length >= 6;
    },

    sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    }
};

// ============== LOCAL STORAGE MANAGEMENT ==============

const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    },

    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Error removing from localStorage:', e);
        }
    },

    clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.error('Error clearing localStorage:', e);
        }
    }
};

// ============== EXPORT ALL MODULES ==============

const EventAPI = {
    auth: authAPI,
    events: eventsAPI,
    analytics: analyticsAPI,
    notifications: notificationsAPI,
    favorites: favoritesAPI,
    upload: uploadAPI,
    utils,
    validation,
    storage
};

// Make it globally available
if (typeof window !== 'undefined') {
    window.EventAPI = EventAPI;
}

// ============== INITIALIZATION ==============

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎓 College Event Hub API Integration Loaded');
    console.log('📡 Backend API: http://localhost:8001');
    console.log('✅ Ready for real-time data integration');
});</content>
