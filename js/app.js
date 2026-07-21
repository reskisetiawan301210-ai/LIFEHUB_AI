// js/app.js

// 1. Import semua modul fitur yang ada di folder features
import * as dashboard from './features/dashboard.js';
import * as finance from './features/finance.js';
import * as preferences from './features/preferences.js';
import * as productivity from './features/productivity.js';
import * as tools from './features/tools.js'; // <-- Smart QR Studio
import * as ai from './features/ai.js';
import * as downloader from './features/downloader.js'; // <-- Multi-Media Downloader
import * as focus from './features/focus.js';           // <-- Focus Space

// Import Firebase Auth untuk mendeteksi Akun Google pengguna
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. Satukan semua modul ke dalam sistem registrasi aplikasi
const registeredFeatures = {
    dashboard,
    finance,
    preferences,
    productivity,
    tools,
    ai,
    downloader,
    focus
};

// State global sederhana untuk menyimpan data aplikasi jika dibutuhkan
const store = {
    user: null,
    theme: 'dark'
};

// 3. Fungsi utama untuk memindahkan halaman secara visual (DOM Switching)
function navigateToHub(hubId) {
    console.info(`[Router] Berpindah ke menu: ${hubId}`);

    // A. Sembunyikan panel dashboard utama dan semua section kontainer lainnya
    const mainDashboardPanel = document.querySelector('.grid.grid-cols-1'); 
    const sections = document.querySelectorAll('main section, .content-section, .dashboard-panel');
    
    if (mainDashboardPanel) {
        // Jika pindah ke 'dashboard', tampilkan dashboard utama. Jika ke menu lain, sembunyikan!
        mainDashboardPanel.style.display = hubId === 'dashboard' ? 'grid' : 'none';
    }

    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    // B. Tampilkan section target berdasarkan ID-nya (misal: id="ai", id="tools", dll)
    let targetSection = document.getElementById(hubId) || 
                        document.getElementById(`${hubId}-section`) || 
                        document.getElementById(`${hubId}-panel`);
                        
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
    }

    // C. Atur efek menyala (active) pada menu sidebar sebelah kiri
    const sidebarLinks = document.querySelectorAll('.sidebar li, .sidebar a');
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const parentLi = link.closest('li');
        if (parentLi) parentLi.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-target="${hubId}"]`) || 
                       document.querySelector(`[href="#${hubId}"]`) ||
                       document.querySelector(`[href="/dashboard#${hubId}"]`) ||
                       document.querySelector(`[href="${hubId}.html"]`);
                       
    if (activeLink) {
        activeLink.classList.add('active');
        const parentLi = activeLink.closest('li');
        if (parentLi) parentLi.classList.add('active');
    }
}

// 4. Inisialisasi Aplikasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    console.info('[App] Pusat kendali LifeHub AI aktif.');

    // --- SYNC NAMA & AVATAR DARI GOOGLE AUTH ---
    try {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
            if (user && user.displayName) {
                store.user = user;
                const userName = user.displayName;
                
                // Simpan ke LocalStorage agar dibaca oleh semua halaman HTML
                localStorage.setItem('lifehub_user_name', userName);

                // Update teks sapaan di layar jika ada
                const greetingEl = document.getElementById('user-greeting-name');
                if (greetingEl) greetingEl.textContent = userName;

                // Update inisial avatar
                const avatars = document.querySelectorAll('#user-avatar, #user-avatar-top');
                avatars.forEach(av => {
                    av.textContent = userName.charAt(0).toUpperCase();
                });
                
                console.info(`[Auth] User Google aktif: ${userName}`);
            }
        });
    } catch (e) {
        console.warn('[Auth] Menunggu inisialisasi Firebase Auth...');
    }

    // Jalankan fungsi init() untuk setiap modul yang terdaftar
    for (const [name, module] of Object.entries(registeredFeatures)) {
        if (module && typeof module.init === 'function') {
            try {
                await module.init({ store });
                console.info(`[App] Modul "${name}" berhasil diaktifkan.`);
            } catch (err) {
                console.error(`[App] Gagal memuat modul "${name}":`, err);
            }
        }
    }

    // Pasang detektor klik pada menu-menu di sidebar & dock
    const sidebarLinks = document.querySelectorAll('.sidebar li, .sidebar a, nav a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href') || '';
            const dataTarget = link.getAttribute('data-target');
            
            let hubId = dataTarget;
            if (!hubId && href.includes('#')) {
                hubId = href.split('#')[1];
            }

            // Jika tautan bersifat internal SPA (# target)
            if (hubId && !href.endsWith('.html')) {
                e.preventDefault();
                window.location.hash = hubId;
                navigateToHub(hubId);
            }
        });
    });

    // Deteksi jika user langsung menyalin URL dengan hash (misal: /dashboard#tools)
    window.addEventListener('hashchange', () => {
        const currentHash = window.location.hash.substring(1);
        if (currentHash && registeredFeatures[currentHash]) {
            navigateToHub(currentHash);
        }
    });

    // Jalankan routing pertama kali berdasarkan hash URL saat ini
    const initialHash = window.location.hash.substring(1) || 'dashboard';
    navigateToHub(initialHash);
});