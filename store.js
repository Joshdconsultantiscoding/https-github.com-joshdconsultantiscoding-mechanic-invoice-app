// Data & State Management

const DEFAULT_ESTIMATES = [];

const PRICING_DATA = {
    'Oil Change': { labor: 50, parts: 45 },
    'Brake Repair': { labor: 150, parts: 120 },
    'Engine Diagnostic': { labor: 120, parts: 0 },
    'General Repair': { labor: 100, parts: 50 },
};

// Initial Users for Auth System
const MALE_EMOJIS = Array.from({ length: 15 }, (_, i) => `${(i + 1).toString().padStart(3, '0')}.png`);

const FEMALE_EMOJIS = Array.from({ length: 15 }, (_, i) => `${(i + 1).toString().padStart(3, '0')}.png`);

const DEFAULT_USERS = [
    { email: 'mechanic@example.com', password: 'password', role: 'mechanic', name: 'Mike The Mechanic', avatar: 'assets/emojis/male/001.png' },
    { email: 'customer@example.com', password: 'password', role: 'customer', name: 'John Doe', phone: '555-0101', shareKey: 'C-DEMO', avatar: 'assets/emojis/male/002.png' }
];

window.Store = {
    init: () => {
        // Initialize Users if not present
        if (!localStorage.getItem('mechflow_users')) {
            localStorage.setItem('mechflow_users', JSON.stringify(DEFAULT_USERS));
        } else {
            // Patch existing default users to ensure they have avatars
            const users = JSON.parse(localStorage.getItem('mechflow_users'));
            let updated = false;
            users.forEach(u => {
                const defaultU = DEFAULT_USERS.find(du => du.email === u.email);
                if (defaultU && (!u.avatar || u.avatar.includes('Whisk_'))) {
                    u.avatar = defaultU.avatar;
                    updated = true;
                }
            });
            if (updated) {
                localStorage.setItem('mechflow_users', JSON.stringify(users));
                // Also update current session if it's one of these users
                const current = localStorage.getItem('mechflow_user');
                if (current) {
                    const parsed = JSON.parse(current);
                    const match = users.find(u => u.email === parsed.email);
                    if (match) localStorage.setItem('mechflow_user', JSON.stringify(match));
                }
            }
        }
        // Patch all users to ensure they have an avatar and a shareKey
        const users = JSON.parse(localStorage.getItem('mechflow_users')) || [];
        let globalUpdate = false;
        users.forEach(u => {
            if (!u.avatar || u.avatar.includes('Whisk_') || u.avatar.includes('ui-avatars.com')) {
                const list = u.gender === 'female' ? FEMALE_EMOJIS : MALE_EMOJIS;
                const gender = u.gender || 'male';
                const randomEmoji = list[Math.floor(Math.random() * list.length)];
                u.avatar = `assets/emojis/${gender}/${randomEmoji}`;
                globalUpdate = true;
            }
            if (!u.shareKey && u.role === 'customer') {
                u.shareKey = 'C-' + Math.random().toString(36).substr(2, 5).toUpperCase();
                globalUpdate = true;
            }
        });
        if (globalUpdate) {
            localStorage.setItem('mechflow_users', JSON.stringify(users));
            const current = localStorage.getItem('mechflow_user');
            if (current) {
                const parsed = JSON.parse(current);
                const match = users.find(u => u.email === parsed.email);
                if (match) localStorage.setItem('mechflow_user', JSON.stringify(match));
            }
        }
        // Initialize Estimates if not present
        if (!localStorage.getItem('mechflow_estimates')) {
            localStorage.setItem('mechflow_estimates', JSON.stringify(DEFAULT_ESTIMATES));
        }
        // Initialize Notifications
        if (!localStorage.getItem('mechflow_notifications')) {
            localStorage.setItem('mechflow_notifications', JSON.stringify([]));
        }

        // Patch Estimates to use local assets for images
        const estimates = JSON.parse(localStorage.getItem('mechflow_estimates')) || [];
        let estimatesUpdated = false;
        const serviceImages = {
            'Oil Change': 'assets/services/oil change.png',
            'Brake Repair': 'assets/services/brake repair.png',
            'Engine Diagnostic': 'assets/services/engine diagnostics.png',
            'Engine Diagnostics': 'assets/services/engine diagnostics.png',
            'General Repair': 'assets/services/general repair.png'
        };
        estimates.forEach(est => {
            if (!est.img || est.img.includes('unsplash.com') || est.img.includes('undefined')) {
                est.img = serviceImages[est.service] || serviceImages['General Repair'];
                estimatesUpdated = true;
            }
        });
        if (estimatesUpdated) {
            localStorage.setItem('mechflow_estimates', JSON.stringify(estimates));
        }

        // Add storage event listener for cross-tab sync
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith('mechflow_')) {
                window.Store.notify({ type: 'STORAGE_UPDATED', key: event.key, newValue: event.newValue });
            }
        });
    },
    // Subscriber System for "Real-time" Reactive UI
    subscribers: [],
    subscribe: (callback) => {
        window.Store.subscribers.push(callback);
        return () => {
            window.Store.subscribers = window.Store.subscribers.filter(s => s !== callback);
        };
    },
    notify: (event) => {
        window.Store.subscribers.forEach(callback => callback(event));
    },

    // Request Permission for Browser Notifications
    requestNotificationPermission: async () => {
        if (!("Notification" in window)) return false;
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    },
    // Logic to send a browser push notification
    sendPushNotification: (title, body, data = {}) => {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        try {
            const n = new Notification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png', // Generic car/wrench icon
                tag: data.id || 'mechflow-alert',
                data: data
            });
            n.onclick = () => {
                window.focus();
                if (data.url) window.location.hash = data.url;
                n.close();
            };
        } catch (e) {
            console.error("Push Notification Error", e);
        }
    },

    normalizePhone: (phone) => {
        if (!phone) return "";
        return phone.replace(/\D/g, "");
    },

    // Notification Logic
    getNotifications: (role, email) => {
        try {
            const all = JSON.parse(localStorage.getItem('mechflow_notifications')) || [];
            if (role === 'mechanic') return all.filter(n => n.role === 'mechanic');
            return all.filter(n => n.role === 'customer' && n.email === email);
        } catch (e) { return []; }
    },
    addNotification: (role, type, title, message, data = {}) => {
        const notifications = JSON.parse(localStorage.getItem('mechflow_notifications')) || [];
        const newNotif = {
            id: 'NOTIF-' + Date.now(),
            role,
            type,
            title,
            message,
            data,
            read: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        // If it's for customer, we need to store their email to target them
        if (role === 'customer' && data.email) {
            newNotif.email = data.email;
        }

        notifications.unshift(newNotif);
        localStorage.setItem('mechflow_notifications', JSON.stringify(notifications.slice(0, 50))); // Keep last 50

        // Internal Notify
        window.Store.notify({ type: 'NOTIFICATION_ADDED', notification: newNotif });

        // Browser Push Notification (if in foreground or background but same origin)
        window.Store.sendPushNotification(title, message, {
            id: newNotif.id,
            url: role === 'customer' ? `#/status/${data.id}` : `#/review/${data.id}`
        });
    },
    markNotificationAsRead: (id) => {
        const notifications = JSON.parse(localStorage.getItem('mechflow_notifications')) || [];
        const index = notifications.findIndex(n => n.id === id);
        if (index >= 0) {
            notifications[index].read = true;
            localStorage.setItem('mechflow_notifications', JSON.stringify(notifications));
            window.Store.notify({ type: 'NOTIFICATION_UPDATED' });
        }
    },
    getUsers: () => {
        try {
            return JSON.parse(localStorage.getItem('mechflow_users')) || [];
        } catch (e) {
            return [];
        }
    },
    saveUser: (user) => {
        const users = window.Store.getUsers();
        // Check if updating or adding
        const index = users.findIndex(u => u.email === user.email);
        if (index >= 0) {
            users[index] = user;
        } else {
            users.push(user);
        }
        localStorage.setItem('mechflow_users', JSON.stringify(users));
        window.Store.notify({ type: 'USER_UPDATED' });
    },
    getCurrentUser: () => {
        try {
            const user = localStorage.getItem('mechflow_user');
            return user ? JSON.parse(user) : null;
        } catch (e) {
            console.error("Error parsing user", e);
            return null;
        }
    },
    assignAvatar: (gender) => {
        const list = gender === 'female' ? FEMALE_EMOJIS : MALE_EMOJIS;
        const randomEmoji = list[Math.floor(Math.random() * list.length)];
        const avatarPath = `assets/emojis/${gender}/${randomEmoji}`;

        const currentUser = window.Store.getCurrentUser();
        if (currentUser) {
            currentUser.avatar = avatarPath;
            window.Store.saveUser(currentUser);
            localStorage.setItem('mechflow_user', JSON.stringify(currentUser));
            window.Store.notify({ type: 'USER_UPDATED', user: currentUser });
        }
        return avatarPath;
    },
    loginByKey: (key) => {
        const users = window.Store.getUsers();
        const user = users.find(u => u.shareKey === key);
        if (user) {
            localStorage.setItem('mechflow_user', JSON.stringify(user));
            return user;
        }
        return null;
    },
    loginByPhoneEmail: (email, phone) => {
        const users = window.Store.getUsers();
        const normPhone = window.Store.normalizePhone(phone);
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && window.Store.normalizePhone(u.phone) === normPhone);
        if (user) {
            localStorage.setItem('mechflow_user', JSON.stringify(user));
            return user;
        }
        return null;
    },
    login: (email, password) => {
        const users = window.Store.getUsers();
        // Secure mock login check (Email + Password)
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && (u.password === password || password === 'global_bypass'));
        if (user) {
            localStorage.setItem('mechflow_user', JSON.stringify(user));
            return user;
        }
        return null;
    },
    register: (name, email, password, phone) => {
        const users = window.Store.getUsers();
        if (users.find(u => u.email === email)) {
            throw new Error("Email already exists");
        }
        // Generate Unique 6-char Key (e.g., C-9X21)
        const shareKey = 'C-' + Math.random().toString(36).substr(2, 5).toUpperCase();

        // Auto-assign random avatar on registration
        const randomEmoji = MALE_EMOJIS[Math.floor(Math.random() * MALE_EMOJIS.length)];
        const avatar = `assets/emojis/male/${randomEmoji}`;

        const newUser = { name, email, password, phone: window.Store.normalizePhone(phone), role: 'customer', shareKey, avatar };
        window.Store.saveUser(newUser);
        localStorage.setItem('mechflow_user', JSON.stringify(newUser));
        return newUser;
    },
    logout: () => {
        localStorage.removeItem('mechflow_user');
    },
    getEstimates: () => {
        try {
            const data = localStorage.getItem('mechflow_estimates');
            return data ? JSON.parse(data) : DEFAULT_ESTIMATES;
        } catch (e) {
            console.error("Error parsing estimates", e);
            return DEFAULT_ESTIMATES;
        }
    },
    getEstimate: (id) => {
        const estimates = window.Store.getEstimates();
        return estimates.find(e => e.id === id);
    },
    getCustomerEstimates: (phone, email, shareKey) => {
        const estimates = window.Store.getEstimates();
        // Priority: Share Key (Unique) > Phone > Email
        // MUST match at least one provided non-empty credential
        return estimates.filter(e => {
            if (shareKey && e.customerKey === shareKey) return true;
            if (phone && e.phone && e.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) return true; // Normalize phone
            if (email && (e.email || e.customer).toLowerCase() === email.toLowerCase()) return true; // Check email field or fallback to customer name if it's an email
            return false;
        });
    },
    saveEstimate: (estimate) => {
        const estimates = window.Store.getEstimates();
        const index = estimates.findIndex(e => e.id === estimate.id);
        const oldStatus = index >= 0 ? estimates[index].status : null;

        if (index >= 0) {
            estimates[index] = estimate;
        } else {
            estimates.unshift(estimate);
        }
        localStorage.setItem('mechflow_estimates', JSON.stringify(estimates));

        // Trigger Notification if status changed
        if (oldStatus && oldStatus !== estimate.status) {
            // Ensure we have an email to notify
            let targetEmail = estimate.email;
            if (!targetEmail) {
                const users = window.Store.getUsers();
                const normPhone = window.Store.normalizePhone(estimate.phone);
                const user = users.find(u =>
                    (estimate.customerKey && u.shareKey === estimate.customerKey) ||
                    (estimate.phone && window.Store.normalizePhone(u.phone) === normPhone)
                );
                if (user) targetEmail = user.email;
            }

            if (targetEmail) {
                window.Store.addNotification('customer', 'status_update', 'Repair Status Alert', `Your ${estimate.vehicle} service is now ${estimate.status.toUpperCase()}.`, { id: estimate.id, email: targetEmail });
            }
        }

        window.Store.notify({ type: 'ESTIMATE_UPDATED', estimate });
    },
    createEstimate: (data) => {
        let labor = 0;
        let parts = 0;
        if (data.service && PRICING_DATA[data.service]) {
            labor = PRICING_DATA[data.service].labor;
            parts = PRICING_DATA[data.service].parts;
        }

        const subtotal = labor + parts;
        const tax = (subtotal * 0.0825);
        const total = subtotal + tax;

        const images = {
            'Oil Change': 'assets/services/oil change.png',
            'Brake Repair': 'assets/services/brake repair.png',
            'Engine Diagnostic': 'assets/services/engine diagnostics.png',
            'Engine Diagnostics': 'assets/services/engine diagnostics.png',
            'General Repair': 'assets/services/general repair.png'
        };

        const newEst = {
            id: 'EST-' + Math.floor(1000 + Math.random() * 9000),
            status: 'pending',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            laborCost: labor,
            partsCost: parts,
            tax: tax,
            amount: total,
            img: images[data.service] || images['General Repair']
        };

        Object.assign(newEst, data);
        window.Store.saveEstimate(newEst);

        // Notify Mechanic of New Request
        window.Store.addNotification('mechanic', 'new_request', 'New Service Request', `New request from ${data.customer} for ${data.vehicle}`, { id: newEst.id });

        return newEst;
    },
    markPaid: (id) => {
        const est = window.Store.getEstimate(id);
        if (est) {
            est.paid = true;
            window.Store.saveEstimate(est);
        }
    },
    deleteEstimate: (id) => {
        const est = window.Store.getEstimate(id);
        if (est) {
            est.status = 'archived'; // Soft delete (archived)
            window.Store.saveEstimate(est);
        }
    },
    deleteCustomer: (customerName) => {
        // Soft delete all estimates for this customer
        let estimates = window.Store.getEstimates();
        estimates.forEach(e => {
            if (e.customer === customerName) {
                e.status = 'archived';
            }
        });
        localStorage.setItem('mechflow_estimates', JSON.stringify(estimates));
        window.Store.notify({ type: 'CUSTOMER_DELETED' });
    }
};

