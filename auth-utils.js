// Authentication Utilities
// Global authentication management for College Event Hub

class AuthManager {
    constructor() {
        this.apiBase = 'http://localhost:8001';
        this.currentUser = null;
        this.authToken = null;
        this.initializeAuth();
    }

    /**
     * Initialize authentication state from localStorage
     */
    initializeAuth() {
        try {
            // Try to get existing auth from localStorage first, then sessionStorage
            this.authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

            const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                console.log('✅ User authenticated:', this.currentUser.email);

                // Verify token validity on page load
                this.verifyToken();
            }
        } catch (error) {
            console.warn('❌ Error initializing auth:', error);
            this.logout();
        }
    }

    /**
     * Update authentication state
     */
    setAuth(token, user, rememberMe = false) {
        this.authToken = token;
        this.currentUser = user;

        const storage = rememberMe ? localStorage : sessionStorage;
        const otherStorage = rememberMe ? sessionStorage : localStorage;

        // Store in preferred storage
        storage.setItem('authToken', token);
        storage.setItem('user', JSON.stringify(user));

        // Clear from other storage
        otherStorage.removeItem('authToken');
        otherStorage.removeItem('user');

        console.log('✅ Authentication updated:', user.email);
        this.onAuthStateChange(true);
    }

    /**
     * Clear authentication state
     */
    logout() {
        this.authToken = null;
        this.currentUser = null;

        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');

        console.log('🔒 User logged out');
        this.onAuthStateChange(false);
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return this.authToken;
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        if (!this.currentUser) return false;
        return this.currentUser.role === role ||
               (role === 'organizer' && ['admin', 'organizer'].includes(this.currentUser.role)) ||
               (role === 'admin' && this.currentUser.role === 'admin');
    }

    /**
     * Get authorization headers for API calls
     */
    getAuthHeaders() {
        if (!this.authToken) return {};
        return {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Verify token validity with server
     */
    async verifyToken() {
        if (!this.authToken) {
            this.logout();
            return false;
        }

        try {
            const response = await fetch(`${this.apiBase}/profile`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Token verification failed:', response.status);
                this.logout();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Token verification error:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Handle authentication state changes
     */
    onAuthStateChange(isAuthenticated) {
        // Trigger custom event for other components to listen to
        const event = new CustomEvent('authStateChanged', {
            detail: {
                authenticated: isAuthenticated,
                user: this.currentUser,
                token: this.authToken
            }
        });
        document.dispatchEvent(event);

        // Update UI elements that depend on authentication
        this.updateUI();
    }

    /**
     * Update UI based on authentication state
     */
    updateUI() {
        // Update navigation links
        const loginLink = document.getElementById('nav-login');
        const userMenu = document.getElementById('nav-user-menu');
        const logoutBtn = document.getElementById('nav-logout');

        if (this.isAuthenticated()) {
            if (loginLink) loginLink.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'block';
                // Update user info in menu
                const userNameElement = document.getElementById('user-name');
                if (userNameElement && this.currentUser) {
                    userNameElement.textContent = this.currentUser.name;
                }
            }
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            if (loginLink) loginLink.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    /**
     * Show login required modal/dialog
     */
    showLoginRequired(message = 'Please log in to access this feature.') {
        const loginModal = document.createElement('div');
        loginModal.className = 'login-required-modal';
        loginModal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <i class="fas fa-lock"></i>
                        <h3>Authentication Required</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="this.closest('.login-required-modal').remove()">Cancel</button>
                        <a href="login.html" class="btn-primary">Sign In</a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(loginModal);
        return loginModal;
    }

    /**
     * Handle unauthorized responses from API
     */
    handleUnauthorized(response) {
        if (response.status === 401) {
            this.logout();
            this.showLoginRequired('Your session has expired. Please log in again.');
            return true;
        }
        return false;
    }

    /**
     * API wrapper with automatic auth handling
     */
    async authenticatedFetch(url, options = {}) {
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle unauthorized responses
            if (this.handleUnauthorized(response)) {
                return null;
            }

            return response;
        } catch (error) {
            console.error('Network error:', error);
            return { error: error.message };
        }
    }
}

// Global auth instance
const authManager = new AuthManager();

// Export for use in other modules
window.AuthManager = authManager;

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    authManager.updateUI();

    // Listen for logout button clicks
    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authManager.logout();
            window.location.href = 'login.html';
        });
    }

    // Check URL for logout parameter
    if (window.location.search.includes('logout')) {
        authManager.logout();
        window.location.href = 'login.html';
    }
});

// Helper functions for easy access
window.isLoggedIn = () => authManager.isAuthenticated();
window.getCurrentUser = () => authManager.getCurrentUser();
window.logout = () => authManager.logout();
window.getAuthHeaders = () => authManager.getAuthHeaders();

// Debug helper
console.log('🔐 Authentication system initialized');
console.log('📡 API Base URL:', authManager.apiBase);
console.log('👤 Authenticated:', authManager.isAuthenticated());

if (authManager.currentUser) {
    console.log('👤 Current User:', authManager.currentUser.name, '-', authManager.currentUser.role);
}

// Export default
export default authManager;
