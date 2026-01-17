import './style.css';

// --- State Management ---
const Store = {
  getEstimates: () => {
    try {
      const data = localStorage.getItem('mechanic_estimates');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Storage error", e);
      return [];
    }
  },
  saveEstimate: (estimate) => {
    const estimates = Store.getEstimates();
    const existingIndex = estimates.findIndex(e => e.id === estimate.id);
    if (existingIndex >= 0) {
      estimates[existingIndex] = estimate;
    } else {
      estimates.push(estimate);
    }
    localStorage.setItem('mechanic_estimates', JSON.stringify(estimates));
  },
  getEstimate: (id) => {
    return Store.getEstimates().find(e => e.id === id);
  },
  // Simple auth mock
  isLoggedIn: () => localStorage.getItem('mechanic_logged_in') === 'true',
  login: () => localStorage.setItem('mechanic_logged_in', 'true'),
  logout: () => localStorage.removeItem('mechanic_logged_in'),

  // Business Settings
  getSettings: () => {
    return JSON.parse(localStorage.getItem('mechanic_settings') || JSON.stringify({
      businessName: "Mechanic Pro",
      phone: "+1234567890",
      currency: "₦" // Defaulting to Naira based on "African small-business friendly" hint in prompt
    }));
  },
  saveSettings: (settings) => {
    localStorage.setItem('mechanic_settings', JSON.stringify(settings));
  }
};

