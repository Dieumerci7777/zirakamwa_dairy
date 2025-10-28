
let farmers = JSON.parse(localStorage.getItem('farmers')) || [];
let milkDeliveries = JSON.parse(localStorage.getItem('milkDeliveries')) || [];
let farmerDebits = JSON.parse(localStorage.getItem('farmerDebits')) || [];
let farmerPayments = JSON.parse(localStorage.getItem('farmerPayments')) || []; 
let settings = JSON.parse(localStorage.getItem('settings')) || { pricePerLitre: 300 };
let companyProfile = JSON.parse(localStorage.getItem('companyProfile')) || {
    name: 'My Dairy Business',
    address: '123 Milk Lane, Farmtown',
    phone: '555-MILK-NOW',
    email: 'contact@mydairy.com'
};
let currentReport = { text: '', email: '', subject: '' };

// --- GLOBAL CHART INSTANCES ---
let milkChartInstance = null;
let debitChartInstance = null;

// --- INITIALIZATION & DATA PERSISTENCE ---
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication - FIXED VERSION
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isLoginPage = currentPage === 'login.html';
    
    console.log('Current page:', currentPage);
    console.log('Is login page:', isLoginPage);
    console.log('Authentication status:', localStorage.getItem('isAuthenticated'));
    
    // If not authenticated AND not on login page, redirect to login
    if (localStorage.getItem('isAuthenticated') !== 'true' && !isLoginPage) {
        console.log('Not authenticated, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }
    
    // If authenticated AND on login page, redirect to dashboard
    if (localStorage.getItem('isAuthenticated') === 'true' && isLoginPage) {
        console.log('Already authenticated, redirecting to dashboard...');
        window.location.href = 'index.html';
        return;
    }
    
    // Don't initialize app logic on login page
    if (isLoginPage) {
        console.log('On login page, skipping app initialization');
        return;
    }
    
    console.log('Initializing application...');
    
    // Add sample data if empty
    if (farmers.length === 0) {
        farmers = [
            { id: 1, name: 'John Musole', email: 'john.musole@example.com', phone: '078-010-1010' },
            { id: 2, name: 'Aline Zawadi', email: 'aline.zawadi@example.com', phone: '078-010-2020' }
        ];
        milkDeliveries = [
            { id: 1, farmerId: 1, litresMorning: 25, litresNight: 25, date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0] },
            { id: 2, farmerId: 2, litresMorning: 40, litresNight: 35, date: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0] },
            { id: 3, farmerId: 1, litresMorning: 30, litresNight: 25, date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0] },
            { id: 4, farmerId: 2, litresMorning: 50, litresNight: 50, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] },
            { id: 5, farmerId: 1, litresMorning: 20, litresNight: 20, date: new Date().toISOString().split('T')[0] }
        ];
        farmerDebits = [
            { id: 1, farmerId: 1, type: 'supply', description: 'Salt for cows', amount: 25000, date: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0] },
            { id: 2, farmerId: 2, type: 'loan', description: 'Cash advance', amount: 100000, date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 10).toISOString().split('T')[0] }
        ];
        farmerPayments = [
            { id: 1, farmerId: 1, type: 'payment', description: 'Partial month settlement', amount: 15000, date: new Date(new Date().getFullYear(), new Date().getMonth(), 20).toISOString().split('T')[0] }
        ];
        saveAllData();
    }
    
    // Initialize page-specific functionality
    initializePage();
});

function saveAllData() {
    localStorage.setItem('farmers', JSON.stringify(farmers));
    localStorage.setItem('milkDeliveries', JSON.stringify(milkDeliveries));
    localStorage.setItem('farmerDebits', JSON.stringify(farmerDebits));
    localStorage.setItem('farmerPayments', JSON.stringify(farmerPayments));
    localStorage.setItem('settings', JSON.stringify(settings));
    localStorage.setItem('companyProfile', JSON.stringify(companyProfile));
}

// --- UTILITIES ---
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function formatCurrency(amount) {
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    return `${sign}${new Intl.NumberFormat('en-US').format(absAmount)} Rwf`;
}

function formatLitres(litres) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(litres);
}

function calculateFarmerBalance(farmerId) {
    const totalCredit = milkDeliveries
        .filter(d => d.farmerId === farmerId)
        .reduce((sum, d) => sum + ((d.litresMorning || 0) + (d.litresNight || 0)) * settings.pricePerLitre, 0);

    const totalDebit = farmerDebits
        .filter(d => d.farmerId === farmerId)
        .reduce((sum, d) => sum + d.amount, 0);
        
    const totalPayments = farmerPayments
        .filter(p => p.farmerId === farmerId)
        .reduce((sum, p) => sum + p.amount, 0);

    return totalCredit - totalDebit - totalPayments;
}

function populateFarmerDropdowns() {
    const dropdowns = document.querySelectorAll('#delivery-farmer, #debit-farmer, #report-farmer, #payment-farmer');
    dropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = '<option value="">-- Select a Farmer --</option>';
            farmers.forEach(f => {
                dropdown.innerHTML += `<option value="${f.id}">${f.name}</option>`;
            });
        }
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-transform duration-300 translate-x-full ${type === 'success' ? 'bg-green-500' : 'bg-blue-500'} text-white`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all authentication data
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');
        localStorage.removeItem('userEmail');
        
        // Redirect to login page
        window.location.href = 'login.html';
    }
}

// --- PAGE INITIALIZATION ---
function initializePage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Common initialization for all pages
    setCurrentDateFields();
    
    // Page-specific initialization
    switch(currentPage) {
        case 'index.html':
        case '':
            initDashboard();
            break;
        case 'farmers.html':
            initFarmers();
            break;
        case 'delivery.html':
            initDelivery();
            break;
        case 'debit.html':
            initDebit();
            break;
        case 'payment.html':
            initPayment();
            break;
        case 'analytics.html':
            initAnalytics();
            break;
        case 'transactions.html':
            initTransactions();
            break;
        case 'reports.html':
            initReports();
            break;
        case 'profile.html':
            initProfile();
            break;
    }
}

function setCurrentDateFields() {
    const today = new Date().toISOString().split('T')[0];
    const dateFields = ['delivery-date', 'debit-date', 'payment-date', 'report-end-date'];
    
    dateFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = today;
        }
    });
    
    const reportStartDate = document.getElementById('report-start-date');
    if (reportStartDate) {
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        reportStartDate.value = firstDayOfMonth;
    }
}