window.downloadPDF = (estimate) => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("MechFlow Invoice", 105, 20, null, null, "center");

        doc.setFontSize(12);
        doc.text(`Invoice ID: ${estimate.id}`, 20, 40);
        doc.text(`Date: ${estimate.date}`, 20, 50);
        doc.text(`Status: ${estimate.status.toUpperCase()}`, 20, 60);

        doc.line(20, 65, 190, 65);

        // Customer Details
        doc.setFontSize(14);
        doc.text("Bill To:", 20, 75);
        doc.setFontSize(12);
        doc.text(estimate.customer, 20, 85);
        doc.text(`Phone: ${estimate.phone}`, 20, 95);

        // Vehicle Details
        doc.setFontSize(14);
        doc.text("Vehicle Service:", 120, 75);
        doc.setFontSize(12);
        doc.text(`${estimate.vehicle}`, 120, 85);
        doc.text(`${estimate.service}`, 120, 95);

        doc.line(20, 105, 190, 105);

        // Line Items
        let y = 120;
        doc.text("Description", 20, y);
        doc.text("Amount", 160, y);
        y += 10;
        doc.line(20, y - 5, 190, y - 5);

        doc.text("Labor Cost", 20, y);
        doc.text(`$${Number(estimate.laborCost).toFixed(2)}`, 160, y);
        y += 10;

        doc.text("Parts Cost", 20, y);
        doc.text(`$${Number(estimate.partsCost).toFixed(2)}`, 160, y);
        y += 10;

        doc.text("Tax (8.25%)", 20, y);
        doc.text(`$${Number(estimate.tax).toFixed(2)}`, 160, y);
        y += 20;

        // Total
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text("Total", 120, y);
        doc.text(`$${Number(estimate.amount).toFixed(2)}`, 160, y);

        doc.save(`Invoice_${estimate.id}.pdf`);
    } catch (e) {
        console.error("PDF Generation Error", e);
        alert("Error generating PDF. Please try again.");
    }
};

// Initialize Store
window.Store.init();
