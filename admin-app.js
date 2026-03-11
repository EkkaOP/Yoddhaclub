document.addEventListener('DOMContentLoaded', () => {
    // Make sure DB is loaded
    if (typeof Database === 'undefined') {
        console.error('Database not loaded!');
        return;
    }

    // ---- Dashboard Stats (Live) ----
    const loadDashboardStats = () => {
        // Total active members (exclude Pending)
        const allPlayers = Database.getPlayers();
        const activeMembers = allPlayers.filter(p => p.status === 'Active');
        const statMembers = document.getElementById('statTotalMembers');
        if (statMembers) statMembers.textContent = activeMembers.length.toLocaleString();

        // Total Revenue (sum of all payments)
        const allPayments = Database.getPayments ? Database.getPayments() : (JSON.parse(localStorage.getItem('payments')) || []);
        const totalRevenue = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const statRevenue = document.getElementById('statTotalRevenue');
        if (statRevenue) statRevenue.textContent = `₹${totalRevenue.toLocaleString()}`;

        // Active Events count
        const totalEvents = Database.getEvents().length;
        const statEvents = document.getElementById('statActiveEvents');
        if (statEvents) statEvents.textContent = totalEvents;

        // Recent Registrations (last 5 players joined)
        const recentList = document.getElementById('recentRegistrationsList');
        if (recentList) {
            const recent = [...allPlayers]
                .sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0))
                .slice(0, 5);

            if (recent.length === 0) {
                recentList.innerHTML = `<p class="text-muted text-center">No registrations yet.</p>`;
            } else {
                const timeAgo = (dateStr) => {
                    if (!dateStr) return 'Recently';
                    const diff = Date.now() - new Date(dateStr).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 60) return `${mins || 1} min${mins !== 1 ? 's' : ''} ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
                    return `${Math.floor(hrs / 24)} day(s) ago`;
                };

                recentList.innerHTML = recent.map(p => `
                    <div class="activity-item">
                        <div class="activity-icon"><i class="fa-solid fa-user-plus"></i></div>
                        <div class="activity-text">
                            <p><strong>${p.name}</strong> joined as a ${p.plan || 'Member'}.</p>
                            <span class="activity-time">${timeAgo(p.joinedAt)}</span>
                        </div>
                    </div>`).join('');
            }
        }
    };

    loadDashboardStats();

    // ---- Admin Header Profile Dropdown ----
    const adminHeaderProfileBtn = document.getElementById('adminHeaderProfileBtn');
    const adminProfileDropdown = document.getElementById('adminProfileDropdown');

    if (adminHeaderProfileBtn && adminProfileDropdown) {
        adminHeaderProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = adminProfileDropdown.style.display === 'block';
            adminProfileDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!adminHeaderProfileBtn.contains(e.target)) {
                adminProfileDropdown.style.display = 'none';
            }
        });
    }


    const qrScannerModal = document.getElementById('qrScannerModal');
    const openScannerBtn = document.getElementById('openScannerBtn');
    const openScannerNav = document.getElementById('openScannerNav');
    const closeScannerModal = document.getElementById('closeScannerModal');
    let html5QrcodeScanner;

    const loadTodayAttendance = () => {
        const tableBody = document.querySelector('#adminAttendanceTable tbody');
        if (!tableBody) return;

        const allAttendance = Database.getAttendance();
        const todayStr = new Date().toLocaleDateString();
        
        const todayRecords = allAttendance.filter(a => a.date === todayStr);

        if (todayRecords.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No attendance recorded today.</td></tr>`;
            return;
        }

        tableBody.innerHTML = todayRecords.map(record => `
            <tr>
                <td><strong>${record.playerId}</strong></td>
                <td>${record.playerName}</td>
                <td>${record.time}</td>
                <td><span class="badge badge-success">${record.status}</span></td>
            </tr>
        `).join('');
    };

    loadTodayAttendance();

    if (qrScannerModal && (openScannerBtn || openScannerNav) && closeScannerModal) {
        
        const closeScanner = () => {
            qrScannerModal.classList.remove('show');
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().catch(error => {
                    console.error("Failed to clear scanner. ", error);
                });
            }
            const resultDiv = document.getElementById('scanResult');
            if(resultDiv) {
                resultDiv.style.display = 'none';
            }
            document.getElementById('reader').style.display = 'block';
        };

        const openScanner = (e) => {
            e.preventDefault();
            qrScannerModal.classList.add('show');
            document.getElementById('reader').style.display = 'block';
            document.getElementById('scanResult').style.display = 'none';
            
            html5QrcodeScanner = new Html5QrcodeScanner(
                "reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
                
            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        };

        if(openScannerBtn) openScannerBtn.addEventListener('click', openScanner);
        if(openScannerNav) openScannerNav.addEventListener('click', openScanner);
        
        closeScannerModal.addEventListener('click', closeScanner);

        qrScannerModal.addEventListener('click', (e) => {
            if (e.target === qrScannerModal) {
                closeScanner();
            }
        });

        function onScanSuccess(decodedText, decodedResult) {
            console.log(`Code scanned = ${decodedText}`);
            
            try {
                // Parse the JSON data from Player's QR
                const playerData = JSON.parse(decodedText);
                
                if (playerData.id && playerData.name) {
                    if (html5QrcodeScanner) {
                        html5QrcodeScanner.clear();
                    }
                    
                    document.getElementById('reader').style.display = 'none';
                    
                    // Mark attendance
                    const result = Database.markAttendance(playerData.id, playerData.name);
                    
                    const resultDiv = document.getElementById('scanResult');
                    const infoP = document.getElementById('scannedPlayerInfo');
                    
                    if (result.success) {
                        infoP.innerHTML = `<strong>${playerData.name}</strong> (${playerData.id})<br><small>Logged at ${result.record.time}</small>`;
                        infoP.className = "mt-2 text-dark";
                        document.querySelector('#scanResult h4').textContent = "Attendance Marked!";
                        document.querySelector('#scanResult h4').className = "text-success font-weight-bold";
                        document.querySelector('.success-animation').innerHTML = '<i class="fa-solid fa-circle-check" style="font-size: 3rem;"></i>';
                        document.querySelector('.success-animation').className = "success-animation text-success mb-2";
                        
                        // Update table
                        loadTodayAttendance();
                    } else {
                        infoP.innerHTML = `<strong>${playerData.name}</strong><br><small>${result.message}</small>`;
                        infoP.className = "mt-2 text-warning";
                        document.querySelector('#scanResult h4').textContent = "Already Marked";
                        document.querySelector('#scanResult h4').className = "text-warning font-weight-bold";
                        document.querySelector('.success-animation').innerHTML = '<i class="fa-solid fa-circle-exclamation" style="font-size: 3rem;"></i>';
                        document.querySelector('.success-animation').className = "success-animation text-warning mb-2";
                    }

                    resultDiv.style.display = 'block';
                    
                    // Auto close after 3 seconds
                    setTimeout(closeScanner, 3000);
                }
            } catch (e) {
                console.error("Invalid QR Code format", e);
                // Not a valid player QR
            }
        }

        function onScanFailure(error) {
            // handle scan failure, usually better to ignore and keep scanning
        }
    }

    // Add Member Logic
    const addMemberModal = document.getElementById('addMemberModal');
    const openAddMemberBtn = document.getElementById('openAddMemberBtn');
    const openAddMemberNav = document.getElementById('openAddMemberNav');
    const closeAddMemberModal = document.getElementById('closeAddMemberModal');
    const addMemberForm = document.getElementById('addMemberForm');

    if (addMemberModal && (openAddMemberBtn || openAddMemberNav) && closeAddMemberModal) {

        const openAddModal = (e) => {
            e.preventDefault();
            addMemberModal.classList.add('show');
            document.getElementById('addMemberError').style.display = 'none';
            document.getElementById('addMemberSuccess').style.display = 'none';
            addMemberForm.reset();
            
            // Populate Batches dropdown
            const batchSelect = document.getElementById('newMemberBatch');
            if (batchSelect) {
                const batches = Database.getBatches();
                batchSelect.innerHTML = '<option value="">Select a batch...</option>';
                batches.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.name;
                    opt.textContent = `${b.name} (${b.time})`;
                    // Store fee data for easy access
                    opt.dataset.enrollment = b.enrollmentFee || 0;
                    opt.dataset.monthly = b.monthlyFee || 0;
                    batchSelect.appendChild(opt);
                });

                // Auto-fill fees when batch changes
                batchSelect.addEventListener('change', (e) => {
                    const selectedOpt = e.target.options[e.target.selectedIndex];
                    const enrollmentInput = document.getElementById('newMemberEnrollmentFee');
                    const monthlyInput = document.getElementById('newMemberMonthlyFee');
                    
                    if (selectedOpt && selectedOpt.value) {
                        if(enrollmentInput) enrollmentInput.value = selectedOpt.dataset.enrollment;
                        if(monthlyInput) monthlyInput.value = selectedOpt.dataset.monthly;
                    } else {
                        if(enrollmentInput) enrollmentInput.value = '';
                        if(monthlyInput) monthlyInput.value = '';
                    }
                });
            }
        };

        if(openAddMemberBtn) openAddMemberBtn.addEventListener('click', openAddModal);
        if(openAddMemberNav) openAddMemberNav.addEventListener('click', openAddModal);

        closeAddMemberModal.addEventListener('click', () => {
            addMemberModal.classList.remove('show');
        });

        addMemberModal.addEventListener('click', (e) => {
            if (e.target === addMemberModal) {
                addMemberModal.classList.remove('show');
            }
        });

        addMemberForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('newMemberName');
            const fatherNameInput = document.getElementById('newMemberFatherName');
            const dobInput = document.getElementById('newMemberDob');
            const mobileInput = document.getElementById('newMemberMobile');
            const batchInput = document.getElementById('newMemberBatch');
            const disciplineInput = document.getElementById('newMemberDiscipline');
            const passwordInput = document.getElementById('newMemberPassword');
            const photoInput = document.getElementById('newMemberPhoto');
            const addonsInput = document.getElementById('newMemberAddons');
            const enrollmentFeeInput = document.getElementById('newMemberEnrollmentFee');
            const monthlyFeeInput = document.getElementById('newMemberMonthlyFee');
            const discountInput = document.getElementById('newMemberDiscount');

            const errorDiv = document.getElementById('addMemberError');
            const successDiv = document.getElementById('addMemberSuccess');
            
            const name = nameInput.value.trim();
            const fatherName = fatherNameInput.value.trim();
            const dob = dobInput.value.trim();
            const mobile = mobileInput.value.trim();
            const batch = batchInput.value.trim();
            const discipline = disciplineInput.value.trim();
            const password = passwordInput.value.trim();
            const addons = addonsInput ? addonsInput.value.trim() : '';
            const enrollmentFee = enrollmentFeeInput ? enrollmentFeeInput.value : 0;
            const monthlyFee = monthlyFeeInput ? monthlyFeeInput.value : 0;
            const discount = discountInput ? discountInput.value : 0;
            const photoFile = photoInput.files[0];

            if (!name || !dob || !mobile || !password) {
                errorDiv.textContent = 'Please fill out all required fields.';
                errorDiv.style.display = 'block';
                successDiv.style.display = 'none';
                return;
            }

            const register = (photoUrl = '') => {
                const playerData = {
                    name,
                    fatherName,
                    dob,
                    mobile,
                    batch,
                    discipline,
                    password,
                    addons,
                    enrollmentFee,
                    monthlyFee,
                    discount,
                    photo: photoUrl
                };

                const result = Database.registerPlayer(playerData);
                
                if (result.success) {
                    errorDiv.style.display = 'none';
                    successDiv.innerHTML = `Successfully registered <strong>${result.player.name}</strong>!<br>ID: ${result.player.id}`;
                    successDiv.style.display = 'block';
                    
                    // Show Receipt Modal
                    const receiptModal = document.getElementById('receiptModal');
                    if(receiptModal) {
                        document.getElementById('receiptDate').textContent = new Date().toLocaleDateString();
                        document.getElementById('receiptMemberId').textContent = result.player.id;
                        document.getElementById('receiptName').textContent = result.player.name;
                        document.getElementById('receiptBatch').textContent = result.player.batch || 'None';
                        document.getElementById('receiptPlan').textContent = 'N/A'; // Plan removed
                        document.getElementById('receiptAddons').textContent = result.player.addons || 'None';
                        
                        document.getElementById('receiptEnrollmentFee').textContent = `₹${result.player.enrollmentFee || 0}`;
                        document.getElementById('receiptMonthlyFee').textContent = `₹${result.player.monthlyFee || 0}`;
                        document.getElementById('receiptDiscount').textContent = `- ₹${result.player.discount || 0}`;
                        
                        let total = parseFloat(result.player.enrollmentFee || 0) + parseFloat(result.player.monthlyFee || 0);
                        let subDiscount = parseFloat(result.player.discount || 0);
                        let finalTotal = total - subDiscount;
                        finalTotal = finalTotal < 0 ? 0 : finalTotal;
                        
                        document.getElementById('receiptTotal').textContent = `₹${finalTotal}`;
                        
                        addMemberModal.classList.remove('show');
                        receiptModal.classList.add('show');
                    }
                    
                    addMemberForm.reset(); // clear all inputs

                    // Refresh members table if it's currently loaded
                    if (typeof loadAllMembers === 'function' && document.querySelector('#allMembersTable tbody').innerHTML.trim() !== '') {
                         loadAllMembers();
                    }
                } else {
                    errorDiv.textContent = 'Failed to register player.';
                    errorDiv.style.display = 'block';
                    successDiv.style.display = 'none';
                }
            };

            if (photoFile) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    register(event.target.result);
                };
                reader.readAsDataURL(photoFile);
            } else {
                register();
            }
        });
    }

    // Receipt Modal Logic
    const receiptModal = document.getElementById('receiptModal');
    const closeReceiptModal = document.getElementById('closeReceiptModal');
    const printReceiptBtn = document.getElementById('printReceiptBtn');

    if (receiptModal) {
        if (closeReceiptModal) {
            closeReceiptModal.addEventListener('click', () => {
                receiptModal.classList.remove('show');
            });
        }
        
        if (printReceiptBtn) {
            printReceiptBtn.addEventListener('click', () => {
                // A very basic print approach just for the receipt content
                const printContents = document.getElementById('receiptContent').innerHTML;
                const originalContents = document.body.innerHTML;

                document.body.innerHTML = printContents;
                window.print();
                document.body.innerHTML = originalContents;
                
                // Need to reload window to restore proper JS event bindings after overwriting body.innerHTML
                window.location.reload();
            });
        }
    }

    // Payment Receipt Modal Logic
    const paymentReceiptModal = document.getElementById('paymentReceiptModal');
    const closePaymentReceiptModal = document.getElementById('closePaymentReceiptModal');
    const printPaymentReceiptBtn = document.getElementById('printPaymentReceiptBtn');

    if (paymentReceiptModal) {
        if (closePaymentReceiptModal) {
            closePaymentReceiptModal.addEventListener('click', () => {
                paymentReceiptModal.classList.remove('show');
            });
        }
        
        if (printPaymentReceiptBtn) {
            printPaymentReceiptBtn.addEventListener('click', () => {
                const printContents = document.getElementById('paymentReceiptContent').innerHTML;
                const originalContents = document.body.innerHTML;

                document.body.innerHTML = printContents;
                window.print();
                document.body.innerHTML = originalContents;
                
                window.location.reload();
            });
        }
    }

    // Manage Members Logic
    const manageMembersModal = document.getElementById('manageMembersModal');
    const openManageMembersNav = document.getElementById('openManageMembersNav');
    const closeManageMembersModal = document.getElementById('closeManageMembersModal');
    const allMembersTableBody = document.querySelector('#allMembersTable tbody');

    if (manageMembersModal && openManageMembersNav && closeManageMembersModal && allMembersTableBody) {
        
        let currentMemberFilter = 'All';

        const loadAllMembers = () => {
            let players = Database.getPlayers();
            
            // Filter out 'Pending' players from main view.
            players = players.filter(p => p.status !== 'Pending');

            if (currentMemberFilter !== 'All') {
                if (currentMemberFilter === 'Expiring Soon') {
                    players = players.filter(p => Database.getMemberExpiryStatus(p) === 'Expiring Soon');
                } else if (currentMemberFilter === 'Live') {
                    players = players.filter(p => Database.getMemberExpiryStatus(p) === 'Active');
                } else if (currentMemberFilter === 'Expired') {
                    players = players.filter(p => Database.getMemberExpiryStatus(p) === 'Expired');
                } else {
                    players = players.filter(p => p.status === currentMemberFilter);
                }
            }
            
            if(players.length === 0) {
                allMembersTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No members found for this category.</td></tr>`;
                return;
            }

            allMembersTableBody.innerHTML = players.map(p => {
                const dateJoined = p.joinedAt ? new Date(p.joinedAt).toLocaleDateString() : 'N/A';
                
                // Determine badge class for current status
                const expiryStatus = Database.getMemberExpiryStatus(p);
                let badgeClass = 'badge-secondary';
                if (expiryStatus === 'Active') badgeClass = 'badge-success';
                else if (expiryStatus === 'Expiring Soon') badgeClass = 'badge-warning';
                else if (expiryStatus === 'Expired') badgeClass = 'badge-danger';
                else if (p.status === 'Left') badgeClass = 'badge-secondary';

                return `
                <tr class="player-row" data-id="${p.id}" style="cursor: pointer;">
                    <td><strong>${p.id}</strong></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 50%;">` : '<i class="fa-solid fa-circle-user text-muted" style="font-size: 32px;"></i>'}
                            <span>${p.name} <br><small class="text-muted">${p.discipline || 'General'}</small></span>
                        </div>
                    </td>
                    <td>${p.mobile || 'N/A'}</td>
                    <td>
                        <select class="form-select status-select" data-id="${p.id}" style="padding: 0.25rem 2rem 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border); font-size: 0.875rem; background-color: var(--bg-light);">
                            <option value="Active" ${p.status === 'Active' ? 'selected' : ''}>Live</option>
                            <option value="Expired" ${p.status === 'Expired' ? 'selected' : ''}>Expired</option>
                            <option value="Left" ${p.status === 'Left' ? 'selected' : ''}>Left</option>
                        </select>
                    </td>
                    <td>${dateJoined}</td>
                </tr>
                `;
            }).join('');

            // Add listener for status changes
            document.querySelectorAll('.status-select').forEach(select => {
                select.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent row click
                });
                select.addEventListener('change', (e) => {
                    e.stopPropagation(); // Prevent row click
                    const id = e.target.getAttribute('data-id');
                    const newStatus = e.target.value;
                    Database.updatePlayerStatus(id, newStatus);
                    loadAllMembers(); // Refresh the table to apply filters if needed
                });
            });

            // Add listener for row clicks to open profile
            document.querySelectorAll('.player-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const player = Database.getPlayerById(id);
                    const adminProfileModal = document.getElementById('adminPlayerProfileModal');
                    
                    if (player && adminProfileModal) {
                        try {
                            // Populate Profile Details
                            const setElText = (id, val) => {
                                const el = document.getElementById(id);
                                if (el) el.textContent = val || 'N/A';
                            };

                            setElText('adminProfileName', player.name);
                            setElText('adminProfileId', player.id);
                            setElText('adminProfilePhoneNum', player.mobile);
                            
                            const joinDate = player.joinedAt ? new Date(player.joinedAt).toLocaleDateString() : 'N/A';
                            setElText('adminProfileJoined', joinDate);
                            
                            setElText('adminProfilePlan', player.plan);
                            setElText('adminProfileBatch', player.batch);
                            setElText('adminProfileAddons', player.addons);
                            setElText('adminProfileEnrollmentFee', player.enrollmentFee ? `₹${player.enrollmentFee}` : '₹0');
                            setElText('adminProfileMonthlyFee', player.monthlyFee ? `₹${player.monthlyFee}` : '₹0');
                            setElText('adminProfileDiscount', player.discount ? `- ₹${player.discount}` : '- ₹0');
                            
                            const expiryStatus = Database.getMemberExpiryStatus(player);
                            const profileStatus = document.getElementById('adminProfileStatus');
                            if (profileStatus) {
                                profileStatus.textContent = expiryStatus || 'Active';
                                if (expiryStatus === 'Active') profileStatus.className = 'badge badge-success';
                                else if (expiryStatus === 'Expiring Soon') profileStatus.className = 'badge badge-warning';
                                else if (expiryStatus === 'Expired') profileStatus.className = 'badge badge-danger';
                                else profileStatus.className = 'badge badge-secondary';
                            }

                            // --- Expiry Countdown Logic ---
                            const countdownBadge = document.getElementById('adminProfileExpiryCountdown');
                            const countdownText = document.getElementById('adminProfileCountdownText');
                            const expiryDisplay = document.getElementById('adminProfileExpiryDate');
                            
                            if (expiryDisplay) {
                                expiryDisplay.textContent = player.expiryDate ? new Date(player.expiryDate).toLocaleDateString() : 'No expiry set';
                            }

                            if (countdownBadge && countdownText) {
                                if (player.expiryDate) {
                                    const now = new Date();
                                    const exp = new Date(player.expiryDate);
                                    const diffTime = exp - now;
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    if (diffDays <= 5 && diffDays > 0) {
                                        countdownBadge.style.display = 'block';
                                        countdownText.textContent = `${diffDays} Day${diffDays > 1 ? 's' : ''} Left`;
                                    } else if (diffDays <= 0) {
                                        countdownBadge.style.display = 'block';
                                        countdownText.textContent = 'EXPIRED';
                                        const badgeSpan = countdownBadge.querySelector('span');
                                        if (badgeSpan) badgeSpan.style.background = 'var(--error)';
                                    } else {
                                        countdownBadge.style.display = 'none';
                                    }
                                } else {
                                    countdownBadge.style.display = 'none';
                                }
                            }

                            // --- Send Reminder Button ---
                            const reminderBtn = document.getElementById('adminSendReminderBtn');
                            if (reminderBtn && reminderBtn.parentNode) {
                                const freshReminderBtn = reminderBtn.cloneNode(true);
                                reminderBtn.parentNode.replaceChild(freshReminderBtn, reminderBtn);
                                freshReminderBtn.addEventListener('click', () => {
                                    const msg = prompt('Enter reminder message:', 'Your membership is expiring soon. Please renew to continue access.');
                                    if (msg) {
                                        if (Database.sendReminder(player.id, msg)) {
                                            alert('Reminder sent to member dashboard!');
                                        }
                                    }
                                });
                            }

                            const avatarUrl = player.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=FF0000&color=fff`;
                            const adminAvatarImg = document.getElementById('adminProfileAvatar');
                            if (adminAvatarImg) adminAvatarImg.src = avatarUrl;

                            // --- Social Media Contact Buttons ---
                            const socialContainer = document.getElementById('adminSocialLinks');
                            if (socialContainer) {
                                const btns = [];
                                const waNum = (player.whatsapp || player.mobile || '').replace(/\D/g, '');
                                if (waNum) {
                                    btns.push(`<a href="https://wa.me/${waNum}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:999px;font-size:0.82rem;font-weight:700;text-decoration:none;background:#25D366;color:#fff;box-shadow:0 2px 8px rgba(37,211,102,0.4);"> <i class="fa-brands fa-whatsapp"></i> WhatsApp </a>`);
                                }
                                const ig = player.instagram || '';
                                if (ig) {
                                    const igUrl = ig.startsWith('http') ? ig : `https://instagram.com/${ig.replace('@','')}`;
                                    btns.push(`<a href="${igUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:999px;font-size:0.82rem;font-weight:700;text-decoration:none;background:linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7);color:#fff;box-shadow:0 2px 8px rgba(238,42,123,0.4);"> <i class="fa-brands fa-instagram"></i> Instagram </a>`);
                                }
                                const fb = player.facebook || '';
                                if (fb) {
                                    const fbUrl = fb.startsWith('http') ? fb : `https://${fb}`;
                                    btns.push(`<a href="${fbUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:999px;font-size:0.82rem;font-weight:700;text-decoration:none;background:#1877F2;color:#fff;box-shadow:0 2px 8px rgba(24,119,242,0.4);"> <i class="fa-brands fa-facebook"></i> Facebook </a>`);
                                }
                                socialContainer.innerHTML = btns.join('');
                                socialContainer.style.display = btns.length > 0 ? 'flex' : 'none';
                            }

                            // --- Photo Change Logic ---
                            const photoInput = document.getElementById('adminChangePhotoInput');
                            const photoMsg = document.getElementById('adminPhotoChangeMsg');
                            if (photoInput && photoInput.parentNode) {
                                const freshPhotoInput = photoInput.cloneNode(true);
                                photoInput.parentNode.replaceChild(freshPhotoInput, photoInput);
                                freshPhotoInput.addEventListener('change', () => {
                                    const file = freshPhotoInput.files[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        const base64 = ev.target.result;
                                        if (adminAvatarImg) adminAvatarImg.src = base64;
                                        const players = Database.getPlayers();
                                        const target = players.find(p => p.id === player.id);
                                        if (target) {
                                            target.photo = base64;
                                            localStorage.setItem('players', JSON.stringify(players));
                                        }
                                        freshPhotoInput.value = '';
                                        if (photoMsg) {
                                            photoMsg.textContent = 'Photo updated!';
                                            photoMsg.style.display = 'block';
                                            setTimeout(() => { if (photoMsg) photoMsg.style.display = 'none'; }, 3000);
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                });
                            }
                            
                            // Populate Documents Section
                            const loadPlayerDocs = () => {
                                try {
                                    const freshPlayer = Database.getPlayerById(player.id);
                                    if (!freshPlayer) return;
                                    
                                    const docList = document.getElementById('adminProfileDocList');
                                    if (!docList) return;
                                    
                                    // Migration check: if documents missing but pdf exists
                                    Database.migrateLegacyDocument(freshPlayer.id);
                                    
                                    // Re-fetch after migration just in case
                                    const updatedPlayer = Database.getPlayerById(freshPlayer.id);
                                    const docs = updatedPlayer.documents || [];
                                    
                                    if (docs.length === 0) {
                                        docList.innerHTML = `<p class="text-muted text-center" style="font-size: 0.85rem; margin: 1rem 0;">No documents uploaded.</p>`;
                                    } else {
                                        docList.innerHTML = docs.map(doc => `
                                            <div class="doc-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg-light); color: var(--text-dark); border: 1px solid var(--border); border-radius: 10px;">
                                                <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
                                                    <i class="fa-solid fa-file-pdf text-danger" style="font-size: 1.25rem;"></i>
                                                    <div style="flex: 1; min-width: 0;">
                                                        <p style="margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${doc.name || 'Untitled'}</p>
                                                        <small class="text-muted" style="font-size: 0.7rem;">${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}</small>
                                                    </div>
                                                </div>
                                                <div style="display: flex; gap: 0.4rem;">
                                                    <a href="${doc.url}" download="${doc.name}" class="btn btn-sm btn-outline-primary" style="padding: 0.25rem 0.5rem; border-radius: 6px; display: flex; align-items: center; justify-content: center;" title="Download">
                                                        <i class="fa-solid fa-download"></i>
                                                    </a>
                                                    <button class="btn btn-sm btn-outline-danger delete-doc-btn" data-doc-id="${doc.id}" style="padding: 0.25rem 0.5rem; border-radius: 6px; display: flex; align-items: center; justify-content: center;" title="Delete">
                                                        <i class="fa-solid fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        `).join('');
                                        
                                        docList.querySelectorAll('.delete-doc-btn').forEach(btn => {
                                            btn.addEventListener('click', (e) => {
                                                const docId = e.currentTarget.getAttribute('data-doc-id');
                                                if (confirm('Are you sure you want to delete this document?')) {
                                                    if (Database.deletePlayerDocument(player.id, docId)) {
                                                        loadPlayerDocs();
                                                    }
                                                }
                                            });
                                        });
                                    }
                                } catch (err) {
                                    console.error('Error loading documents:', err);
                                }
                            };
                            
                            loadPlayerDocs();
                            
                            // Setup Document Upload
                            const docUploadBtn = document.getElementById('adminProfileUploadBtn');
                            const docFileInput = document.getElementById('adminProfileDocFile');
                            const docNameInput = document.getElementById('adminProfileDocName');
                            const docMsg = document.getElementById('adminProfileUploadMsg');
                            
                            if (docUploadBtn && docUploadBtn.parentNode) {
                                const newBtn = docUploadBtn.cloneNode(true);
                                docUploadBtn.parentNode.replaceChild(newBtn, docUploadBtn);
                                if (docFileInput) docFileInput.value = '';
                                if (docNameInput) docNameInput.value = '';
                                if (docMsg) docMsg.style.display = 'none';

                                newBtn.addEventListener('click', (ev) => {
                                    ev.preventDefault();
                                    const file = docFileInput ? docFileInput.files[0] : null;
                                    const docName = docNameInput ? docNameInput.value.trim() : '';
                                    
                                    if (!file) { alert('Please select a file to upload.'); return; }
                                    if (!docName) { alert('Please enter a name for the document.'); return; }

                                    console.log('Starting upload:', docName, file.name);
                                    // Removed diagnostic alert to avoid annoying the user, 
                                    // but kept the log and the logic. 
                                    // Actually, let's add a small status update in the UI instead.
                                    if (docMsg) {
                                        docMsg.textContent = 'Reading file...';
                                        docMsg.style.display = 'block';
                                        docMsg.className = 'text-muted mt-1';
                                    }

                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                        const base64 = e.target.result;
                                        const result = Database.addPlayerDocument(player.id, docName, base64);
                                        
                                        if (result && result.success) {
                                            if (docMsg) {
                                                docMsg.textContent = 'Document uploaded successfully!';
                                                docMsg.style.display = 'block';
                                                docMsg.className = 'text-success mt-1';
                                                setTimeout(() => { if(docMsg) docMsg.style.display = 'none'; }, 3000);
                                            }
                                            if (docFileInput) docFileInput.value = '';
                                            if (docNameInput) docNameInput.value = '';
                                            loadPlayerDocs();
                                        } else {
                                            const errorMsg = result ? result.message : 'Unknown error occurred.';
                                            alert('Upload failed: ' + errorMsg);
                                            if (docMsg) {
                                                docMsg.textContent = 'Upload failed: ' + errorMsg;
                                                docMsg.style.display = 'block';
                                                docMsg.className = 'text-danger mt-1';
                                            }
                                        }
                                    };
                                    reader.onerror = () => {
                                        alert('Error reading the selected file.');
                                    };
                                    reader.readAsDataURL(file);
                                });
                            }

                            // Populate History Tables
                            const populateTable = (id, history, colCount) => {
                                const tbody = document.querySelector(`#${id} tbody`);
                                if (!tbody) return;
                                if (!history || history.length === 0) {
                                    tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center text-muted">No records found.</td></tr>`;
                                } else {
                                    tbody.innerHTML = history.slice(0, 10).map(record => {
                                        if (id === 'adminPlayerAttendanceTable') {
                                            return `<tr><td>${record.date}</td><td>${record.time}</td><td><span class="badge badge-success">${record.status}</span></td></tr>`;
                                        } else {
                                            const d = new Date(record.date);
                                            return `<tr><td><div style="line-height:1.2;">${d.toLocaleDateString()}<br><small class="text-muted">${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div></td><td class="text-primary font-weight-bold">₹${record.amount}</td><td>${record.paymentType}</td><td>${record.method}</td></tr>`;
                                        }
                                    }).join('');
                                }
                            };

                            populateTable('adminPlayerAttendanceTable', Database.getPlayerAttendance(player.id), 3);
                            populateTable('adminPlayerPaymentsTable', Database.getPlayerPayments(player.id), 4);

                            // Finally, show modal
                            adminProfileModal.classList.add('show');
                        } catch (err) {
                            console.error('Error populating player profile:', err);
                            alert('Sorry, there was an error opening the player profile.');
                        }
                    }
                });
            });
        };

        // Profile Modal Close Logic
        const adminPlayerProfileModal = document.getElementById('adminPlayerProfileModal');
        const closeAdminPlayerProfileModal = document.getElementById('closeAdminPlayerProfileModal');
        
        if (adminPlayerProfileModal && closeAdminPlayerProfileModal) {
            closeAdminPlayerProfileModal.addEventListener('click', () => {
                adminPlayerProfileModal.classList.remove('show');
            });
            adminPlayerProfileModal.addEventListener('click', (e) => {
                if(e.target === adminPlayerProfileModal) {
                    adminPlayerProfileModal.classList.remove('show');
                }
            });
        }

        // Add filter button logic
        const filterBtns = document.querySelectorAll('.member-filter-btn, .filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all
                filterBtns.forEach(b => {
                    b.classList.remove('btn-primaryActive', 'btn-primary');
                    b.classList.add('btn-outline-primary');
                });
                
                // Add active class to clicked
                const clickedBtn = e.target;
                clickedBtn.classList.remove('btn-outline-primary');
                clickedBtn.classList.add('btn-primary');

                currentMemberFilter = clickedBtn.getAttribute('data-filter');
                loadAllMembers();
            });
        });

        openManageMembersNav.addEventListener('click', (e) => {
            e.preventDefault();
            loadAllMembers();
            manageMembersModal.classList.add('show');
        });

        closeManageMembersModal.addEventListener('click', () => {
            manageMembersModal.classList.remove('show');
        });

        manageMembersModal.addEventListener('click', (e) => {
            if (e.target === manageMembersModal) {
                manageMembersModal.classList.remove('show');
            }
        });
    }

    // Manage Coaches Logic
    const manageCoachesModal = document.getElementById('manageCoachesModal');
    const openManageCoachesNav = document.getElementById('openManageCoachesNav');
    const closeManageCoachesModal = document.getElementById('closeManageCoachesModal');
    const allCoachesTableBody = document.querySelector('#allCoachesTable tbody');
    const addCoachForm = document.getElementById('addCoachForm');

    if (manageCoachesModal && openManageCoachesNav && closeManageCoachesModal && allCoachesTableBody && addCoachForm) {
        
        const loadAllCoaches = () => {
            const coaches = Database.getCoaches();
            
            if(coaches.length === 0) {
                allCoachesTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No coaches found.</td></tr>`;
                return;
            }

            allCoachesTableBody.innerHTML = coaches.map(c => `
                <tr>
                    <td><strong>${c.id}</strong></td>
                    <td>${c.name}</td>
                    <td>${c.specialty}</td>
                    <td><span class="badge ${c.status === 'Active' ? 'badge-success' : 'badge-secondary'}">${c.status}</span></td>
                </tr>
            `).join('');
        };

        openManageCoachesNav.addEventListener('click', (e) => {
            e.preventDefault();
            loadAllCoaches();
            manageCoachesModal.classList.add('show');
        });

        closeManageCoachesModal.addEventListener('click', () => {
            manageCoachesModal.classList.remove('show');
        });

        manageCoachesModal.addEventListener('click', (e) => {
            if (e.target === manageCoachesModal) {
                manageCoachesModal.classList.remove('show');
            }
        });

        addCoachForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('newCoachName');
            const specialtyInput = document.getElementById('newCoachSpecialty');
            
            const name = nameInput.value.trim();
            const specialty = specialtyInput.value.trim();

            if (name && specialty) {
                Database.addCoach(name, specialty);
                nameInput.value = '';
                specialtyInput.value = '';
                loadAllCoaches(); // refresh table
                
                // Show a quick alert or just rely on table updating
                const submitBtn = addCoachForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Added!';
                submitBtn.classList.add('btn-success');
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.classList.remove('btn-success');
                }, 2000);
            }
        });
    }

    // Manage Banners Logic
    const manageBannersModal = document.getElementById('manageBannersModal');
    const openManageBannersNav = document.getElementById('openManageBannersNav');
    const closeManageBannersModal = document.getElementById('closeManageBannersModal');
    const allBannersTableBody = document.querySelector('#allBannersTable tbody');
    const addBannerForm = document.getElementById('addBannerForm');

    if (manageBannersModal && openManageBannersNav && closeManageBannersModal && allBannersTableBody && addBannerForm) {
        
        const loadAllBanners = () => {
            const banners = Database.getBanners();
            
            if(banners.length === 0) {
                allBannersTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No banners found.</td></tr>`;
                return;
            }

            allBannersTableBody.innerHTML = banners.map(b => `
                <tr>
                    <td><img src="${b.url}" alt="${b.title}" style="width: 80px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                    <td><strong>${b.title}</strong></td>
                    <td>${b.subtitle}<br><small style="color: var(--primary);"><i>${b.redirectUrl && b.redirectUrl !== '#' ? b.redirectUrl : 'No Link'}</i></small></td>
                    <td><button class="btn btn-sm text-danger delete-banner-btn" style="padding: 0.25rem 0.5rem; background: transparent; border: 1px solid var(--error);" data-id="${b.id}"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `).join('');

            // Add delete event listeners
            document.querySelectorAll('.delete-banner-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this banner?')) {
                        Database.deleteBanner(id);
                        loadAllBanners();
                    }
                });
            });
        };

        openManageBannersNav.addEventListener('click', (e) => {
            e.preventDefault();
            loadAllBanners();
            manageBannersModal.classList.add('show');
        });

        closeManageBannersModal.addEventListener('click', () => {
            manageBannersModal.classList.remove('show');
        });

        manageBannersModal.addEventListener('click', (e) => {
            if (e.target === manageBannersModal) {
                manageBannersModal.classList.remove('show');
            }
        });

        addBannerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const imageInput = document.getElementById('newBannerImage');
            const urlInput = document.getElementById('newBannerUrl');
            const titleInput = document.getElementById('newBannerTitle');
            const subtitleInput = document.getElementById('newBannerSubtitle');
            const redirectInput = document.getElementById('newBannerRedirect');
            
            const file = imageInput.files[0];
            const urlValue = urlInput.value.trim();
            const title = titleInput.value.trim();
            const subtitle = subtitleInput.value.trim();
            const redirectUrl = redirectInput.value.trim();

            if (!file && !urlValue) {
                alert('Please upload an image or provide an image URL');
                return;
            }

            if (title && subtitle) {
                const saveBanner = (finalUrl) => {
                    try {
                        Database.addBanner(finalUrl, title, subtitle, redirectUrl);
                        imageInput.value = '';
                        urlInput.value = '';
                        titleInput.value = '';
                        subtitleInput.value = '';
                        redirectInput.value = '';
                        loadAllBanners(); // refresh table
                        
                        const submitBtn = addBannerForm.querySelector('button[type="submit"]');
                        if (submitBtn) {
                            const originalText = submitBtn.textContent;
                            submitBtn.textContent = 'Added!';
                            submitBtn.classList.add('btn-success');
                            setTimeout(() => {
                                submitBtn.textContent = originalText;
                                submitBtn.classList.remove('btn-success');
                            }, 2000);
                        }
                    } catch (error) {
                        console.error('Error saving banner:', error);
                        alert('Image size might be too large for storage limit. Please try a smaller image or an Image URL instead.');
                    }
                };

                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const img = new Image();
                        img.onload = function() {
                            let width = img.width;
                            let height = img.height;
                            const MAX_WIDTH = 1200;
                            
                            if (width > MAX_WIDTH) {
                                height = Math.round((height * MAX_WIDTH) / width);
                                width = MAX_WIDTH;
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            saveBanner(canvas.toDataURL('image/jpeg', 0.8));
                        };
                        img.onerror = function() {
                            saveBanner(event.target.result); // Fallback
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                } else {
                    saveBanner(urlValue);
                }
            }
        });
    }

    // --- Manage Our Players Logic ---
    const manageOurPlayersModal = document.getElementById('manageOurPlayersModal');
    const openManageOurPlayersNav = document.getElementById('openManageOurPlayersNav');
    const closeManageOurPlayersModal = document.getElementById('closeManageOurPlayersModal');
    const ourPlayersTableBody = document.getElementById('ourPlayersTableBody');
    const addOurPlayerForm = document.getElementById('addOurPlayerForm');

    window.loadOurPlayersTable = () => {
        if (!ourPlayersTableBody) return;
        const players = Database.getOurPlayers();
        
        if (players.length === 0) {
            ourPlayersTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No players found in this section.</td></tr>`;
            return;
        }

        ourPlayersTableBody.innerHTML = players.map(p => `
            <tr>
                <td><img src="${p.imageUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%;" alt="${p.name}"></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.achievement}</td>
                <td>
                    <button class="btn btn-sm text-danger delete-our-player-btn" data-id="${p.id}" style="background: transparent; border: 1px solid var(--error); padding: 0.25rem 0.5rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Delete listener
        document.querySelectorAll('.delete-our-player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Remove this player from the landing page?')) {
                    Database.deleteOurPlayer(id);
                    window.loadOurPlayersTable();
                }
            });
        });
    };

    if (manageOurPlayersModal && openManageOurPlayersNav && closeManageOurPlayersModal && addOurPlayerForm) {
        openManageOurPlayersNav.addEventListener('click', (e) => {
            e.preventDefault();
            window.loadOurPlayersTable();
            manageOurPlayersModal.classList.add('show');
        });

        closeManageOurPlayersModal.addEventListener('click', () => {
            manageOurPlayersModal.classList.remove('show');
        });

        manageOurPlayersModal.addEventListener('click', (e) => {
            if (e.target === manageOurPlayersModal) {
                manageOurPlayersModal.classList.remove('show');
            }
        });

        addOurPlayerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('ourPlayerName');
            const achievementInput = document.getElementById('ourPlayerAchievement');
            const urlInput = document.getElementById('ourPlayerImageUrl');

            const name = nameInput.value.trim();
            const achievement = achievementInput.value.trim();
            const url = urlInput.value.trim();

            if (name && achievement && url) {
                Database.addOurPlayer(name, achievement, url);
                nameInput.value = '';
                achievementInput.value = '';
                urlInput.value = '';
                window.loadOurPlayersTable();

                const submitBtn = addOurPlayerForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
                submitBtn.classList.replace('btn-primary', 'btn-success');
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.classList.replace('btn-success', 'btn-primary');
                }, 2000);
            }
        });

        // Initial load
        window.loadOurPlayersTable();
    }

    // Manage Announcements / Chat Room Logic (Removed - HTML was deleted)

    // Manage Batches Logic
    const manageBatchesModal = document.getElementById('manageBatchesModal');
    const openManageBatchesNav = document.getElementById('openManageBatchesNav');
    const closeManageBatchesModal = document.getElementById('closeManageBatchesModal');
    const allBatchesTableBody = document.querySelector('#allBatchesTable tbody');
    const addBatchForm = document.getElementById('addBatchForm');

    // Make loadAllBatches available globally for other forms (like Add Member)
    window.loadAllBatches = () => {
        if (!allBatchesTableBody) return;
        
        const batches = Database.getBatches();
        
        if(batches.length === 0) {
            allBatchesTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No batches found.</td></tr>`;
            return;
        }

        allBatchesTableBody.innerHTML = batches.map(b => `
            <tr>
                <td><strong>${b.name}</strong></td>
                <td>${b.time}</td>
                <td>${b.instructor || 'N/A'}</td>
                <td>₹${b.enrollmentFee || 0}</td>
                <td>₹${b.monthlyFee || 0}</td>
                <td><button class="btn btn-sm text-danger delete-batch-btn" style="padding: 0.25rem 0.5rem; background: transparent; border: 1px solid var(--error);" data-id="${b.id}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');

        // Add delete event listeners
        document.querySelectorAll('.delete-batch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this batch?')) {
                    Database.deleteBatch(id);
                    window.loadAllBatches();
                }
            });
        });
    };

    if (manageBatchesModal && openManageBatchesNav && closeManageBatchesModal && addBatchForm) {
        openManageBatchesNav.addEventListener('click', (e) => {
            e.preventDefault();
            window.loadAllBatches();
            manageBatchesModal.classList.add('show');
        });

        closeManageBatchesModal.addEventListener('click', () => {
            manageBatchesModal.classList.remove('show');
        });

        manageBatchesModal.addEventListener('click', (e) => {
            if (e.target === manageBatchesModal) {
                manageBatchesModal.classList.remove('show');
            }
        });

        addBatchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('newBatchName');
            const timeInput = document.getElementById('newBatchTime');
            const instructorInput = document.getElementById('newBatchInstructor');
            const enrollmentFeeInput = document.getElementById('newBatchEnrollmentFee');
            const monthlyFeeInput = document.getElementById('newBatchMonthlyFee');
            
            const name = nameInput.value.trim();
            const time = timeInput.value.trim();
            const instructor = instructorInput.value.trim();
            const enrollmentFee = enrollmentFeeInput.value;
            const monthlyFee = monthlyFeeInput.value;

            if (name && time) {
                Database.addBatch(name, time, instructor, enrollmentFee, monthlyFee);
                nameInput.value = '';
                timeInput.value = '';
                instructorInput.value = '';
                enrollmentFeeInput.value = '';
                monthlyFeeInput.value = '';
                window.loadAllBatches(); // refresh table
                
                const submitBtn = addBatchForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Created!';
                submitBtn.classList.add('btn-success');
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.classList.remove('btn-success');
                }, 2000);
            }
        });
        
        // Initial load
        window.loadAllBatches();
    }

    // Fee Management Logic
    const feeManagementModal = document.getElementById('feeManagementModal');
    const openFeeManagementNav = document.getElementById('openFeeManagementNav');
    const closeFeeManagementModal = document.getElementById('closeFeeManagementModal');
    const feeStatusTableBody = document.querySelector('#feeStatusTable tbody');
    const logPaymentForm = document.getElementById('logPaymentForm');
    const paymentMemberSelect = document.getElementById('paymentMemberId');

    const loadFeeManagement = () => {
        if (!feeStatusTableBody) return;

        const players = Database.getPlayers();
        const payments = Database.getPayments();
        
        // Populate select member dropdown
        if (paymentMemberSelect) {
            paymentMemberSelect.innerHTML = '<option value="">Select Member...</option>';
            players.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.id} - ${p.name}`;
                paymentMemberSelect.appendChild(opt);
            });
        }

        const batches = Database.getBatches();

        if(players.length === 0) {
            feeStatusTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No members found.</td></tr>`;
            return;
        }

        feeStatusTableBody.innerHTML = players.map(p => {
            // Find player's batch logic
            const playerBatch = batches.find(b => b.name === p.batch);
            const requiresEnrollment = playerBatch ? playerBatch.enrollmentFee > 0 : false;
            
            // Find payments for player
            const playerPayments = payments.filter(pay => pay.playerId === p.id);
            
            let lastMonthlyDateStr = 'Never';
            let isMonthlyPaid = false;
            let isEnrollmentPaid = !requiresEnrollment; // implicitly paid if batch doesn't require it

            // Figure out Enrollment
            if (requiresEnrollment) {
                const enrollmentPayments = playerPayments.filter(pay => pay.paymentType === 'Enrollment');
                if (enrollmentPayments.length > 0) {
                    isEnrollmentPaid = true;
                }
            }

            // Figure out Monthly
            const monthlyPayments = playerPayments.filter(pay => pay.paymentType !== 'Enrollment');
            if (monthlyPayments.length > 0) {
                // Sort by date descending
                monthlyPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
                const lastPaymentDate = new Date(monthlyPayments[0].date);
                lastMonthlyDateStr = lastPaymentDate.toLocaleDateString();
                
                // Assuming fees are monthly: if paid within last 30 days, status is Paid
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                if (lastPaymentDate >= thirtyDaysAgo) {
                    isMonthlyPaid = true;
                }
            }

            return `
            <tr>
                <td><strong>${p.name}</strong><br><small class="text-muted">${p.id}</small></td>
                <td>${p.batch || 'None'}</td>
                <td><span class="badge ${isEnrollmentPaid ? 'badge-success' : 'badge-danger'}">${isEnrollmentPaid ? 'Paid' : 'Due'}</span></td>
                <td><span class="badge ${isMonthlyPaid ? 'badge-success' : 'badge-danger'}">${isMonthlyPaid ? 'Paid' : 'Due'}</span></td>
                <td>${lastMonthlyDateStr}</td>
            </tr>
            `;
        }).join('');
    };

    if (feeManagementModal && openFeeManagementNav && closeFeeManagementModal && logPaymentForm) {
        openFeeManagementNav.addEventListener('click', (e) => {
            e.preventDefault();
            loadFeeManagement();
            feeManagementModal.classList.add('show');
        });

        closeFeeManagementModal.addEventListener('click', () => {
            feeManagementModal.classList.remove('show');
        });

        feeManagementModal.addEventListener('click', (e) => {
            if (e.target === feeManagementModal) {
                feeManagementModal.classList.remove('show');
            }
        });

        logPaymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const memberId = paymentMemberSelect.value;
            const amountInput = document.getElementById('paymentAmount');
            const methodInput = document.getElementById('paymentMethod');
            const typeInput = document.getElementById('paymentType');
            
            const amount = parseFloat(amountInput.value);
            const method = methodInput.value;
            const type = typeInput.value;

            if (memberId && amount && method && type) {
                Database.addPayment(memberId, amount, method, type);
                
                amountInput.value = '';
                paymentMemberSelect.value = '';
                methodInput.value = 'Cash';
                typeInput.value = 'Monthly';
                
                loadFeeManagement(); // refresh table
                
                // Show Payment Receipt Modal
                const player = Database.getPlayerById(memberId);
                const pReceiptModal = document.getElementById('paymentReceiptModal');
                
                if (pReceiptModal && player) {
                    document.getElementById('payReceiptDate').textContent = new Date().toLocaleDateString();
                    document.getElementById('payReceiptMemberId').textContent = player.id;
                    document.getElementById('payReceiptName').textContent = player.name;
                    document.getElementById('payReceiptType').textContent = type;
                    document.getElementById('payReceiptMethod').textContent = method;
                    document.getElementById('payReceiptAmount').textContent = `₹${amount}`;
                    
                    feeManagementModal.classList.remove('show');
                    pReceiptModal.classList.add('show');
                } else {
                    const submitBtn = logPaymentForm.querySelector('button[type="submit"]');
                    const originalText = submitBtn.textContent;
                    submitBtn.textContent = 'Recorded!';
                    submitBtn.classList.add('badge-success');
                    setTimeout(() => {
                        submitBtn.textContent = originalText;
                        submitBtn.classList.remove('badge-success');
                    }, 2000);
                }
            }
        });
    }

    // --- Manage Events Logic ---
    const manageEventsModal = document.getElementById('manageEventsModal');
    const openManageEventsNav = document.getElementById('openManageEventsNav');
    const closeManageEventsModal = document.getElementById('closeManageEventsModal');
    
    const addEventForm = document.getElementById('addEventForm');
    const allEventsTableBody = document.querySelector('#allEventsTable tbody');
    const eventReqFeeCheckbox = document.getElementById('newEventRequiresFee');
    const eventFeeContainer = document.getElementById('newEventFee');
    const extendedPaymentDetails = document.getElementById('extendedPaymentDetails');

    if (eventReqFeeCheckbox && eventFeeContainer && extendedPaymentDetails) {
        eventReqFeeCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            eventFeeContainer.style.display = isChecked ? 'block' : 'none';
            extendedPaymentDetails.style.display = isChecked ? 'flex' : 'none';
        });
    }

    let currentEventTab = 'upcoming';

    window.loadEventsTable = () => {
        if (!allEventsTableBody) return;
        
        const now = new Date();
        const events = Database.getEvents().sort((a,b) => new Date(b.date) - new Date(a.date));
        
        let filteredEvents = [];
        if (currentEventTab === 'upcoming') {
            filteredEvents = events.filter(ev => new Date(ev.date) >= now);
        } else {
            filteredEvents = events.filter(ev => new Date(ev.date) < now).reverse(); // Past events newest first
        }

        if (filteredEvents.length === 0) {
            allEventsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No ${currentEventTab} events found.</td></tr>`;
            return;
        }

        allEventsTableBody.innerHTML = filteredEvents.map(ev => {
            const regs = Database.getEventRegistrationsForEvent(ev.id);
            const isPast = new Date(ev.date) < now;
            const albumUrls = ev.albumUrls || (ev.albumUrl ? [ev.albumUrl] : []);
            
            let linksHtml = '';
            if (isPast) {
                linksHtml = `
                <div class="album-links-container" style="margin-top: 0.5rem;">
                    <ul style="list-style: none; padding: 0; margin: 0 0 0.5rem 0; font-size: 0.75rem;">
                        ${albumUrls.map((url, idx) => `
                            <li style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-light); padding: 2px 5px; border-radius: 4px; margin-bottom: 2px; border: 1px solid var(--border);">
                                <a href="${url}" target="_blank" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 150px; color: var(--primary);">Link ${idx + 1}</a>
                                <button class="btn-delete-link text-danger" data-id="${ev.id}" data-index="${idx}" style="background: none; border: none; padding: 0 4px; cursor: pointer;" title="Delete Link">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                    <div style="display: flex; gap: 0.4rem; align-items: center;">
                        <input type="text" class="form-control form-control-sm album-url-input" 
                               data-id="${ev.id}" placeholder="Add New Drive Link" 
                               style="font-size: 0.75rem; padding: 0.2rem 0.4rem; height: auto;">
                        <button class="btn btn-sm btn-primary add-album-link-btn" data-id="${ev.id}" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;">Add</button>
                    </div>
                </div>`;
            }

            return `
            <tr>
                <td><img src="${ev.bannerUrl}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;" alt="Banner"></td>
                <td>
                    <strong>${ev.title}</strong><br>
                    <small class="text-muted"><i class="fa-regular fa-calendar"></i> ${new Date(ev.date).toLocaleDateString()}</small>
                    ${linksHtml}
                </td>
                <td>${ev.requiresPayment ? '₹' + ev.fee : '<span class="text-success"><small>Free</small></span>'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-event-regs-btn" data-id="${ev.id}" data-title="${ev.title}" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;">
                        View (${regs.length})
                    </button>
                </td>
                <td>
                    <button class="btn btn-sm text-danger delete-event-btn" data-id="${ev.id}" style="padding: 0.25rem 0.5rem; background: transparent; border: 1px solid var(--error);"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
            `;
        }).join('');

        // Tab Switching Logic
        document.querySelectorAll('.event-tab-btn').forEach(btn => {
            // Remove previous listeners by cloning if necessary, or just check and update
            btn.onclick = () => {
                document.querySelectorAll('.event-tab-btn').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-outline-primary');
                });
                btn.classList.remove('btn-outline-primary');
                btn.classList.add('btn-primary');
                currentEventTab = btn.getAttribute('data-tab');
                window.loadEventsTable();
            };
        });

        // Add Album Link Logic
        document.querySelectorAll('.add-album-link-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const input = document.querySelector(`.album-url-input[data-id="${id}"]`);
                const url = input.value.trim();
                if (!url) return alert("Please enter a valid link.");
                if (Database.addEventAlbumLink(id, url)) {
                    btn.textContent = 'Added!';
                    btn.classList.replace('btn-primary', 'btn-success');
                    setTimeout(() => {
                        window.loadEventsTable();
                    }, 1000);
                }
            };
        });

        // Delete Album Link Logic (Admin Only)
        document.querySelectorAll('.btn-delete-link').forEach(btn => {
            btn.onclick = () => {
                if (!confirm("Are you sure you want to delete this link?")) return;
                const id = btn.getAttribute('data-id');
                const index = parseInt(btn.getAttribute('data-index'));
                if (Database.deleteEventAlbumLink(id, index)) {
                    window.loadEventsTable();
                }
            };
        });

        // Delete Listener
        document.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Delete this event and all its registrations permanently?')) {
                    Database.deleteEvent(e.currentTarget.getAttribute('data-id'));
                    window.loadEventsTable();
                }
            });
        });

        // View Registrations Listener
        document.querySelectorAll('.view-event-regs-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.currentTarget.getAttribute('data-id');
                const title = e.currentTarget.getAttribute('data-title');
                openEventRegistrations(eventId, title);
            });
        });
    };

    if (addEventForm) {
        addEventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('newEventTitle').value;
            const date = document.getElementById('newEventDate').value;
            const desc = document.getElementById('newEventDesc').value;
            const hasFee = eventReqFeeCheckbox.checked;
            const fee = document.getElementById('newEventFee').value;
            const fileInput = document.getElementById('newEventBanner');
            const qrFileInput = document.getElementById('newEventPaymentQr');
            const upiId = document.getElementById('newEventUpiId').value;
            
            const file = fileInput.files[0];
            if (!file) {
                alert("Please upload a banner image."); return;
            }

            const processWithQr = (bannerUrl, qrUrl) => {
                Database.addEvent(title, date, desc, bannerUrl, hasFee, fee, qrUrl, upiId);
                
                // reset form
                addEventForm.reset();
                if(eventFeeContainer) eventFeeContainer.style.display = 'none';
                if(extendedPaymentDetails) extendedPaymentDetails.style.display = 'none';
                window.loadEventsTable();

                const submitBtn = addEventForm.querySelector('button[type="submit"]');
                const orig = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Created';
                submitBtn.classList.add('badge-success', 'text-white');
                setTimeout(() => {
                    submitBtn.innerHTML = orig;
                    submitBtn.classList.remove('badge-success', 'text-white');
                }, 2000);
            };

            const reader = new FileReader();
            reader.onload = (ev) => {
                const bannerUrl = ev.target.result;
                
                if (hasFee && qrFileInput.files[0]) {
                    const qrReader = new FileReader();
                    qrReader.onload = (qrEv) => processWithQr(bannerUrl, qrEv.target.result);
                    qrReader.readAsDataURL(qrFileInput.files[0]);
                } else {
                    processWithQr(bannerUrl, '');
                }
            };
            reader.readAsDataURL(file);
        });
    }

    const openNewEventBtn = document.getElementById('openNewEventBtn');

    if (manageEventsModal && (openManageEventsNav || openNewEventBtn) && closeManageEventsModal) {
        const openEventsModal = (e) => {
            if (e) e.preventDefault();
            window.loadEventsTable();
            manageEventsModal.classList.add('show');
        };
        if (openManageEventsNav) openManageEventsNav.addEventListener('click', openEventsModal);
        if (openNewEventBtn) openNewEventBtn.addEventListener('click', openEventsModal);
        closeManageEventsModal.addEventListener('click', () => {
            manageEventsModal.classList.remove('show');
        });
        manageEventsModal.addEventListener('click', (e) => {
            if (e.target === manageEventsModal) manageEventsModal.classList.remove('show');
        });
    }

    // Event Registrations Sub-Modal Logic
    const eventRegistrationsModal = document.getElementById('eventRegistrationsModal');
    const closeEventRegistrationsModal = document.getElementById('closeEventRegistrationsModal');
    const eventRegistrationsTableBody = document.querySelector('#eventRegistrationsTable tbody');
    const regModalEventTitle = document.getElementById('regModalEventTitle');

    function openEventRegistrations(eventId, eventTitle) {
        if (regModalEventTitle) regModalEventTitle.textContent = `Registrations: ${eventTitle}`;
        window.loadEventRegistrationsTable(eventId);
        if (eventRegistrationsModal) eventRegistrationsModal.classList.add('show');
    }

    if (closeEventRegistrationsModal && eventRegistrationsModal) {
        closeEventRegistrationsModal.addEventListener('click', () => {
            eventRegistrationsModal.classList.remove('show');
        });
    }

    window.loadEventRegistrationsTable = (eventId) => {
        if (!eventRegistrationsTableBody) return;
        const regs = Database.getEventRegistrationsForEvent(eventId);
        if (regs.length === 0) {
            eventRegistrationsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No registrations yet.</td></tr>`;
            return;
        }

        eventRegistrationsTableBody.innerHTML = regs.map(reg => {
            const player = Database.getPlayerById(reg.playerId) || { name: 'Unknown', id: reg.playerId };
            
            let statusBadge = '<span class="badge badge-warning">Pending</span>';
            if (reg.status === 'Approved') statusBadge = '<span class="badge badge-success">Approved</span>';
            if (reg.status === 'Rejected') statusBadge = '<span class="badge badge-danger">Rejected</span>';

            const paymentView = reg.paymentScreenshotUrl 
                ? `<a href="${reg.paymentScreenshotUrl}" target="_blank" class="text-primary"><i class="fa-solid fa-receipt"></i> View Status</a>`
                : '<small class="text-muted">N/A</small>';

            const photoView = reg.fighterPhotoUrl
                ? `<img src="${reg.fighterPhotoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit:cover;">`
                : '<small class="text-muted">No Photo</small>';

            return `
            <tr>
                <td><strong>${player.name}</strong><br><small class="text-muted">${player.id}</small></td>
                <td>${photoView}</td>
                <td>${paymentView}</td>
                <td>${statusBadge}</td>
                <td>
                    ${reg.status === 'Pending' ? `
                        <button class="btn btn-sm btn-success approve-reg-btn mr-1" data-id="${reg.id}" data-eventid="${eventId}" style="padding: 0.2rem 0.4rem;"><i class="fa-solid fa-check"></i></button>
                        <button class="btn btn-sm text-danger reject-reg-btn" data-id="${reg.id}" data-eventid="${eventId}" style="padding: 0.2rem 0.4rem; background: transparent; border: 1px solid var(--error);"><i class="fa-solid fa-xmark"></i></button>
                    ` : '<small class="text-muted">Done</small>'}
                </td>
            </tr>
            `;
        }).join('');

        // Listeners for Approve / Reject Event Registration
        document.querySelectorAll('.approve-reg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const evtId = e.currentTarget.getAttribute('data-eventid');
                Database.approveEventRegistration(id);
                window.loadEventRegistrationsTable(evtId);
            });
        });
        document.querySelectorAll('.reject-reg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const evtId = e.currentTarget.getAttribute('data-eventid');
                Database.rejectEventRegistration(id);
                window.loadEventRegistrationsTable(evtId);
            });
        });
    };

    // Enquiries Logic
    const enquiriesModal = document.getElementById('enquiriesModal');
    const openEnquiriesNav = document.getElementById('openEnquiriesNav');
    const closeEnquiriesModal = document.getElementById('closeEnquiriesModal');
    const enquiriesTableBody = document.querySelector('#enquiriesTable tbody');

    window.loadEnquiries = () => {
        if (!enquiriesTableBody) return;

        const players = Database.getPlayers().filter(p => p.status === 'Pending');

        if(players.length === 0) {
            enquiriesTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No pending enquiries.</td></tr>`;
            return;
        }

        enquiriesTableBody.innerHTML = players.map(p => `
            <tr>
                <td><strong>${p.name}</strong><br><small class="text-muted">${p.id}</small></td>
                <td>${p.mobile || 'N/A'}</td>
                <td>
                    <small><strong>Plan:</strong> ${p.plan || 'None'}</small><br>
                    <small><strong>Batch:</strong> ${p.batch || 'None'}</small><br>
                    <small><strong>Gender:</strong> ${p.gender || 'N/A'}</small>
                </td>
                <td>
                    ${p.pdfDocument 
                        ? `<a href="${p.pdfDocument}" download="${p.name.replace(/\s+/g, '_')}_Document.pdf" class="btn btn-sm" style="padding: 0.25rem 0.5rem; background: var(--bg-light); border: 1px solid var(--border); border-radius: 4px; color: var(--text-dark); text-decoration: none; font-size: 0.8rem;"><i class="fa-solid fa-file-pdf text-danger"></i> View</a>` 
                        : '<span class="text-muted"><small>No File</small></span>'
                    }
                </td>
                <td>
                    <button class="btn btn-sm btn-success approve-enquiry-btn mr-1" style="padding: 0.25rem 0.5rem;" data-id="${p.id}"><i class="fa-solid fa-check"></i></button>
                    <button class="btn btn-sm text-danger reject-enquiry-btn" style="padding: 0.25rem 0.5rem; background: transparent; border: 1px solid var(--error);" data-id="${p.id}"><i class="fa-solid fa-xmark"></i></button>
                </td>
            </tr>
        `).join('');

        // Action listeners
        document.querySelectorAll('.approve-enquiry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if(confirm('Approve this enquiry and register them as an Active Member?')) {
                    Database.updatePlayerStatus(id, 'Active');
                    window.loadEnquiries(); // Refresh this modal
                    if(typeof loadAllMembers === 'function') {
                        loadAllMembers(); // Refresh the background table if visibly open
                    }
                }
            });
        });

        document.querySelectorAll('.reject-enquiry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if(confirm('Reject this enquiry? This will permanently delete the registration details.')) {
                    Database.deletePlayer(id);
                    window.loadEnquiries(); // Refresh
                }
            });
        });
    };

    if (enquiriesModal && openEnquiriesNav && closeEnquiriesModal) {
        openEnquiriesNav.addEventListener('click', (e) => {
            e.preventDefault();
            window.loadEnquiries();
            enquiriesModal.classList.add('show');
        });

        closeEnquiriesModal.addEventListener('click', () => {
            enquiriesModal.classList.remove('show');
        });

        enquiriesModal.addEventListener('click', (e) => {
            if (e.target === enquiriesModal) {
                enquiriesModal.classList.remove('show');
            }
        });
    }

    // ---- Task Management ----
    const manageTasksModal = document.getElementById('manageTasksModal');
    const openManageTasksNav = document.getElementById('openManageTasksNav');
    const closeManageTasksModal = document.getElementById('closeManageTasksModal');
    const addTaskForm = document.getElementById('addTaskForm');

    const loadAllTasks = () => {
        const tbody = document.querySelector('#allTasksTable tbody');
        if (!tbody) return;
        const tasks = Database.getTasks().sort((a, b) => new Date(b.date) - new Date(a.date));
        if (tasks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No tasks assigned yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = tasks.map(t => {
            const assignedLabel = t.assignedTo === 'All'
                ? '<span class="badge badge-success">All Members</span>'
                : Array.isArray(t.assignedTo)
                    ? t.assignedTo.map(id => {
                        const p = Database.getPlayerById(id);
                        return p ? `<span class="badge" style="background:#555; color:#fff; margin-right:2px;">${p.name}</span>` : id;
                    }).join('')
                    : t.assignedTo;
            return `<tr>
                <td>${new Date(t.date + 'T00:00:00').toLocaleDateString()}</td>
                <td><strong>${t.title}</strong></td>
                <td style="font-size:0.83rem; white-space: pre-wrap; max-width: 200px;">${t.description || '—'}</td>
                <td>${assignedLabel}</td>
                <td><button class="btn btn-sm btn-danger delete-task-btn" data-id="${t.id}" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;">
                    <i class="fa-solid fa-trash"></i>
                </button></td>
            </tr>`;
        }).join('');

        document.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Delete this task?')) {
                    Database.deleteTask(id);
                    loadAllTasks();
                }
            });
        });
    };

    const populateTaskMemberList = () => {
        const container = document.getElementById('taskMemberCheckboxList');
        if (!container) return;
        const players = Database.getPlayers().filter(p => p.status === 'Active');
        if (players.length === 0) {
            container.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">No active members found.</p>`;
            return;
        }
        container.innerHTML = players.map(p => `
            <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; cursor: pointer; font-size: 0.88rem;">
                <input type="checkbox" class="task-member-cb" value="${p.id}">
                ${p.name} <span class="text-muted" style="font-size:0.78rem;">(${p.id})</span>
            </label>`).join('');
    };

    if (openManageTasksNav) {
        openManageTasksNav.addEventListener('click', (e) => {
            e.preventDefault();
            // Default date to today
            const todayInput = document.getElementById('newTaskDate');
            if (todayInput) todayInput.value = new Date().toISOString().split('T')[0];
            populateTaskMemberList();
            loadAllTasks();
            manageTasksModal.classList.add('show');
        });
    }

    if (closeManageTasksModal) {
        closeManageTasksModal.addEventListener('click', () => manageTasksModal.classList.remove('show'));
    }
    if (manageTasksModal) {
        manageTasksModal.addEventListener('click', (e) => {
            if (e.target === manageTasksModal) manageTasksModal.classList.remove('show');
        });
    }

    // Toggle member picker visibility
    document.querySelectorAll('input[name="taskAssign"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const wrapper = document.getElementById('taskMemberPickerWrapper');
            if (wrapper) wrapper.style.display = radio.value === 'Specific' ? 'block' : 'none';
        });
    });

    if (addTaskForm) {
        addTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('newTaskTitle').value.trim();
            const desc = document.getElementById('newTaskDescription').value.trim();
            const date = document.getElementById('newTaskDate').value;
            const assignMode = document.querySelector('input[name="taskAssign"]:checked').value;
            const msgEl = document.getElementById('addTaskMsg');

            let assignedTo = 'All';
            if (assignMode === 'Specific') {
                const checked = [...document.querySelectorAll('.task-member-cb:checked')].map(cb => cb.value);
                if (checked.length === 0) {
                    msgEl.textContent = 'Please select at least one member.';
                    msgEl.style.cssText = 'display:block; color: var(--primary); font-size:0.85rem;';
                    return;
                }
                assignedTo = checked;
            }

            Database.addTask(title, desc, date, assignedTo);
            loadAllTasks();
            addTaskForm.reset();
            document.getElementById('taskMemberPickerWrapper').style.display = 'none';
            document.getElementById('newTaskDate').value = new Date().toISOString().split('T')[0];

            msgEl.textContent = 'Task assigned successfully!';
            msgEl.style.cssText = 'display:block; color: green; font-size:0.85rem;';
            setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
        });
    }

    // ---- Leave Requests (Admin) ----
    const leaveRequestsModal = document.getElementById('leaveRequestsModal');
    const openLeaveRequestsNav = document.getElementById('openLeaveRequestsNav');
    const closeLeaveRequestsModal = document.getElementById('closeLeaveRequestsModal');
    const leaveRequestsTableBody = document.getElementById('leaveRequestsTableBody');
    const leaveCountBadge = document.getElementById('leaveCountBadge');

    // Update the pending badge count on the sidebar
    const refreshLeaveBadge = () => {
        if (!leaveCountBadge) return;
        const count = Database.getPendingLeaveCount();
        if (count > 0) {
            leaveCountBadge.textContent = count;
            leaveCountBadge.style.display = 'inline-flex';
        } else {
            leaveCountBadge.style.display = 'none';
        }
    };

    let currentLeaveFilter = 'All';

    const loadLeaveRequests = () => {
        if (!leaveRequestsTableBody) return;
        let leaves = Database.getLeaveApplications();

        if (currentLeaveFilter !== 'All') {
            leaves = leaves.filter(l => l.status === currentLeaveFilter);
        }

        if (leaves.length === 0) {
            leaveRequestsTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:2rem;">No leave applications found.</td></tr>`;
            return;
        }

        const statusBadge = (s) => {
            if (s === 'Approved') return `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Approved</span>`;
            if (s === 'Rejected') return `<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>`;
            return `<span class="badge badge-warning"><i class="fa-solid fa-hourglass-half"></i> Pending</span>`;
        };

        const actionBtns = (leave) => {
            if (leave.status !== 'Pending') {
                return `<span style="color:var(--text-muted);font-size:0.8rem;">Reviewed</span>`;
            }
            return `
                <button class="btn btn-sm btn-success approve-leave-btn" data-id="${leave.id}" style="margin-right:4px;padding:0.3rem 0.6rem;font-size:0.78rem;">
                    <i class="fa-solid fa-check"></i> Approve
                </button>
                <button class="btn btn-sm btn-danger reject-leave-btn" data-id="${leave.id}" style="padding:0.3rem 0.6rem;font-size:0.78rem;">
                    <i class="fa-solid fa-xmark"></i> Reject
                </button>`;
        };

        leaveRequestsTableBody.innerHTML = leaves.map(l => {
            const fromFmt = new Date(l.fromDate + 'T00:00:00').toLocaleDateString();
            const toFmt   = new Date(l.toDate   + 'T00:00:00').toLocaleDateString();
            const dateRange = l.fromDate === l.toDate ? fromFmt : `${fromFmt} –<br>${toFmt}`;
            const applied = new Date(l.appliedAt).toLocaleDateString();
            return `
            <tr>
                <td><strong>${l.playerName}</strong><br><small class="text-muted">${l.playerId}</small></td>
                <td style="white-space:nowrap;">${dateRange}</td>
                <td style="max-width:160px;word-break:break-word;font-size:0.85rem;">${l.reason}</td>
                <td>${l.parentPhone}</td>
                <td style="white-space:nowrap;">${applied}</td>
                <td>${statusBadge(l.status)}</td>
                <td>${actionBtns(l)}</td>
            </tr>`;
        }).join('');

        // Bind action buttons
        leaveRequestsTableBody.querySelectorAll('.approve-leave-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Approve this leave application? Attendance will be marked as "Leave" for those dates.')) {
                    Database.updateLeaveStatus(id, 'Approved');
                    loadLeaveRequests();
                    refreshLeaveBadge();
                }
            });
        });

        leaveRequestsTableBody.querySelectorAll('.reject-leave-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Reject this leave application?')) {
                    Database.updateLeaveStatus(id, 'Rejected');
                    loadLeaveRequests();
                    refreshLeaveBadge();
                }
            });
        });
    };

    // Leave filter tabs
    document.querySelectorAll('.leave-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.leave-filter-btn').forEach(b => {
                b.classList.remove('btn-primary', 'active');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary', 'active');
            currentLeaveFilter = btn.getAttribute('data-filter');
            loadLeaveRequests();
        });
    });

    if (leaveRequestsModal && openLeaveRequestsNav && closeLeaveRequestsModal) {
        openLeaveRequestsNav.addEventListener('click', (e) => {
            e.preventDefault();
            loadLeaveRequests();
            leaveRequestsModal.classList.add('show');
        });
        closeLeaveRequestsModal.addEventListener('click', () => leaveRequestsModal.classList.remove('show'));
        leaveRequestsModal.addEventListener('click', (e) => {
            if (e.target === leaveRequestsModal) leaveRequestsModal.classList.remove('show');
        });
    }

    // Initialize badge on page load
    refreshLeaveBadge();

    // ---- Diet Plans (Admin) ----
    const dietPlansModal     = document.getElementById('dietPlansModal');
    const openDietPlansNav   = document.getElementById('openDietPlansNav');
    const closeDietPlansModal= document.getElementById('closeDietPlansModal');
    const addDietPlanForm    = document.getElementById('addDietPlanForm');
    const dietPlansList      = document.getElementById('dietPlansList');
    const dietPlanFormMsg    = document.getElementById('dietPlanFormMsg');
    const dietPlanCategory   = document.getElementById('dietPlanCategory');
    const dietIndividualPicker = document.getElementById('dietIndividualPicker');

    const catConfig = {
        'General':     { color: '#3b82f6', emoji: '🌐', badge: 'badge-secondary' },
        'Weight Loss': { color: '#ef4444', emoji: '🔥', badge: 'badge-danger'    },
        'Weight Gain': { color: '#10b981', emoji: '💪', badge: 'badge-success'   },
        'Individual':  { color: '#8b5cf6', emoji: '👤', badge: 'badge-warning'   }
    };

    const showDietMsg = (msg, ok = true) => {
        if (!dietPlanFormMsg) return;
        dietPlanFormMsg.textContent = msg;
        dietPlanFormMsg.style.display = 'block';
        dietPlanFormMsg.style.background = ok ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.1)';
        dietPlanFormMsg.style.color = ok ? '#10b981' : '#dc2626';
        dietPlanFormMsg.style.border = `1px solid ${ok ? '#10b981' : '#dc2626'}`;
        setTimeout(() => { dietPlanFormMsg.style.display = 'none'; }, 3000);
    };

    let currentDietFilter = 'All';

    const loadDietPlans = () => {
        if (!dietPlansList) return;
        let plans = Database.getDietPlans();
        if (currentDietFilter !== 'All') plans = plans.filter(p => p.category === currentDietFilter);

        if (plans.length === 0) {
            dietPlansList.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);"><i class="fa-solid fa-bowl-food fa-2x" style="opacity:0.25;margin-bottom:0.75rem;display:block;"></i><p>No diet plans yet. Add one above.</p></div>`;
            return;
        }

        dietPlansList.innerHTML = plans.map(p => {
            const cfg = catConfig[p.category] || catConfig['General'];
            const created = new Date(p.createdAt).toLocaleDateString();
            const targetLabel = p.category === 'Individual' && p.targetPlayerId
                ? `<span style="font-size:0.78rem;color:var(--text-muted);">→ ${p.targetPlayerId}</span>` : '';
            const fileBtn = p.fileUrl
                ? `<a href="${p.fileUrl}" download="diet-plan" style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.8rem;font-weight:600;color:${cfg.color};background:${cfg.color}18;padding:0.3rem 0.75rem;border-radius:20px;text-decoration:none;margin-top:0.5rem;">
                      <i class="fa-solid fa-file-arrow-down"></i> Download Attachment
                   </a>` : '';
            const descHtml = p.description.replace(/\n/g, '<br>');
            return `
            <div style="background:var(--bg-light);border:1px solid var(--border);border-left:5px solid ${cfg.color};border-radius:12px;padding:1rem 1.1rem;margin-bottom:0.85rem;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem;flex-wrap:wrap;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.3rem;flex-wrap:wrap;">
                            <span style="font-size:1.1rem;">${cfg.emoji}</span>
                            <strong style="font-size:0.95rem;color:var(--text-dark);">${p.title}</strong>
                            <span class="badge ${cfg.badge}" style="font-size:0.7rem;">${p.category}</span>
                            ${targetLabel}
                        </div>
                        <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;white-space:pre-wrap;margin-top:0.4rem;">${descHtml}</div>
                        ${fileBtn}
                        <p style="margin:0.5rem 0 0;font-size:0.75rem;color:var(--text-muted);">Added: ${created}</p>
                    </div>
                    <button class="btn btn-sm btn-danger delete-diet-btn" data-id="${p.id}" style="flex-shrink:0;padding:0.35rem 0.7rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');

        dietPlansList.querySelectorAll('.delete-diet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this diet plan?')) {
                    Database.deleteDietPlan(btn.getAttribute('data-id'));
                    loadDietPlans();
                }
            });
        });
    };

    // Show/hide individual member picker
    if (dietPlanCategory) {
        dietPlanCategory.addEventListener('change', () => {
            const isIndividual = dietPlanCategory.value === 'Individual';
            dietIndividualPicker.style.display = isIndividual ? 'block' : 'none';
        });
    }

    // Populate member picker
    const populateDietMemberPicker = () => {
        const sel = document.getElementById('dietTargetPlayer');
        if (!sel) return;
        const players = Database.getPlayers().filter(p => p.status === 'Active');
        sel.innerHTML = '<option value="">Select member...</option>' +
            players.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');
    };

    // Diet filter tabs
    document.querySelectorAll('.diet-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diet-filter-btn').forEach(b => {
                b.classList.remove('btn-primary', 'active');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary', 'active');
            currentDietFilter = btn.getAttribute('data-filter');
            loadDietPlans();
        });
    });

    if (addDietPlanForm) {
        addDietPlanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('dietPlanTitle').value.trim();
            const category = document.getElementById('dietPlanCategory').value;
            const description = document.getElementById('dietPlanDescription').value.trim();
            const targetPlayerId = document.getElementById('dietTargetPlayer')?.value || '';
            const fileInput = document.getElementById('dietPlanFile');

            if (!title || !category || !description) {
                showDietMsg('Please fill all required fields.', false); return;
            }
            if (category === 'Individual' && !targetPlayerId) {
                showDietMsg('Please select a member for Individual plan.', false); return;
            }

            const savePlan = (fileUrl = '') => {
                Database.addDietPlan(title, category, description, fileUrl, targetPlayerId);
                addDietPlanForm.reset();
                dietIndividualPicker.style.display = 'none';
                loadDietPlans();
                showDietMsg('Diet plan added successfully!');
            };

            const file = fileInput?.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => savePlan(ev.target.result);
                reader.readAsDataURL(file);
            } else {
                savePlan();
            }
        });
    }

    if (dietPlansModal && openDietPlansNav && closeDietPlansModal) {
        openDietPlansNav.addEventListener('click', (e) => {
            e.preventDefault();
            populateDietMemberPicker();
            loadDietPlans();
            dietPlansModal.classList.add('show');
        });
        closeDietPlansModal.addEventListener('click', () => dietPlansModal.classList.remove('show'));
        dietPlansModal.addEventListener('click', (e) => {
            if (e.target === dietPlansModal) dietPlansModal.classList.remove('show');
        });
    }

});

// =============================================
// TRAINING PROGRESS TRACKER — ADMIN SIDE
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Database === 'undefined') return;
    if (!document.getElementById('trainingMonitorModal')) return; // only run on admin page

    // --- Helpers ---
    const openModal  = (id) => document.getElementById(id)?.classList.add('show');
    const closeModal = (id) => document.getElementById(id)?.classList.remove('show');

    const showMsg = (id, text, isError = false) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        el.style.background = isError ? 'rgba(220,38,38,0.1)' : 'rgba(16,185,129,0.1)';
        el.style.color = isError ? '#dc2626' : '#059669';
        el.style.border = `1px solid ${isError ? '#dc2626' : '#059669'}`;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 3000);
    };

    const starsHtml = (rating, max = 5) => {
        let h = '<span class="tp-stars">';
        for (let i = 1; i <= max; i++) h += `<i class="fa-solid fa-star${i > rating ? ' empty' : ''}"></i>`;
        return h + '</span>';
    };

    const adminCharts = {};
    const destroyChart = (key) => { if (adminCharts[key]) { adminCharts[key].destroy(); adminCharts[key] = null; } };
    const makeChart = (key, canvasId, type, labels, datasets, opts = {}) => {
        destroyChart(key);
        const el = document.getElementById(canvasId);
        if (!el) return;
        adminCharts[key] = new Chart(el.getContext('2d'), {
            type,
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: opts.legend ?? false } },
                scales: { y: { beginAtZero: true } },
                ...opts.extra
            }
        });
    };

    const getAllMembers = () => Database.getPlayers().filter(p => p.status === 'Active');

    const filterLogsByDate = (logs, days) => {
        if (days === 'all') return logs;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(days));
        return logs.filter(l => new Date(l.date) >= cutoff);
    };

    const sumLog = (log, field) => {
        if (field === 'punches') return log.punches.jab + log.punches.cross + log.punches.hook + log.punches.uppercut;
        if (field === 'kicks') return log.kicks.front + log.kicks.roundhouse + log.kicks.side + log.kicks.low;
        if (field === 'conditioning') return log.conditioning.pushups + log.conditioning.squats + log.conditioning.situps + log.conditioning.skipping;
        return 0;
    };

    // ===== TRAINING MONITOR =====
    const renderTrainingMonitor = () => {
        const memberFilter = document.getElementById('tmMemberFilter')?.value || 'All';
        const dateFilter = document.getElementById('tmDateFilter')?.value || '7';
        let logs = Database.getAllTrainingLogs();
        logs = filterLogsByDate(logs, dateFilter);
        if (memberFilter !== 'All') logs = logs.filter(l => l.playerId === memberFilter);

        // Stats
        const statGrid = document.getElementById('tmStatGrid');
        if (statGrid) {
            const totalPunches = logs.reduce((s, l) => s + sumLog(l, 'punches'), 0);
            const totalKicks   = logs.reduce((s, l) => s + sumLog(l, 'kicks'), 0);
            const totalLogs    = logs.length;
            const uniquePlayers = new Set(logs.map(l => l.playerId)).size;
            statGrid.innerHTML = [
                { v: totalLogs, l: 'Sessions Logged' },
                { v: uniquePlayers, l: 'Active Members' },
                { v: totalPunches.toLocaleString(), l: 'Total Punches' },
                { v: totalKicks.toLocaleString(), l: 'Total Kicks' }
            ].map(s => `<div class="tp-stat-card"><div class="tp-stat-value">${s.v}</div><div class="tp-stat-label">${s.l}</div></div>`).join('');
        }

        // Chart — last 7 days
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        const dayLabels = days.map(d => new Date(d).toLocaleDateString('en', { weekday: 'short' }));
        const dayPunches = days.map(d => logs.filter(l => l.date === d).reduce((s, l) => s + sumLog(l, 'punches'), 0));
        const dayKicks   = days.map(d => logs.filter(l => l.date === d).reduce((s, l) => s + sumLog(l, 'kicks'), 0));

        makeChart('tmActivity', 'tmActivityChart', 'bar', dayLabels, [
            { label: 'Punches', data: dayPunches, backgroundColor: 'rgba(255,0,0,0.7)', borderRadius: 4 },
            { label: 'Kicks', data: dayKicks, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 }
        ], { legend: true });

        // Table
        const tbody = document.querySelector('#tmLogsTable tbody');
        if (tbody) {
            tbody.innerHTML = logs.length === 0
                ? '<tr><td colspan="7" class="text-center text-muted">No logs found.</td></tr>'
                : logs.map(l => `<tr>
                    <td>${l.date}</td>
                    <td>${l.playerName}</td>
                    <td>${sumLog(l, 'punches')}</td>
                    <td>${sumLog(l, 'kicks')}</td>
                    <td>${sumLog(l, 'conditioning')}</td>
                    <td>${l.bagWork.rounds}</td>
                    <td>${l.sparring.rounds} ${l.sparring.partner ? '(' + l.sparring.partner + ')' : ''}</td>
                </tr>`).join('');
        }
    };

    const tmNav = document.getElementById('openTrainingMonitorNav');
    const tmModal = document.getElementById('trainingMonitorModal');
    const closeTm = document.getElementById('closeTrainingMonitorModal');
    const tmMemberFilter = document.getElementById('tmMemberFilter');
    const tmDateFilter = document.getElementById('tmDateFilter');

    if (tmNav) {
        tmNav.addEventListener('click', e => {
            e.preventDefault();
            // populate member filter
            if (tmMemberFilter) {
                const members = getAllMembers();
                tmMemberFilter.innerHTML = '<option value="All">All Members</option>' +
                    members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
            }
            renderTrainingMonitor();
            openModal('trainingMonitorModal');
        });
    }
    if (closeTm) closeTm.addEventListener('click', () => closeModal('trainingMonitorModal'));
    if (tmModal) tmModal.addEventListener('click', e => { if (e.target === tmModal) closeModal('trainingMonitorModal'); });
    if (tmMemberFilter) tmMemberFilter.addEventListener('change', renderTrainingMonitor);
    if (tmDateFilter) tmDateFilter.addEventListener('change', renderTrainingMonitor);

    // ===== SKILL EVALUATION =====
    const skillModal = document.getElementById('skillEvalModal');
    const closeSkill = document.getElementById('closeSkillEvalModal');
    const skillNav = document.getElementById('openSkillEvalNav');
    const skillForm = document.getElementById('skillEvalForm');
    const allEvalsEl = document.getElementById('allEvalsContainer');

    const loadSkillEvals = () => {
        if (!allEvalsEl) return;
        const evals = Database.getSkillEvaluations();
        if (evals.length === 0) {
            allEvalsEl.innerHTML = '<p class="text-center text-muted" style="font-size:0.88rem;">No evaluations yet.</p>';
            return;
        }
        allEvalsEl.innerHTML = evals.map(e => {
            const skills = [
                { l: 'Punch', v: e.ratings.punch }, { l: 'Kick', v: e.ratings.kick },
                { l: 'Speed', v: e.ratings.speed }, { l: 'Defense', v: e.ratings.defense },
                { l: 'Stamina', v: e.ratings.stamina }
            ];
            return `<div class="dash-card" style="margin-bottom:0.75rem;padding:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                    <strong style="font-size:0.95rem;">${e.playerName}</strong>
                    <small class="text-muted">${new Date(e.createdAt).toLocaleDateString()}</small>
                </div>
                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.4rem;margin-bottom:0.5rem;">
                    ${skills.map(s => `<div style="text-align:center;font-size:0.78rem;"><div style="color:var(--text-muted);">${s.l}</div>${starsHtml(s.v)}</div>`).join('')}
                </div>
                ${e.comment ? `<p style="font-size:0.82rem;margin:0.3rem 0 0;color:var(--text-muted);"><strong>Comment:</strong> ${e.comment}</p>` : ''}
            </div>`;
        }).join('');
    };

    if (skillNav) {
        skillNav.addEventListener('click', e => {
            e.preventDefault();
            const evalMemberSelect = document.getElementById('evalMemberSelect');
            if (evalMemberSelect) {
                const members = getAllMembers();
                evalMemberSelect.innerHTML = '<option value="">Select a member...</option>' +
                    members.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name}</option>`).join('');
            }
            loadSkillEvals();
            openModal('skillEvalModal');
        });
    }
    if (closeSkill) closeSkill.addEventListener('click', () => closeModal('skillEvalModal'));
    if (skillModal) skillModal.addEventListener('click', e => { if (e.target === skillModal) closeModal('skillEvalModal'); });

    if (skillForm) {
        skillForm.addEventListener('submit', e => {
            e.preventDefault();
            const sel = document.getElementById('evalMemberSelect');
            const playerId = sel?.value;
            const playerName = sel?.options[sel.selectedIndex]?.dataset.name || '';
            if (!playerId) { showMsg('evalFormMsg', 'Please select a member.', true); return; }
            const g = id => parseInt(document.getElementById(id)?.value) || 1;
            const ratings = {
                punch: g('evalPunch'), kick: g('evalKick'),
                speed: g('evalSpeed'), defense: g('evalDefense'),
                stamina: g('evalStamina')
            };
            const comment = document.getElementById('evalComment')?.value.trim() || '';
            const suggestions = document.getElementById('evalSuggestions')?.value.trim() || '';
            Database.addSkillEvaluation(playerId, playerName, ratings, comment, suggestions);
            showMsg('evalFormMsg', '✅ Evaluation saved!');
            skillForm.reset();
            loadSkillEvals();
        });
    }

    // ===== PROGRESS REPORTS =====
    const reportsNav = document.getElementById('openReportsNav');
    const reportsModal = document.getElementById('reportsModal');
    const closeReports = document.getElementById('closeReportsModal');
    let currentReportPeriod = 'weekly';

    const renderReports = (period = 'weekly') => {
        const isWeekly = period === 'weekly';
        const days = isWeekly ? 7 : 30;
        const allLogs = Database.getAllTrainingLogs();
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
        const logs = allLogs.filter(l => new Date(l.date) >= cutoff);

        const statGrid = document.getElementById('reportStatGrid');
        if (statGrid) {
            const totP = logs.reduce((s, l) => s + sumLog(l, 'punches'), 0);
            const totK = logs.reduce((s, l) => s + sumLog(l, 'kicks'), 0);
            const totC = logs.reduce((s, l) => s + sumLog(l, 'conditioning'), 0);
            statGrid.innerHTML = [
                { v: logs.length, l: 'Total Sessions' },
                { v: new Set(logs.map(l => l.playerId)).size, l: 'Members Active' },
                { v: totP.toLocaleString(), l: 'Punches' },
                { v: totK.toLocaleString(), l: 'Kicks' },
                { v: totC.toLocaleString(), l: 'Conditioning Reps' }
            ].map(s => `<div class="tp-stat-card"><div class="tp-stat-value">${s.v}</div><div class="tp-stat-label">${s.l}</div></div>`).join('');
        }

        // Build date labels
        const labels = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            labels.push(d.toISOString().split('T')[0]);
        }
        const lLabels = labels.map(d => isWeekly
            ? new Date(d).toLocaleDateString('en', { weekday: 'short' })
            : new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' }));

        const dayData = (field) => labels.map(d => logs.filter(l => l.date === d).reduce((s, l) => s + sumLog(l, field), 0));

        makeChart('rPunch', 'reportPunchChart', 'bar', lLabels, [{
            label: 'Punches', data: dayData('punches'),
            backgroundColor: 'rgba(255,0,0,0.6)', borderRadius: 3
        }]);
        makeChart('rKick', 'reportKickChart', 'line', lLabels, [{
            label: 'Kicks', data: dayData('kicks'),
            borderColor: 'rgba(59,130,246,1)', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4
        }]);
        makeChart('rCond', 'reportCondChart', 'bar', lLabels, [{
            label: 'Conditioning', data: dayData('conditioning'),
            backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 3
        }]);
        const dayCount = labels.map(d => logs.filter(l => l.date === d).length);
        makeChart('rDays', 'reportDaysChart', 'bar', lLabels, [{
            label: 'Sessions', data: dayCount,
            backgroundColor: 'rgba(245,158,11,0.6)', borderRadius: 3
        }]);
    };

    if (reportsNav) {
        reportsNav.addEventListener('click', e => {
            e.preventDefault();
            currentReportPeriod = 'weekly';
            document.querySelectorAll('[data-report]').forEach(b => b.classList.remove('active'));
            document.getElementById('reportWeeklyBtn')?.classList.add('active');
            renderReports('weekly');
            openModal('reportsModal');
        });
    }
    if (closeReports) closeReports.addEventListener('click', () => closeModal('reportsModal'));
    if (reportsModal) reportsModal.addEventListener('click', e => { if (e.target === reportsModal) closeModal('reportsModal'); });

    document.querySelectorAll('[data-report]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-report]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderReports(btn.dataset.report);
        });
    });

    // ===== LEADERBOARD =====
    const lbNav = document.getElementById('openLeaderboardNav');
    const lbModal = document.getElementById('leaderboardModal');
    const closeLb = document.getElementById('closeLeaderboardModal');
    let currentLbType = 'punches';

    const renderLeaderboard = (type) => {
        const lbContainer = document.getElementById('leaderboardContainer');
        if (!lbContainer) return;
        const logs = Database.getAllTrainingLogs();
        const players = getAllMembers();
        const playerMap = {};
        players.forEach(p => { playerMap[p.id] = { name: p.name, id: p.id, total: 0 }; });

        logs.forEach(l => {
            if (!playerMap[l.playerId]) playerMap[l.playerId] = { name: l.playerName, id: l.playerId, total: 0 };
            let val = 0;
            if (type === 'punches') val = sumLog(l, 'punches');
            else if (type === 'kicks') val = sumLog(l, 'kicks');
            else if (type === 'conditioning') val = sumLog(l, 'conditioning');
            else if (type === 'active') val = 1;
            playerMap[l.playerId].total += val;
        });

        const ranked = Object.values(playerMap).sort((a, b) => b.total - a.total).filter(p => p.total > 0);
        if (ranked.length === 0) {
            lbContainer.innerHTML = '<p class="text-center text-muted" style="padding:2rem;">No data yet. Members need to log training first!</p>';
            return;
        }
        const typeLabel = type === 'punches' ? 'Punches' : type === 'kicks' ? 'Kicks' : type === 'conditioning' ? 'Conditioning' : 'Sessions';
        const maxVal = ranked[0].total;

        lbContainer.innerHTML = ranked.slice(0, 20).map((p, i) => {
            const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
            const pct = Math.round((p.total / maxVal) * 100);
            return `<div class="tp-leaderboard-row">
                <div class="tp-rank-badge ${rankCls}">${i + 1}</div>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:0.9rem;">${p.name}</div>
                    <div class="tp-progress-bar-container" style="margin-top:4px;"><div class="tp-progress-bar-fill" style="width:${pct}%;"></div></div>
                </div>
                <div style="text-align:right;font-weight:700;font-size:0.95rem;color:var(--primary);">${p.total.toLocaleString()}<br><small class="text-muted" style="font-size:0.72rem;">${typeLabel}</small></div>
            </div>`;
        }).join('');
    };

    if (lbNav) {
        lbNav.addEventListener('click', e => {
            e.preventDefault();
            currentLbType = 'punches';
            document.querySelectorAll('[data-lb]').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-lb="punches"]')?.classList.add('active');
            renderLeaderboard('punches');
            openModal('leaderboardModal');
        });
    }
    if (closeLb) closeLb.addEventListener('click', () => closeModal('leaderboardModal'));
    if (lbModal) lbModal.addEventListener('click', e => { if (e.target === lbModal) closeModal('leaderboardModal'); });

    document.querySelectorAll('[data-lb]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-lb]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderLeaderboard(btn.dataset.lb);
        });
    });

    // ===== CHALLENGES =====
    const chalNav = document.getElementById('openChallengesNav');
    const chalModal = document.getElementById('challengesModal');
    const closeChal = document.getElementById('closeChallengesModal');
    const chalForm = document.getElementById('addChallengeForm');

    const loadChallenges = () => {
        const listEl = document.getElementById('challengesList');
        if (!listEl) return;
        const challenges = Database.getTrainingChallenges();
        if (challenges.length === 0) {
            listEl.innerHTML = '<p class="text-center text-muted" style="padding:1rem;">No challenges yet. Create the first one!</p>';
            return;
        }
        listEl.innerHTML = challenges.map(c => {
            const typeLabel = c.type === 'punches' ? '🥊 Punches' : c.type === 'kicks' ? '🦵 Kicks'
                : c.type === 'conditioning' ? '💪 Conditioning' : '🔥 Streak (Days)';
            const rewardHtml = c.reward
                ? `<div style="margin-top:0.4rem;display:flex;align-items:center;gap:0.4rem;">
                    <i class="fa-solid fa-gift" style="color:#f59e0b;font-size:0.82rem;"></i>
                    <span style="font-size:0.82rem;color:#b45309;font-weight:600;">Reward: ${c.reward}</span>
                  </div>`
                : `<div style="margin-top:0.3rem;font-size:0.78rem;color:var(--text-muted);font-style:italic;">No reward set — click Fill Reward to add one</div>`;
            const chalId = c.id;
            const chalRewardEsc = (c.reward || '').replace(/`/g, '');
            return `<div class="dash-card" style="margin-bottom:0.75rem;padding:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
                    <div style="flex:1;min-width:0;">
                        <strong style="font-size:0.95rem;">${c.title}</strong>
                        <span style="font-size:0.78rem;color:var(--text-muted);margin-left:0.5rem;">${typeLabel}</span>
                        <p style="font-size:0.82rem;color:var(--text-muted);margin:0.25rem 0 0;">${c.description}</p>
                        <div style="margin-top:0.4rem;">
                            <span class="badge badge-secondary" style="font-size:0.75rem;">Target: ${c.targetValue.toLocaleString()}</span>
                            <span class="badge badge-primary" style="font-size:0.75rem;margin-left:0.3rem;">${c.completions.length} completed</span>
                        </div>
                        ${rewardHtml}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;flex-shrink:0;">
                        <button class="chal-reward-btn btn btn-sm"
                            data-chal-id="${chalId}"
                            data-chal-reward="${chalRewardEsc}"
                            style="border:1px solid #f59e0b;color:#b45309;background:rgba(245,158,11,0.08);white-space:nowrap;">
                            <i class="fa-solid fa-gift"></i> Fill Reward
                        </button>
                        <button class="chal-delete-btn btn btn-sm"
                            data-chal-id="${chalId}"
                            style="border:1px solid var(--primary);color:var(--primary);background:transparent;">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        // Attach Fill Reward button handlers
        listEl.querySelectorAll('.chal-reward-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.chalId;
                const current = btn.dataset.chalReward || '';
                const newReward = prompt('Enter reward for completing this challenge (leave empty to remove):', current);
                if (newReward === null) return; // cancelled
                Database.updateChallengeReward(id, newReward.trim());
                loadChallenges();
            });
        });

        // Attach delete button handlers
        listEl.querySelectorAll('.chal-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('Delete this challenge?')) return;
                Database.deleteTrainingChallenge(btn.dataset.chalId);
                loadChallenges();
            });
        });
    };

    if (chalNav) {
        chalNav.addEventListener('click', e => {
            e.preventDefault();
            loadChallenges();
            openModal('challengesModal');
        });
    }
    if (closeChal) closeChal.addEventListener('click', () => closeModal('challengesModal'));
    if (chalModal) chalModal.addEventListener('click', e => { if (e.target === chalModal) closeModal('challengesModal'); });

    if (chalForm) {
        chalForm.addEventListener('submit', e => {
            e.preventDefault();
            const title  = document.getElementById('chalTitle')?.value.trim();
            const desc   = document.getElementById('chalDesc')?.value.trim();
            const target = document.getElementById('chalTarget')?.value;
            const type   = document.getElementById('chalType')?.value;
            const reward = document.getElementById('chalReward')?.value.trim() || '';
            if (!title || !target) { showMsg('chalFormMsg', 'Please fill required fields.', true); return; }
            Database.addTrainingChallenge(title, desc, target, type, reward);
            showMsg('chalFormMsg', '✅ Challenge created!');
            chalForm.reset();
            loadChallenges();
        });
    }

    // ===== TRAINING NOTIFICATIONS =====
    const tNotifNav = document.getElementById('openTrainingNotifNav');
    const tNotifModal = document.getElementById('trainingNotifModal');
    const closeTNotif = document.getElementById('closeTrainingNotifModal');
    const tNotifForm = document.getElementById('addTrainingNotifForm');

    const loadSentNotifs = () => {
        const listEl = document.getElementById('sentNotifsList');
        if (!listEl) return;
        const notifs = Database.getTrainingNotifications();
        if (notifs.length === 0) {
            listEl.innerHTML = '<p class="text-center text-muted" style="padding:1rem;">No notifications sent yet.</p>';
            return;
        }
        listEl.innerHTML = notifs.map(n => `<div class="dash-card" style="margin-bottom:0.6rem;padding:0.9rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <strong style="font-size:0.9rem;">${n.title}</strong>
                    <span style="font-size:0.78rem;color:var(--text-muted);margin-left:0.5rem;">→ ${n.audience === 'All' ? 'All Members' : n.audience}</span>
                    <p style="font-size:0.82rem;color:var(--text-muted);margin:0.2rem 0 0;">${n.message}</p>
                    <small class="text-muted">${new Date(n.createdAt).toLocaleDateString()}</small>
                </div>
                <button class="btn btn-sm" style="border:1px solid var(--primary);color:var(--primary);background:transparent;flex-shrink:0;" onclick="(function(){
                    Database.deleteTrainingNotification('${n.id}');
                    document.getElementById('openTrainingNotifNav').click();
                })()"><i class='fa-solid fa-trash-can'></i></button>
            </div>
        </div>`).join('');
    };

    if (tNotifNav) {
        tNotifNav.addEventListener('click', e => {
            e.preventDefault();
            // Populate batch options
            const audSel = document.getElementById('tNotifAudience');
            if (audSel) {
                const batches = [...new Set(getAllMembers().map(m => m.batch).filter(Boolean))];
                audSel.innerHTML = '<option value="All">All Members</option>' +
                    batches.map(b => `<option value="${b}">${b}</option>`).join('');
            }
            loadSentNotifs();
            openModal('trainingNotifModal');
        });
    }
    if (closeTNotif) closeTNotif.addEventListener('click', () => closeModal('trainingNotifModal'));
    if (tNotifModal) tNotifModal.addEventListener('click', e => { if (e.target === tNotifModal) closeModal('trainingNotifModal'); });

    if (tNotifForm) {
        tNotifForm.addEventListener('submit', e => {
            e.preventDefault();
            const title    = document.getElementById('tNotifTitle')?.value.trim();
            const message  = document.getElementById('tNotifMessage')?.value.trim();
            const audience = document.getElementById('tNotifAudience')?.value || 'All';
            if (!title || !message) { showMsg('tNotifFormMsg', 'Please fill all fields.', true); return; }
            Database.addTrainingNotification(title, message, audience);
            showMsg('tNotifFormMsg', '✅ Notification sent!');
            tNotifForm.reset();
            loadSentNotifs();
        });
    }
});
// =============================================
// BANNER UPLOAD — SMART PREVIEW & SIZE ADVISOR
// =============================================
(function () {
    document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    /**
     * Config for each upload input.
     * idealW × idealH = recommended dimensions (px)
     * label          = human-readable context label
     */
    const BANNER_CONFIGS = [
        {
            inputId: 'newBannerImage',
            label: 'Home Page Banner',
            idealW: 1920,
            idealH: 600,
            note: 'Full-width hero banner displayed on the home page.'
        },
        {
            inputId: 'newAnnImage',
            label: 'Announcement / Chat Photo',
            idealW: 1200,
            idealH: 630,
            note: 'Displayed inside announcement cards (social-share friendly 1.91:1 ratio).'
        },
        {
            inputId: 'newEventBanner',
            label: 'Event Banner',
            idealW: 1200,
            idealH: 400,
            note: 'Shown as the event card thumbnail (3:1 landscape ratio).'
        }
    ];

    // Suffix for the advisory panel IDs
    const PANEL_SUFFIX = '_bannerAdvisor';

    /**
     * Build or refresh the advisory panel below the given input.
     * @param {HTMLInputElement} input
     * @param {object}           cfg    - entry from BANNER_CONFIGS
     * @param {Image}            img    - loaded Image object
     */
    function renderAdvisory(input, cfg, img) {
        const panelId = cfg.inputId + PANEL_SUFFIX;
        let panel = document.getElementById(panelId);

        if (!panel) {
            panel = document.createElement('div');
            panel.id = panelId;
            input.parentNode.insertBefore(panel, input.nextSibling);
        }

        const W = img.naturalWidth;
        const H = img.naturalHeight;
        const ratio = H > 0 ? (W / H).toFixed(2) : '—';
        const idealRatio = (cfg.idealW / cfg.idealH).toFixed(2);

        // --- quality assessment ---
        const tooSmall  = W < cfg.idealW * 0.5 || H < cfg.idealH * 0.5;
        const wayTooBig = W > cfg.idealW * 3    || H > cfg.idealH * 3;
        const tooWide   = W / H > (cfg.idealW / cfg.idealH) * 1.30;
        const tooTall   = H / W > (cfg.idealH / cfg.idealW) * 1.30;
        const nearIdeal = !tooSmall && !tooWide && !tooTall;

        let statusIcon, statusColor, statusText, cropTip;
        if (tooSmall) {
            statusIcon  = '⚠️';
            statusColor = '#b45309';
            statusText  = 'Too Small';
            cropTip     = `Image resolution is low. Upload at least ${Math.round(cfg.idealW * 0.5)} × ${Math.round(cfg.idealH * 0.5)} px for a clear result.`;
        } else if (tooWide) {
            statusIcon  = '✂️';
            statusColor = '#1d4ed8';
            statusText  = 'Too Wide';
            cropTip     = `Crop the sides to roughly a ${cfg.idealW}:${cfg.idealH} ratio. Current width is much larger relative to height than needed.`;
        } else if (tooTall) {
            statusIcon  = '✂️';
            statusColor = '#6d28d9';
            statusText  = 'Too Tall';
            cropTip     = `Crop top/bottom to a ${cfg.idealW}:${cfg.idealH} ratio. Current image is taller than the display area.`;
        } else if (wayTooBig) {
            statusIcon  = 'ℹ️';
            statusColor = '#059669';
            statusText  = 'Good (Very Large)';
            cropTip     = `Great resolution! Consider compressing to reduce file size before uploading.`;
        } else {
            statusIcon  = '✅';
            statusColor = '#059669';
            statusText  = 'Good to Go!';
            cropTip     = 'Image dimensions look great for this banner slot.';
        }

        // Thumbnail data URL
        const thumb = (() => {
            try {
                const c = document.createElement('canvas');
                const maxS = 320;
                const scale = Math.min(maxS / W, maxS / H, 1);
                c.width  = Math.round(W * scale);
                c.height = Math.round(H * scale);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                return c.toDataURL('image/jpeg', 0.8);
            } catch(e) {
                return '';
            }
        })();

        panel.innerHTML = `
        <div style="
            margin-top: 0.75rem;
            border: 1px solid ${nearIdeal ? '#d1fae5' : '#fde68a'};
            border-radius: 12px;
            overflow: hidden;
            background: var(--bg-light);
            font-size: 0.84rem;
        ">
            <!-- Header -->
            <div style="
                background: ${nearIdeal ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)'};
                padding: 0.6rem 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                border-bottom: 1px solid ${nearIdeal ? '#d1fae5' : '#fde68a'};
            ">
                <span style="font-size:1.15rem;">${statusIcon}</span>
                <strong style="color:${statusColor};">${statusText}</strong>
                <span style="color:var(--text-muted);margin-left:auto;font-size:0.78rem;">${cfg.label}</span>
            </div>

            <div style="display:flex;gap:0;flex-wrap:wrap;">
                <!-- Thumbnail -->
                ${thumb ? `<div style="
                    flex-shrink:0;
                    width:120px;
                    background:#000;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-right:1px solid var(--border);
                ">
                    <img src="${thumb}" alt="Preview" style="width:100%;height:90px;object-fit:cover;opacity:0.92;">
                </div>` : ''}

                <!-- Info grid -->
                <div style="flex:1;padding:0.75rem 1rem;display:grid;grid-template-columns:1fr 1fr;gap:0.35rem 1.25rem;">
                    <div>
                        <div style="color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;">Your Image</div>
                        <div style="font-weight:700;color:var(--text-dark);">${W} × ${H} px</div>
                        <div style="color:var(--text-muted);font-size:0.76rem;">Ratio ${ratio}:1</div>
                    </div>
                    <div>
                        <div style="color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;">Recommended</div>
                        <div style="font-weight:700;color:var(--primary);">${cfg.idealW} × ${cfg.idealH} px</div>
                        <div style="color:var(--text-muted);font-size:0.76rem;">Ratio ${idealRatio}:1</div>
                    </div>

                    <!-- Tip spans full width -->
                    <div style="grid-column:1/-1;margin-top:0.25rem;padding:0.4rem 0.65rem;background:rgba(0,0,0,0.03);border-radius:6px;border-left:3px solid ${statusColor};color:var(--text-dark);line-height:1.45;">
                        ${cropTip}
                    </div>
                </div>
            </div>

            <!-- Note bar -->
            <div style="padding:0.4rem 1rem;background:rgba(0,0,0,0.03);border-top:1px solid var(--border);color:var(--text-muted);font-size:0.75rem;">
                <i class="fa-solid fa-circle-info" style="margin-right:0.3rem;"></i>${cfg.note}
            </div>
        </div>`;
    }

    /**
     * Remove the advisory panel for a given input.
     */
    function clearAdvisory(inputId) {
        const panel = document.getElementById(inputId + PANEL_SUFFIX);
        if (panel) panel.remove();
    }

    /**
     * Attach the change listener to one file input.
     */
    function attachAdvisor(cfg) {
        // Use event delegation so we survive modal re-renders
        document.addEventListener('change', function (e) {
            if (e.target && e.target.id === cfg.inputId) {
                const file = e.target.files[0];
                if (!file || !file.type.startsWith('image/')) {
                    clearAdvisory(cfg.inputId);
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (ev) {
                    const img = new Image();
                    img.onload = function () {
                        renderAdvisory(e.target, cfg, img);
                    };
                    img.onerror = function () {
                        clearAdvisory(cfg.inputId);
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================
    // FINANCE & ANALYTICS & EXPORT LOGIC
    // ==========================================

    // Modals
    const adminFinanceModal = document.getElementById('adminFinanceModal');
    const closeAdminFinanceModal = document.getElementById('closeAdminFinanceModal');
    const openFinanceNav = document.getElementById('openFinanceNav');

    const adminAddExpenseModal = document.getElementById('adminAddExpenseModal');
    const closeAdminAddExpenseModal = document.getElementById('closeAdminAddExpenseModal');
    const openAddExpenseBtn = document.getElementById('openAddExpenseBtn');

    // Export Buttons
    const exportAttendanceBtn = document.getElementById('exportAttendanceBtn');
    const exportMembersBtn = document.getElementById('exportMembersBtn');
    const exportFinancialsBtn = document.getElementById('exportFinancialsBtn');
    const financeModalExportBtn = document.getElementById('financeModalExportBtn');

    // Utility: Export array of objects to Excel
    function exportToExcel(data, filename) {
        if (!data || !data.length) return alert('No data available to export.');
        if (typeof XLSX === 'undefined') return alert('SheetJS library is not loaded.');
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${filename}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    }

    // Bind Export Buttons
    if (exportAttendanceBtn) {
        exportAttendanceBtn.addEventListener('click', () => {
            const att = Database.getAttendance();
            exportToExcel(att, 'Yoddha_Attendance');
        });
    }

    if (exportMembersBtn) {
        exportMembersBtn.addEventListener('click', () => {
            const players = Database.getPlayers().map(p => ({
                ID: p.id,
                Name: p.name,
                Age: p.age,
                Batch: p.batch,
                Plan: p.plan,
                JoiningDate: p.joiningDate,
                ParentName: p.parentName,
                ParentPhone: p.parentPhone,
                ParentProfession: p.parentProfession,
                Address: p.address,
                BloodGroup: p.bloodGroup,
                DiscountPercent: p.discountPercent || 0,
                Status: p.status || 'Active'
            }));
            exportToExcel(players, 'Yoddha_Members');
        });
    }

    if (exportFinancialsBtn) {
        exportFinancialsBtn.addEventListener('click', () => {
            const payments = Database.getPayments().map(p => ({
                Date: new Date(p.date).toLocaleDateString(),
                Type: 'Revenue',
                Description: `Fee Payment - ${p.paymentType} (${p.playerId})`,
                Category: p.paymentType,
                Amount: p.amount,
                Method: p.method
            }));
            const expenses = Database.getExpenses().map(e => ({
                Date: new Date(e.date).toLocaleDateString(),
                Type: 'Expense',
                Description: e.title,
                Category: e.category,
                Amount: -e.amount,
                Method: 'N/A'
            }));
            const combined = [...payments, ...expenses].sort((a, b) => new Date(b.Date) - new Date(a.Date));
            exportToExcel(combined, 'Yoddha_Financials_All');
        });
    }

    let currentFinanceData = []; // Store currently filtered data for modal export
    if (financeModalExportBtn) {
        financeModalExportBtn.addEventListener('click', () => {
            exportToExcel(currentFinanceData, 'Yoddha_Filtered_Finance');
        });
    }

    // Modal Toggles via Event Delegation
    document.addEventListener('click', (e) => {
        
        // Open Finance Dashboard
        const financeBtn = e.target.closest('#openFinanceNav');
        if (financeBtn) {
            e.preventDefault();
            if (adminFinanceModal) adminFinanceModal.classList.add('show');
            if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('show');
            if (typeof renderFinanceDashboard === 'function') {
                renderFinanceDashboard('today');
            }
        }

        // Close Finance Dashboard
        const closeFinanceBtn = e.target.closest('#closeAdminFinanceModal');
        if (closeFinanceBtn) {
            if (adminFinanceModal) adminFinanceModal.classList.remove('show');
        }

        // Open Add Expense
        const expenseBtn = e.target.closest('#openAddExpenseBtn');
        if (expenseBtn) {
            e.preventDefault();
            if (adminAddExpenseModal) {
                adminAddExpenseModal.classList.add('show');
                const expDate = document.getElementById('expenseDate');
                if (expDate) expDate.value = new Date().toISOString().split('T')[0];
            }
        }

        // Close Add Expense
        const closeExpenseBtn = e.target.closest('#closeAdminAddExpenseModal');
        if (closeExpenseBtn) {
            if (adminAddExpenseModal) adminAddExpenseModal.classList.remove('show');
        }
    });

    // Add Expense Form Handling
    const adminAddExpenseForm = document.getElementById('adminAddExpenseForm');
    if (adminAddExpenseForm) {
        adminAddExpenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('expenseTitle').value.trim();
            const amount = document.getElementById('expenseAmount').value;
            const date = document.getElementById('expenseDate').value;
            const category = document.getElementById('expenseCategory').value;
            const notes = document.getElementById('expenseNotes').value.trim();

            Database.addExpense(title, amount, category, date, notes);
            
            const msg = document.getElementById('expenseFormMsg');
            msg.style.display = 'block';
            msg.style.background = 'var(--success-light)';
            msg.style.color = 'var(--success)';
            msg.textContent = 'Expense added successfully!';

            adminAddExpenseForm.reset();
            setTimeout(() => {
                msg.style.display = 'none';
                adminAddExpenseModal.classList.remove('show');
                if (adminFinanceModal.classList.contains('show')) {
                    const activeBtn = document.querySelector('.finance-filter-btn.active');
                    const filter = activeBtn ? activeBtn.dataset.filter : 'today';
                    renderFinanceDashboard(filter);
                }
            }, 1000);
        });
    }

    // Finance Dashboard Rendering
    const filterBtns = document.querySelectorAll('.finance-filter-btn');
    const customApplyBtn = document.getElementById('financeCustomApplyBtn');

    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'var(--bg-light)';
                    b.style.color = 'var(--text-dark)';
                    b.style.border = '1px solid var(--border)';
                });
                btn.classList.add('active');
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
                btn.style.border = '1px solid var(--primary)';
                renderFinanceDashboard(btn.dataset.filter);
            });
        });
    }

    if (customApplyBtn) {
        customApplyBtn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'var(--bg-light)';
                b.style.color = 'var(--text-dark)';
                b.style.border = '1px solid var(--border)';
            });
            renderFinanceDashboard('custom');
        });
    }

    function renderFinanceDashboard(filterType) {
        const tbody = document.getElementById('financeDataTableBody');
        const revEl = document.getElementById('financeSummaryRev');
        const expEl = document.getElementById('financeSummaryExp');
        const profitEl = document.getElementById('financeSummaryProfit');

        if (!tbody || !revEl || !expEl || !profitEl) return;

        const allPayments = Database.getPayments();
        const allExpenses = Database.getExpenses();

        const today = new Date();
        today.setHours(0,0,0,0);
        
        let start = new Date(0);
        let end = new Date();

        if (filterType === 'today') {
            start = new Date(today);
            end = new Date(today);
            end.setHours(23,59,59,999);
        } else if (filterType === 'week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1); // get Monday
            start = new Date(today.setDate(diff));
            start.setHours(0,0,0,0);
        } else if (filterType === 'month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (filterType === 'year') {
            start = new Date(today.getFullYear(), 0, 1);
        } else if (filterType === 'custom') {
            const cs = document.getElementById('financeCustomStart').value;
            const ce = document.getElementById('financeCustomEnd').value;
            if (cs && ce) {
                start = new Date(cs);
                start.setHours(0,0,0,0);
                end = new Date(ce);
                end.setHours(23,59,59,999);
            }
        }

        // Filter and transform payments
        const filteredRev = [];
        let totalRev = 0;
        allPayments.forEach(p => {
            const d = new Date(p.date);
            if (d >= start && d <= end) {
                totalRev += p.amount;
                filteredRev.push({
                    rawDate: d,
                    Date: d.toLocaleDateString(),
                    Description: `Player Payment - ${p.playerId}`,
                    Category: p.paymentType,
                    Type: 'Revenue',
                    Amount: p.amount,
                    id: p.id
                });
            }
        });

        // Filter and transform expenses
        const filteredExp = [];
        let totalExp = 0;
        allExpenses.forEach(e => {
            const d = new Date(e.date);
            if (d >= start && d <= end) {
                totalExp += e.amount;
                filteredExp.push({
                    rawDate: d,
                    Date: d.toLocaleDateString(),
                    Description: e.title,
                    Category: e.category,
                    Type: 'Expense',
                    Amount: parseFloat(e.amount),
                    id: e.id
                });
            }
        });

        revEl.textContent = `₹${totalRev.toFixed(2)}`;
        expEl.textContent = `₹${totalExp.toFixed(2)}`;
        
        const profit = totalRev - totalExp;
        profitEl.textContent = `₹${profit.toFixed(2)}`;
        profitEl.style.color = profit >= 0 ? '#065f46' : '#991b1b';

        // Combine and sort by newest
        const combined = [...filteredRev, ...filteredExp].sort((a,b) => b.rawDate - a.rawDate);
        currentFinanceData = combined.map(item => ({
            Date: item.Date,
            Type: item.Type,
            Description: item.Description,
            Category: item.Category,
            Amount: item.Type === 'Expense' ? -item.Amount : item.Amount
        }));

        if (combined.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No transactions found for this period.</td></tr>`;
            return;
        }

        tbody.innerHTML = combined.map(item => {
            const isRev = item.Type === 'Revenue';
            const badgeClass = isRev ? 'badge-success' : 'badge-danger';
            const arrow = isRev ? '<i class="fa-solid fa-arrow-trend-up text-success"></i> ' : '<i class="fa-solid fa-arrow-trend-down text-danger"></i> ';
            return `
            <tr>
                <td style="white-space:nowrap;font-size:0.85rem;">${item.Date}</td>
                <td><strong>${item.Description}</strong></td>
                <td><span class="badge ${badgeClass}">${item.Category}</span></td>
                <td class="text-right" style="font-weight:600;">${arrow} ₹${item.Amount.toFixed(2)}</td>
                <td class="text-center">
                    ${!isRev ? `<button class="icon-btn text-danger delete-expense-btn" data-id="${item.id}" title="Delete Expense"><i class="fa-solid fa-trash"></i></button>` : `<span class="text-muted" style="font-size:0.8rem;">Auto</span>`}
                </td>
            </tr>`;
        }).join('');

        // Attach delete listeners
        document.querySelectorAll('.delete-expense-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm('Are you sure you want to delete this expense?')) {
                    Database.deleteExpense(e.currentTarget.dataset.id);
                    renderFinanceDashboard(filterType);
                }
            });
        });
    }

    // Wire up all three (existing banner config at end)
    if (typeof BANNER_CONFIGS !== 'undefined') {
        BANNER_CONFIGS.forEach(attachAdvisor);
    }
    });
})();
    
    // ---- NEW MODAL LOGIC ----
    document.addEventListener('DOMContentLoaded', () => {
    const dietPlansModal = document.getElementById('dietPlansModal');
    const openDietPlansNav = document.getElementById('openDietPlansNav');
    const closeDietPlansModal = document.getElementById('closeDietPlansModal');

    if (openDietPlansNav && dietPlansModal) {
        openDietPlansNav.addEventListener('click', (e) => {
            e.preventDefault();
            dietPlansModal.classList.add('show');
        });
    }
    if (closeDietPlansModal && dietPlansModal) {
        closeDietPlansModal.addEventListener('click', () => dietPlansModal.classList.remove('show'));
    }

    // Finance and Expense Modals Already Declared, just adding listeners:
    if (openFinanceNav && adminFinanceModal) {
        openFinanceNav.addEventListener('click', (e) => {
            e.preventDefault();
            adminFinanceModal.classList.add('show');
        });
    }
    if (closeAdminFinanceModal && adminFinanceModal) {
        closeAdminFinanceModal.addEventListener('click', () => adminFinanceModal.classList.remove('show'));
    }

    if (openAddExpenseBtn && adminAddExpenseModal) {
        openAddExpenseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (adminFinanceModal) adminFinanceModal.classList.remove('show');
            adminAddExpenseModal.classList.add('show');
        });
    }
    if (closeAdminAddExpenseModal && adminAddExpenseModal) {
        closeAdminAddExpenseModal.addEventListener('click', () => adminAddExpenseModal.classList.remove('show'));
    }

    // Ensure events and announcements modals from previous sessions also have listeners if they exist
    const manageEventsModal = document.getElementById('manageEventsModal');
    const openManageEventsNav = document.getElementById('openManageEventsNav');
    const closeManageEventsModal = document.getElementById('closeManageEventsModal');

    if (openManageEventsNav && manageEventsModal) {
        openManageEventsNav.addEventListener('click', (e) => {
            e.preventDefault();
            manageEventsModal.classList.add('show');
        });
    }
    if (closeManageEventsModal && manageEventsModal) {
        closeManageEventsModal.addEventListener('click', () => manageEventsModal.classList.remove('show'));
    }

    const manageAnnouncementsModal = document.getElementById('manageAnnouncementsModal');
    const openManageAnnouncementsNav = document.getElementById('openManageAnnouncementsNav');
    const closeManageAnnouncementsModal = document.getElementById('closeManageAnnouncementsModal');

    if (openManageAnnouncementsNav && manageAnnouncementsModal) {
        openManageAnnouncementsNav.addEventListener('click', (e) => {
            e.preventDefault();
            manageAnnouncementsModal.classList.add('show');
        });
    }
    if (closeManageAnnouncementsModal && manageAnnouncementsModal) {
        closeManageAnnouncementsModal.addEventListener('click', () => manageAnnouncementsModal.classList.remove('show'));
    }

    const enquiriesModal = document.getElementById('enquiriesModal');
    const openEnquiriesNav = document.getElementById('openEnquiriesNav');
    const closeEnquiriesModal = document.getElementById('closeEnquiriesModal');

    if (openEnquiriesNav && enquiriesModal) {
        openEnquiriesNav.addEventListener('click', (e) => {
            e.preventDefault();
            enquiriesModal.classList.add('show');
        });
    }
    if (closeEnquiriesModal && enquiriesModal) {
        closeEnquiriesModal.addEventListener('click', () => enquiriesModal.classList.remove('show'));
    }

    // --- Manage Events ---
    const renderEventsTable = () => {
        const tbody = document.querySelector('#allEventsTable tbody');
        if (!tbody) return;
        const events = Database.getEvents();
        if (events.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No active events.</td></tr>`;
            return;
        }
        tbody.innerHTML = events.map(e => `
            <tr>
                <td><img src="${e.bannerUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
                <td>
                    <strong>${e.title}</strong><br>
                    <small class="text-muted"><i class="fa-regular fa-calendar"></i> ${e.date}</small>
                </td>
                <td>${e.requiresPayment ? '₹' + e.fee : '<span class="badge badge-success">Free</span>'}</td>
                <td>${Database.getEventRegistrationsForEvent(e.id).length}</td>
                <td><button class="icon-btn text-danger delete-event-btn" data-id="${e.id}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const id = ev.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this event?')) {
                    Database.deleteEvent(id);
                    renderEventsTable();
                }
            });
        });
    };

    if (openManageEventsNav) {
        openManageEventsNav.addEventListener('click', () => {
            renderEventsTable();
        });
    }

    const addEventForm = document.getElementById('addEventForm');
    const newEventRequiresFee = document.getElementById('newEventRequiresFee');
    const newEventFee = document.getElementById('newEventFee');
    const extendedPaymentDetails = document.getElementById('extendedPaymentDetails');

    if (newEventRequiresFee && newEventFee && extendedPaymentDetails) {
        newEventRequiresFee.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            newEventFee.style.display = isChecked ? 'inline-block' : 'none';
            extendedPaymentDetails.style.display = isChecked ? 'flex' : 'none';
            if (!isChecked) {
                newEventFee.value = '';
                document.getElementById('newEventUpiId').value = '';
                document.getElementById('newEventPaymentQr').value = '';
            }
        });
    }

    if (addEventForm) {
        addEventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('newEventTitle').value.trim();
            const date = document.getElementById('newEventDate').value;
            const desc = document.getElementById('newEventDesc').value.trim();
            const requiresFee = newEventRequiresFee.checked;
            const fee = newEventFee.value;
            const upiId = document.getElementById('newEventUpiId').value.trim();
            
            const bannerFile = document.getElementById('newEventBanner').files[0];
            const qrFile = document.getElementById('newEventPaymentQr') ? document.getElementById('newEventPaymentQr').files[0] : null;

            if (!bannerFile) return alert('Event banner is required!');

            const readAsDataURL = (file) => new Promise(resolve => {
                if (!file) { resolve(''); return; }
                const reader = new FileReader();
                reader.onload = ev => resolve(ev.target.result);
                reader.readAsDataURL(file);
            });

            Promise.all([readAsDataURL(bannerFile), readAsDataURL(qrFile)]).then(([bannerUrl, qrUrl]) => {
                Database.addEvent(title, date, desc, bannerUrl, requiresFee, fee, qrUrl, upiId);
                addEventForm.reset();
                newEventRequiresFee.dispatchEvent(new Event('change')); // reset UI
                renderEventsTable();
                alert('Event created successfully!');
            });
        });
    }

    // --- Manage Announcements ---
    const renderAnnouncementsTable = () => {
        const tbody = document.querySelector('#allAnnouncementsTable tbody');
        if (!tbody) return;
        const announcements = Database.getAnnouncements();
        if (announcements.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No announcements found.</td></tr>`;
            return;
        }
        tbody.innerHTML = announcements.map(a => `
            <tr>
                <td>${a.imageUrl ? '<img src="' + a.imageUrl + '" style="width:50px;height:50px;object-fit:cover;border-radius:4px;">' : '<span class="text-muted">No Image</span>'}</td>
                <td><strong>${a.title}</strong><br><small class="text-muted">${a.message}</small></td>
                <td><span class="badge" style="background:var(--primary);color:var(--text-light);">${a.targetAudience}</span></td>
                <td><small>${new Date(a.date).toLocaleDateString()}</small></td>
                <td><button class="icon-btn text-danger delete-ann-btn" data-id="${a.id}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-ann-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const id = ev.currentTarget.dataset.id;
                if (confirm('Delete announcement?')) {
                    Database.deleteAnnouncement(id);
                    renderAnnouncementsTable();
                }
            });
        });
    };

    if (openManageAnnouncementsNav) {
        openManageAnnouncementsNav.addEventListener('click', () => {
            renderAnnouncementsTable();
        });
    }

    const addAnnouncementForm = document.getElementById('addAnnouncementForm');
    if (addAnnouncementForm) {
        addAnnouncementForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('newAnnTitle').value.trim();
            const audience = document.getElementById('newAnnAudience').value;
            const message = document.getElementById('newAnnMessage').value.trim();
            const fileInput = document.getElementById('newAnnImage');

            const saveAnn = (imgUrl = '') => {
                Database.addAnnouncement(title, message, audience, imgUrl);
                addAnnouncementForm.reset();
                renderAnnouncementsTable();
                alert('Announcement posted!');
            };

            if (fileInput && fileInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = ev => saveAnn(ev.target.result);
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                saveAnn();
            }
        });
    }

});

