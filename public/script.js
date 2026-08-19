// App Configuration
const config = {
    // TODO: Replace with actual Google Apps Script Web App URL
    gasEndpoint: 'https://script.google.com/macros/s/AKfycby6jBIm0SIWgGZJv8TP6FY3BIkvowf0eLMb0jRXrmfGJYL-u2qcM5T7bn9yxuNzt40JIQ/exec',
    sessionKey: 'osis_vote_session',
    maxRetries: 3
};

// Application State
const state = {
    isOpen: false,
    candidates: [],
    selectedCandidateId: null
};

// UI Controller
const app = {
    getPlaceholder: function(id) {
        return `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Crect width='100%25' height='100%25' fill='%23ededf8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24px' font-weight='bold' fill='%23737685'%3EFOTO PASLON 0${id}%3C/text%3E%3C/svg%3E`;
    },

    getPhotoUrl: function(url, id) {
        if (!url || typeof url !== 'string' || !url.trim()) {
            return this.getPlaceholder(id);
        }
        url = url.trim();
        // Convert Google Drive share link to direct image link
        const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        }
        return url;
    },

    showErrorModal: function(title, message) {
        const titleEl = document.getElementById('modal-error-title');
        const descEl = document.getElementById('modal-error-desc');
        const modal = document.getElementById('error-modal');
        if (titleEl) titleEl.textContent = title || 'Kendala Pengiriman Suara';
        if (descEl) descEl.textContent = message || 'Terjadi kesalahan sistem saat memproses data.';
        if (modal) modal.classList.remove('hidden');
    },

    closeErrorModal: function() {
        const modal = document.getElementById('error-modal');
        if (modal) modal.classList.add('hidden');
    },

    init: async function() {
        this.showLoading('Menghubungkan ke server...');
        
        // 1. Check if already voted on this device
        if (localStorage.getItem(config.sessionKey)) {
            this.hideLoading();
            this.showPage('success');
            return;
        }

        // 2. Fetch status from GAS
        try {
            await this.fetchStatus();
        } catch (error) {
            console.error('Error fetching status:', error);
            document.getElementById('voting-status-text').textContent = 'Gagal memuat status.';
            document.getElementById('voting-status-text').classList.add('text-error');
            app.showErrorModal('Koneksi Terputus', 'Gagal memuat status pemilihan dari server. Pastikan perangkat terhubung ke Wi-Fi / internet dan laporkan ke panitia.');
        }
        
        this.hideLoading();

        // Initialize Searchable Dropdown for Kelas
        const kelasSelect = document.getElementById('kelas');
        if (kelasSelect && !kelasSelect.choices) {
            kelasSelect.choices = new Choices(kelasSelect, {
                searchEnabled: true,
                shouldSort: false,
                itemSelectText: '',
                placeholderValue: 'Pilih Kelas',
                searchPlaceholderValue: 'Cari kelas...'
            });
        }

        const statusSelect = document.getElementById('status_pemilih');
        if (statusSelect) {
            statusSelect.addEventListener('change', function(e) {
                if (e.target.value === 'Guru/Staf') {
                    kelasSelect.removeAttribute('required');
                } else {
                    kelasSelect.setAttribute('required', 'required');
                }
            });
        }
    },

    fetchStatus: async function() {
        const url = `${config.gasEndpoint}?action=status`;
        // In real app, remove the comment. Using a mock response for now if endpoint is placeholder
        if (config.gasEndpoint.includes('PLACEHOLDER')) {
            console.warn("Using mock data because GAS endpoint is a placeholder.");
            state.isOpen = true;
            state.candidates = [
                {
                    id: 1, 
                    ketua: "Moh. RizkiRiani Alvauzi (XI TSM 1)", 
                    wakil: "Rakhsanda Naia Prakasya (X DPIB 3)", 
                    visi: "Mewujudkan OSIS sebagai wadah yang dekat, terbuka, dan mampu menjadi tempat bagi seluruh siswa untuk menyampaikan aspirasi, mengembangkan potensi, serta menciptakan lingkungan sekolah yang nyaman, menyenangkan, dan penuh kebersamaan. Bersama-sama tumbuh, berprestasi, dan membangun suasana sekolah yang positif.", 
                    misi: "<ol class='list-decimal pl-5 space-y-2'><li>Mendengarkan dan menampung aspirasi siswa berupa ide, saran, maupun keluhan serta berupaya menindaklanjutinya dengan baik dan bertanggung jawab.</li><li>Menyelenggarakan berbagai kegiatan yang kreatif dan positif dalam bidang seni, olahraga, akademik, maupun kegiatan lainnya agar setiap siswa memiliki kesempatan untuk mengembangkan minat dan bakatnya.</li><li>Meningkatkan kerukunan dan kebersamaan antarsiswa serta antarkelas, dengan menciptakan lingkungan sekolah yang saling menghargai, peduli, dan bebas dari sikap diskriminasi maupun pengucilan.</li><li>Menjaga kedisiplinan dan nama baik sekolah dengan mengedepankan sikap santun, bertanggung jawab, dan memberikan contoh yang baik tanpa menciptakan tekanan bagi siswa.</li></ol>",
                    foto: ""
                },
                {
                    id: 2, 
                    ketua: "Muchammad Syahrul Aflah A.H (XI TPM 4)", 
                    wakil: "Vania Selma Nadira (X TITL 2)", 
                    visi: "Mewujudkan siswa SMK Islam yang berakhlak mulia, disiplin, bertanggung jawab, saling menghargai dan menghormati, serta mampu menciptakan lingkungan sekolah yang nyaman, dan harmonis.", 
                    misi: "<ol class='list-decimal pl-5 space-y-2'><li>Membiasakan sikap disiplin dan bertanggung jawab dalam belajar, berorganisasi, serta menaati peraturan sekolah.</li><li>Membangun budaya saling menghargai dan menghormati, terutama kepada guru, orang yang lebih tua, dan sesama teman.</li><li>Meningkatkan rasa persaudaraan dan kepedulian antarsiswa tanpa membeda-bedakan latar belakang.</li><li>Menjadikan OSIS sebagai wadah aspirasi siswa, sehingga setiap siswa dapat menyampaikan pendapat dan ikut berkontribusi dalam kemajuan sekolah.</li><li>Menciptakan lingkungan sekolah yang aman, nyaman, tertib, dan bebas dari perundungan (bullying).</li></ol>",
                    foto: ""
                }
            ];
            this.renderLanding();
            return;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        state.isOpen = data.isOpen;
        state.candidates = data.kandidat || [];
        
        this.renderLanding();
    },

    renderLanding: function() {
        const statusCard = document.getElementById('status-card');
        const statusText = document.getElementById('voting-status-text');
        const btnStart = document.getElementById('btn-start-voting');

        statusCard.classList.remove('hidden');

        if (state.isOpen) {
            statusText.textContent = 'TERBUKA';
            statusText.classList.add('text-green-600');
            btnStart.classList.remove('hidden');
        } else {
            statusText.textContent = 'DITUTUP';
            statusText.classList.add('text-error');
            btnStart.classList.add('hidden');
        }
        
        this.showPage('landing');
    },

    startVotingFlow: function() {
        if (!state.isOpen) {
            this.showPage('closed');
            return;
        }
        
        this.renderCandidates();
        this.showPage('candidates');
    },

    renderCandidates: function() {
        const container = document.getElementById('candidates-container');
        container.innerHTML = '';

        state.candidates.forEach(cand => {
            const card = document.createElement('div');
            card.className = 'bg-surface-container-lowest rounded-2xl p-0 shadow-sm border border-outline-variant hover:border-primary hover:shadow-md transition-all duration-300 group relative flex flex-col md:flex-row';
            const photoSrc = app.getPhotoUrl(cand.foto, cand.id);
            card.innerHTML = `
                <div class="absolute top-0 right-0 bg-primary text-on-primary text-base font-black px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl shadow-sm z-10">
                    PASLON 0${cand.id}
                </div>
                <div class="w-full md:w-48 h-64 md:h-auto shrink-0 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden bg-surface-container-low relative">
                    <img src="${photoSrc}" alt="Foto Paslon ${cand.id}" class="w-full h-full object-cover object-top" onerror="this.src=app.getPlaceholder(${cand.id})">
                </div>
                <div class="flex-1 flex flex-col justify-center p-6 mt-2 md:mt-0">
                    <div class="mb-4">
                        <span class="inline-block text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full mb-3 uppercase tracking-wider">Kandidat No. 0${cand.id}</span>
                        <h3 class="text-xl font-bold text-on-surface mb-1.5">Ketua: <span class="font-extrabold text-primary">${cand.ketua}</span></h3>
                        <h3 class="text-xl font-bold text-on-surface-variant">Wakil: <span class="font-extrabold text-on-surface">${cand.wakil}</span></h3>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-3 mt-auto pt-4 border-t border-outline-variant/60">
                        <button onclick="app.showVision(${cand.id})" class="text-primary hover:bg-primary/5 text-sm font-bold flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-primary/40 hover:border-primary transition-colors w-full sm:w-auto">
                            <span class="material-symbols-outlined text-[18px]">visibility</span>
                            Lihat Visi & Misi
                        </button>
                        <button onclick="app.selectCandidate(${cand.id})" class="bg-primary hover:bg-on-primary-fixed-variant text-on-primary text-sm font-bold px-6 py-3 rounded-xl shadow-md w-full sm:w-auto flex items-center justify-center gap-2 transition-all">
                            <span class="material-symbols-outlined">how_to_vote</span>
                            Pilih Paslon Ini
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    showVision: function(id) {
        const cand = state.candidates.find(c => c.id === id);
        if (!cand) return;

        document.getElementById('detail-no').textContent = `0${cand.id}`;
        document.getElementById('detail-names').textContent = `${cand.ketua} & ${cand.wakil}`;
        document.getElementById('detail-vision').innerHTML = cand.visi;
        
        // Auto-format misi text into HTML list if it contains numbered points (e.g., "1. ", "2. ")
        let formattedMisi = cand.misi;
        if (formattedMisi && !formattedMisi.includes('<') && formattedMisi.match(/\d+\./)) {
            const parts = formattedMisi.split(/(?:\d+\.)\s*/).filter(p => p.trim().length > 0);
            if (parts.length > 0) {
                formattedMisi = `<ol class='list-decimal pl-5 space-y-2'>` + parts.map(p => `<li>${p.trim()}</li>`).join('') + `</ol>`;
            }
        }
        document.getElementById('detail-mission').innerHTML = formattedMisi;
        
        document.getElementById('detail-foto').src = app.getPhotoUrl(cand.foto, cand.id);
        
        state.selectedCandidateId = id;
        this.showPage('vision');
    },

    selectCandidate: function(id) {
        state.selectedCandidateId = id;
        this.goToConfirm();
    },

    goToConfirm: function() {
        const cand = state.candidates.find(c => c.id === state.selectedCandidateId);
        if (!cand) return;

        document.getElementById('confirm-no').textContent = `0${cand.id}`;
        document.getElementById('confirm-names').textContent = `${cand.ketua} & ${cand.wakil}`;
        document.getElementById('error-message').classList.add('hidden');
        document.getElementById('vote-form').reset();
        
        this.showPage('confirm');
    },

    submitVote: async function(e) {
        e.preventDefault();
        
        const nama = document.getElementById('nama').value.trim();
        let kelas = document.getElementById('kelas').value;
        const statusPemilih = document.getElementById('status_pemilih').value;
        const agreement = document.getElementById('agreement').checked;

        if (!nama || !statusPemilih || !agreement) return;

        if (statusPemilih === 'Siswa' && !kelas) {
            app.showErrorModal('Data Tidak Lengkap', 'Silakan pilih kelas Anda.');
            return;
        }

        if (statusPemilih === 'Guru/Staf') {
            kelas = '-';
        }

        const payload = {
            action: 'vote',
            nama: nama,
            kelas: kelas,
            status: statusPemilih,
            paslonId: state.selectedCandidateId,
            sessionId: navigator.userAgent + '-' + new Date().getTime() // simple session identifier
        };

        const btn = document.getElementById('btn-submit');
        const errorMsg = document.getElementById('error-message');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Mengirim...';
        errorMsg.classList.add('hidden');

        // Retry Logic Implementation
        let attempt = 0;
        let success = false;
        let responseData = null;

        while (attempt < config.maxRetries && !success) {
            attempt++;
            try {
                if (config.gasEndpoint.includes('PLACEHOLDER')) {
                    // Mock success for placeholder
                    await new Promise(r => setTimeout(r, 1000));
                    success = true;
                    responseData = { status: 'success' };
                    break;
                }

                const response = await fetch(config.gasEndpoint, {
                    method: 'POST',
                    // Using text/plain to avoid CORS preflight issues with GAS
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                
                responseData = await response.json();
                
                if (responseData.status === 'success') {
                    success = true;
                } else {
                    // Logic error from backend, DO NOT RETRY!
                    const msg = responseData.message || 'Gagal mengirim suara.';
                    errorMsg.textContent = msg;
                    errorMsg.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerHTML = 'Kirim Suara <span class="material-symbols-outlined">send</span>';
                    app.showErrorModal('Gagal Mengirim Suara', msg);
                    return; // exit function immediately without retrying
                }
            } catch (err) {
                console.error(`Attempt ${attempt} failed:`, err);
                if (attempt >= config.maxRetries) {
                    const netMsg = 'Terjadi gangguan jaringan / server sibuk. Silakan coba kembali atau panggil panitia TPS.';
                    errorMsg.textContent = netMsg;
                    errorMsg.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerHTML = 'Coba Lagi <span class="material-symbols-outlined">refresh</span>';
                    app.showErrorModal('Gangguan Koneksi Jaringan', netMsg);
                    return; // exit function
                }
                // Wait before retry
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }

        if (success) {
            // Reset button state for the next user
            btn.disabled = false;
            btn.innerHTML = 'Kirim Suara <span class="material-symbols-outlined">send</span>';
            
            // Save to local storage to prevent double voting on this device
            localStorage.setItem(config.sessionKey, 'voted');
            this.showPage('success');
            this.startSuccessCountdown();
        }
    },

    startSuccessCountdown: function() {
        let seconds = 5;
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) countdownEl.textContent = seconds;
        
        const interval = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(interval);
                
                // Clear the session so the next student can vote on this shared device
                localStorage.removeItem(config.sessionKey);
                
                // Reset form and state
                document.getElementById('vote-form').reset();
                state.selectedCandidateId = null;
                
                // Go back to start FIRST
                app.init();
                
                // Safely reset Choices.js visually without throwing errors
                try {
                    const kelasSelect = document.getElementById('kelas');
                    if (kelasSelect && kelasSelect.choices) {
                        // removeActiveItems removes the current selection and brings back placeholder
                        kelasSelect.choices.removeActiveItems();
                    }
                } catch(e) {
                    console.error("Error resetting choices:", e);
                }
            }
        }, 1000);
    },

    showPage: function(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + pageId).classList.remove('hidden');
        window.scrollTo(0,0);
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
    app.init();
});
