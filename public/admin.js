// Admin Configuration
const config = {
    // TODO: Replace with actual Google Apps Script Web App URL
    gasEndpoint: 'https://script.google.com/macros/s/AKfycbyPLACEHOLDER/exec',
    tokenKey: 'osis_admin_token'
};

// Admin State
const state = {
    token: sessionStorage.getItem(config.tokenKey),
    chartInstance: null
};

// Admin UI Controller
const admin = {
    init: function() {
        if (state.token) {
            this.showPage('dashboard');
            this.fetchDashboard();
        } else {
            this.showPage('login');
        }
    },

    login: async function(e) {
        e.preventDefault();
        
        const password = document.getElementById('password').value;
        if (!password) return;

        const btn = document.getElementById('btn-login');
        const errorMsg = document.getElementById('login-error');
        
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Memverifikasi...';
        errorMsg.classList.add('hidden');

        try {
            if (config.gasEndpoint.includes('PLACEHOLDER')) {
                // Mock login for placeholder
                await new Promise(r => setTimeout(r, 1000));
                if (password === 'pemilos2026') {
                    state.token = 'mock-token-123';
                    sessionStorage.setItem(config.tokenKey, state.token);
                    this.showPage('dashboard');
                    this.fetchDashboard();
                    return;
                } else {
                    throw new Error('Password salah');
                }
            }

            const payload = {
                action: 'login',
                password: password
            };

            const response = await fetch(config.gasEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.status === 'success' && data.token) {
                state.token = data.token;
                sessionStorage.setItem(config.tokenKey, state.token);
                this.showPage('dashboard');
                this.fetchDashboard();
            } else {
                throw new Error(data.message || 'Login gagal');
            }
        } catch (err) {
            console.error('Login error:', err);
            errorMsg.textContent = err.message || 'Terjadi kesalahan.';
            errorMsg.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Masuk Dashboard</span><span class="material-symbols-outlined">arrow_forward</span>';
        }
    },

    logout: function() {
        state.token = null;
        sessionStorage.removeItem(config.tokenKey);
        document.getElementById('password').value = '';
        this.showPage('login');
    },

    fetchDashboard: async function() {
        if (!state.token) return;
        
        this.showLoading('Mengambil data terbaru...');

        try {
            if (config.gasEndpoint.includes('PLACEHOLDER')) {
                // Mock dashboard data
                await new Promise(r => setTimeout(r, 800));
                this.updateDashboardUI({
                    totalVotes: 875,
                    isOpen: true,
                    candidates: ["Budi & Siti", "Ahmad & Rina", "Dewi & Joko"],
                    votes: [450, 300, 125]
                });
                this.hideLoading();
                return;
            }

            const url = `${config.gasEndpoint}?action=results&token=${state.token}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'error') {
                if (data.message.includes('Token')) {
                    this.logout();
                }
                throw new Error(data.message);
            }

            this.updateDashboardUI(data);

        } catch (err) {
            console.error('Dashboard error:', err);
            alert('Gagal mengambil data: ' + err.message);
        } finally {
            this.hideLoading();
        }
    },

    updateDashboardUI: function(data) {
        document.getElementById('stat-total').textContent = data.totalVotes || 0;
        
        const now = new Date();
        document.getElementById('last-update').textContent = now.toLocaleTimeString('id-ID');

        // Update Toggle Status
        const toggle = document.getElementById('voting-toggle');
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');

        toggle.checked = data.isOpen;
        this.renderToggleUI(data.isOpen);

        // Update Chart
        const ctx = document.getElementById('resultsChart').getContext('2d');
        
        if (state.chartInstance) {
            state.chartInstance.data.labels = data.candidates;
            state.chartInstance.data.datasets[0].data = data.votes;
            state.chartInstance.update();
        } else {
            state.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.candidates || [],
                    datasets: [{
                        label: 'Perolehan Suara',
                        data: data.votes || [],
                        backgroundColor: [
                            'rgba(0, 61, 155, 0.8)', // Primary
                            'rgba(86, 95, 106, 0.8)', // Secondary
                            'rgba(123, 38, 0, 0.8)'   // Tertiary
                        ],
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 }
                        }
                    }
                }
            });
        }
    },

    toggleStatus: async function(isOpen) {
        if (!state.token) return;
        
        this.renderToggleUI(isOpen);
        
        try {
            if (config.gasEndpoint.includes('PLACEHOLDER')) {
                // Mock toggle
                await new Promise(r => setTimeout(r, 500));
                return;
            }

            const payload = {
                action: 'toggle_status',
                token: state.token,
                isOpen: isOpen
            };

            const response = await fetch(config.gasEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            if (data.status !== 'success') {
                throw new Error(data.message);
            }
        } catch (err) {
            console.error('Toggle error:', err);
            alert('Gagal mengubah status. Mengembalikan ke status awal.');
            // Revert UI
            document.getElementById('voting-toggle').checked = !isOpen;
            this.renderToggleUI(!isOpen);
        }
    },

    renderToggleUI: function(isOpen) {
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');
        
        if (isOpen) {
            statusText.textContent = 'Status: TERBUKA';
            statusText.classList.remove('text-secondary');
            statusText.classList.add('text-on-surface');
            statusIcon.textContent = 'how_to_vote';
            statusIcon.classList.remove('text-secondary');
            statusIcon.classList.add('text-primary');
        } else {
            statusText.textContent = 'Status: TERTUTUP';
            statusText.classList.remove('text-on-surface');
            statusText.classList.add('text-secondary');
            statusIcon.textContent = 'lock';
            statusIcon.classList.remove('text-primary');
            statusIcon.classList.add('text-secondary');
        }
    },

    showPage: function(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + pageId).classList.remove('hidden');
        
        if (pageId === 'dashboard') {
            document.getElementById('btn-logout').classList.remove('hidden');
        } else {
            document.getElementById('btn-logout').classList.add('hidden');
        }
    },

    showLoading: function(msg = 'Memuat...') {
        document.getElementById('loading-message').textContent = msg;
        document.getElementById('loading-overlay').classList.remove('hidden');
    },

    hideLoading: function() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    admin.init();
});
