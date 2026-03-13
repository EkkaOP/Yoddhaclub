document.addEventListener('DOMContentLoaded', () => {
    // Make sure DB is loaded
    if (typeof Database === 'undefined') {
        console.error('Database not loaded!');
        return;
    }

    let currentPlayer = Database.getCurrentPlayer();
    if (!currentPlayer) {
        window.location.href = 'login.html';
        return;
    }

    // Populate Player Info
    const nameDisplay = document.getElementById('playerNameDisplay');
    const idDisplay = document.getElementById('playerIdDisplay');
    
    if (nameDisplay) nameDisplay.textContent = currentPlayer.name;
    if (idDisplay) idDisplay.textContent = `ID: ${currentPlayer.id}`;

    // Generate QR Code
    const qrContainer = document.getElementById('playerQrCode');
    if (qrContainer && typeof QRCode !== 'undefined') {
        qrContainer.innerHTML = ''; // clear
        
        // Data to encode
        const qrData = JSON.stringify({
            id: currentPlayer.id,
            name: currentPlayer.name
        });

        new QRCode(qrContainer, {
            text: qrData,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }

    // --- Subscription & Reminder Alerts ---
    const checkSubscriptionStatus = () => {
        const alertsContainer = document.getElementById('subscriptionAlerts');
        if (!alertsContainer) return;
        
        const freshPlayer = Database.getPlayerById(currentPlayer.id) || currentPlayer;
        const expiryStatus = Database.getMemberExpiryStatus(freshPlayer);
        let alertsHtml = '';

        // 1. Expiry Alerts
        if (expiryStatus === 'Expired') {
            alertsHtml += `
            <div class="dash-card" style="background: rgba(220,38,38,0.1); border: 1px solid var(--primary); color: var(--text-dark); padding: 1rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                    <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 1rem;">Membership Expired</h4>
                    <p style="margin: 0; font-size: 0.85rem; opacity: 0.8;">Your membership has expired. Please renew to continue access to all club features.</p>
                </div>
            </div>`;
        } else if (expiryStatus === 'Expiring Soon') {
            const exp = new Date(freshPlayer.expiryDate);
            const now = new Date();
            const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            
            alertsHtml += `
            <div class="dash-card" style="background: rgba(245,158,11,0.1); border: 1px solid #f59e0b; color: var(--text-dark); padding: 1rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #f59e0b; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                    <i class="fa-solid fa-clock"></i>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 1rem;">Expiring Soon</h4>
                    <p style="margin: 0; font-size: 0.85rem; opacity: 0.8;">Your membership will expire in ${diffDays} day${diffDays > 1 ? 's' : ''}. Please renew soon.</p>
                </div>
            </div>`;
        }

        // 2. Admin Reminders
        if (freshPlayer.reminders && freshPlayer.reminders.length > 0) {
            freshPlayer.reminders.slice().reverse().forEach(rem => {
                alertsHtml += `
                <div class="dash-card" style="background: var(--bg-light); border: 1px solid var(--border); border-left: 4px solid var(--primary); padding: 1rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(220,38,38,0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-bell"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h4 style="margin: 0; font-size: 0.95rem;">Admin Message</h4>
                            <small class="text-muted" style="font-size: 0.75rem;">${new Date(rem.date).toLocaleDateString()}</small>
                        </div>
                        <p style="margin: 0; font-size: 0.88rem; font-weight: 500;">${rem.message}</p>
                    </div>
                </div>`;
            });
        }

        alertsContainer.innerHTML = alertsHtml;

        // Update QR Modal Status
        const qrStatus = document.getElementById('playerQrStatus');
        if (qrStatus) {
            qrStatus.textContent = expiryStatus === 'Active' ? 'Active Member' : expiryStatus === 'Expiring Soon' ? 'Expiring Soon' : 'Membership Expired';
            qrStatus.className = `badge mt-2 ${expiryStatus === 'Active' ? 'badge-success' : expiryStatus === 'Expiring Soon' ? 'badge-warning' : 'badge-danger'}`;
        }
    };

    checkSubscriptionStatus();

    // My QR Modal Logic
    const myQrModal = document.getElementById('myQrModal');
    const openMyQrBtn = document.getElementById('openMyQrBtn');
    const closeMyQrModal = document.getElementById('closeMyQrModal');

    if (openMyQrBtn && myQrModal && closeMyQrModal) {
        openMyQrBtn.addEventListener('click', (e) => {
            e.preventDefault();
            myQrModal.classList.add('show');
        });

        closeMyQrModal.addEventListener('click', () => {
            myQrModal.classList.remove('show');
        });

        myQrModal.addEventListener('click', (e) => {
            if (e.target === myQrModal) {
                myQrModal.classList.remove('show');
            }
        });
    }

    // Load Attendance History
    const loadHistory = () => {
        const tableBody = document.querySelector('#playerAttendanceTable tbody');
        if (!tableBody) return;

        const history = Database.getPlayerAttendance(currentPlayer.id);
        
        if (history.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No attendance records found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = history.map(record => {
            const badgeCls = record.status === 'Present' ? 'badge-success' : record.status === 'Leave' ? 'badge-warning' : 'badge-secondary';
            return `
            <tr>
                <td>${record.date}</td>
                <td>${record.time}</td>
                <td><span class="badge ${badgeCls}">${record.status}</span></td>
            </tr>`;
        }).join('');

    };

    loadHistory();

    // Load Contextual Announcements
    const loadAnnouncements = () => {
        const annContainer = document.getElementById('playerAnnouncementsList');
        if (!annContainer) return;

        const allAnnouncements = Database.getAnnouncements();
        
        // Filter valid announcements for this player
        const validAnnouncements = allAnnouncements.filter(ann => {
            if (ann.targetAudience === 'All Members') return true;
            if (ann.targetAudience === 'Expired Members' && currentPlayer.status === 'Expired') return true;
            if (ann.targetAudience === currentPlayer.batch) return true;
            return false;
        });

        if (validAnnouncements.length === 0) {
            annContainer.innerHTML = `<div class="dash-card text-center text-muted" style="padding: 2rem;">No new announcements.</div>`;
            return;
        }

        annContainer.innerHTML = validAnnouncements.map(ann => {
            const timeAgo = (dateStr) => {
                const diffMs = Date.now() - new Date(dateStr).getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays === 0) return 'Today';
                if (diffDays === 1) return 'Yesterday';
                return `${diffDays} days ago`;
            };

            const imgHtml = ann.imageUrl 
                ? `<div style="margin-top: 10px; width: 100%; border-radius: 8px; overflow: hidden;"><img src="${ann.imageUrl}" style="width: 100%; height: auto; max-height: 250px; object-fit: cover; display: block; cursor: pointer;" onclick="openImageViewer('${ann.imageUrl}')" title="Click to view full image"></div>`
                : '';

            return `
            <div class="dash-card announcement-card" style="margin-bottom: 1rem; align-items: stretch; flex-direction: column;">
                <div style="display: flex; gap: 1rem; align-items: flex-start;">
                    <div class="announcement-icon"><i class="fa-solid fa-bullhorn"></i></div>
                    <div class="announcement-text" style="flex: 1;">
                        <h4 style="margin-bottom: 0.25rem;">${ann.title}</h4>
                        <span class="time" style="display: block; margin-bottom: 0.5rem;">${timeAgo(ann.date)}</span>
                        <p style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5;">${ann.message}</p>
                    </div>
                </div>
                ${imgHtml}
            </div>
            `;
        }).join('');
    };

    loadAnnouncements();

    // --- Player Events & Registration ---
    const playerEventsList = document.getElementById('playerEventsList');
    const eventRegModal = document.getElementById('eventRegistrationModal');
    const closeEventRegModal = document.getElementById('closeEventRegModal');
    const regForm = document.getElementById('playerEventRegForm');
    const regFeeSection = document.getElementById('regFormFeeSection');
    const regScreenshotGroup = document.getElementById('regFormScreenshotGroup');
    const regFeeAmount = document.getElementById('regFormFeeAmount');

    window.loadPlayerEvents = () => {
        if (!playerEventsList) return;
        const now = new Date();
        const allEvents = Database.getEvents().sort((a,b) => new Date(a.date) - new Date(b.date));
        
        const upcomingEvents = allEvents.filter(ev => new Date(ev.date) >= now);
        const pastEvents = allEvents.filter(ev => new Date(ev.date) < now).reverse();

        // Render Upcoming
        if (upcomingEvents.length === 0) {
            playerEventsList.innerHTML = `<p class="text-muted w-100 text-center">No upcoming events at the moment.</p>`;
        } else {
            playerEventsList.innerHTML = upcomingEvents.map(ev => renderEventCard(ev, false)).join('');
        }

        // Render Past
        const pastContainer = document.getElementById('playerPastEventsList');
        if (pastContainer) {
            if (pastEvents.length === 0) {
                pastContainer.innerHTML = `<p class="text-muted w-100 text-center">No past events found.</p>`;
            } else {
                pastContainer.innerHTML = pastEvents.map(ev => renderEventCard(ev, true)).join('');
            }
        }

        function renderEventCard(ev, isPast) {
            const dateObj = new Date(ev.date);
            const month = dateObj.toLocaleString('default', { month: 'short' });
            const day = dateObj.getDate();
            
            const regs = Database.getEventRegistrationsForEvent(ev.id);
            const myReg = regs.find(r => r.playerId === currentPlayer.id);
            
            let actionHtml = '';
            if (isPast) {
                const albumUrls = ev.albumUrls || (ev.albumUrl ? [ev.albumUrl] : []);
                actionHtml = `
                <div class="album-links-container" style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                    <div class="gallery-links" style="margin-bottom: 0.75rem;">
                        ${albumUrls.length > 0 ? `
                            <p style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--text-dark);">Event Galleries:</p>
                            <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                                ${albumUrls.map((url, idx) => `
                                    <a href="${url}" target="_blank" class="btn btn-sm btn-outline-primary" style="font-size: 0.75rem; text-align: left; padding: 0.3rem 0.6rem;">
                                        <i class="fa-solid fa-images"></i> View Gallery ${idx + 1}
                                    </a>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted text-center" style="font-size: 0.8rem; margin-bottom: 0.5rem;">No photos uploaded yet.</p>'}
                    </div>
                    
                    <div style="background: var(--bg-light); padding: 0.75rem; border-radius: 8px; border: 1px dashed var(--border);">
                        <p style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--text-dark);">Contribute Photos (G-Drive Link)</p>
                        <div style="display: flex; gap: 0.4rem;">
                            <input type="text" class="form-control form-control-sm player-album-input" 
                                   data-id="${ev.id}" placeholder="Paste link here..." 
                                   style="font-size: 0.75rem; padding: 0.2rem 0.4rem; height: auto; flex: 1;">
                            <button class="btn btn-sm btn-outline-primary player-add-album-btn" data-id="${ev.id}" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;">Add</button>
                        </div>
                    </div>
                </div>`;
            } else if (myReg) {
                let badgeClass = 'badge-warning';
                if(myReg.status === 'Approved') badgeClass = 'badge-success';
                if(myReg.status === 'Rejected') badgeClass = 'badge-danger';
                actionHtml = `<span class="badge ${badgeClass} mt-2" style="display:inline-block; width: 100%; text-align: center;">Status: ${myReg.status}</span>`;
            } else {
                actionHtml = `<button class="btn btn-sm btn-outline-primary mt-2 register-event-btn" data-id="${ev.id}" style="width:100%;">Register</button>`;
            }

            return `
            <div class="dash-card event-card" style="display:flex; flex-direction:column;">
                <img src="${ev.bannerUrl}" style="width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:1rem; cursor:pointer;" alt="Banner" onclick="openImageViewer('${ev.bannerUrl}')" title="Click to view full image">
                <div style="display:flex; gap:1rem; flex:1;">
                    <div class="event-date">
                        <span class="month">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    <div class="event-info" style="flex:1;">
                        <h4 style="margin-bottom:0.25rem;">${ev.title}</h4>
                        <p class="text-muted" style="font-size:0.85rem; margin-bottom:0.5rem;">${ev.description}</p>
                        <p style="font-weight:600; color:var(--text-dark); margin:0;">
                            ${ev.requiresPayment ? 'Fee: ₹' + ev.fee : '<span class="text-success"><i class="fa-solid fa-gift"></i> Free Entry</span>'}
                        </p>
                    </div>
                </div>
                ${actionHtml}
            </div>
            `;
        }

        // Bind Register Buttons
        document.querySelectorAll('.register-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.currentTarget.getAttribute('data-id');
                const evDetails = Database.getEvents().find(ev => ev.id === eventId);
                if(!evDetails) return;

                document.getElementById('regFormEventTitle').textContent = `Register: ${evDetails.title}`;
                document.getElementById('regFormEventId').value = evDetails.id;
                document.getElementById('regFormPlayerId').value = currentPlayer.id;

                if(evDetails.requiresPayment) {
                    regFeeSection.style.display = 'block';
                    regScreenshotGroup.style.display = 'block';
                    document.getElementById('regFormScreenshot').required = true;
                    regFeeAmount.textContent = `₹${evDetails.fee}`;
                    
                    const qrImg = document.getElementById('regFormPaymentQrImage');
                    const instructions = document.getElementById('regFormPaymentInstructions');
                    
                    if (evDetails.paymentQrUrl) {
                        qrImg.src = evDetails.paymentQrUrl;
                        qrImg.style.display = 'inline-block';
                    } else {
                        qrImg.src = 'qr_code.png'; // fallback or you can hide it
                        qrImg.style.display = 'inline-block';
                    }

                    if (evDetails.paymentUpiId) {
                        instructions.innerHTML = `Please scan the QR below or pay to UPI ID:<br><strong>${evDetails.paymentUpiId}</strong>`;
                    } else {
                        instructions.innerHTML = "Please scan the QR below to pay the fee.";
                    }

                } else {
                    regFeeSection.style.display = 'none';
                    regScreenshotGroup.style.display = 'none';
                    document.getElementById('regFormScreenshot').required = false;
                }

                eventRegModal.classList.add('show');
            });
        });

        // Player Photo Link Logic
        document.querySelectorAll('.player-add-album-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const input = document.querySelector(`.player-album-input[data-id="${id}"]`);
                const url = input.value.trim();
                if (!url) return alert("Please paste a valid Google Drive link.");
                
                if (Database.addEventAlbumLink(id, url)) {
                    btn.textContent = 'Added!';
                    btn.classList.replace('btn-outline-primary', 'btn-success');
                    setTimeout(() => {
                        window.loadPlayerEvents();
                    }, 1500);
                }
            };
        });
    };

    loadPlayerEvents();

    if (closeEventRegModal && eventRegModal) {
        closeEventRegModal.addEventListener('click', () => {
            eventRegModal.classList.remove('show'); regForm.reset();
        });
        eventRegModal.addEventListener('click', (e) => {
            if (e.target === eventRegModal) {
                eventRegModal.classList.remove('show'); regForm.reset();
            }
        });
    }

    if (regForm) {
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const eventId = document.getElementById('regFormEventId').value;
            const photoFile = document.getElementById('regFormPhoto').files[0];
            const screenshotFile = document.getElementById('regFormScreenshot').files[0];
            const requiresPayment = regFeeSection.style.display === 'block';

            if (!photoFile) {
                alert("Please upload your Fighter Photo."); return;
            }
            if (requiresPayment && !screenshotFile) {
                alert("Please upload your Payment Screenshot."); return;
            }

            const processRegistration = (screenshotBase64, photoBase64) => {
                Database.addEventRegistration(eventId, currentPlayer.id, screenshotBase64, photoBase64);
                eventRegModal.classList.remove('show');
                regForm.reset();
                loadPlayerEvents();
                
                // Fancy alert or simple trick:
                setTimeout(() => alert('Registration submitted successfully! Waiting for Admin approval.'), 100);
            };

            // Read Photo
            const photoReader = new FileReader();
            photoReader.onload = (ev) => {
                const photoBase64 = ev.target.result;
                // Read Screenshot if needed
                if (requiresPayment && screenshotFile) {
                    const screenReader = new FileReader();
                    screenReader.onload = (ev2) => {
                        processRegistration(ev2.target.result, photoBase64);
                    };
                    screenReader.readAsDataURL(screenshotFile);
                } else {
                    processRegistration('', photoBase64);
                }
            };
            photoReader.readAsDataURL(photoFile);
        });
    }

    // My Profile Modal Logic
    const profileModal = document.getElementById('profileModal');
    const openProfileNav = document.getElementById('openProfileNav');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const headerProfileBtn = document.getElementById('headerProfileBtn');
    const headerProfileAvatar = document.getElementById('headerProfileAvatar');

    // Helper to open profile modal (shared by nav link and header avatar)
    const openProfileModal = (e) => {
        if (e) e.preventDefault();

        // *** Always re-fetch player to get latest data (photo, pdfDocument, etc.) ***
        const freshPlayer = Database.getPlayerById(currentPlayer.id) || currentPlayer;

        // Update header avatar to match current player
        const avatarUrl = freshPlayer.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(freshPlayer.name)}&background=FF0000&color=fff`;
        if (headerProfileAvatar) headerProfileAvatar.src = avatarUrl;

        // Populate profile details
        document.getElementById('profileName').textContent = freshPlayer.name;
        document.getElementById('profileId').textContent = freshPlayer.id;

        const joinDate = freshPlayer.joinedAt ? new Date(freshPlayer.joinedAt).toLocaleDateString() : 'N/A';
        document.getElementById('profileJoined').textContent = joinDate;

        document.getElementById('profilePlan').textContent = freshPlayer.plan || 'N/A';
        document.getElementById('profileBatch').textContent = freshPlayer.batch || 'N/A';
        document.getElementById('profileAddons').textContent = freshPlayer.addons || 'None';
        document.getElementById('profileMonthlyFee').textContent = freshPlayer.monthlyFee ? `₹${freshPlayer.monthlyFee}` : '₹0';

        const expiryStatus = Database.getMemberExpiryStatus(freshPlayer);
        const profileStatus = document.getElementById('profileStatus');
        profileStatus.textContent = expiryStatus || 'Active';
        
        if (expiryStatus === 'Active') profileStatus.className = 'badge badge-success';
        else if (expiryStatus === 'Expiring Soon') profileStatus.className = 'badge badge-warning';
        else if (expiryStatus === 'Expired') profileStatus.className = 'badge badge-danger';
        else profileStatus.className = 'badge badge-secondary';

        const expiryDateEl = document.getElementById('profileExpiryDate');
        if (expiryDateEl) {
            expiryDateEl.textContent = freshPlayer.expiryDate ? new Date(freshPlayer.expiryDate).toLocaleDateString() : 'No expiry set';
        }

        document.getElementById('profileAvatar').src = avatarUrl;

        // --- Documents & Certificates (fresh from DB) ---
        const certSection = document.getElementById('profileCertSection');
        const docList = document.getElementById('playerDocList');
        if (certSection && docList) {
            const docs = freshPlayer.documents || [];
            
            // Backup for legacy (single doc)
            if (docs.length === 0 && freshPlayer.pdfDocument) {
                docs.push({ id: 'legacy', name: 'Primary Document', url: freshPlayer.pdfDocument });
            }

            if (docs.length > 0) {
                certSection.style.display = 'flex';
                docList.innerHTML = docs.map(doc => `
                    <a href="${doc.url}" download="${doc.name}" class="btn btn-outline btn-full" style="border-color: var(--primary); color: var(--primary); display: flex; align-items: center; justify-content: center; gap: 0.5rem; text-align: left; padding: 0.75rem; border-radius: 8px;">
                        <i class="fa-solid fa-file-pdf"></i>
                        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${doc.name}</span>
                        <i class="fa-solid fa-download" style="font-size: 0.8rem; opacity: 0.7;"></i>
                    </a>
                `).join('');
            } else {
                certSection.style.display = 'none';
            }
        }

        // --- Pre-fill saved social links ---
        const wEl = document.getElementById('playerWhatsapp');
        const igEl = document.getElementById('playerInstagram');
        const fbEl = document.getElementById('playerFacebook');
        if (wEl) wEl.value = freshPlayer.whatsapp || '';
        if (igEl) igEl.value = freshPlayer.instagram || '';
        if (fbEl) fbEl.value = freshPlayer.facebook || '';

        profileModal.classList.add('show');

        // --- ID Card Download (Pure Canvas — no html2canvas, no CORS) ---
        const dlBtn = document.getElementById('downloadIdCardBtn');
        if (dlBtn) {
            const freshBtn = dlBtn.cloneNode(true);
            dlBtn.parentNode.replaceChild(freshBtn, dlBtn);

            freshBtn.addEventListener('click', () => {
                freshBtn.disabled = true;
                freshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';

                const W = 680, H = 400;
                const canvas = document.createElement('canvas');
                canvas.width = W;
                canvas.height = H;
                const ctx = canvas.getContext('2d');

                const drawCard = (avatarImg) => {
                    // ── Background ──────────────────────────────────
                    const grad = ctx.createLinearGradient(0, 0, W, H);
                    grad.addColorStop(0, '#111111');
                    grad.addColorStop(0.6, '#1e0000');
                    grad.addColorStop(1, '#2d0000');
                    ctx.fillStyle = grad;
                    roundRect(ctx, 0, 0, W, H, 24);
                    ctx.fill();

                    // ── Decorative ghost circles (top-right) ────────
                    ctx.save();
                    ctx.globalAlpha = 0.06;
                    ctx.strokeStyle = '#FF0000';
                    ctx.lineWidth = 40;
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(W - 40, -40, 130 + i * 80, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                    ctx.restore();

                    // ── Diagonal line grid (bottom-left decorative) ──
                    ctx.save();
                    ctx.globalAlpha = 0.04;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    for (let i = -H; i < W + H; i += 22) {
                        ctx.beginPath();
                        ctx.moveTo(i, H);
                        ctx.lineTo(i + H, 0);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                    ctx.restore();

                    // ── Dot grid (bottom-right corner) ──────────────
                    ctx.save();
                    ctx.globalAlpha = 0.12;
                    ctx.fillStyle = '#ff4444';
                    for (let dx = 0; dx < 5; dx++) {
                        for (let dy = 0; dy < 4; dy++) {
                            ctx.beginPath();
                            ctx.arc(W - 210 + dx * 14, H - 30 - dy * 14, 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                    ctx.globalAlpha = 1;
                    ctx.restore();

                    // ── Left red accent bar ──────────────────────────
                    const barGrad = ctx.createLinearGradient(0, 0, 0, H);
                    barGrad.addColorStop(0, '#FF0000');
                    barGrad.addColorStop(1, '#880000');
                    ctx.fillStyle = barGrad;
                    roundRect(ctx, 0, 0, 7, H, [24, 0, 0, 24]);
                    ctx.fill();

                    // ── Top header ──────────────────────────────────
                    ctx.fillStyle = '#FF0000';
                    ctx.font = 'bold 30px Arial, sans-serif';
                    ctx.fillText('YODDHA CLUB', 36, 50);

                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    ctx.font = '12px Arial, sans-serif';
                    ctx.letterSpacing = '4px';
                    ctx.fillText('M E M B E R S H I P   C A R D', 36, 72);
                    ctx.letterSpacing = '0px';

                    // Thin separator
                    const sepGrad = ctx.createLinearGradient(36, 0, W - 36, 0);
                    sepGrad.addColorStop(0, 'rgba(255,0,0,0.8)');
                    sepGrad.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.strokeStyle = sepGrad;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(36, 86);
                    ctx.lineTo(W - 36, 86);
                    ctx.stroke();

                    // ── Glow ring behind avatar ──────────────────────
                    const AX = 88, AY = 220, AR = 58;
                    ctx.save();
                    ctx.shadowColor = '#FF0000';
                    ctx.shadowBlur = 30;
                    ctx.strokeStyle = 'rgba(255,0,0,0.6)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(AX, AY, AR + 6, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();

                    // ── Avatar ───────────────────────────────────────
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(AX, AY, AR, 0, Math.PI * 2);
                    ctx.clip();
                    if (avatarImg) {
                        ctx.drawImage(avatarImg, AX - AR, AY - AR, AR * 2, AR * 2);
                    } else {
                        ctx.fillStyle = '#880000';
                        ctx.fillRect(AX - AR, AY - AR, AR * 2, AR * 2);
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 38px Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        const initials = (freshPlayer.name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                        ctx.fillText(initials, AX, AY);
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'alphabetic';
                    }
                    ctx.restore();

                    // Avatar solid red ring
                    ctx.strokeStyle = '#FF0000';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(AX, AY, AR + 2, 0, Math.PI * 2);
                    ctx.stroke();

                    // ── Member info (right of avatar) ────────────────
                    const IX = AX + AR + 30;
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 26px Arial, sans-serif';
                    ctx.fillText(freshPlayer.name || '—', IX, 148);

                    const idText = freshPlayer.id || '—';
                    ctx.fillStyle = '#FF0000';
                    ctx.font = 'bold 13px Arial, sans-serif';
                    ctx.fillText(idText, IX, 172);

                    ctx.fillStyle = 'rgba(255,255,255,0.45)';
                    ctx.font = '13px Arial, sans-serif';
                    ctx.fillText((freshPlayer.plan || 'Member') + ' Plan', IX, 196);

                    const infoBoxes = [
                        { label: 'BATCH', value: freshPlayer.batch || '—' },
                        { label: 'MEMBER SINCE', value: freshPlayer.joinedAt ? new Date(freshPlayer.joinedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A' }
                    ];
                    const bxW = 140, bxH = 52, bxY = 226;
                    infoBoxes.forEach((box, i) => {
                        const bx = IX + i * (bxW + 10);
                        ctx.fillStyle = 'rgba(255,255,255,0.05)';
                        roundRect(ctx, bx, bxY, bxW, bxH, 10);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255,0,0,0.25)';
                        ctx.lineWidth = 1;
                        roundRect(ctx, bx, bxY, bxW, bxH, 10);
                        ctx.stroke();

                        ctx.fillStyle = 'rgba(255,0,0,0.7)';
                        ctx.font = '9px Arial, sans-serif';
                        ctx.fillText(box.label, bx + 10, bxY + 16);

                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 14px Arial, sans-serif';
                        ctx.fillText(box.value, bx + 10, bxY + 36);
                    });

                    // ── Bottom red strip ─────────────────────────────
                    const stripGrad = ctx.createLinearGradient(0, H - 36, W, H);
                    stripGrad.addColorStop(0, 'rgba(180,0,0,0.5)');
                    stripGrad.addColorStop(1, 'rgba(255,0,0,0.15)');
                    ctx.fillStyle = stripGrad;
                    ctx.fillRect(0, H - 36, W, 36);
                    ctx.fillStyle = stripGrad;
                    roundRect(ctx, 0, H - 36, W, 36, [0, 0, 24, 24]);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(255,255,255,0.25)';
                    ctx.font = '11px Arial, sans-serif';
                    ctx.fillText('yoddhaclub.com', 22, H - 12);

                    // ── QR code box ──────────────────────────────────
                    const QX = W - 178, QY = 100, QS = 148;
                    ctx.save();
                    ctx.shadowColor = 'rgba(255,0,0,0.4)';
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = '#ffffff';
                    roundRect(ctx, QX - 2, QY - 2, QS + 4, QS + 4, 14);
                    ctx.fill();
                    ctx.restore();

                    ctx.fillStyle = '#ffffff';
                    roundRect(ctx, QX, QY, QS, QS, 12);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(255,255,255,0.28)';
                    ctx.font = '10px Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('SCAN · ATTENDANCE', QX + QS / 2, QY - 8);
                    ctx.textAlign = 'left';

                    const tempDiv = document.createElement('div');
                    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;display:block;';
                    document.body.appendChild(tempDiv);
                    try {
                        new QRCode(tempDiv, {
                            text: freshPlayer.id || 'YODDHA',
                            width: QS - 12, height: QS - 12,
                            colorDark: '#1a1a1a', colorLight: '#ffffff',
                            correctLevel: QRCode.CorrectLevel.H
                        });
                        const qrCanvas = tempDiv.querySelector('canvas');
                        if (qrCanvas) ctx.drawImage(qrCanvas, QX + 6, QY + 6, QS - 12, QS - 12);
                    } catch(e) { /* skip */ }
                    document.body.removeChild(tempDiv);

                    // ── Download ──────────────────────────────────────
                    const link = document.createElement('a');
                    link.download = `Yoddha_ID_${freshPlayer.id}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();

                    freshBtn.disabled = false;
                    freshBtn.innerHTML = '<i class="fa-solid fa-id-card"></i> Download ID Card';
                };

                // Try loading avatar image
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => drawCard(img);
                img.onerror = () => drawCard(null);
                img.src = avatarUrl;
            });
        }
    };

    if (profileModal && closeProfileModal) {
        if (headerProfileBtn) {
            headerProfileBtn.addEventListener('click', openProfileModal);
        }

        if (openProfileNav) {
            openProfileNav.addEventListener('click', openProfileModal);
        }

        closeProfileModal.addEventListener('click', () => {
            profileModal.classList.remove('show');
        });

        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.classList.remove('show');
            }
        });
    }

    // --- Save Social Links ---
    const saveSocialBtn = document.getElementById('saveSocialLinksBtn');
    const socialSaveMsg = document.getElementById('socialSaveMsg');
    if (saveSocialBtn) {
        saveSocialBtn.addEventListener('click', () => {
            const freshPlayer = Database.getPlayerById(currentPlayer.id) || currentPlayer;
            const whatsapp  = (document.getElementById('playerWhatsapp')?.value || '').trim();
            const instagram = (document.getElementById('playerInstagram')?.value || '').trim();
            const facebook  = (document.getElementById('playerFacebook')?.value || '').trim();

            // Build updated player object and persist
            const updated = { ...freshPlayer, whatsapp, instagram, facebook };
            const players = Database.getPlayers().map(p => p.id === freshPlayer.id ? updated : p);
            localStorage.setItem('players', JSON.stringify(players));

            // Show success msg
            if (socialSaveMsg) {
                socialSaveMsg.textContent = '✅ Social links saved!';
                socialSaveMsg.style.background = 'rgba(16,185,129,0.1)';
                socialSaveMsg.style.color = '#059669';
                socialSaveMsg.style.border = '1px solid #059669';
                socialSaveMsg.style.display = 'block';
                setTimeout(() => { socialSaveMsg.style.display = 'none'; }, 3000);
            }
        });
    }

    // ---- LEGACY block replaced above — keeping comment for clarity ----
    if (false && profileModal && openProfileNav && closeProfileModal) {
        openProfileNav.addEventListener('click', (e) => {
            e.preventDefault();

            // *** Always re-fetch player to get latest data (photo, pdfDocument, etc.) ***
            const freshPlayer = Database.getPlayerById(currentPlayer.id) || currentPlayer;

            // Populate profile details
            document.getElementById('profileName').textContent = freshPlayer.name;
            document.getElementById('profileId').textContent = freshPlayer.id;

            const joinDate = freshPlayer.joinedAt ? new Date(freshPlayer.joinedAt).toLocaleDateString() : 'N/A';
            document.getElementById('profileJoined').textContent = joinDate;

            document.getElementById('profilePlan').textContent = freshPlayer.plan || 'N/A';
            document.getElementById('profileBatch').textContent = freshPlayer.batch || 'N/A';
            document.getElementById('profileAddons').textContent = freshPlayer.addons || 'None';
            document.getElementById('profileMonthlyFee').textContent = freshPlayer.monthlyFee ? `₹${freshPlayer.monthlyFee}` : '₹0';

            const profileStatus = document.getElementById('profileStatus');
            profileStatus.textContent = freshPlayer.status || 'Active';
            profileStatus.className = freshPlayer.status === 'Active' ? 'badge badge-success' : 'badge badge-secondary';

            const avatarUrl = freshPlayer.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(freshPlayer.name)}&background=FF0000&color=fff`;
            document.getElementById('profileAvatar').src = avatarUrl;

            // --- Certificate / Document (fresh from DB) ---
            const certSection = document.getElementById('profileCertSection');
            const certLink = document.getElementById('profileCertLink');
            if (certSection && certLink) {
                if (freshPlayer.pdfDocument) {
                    certSection.style.display = 'block';
                    certLink.href = freshPlayer.pdfDocument;
                } else {
                    certSection.style.display = 'none';
                }
            }

            profileModal.classList.add('show');

            // --- ID Card Download (Pure Canvas — no html2canvas, no CORS) ---
            const dlBtn = document.getElementById('downloadIdCardBtn');
            if (dlBtn) {
                const freshBtn = dlBtn.cloneNode(true);
                dlBtn.parentNode.replaceChild(freshBtn, dlBtn);

                freshBtn.addEventListener('click', () => {
                    freshBtn.disabled = true;
                    freshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';

                    const W = 680, H = 400;
                    const canvas = document.createElement('canvas');
                    canvas.width = W;
                    canvas.height = H;
                    const ctx = canvas.getContext('2d');

                    const drawCard = (avatarImg) => {
                        // ── Background ──────────────────────────────────
                        const grad = ctx.createLinearGradient(0, 0, W, H);
                        grad.addColorStop(0, '#111111');
                        grad.addColorStop(0.6, '#1e0000');
                        grad.addColorStop(1, '#2d0000');
                        ctx.fillStyle = grad;
                        roundRect(ctx, 0, 0, W, H, 24);
                        ctx.fill();

                        // ── Decorative ghost circles (top-right) ────────
                        ctx.save();
                        ctx.globalAlpha = 0.06;
                        ctx.strokeStyle = '#FF0000';
                        ctx.lineWidth = 40;
                        for (let i = 0; i < 3; i++) {
                            ctx.beginPath();
                            ctx.arc(W - 40, -40, 130 + i * 80, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        ctx.globalAlpha = 1;
                        ctx.restore();

                        // ── Diagonal line grid (bottom-left decorative) ──
                        ctx.save();
                        ctx.globalAlpha = 0.04;
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1;
                        for (let i = -H; i < W + H; i += 22) {
                            ctx.beginPath();
                            ctx.moveTo(i, H);
                            ctx.lineTo(i + H, 0);
                            ctx.stroke();
                        }
                        ctx.globalAlpha = 1;
                        ctx.restore();

                        // ── Dot grid (bottom-right corner) ──────────────
                        ctx.save();
                        ctx.globalAlpha = 0.12;
                        ctx.fillStyle = '#ff4444';
                        for (let dx = 0; dx < 5; dx++) {
                            for (let dy = 0; dy < 4; dy++) {
                                ctx.beginPath();
                                ctx.arc(W - 210 + dx * 14, H - 30 - dy * 14, 2, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                        ctx.globalAlpha = 1;
                        ctx.restore();

                        // ── Left red accent bar ──────────────────────────
                        const barGrad = ctx.createLinearGradient(0, 0, 0, H);
                        barGrad.addColorStop(0, '#FF0000');
                        barGrad.addColorStop(1, '#880000');
                        ctx.fillStyle = barGrad;
                        roundRect(ctx, 0, 0, 7, H, [24, 0, 0, 24]);
                        ctx.fill();

                        // ── Top header ──────────────────────────────────
                        ctx.fillStyle = '#FF0000';
                        ctx.font = 'bold 30px Arial, sans-serif';
                        ctx.fillText('YODDHA CLUB', 36, 50);

                        ctx.fillStyle = 'rgba(255,255,255,0.35)';
                        ctx.font = '12px Arial, sans-serif';
                        ctx.letterSpacing = '4px';
                        ctx.fillText('M E M B E R S H I P   C A R D', 36, 72);
                        ctx.letterSpacing = '0px';

                        // Thin separator
                        const sepGrad = ctx.createLinearGradient(36, 0, W - 36, 0);
                        sepGrad.addColorStop(0, 'rgba(255,0,0,0.8)');
                        sepGrad.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.strokeStyle = sepGrad;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(36, 86);
                        ctx.lineTo(W - 36, 86);
                        ctx.stroke();

                        // ── Glow ring behind avatar ──────────────────────
                        const AX = 88, AY = 220, AR = 58;
                        ctx.save();
                        ctx.shadowColor = '#FF0000';
                        ctx.shadowBlur = 30;
                        ctx.strokeStyle = 'rgba(255,0,0,0.6)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(AX, AY, AR + 6, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();

                        // ── Avatar ───────────────────────────────────────
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(AX, AY, AR, 0, Math.PI * 2);
                        ctx.clip();
                        if (avatarImg) {
                            ctx.drawImage(avatarImg, AX - AR, AY - AR, AR * 2, AR * 2);
                        } else {
                            ctx.fillStyle = '#880000';
                            ctx.fillRect(AX - AR, AY - AR, AR * 2, AR * 2);
                            ctx.fillStyle = '#fff';
                            ctx.font = 'bold 38px Arial, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            const initials = (freshPlayer.name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                            ctx.fillText(initials, AX, AY);
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'alphabetic';
                        }
                        ctx.restore();

                        // Avatar solid red ring
                        ctx.strokeStyle = '#FF0000';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(AX, AY, AR + 2, 0, Math.PI * 2);
                        ctx.stroke();

                        // ── Member info (right of avatar) ────────────────
                        const IX = AX + AR + 30;
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 26px Arial, sans-serif';
                        ctx.fillText(freshPlayer.name || '—', IX, 148);

                        // ID chips row
                        const idText = freshPlayer.id || '—';
                        ctx.fillStyle = '#FF0000';
                        ctx.font = 'bold 13px Arial, sans-serif';
                        ctx.fillText(idText, IX, 172);

                        ctx.fillStyle = 'rgba(255,255,255,0.45)';
                        ctx.font = '13px Arial, sans-serif';
                        ctx.fillText((freshPlayer.plan || 'Member') + ' Plan', IX, 196);

                        // ── Two info boxes (Batch + Joined) ──────────────
                        const infoBoxes = [
                            { label: 'BATCH', value: freshPlayer.batch || '—' },
                            { label: 'MEMBER SINCE', value: freshPlayer.joinedAt ? new Date(freshPlayer.joinedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A' }
                        ];
                        const bxW = 140, bxH = 52, bxY = 226;
                        infoBoxes.forEach((box, i) => {
                            const bx = IX + i * (bxW + 10);
                            // Glass box
                            ctx.fillStyle = 'rgba(255,255,255,0.05)';
                            roundRect(ctx, bx, bxY, bxW, bxH, 10);
                            ctx.fill();
                            ctx.strokeStyle = 'rgba(255,0,0,0.25)';
                            ctx.lineWidth = 1;
                            roundRect(ctx, bx, bxY, bxW, bxH, 10);
                            ctx.stroke();

                            ctx.fillStyle = 'rgba(255,0,0,0.7)';
                            ctx.font = '9px Arial, sans-serif';
                            ctx.fillText(box.label, bx + 10, bxY + 16);

                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 14px Arial, sans-serif';
                            ctx.fillText(box.value, bx + 10, bxY + 36);
                        });

                        // ── Bottom red strip ─────────────────────────────
                        const stripGrad = ctx.createLinearGradient(0, H - 36, W, H);
                        stripGrad.addColorStop(0, 'rgba(180,0,0,0.5)');
                        stripGrad.addColorStop(1, 'rgba(255,0,0,0.15)');
                        ctx.fillStyle = stripGrad;
                        ctx.fillRect(0, H - 36, W, 36);
                        // Round bottom corners
                        ctx.fillStyle = 'rgba(0,0,0,0)';
                        ctx.fillStyle = stripGrad;
                        roundRect(ctx, 0, H - 36, W, 36, [0, 0, 24, 24]);
                        ctx.fill();

                        ctx.fillStyle = 'rgba(255,255,255,0.25)';
                        ctx.font = '11px Arial, sans-serif';
                        ctx.fillText('yoddhaclub.com', 22, H - 12);

                        // ── QR code box ──────────────────────────────────
                        const QX = W - 178, QY = 100, QS = 148;
                        // QR glow
                        ctx.save();
                        ctx.shadowColor = 'rgba(255,0,0,0.4)';
                        ctx.shadowBlur = 18;
                        ctx.fillStyle = '#ffffff';
                        roundRect(ctx, QX - 2, QY - 2, QS + 4, QS + 4, 14);
                        ctx.fill();
                        ctx.restore();

                        ctx.fillStyle = '#ffffff';
                        roundRect(ctx, QX, QY, QS, QS, 12);
                        ctx.fill();

                        // QR label above
                        ctx.fillStyle = 'rgba(255,255,255,0.28)';
                        ctx.font = '10px Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('SCAN · ATTENDANCE', QX + QS / 2, QY - 8);
                        ctx.textAlign = 'left';

                        const tempDiv = document.createElement('div');
                        tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;display:block;';
                        document.body.appendChild(tempDiv);
                        try {
                            new QRCode(tempDiv, {
                                text: freshPlayer.id || 'YODDHA',
                                width: QS - 12, height: QS - 12,
                                colorDark: '#1a1a1a', colorLight: '#ffffff',
                                correctLevel: QRCode.CorrectLevel.H
                            });
                            const qrCanvas = tempDiv.querySelector('canvas');
                            if (qrCanvas) ctx.drawImage(qrCanvas, QX + 6, QY + 6, QS - 12, QS - 12);
                        } catch(e) { /* skip */ }
                        document.body.removeChild(tempDiv);

                        // ── Download ──────────────────────────────────────
                        const link = document.createElement('a');
                        link.download = `Yoddha_ID_${freshPlayer.id}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();

                        freshBtn.disabled = false;
                        freshBtn.innerHTML = '<i class="fa-solid fa-id-card"></i> Download ID Card';
                    };

                    // Try loading avatar image
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => drawCard(img);
                    img.onerror = () => drawCard(null); // fallback: draw initials
                    img.src = avatarUrl;
                });
            }
        });

        closeProfileModal.addEventListener('click', () => {
            profileModal.classList.remove('show');
        });

        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.classList.remove('show');
            }
        });
    }

    // Helper: rounded rect path
    function roundRect(ctx, x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        ctx.beginPath();
        ctx.moveTo(x + r[0], y);
        ctx.lineTo(x + w - r[1], y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
        ctx.lineTo(x + w, y + h - r[2]);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
        ctx.lineTo(x + r[3], y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
        ctx.lineTo(x, y + r[0]);
        ctx.quadraticCurveTo(x, y, x + r[0], y);
        ctx.closePath();
    }

    // ---- Today's Workout ----
    const loadTodayWorkout = () => {
        const container = document.getElementById('todayWorkoutContainer');
        if (!container) return;

        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const tasks = Database.getTasksForPlayer(currentPlayer.id, todayStr);

        if (tasks.length === 0) {
            container.innerHTML = `
                <div style="background: var(--bg-light); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                    <i class="fa-solid fa-couch fa-2x" style="color: var(--text-muted); opacity: 0.5;"></i>
                    <div>
                        <p style="font-weight: 600; margin: 0;">Rest Day! 🎉</p>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">No workout assigned for today. Take it easy!</p>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = tasks.map(t => `
            <div style="background: var(--bg-light); border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: 12px; padding: 1.25rem; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-dumbbell" style="color: var(--primary);"></i>
                    <h4 style="margin: 0; font-size: 1rem; color: var(--text-dark);">${t.title}</h4>
                </div>
                ${t.description ? `<p style="margin: 0; font-size: 0.88rem; color: var(--text-muted); white-space: pre-line; line-height: 1.6;">${t.description}</p>` : ''}
            </div>`).join('');
    };

    loadTodayWorkout();

    // ---- My Tasks Modal ----
    const myTasksModal = document.getElementById('myTasksModal');
    const openMyTasksNav = document.getElementById('openMyTasksNav');
    const closeMyTasksModal = document.getElementById('closeMyTasksModal');

    const loadMyTasks = () => {
        const container = document.getElementById('myTasksContainer');
        if (!container) return;

        const tasks = Database.getTasksForPlayer(currentPlayer.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const todayStr = new Date().toISOString().split('T')[0];

        if (tasks.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-clipboard-list fa-3x" style="opacity:0.3; margin-bottom:1rem; display:block;"></i>
                    <p>No tasks assigned yet. Check back later!</p>
                </div>`;
            return;
        }

        container.innerHTML = tasks.map(t => {
            const isToday = t.date === todayStr;
            const dateObj = new Date(t.date + 'T00:00:00');
            const dateStr = dateObj.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            return `
                <div style="background: var(--bg-light); border: 1px solid var(--border); border-left: 4px solid ${isToday ? 'var(--primary)' : '#888'}; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                        <span style="font-size:0.8rem; color: var(--text-muted);">
                            <i class="fa-regular fa-calendar"></i> ${dateStr}
                        </span>
                        ${isToday ? '<span style="background:var(--primary); color:#fff; font-size:0.72rem; font-weight:700; padding:0.1rem 0.5rem; border-radius:20px;">TODAY</span>' : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom: ${t.description ? '0.5rem' : '0'}">
                        <i class="fa-solid fa-dumbbell" style="color:${isToday ? 'var(--primary)' : '#888'};"></i>
                        <h4 style="margin:0; font-size:0.98rem; color: var(--text-dark);">${t.title}</h4>
                    </div>
                    ${t.description ? `<p style="margin:0; font-size:0.85rem; color: var(--text-muted); white-space:pre-line; line-height:1.6; padding-left:1.4rem;">${t.description}</p>` : ''}
                </div>`;
        }).join('');
    };

    if (openMyTasksNav) {
        openMyTasksNav.addEventListener('click', (e) => {
            e.preventDefault();
            loadMyTasks();
            myTasksModal.classList.add('show');
        });
    }
    if (closeMyTasksModal) {
        closeMyTasksModal.addEventListener('click', () => myTasksModal.classList.remove('show'));
    }
    if (myTasksModal) {
        myTasksModal.addEventListener('click', (e) => {
            if (e.target === myTasksModal) myTasksModal.classList.remove('show');
        });
    }

    // ---- Leave Application Modal ----
    const leaveModal = document.getElementById('leaveModal');
    const openLeaveNav = document.getElementById('openLeaveNav');
    const closeLeaveModal = document.getElementById('closeLeaveModal');
    const leaveForm = document.getElementById('leaveForm');
    const leaveFormMsg = document.getElementById('leaveFormMsg');

    const showLeaveMsg = (msg, isError = false) => {
        if (!leaveFormMsg) return;
        leaveFormMsg.textContent = msg;
        leaveFormMsg.style.display = 'block';
        leaveFormMsg.style.background = isError ? 'rgba(220,38,38,0.1)' : 'rgba(16,185,129,0.1)';
        leaveFormMsg.style.color = isError ? '#dc2626' : '#10b981';
        leaveFormMsg.style.border = `1px solid ${isError ? '#dc2626' : '#10b981'}`;
    };

    const loadLeaveHistory = () => {
        const container = document.getElementById('myLeaveHistoryContainer');
        if (!container) return;
        const leaves = Database.getLeaveApplicationsByPlayer(currentPlayer.id);
        if (leaves.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-muted);"><i class="fa-solid fa-calendar-xmark fa-2x" style="opacity:0.3;margin-bottom:0.75rem;display:block;"></i><p style="margin:0;font-size:0.88rem;">No leave applications yet.</p></div>`;
            return;
        }
        const statusConfig = {
            Pending:  { cls: 'badge-warning',  icon: 'fa-hourglass-half' },
            Approved: { cls: 'badge-success',  icon: 'fa-circle-check' },
            Rejected: { cls: 'badge-danger',   icon: 'fa-circle-xmark' }
        };
        container.innerHTML = leaves.map(l => {
            const cfg = statusConfig[l.status] || statusConfig.Pending;
            const applied = new Date(l.appliedAt).toLocaleDateString();
            const dateRange = l.fromDate === l.toDate
                ? new Date(l.fromDate + 'T00:00:00').toLocaleDateString()
                : `${new Date(l.fromDate + 'T00:00:00').toLocaleDateString()} – ${new Date(l.toDate + 'T00:00:00').toLocaleDateString()}`;
            return `
            <div style="background:var(--bg-light);border:1px solid var(--border);border-left:4px solid ${l.status==='Approved'?'#10b981':l.status==='Rejected'?'#dc2626':'#f59e0b'};border-radius:10px;padding:0.9rem 1rem;margin-bottom:0.65rem;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.4rem;">
                    <div>
                        <p style="margin:0;font-weight:600;font-size:0.9rem;color:var(--text-dark);">${dateRange}</p>
                        <p style="margin:0.3rem 0 0;font-size:0.83rem;color:var(--text-muted);">${l.reason}</p>
                    </div>
                    <span class="badge ${cfg.cls}" style="white-space:nowrap;"><i class="fa-solid ${cfg.icon}"></i> ${l.status}</span>
                </div>
                <p style="margin:0.4rem 0 0;font-size:0.78rem;color:var(--text-muted);">Applied: ${applied} &nbsp;|&nbsp; Parent: ${l.parentPhone}</p>
            </div>`;
        }).join('');
    };

    const openLeaveModalFn = (e) => {
        if (e) e.preventDefault();
        if (leaveForm) leaveForm.reset();
        if (leaveFormMsg) leaveFormMsg.style.display = 'none';
        loadLeaveHistory();
        leaveModal.classList.add('show');
    };

    if (leaveModal && closeLeaveModal) {
        if (openLeaveNav) openLeaveNav.addEventListener('click', openLeaveModalFn);
        closeLeaveModal.addEventListener('click', () => leaveModal.classList.remove('show'));
        leaveModal.addEventListener('click', (e) => { if (e.target === leaveModal) leaveModal.classList.remove('show'); });
    }

    if (leaveForm) {
        leaveForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fromDate = document.getElementById('leaveFromDate').value;
            const toDate = document.getElementById('leaveToDate').value;
            const reason = document.getElementById('leaveReason').value.trim();
            const parentPhone = document.getElementById('leaveParentPhone').value.trim();

            if (!fromDate || !toDate || !reason || !parentPhone) {
                showLeaveMsg('Please fill all required fields.', true); return;
            }
            if (new Date(toDate) < new Date(fromDate)) {
                showLeaveMsg('"To Date" cannot be before "From Date".', true); return;
            }

            const result = Database.submitLeaveApplication(
                currentPlayer.id, currentPlayer.name,
                fromDate, toDate, '', reason, parentPhone
            );

            if (result.success) {
                showLeaveMsg('Leave application submitted successfully! Awaiting admin approval.');
                leaveForm.reset();
                loadLeaveHistory();
            } else {
                showLeaveMsg('Failed to submit application. Please try again.', true);
            }
        });
    }

    // ---- Diet Plan Modal (Player) ----
    const playerDietPlanModal     = document.getElementById('playerDietPlanModal');
    const openDietPlanNav         = document.getElementById('openDietPlanNav');
    const closePlayerDietPlanModal= document.getElementById('closePlayerDietPlanModal');
    const playerDietPlansList     = document.getElementById('playerDietPlansList');

    const dietCatConfig = {
        'General':     { color: '#3b82f6', emoji: '🌐', label: 'General' },
        'Weight Loss': { color: '#ef4444', emoji: '🔥', label: 'Weight Loss' },
        'Weight Gain': { color: '#10b981', emoji: '💪', label: 'Weight Gain' },
        'Individual':  { color: '#8b5cf6', emoji: '👤', label: 'Personal' }
    };

    let playerDietFilter = 'All';

    const loadPlayerDietPlans = () => {
        if (!playerDietPlansList) return;

        // Fetch plans relevant to this player
        const playerGoal = currentPlayer.goal || '';
        let plans;

        if (playerDietFilter === 'All') {
            plans = Database.getDietPlansForPlayer(currentPlayer.id, playerGoal);
        } else {
            plans = Database.getDietPlans().filter(p => {
                if (p.category !== playerDietFilter) return false;
                if (p.category === 'General') return true;
                if (p.category === 'Individual') return p.targetPlayerId === currentPlayer.id;
                return true; // Weight Loss / Weight Gain — show regardless so player can browse
            });
        }

        if (plans.length === 0) {
            playerDietPlansList.innerHTML = `
                <div style="text-align:center;padding:2.5rem;color:var(--text-muted);">
                    <i class="fa-solid fa-bowl-food fa-3x" style="opacity:0.2;margin-bottom:1rem;display:block;"></i>
                    <p style="font-size:0.9rem;">No diet plans available for this category yet.<br>Check back later or contact your coach.</p>
                </div>`;
            return;
        }

        playerDietPlansList.innerHTML = plans.map(p => {
            const cfg = dietCatConfig[p.category] || dietCatConfig['General'];
            const created = new Date(p.createdAt).toLocaleDateString();
            const fileBtn = p.fileUrl
                ? `<a href="javascript:void(0);" onclick="openImageViewer('${p.fileUrl}')" style="display:inline-flex;align-items:center;gap:0.5rem;font-size:0.85rem;font-weight:600;color:${cfg.color};background:${cfg.color}15;padding:0.5rem 1rem;border-radius:20px;text-decoration:none;margin-top:0.75rem;border:1px solid ${cfg.color}40;" title="Click to view full image">
                      <i class="fa-solid fa-image"></i> View & Download Attachment
                   </a>` : '';
            const descHtml = p.description.replace(/\n/g, '<br>');
            return `
            <div style="background:var(--bg-light);border:1px solid var(--border);border-left:5px solid ${cfg.color};border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1rem;">
                <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.6rem;flex-wrap:wrap;">
                    <span style="font-size:1.3rem;">${cfg.emoji}</span>
                    <strong style="font-size:1rem;color:var(--text-dark);">${p.title}</strong>
                    <span style="background:${cfg.color}18;color:${cfg.color};font-size:0.72rem;font-weight:700;padding:0.2rem 0.65rem;border-radius:20px;">${cfg.label}</span>
                </div>
                <div style="font-size:0.88rem;color:var(--text-muted);line-height:1.7;white-space:pre-wrap;">${descHtml}</div>
                ${fileBtn}
                <p style="margin:0.6rem 0 0;font-size:0.75rem;color:var(--text-muted);opacity:0.7;">Added: ${created}</p>
            </div>`;
        }).join('');
    };

    // Player diet filter tabs
    document.querySelectorAll('.player-diet-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.player-diet-filter-btn').forEach(b => {
                b.classList.remove('btn-primary', 'active');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary', 'active');
            playerDietFilter = btn.getAttribute('data-filter');
            loadPlayerDietPlans();
        });
    });

    if (playerDietPlanModal && openDietPlanNav && closePlayerDietPlanModal) {
        openDietPlanNav.addEventListener('click', (e) => {
            e.preventDefault();
            playerDietFilter = 'All';
            // Reset filter tabs
            document.querySelectorAll('.player-diet-filter-btn').forEach(b => {
                b.classList.remove('btn-primary', 'active');
                b.classList.add('btn-outline-primary');
            });
            document.querySelector('.player-diet-filter-btn[data-filter="All"]')?.classList.replace('btn-outline-primary', 'btn-primary');
            loadPlayerDietPlans();
            playerDietPlanModal.classList.add('show');
        });
        closePlayerDietPlanModal.addEventListener('click', () => playerDietPlanModal.classList.remove('show'));
        playerDietPlanModal.addEventListener('click', (e) => {
            if (e.target === playerDietPlanModal) playerDietPlanModal.classList.remove('show');
        });
    }

});

