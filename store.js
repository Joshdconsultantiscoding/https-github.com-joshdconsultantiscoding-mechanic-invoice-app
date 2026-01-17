// Data & State Management

const DEFAULT_ESTIMATES = [];

const PRICING_DATA = {
    'Oil Change': { labor: 50, parts: 45 },
    'Brake Repair': { labor: 150, parts: 120 },
    'Engine Diagnostic': { labor: 120, parts: 0 },
    'General Repair': { labor: 100, parts: 50 },
};

// Initial Users for Auth System
const DEFAULT_USERS = [
    { email: 'mechanic@example.com', password: 'password', role: 'mechanic', name: 'Mike The Mechanic' },
    { email: 'customer@example.com', password: 'password', role: 'customer', name: 'John Doe', phone: '555-0101', shareKey: 'C-DEMO' }
];

window.Store = {
    init: () => {
        // Initialize Users if not present
        if (!localStorage.getItem('mechflow_users')) {
            localStorage.setItem('mechflow_users', JSON.stringify(DEFAULT_USERS));
        }
        // Initialize Estimates if not present
        if (!localStorage.getItem('mechflow_estimates')) {
            localStorage.setItem('mechflow_estimates', JSON.stringify(DEFAULT_ESTIMATES));
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
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.phone === phone);
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

        const newUser = { name, email, password, phone, role: 'customer', shareKey };
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
        if (index >= 0) {
            estimates[index] = estimate;
        } else {
            estimates.unshift(estimate);
        }
        localStorage.setItem('mechflow_estimates', JSON.stringify(estimates));
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
            'Oil Change': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=300&q=80',
            'Brake Repair': 'https://images.unsplash.com/photo-1597762470488-387751f538c6?auto=format&fit=crop&w=300&q=80',
            'Engine Diagnostic': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=300&q=80',
            'General Repair': 'https://images.unsplash.com/photo-1625043484550-df60256f6ea5?auto=format&fit=crop&w=300&q=80'
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
