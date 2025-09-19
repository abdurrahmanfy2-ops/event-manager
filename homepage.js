// Modern Homepage JavaScript - College Event Hub

// Chart.js Configuration
// Add Chart.js library: https://cdn.jsdelivr.net/npm/chart.js
// For production, include: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts if Chart.js is available
    initializeCharts();

    // Mobile menu toggle
    initializeMobileMenu();

    // Scroll animations
    initializeScrollAnimations();

    // Smooth scrolling for anchor links
    initializeSmoothScrolling();

    // Lazy loading for images
    initializeLazyLoading();

    // FAQ accordion
    initializeFAQ();

    // Newsletter form
    initializeNewsletterForm();

    // Theme toggle
    initializeThemeToggle();

    // Animated counters for statistics
    initializeAnimatedCounters();

    // Pricing calculator
    initializePricingCalculator();

    // Live user counter
    initializeLiveCounter();

    // Enterprise demo form
    initializeDemoForm();
});

// Chart Initialization Function
function initializeCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.log('Chart.js not loaded - displaying placeholder charts');
        return;
    }

    // Engagement Rate Chart (Donut Chart)
    const engagementChartCanvas = document.getElementById('engagementChart');
    if (engagementChartCanvas) {
        new Chart(engagementChartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Engaged Students', 'Non-engaged'],
                datasets: [{
                    data: [87, 13],
                    backgroundColor: [
                        '#2563eb', // Primary blue
                        '#e5e7eb'  // Light gray
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + '%';
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    // Attendance Trend Chart (Line Graph)
    const attendanceChartCanvas = document.getElementById('attendanceChart');
    if (attendanceChartCanvas) {
        new Chart(attendanceChartCanvas, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Event Attendance',
                    data: [120, 150, 180, 220, 280, 320, 420, 390, 450, 510, 580, 650],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#2563eb',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value, index, values) {
                                return value + '+';
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBorderWidth: 4
                    }
                }
            }
        });
    }
}

// Mobile Menu Toggle
function initializeMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('mobile-menu-open');
        });

        // Close mobile menu when clicking on a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                navLinks.classList.remove('mobile-menu-open');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navLinks.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
                navLinks.classList.remove('mobile-menu-open');
            }
        });
    }
}

