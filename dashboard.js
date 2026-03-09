document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            let currentTheme = htmlElement.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                htmlElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            } else {
                htmlElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            }
        });
    }

    // Mobile Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openSidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('overlay');

    if (openBtn && closeBtn && sidebar && overlay) {
        openBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        });

        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }

    // QR Scanner Logic
    const qrModal = document.getElementById('qrModal');
    const openQrScannerBtn = document.getElementById('openQrScanner');
    const closeQrModalBtn = document.getElementById('closeQrModal');
    let html5QrcodeScanner;

    if (qrModal && openQrScannerBtn && closeQrModalBtn) {
        const closeScanner = () => {
            qrModal.classList.remove('show');
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().catch(error => {
                    console.error("Failed to clear scanner. ", error);
                });
            }
            const resultDiv = document.getElementById('qrResult');
            if (resultDiv) {
                resultDiv.style.display = 'none';
                resultDiv.innerText = '';
            }
        };

        openQrScannerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            qrModal.classList.add('show');

            // Initialize scanner
            html5QrcodeScanner = new Html5QrcodeScanner(
                "reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);

            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        });

        closeQrModalBtn.addEventListener('click', closeScanner);

        // Close if click outside modal content
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) {
                closeScanner();
            }
        });

        function onScanSuccess(decodedText, decodedResult) {
            console.log(`Code matched = ${decodedText}`, decodedResult);
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear();
            }
            const resultDiv = document.getElementById('qrResult');
            if (resultDiv) {
                resultDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Attendance Marked Successfully! <br> <small class="text-muted">Code: ${decodedText}</small>`;
                resultDiv.style.display = 'block';
            }
            setTimeout(closeScanner, 3000);
        }

        function onScanFailure(error) {
            console.warn(`Code scan error = ${error}`);
        }
    }
});
