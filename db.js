// Shared Database Logic (Simulated with LocalStorage)

class Database {
    static init() {
        if (!localStorage.getItem('players')) {
            // Mock single player on install
            const defaultPlayer = {
                id: 'CLUB-PLAYER-0001',
                name: 'John Doe',
                status: 'Active'
            };
            localStorage.setItem('players', JSON.stringify([defaultPlayer]));
            // Set current user logic (simulating login)
            localStorage.setItem('currentUser', JSON.stringify(defaultPlayer));
        }

        if (!localStorage.getItem('attendance')) {
            localStorage.setItem('attendance', JSON.stringify([]));
        }

        if (!localStorage.getItem('banners')) {
            const defaultBanners = [
                { id: 'BANNER-1', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80', title: 'Elite Training', subtitle: 'Push your limits with our state-of-the-art facilities', redirectUrl: '#' },
                { id: 'BANNER-2', url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80', title: 'Club Activities', subtitle: 'Join group sessions and engage with the community', redirectUrl: '#' },
                { id: 'BANNER-3', url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80', title: 'Special Announcements', subtitle: "New programs starting this weekend. Don't miss out!", redirectUrl: '#' }
            ];
            localStorage.setItem('banners', JSON.stringify(defaultBanners));
        }

        if (!localStorage.getItem('announcements')) {
            const defaultAnnouncements = [
                { id: 'ANN-1', title: 'Welcome to Yoddha!', message: 'Join our new general batches starting tomorrow!', targetAudience: 'All Members', imageUrl: '', date: new Date().toISOString() }
            ];
            localStorage.setItem('announcements', JSON.stringify(defaultAnnouncements));
        }

        if (!localStorage.getItem('coaches')) {
            // Mock single coach on install
            const defaultCoach = {
                id: 'CLUB-COACH-0001',
                name: 'Sarah Connor',
                specialty: 'Yoga & Flexibility',
                status: 'Active',
                joinedAt: new Date().toISOString()
            };
            localStorage.setItem('coaches', JSON.stringify([defaultCoach]));
        }

        if (!localStorage.getItem('ourPlayers')) {
            const defaultOurPlayers = [
                { id: 'CHAMP-1', name: 'Elena Rodriguez', achievement: 'State Powerlifting Champion', imageUrl: 'https://images.unsplash.com/photo-1526506114642-54bc0837f42c?auto=format&fit=crop&q=80&w=400' },
                { id: 'CHAMP-2', name: 'James Wilson', achievement: 'Triathlon Winner 2023', imageUrl: 'https://images.unsplash.com/photo-1554284126-aa88f22d8b74?auto=format&fit=crop&q=80&w=400' },
                { id: 'CHAMP-3', name: 'Chloe Carter', achievement: 'National Gymnast', imageUrl: 'https://images.unsplash.com/photo-1620882193910-61f623631fca?auto=format&fit=crop&q=80&w=400' }
            ];
            localStorage.setItem('ourPlayers', JSON.stringify(defaultOurPlayers));
        }
    }

    static getPlayers() {
        return JSON.parse(localStorage.getItem('players')) || [];
    }

    static getPlayerById(id) {
        const players = this.getPlayers();
        return players.find(p => p.id === id);
    }

    static getCurrentPlayer() {
        return JSON.parse(localStorage.getItem('currentUser'));
    }

    static getAttendance() {
        return JSON.parse(localStorage.getItem('attendance')) || [];
    }

    static markAttendance(playerId, playerName) {
        const attendance = this.getAttendance();
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Check if already present today
        const existing = attendance.find(a => a.playerId === playerId && a.date === dateStr);
        if (existing) {
            return { success: false, message: 'Attendance already marked for today.' };
        }

        const newRecord = {
            id: 'ATT-' + Date.now(),
            playerId,
            playerName,
            date: dateStr,
            time: timeStr,
            status: 'Present'
        };

        attendance.push(newRecord);
        localStorage.setItem('attendance', JSON.stringify(attendance));
        return { success: true, record: newRecord };
    }

    static getPlayerAttendance(playerId) {
        const attendance = this.getAttendance();
        return attendance.filter(a => a.playerId === playerId).sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    }

    static registerPlayer(playerData) {
        const players = this.getPlayers();
        // Generate ID like CLUB-PLAYER-0001
        const playerNumber = players.length + 1;
        const paddedNumber = playerNumber.toString().padStart(4, '0');
        const newId = `CLUB-PLAYER-${paddedNumber}`;

        const now = new Date();
        const expiry = new Date(now);
        expiry.setDate(now.getDate() + 30); // Default 30 days

        const newPlayer = {
            id: newId,
            ...playerData,
            plan: playerData.plan || '',
            addons: playerData.addons || '',
            enrollmentFee: parseFloat(playerData.enrollmentFee) || 0,
            monthlyFee: parseFloat(playerData.monthlyFee) || 0,
            discount: parseFloat(playerData.discount) || 0,
            status: playerData.status || 'Pending',
            joinedAt: now.toISOString(),
            expiryDate: playerData.expiryDate || expiry.toISOString(),
            reminders: [],
            documents: []
        };

        players.push(newPlayer);
        localStorage.setItem('players', JSON.stringify(players));
        return { success: true, player: newPlayer };
    }

    static updatePlayerStatus(playerId, newStatus) {
        const players = this.getPlayers();
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            players[playerIndex].status = newStatus;
            localStorage.setItem('players', JSON.stringify(players));
            return true;
        }
        return false;
    }

    static deletePlayer(playerId) {
        let players = this.getPlayers();
        const initialLength = players.length;
        players = players.filter(p => p.id !== playerId);
        
        if(players.length !== initialLength) {
            localStorage.setItem('players', JSON.stringify(players));
            return true;
        }
        return false;
    }

    static updatePlayerDocument(playerId, docUrl) {
        // Keeping as legacy support for single doc update
        return this.addPlayerDocument(playerId, "Primary Document", docUrl);
    }

    static migrateLegacyDocument(playerId) {
        try {
            const players = this.getPlayers();
            const idx = players.findIndex(p => p.id === playerId);
            if (idx === -1) return false;
            
            const p = players[idx];
            if (p.pdfDocument && (!p.documents || p.documents.length === 0)) {
                p.documents = [{
                    id: 'DOC-MIGRATED',
                    name: 'Primary Document',
                    url: p.pdfDocument,
                    uploadedAt: p.joinedAt || new Date().toISOString()
                }];
                localStorage.setItem('players', JSON.stringify(players));
                return true;
            }
            return false;
        } catch (err) {
            console.error('Migration error:', err);
            return false;
        }
    }

    static addPlayerDocument(playerId, docName, docUrl) {
        try {
            const players = this.getPlayers();
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex === -1) return { success: false, message: 'Player not found' };

            if (!players[playerIndex].documents || !Array.isArray(players[playerIndex].documents)) {
                players[playerIndex].documents = [];
            }
            
            const newDoc = {
                id: `DOC-${Date.now()}`,
                name: docName || 'Untitled Document',
                url: docUrl,
                uploadedAt: new Date().toISOString()
            };
            
            players[playerIndex].documents.push(newDoc);
            // Also update legacy field for backward compatibility
            players[playerIndex].pdfDocument = docUrl; 
            
            localStorage.setItem('players', JSON.stringify(players));
            return { success: true };
        } catch (error) {
            console.error('Error adding player document:', error);
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                return { success: false, message: 'Storage limit reached. Please use smaller files or delete old documents.' };
            }
            return { success: false, message: 'Failed to save document. ' + error.message };
        }
    }