// Scroll Animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .event-card, .testimonial, .stat-card');
    animatedElements.forEach(element => {
        observer.observe(element);
    });

    // Stagger animation delays
    animatedElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 100}ms`;
    });
}

// Smooth Scrolling for Anchor Links
function initializeSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                e.preventDefault();

                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetSection.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Update URL without triggering scroll
                history.pushState(null, null, targetId);
            }
        });
    });
}

// Lazy Loading for Images
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Navbar background change on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// Preload critical resources
function preloadResources() {
    // Preload hero background image
    const heroImage = new Image();
    heroImage.src = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600';

    // Preload other critical images
    const preloadImages = [
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
        'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=400',
        'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=400'
    ];

    preloadImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Performance optimizations
function optimizePerformance() {
    // Debounce scroll events
    let scrollTimeout;
    function throttledScroll() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Handle scroll events here
        }, 16);
    }
}

// Form validation (if forms are added later)
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const emailInput = form.querySelector('input[type="email"]');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (emailInput && !emailRegex.test(emailInput.value)) {
                e.preventDefault();
                alert('Please enter a valid email address');
                emailInput.focus();
            }
        });
    });
}

// Color theme adjustments for accessibility
function setupAccessibility() {
    // Check for user's color preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Add reduced motion support
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        // Disable animations for users who prefer reduced motion
        document.documentElement.style.setProperty('--transition', 'none');
    }
}

 // Pricing Calculator Functionality
function initializePricingCalculator() {
    const billingToggle = document.getElementById('billing-toggle');
    const eventsSlider = document.getElementById('events-slider');
    const teamSlider = document.getElementById('team-slider');
    const planSelect = document.getElementById('plan-select');

    const eventsCount = document.getElementById('events-count');
    const teamCount = document.getElementById('team-count');
    const monthlyCost = document.getElementById('monthly-cost');
    const yearlySavings = document.getElementById('yearly-savings');
    const perEventCost = document.getElementById('per-event-cost');

    // Update pricing based on toggle
    if (billingToggle) {
        billingToggle.addEventListener('change', function() {
            updatePricing();
        });
    }

    // Update sliders
    if (eventsSlider) {
        eventsSlider.addEventListener('input', function() {
            eventsCount.textContent = formatNumber(this.value);
            updatePricing();
        });
    }

    if (teamSlider) {
        teamSlider.addEventListener('input', function() {
            teamCount.textContent = this.value;
            updatePricing();
        });
    }

    if (planSelect) {
        planSelect.addEventListener('change', updatePricing);
    }

    // Initialize pricing
    updatePricing();

    function updatePricing() {
        const isYearly = billingToggle?.checked || false;
        const events = parseInt(eventsSlider?.value || 1000);
        const plan = planSelect?.value || 'professional';

        let basePrice;
        let multiplier = 1;

        switch(plan) {
            case 'starter':
                basePrice = isYearly ? 7.99 : 9.99;
                break;
            case 'professional':
                basePrice = isYearly ? 23.99 : 29.99;
                multiplier = Math.max(1, Math.floor(events / 1000));
                break;
            default:
                basePrice = isYearly ? 23.99 : 29.99;
        }

        const monthlyTotal = basePrice * multiplier;
        const yearlyEquivalent = monthlyTotal * 12;
        const yearlyDiscounted = basePrice * 12 * 0.8 * multiplier; // 20% discount
        const savings = yearlyEquivalent - yearlyDiscounted;
        const perEvent = (monthlyTotal / events).toFixed(4);

        monthlyCost.textContent = monthlyTotal.toFixed(2);
        yearlySavings.textContent = savings.toFixed(2);
        perEventCost.textContent = perEvent;
    }
}

// Live User Counter Functionality
function initializeLiveCounter() {
    const liveUsersElement = document.getElementById('live-users');
    if (!liveUsersElement) return;

    let baseCount = 1247;
    let variation = 0;

    // Simulate live user count (increases/decreases slightly)
    function updateLiveCount() {
        variation = Math.sin(Date.now() / 20000) * 50; // Sinusoidal variation
        const currentCount = Math.max(baseCount, baseCount + Math.round(variation));
        liveUsersElement.textContent = currentCount.toLocaleString();

        // Gradually increase base count over time
        if (Math.random() < 0.3) { // 30% chance every update
            baseCount += Math.round(Math.random() * 3); // Small random increases
        }
    }

    // Update every 3-5 seconds with some randomness
    function scheduleNextUpdate() {
        const delay = 3000 + Math.random() * 2000; // 3-5 seconds
        setTimeout(() => {
            updateLiveCount();
            scheduleNextUpdate();
        }, delay);
    }

    // Start updates
    updateLiveCount();
    scheduleNextUpdate();

    // Add some activity indicators
    setInterval(() => {
        // Randomly show activity indicators
        if (Math.random() < 0.15) { // 15% chance
            const activityIndicators = ['Just signed up!', 'New event created', 'Feedback received', 'Check completed'];
            const randomActivity = activityIndicators[Math.floor(Math.random() * activityIndicators.length)];

            // Could show a toast or temporary message here
            console.log(`Activity: ${randomActivity}`);
        }
    }, 8000);
}

// FAQ Accordion Functionality
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        question.addEventListener('click', () => {
            // Close other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    if (otherAnswer) {
                        otherAnswer.style.maxHeight = '0';
                    }
                }
            });

            // Toggle current FAQ item
            const isActive = item.classList.contains('active');
            item.classList.toggle('active');

            if (!isActive) {
                // Expand answer
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                // Collapse answer
                answer.style.maxHeight = '0';
            }
        });

        // Update aria-expanded attribute
        question.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                question.click();
            }
        });
    });
}

// Newsletter Form Functionality
function initializeNewsletterForm() {
    const newsletterForm = document.querySelector('.signup-form');
    if (!newsletterForm) return;

    const emailInput = document.getElementById('newsletter-email');
    const submitBtn = document.querySelector('.newsletter-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const loadingText = submitBtn.querySelector('.loading-text');

    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Basic email validation
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            showNotification('Please enter a valid email address', 'error');
            emailInput.focus();
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        loadingText.style.display = 'inline';

        // Simulate API call
        setTimeout(() => {
            // Reset loading state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            loadingText.style.display = 'none';

            // Show success message
            showNotification('Thank you for subscribing! Check your email for latest updates.', 'success');

            // Clear form
            emailInput.value = '';
        }, 2000);
    });
}

// Theme Toggle Functionality
function initializeThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    const body = document.body;

    // Load saved theme preference
    const savedTheme = localStorage.getItem('college-event-hub-theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        // Update icon
        if (body.classList.contains('dark-mode')) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('college-event-hub-theme', 'dark');
        } else {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('college-event-hub-theme', 'light');
        }

        // Update navbar colors based on theme
        const navbar = document.querySelector('.navbar');
        if (body.classList.contains('dark-mode')) {
            navbar.style.background = 'rgba(26, 26, 26, 0.95)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        }
    });
}

// Animated Counters for Statistics
function initializeAnimatedCounters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.dataset.target);
                animateCounter(counter, 0, target, 2000);
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    // Observe stat numbers
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        stat.dataset.original = stat.textContent; // Store original format
        stat.textContent = '0'; // Reset to 0 initially
        observer.observe(stat);
    });
}

// Counter animation function
function animateCounter(element, start, end, duration) {
    const range = end - start;
    const minStep = 1;
    const step = Math.max(minStep, Math.floor(range / (duration / 16)));
    let current = start;

    const timer = setInterval(() => {
        current += step;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = formatNumberCounter(current, element);
    }, 16);
}

// Format numbers based on original content format
function formatNumberCounter(num, element) {
    const originalFormat = element.dataset.original;
    if (originalFormat.includes('%')) {
        return num + '%';
    }
    if (originalFormat.includes('+')) {
        return '+' + num + '%';
    }
    return num;
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <p>${message}</p>
        <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    preloadResources();
    optimizePerformance();
    initializeFormValidation();
    setupAccessibility();
});

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Enterprise Demo Form Functionality
function initializeDemoForm() {
    const demoForm = document.querySelector('.contact-form');
    if (!demoForm) return;

    const demoSubmitBtn = document.getElementById('demo-submit');
    const requiredFields = demoForm.querySelectorAll('input[required], select[required]');

    demoForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate required fields
        let isValid = true;
        let firstInvalidField = null;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = 'var(--error-color)';
                isValid = false;
                if (!firstInvalidField) firstInvalidField = field;
            } else {
                field.style.borderColor = 'var(--border-color)';
            }
        });

        // Validate email format
        const emailField = document.getElementById('demo-email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailField && emailField.value && !emailRegex.test(emailField.value)) {
            emailField.style.borderColor = 'var(--error-color)';
            isValid = false;
            if (!firstInvalidField) firstInvalidField = emailField;
        }

        if (!isValid) {
            showNotification('Please fill in all required fields correctly.', 'error');
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
            return;
        }

        // Clear validation errors
        requiredFields.forEach(field => {
            field.style.borderColor = 'var(--border-color)';
        });

        // Show loading state
        const btnText = demoSubmitBtn.querySelector('.btn-text');
        const loadingText = demoSubmitBtn.querySelector('.loading-text');
        demoSubmitBtn.disabled = true;
        btnText.style.display = 'none';
        loadingText.style.display = 'inline';

        // Simulate API call
        setTimeout(() => {
            // Reset loading state
            demoSubmitBtn.disabled = false;
            btnText.style.display = 'inline';
            loadingText.style.display = 'none';

            // Collect form data for success message
            const formData = new FormData(demoForm);
            const name = formData.get('demo-name') || 'there';

            // Show success message
            showNotification(`Thank you, ${name}! Your demo request has been received. Our team will contact you within 24 hours.`, 'success');

            // Clear form (optional - some prefer to keep data for review)
            // demoForm.reset();
        }, 3000);
    });

    // Clear validation errors on focus
    requiredFields.forEach(field => {
        field.addEventListener('focus', function() {
            this.style.borderColor = 'var(--primary-color)';
        });

        field.addEventListener('blur', function() {
            if (this.value.trim()) {
                this.style.borderColor = 'var(--success-color)';
            } else {
                this.style.borderColor = 'var(--border-color)';
            }
        });
    });
}

// Polyfill for older browsers
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector;
}

if (!Element.prototype.closest) {
    Element.prototype.closest = function(selector) {
        var el = this;
        while (el) {
            if (el.matches(selector)) break;
            el = el.parentElement;
        }
        return el;
    };
}