// --- Utilities ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const formatCurrency = (amount) => {
  const settings = Store.getSettings();
  return `${settings.currency}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const formatDate = (isoString) => new Date(isoString).toLocaleString();

// --- Routing ---
const app = document.querySelector('#app');

const navigate = (view, params = {}) => {
  window.scrollTo(0, 0);
  switch (view) {
    case 'customer-form': renderCustomerForm(); break;
    case 'success': renderSuccess(params); break;
    case 'admin-login': renderAdminLogin(); break;
    case 'dashboard': renderDashboard(); break;
    case 'settings': renderSettings(); break;
    case 'estimate-detail': renderEstimateDetail(params.id); break;
    case 'invoice-view': renderInvoiceView(params.id); break;
    default: renderCustomerForm();
  }
};

// --- Views ---

// 1. Customer Form
function renderCustomerForm() {
  app.innerHTML = `
    <div class="view-container">
      <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
        <h1>Request Estimate</h1>
        <button id="btn-admin-login" style="font-size:0.8rem; color:var(--color-primary);">Mechanic Login</button>
      </div>
      <p>Fill out the details below to get a quick repair cost estimate.</p>
      
      <form id="estimate-form">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input required type="text" name="customerName" class="form-input" placeholder="John Doe" />
        </div>

        <div class="form-group">
          <label class="form-label">Phone Number (WhatsApp) *</label>
          <input required type="tel" name="phone" class="form-input" placeholder="080 1234 5678" />
        </div>

        <div class="form-group">
          <label class="form-label">Vehicle Type</label>
          <select name="vehicleType" class="form-select">
            <option value="Car">Car</option>
            <option value="SUV">SUV</option>
            <option value="Truck">Truck</option>
            <option value="Motorcycle">Motorcycle</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Vehicle Brand & Model *</label>
          <input required type="text" name="vehicleModel" class="form-input" placeholder="e.g. Toyota Corolla 2015" />
        </div>

        <div class="form-group">
          <label class="form-label">Service Needed</label>
          <select name="serviceType" class="form-select">
            <option value="General Repair">General Repair</option>
            <option value="Oil Change">Oil Change</option>
            <option value="Brake Repair">Brake Repair</option>
            <option value="Engine Diagnosis">Engine Diagnosis</option>
            <option value="Suspension">Suspension</option>
            <option value="Electrical">Electrical</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Description / Notes</label>
          <textarea name="notes" class="form-textarea" placeholder="describe the issue..."></textarea>
        </div>

        <button type="submit" class="btn btn-primary" id="submit-btn">
          Get Cost Estimate
        </button>
        <p id="error-msg" style="color:red; margin-top:1rem; display:none;">Error submitting form.</p>
      </form>
    </div>
  `;

  document.getElementById('btn-admin-login').onclick = () => navigate('admin-login');

  const form = document.getElementById('estimate-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');

    // Safety: Disable button
    btn.disabled = true;
    btn.innerHTML = `<div class="loading-spinner"></div> Sending...`;
    errorMsg.style.display = 'none';

    try {
      // Collect data
      const formData = new FormData(form);
      const data = {
        id: generateId(),
        customerName: formData.get('customerName'),
        phone: formData.get('phone'),
        vehicleType: formData.get('vehicleType'),
        vehicleModel: formData.get('vehicleModel'),
        serviceType: formData.get('serviceType'),
        notes: formData.get('notes'),
        status: 'pending',
        createdAt: new Date().toISOString(),
        // Mechanic defaults
        laborCost: 0,
        partsCost: 0,
        discount: 0,
        mechanicNotes: ''
      };

      // Simulate network delay
      await new Promise(r => setTimeout(r, 800));

      Store.saveEstimate(data);
      navigate('success', { ref: data.id });
    } catch (err) {
      console.error(err);
      errorMsg.style.display = 'block';
      errorMsg.textContent = "Something went wrong. Please try again.";
      btn.disabled = false;
      btn.innerText = "Get Cost Estimate";
    }
  };
}

// 2. Success Screen
function renderSuccess(params) {
  app.innerHTML = `
    <div class="view-container text-center" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <div style="font-size:3rem; margin-bottom:1rem;">✅</div>
      <h1>Request Received!</h1>
      <p>Thank you. Your estimate request has been sent.</p>
      <p>We will contact you via WhatsApp shortly with the details.</p>
      <div style="margin-top:2rem; padding:1rem; background:white; border:1px solid #eee; border-radius:8px;">
        <small>Reference ID</small><br>
        <strong>#${params.ref || '---'}</strong>
      </div>
      <button class="btn btn-secondary" id="home-btn" style="margin-top:2rem;">Back to Home</button>
    </div>
  `;
  document.getElementById('home-btn').onclick = () => navigate('customer-form');
}

// 3. Admin Login
function renderAdminLogin() {
  app.innerHTML = `
    <div class="view-container">
      <h1>Mechanic Login</h1>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" value="mechanic@example.com" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="password" class="form-input" placeholder="Enter password (any)" />
        </div>
        <button type="submit" class="btn btn-primary">Login</button>
        <button type="button" class="btn btn-secondary" id="back-btn">Back</button>
      </form>
    </div>
  `;

  document.getElementById('back-btn').onclick = () => navigate('customer-form');
  document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    Store.login();
    navigate('dashboard');
  };
}

// 4. Dashboard
function renderDashboard() {
  if (!Store.isLoggedIn()) return navigate('admin-login');

  const estimates = Store.getEstimates().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Re-write list with dataset
  const refinedListHtml = estimates.length === 0 ?
    `<div class="text-center" style="padding:2rem;">Waiting for requests...</div>` :
    estimates.map(e => `
        <div class="card item-card" data-id="${e.id}" style="cursor:pointer;">
          <div class="card-header">
            <strong>${e.customerName}</strong>
            <span class="badge badge-${e.status}">${e.status}</span>
          </div>
          <div>${e.vehicleModel} - ${e.serviceType}</div>
          <div style="margin-top:5px; font-weight:bold;">${e.status !== 'pending' ? formatCurrency(Number(e.laborCost) + Number(e.partsCost) - Number(e.discount || 0)) : 'Pending Estimate'}</div>
          <div style="font-size:0.75rem; color:#999; margin-top:5px;">${formatDate(e.createdAt)}</div>
        </div>
      `).join('');

  app.innerHTML = `
    <div class="view-container">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h1>Dashboard</h1>
        <div>
          <button id="settings-btn" style="color:var(--color-text-secondary); margin-right:10px;">⚙️</button>
          <button id="logout-btn" style="color:var(--color-danger);">Logout</button>
        </div>
      </div>
      <div class="form-group">
        <input type="text" class="form-input" placeholder="Search customer..." disabled style="opacity:0.6;" /> 
      </div>
      <div id="list-container">
        ${refinedListHtml}
      </div>
    </div>
  `;

  document.querySelectorAll('.item-card').forEach(el => {
    el.onclick = () => navigate('estimate-detail', { id: el.dataset.id });
  });

  document.getElementById('settings-btn').onclick = () => navigate('settings');

  document.getElementById('logout-btn').onclick = () => {
    Store.logout();
    navigate('customer-form');
  };
}

// 5. Settings
function renderSettings() {
  if (!Store.isLoggedIn()) return navigate('admin-login');
  const settings = Store.getSettings();

  app.innerHTML = `
        <div class="view-container">
          <button class="btn btn-secondary" id="back-dashboard" style="width:auto; margin-bottom:1rem;">← Back</button>
          <h1>Business Settings</h1>
          <form id="settings-form">
            <div class="form-group">
                <label class="form-label">Business Name</label>
                <input type="text" name="businessName" class="form-input" value="${settings.businessName}" required />
            </div>
            <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="text" name="phone" class="form-input" value="${settings.phone}" required />
            </div>
            <div class="form-group">
                <label class="form-label">Currency Symbol</label>
                <input type="text" name="currency" class="form-input" value="${settings.currency}" required />
            </div>
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </form>
        </div>
    `;

  document.getElementById('back-dashboard').onclick = () => navigate('dashboard');
  document.getElementById('settings-form').onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    Store.saveSettings({
      businessName: formData.get('businessName'),
      phone: formData.get('phone'),
      currency: formData.get('currency')
    });
    alert('Settings Saved');
    navigate('dashboard');
  };
}


// 5. Estimate Detail
function renderEstimateDetail(id) {
  if (!Store.isLoggedIn()) return navigate('admin-login');
  const estimate = Store.getEstimate(id);
  if (!estimate) return navigate('dashboard'); // basic error handling

  const isApproved = estimate.status === 'approved' || estimate.status === 'sent';

  app.innerHTML = `
    <div class="view-container">
      <button class="btn btn-secondary" id="back-btn" style="width:auto; margin-bottom:1rem;">← Back</button>
      
      <div class="card" style="background:#f0f9ff; border-color:#bae6fd;">
        <h2>Customer Request</h2>
        <p><strong>Name:</strong> ${estimate.customerName}</p>
        <p><strong>Phone:</strong> ${estimate.phone}</p>
        <p><strong>Vehicle:</strong> ${estimate.vehicleModel} (${estimate.vehicleType})</p>
        <p><strong>Service:</strong> ${estimate.serviceType}</p>
        <p><strong>Notes:</strong> ${estimate.notes || 'None'}</p>
      </div>

      <h2>Estimate Details</h2>
      <form id="admin-estimate-form">
        <div class="form-group">
          <label class="form-label">Labor Cost</label>
          <input type="number" id="laborCost" class="form-input" value="${estimate.laborCost}" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">Parts/Materials Cost</label>
          <input type="number" id="partsCost" class="form-input" value="${estimate.partsCost}" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">Discount</label>
          <input type="number" id="discount" class="form-input" value="${estimate.discount}" min="0" step="0.01" />
        </div>
        
        <div class="card" style="margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;">
            <span>Total:</span>
            <span id="total-display">${formatCurrency(0)}</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Mechanic Notes (Visible on Invoice)</label>
          <textarea id="mechanicNotes" class="form-textarea">${estimate.mechanicNotes || ''}</textarea>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <button type="button" id="save-btn" class="btn btn-secondary">Save Draft</button>
          <button type="submit" id="approve-btn" class="btn btn-primary">Approve & Send</button>
        </div>
        <div style="margin-top:10px;">
            ${estimate.status === 'approved' || estimate.status === 'sent' ? `<button type="button" id="view-invoice-btn" class="btn btn-success" style="background-color: var(--color-success); color:white;">📄 View / Print Invoice</button>` : ''}
        </div>
      </form>
    </div>
  `;

  // Logic
  const inputs = ['laborCost', 'partsCost', 'discount'];
  const calculateTotal = () => {
    const l = Number(document.getElementById('laborCost').value) || 0;
    const p = Number(document.getElementById('partsCost').value) || 0;
    const d = Number(document.getElementById('discount').value) || 0;
    const total = Math.max(0, l + p - d);
    document.getElementById('total-display').textContent = formatCurrency(total);
    return total;
  };

  inputs.forEach(id => document.getElementById(id).oninput = calculateTotal);
  calculateTotal(); // init

  document.getElementById('back-btn').onclick = () => navigate('dashboard');

  const saveHandler = (newStatus = 'pending') => {
    const updated = {
      ...estimate,
      laborCost: Number(document.getElementById('laborCost').value),
      partsCost: Number(document.getElementById('partsCost').value),
      discount: Number(document.getElementById('discount').value),
      mechanicNotes: document.getElementById('mechanicNotes').value,
      status: newStatus
    };
    Store.saveEstimate(updated);
    return updated;
  };

  document.getElementById('save-btn').onclick = () => {
    saveHandler('pending');
    alert('Draft saved.');
  };

  document.getElementById('admin-estimate-form').onsubmit = (e) => {
    e.preventDefault();
    if (Number(document.getElementById('laborCost').value) === 0 && Number(document.getElementById('partsCost').value) === 0) {
      if (!confirm("Costs are zero. Are you sure?")) return;
    }
    const updated = saveHandler('approved');
    alert('Estimate Approved!');
    navigate('invoice-view', { id: updated.id });
  };

  const viewInvoice = document.getElementById('view-invoice-btn');
  if (viewInvoice) viewInvoice.onclick = () => navigate('invoice-view', { id: estimate.id });
}

// 6. Invoice View (Printable)
function renderInvoiceView(id) {
  const estimate = Store.getEstimate(id);
  if (!estimate) return navigate('dashboard');
  const settings = Store.getSettings();

  const total = (Number(estimate.laborCost) + Number(estimate.partsCost)) - Number(estimate.discount || 0);

  app.innerHTML = `
    <div class="view-container">
      <div class="no-print" style="margin-bottom:1rem; display:flex; gap:10px;">
        <button class="btn btn-secondary" id="back-dashboard">← Dashboard</button>
        <button class="btn btn-primary" id="print-btn">Print / PDF</button>
        <button class="btn btn-primary" id="whatsapp-btn" style="background:#25D366; border:none;">Share on WhatsApp</button>
      </div>

      <div class="invoice-preview" id="invoice-content">
        <div class="invoice-header">
          <div>
            <h1 style="margin:0; font-size:1.5rem;">INVOICE</h1>
            <p style="margin:5px 0;">#${estimate.id.toUpperCase()}</p>
            <p>${formatDate(Date.now())}</p>
          </div>
          <div style="text-align:right;">
            <h2 style="margin:0;">${settings.businessName}</h2>
            <p>${settings.phone}</p>
          </div>
        </div>

        <div style="margin-bottom:2rem;">
          <strong>Bill To:</strong><br>
          ${estimate.customerName}<br>
          ${estimate.phone}<br>
          <div style="margin-top:5px; padding:5px; background:#f9fafb; display:inline-block; border-radius:4px;">
            ${estimate.vehicleModel} (${estimate.vehicleType})
          </div>
        </div>

        <table class="invoice-items">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${estimate.serviceType} (Labor)</td>
              <td style="text-align:right;">${formatCurrency(estimate.laborCost)}</td>
            </tr>
            <tr>
              <td>Parts / Materials</td>
              <td style="text-align:right;">${formatCurrency(estimate.partsCost)}</td>
            </tr>
            ${estimate.discount > 0 ? `
            <tr style="color:var(--color-danger);">
              <td>Discount</td>
              <td style="text-align:right;">-${formatCurrency(estimate.discount)}</td>
            </tr>` : ''}
          </tbody>
        </table>

        <div class="invoice-total">
          Total: ${formatCurrency(total)}
        </div>

        ${estimate.mechanicNotes ? `
        <div style="margin-top:2rem; padding:1rem; border-left:4px solid #eee;">
          <strong>Mechanic Notes:</strong><br>
          ${estimate.mechanicNotes}
        </div>
        ` : ''}

        <div style="margin-top:3rem; text-align:center; font-size:0.8rem; color:#999;">
          Thank you for your business!
        </div>
      </div>
    </div>
  `;

  document.getElementById('back-dashboard').onclick = () => navigate('dashboard');
  document.getElementById('print-btn').onclick = () => window.print();

  // WhatsApp Share Logic
  document.getElementById('whatsapp-btn').onclick = () => {
    // Mark as sent
    if (estimate.status !== 'sent') {
      estimate.status = 'sent';
      Store.saveEstimate(estimate);
    }

    const text = `Hello ${estimate.customerName}, here is your estimate for the ${estimate.serviceType} on your ${estimate.vehicleModel}. Total: ${formatCurrency(total)}. Reference: ${estimate.id}`;
    const url = `https://wa.me/${estimate.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };
}

// Init
// If URL has hash, maybe use it? But for now clean start.
// Simple "logged in" check to decide home? No, home is always public form.
navigate('customer-form'); // Default entry