    static deletePlayerDocument(playerId, docId) {
        const players = this.getPlayers();
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1 && players[playerIndex].documents) {
            players[playerIndex].documents = players[playerIndex].documents.filter(d => d.id !== docId);
            // Update legacy field to match the latest document if any remains
            if (players[playerIndex].documents.length > 0) {
                players[playerIndex].pdfDocument = players[playerIndex].documents[players[playerIndex].documents.length - 1].url;
            } else {
                players[playerIndex].pdfDocument = '';
            }
            localStorage.setItem('players', JSON.stringify(players));
            return true;
        }
        return false;
    }

    static getCoaches() {
        return JSON.parse(localStorage.getItem('coaches')) || [];
    }

    static addCoach(name, specialty) {
        const coaches = this.getCoaches();
        const coachNumber = coaches.length + 1;
        const paddedNumber = coachNumber.toString().padStart(4, '0');
        const newId = `CLUB-COACH-${paddedNumber}`;

        const newCoach = {
            id: newId,
            name: name,
            specialty: specialty || 'General Fitness',
            status: 'Active',
            joinedAt: new Date().toISOString()
        };

        coaches.push(newCoach);
        localStorage.setItem('coaches', JSON.stringify(coaches));
        return { success: true, coach: newCoach };
    }

    // --- Batch Management ---
    static getBatches() {
        return JSON.parse(localStorage.getItem('batches')) || [];
    }

    static addBatch(name, time, instructor, enrollmentFee = 0, monthlyFee = 0) {
        const batches = this.getBatches();
        const newId = `BATCH-${Date.now()}`;
        const newBatch = { 
            id: newId, 
            name, 
            time, 
            instructor, 
            enrollmentFee: parseFloat(enrollmentFee) || 0,
            monthlyFee: parseFloat(monthlyFee) || 0,
            createdAt: new Date().toISOString() 
        };
        batches.push(newBatch);
        localStorage.setItem('batches', JSON.stringify(batches));
        return { success: true, batch: newBatch };
    }

    static deleteBatch(id) {
        const batches = this.getBatches();
        const filtered = batches.filter(b => b.id !== id);
        localStorage.setItem('batches', JSON.stringify(filtered));
        return true;
    }

    // --- Fee Management ---
    static getPayments() {
        return JSON.parse(localStorage.getItem('payments')) || [];
    }

    static getPlayerPayments(playerId) {
        return this.getPayments().filter(p => p.playerId === playerId).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static addPayment(playerId, amount, method, paymentType = 'Monthly') {
        const payments = this.getPayments();
        const newId = `PAY-${Date.now()}`;
        const now = new Date().toISOString();
        const newPayment = {
            id: newId,
            playerId,
            amount: parseFloat(amount),
            method,
            paymentType,
            date: now
        };
        payments.push(newPayment);
        localStorage.setItem('payments', JSON.stringify(payments));

        // Update expiry date and status if it's a monthly payment
        if (paymentType === 'Monthly') {
            const players = this.getPlayers();
            const pIndex = players.findIndex(p => p.id === playerId);
            if (pIndex !== -1) {
                const currentExpiry = new Date(players[pIndex].expiryDate || Date.now());
                // If already expired, start from today. If not, add to current.
                const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;
                baseDate.setDate(baseDate.getDate() + 30);
                
                players[pIndex].expiryDate = baseDate.toISOString();
                players[pIndex].status = 'Active';
                localStorage.setItem('players', JSON.stringify(players));
            }
        }

        return { success: true, payment: newPayment };
    }

    // --- Subscription Logic Helpers ---
    static getMemberExpiryStatus(player) {
        if (player.status === 'Left' || player.status === 'Pending') return player.status;
        if (!player.expiryDate) return player.status || 'Active';
        const now = new Date();
        const expiry = new Date(player.expiryDate);
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 'Expired';
        if (diffDays <= 5) return 'Expiring Soon';
        return 'Active';
    }

    static sendReminder(playerId, message) {
        const players = this.getPlayers();
        const pIndex = players.findIndex(p => p.id === playerId);
        if (pIndex !== -1) {
            if (!players[pIndex].reminders) players[pIndex].reminders = [];
            players[pIndex].reminders.unshift({
                id: `REM-${Date.now()}`,
                message,
                date: new Date().toISOString(),
                read: false
            });
            localStorage.setItem('players', JSON.stringify(players));
            return true;
        }
        return false;
    }

    // --- Event Management ---
    static getEvents() {
        return JSON.parse(localStorage.getItem('events')) || [];
    }

    static addEvent(title, date, description, bannerUrl, requiresPayment = false, fee = 0, paymentQrUrl = '', paymentUpiId = '', albumUrls = []) {
        const events = this.getEvents();
        const newId = `EVENT-${Date.now()}`;
        const newEvent = {
            id: newId,
            title,
            date,
            description,
            bannerUrl,
            requiresPayment,
            fee: parseFloat(fee) || 0,
            paymentQrUrl,
            paymentUpiId,
            albumUrls: Array.isArray(albumUrls) ? albumUrls : (albumUrls ? [albumUrls] : []),
            createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        localStorage.setItem('events', JSON.stringify(events));
        return { success: true, event: newEvent };
    }

    static addEventAlbumLink(eventId, albumUrl) {
        const events = this.getEvents();
        const index = events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            if (!events[index].albumUrls) {
                // Migration for old single link format
                events[index].albumUrls = events[index].albumUrl ? [events[index].albumUrl] : [];
                delete events[index].albumUrl;
            }
            events[index].albumUrls.push(albumUrl);
            localStorage.setItem('events', JSON.stringify(events));
            return true;
        }
        return false;
    }

    static deleteEventAlbumLink(eventId, linkIndex) {
        const events = this.getEvents();
        const index = events.findIndex(e => e.id === eventId);
        if (index !== -1 && events[index].albumUrls) {
            events[index].albumUrls.splice(linkIndex, 1);
            localStorage.setItem('events', JSON.stringify(events));
            return true;
        }
        return false;
    }

    static deleteEvent(eventId) {
        let events = this.getEvents();
        const initialLength = events.length;
        events = events.filter(e => e.id !== eventId);
        if (events.length !== initialLength) {
            localStorage.setItem('events', JSON.stringify(events));
            // Also delete associated registrations
            let regs = this.getEventRegistrations();
            regs = regs.filter(r => r.eventId !== eventId);
            localStorage.setItem('eventRegistrations', JSON.stringify(regs));
            return true;
        }
        return false;
    }

    static getEventRegistrations() {
        return JSON.parse(localStorage.getItem('eventRegistrations')) || [];
    }

    static getEventRegistrationsForEvent(eventId) {
        return this.getEventRegistrations().filter(r => r.eventId === eventId);
    }

    static addEventRegistration(eventId, playerId, screenshotUrl, photoUrl) {
        const regs = this.getEventRegistrations();
        const existing = regs.find(r => r.eventId === eventId && r.playerId === playerId);
        if (existing) {
             return { success: false, message: 'Already registered' };
        }
        const newReg = {
            id: `REG-${Date.now()}`,
            eventId,
            playerId,
            paymentScreenshotUrl: screenshotUrl || '',
            fighterPhotoUrl: photoUrl || '',
            status: 'Pending',
            registeredAt: new Date().toISOString()
        };
        regs.push(newReg);
        localStorage.setItem('eventRegistrations', JSON.stringify(regs));
        return { success: true, registration: newReg };
    }

    static approveEventRegistration(regId) {
        let regs = this.getEventRegistrations();
        const reg = regs.find(r => r.id === regId);
        if (reg) {
            reg.status = 'Approved';
            localStorage.setItem('eventRegistrations', JSON.stringify(regs));
            return true;
        }
        return false;
    }

    static rejectEventRegistration(regId) {
        let regs = this.getEventRegistrations();
        const reg = regs.find(r => r.id === regId);
        if (reg) {
            reg.status = 'Rejected';
            localStorage.setItem('eventRegistrations', JSON.stringify(regs));
            return true;
        }
        return false;
    }

    static getBanners() {
        return JSON.parse(localStorage.getItem('banners')) || [];
    }

    static addBanner(url, title, subtitle, redirectUrl = '') {
        const banners = this.getBanners();
        const newId = `BANNER-${Date.now()}`;
        const newBanner = { id: newId, url, title, subtitle, redirectUrl };
        banners.push(newBanner);
        localStorage.setItem('banners', JSON.stringify(banners));
        return { success: true, banner: newBanner };
    }

    static deleteBanner(id) {
        let banners = this.getBanners();
        const initialLength = banners.length;
        banners = banners.filter(b => b.id !== id);
        if (banners.length !== initialLength) {
            localStorage.setItem('banners', JSON.stringify(banners));
            return { success: true };
        }
        return { success: false, message: 'Banner not found' };
    }

    // --- Announcements / Chat Room Management ---
    static getAnnouncements() {
        return JSON.parse(localStorage.getItem('announcements')) || [];
    }

    static addAnnouncement(title, message, targetAudience, imageUrl = '') {
        const announcements = this.getAnnouncements();
        const newId = `ANN-${Date.now()}`;
        const newAnnouncement = {
            id: newId,
            title,
            message,
            targetAudience, // e.g. 'All Members', 'Expired Members', or '{Batch Name}'
            imageUrl,
            date: new Date().toISOString()
        };
        // Add to beginning of array so newest is first
        announcements.unshift(newAnnouncement);
        localStorage.setItem('announcements', JSON.stringify(announcements));
        return { success: true, announcement: newAnnouncement };
    }

    static deleteAnnouncement(id) {
        let announcements = this.getAnnouncements();
        const initialLength = announcements.length;
        announcements = announcements.filter(a => a.id !== id);
        if (announcements.length !== initialLength) {
            localStorage.setItem('announcements', JSON.stringify(announcements));
            return { success: true };
        }
        return { success: false, message: 'Announcement not found' };
    }

    // --- Workout Task Management ---
    static getTasks() {
        return JSON.parse(localStorage.getItem('workoutTasks')) || [];
    }

    static addTask(title, description, date, assignedTo) {
        // assignedTo: 'All' or array of player IDs ['CLUB-PLAYER-001', ...]
        const tasks = this.getTasks();
        const newTask = {
            id: `TASK-${Date.now()}`,
            title,
            description,
            date,
            assignedTo, // 'All' | string[] of player IDs
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        localStorage.setItem('workoutTasks', JSON.stringify(tasks));
        return { success: true, task: newTask };
    }

    static deleteTask(taskId) {
        let tasks = this.getTasks();
        const previousLength = tasks.length;
        tasks = tasks.filter(t => t.id !== taskId);
        if (tasks.length !== previousLength) {
            localStorage.setItem('workoutTasks', JSON.stringify(tasks));
            return true;
        }
        return false;
    }

    static getTasksForPlayer(playerId, date) {
        return this.getTasks().filter(t => {
            const dateMatch = !date || t.date === date;
            const assigned = t.assignedTo;
            const playerMatch = assigned === 'All' || (Array.isArray(assigned) && assigned.includes(playerId));
            return dateMatch && playerMatch;
        });
    }

    // --- Leave Application Management ---
    static getLeaveApplications() {
        return JSON.parse(localStorage.getItem('leaveApplications')) || [];
    }

    static getLeaveApplicationsByPlayer(playerId) {
        return this.getLeaveApplications()
            .filter(l => l.playerId === playerId)
            .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
    }

    static getPendingLeaveCount() {
        return this.getLeaveApplications().filter(l => l.status === 'Pending').length;
    }

    static submitLeaveApplication(playerId, playerName, fromDate, toDate, duration, reason, parentPhone) {
        const leaves = this.getLeaveApplications();
        const newLeave = {
            id: `LEAVE-${Date.now()}`,
            playerId,
            playerName,
            fromDate,   // YYYY-MM-DD
            toDate,     // YYYY-MM-DD
            duration,   // e.g. '1 Day', '2 Days', 'Half Day'
            reason,
            parentPhone,
            status: 'Pending',  // Pending | Approved | Rejected
            appliedAt: new Date().toISOString(),
            reviewedAt: null
        };
        leaves.unshift(newLeave);
        localStorage.setItem('leaveApplications', JSON.stringify(leaves));
        return { success: true, leave: newLeave };
    }

    static updateLeaveStatus(leaveId, status) {
        const leaves = this.getLeaveApplications();
        const leave = leaves.find(l => l.id === leaveId);
        if (!leave) return false;

        leave.status = status;
        leave.reviewedAt = new Date().toISOString();
        localStorage.setItem('leaveApplications', JSON.stringify(leaves));

        // If approved → mark attendance as Leave for each day in range
        if (status === 'Approved') {
            const attendance = this.getAttendance();
            // Iterate each date from fromDate to toDate
            const start = new Date(leave.fromDate);
            const end = new Date(leave.toDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toLocaleDateString();
                // Don't overwrite if present already
                const existing = attendance.find(a => a.playerId === leave.playerId && a.date === dateStr);
                if (!existing) {
                    attendance.push({
                        id: `ATT-LEAVE-${Date.now()}-${d.getDate()}`,
                        playerId: leave.playerId,
                        playerName: leave.playerName,
                        date: dateStr,
                        time: '—',
                        status: 'Leave'
                    });
                } else if (existing.status !== 'Present') {
                    existing.status = 'Leave';
                }
            }
            localStorage.setItem('attendance', JSON.stringify(attendance));
        }

        return true;
    }

    // --- Diet Plan Management ---
    static getDietPlans() {
        return JSON.parse(localStorage.getItem('dietPlans')) || [];
    }

    /**
     * @param {string} title
     * @param {string} category  'General' | 'Weight Loss' | 'Weight Gain' | 'Individual'
     * @param {string} description  Multi-line plan text
     * @param {string} fileUrl  Base64 string of attached PDF/image (optional)
     * @param {string} targetPlayerId  Required only when category === 'Individual'
     */
    static addDietPlan(title, category, description, fileUrl = '', targetPlayerId = '') {
        const plans = this.getDietPlans();
        const newPlan = {
            id: `DIET-${Date.now()}`,
            title,
            category,          // 'General' | 'Weight Loss' | 'Weight Gain' | 'Individual'
            description,
            fileUrl,
            targetPlayerId,    // set only for Individual plans
            createdAt: new Date().toISOString()
        };
        plans.unshift(newPlan);
        localStorage.setItem('dietPlans', JSON.stringify(plans));
        return { success: true, plan: newPlan };
    }

    static deleteDietPlan(id) {
        let plans = this.getDietPlans();
        const before = plans.length;
        plans = plans.filter(p => p.id !== id);
        if (plans.length !== before) {
            localStorage.setItem('dietPlans', JSON.stringify(plans));
            return true;
        }
        return false;
    }

    /** Returns plans visible to a specific player:
     *  - All 'General' plans
     *  - Plans whose category matches player's goal (Weight Loss / Weight Gain)
     *  - Individual plans targeted at this player
     */
    static getDietPlansForPlayer(playerId, playerGoal = '') {
        return this.getDietPlans().filter(p => {
            if (p.category === 'General') return true;
            if (p.category === 'Individual' && p.targetPlayerId === playerId) return true;
            if (playerGoal && p.category === playerGoal) return true;
            return false;
        });
    }

    // =====================================================
    // --- Training Progress Tracker ---
    // =====================================================

    static getTrainingLogs() {
        return JSON.parse(localStorage.getItem('trainingLogs')) || [];
    }

    /**
     * Add a daily training log entry for a player.
     * data: { date, punches:{jab,cross,hook,uppercut}, kicks:{front,roundhouse,side,low},
     *         conditioning:{pushups,squats,situps,skipping},
     *         bagWork:{rounds,roundDuration}, sparring:{rounds,partner} }
     */
    static addTrainingLog(playerId, playerName, data) {
        const logs = this.getTrainingLogs();
        const newLog = {
            id: `LOG-${Date.now()}`,
            playerId,
            playerName,
            date: data.date || new Date().toISOString().split('T')[0],
            punches: data.punches || { jab: 0, cross: 0, hook: 0, uppercut: 0 },
            kicks: data.kicks || { front: 0, roundhouse: 0, side: 0, low: 0 },
            conditioning: data.conditioning || { pushups: 0, squats: 0, situps: 0, skipping: 0 },
            bagWork: data.bagWork || { rounds: 0, roundDuration: 0 },
            sparring: data.sparring || { rounds: 0, partner: '' },
            createdAt: new Date().toISOString()
        };
        logs.unshift(newLog);
        localStorage.setItem('trainingLogs', JSON.stringify(logs));
        return { success: true, log: newLog };
    }

    static getPlayerTrainingLogs(playerId) {
        return this.getTrainingLogs()
            .filter(l => l.playerId === playerId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static getAllTrainingLogs() {
        return this.getTrainingLogs().sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // --- Skill Evaluations ---
    static getSkillEvaluations() {
        return JSON.parse(localStorage.getItem('skillEvaluations')) || [];
    }

    static addSkillEvaluation(playerId, playerName, ratings, comment = '', suggestions = '') {
        const evals = this.getSkillEvaluations();
        // Remove previous evaluation for same player
        const filtered = evals.filter(e => e.playerId !== playerId);
        const newEval = {
            id: `EVAL-${Date.now()}`,
            playerId,
            playerName,
            ratings, // { punch: 1-5, kick: 1-5, speed: 1-5, defense: 1-5, stamina: 1-5 }
            comment,
            suggestions,
            createdAt: new Date().toISOString()
        };
        filtered.unshift(newEval);
        localStorage.setItem('skillEvaluations', JSON.stringify(filtered));
        return { success: true, evaluation: newEval };
    }

    static getSkillEvaluation(playerId) {
        const evals = this.getSkillEvaluations();
        return evals.find(e => e.playerId === playerId) || null;
    }

    // --- Training Challenges ---
    static getTrainingChallenges() {
        return JSON.parse(localStorage.getItem('trainingChallenges')) || [];
    }

    static addTrainingChallenge(title, description, targetValue, type, reward = '') {
        const challenges = this.getTrainingChallenges();
        const newChallenge = {
            id: `CHAL-${Date.now()}`,
            title,
            description,
            targetValue: parseInt(targetValue) || 0,
            type, // 'punches' | 'kicks' | 'conditioning' | 'streak'
            reward, // e.g. "Free t-shirt", "Certificate of Excellence"
            completions: [], // array of playerId strings
            createdAt: new Date().toISOString()
        };
        challenges.unshift(newChallenge);
        localStorage.setItem('trainingChallenges', JSON.stringify(challenges));
        return { success: true, challenge: newChallenge };
    }

    static updateChallengeReward(challengeId, reward) {
        const challenges = this.getTrainingChallenges();
        const ch = challenges.find(c => c.id === challengeId);
        if (!ch) return false;
        ch.reward = reward;
        localStorage.setItem('trainingChallenges', JSON.stringify(challenges));
        return true;
    }

    static deleteTrainingChallenge(id) {
        let challenges = this.getTrainingChallenges();
        const before = challenges.length;
        challenges = challenges.filter(c => c.id !== id);
        if (challenges.length !== before) {
            localStorage.setItem('trainingChallenges', JSON.stringify(challenges));
            return true;
        }
        return false;
    }

    // Helper: check if a player completed a challenge (completions may be strings or objects)
    static _isCompleted(challenge, playerId) {
        return challenge.completions.some(c =>
            typeof c === 'string' ? c === playerId : c.playerId === playerId
        );
    }

    static completeChallengeForPlayer(challengeId, playerId) {
        const challenges = this.getTrainingChallenges();
        const challenge = challenges.find(c => c.id === challengeId);
        if (!challenge) return false;
        if (!this._isCompleted(challenge, playerId)) {
            challenge.completions.push(playerId);
            localStorage.setItem('trainingChallenges', JSON.stringify(challenges));
        }
        return true;
    }

    static getCompletedChallenges(playerId) {
        return this.getTrainingChallenges().filter(c => this._isCompleted(c, playerId));
    }


    // --- Training Notifications ---
    static getTrainingNotifications() {
        return JSON.parse(localStorage.getItem('trainingNotifications')) || [];
    }

    static addTrainingNotification(title, message, audience = 'All') {
        const notifs = this.getTrainingNotifications();
        const newNotif = {
            id: `TNOTIF-${Date.now()}`,
            title,
            message,
            audience, // 'All' or batch name
            createdAt: new Date().toISOString()
        };
        notifs.unshift(newNotif);
        localStorage.setItem('trainingNotifications', JSON.stringify(notifs));
        return { success: true, notification: newNotif };
    }

    static deleteTrainingNotification(id) {
        let notifs = this.getTrainingNotifications();
        const before = notifs.length;
        notifs = notifs.filter(n => n.id !== id);
        if (notifs.length !== before) {
            localStorage.setItem('trainingNotifications', JSON.stringify(notifs));
            return true;
        }
        return false;
    }

    static getTrainingNotificationsForPlayer(playerBatch = '') {
        return this.getTrainingNotifications().filter(n => {
            if (n.audience === 'All') return true;
            if (playerBatch && n.audience === playerBatch) return true;
            return false;
        });
    }

    // --- Expenses Tracker ---
    static getExpenses() {
        return JSON.parse(localStorage.getItem('expenses')) || [];
    }

    static addExpense(title, amount, category, date, notes) {
        const expenses = this.getExpenses();
        const newExpense = {
            id: `EXP-${Date.now()}`,
            title,
            amount: parseFloat(amount) || 0,
            category,
            date,
            notes,
            createdAt: new Date().toISOString()
        };
        expenses.unshift(newExpense); // newest first
        localStorage.setItem('expenses', JSON.stringify(expenses));
        return { success: true, expense: newExpense };
    }

    static deleteExpense(id) {
        let expenses = this.getExpenses();
        const before = expenses.length;
        expenses = expenses.filter(e => e.id !== id);
        if (expenses.length !== before) {
            localStorage.setItem('expenses', JSON.stringify(expenses));
            return true;
        }
        return false;
    }

    // --- Our Players Management ---
    static getOurPlayers() {
        return JSON.parse(localStorage.getItem('ourPlayers')) || [];
    }

    static addOurPlayer(name, achievement, imageUrl) {
        const players = this.getOurPlayers();
        const newId = `CHAMP-${Date.now()}`;
        const newPlayer = { id: newId, name, achievement, imageUrl };
        players.push(newPlayer);
        localStorage.setItem('ourPlayers', JSON.stringify(players));
        return { success: true, player: newPlayer };
    }

    static deleteOurPlayer(id) {
        let players = this.getOurPlayers();
        const initialLength = players.length;
        players = players.filter(p => p.id !== id);
        if (players.length !== initialLength) {
            localStorage.setItem('ourPlayers', JSON.stringify(players));
            return true;
        }
        return false;
    }
}

// Initialize db
Database.init();


