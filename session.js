/*
    session.js - Global Session & Security Manager
    Handles connectivity, auth state, and device tracking across both portals.
*/

(function (window) {
    const SessionManager = {
        config: {
            portal: window.location.href.includes('customer.html') ? 'customer' : 'mechanic',
            sessionKey: window.location.href.includes('customer.html') ? 'mechflow_customer_session' : 'mechflow_mechanic_session'
        },

        init: function () {
            this.checkOffline();
            this.bindEvents();
            this.trackDevice();
            console.log(`[Session] Initialized for ${this.config.portal} portal.`);
        },

        // --- Connectivity ---
        checkOffline: function () {
            if (!navigator.onLine && !window.location.href.includes('offline.html')) {
                console.warn("[Session] System offline. Redirecting...");
                this.saveRedirectState();
                window.location.href = 'offline.html';
            }
        },

        /* 
           Preserves where the user was trying to go before offline redirect.
        */
        saveRedirectState: function () {
            // Only save if not already redirecting or on a utility page
            if (!window.location.href.includes('offline.html')) {
                sessionStorage.setItem('mechflow_redirect_after_online', window.location.href);
            }
        },

        bindEvents: function () {
            window.addEventListener('offline', () => this.checkOffline());
            window.addEventListener('online', () => {
                console.log("[Session] Connectivity restored.");
            });
        },

        // --- Auth & State ---
        getSession: function () {
            try {
                const data = localStorage.getItem(this.config.sessionKey);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                return null;
            }
        },

        setSession: function (user) {
            if (!user) return;
            // Enrich session with device info
            user._device = this.getDeviceInfo();
            user._lastLogin = new Date().toISOString();

            localStorage.setItem(this.config.sessionKey, JSON.stringify(user));
            this.logAttempt('login_success', user.email);
        },

        clearSession: function () {
            const user = this.getSession();
            if (user) this.logAttempt('logout', user.email);
            localStorage.removeItem(this.config.sessionKey);
        },

        updateAvatar: function (avatarParams) {
            const user = this.getSession();
            if (user && avatarParams) {
                user.avatar = avatarParams;
                this.setSession(user);
                return true;
            }
            return false;
        },

        // --- Device Fingerprinting (Simulation) ---
        getDeviceInfo: function () {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screen: `${window.screen.width}x${window.screen.height}`,
                language: navigator.language,
                timestamp: Date.now()
            };
        },

        trackDevice: function () {
            const info = this.getDeviceInfo();
            // Store locally for audit
            const history = JSON.parse(localStorage.getItem('mechflow_device_history')) || [];
            history.unshift({ date: new Date().toISOString(), info });
            if (history.length > 50) history.pop(); // Keep log small
            localStorage.setItem('mechflow_device_history', JSON.stringify(history));
        },

        // --- Security Logging ---
        logAttempt: function (action, identifier) {
            // Simulate IP logging
            const ipStub = '192.168.1.' + Math.floor(Math.random() * 255);
            const logEntry = {
                action,
                identifier,
                ip: ipStub,
                time: new Date().toISOString(),
                portal: this.config.portal
            };

            const logs = JSON.parse(localStorage.getItem('mechflow_security_logs')) || [];
            logs.unshift(logEntry);
            localStorage.setItem('mechflow_security_logs', JSON.stringify(logs));

            console.log(`[Security] ${action.toUpperCase()} - ${identifier} from ${ipStub}`);
        }
    };

    // Initialize immediately
    SessionManager.init();

    // Expose Global
    window.Session = SessionManager;

})(window);
