document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    const htmlElement = document.documentElement;

    // Check saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

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

    // Role Selection
    const roleBtns = document.querySelectorAll('.role-btn');
    const signupWrapper = document.getElementById('signupWrapper');
    let selectedRole = 'player'; // default

    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            roleBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            selectedRole = btn.getAttribute('data-role');

            if(selectedRole === 'admin') {
                signupWrapper.style.display = 'none';
            } else {
                signupWrapper.style.display = 'block';
            }
        });
    });

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    // Sign Up Flow Handling
    const showSignupLink = document.getElementById('showSignupLink');
    const signupForm = document.getElementById('signupForm');
    const backToLoginLink = document.getElementById('backToLoginLink');
    const signupBatchSelect = document.getElementById('signupBatch');
    const signupError = document.getElementById('signupError');
    const signupSuccess = document.getElementById('signupSuccess');

    function populateSignupBatches() {
        if (!signupBatchSelect) return;
        const batches = Database.getBatches() || [];
        signupBatchSelect.innerHTML = '<option value="">Select Batch...</option>';
        batches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = `${b.name} (${b.time})`;
            signupBatchSelect.appendChild(opt);
        });
    }

    if(showSignupLink && signupForm && loginForm) {
        const roleSelection = document.querySelector('.role-selection');

        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            if (roleSelection) roleSelection.style.display = 'none';
            populateSignupBatches();
        });

        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
            if (roleSelection) roleSelection.style.display = 'flex';
            signupError.classList.remove('show');
            signupSuccess.style.display = 'none';
        });
        
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            signupError.classList.remove('show');
            signupSuccess.style.display = 'none';

            const name = document.getElementById('signupName').value.trim();
            const fatherName = document.getElementById('signupFatherName').value.trim();
            const mobile = document.getElementById('signupMobile').value.trim();
            const dob = document.getElementById('signupDob').value;
            const gender = document.getElementById('signupGender').value;
            const plan = document.getElementById('signupPlan').value.trim();
            const batch = signupBatchSelect.value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            const pdfFile = document.getElementById('signupPdf').files[0];

            if (password !== confirmPassword) {
                signupError.textContent = "Passwords do not match.";
                signupError.classList.add('show');
                return;
            }

            let pdfData = null;
            if (pdfFile) {
                // Read PDF as base64
                pdfData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(pdfFile);
                });
            }

            const newPlayerDef = {
                name,
                fatherName,
                mobile,
                dob,
                gender,
                plan,
                batch,
                password,
                pdfDocument: pdfData
            };

            const result = Database.registerPlayer(newPlayerDef);
            
            if (result.success) {
                signupSuccess.style.display = 'block';
                signupForm.reset();
                setTimeout(() => {
                    signupForm.style.display = 'none';
                    loginForm.style.display = 'block';
                    if (roleSelection) roleSelection.style.display = 'flex';
                    signupSuccess.style.display = 'none';
                }, 3000);
            }
        });
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        // Basic mock validation
        if(username === '' || password === '') {
            showError('Please fill in all fields.');
            return;
        }

        if(selectedRole === 'admin') {
            // Mock authentication for admin
            if (username === 'admin' && password === 'admin123') {
                window.location.href = 'admin-dashboard.html';
            } else {
                showError('Invalid admin credentials. (Try admin/admin123)');
            }
        } else {
            // Mock authentication for player
            if (username === 'player' && password === 'player123') {
                window.location.href = 'player-dashboard.html';
            } else {
                showError('Invalid player credentials. (Try player/player123)');
            }
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 3000);
    }
});
