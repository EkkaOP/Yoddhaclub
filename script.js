document.addEventListener('DOMContentLoaded', () => {
    // ---- Dark Mode Toggle ----
    const darkToggleBtn = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');

    const applyDarkMode = (isDark) => {
        document.body.classList.toggle('dark-mode', isDark);
        if (darkModeIcon) {
            darkModeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
    };

    // Restore saved preference
    const savedTheme = localStorage.getItem('landingTheme');
    if (savedTheme === 'dark') applyDarkMode(true);

    if (darkToggleBtn) {
        darkToggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('landingTheme', isDark ? 'dark' : 'light');
            if (darkModeIcon) {
                darkModeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
        });
    }

    // ---- Carousel Functionality ----

    const track = document.querySelector('.carousel-track');
    const dotsContainer = document.querySelector('.carousel-dots');
    
    // Load banners from DB
    const banners = typeof Database !== 'undefined' ? Database.getBanners() : [];
    
    if (banners.length > 0 && track && dotsContainer) {
        track.innerHTML = banners.map(b => `
            <div class="slide" style="background-image: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), url('${b.url}'); ${b.redirectUrl && b.redirectUrl !== '#' ? 'cursor: pointer;' : ''}" ${b.redirectUrl && b.redirectUrl !== '#' ? `onclick="window.location.href='${b.redirectUrl}'"` : ''}>
                <div class="slide-content">
                    <h2>${b.title}</h2>
                    <p>${b.subtitle}</p>
                </div>
            </div>
        `).join('');
        
        dotsContainer.innerHTML = banners.map((b, i) => `
            <span class="dot ${i === 0 ? 'active' : ''}"></span>
        `).join('');
    }

    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let currentIndex = 0;
    const slideCount = slides.length;
    let autoSlideInterval;
    
    if (slideCount > 0) {
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

        // Touch Swipe for Mobile Carousel
        let touchStartX = 0;
        let touchEndX = 0;

        track.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoSlide();
        }, {passive: true});

        track.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoSlide();
        }, {passive: true});

        const handleSwipe = () => {
            if (touchEndX < touchStartX - 50) {
                nextSlide(); // Swipe left
            }
            if (touchEndX > touchStartX + 50) {
                let prevIndex = (currentIndex - 1 + slideCount) % slideCount;
                goToSlide(prevIndex); // Swipe right
            }
        };
    }


    // ---- Scroll Animations ----
    const fadeElements = document.querySelectorAll('.fade-element');
    
    // Intersection Observer to add 'visible' class when elements enter viewport
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => scrollObserver.observe(el));

    // ---- Load Events Dynamically ----
    const publicEventsContainer = document.getElementById('publicEventsContainer');
    const publicPastEventsContainer = document.getElementById('publicPastEventsContainer');
    const pastEventsSection = document.getElementById('pastEventsSection');

    if (typeof Database !== 'undefined') {
        const now = new Date();
        const allEvents = Database.getEvents().sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const upcomingEvents = allEvents.filter(ev => new Date(ev.date) >= now);
        const pastEvents = allEvents.filter(ev => new Date(ev.date) < now).reverse();

        // Render Upcoming
        if (publicEventsContainer) {
            const eventsSection = publicEventsContainer.closest('section');
            if (eventsSection) eventsSection.classList.add('visible');

            if (upcomingEvents.length === 0) {
                publicEventsContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
                        <i class="fa-regular fa-calendar-xmark fa-3x" style="margin-bottom: 1rem; opacity: 0.4; display:block;"></i>
                        <p>No upcoming events. Check back soon!</p>
                    </div>`;
            } else {
                publicEventsContainer.innerHTML = upcomingEvents.map(ev => renderPublicEventCard(ev, false)).join('');
            }
        }

        // Render Past
        if (publicPastEventsContainer) {
            if (pastEvents.length > 0) {
                if (pastEventsSection) {
                    pastEventsSection.style.display = 'block';
                    pastEventsSection.classList.add('visible');
                }
                publicPastEventsContainer.innerHTML = pastEvents.map(ev => renderPublicEventCard(ev, true)).join('');
            }
        }

        function renderPublicEventCard(ev, isPast) {
            const dateObj = new Date(ev.date);
            const dateStr = dateObj.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
            const feeStr = ev.requiresPayment
                ? `<span style="background:var(--primary); color:#fff; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem; font-weight:600;">Fee: ₹${ev.fee}</span>`
                : `<span style="background:#16a34a; color:#fff; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem; font-weight:600;">Free Entry</span>`;

            const albumUrls = ev.albumUrls || (ev.albumUrl ? [ev.albumUrl] : []);
            let linksHtml = '';
            
            if (isPast && albumUrls.length > 0) {
                linksHtml = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                    ${albumUrls.map((url, idx) => `
                        <a href="${url}" target="_blank" class="btn btn-primary btn-full" style="font-size: 0.8rem; padding: 0.4rem;">
                            <i class="fa-solid fa-images"></i> View Gallery ${idx + 1}
                        </a>
                    `).join('')}
                </div>`;
            } else {
                linksHtml = `<a href="login.html" class="btn btn-outline btn-full">${isPast ? 'Event Finished' : 'Register Now'}</a>`;
            }

            return `
            <div class="card event-card" style="overflow:hidden; opacity:1; transform:none;">
                <img src="${ev.bannerUrl}" alt="${ev.title}" style="width:100%; height:180px; object-fit:cover; display:block;">
                <div class="card-content">
                    <div class="event-meta" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                        <span><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                        ${feeStr}
                    </div>
                    <h3 style="margin-bottom:0.5rem;">${ev.title}</h3>
                    <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1rem; line-height:1.5;">${ev.description}</p>
                    ${linksHtml}
                </div>
            </div>`;
        }
    }

    // ---- Club Leaderboard ----
    const publicLbContainer = document.getElementById('publicLeaderboardContainer');
    const publicLbBtns = document.querySelectorAll('[data-public-lb]');
    
    const sumLog = (log, type) => {
        let total = 0;
        if (!log || !log.exercises) return total;
        log.exercises.forEach(ex => {
            if (ex.category === type) total += parseFloat(ex.count) || 0;
        });
        return total;
    };

    const renderPublicLeaderboard = (type) => {
        if (!publicLbContainer || typeof Database === 'undefined') return;
        const logs = Database.getAllTrainingLogs() || [];
        const players = Database.getPlayers() || [];
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
            publicLbContainer.innerHTML = '<p class="text-center text-muted" style="padding:2rem;">No data yet. Members need to log training first!</p>';
            return;
        }
        
        const typeLabel = type === 'punches' ? 'Punches' : type === 'kicks' ? 'Kicks' : type === 'conditioning' ? 'Conditioning' : 'Sessions';
        const maxVal = ranked[0].total;

        // Show top 5 on landing page
        publicLbContainer.innerHTML = ranked.slice(0, 5).map((p, i) => {
            const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
            const pct = Math.round((p.total / maxVal) * 100);
            return `<div class="tp-leaderboard-row">
                <div class="tp-rank-badge ${rankCls}">${i + 1}</div>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:0.9rem;">${p.name}</div>
                    <div class="tp-progress-bar-container"><div class="tp-progress-bar-fill" style="width:${pct}%;"></div></div>
                </div>
                <div style="text-align:right;font-weight:700;font-size:0.95rem;color:var(--primary);">${p.total.toLocaleString()}<br><small class="text-muted" style="font-size:0.72rem;">${typeLabel}</small></div>
            </div>`;
        }).join('');
    };

    if (publicLbContainer) {
        renderPublicLeaderboard('punches');
        publicLbBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                publicLbBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderPublicLeaderboard(btn.dataset.publicLb);
            });
        });
    }

    // ---- Our Players Rendering ----
    const ourPlayersContainer = document.getElementById('ourPlayersContainer');
    if (ourPlayersContainer && typeof Database !== 'undefined') {
        const players = Database.getOurPlayers();
        if (players.length > 0) {
            ourPlayersContainer.innerHTML = players.map(p => `
                <div class="card champion-card">
                    <img src="${p.imageUrl}" alt="${p.name}">
                    <div class="champ-badge"><i class="fa-solid fa-star"></i></div>
                    <div class="card-content">
                        <h3>${p.name}</h3>
                        <p class="achievement">${p.achievement}</p>
                    </div>
                </div>
            `).join('');
        } else {
            ourPlayersContainer.innerHTML = '<p class="text-muted" style="padding: 2rem;">Coming soon...</p>';
        }
    }
});