// =============================================
// TRAINING PROGRESS TRACKER — PLAYER SIDE
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Database === 'undefined') return;
    const currentPlayer = Database.getCurrentPlayer();
    if (!currentPlayer) return;

    // --- Helpers ---
    const openModal  = (id) => document.getElementById(id)?.classList.add('show');
    const closeModal = (id) => document.getElementById(id)?.classList.remove('show');

    const showMsg = (el, text, isError = false) => {
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
        for (let i = 1; i <= max; i++) {
            h += `<i class="fa-solid fa-star${i > rating ? ' empty' : ''}"></i>`;
        }
        return h + '</span>';
    };

    // Chart instances store (to allow destroy on re-open)
    const charts = {};
    const destroyChart = (key) => { if (charts[key]) { charts[key].destroy(); charts[key] = null; } };

    const makeChart = (key, canvasId, type, labels, datasets, opts = {}) => {
        destroyChart(key);
        const el = document.getElementById(canvasId);
        if (!el) return;
        charts[key] = new Chart(el.getContext('2d'), {
            type,
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: opts.legend ?? false }, tooltip: { mode: 'index' } },
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } } },
                ...opts.extra
            }
        });
    };

    // ===== NOTIFICATION BELL =====
    const updateNotifBell = () => {
        const freshPlayer = Database.getPlayerById(currentPlayer.id) || currentPlayer;
        const notifs = Database.getTrainingNotificationsForPlayer(freshPlayer.batch || '');
        const count = notifs.length;
        const badge = document.getElementById('playerNotifCount');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    };
    updateNotifBell();

    const openBell = document.getElementById('openPlayerTrainingNotifBtn');
    const closeNotif = document.getElementById('closePlayerTrainingNotifModal');
    const notifListEl = document.getElementById('playerTrainingNotifList');
    const notifModal = document.getElementById('playerTrainingNotifModal');

    if (openBell) {
        openBell.addEventListener('click', () => {
            const freshPlayer = Database.getPlayerById(currentPlayer.id) || currentPlayer;
            const notifs = Database.getTrainingNotificationsForPlayer(freshPlayer.batch || '');
            if (!notifListEl) return;
            if (notifs.length === 0) {
                notifListEl.innerHTML = '<p class="text-center text-muted" style="padding:2rem;">No training alerts yet.</p>';
            } else {
                notifListEl.innerHTML = notifs.map(n => {
                    const d = new Date(n.createdAt).toLocaleDateString();
                    return `<div class="dash-card" style="margin-bottom:0.75rem;padding:1rem;">
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                            <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <i class="fa-solid fa-bell"></i>
                            </div>
                            <div style="flex:1;">
                                <p style="font-weight:700;margin:0 0 0.2rem;">${n.title}</p>
                                <p style="font-size:0.88rem;color:var(--text-muted);margin:0 0 0.2rem;">${n.message}</p>
                                <small class="text-muted">${d} · ${n.audience === 'All' ? 'All Members' : n.audience}</small>
                            </div>
                        </div>
                    </div>`;
                }).join('');
            }
            openModal('playerTrainingNotifModal');
        });
    }
    if (closeNotif) closeNotif.addEventListener('click', () => closeModal('playerTrainingNotifModal'));
    if (notifModal) notifModal.addEventListener('click', e => { if (e.target === notifModal) closeModal('playerTrainingNotifModal'); });

    // ===== TRAINING LOG =====
    const logModal = document.getElementById('trainingLogModal');
    const logNav = document.getElementById('openTrainingLogNav');
    const closeLog = document.getElementById('closeTrainingLogModal');
    const logForm = document.getElementById('trainingLogForm');
    const logDateInput = document.getElementById('logDate');
    if (logDateInput) logDateInput.value = new Date().toISOString().split('T')[0];

    if (logForm) {
        // Load custom names
        const loadCustomNames = () => {
            const player = Database.getPlayerById(currentPlayer.id) || currentPlayer;
            if (player.customExercises) {
                Object.keys(player.customExercises).forEach(category => {
                    Object.keys(player.customExercises[category]).forEach(key => {
                        const lblId = `lbl${key.charAt(0).toUpperCase() + key.slice(1)}`;
                        const el = document.getElementById(lblId);
                        if (el) el.textContent = player.customExercises[category][key];
                    });
                });
            }
        };

        // Open handler
        if (logNav) logNav.addEventListener('click', e => { 
            e.preventDefault(); 
            loadCustomNames();
            openModal('trainingLogModal'); 
        });

        if (closeLog) closeLog.addEventListener('click', () => closeModal('trainingLogModal'));
        if (logModal) logModal.addEventListener('click', e => { if (e.target === logModal) closeModal('trainingLogModal'); });

        // Rename logic
        document.querySelectorAll('.edit-ex-icon').forEach(icon => {
            icon.addEventListener('click', () => {
                const cat = icon.dataset.cat;
                const key = icon.dataset.key;
                const lblId = icon.dataset.lbl;
                const labelEl = document.getElementById(lblId);
                const oldName = labelEl.textContent;
                
                const newName = prompt(`Enter new name for "${oldName}":`, oldName);
                if (newName && newName.trim() && newName !== oldName) {
                    const cleanName = newName.trim();
                    labelEl.textContent = cleanName;
                    
                    // Persist to DB
                    const players = Database.getPlayers();
                    const pIdx = players.findIndex(p => p.id === currentPlayer.id);
                    if (pIdx !== -1) {
                        if (!players[pIdx].customExercises) players[pIdx].customExercises = { punches: {}, kicks: {}, conditioning: {} };
                        if (!players[pIdx].customExercises[cat]) players[pIdx].customExercises[cat] = {};
                        players[pIdx].customExercises[cat][key] = cleanName;
                        localStorage.setItem('players', JSON.stringify(players));
                        // Update local object
                        currentPlayer = players[pIdx];
                        localStorage.setItem('currentUser', JSON.stringify(currentPlayer));
                    }
                }
            });
        });

        logForm.addEventListener('submit', e => {
            e.preventDefault();
            const g = id => parseInt(document.getElementById(id)?.value) || 0;
            const freshPlayer = Database.getPlayerById(currentPlayer.id) || currentPlayer;
            const data = {
                date: document.getElementById('logDate')?.value || new Date().toISOString().split('T')[0],
                punches: { jab: g('logJab'), cross: g('logCross'), hook: g('logHook'), uppercut: g('logUppercut') },
                kicks: { front: g('logFrontKick'), roundhouse: g('logRoundhouse'), side: g('logSideKick'), low: g('logLowKick') },
                conditioning: { pushups: g('logPushups'), squats: g('logSquats'), situps: g('logSitups'), skipping: g('logSkipping') },
                bagWork: { rounds: g('logBagRounds'), roundDuration: g('logBagDuration') },
                sparring: { rounds: g('logSparRounds'), partner: document.getElementById('logSparPartner')?.value.trim() || '' }
            };
            Database.addTrainingLog(currentPlayer.id, freshPlayer.name || currentPlayer.name, data);
            showMsg(document.getElementById('logFormMsg'), '✅ Training saved successfully!');
            logForm.reset();
            if (logDateInput) logDateInput.value = new Date().toISOString().split('T')[0];
            updateNotifBell();
            loadCustomNames(); // Re-apply names after reset
        });
    }

    // ===== PROGRESS DASHBOARD =====
    const progressNav = document.getElementById('openProgressDashNav');
    const progressModal = document.getElementById('playerProgressModal');
    const closeProgress = document.getElementById('closePlayerProgressModal');

    const openProgressDashboard = () => {
        const logs = Database.getPlayerTrainingLogs(currentPlayer.id);

        // Stats
        const statsEl = document.getElementById('playerProgressStats');
        if (statsEl) {
            const totalPunches = logs.reduce((s, l) => s + (l.punches.jab + l.punches.cross + l.punches.hook + l.punches.uppercut), 0);
            const totalKicks = logs.reduce((s, l) => s + (l.kicks.front + l.kicks.roundhouse + l.kicks.side + l.kicks.low), 0);
            const totalPushups = logs.reduce((s, l) => s + l.conditioning.pushups, 0);
            const totalSessions = logs.length;
            statsEl.innerHTML = [
                { v: totalSessions, l: 'Training Sessions' },
                { v: totalPunches, l: 'Total Punches' },
                { v: totalKicks, l: 'Total Kicks' },
                { v: totalPushups, l: 'Total Pushups' }
            ].map(s => `<div class="tp-stat-card"><div class="tp-stat-value">${s.v.toLocaleString()}</div><div class="tp-stat-label">${s.l}</div></div>`).join('');
        }

        // Get last 7 days labels
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        const dayLabels = days.map(d => new Date(d).toLocaleDateString('en', { weekday: 'short' }));

        const sum = (log, field) => {
            if (field === 'punches') return log.punches.jab + log.punches.cross + log.punches.hook + log.punches.uppercut;
            if (field === 'kicks') return log.kicks.front + log.kicks.roundhouse + log.kicks.side + log.kicks.low;
            if (field === 'conditioning') return log.conditioning.pushups + log.conditioning.squats + log.conditioning.situps;
            return 0;
        };

        const dayData = (field) => days.map(d => {
            const dayLogs = logs.filter(l => l.date === d);
            return dayLogs.reduce((s, l) => s + sum(l, field), 0);
        });

        const red = 'rgba(255,0,0,0.7)';
        const redLight = 'rgba(255,0,0,0.15)';
        const blue = 'rgba(59,130,246,0.7)';
        const blueLight = 'rgba(59,130,246,0.15)';
        const green = 'rgba(16,185,129,0.7)';
        const greenLight = 'rgba(16,185,129,0.15)';

        makeChart('playerPunch', 'playerPunchChart', 'bar', dayLabels, [{
            label: 'Punches', data: dayData('punches'),
            backgroundColor: red, borderColor: 'rgba(255,0,0,1)', borderWidth: 1, borderRadius: 4
        }]);

        makeChart('playerKick', 'playerKickChart', 'line', dayLabels, [{
            label: 'Kicks', data: dayData('kicks'),
            borderColor: blue, backgroundColor: blueLight, fill: true, tension: 0.4, pointRadius: 4
        }]);

        makeChart('playerCond', 'playerCondChart', 'bar', dayLabels, [{
            label: 'Conditioning', data: dayData('conditioning'),
            backgroundColor: green, borderColor: 'rgba(16,185,129,1)', borderWidth: 1, borderRadius: 4
        }]);

        // Monthly activity — last 12 months
        const monthLabels = [];
        const monthData = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const label = d.toLocaleDateString('en', { month: 'short' });
            const yr = d.getFullYear();
            const mo = (d.getMonth() + 1).toString().padStart(2, '0');
            const count = logs.filter(l => l.date && l.date.startsWith(`${yr}-${mo}`)).length;
            monthLabels.push(label);
            monthData.push(count);
        }
        makeChart('playerActivity', 'playerActivityChart', 'bar', monthLabels, [{
            label: 'Training Days', data: monthData,
            backgroundColor: 'rgba(255,0,0,0.5)', borderColor: 'rgba(255,0,0,1)', borderWidth: 1, borderRadius: 4
        }]);

        openModal('playerProgressModal');
    };

    if (progressNav) progressNav.addEventListener('click', e => { e.preventDefault(); openProgressDashboard(); });
    if (closeProgress) closeProgress.addEventListener('click', () => closeModal('playerProgressModal'));
    if (progressModal) progressModal.addEventListener('click', e => { if (e.target === progressModal) closeModal('playerProgressModal'); });

    // ===== PERSONAL RECORDS + COACH FEEDBACK =====
    const recordsNav = document.getElementById('openPersonalRecordsNav');
    const recordsModal = document.getElementById('personalRecordsModal');
    const closeRecords = document.getElementById('closePersonalRecordsModal');

    const openPersonalRecords = () => {
        const logs = Database.getPlayerTrainingLogs(currentPlayer.id);

        const bestPunches = logs.reduce((m, l) => Math.max(m, l.punches.jab + l.punches.cross + l.punches.hook + l.punches.uppercut), 0);
        const bestKicks = logs.reduce((m, l) => Math.max(m, l.kicks.front + l.kicks.roundhouse + l.kicks.side + l.kicks.low), 0);
        const bestPushups = logs.reduce((m, l) => Math.max(m, l.conditioning.pushups), 0);
        const totalSessions = logs.length;

        // Streak calculation
        let streak = 0, maxStreak = 0, prevDate = null;
        const sortedDates = [...new Set(logs.map(l => l.date))].sort();
        sortedDates.forEach(d => {
            if (!prevDate) { streak = 1; }
            else {
                const diff = (new Date(d) - new Date(prevDate)) / 86400000;
                streak = diff === 1 ? streak + 1 : 1;
            }
            maxStreak = Math.max(maxStreak, streak);
            prevDate = d;
        });

        const recEl = document.getElementById('personalRecordsContainer');
        if (recEl) {
            recEl.innerHTML = [
                { v: bestPunches, l: 'Best Punches (Session)', icon: '🥊' },
                { v: bestKicks, l: 'Best Kicks (Session)', icon: '🦵' },
                { v: bestPushups, l: 'Highest Pushups', icon: '💪' },
                { v: maxStreak + ' days', l: 'Longest Streak', icon: '🔥' }
            ].map(s => `<div class="tp-stat-card"><div class="tp-stat-value">${s.icon} ${s.v}</div><div class="tp-stat-label">${s.l}</div></div>`).join('');
        }

        // Badges
        const badgesEl = document.getElementById('playerBadgesContainer');
        if (badgesEl) {
            const badges = [];
            if (totalSessions >= 1) badges.push({ cls: 'bronze', icon: '🥊', label: 'First Session' });
            if (totalSessions >= 10) badges.push({ cls: 'silver', icon: '⚡', label: '10 Sessions' });
            if (totalSessions >= 30) badges.push({ cls: '', icon: '🏆', label: '30 Sessions' });
            if (bestPunches >= 100) badges.push({ cls: 'red', icon: '🥊', label: '100 Punch Day' });
            if (bestKicks >= 100) badges.push({ cls: 'red', icon: '🦵', label: '100 Kick Day' });
            if (maxStreak >= 7) badges.push({ cls: 'silver', icon: '🔥', label: '7-Day Streak' });
            if (maxStreak >= 30) badges.push({ cls: '', icon: '🔥', label: '30-Day Streak' });

            // Completed challenges
            const completed = Database.getCompletedChallenges(currentPlayer.id);
            completed.forEach(c => badges.push({ cls: '', icon: '🎯', label: c.title }));

            badgesEl.innerHTML = badges.length === 0
                ? '<p class="text-muted" style="font-size:0.88rem;">Complete your first training session to earn badges!</p>'
                : badges.map(b => `<span class="tp-badge ${b.cls}">${b.icon} ${b.label}</span>`).join('');
        }

        // Challenges progress
        const chalEl = document.getElementById('playerChallengesContainer');
        if (chalEl) {
            const totalPunches = logs.reduce((s, l) => s + l.punches.jab + l.punches.cross + l.punches.hook + l.punches.uppercut, 0);
            const totalKicks = logs.reduce((s, l) => s + l.kicks.front + l.kicks.roundhouse + l.kicks.side + l.kicks.low, 0);
            const totalCond = logs.reduce((s, l) => s + l.conditioning.pushups + l.conditioning.squats + l.conditioning.situps, 0);

            const challenges = Database.getTrainingChallenges();
            if (challenges.length === 0) {
                chalEl.innerHTML = '<p class="text-muted" style="font-size:0.88rem;">No active challenges yet. Ask your coach!</p>';
            } else {
                // Safe completion check — completions may be strings or {playerId} objects
                const isCompleted = (c) => Database._isCompleted
                    ? Database._isCompleted(c, currentPlayer.id)
                    : c.completions.some(e => (typeof e === 'string' ? e : e.playerId) === currentPlayer.id);

                chalEl.innerHTML = challenges.map(c => {
                    const done = isCompleted(c);
                    let current = c.type === 'punches' ? totalPunches
                        : c.type === 'kicks' ? totalKicks
                        : c.type === 'conditioning' ? totalCond
                        : c.type === 'streak' ? maxStreak : 0;
                    const pct = Math.min(100, Math.round((current / c.targetValue) * 100));

                    const rewardHtml = c.reward
                        ? `<div style="margin-top:0.5rem;display:flex;align-items:center;gap:0.4rem;padding:0.35rem 0.6rem;background:rgba(245,158,11,0.08);border-radius:6px;border-left:3px solid #f59e0b;">
                            <i class="fa-solid fa-gift" style="color:#f59e0b;font-size:0.85rem;"></i>
                            <span style="font-size:0.82rem;color:#b45309;font-weight:600;">Reward: ${c.reward}</span>
                          </div>`
                        : '';

                    const completedBanner = done
                        ? `<div style="margin-top:0.5rem;padding:0.4rem 0.7rem;background:rgba(16,185,129,0.1);border-radius:6px;border-left:3px solid #059669;font-size:0.82rem;color:#059669;font-weight:600;">
                            🎉 You completed this challenge!${c.reward ? ' Reward: ' + c.reward : ''}
                          </div>`
                        : '';

                    return `<div style="background:var(--bg-light);border:1px solid var(--border);border-radius:10px;padding:0.9rem;margin-bottom:0.6rem;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
                            <span style="font-weight:700;font-size:0.9rem;">${done ? '🏅 ' : ''}${c.title}</span>
                            <span class="badge ${done ? 'badge-success' : 'badge-secondary'}" style="font-size:0.75rem;">${done ? 'Completed!' : pct + '%'}</span>
                        </div>
                        <p style="font-size:0.8rem;color:var(--text-muted);margin:0 0 0.5rem;">${c.description}</p>
                        <div class="tp-progress-bar-container">
                            <div class="tp-progress-bar-fill" style="width:${pct}%;${done ? 'background:linear-gradient(90deg,#059669,#10b981);' : ''}"></div>
                        </div>
                        <small class="text-muted" style="font-size:0.75rem;">${Math.min(current, c.targetValue).toLocaleString()} / ${c.targetValue.toLocaleString()}</small>
                        ${!done ? rewardHtml : ''}
                        ${completedBanner}
                    </div>`;
                }).join('');
            }
        }

        // Coach Feedback
        const feedbackEl = document.getElementById('playerCoachFeedback');
        if (feedbackEl) {
            const eval_ = Database.getSkillEvaluation(currentPlayer.id);
            if (!eval_) {
                feedbackEl.innerHTML = '<p class="text-muted" style="font-size:0.88rem;">No skill evaluation from coach yet.</p>';
            } else {
                const skills = [
                    { label: 'Punch Technique', val: eval_.ratings.punch },
                    { label: 'Kick Technique', val: eval_.ratings.kick },
                    { label: 'Speed', val: eval_.ratings.speed },
                    { label: 'Defense', val: eval_.ratings.defense },
                    { label: 'Stamina', val: eval_.ratings.stamina }
                ];
                const date = new Date(eval_.createdAt).toLocaleDateString();
                feedbackEl.innerHTML = `<div style="background:var(--bg-light);border:1px solid var(--border);border-radius:12px;padding:1rem;">
                    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem;">Last updated: ${date}</p>
                    ${skills.map(s => `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                        <span style="font-size:0.88rem;font-weight:600;">${s.label}</span>
                        ${starsHtml(s.val)}
                    </div>`).join('')}
                    ${eval_.comment ? `<div style="margin-top:0.75rem;padding:0.75rem;background:var(--surface-light);border-radius:8px;border-left:3px solid var(--primary);font-size:0.88rem;"><strong>Comment:</strong> ${eval_.comment}</div>` : ''}
                    ${eval_.suggestions ? `<div style="margin-top:0.5rem;padding:0.75rem;background:rgba(16,185,129,0.08);border-radius:8px;border-left:3px solid var(--success);font-size:0.88rem;"><strong>Improvements:</strong> ${eval_.suggestions}</div>` : ''}
                </div>`;
            }
        }

        openModal('personalRecordsModal');
    };

    if (recordsNav) recordsNav.addEventListener('click', e => { e.preventDefault(); openPersonalRecords(); });
    if (closeRecords) closeRecords.addEventListener('click', () => closeModal('personalRecordsModal'));
    if (recordsModal) recordsModal.addEventListener('click', e => { if (e.target === recordsModal) closeModal('personalRecordsModal'); });

    // ===== DEDICATED CHALLENGES NAV =====
    const chalPlayerNav    = document.getElementById('openChallengesPlayerNav');
    const chalPlayerModal  = document.getElementById('playerChallengesModal');
    const closeChalPlayer  = document.getElementById('closePlayerChallengesModal');
    const chalStandaloneEl = document.getElementById('playerChallengesStandaloneContainer');

    const renderStandaloneChallenges = () => {
        if (!chalStandaloneEl) return;
        const logs = Database.getPlayerTrainingLogs(currentPlayer.id);

        const totalPunches = logs.reduce((s, l) => s + l.punches.jab + l.punches.cross + l.punches.hook + l.punches.uppercut, 0);
        const totalKicks   = logs.reduce((s, l) => s + l.kicks.front + l.kicks.roundhouse + l.kicks.side + l.kicks.low, 0);
        const totalCond    = logs.reduce((s, l) => s + l.conditioning.pushups + l.conditioning.squats + l.conditioning.situps, 0);

        // Streak calc
        let streak = 0, maxStreak = 0, prevDate = null;
        const sortedDates = [...new Set(logs.map(l => l.date))].sort();
        sortedDates.forEach(d => {
            if (!prevDate) { streak = 1; }
            else { const diff = (new Date(d) - new Date(prevDate)) / 86400000; streak = diff === 1 ? streak + 1 : 1; }
            maxStreak = Math.max(maxStreak, streak);
            prevDate = d;
        });

        const challenges = Database.getTrainingChallenges();
        if (challenges.length === 0) {
            chalStandaloneEl.innerHTML = `
                <div style="text-align:center;padding:2rem;">
                    <i class="fa-solid fa-fire" style="font-size:3rem;color:var(--border);margin-bottom:1rem;"></i>
                    <p style="color:var(--text-muted);font-size:0.9rem;">No active challenges yet.<br>Ask your coach to create some!</p>
                </div>`;
            return;
        }

        const isCompleted = (c) => Database._isCompleted
            ? Database._isCompleted(c, currentPlayer.id)
            : c.completions.some(e => (typeof e === 'string' ? e : e.playerId) === currentPlayer.id);

        chalStandaloneEl.innerHTML = challenges.map(c => {
            const done = isCompleted(c);
            let current = c.type === 'punches' ? totalPunches
                : c.type === 'kicks'        ? totalKicks
                : c.type === 'conditioning' ? totalCond
                : c.type === 'streak'       ? maxStreak : 0;
            const pct = Math.min(100, Math.round((current / c.targetValue) * 100));

            const typeLabel = c.type === 'punches' ? '🥊 Punches' : c.type === 'kicks' ? '🦵 Kicks'
                : c.type === 'conditioning' ? '💪 Conditioning' : '🔥 Streak (Days)';

            const rewardHtml = c.reward
                ? `<div style="margin-top:0.5rem;display:flex;align-items:center;gap:0.4rem;padding:0.35rem 0.6rem;background:rgba(245,158,11,0.08);border-radius:6px;border-left:3px solid #f59e0b;">
                    <i class="fa-solid fa-gift" style="color:#f59e0b;font-size:0.85rem;"></i>
                    <span style="font-size:0.82rem;color:#b45309;font-weight:600;">Reward: ${c.reward}</span>
                  </div>`
                : '';

            const completedBanner = done
                ? `<div style="margin-top:0.5rem;padding:0.4rem 0.7rem;background:rgba(16,185,129,0.1);border-radius:6px;border-left:3px solid #059669;font-size:0.82rem;color:#059669;font-weight:600;">
                    🎉 You completed this challenge!${c.reward ? ' Reward: ' + c.reward : ''}
                  </div>`
                : '';

            return `<div style="background:var(--bg-light);border:1px solid ${done ? '#d1fae5' : 'var(--border)'};border-radius:12px;padding:1rem;margin-bottom:0.75rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
                    <span style="font-weight:700;font-size:0.95rem;">${done ? '🏅 ' : '🎯 '}${c.title}</span>
                    <span class="badge ${done ? 'badge-success' : 'badge-secondary'}" style="font-size:0.75rem;flex-shrink:0;">${done ? 'Completed!' : pct + '%'}</span>
                </div>
                <span style="font-size:0.76rem;color:var(--text-muted);font-weight:600;">${typeLabel}</span>
                <p style="font-size:0.82rem;color:var(--text-muted);margin:0.35rem 0 0.5rem;">${c.description}</p>
                <div class="tp-progress-bar-container">
                    <div class="tp-progress-bar-fill" style="width:${pct}%;${done ? 'background:linear-gradient(90deg,#059669,#10b981);' : ''}"></div>
                </div>
                <small class="text-muted" style="font-size:0.75rem;">${Math.min(current, c.targetValue).toLocaleString()} / ${c.targetValue.toLocaleString()}</small>
                ${!done ? rewardHtml : ''}
                ${completedBanner}
            </div>`;
        }).join('');
    };

    if (chalPlayerNav) {
        chalPlayerNav.addEventListener('click', e => {
            e.preventDefault();
            renderStandaloneChallenges();
            openModal('playerChallengesModal');
        });
    }
    if (closeChalPlayer) closeChalPlayer.addEventListener('click', () => closeModal('playerChallengesModal'));
    if (chalPlayerModal) chalPlayerModal.addEventListener('click', e => { if (e.target === chalPlayerModal) closeModal('playerChallengesModal'); });

    // ---- Image Viewer Functionality ----
    window.openImageViewer = function(imgSrc) {
        const viewerModal = document.getElementById('imageViewerModal');
        const viewerImg = document.getElementById('imageViewerImg');
        const viewerdlBtn = document.getElementById('imageViewerDownloadBtn');
        
        if(viewerModal && viewerImg && viewerdlBtn) {
            viewerImg.src = imgSrc;
            viewerdlBtn.href = imgSrc;
            viewerModal.classList.add('show');
        }
    };

    const closeImageViewerModal = document.getElementById('closeImageViewerModal');
    if(closeImageViewerModal) {
        closeImageViewerModal.addEventListener('click', () => {
            document.getElementById('imageViewerModal').classList.remove('show');
        });
    }

    const imageViewerModal = document.getElementById('imageViewerModal');
    if(imageViewerModal) {
        imageViewerModal.addEventListener('click', (e) => {
            if(e.target === imageViewerModal) {
                imageViewerModal.classList.remove('show');
            }
        });
    }

    // ---- Carousel Functionality for Player Dashboard ----
    const track = document.querySelector('.carousel-track');
    const dotsContainer = document.querySelector('.carousel-dots');
    
    // Stop execution if carousel elements don't exist
    if (!track || !dotsContainer) return;

    // Load banners from DB
    const banners = typeof Database !== 'undefined' ? Database.getBanners() : [];
    
    if (banners.length > 0) {
        track.innerHTML = banners.map(b => `
            <div class="slide" style="background-image: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), url('${b.url}'); ${b.redirectUrl && b.redirectUrl !== '#' ? 'cursor: pointer;' : ''}" ${b.redirectUrl && b.redirectUrl !== '#' ? `onclick="window.open('${b.redirectUrl}', '_blank')"` : ''}>
                <div class="slide-content">
                    <h2>${b.title}</h2>
                    <p>${b.subtitle}</p>
                </div>
            </div>
        `).join('');
        
        dotsContainer.innerHTML = banners.map((b, i) => `
            <span class="dot ${i === 0 ? 'active' : ''}"></span>
        `).join('');

        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.dot');
        let currentIndex = 0;
        const slideCount = slides.length;
        let autoSlideInterval;
        
        const goToSlide = (index) => {
            track.style.transform = `translateX(-${index * 100}%)`;
            dots.forEach(dot => dot.classList.remove('active'));
            dots[index].classList.add('active');
            currentIndex = index;
        };

        const nextSlide = () => {
            let nextIndex = (currentIndex + 1) % slideCount;
            goToSlide(nextIndex);
        };

        const startAutoSlide = () => {
            autoSlideInterval = setInterval(nextSlide, 3000);
        };

        const stopAutoSlide = () => {
            clearInterval(autoSlideInterval);
        };

        // Dot clicks
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                stopAutoSlide();
                goToSlide(index);
                startAutoSlide();
            });
        });

        startAutoSlide();

        // Touch Swipe
        let touchStartX = 0;
        let touchEndX = 0;

        track.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoSlide();
        }, {passive: true});

        track.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchEndX < touchStartX - 50) nextSlide();
            if (touchEndX > touchStartX + 50) goToSlide((currentIndex - 1 + slideCount) % slideCount);
            startAutoSlide();
        }, {passive: true});
    }

    // ---- Diet Plan Modal (Player) ----
    const playerDietPlanModal = document.getElementById('playerDietPlanModal');
    const openDietPlanNav = document.getElementById('openDietPlanNav');
    const closePlayerDietPlanModal = document.getElementById('closePlayerDietPlanModal');

    if (openDietPlanNav && playerDietPlanModal) {
        openDietPlanNav.addEventListener('click', (e) => {
            e.preventDefault();
            playerDietPlanModal.classList.add('show');
            // Logic to render diet plans should be handled elsewhere or initialized here
        });
    }

    if (closePlayerDietPlanModal && playerDietPlanModal) {
        closePlayerDietPlanModal.addEventListener('click', () => {
            playerDietPlanModal.classList.remove('show');
        });
    }
});


