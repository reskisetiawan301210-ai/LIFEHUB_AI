// js/features/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil semua link menu di sidebar dan semua halaman konten
    const sidebarLinks = document.querySelectorAll('.sidebar li, .sidebar a');
    const contentSections = document.querySelectorAll('.content-section, .dashboard-panel'); 
    
    // Fungsi untuk pindah halaman
    function switchPage(targetId) {
        // Sembunyikan semua halaman konten
        contentSections.forEach(section => {
            section.style.display = 'none'; // Sembunyikan
            section.classList.remove('active');
        });

        // Hilangkan efek menyala (active) dari semua menu sidebar
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Tampilkan halaman yang dituju
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.style.display = 'block'; // Tampilkan
            targetSection.classList.add('active');
        }

        // Bikin menu yang diklik jadi menyala (active)
        const activeLink = document.querySelector(`[data-target="${targetId}"], [href="#${targetId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // 2. Pasang pendeteksi klik (event listener) di setiap menu sidebar
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Cek apakah menu ini punya target tujuan (data-target atau href)
            const targetId = link.getAttribute('data-target') || 
                             (link.getAttribute('href') ? link.getAttribute('href').substring(1) : null);
            
            if (targetId) {
                e.preventDefault(); // Mencegah browser refresh
                switchPage(targetId);
            }
        });
    });
});