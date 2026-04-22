/**
 * NOTEBING - CORE ENGINE (Modular Architecture)
 * 
 * Architecture Pattern: 
 * - State: Single Source of Truth (Normalized)
 * - API: Data Layer (Simulated)
 * - Views: Presentation Layer (Modularized)
 * - Router: Navigation Layer
 * - App: Orchestrator
 */

/* ==========================================================================
   1. STATE MANAGEMENT (Normalized)
   ========================================================================== */
const AppState = {
    currentView: 'home',
    isPublishing: false,
    currentUser: { 
        id: 'u_me', handle: 'tu_usuario', name: 'Tú', avatar: 'T',
        bio: "Frontend Architect & Product Thinker 🚀",
        followersCount: 342, followingCount: 128,
        likedNotes: new Set(), savedNotes: new Set(), renotedNotes: new Set(),
        followedUsers: new Set(), followedNiches: new Set(),
        ownNotes: new Set()
    },
    users: {},   // { id: { user_obj } }
    niches: {},  // { id: { niche_obj } }
    notes: {}    // { id: { note_obj } }
};

/* ==========================================================================
   2. DATA LAYER (API Simulation)
   ========================================================================== */
const ApiService = {
    async publish(content, visibility, nicheId) {
        return new Promise(res => setTimeout(() => {
            const id = `n_${Date.now()}`;
            const note = {
                id, authorId: 'u_me', content, visibility, nicheId,
                likesCount: 0, renotesCount: 0, timestamp: Date.now(), isAiClassified: false
            };
            AppState.notes[id] = note;
            AppState.currentUser.ownNotes.add(id);
            res(note);
        }, 800));
    },
    async classify(content) {
        return new Promise(res => setTimeout(() => {
            const text = content.toLowerCase();
            if (text.includes('code') || text.includes('app')) res('tech');
            else if (text.includes('startup') || text.includes('mvp')) res('startups');
            else res('philosophy');
        }, 1200));
    }
};

/* ==========================================================================
   3. VIEW MODULES (Scalable Presentation)
   ========================================================================== */
// Cada objeto dentro de Views es un módulo independiente. 
// Para añadir una pestaña nueva, solo creas un nuevo objeto aquí.
const Views = {
    home: {
        title: "Inicio",
        render: () => `
            <div class="composer p-4 border-b border-[var(--border-color)] flex gap-3">
                <div class="avatar w-10 h-10 flex items-center justify-center text-sm font-bold text-white bg-[var(--accent-primary)] rounded-full">T</div>
                <div class="flex-1">
                    <textarea id="note-input" class="w-full text-lg bg-transparent border-none resize-none outline-none" placeholder="¿Qué estás aprendiendo?"></textarea>
                    <div class="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border-color)]">
                        <div class="flex gap-2">
                            <select id="note-visibility" class="text-xs font-semibold bg-[var(--bg-base)] p-1 rounded-full border border-[var(--border-color)]">
                                <option value="PUBLIC">🌍 Público</option>
                                <option value="NICHE">🎯 Nicho</option>
                                <option value="PRIVATE">🔒 Privado</option>
                            </select>
                            <select id="note-niche" class="text-xs font-semibold bg-[var(--bg-base)] p-1 rounded-full border border-[var(--border-color)]">
                                <option value="">✨ IA Auto</option>
                                ${Object.values(AppState.niches).map(n => `<option value="${n.id}">${n.icon} ${n.name}</option>`).join('')}
                            </select>
                        </div>
                        <button id="btn-publish" class="bg-[var(--accent-primary)] text-white px-5 py-1.5 rounded-full font-bold text-sm">Postear</button>
                    </div>
                </div>
            </div>
            <div id="feed-container" class="flex flex-col"></div>
        `,
        onMount: () => {
            App.bindComposer();
            App.renderFeed();
        }
    },

    niches: {
        title: "Tus Nichos",
        render: () => `
            <div class="p-6">
                <h2 class="text-2xl font-extrabold mb-6">Explorar Nichos</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    ${Object.values(AppState.niches).map(n => `
                        <div class="widget p-5 rounded-2xl border border-[var(--border-color)] flex items-center justify-between hover:bg-[var(--bg-surface-hover)] transition-all cursor-pointer" onclick="App.handleFollowNiche('${n.id}')">
                            <div class="flex items-center gap-4">
                                <span class="text-3xl">${n.icon}</span>
                                <div>
                                    <div class="font-bold">${n.name}</div>
                                    <div class="text-xs text-[var(--text-secondary)]">${n.followersCount.toLocaleString()} notas</div>
                                </div>
                            </div>
                            <button class="btn-follow text-xs font-bold ${AppState.currentUser.followedNiches.has(n.id) ? 'following' : ''}" data-type="niche" data-id="${n.id}">
                                ${AppState.currentUser.followedNiches.has(n.id) ? 'Siguiendo' : 'Seguir'}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `,
        onMount: () => {}
    },

    brain: {
        title: "Segundo Cerebro",
        render: () => `
            <div class="p-6">
                <h2 class="text-2xl font-extrabold mb-2">Tu Segundo Cerebro</h2>
                <p class="text-[var(--text-secondary)] text-sm mb-6">Tus notas privadas y guardadas.</p>
                <div id="feed-container" class="flex flex-col"></div>
            </div>
        `,
        onMount: () => App.renderFeed()
    },

    profile: {
        title: "Perfil",
        render: () => {
            const u = AppState.currentUser;
            return `
                <div class="p-6">
                    <div class="flex flex-col items-center text-center mb-8">
                        <div class="avatar w-24 h-24 text-3xl mb-4">${u.avatar}</div>
                        <h2 class="text-2xl font-extrabold">${u.name}</h2>
                        <p class="text-[var(--text-secondary)]">@${u.handle}</p>
                        <p class="mt-4 text-sm max-w-xs">${u.bio}</p>
                        <div class="flex gap-8 mt-6">
                            <div class="text-center"><div class="font-bold">${u.followingCount}</div><div class="text-xs text-[var(--text-secondary)]">Siguiendo</div></div>
                            <div class="text-center"><div class="font-bold">${u.followersCount}</div><div class="text-xs text-[var(--text-secondary)]">Seguidores</div></div>
                        </div>
                    </div>
                    <h3 class="font-bold text-lg mb-4">Mis Notas</h3>
                    <div id="feed-container" class="flex flex-col"></div>
                </div>
            `;
        },
        onMount: () => App.renderFeed()
    }
};

/* ==========================================================================
   4. ROUTER (Navigation Layer)
   ========================================================================== */
const Router = {
    navigate(viewName) {
        if (!Views[viewName]) return;
        
        AppState.currentView = viewName;
        
        // 1. Update UI State (Nav active classes)
        document.querySelectorAll('.nav-item, .nav-item-desktop').forEach(el => {
            el.classList.toggle('active', el.dataset.view === viewName);
        });

        // 2. Update Header
        document.getElementById('view-title').textContent = Views[viewName].title;

        // 3. Render View
        const container = document.getElementById('view-container');
        container.innerHTML = Views[viewName].render();

        // 4. Execute View Lifecycle (onMount)
        if (Views[viewName].onMount) {
            Views[viewName].onMount();
        }

        // 5. Update Sidebars (Desktop)
        App.renderSidebars();
    }
};

/* ==========================================================================
   5. APP ORCHESTRATOR (The Controller)
   ========================================================================== */
const App = {
    init() {
        MockEngine.generate();
        this.cacheDOM();
        this.bindEvents();
        this.render();
    },

    cacheDOM() {
        this.container = document.getElementById('view-container');
        this.feedContainer = document.getElementById('feed-container');
        this.navItems = document.querySelectorAll('.nav-item, .nav-item-desktop');
        this.toast = document.getElementById('toast');
        this.themeBtn = document.getElementById('theme-toggle');
    },

    bindEvents() {
        // Navigation
        this.navItems.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                Router.navigate(btn.dataset.view);
            });
        });

        // Theme
        this.themeBtn.addEventListener('click', () => this.toggleTheme());

        // Global Event Delegation (High Performance)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn, .opt-btn, .btn-follow, .btn-primary');
            if (!btn) return;

            const { action, id, type } = btn.dataset;
            if (action === 'like') this.handleLike(id, btn);
            if (action === 'save') this.handleSave(id, btn);
            if (action === 'delete') this.handleDelete(id);
            if (action === 'edit') this.handleEdit(id);
            if (action === 'renote') this.handleRenote(id, btn);
            if (btn.classList.contains('btn-follow')) {
                if (type === 'user') this.handleFollowUser(id, btn);
                if (type === 'niche') this.handleFollowNiche(id, btn);
            }
            if (btn.id === 'btn-publish') this.handlePublish();
        });
    },

    // --- VIEW LOGIC ---
    render() {
        Router.navigate(AppState.currentView);
    },

    bindComposer() {
        const btn = document.getElementById('btn-publish');
        if (btn) btn.onclick = () => this.handlePublish();
    },

    focusComposer() {
        if (AppState.currentView !== 'home') Router.navigate('home');
        setTimeout(() => document.getElementById('note-input').focus(), 100);
    },

    renderFeed() {
        this.feedContainer.innerHTML = '';
        let notes = Object.values(AppState.notes).sort((a,b) => b.timestamp - a.timestamp);

        // Filtering Logic
        if (AppState.currentView === 'brain') {
            notes = notes.filter(n => n.visibility === 'PRIVATE' || AppState.currentUser.savedNotes.has(n.id));
        } else if (AppState.currentView === 'profile') {
            notes = notes.filter(n => n.authorId === AppState.currentUser.id);
        } else if (AppState.currentView === 'home') {
            notes = notes.filter(n => 
                n.visibility !== 'PRIVATE' && 
                (AppState.currentUser.followedUsers.has(n.authorId) || 
                 AppState.currentUser.followedNiches.has(n.nicheId) || 
                 n.authorId === AppState.currentUser.id)
            );
        }

        if (notes.length === 0) {
            this.feedContainer.innerHTML = `<div class="p-20 text-center opacity-50">No hay contenido aquí.</div>`;
            return;
        }

        const frag = document.createDocumentFragment();
        notes.forEach(note => {
            const author = AppState.users[note.authorId];
            const niche = note.nicheId ? AppState.niches[note.nicheId] : null;
            const isOwn = note.authorId === AppState.currentUser.id;

            const div = document.createElement('div');
            div.className = 'note-card p-4 border-b border-[var(--border-color)] animate-fadeIn';
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex gap-3">
                        <div class="avatar w-10 h-10 flex items-center justify-center text-sm font-bold text-white bg-indigo-500">${author.avatar}</div>
                        <div>
                            <div class="font-bold text-sm">${author.name} <span class="text-[var(--text-secondary)] font-normal text-xs">@${author.handle}</span></div>
                            <div class="text-[10px] text-[var(--text-secondary)]">${this.timeAgo(note.timestamp)}</div>
                        </div>
                    </div>
                    ${isOwn ? `
                        <div class="flex gap-1">
                            <button class="opt-btn edit p-1" data-action="edit" data-id="${note.id}">✏️</button>
                            <button class="opt-btn p-1" data-action="delete" data-id="${note.id}">🗑️</button>
                        </div>
                    ` : ''}
                </div>
                <div class="text-sm leading-relaxed ml-14 mb-3">${note.content}</div>
                <div class="ml-14 flex flex-wrap gap-2 mb-3">
                    ${note.isAiClassified ? `<span class="badge badge-ai text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">✨ Gemini AI</span>` : ''}
                    ${niche ? `<span class="badge text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-color)]">${niche.icon} ${niche.name}</span>` : ''}
                    ${note.visibility === 'PRIVATE' ? `<span class="badge text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">🔒 Privado</span>` : ''}
                </div>
                <div class="flex gap-6 ml-14 text-[var(--text-secondary)] text-xs font-semibold">
                    <button class="action-btn flex items-center gap-1 ${AppState.currentUser.likedNotes.has(note.id) ? 'liked' : ''}" data-action="like" data-id="${note.id}">
                        <span class="icon">${AppState.currentUser.likedNotes.has(note.id) ? '❤️' : '🤍'}</span> ${note.likesCount}
                    </button>
                    <button class="action-btn flex items-center gap-1 ${AppState.currentUser.renotedNotes.has(note.id) ? 'renoted' : ''}" data-action="renote" data-id="${note.id}">
                        <span class="icon">🔄</span> ${note.renotesCount}
                    </button>
                    <button class="action-btn flex items-center gap-1 ${AppState.currentUser.savedNotes.has(note.id) ? 'saved' : ''}" data-action="save" data-id="${note.id}">
                        <span class="icon">🧠</span>
                    </button>
                </div>
            `;
            frag.appendChild(div);
        });
        this.feedContainer.appendChild(frag);
    },

    renderSidebars() {
        const nicheList = document.getElementById('trending-niches');
        if (nicheList) {
            nicheList.innerHTML = Object.values(AppState.niches).slice(0, 5).map(n => `
                <div class="flex justify-between items-center">
                    <div class="text-sm font-medium">${n.icon} ${n.name}</div>
                    <button class="btn-follow text-xs font-bold ${AppState.currentUser.followedNiches.has(n.id) ? 'following' : ''}" data-type="niche" data-id="${n.id}">
                        ${AppState.currentUser.followedNiches.has(n.id) ? 'Siguiendo' : 'Seguir'}
                    </button>
                </div>
            `).join('');
        }

        const userList = document.getElementById('suggested-users');
        if (userList) {
            userList.innerHTML = Object.values(AppState.users)
                .filter(u => u.id !== 'u_me' && !AppState.currentUser.followedUsers.has(u.id))
                .slice(0, 3).map(u => `
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <div class="avatar w-8 h-8 text-[10px]">${u.avatar}</div>
                            <div class="text-sm font-bold leading-tight">${u.name}</div>
                        </div>
                        <button class="btn-follow text-xs font-bold ${AppState.currentUser.followedUsers.has(u.id) ? 'following' : ''}" data-type="user" data-id="${u.id}">
                            ${AppState.currentUser.followedUsers.has(u.id) ? 'Siguiendo' : 'Seguir'}
                        </button>
                    </div>
                `).join('');
        }
    },

    // --- ACTIONS ---
    async handlePublish() {
        const content = document.getElementById('note-input').value.trim();
        const visibility = document.getElementById('note-visibility').value;
        const nicheId = document.getElementById('note-niche').value;

        if (!content || AppState.isPublishing) return;

        AppState.isPublishing = true;
        this.showToast("Publicando...");

        try {
            let finalNiche = nicheId || null;
            let isAi = false;
            if (!nicheId && visibility !== 'PRIVATE') {
                finalNiche = await ApiService.classify(content);
                isAi = true;
            }
            const note = await ApiService.publish(content, visibility, finalNiche);
            note.isAiClassified = isAi;
            this.showToast("✅ Publicado");
            this.render();
        } catch (e) {
            this.showToast("❌ Error");
        } finally {
            AppState.isPublishing = false;
        }
    },

    handleLike(id, btn) {
        const note = AppState.notes[id];
        const isLiked = AppState.currentUser.likedNotes.has(id);
        if (isLiked) {
            AppState.currentUser.likedNotes.delete(id);
            note.likesCount--;
        } else {
            AppState.currentUser.likedNotes.add(id);
            note.likesCount++;
        }
        btn.classList.toggle('liked', !isLiked);
        btn.innerHTML = `<span class="icon">${isLiked ? '🤍' : '❤️'}</span> ${note.likesCount}`;
    },

    handleSave(id, btn) {
        const isSaved = AppState.currentUser.savedNotes.has(id);
        if (isSaved) AppState.currentUser.savedNotes.delete(id);
        else AppState.currentUser.savedNotes.add(id);
        btn.classList.toggle('saved', !isSaved);
        this.showToast(!isSaved ? "🧠 Guardado en Cerebro" : "Removido");
        this.render();
    },

    handleRenote(id, btn) {
        const note = AppState.notes[id];
        const isRenoted = AppState.currentUser.renotedNotes.has(id);
        if (isRenoted) AppState.currentUser.renotedNotes.delete(id);
        else AppState.currentUser.renotedNotes.add(id);
        btn.classList.toggle('renoted', !isRenoted);
        btn.innerHTML = `<span class="icon">🔄</span> ${isRenoted ? note.renotesCount - 1 : note.renotesCount + 1}`;
    },

    handleDelete(id) {
        if(confirm("¿Eliminar nota?")) {
            delete AppState.notes[id];
            this.showToast("🗑️ Eliminada");
            this.render();
        }
    },

    handleEdit(id) {
        const note = AppState.notes[id];
        const text = prompt("Editar nota:", note.content);
        if (text) {
            note.content = text;
            this.showToast("✏️ Actualizada");
            this.render();
        }
    },

    handleFollowUser(userId, btn) {
        const isFollowing = AppState.currentUser.followedUsers.has(userId);
        if (isFollowing) AppState.currentUser.followedUsers.delete(userId);
        else AppState.currentUser.followedUsers.add(userId);
        btn.textContent = isFollowing ? 'Seguir' : 'Siguiendo';
        btn.classList.toggle('following', !isFollowing);
        this.render();
    },

    handleFollowNiche(nicheId, btn) {
        const isFollowing = AppState.currentUser.followedNiches.has(nicheId);
        if (isFollowing) AppState.currentUser.followedNiches.delete(nicheId);
        else AppState.currentUser.followedNiches.add(nicheId);
        btn.textContent = isFollowing ? 'Seguir' : 'Siguiendo';
        btn.classList.toggle('following', !isFollowing);
        this.render();
    },

    toggleTheme() {
        const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    },

    showToast(msg) {
        this.toast.textContent = msg;
        this.toast.classList.add('show');
        setTimeout(() => this.toast.classList.remove('show'), 2500);
    },

    timeAgo(ts) {
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return 'Ahora';
        if (diff < 3600) return `${Math.floor(diff/60)}m`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h`;
        return `${Math.floor(diff/86400)}d`;
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

/* ==========================================================================
   6. MOCK ENGINE (Data Generation)
   ========================================================================== */
const MockEngine = {
    generate() {
        // 1. Niches
        const nicheData = [
            { id: 'tech', name: 'Tecnología', icon: '💻' },
            { id: 'startups', name: 'Startups', icon: '🚀' },
            { id: 'ai', name: 'IA', icon: '🤖' },
            { id: 'design', name: 'Diseño', icon: '🎨' },
            { id: 'philosophy', name: 'Filosofía', icon: '🤔' },
            { id: 'fitness', name: 'Fitness', icon: '💪' },
            { id: 'productivity', name: 'Productividad', icon: '⏱️' },
            { id: 'crypto', name: 'Crypto', icon: '🪙' }
        ];
        nicheData.forEach(n => AppState.niches[n.id] = { ...n, followersCount: Math.floor(Math.random() * 5000) });

        // 2. Users (The 20 provided)
        const users = [
            { id: "u_1", handle: "alex_chen_dev", name: "Alex Chen", avatar: "https://i.pravatar.cc/150?img=1", bio: "Software Architect building scalable distributed systems.", niches: ["tech", "productivity"], followersCount: 842, followingCount: 210 },
            { id: "u_2", handle: "elena_design", name: "Elena Smith", avatar: "https://i.pravatar.cc/150?img=2", bio: "Visual storyteller and UI enthusiast.", niches: ["design", "productivity"], followersCount: 1205, followingCount: 430 },
            { id: "u_3", handle: "stoic_marcus", name: "Marcus Aurelius", avatar: "https://i.pravatar.cc/150?img=3", bio: "Applying ancient wisdom to modern chaos.", niches: ["philosophy", "productivity"], followersCount: 560, followingCount: 90 },
            { id: "u_4", handle: "sam_river_ai", name: "Sam River", avatar: "https://i.pravatar.cc/150?img=4", bio: "Exploring the frontiers of Large Language Models.", niches: ["ai", "tech"], followersCount: 3400, followingCount: 510 },
            { id: "u_5", handle: "jordan_lift", name: "Jordan Lift", avatar: "https://i.pravatar.cc/150?img=5", bio: "Daily gains and disciplined routines.", niches: ["fitness", "productivity"], followersCount: 2100, followingCount: 340 },
            { id: "u_6", handle: "max_codes", name: "Max Code", avatar: "https://i.pravatar.cc/150?img=6", bio: "JavaScript fanatic and indie hacker.", niches: ["tech", "startups"], followersCount: 450, followingCount: 120 },
            { id: "u_7", handle: "startup_queen", name: "Startup Queen", avatar: "https://i.pravatar.cc/150?img=7", bio: "Serial entrepreneur building in public.", niches: ["startups", "design"], followersCount: 890, followingCount: 300 },
            { id: "u_8", handle: "phil_mind", name: "Phil Mind", avatar: "https://i.pravatar.cc/150?img=8", bio: "Seeking truth through logic and reason.", niches: ["philosophy", "tech"], followersCount: 320, followingCount: 150 },
            { id: "u_9", handle: "fit_tech_guy", name: "Fit Tech Guy", avatar: "https://i.pravatar.cc/150?img=9", bio: "Performance tracking and wearable tech enthusiast.", niches: ["fitness", "tech"], followersCount: 760, followingCount: 280 },
            { id: "u_10", handle: "prod_hacker", name: "Prod Hacker", avatar: "https://i.pravatar.cc/150?img=10", bio: "Systems to maximize human output.", niches: ["productivity", "ai"], followersCount: 1500, followingCount: 400 },
            { id: "u_11", handle: "design_lead_pro", name: "Design Lead", avatar: "https://i.pravatar.cc/150?img=11", bio: "Creative direction for global brands.", niches: ["design", "startups"], followersCount: 920, followingCount: 210 },
            { id: "u_12", handle: "logic_coder", name: "Logic Coder", avatar: "https://i.pravatar.cc/150?img=12", bio: "Where technical implementation meets logic.", niches: ["tech", "philosophy"], followersCount: 410, followingCount: 180 },
            { id: "u_13", handle: "ai_creative", name: "AI Creative", avatar: "https://i.pravatar.cc/150?img=13", bio: "Generative art and AI-driven design.", niches: ["ai", "design"], followersCount: 1100, followingCount: 350 },
            { id: "u_14", handle: "fit_founder", name: "Fit Founder", avatar: "https://i.pravatar.cc/150?img=14", bio: "Building empires and building muscle.", niches: ["startups", "fitness"], followersCount: 650, followingCount: 190 },
            { id: "u_15", handle: "zen_mode_on", name: "Zen Mode", avatar: "https://i.pravatar.cc/150?img=15", bio: "Minimalism and deep work.", niches: ["productivity", "philosophy"], followersCount: 280, followingCount: 110 },
            { id: "u_16", handle: "solo_dev_mike", name: "Solo Dev Mike", avatar: "https://i.pravatar.cc/150?img=16", bio: "Bootstrapping SaaS products.", niches: ["startups", "tech"], followersCount: 540, followingCount: 220 },
            { id: "u_17", handle: "bio_hacker_ai", name: "Bio Hacker", avatar: "https://i.pravatar.cc/150?img=17", bio: "Optimizing biology with machine learning.", niches: ["ai", "fitness"], followersCount: 890, followingCount: 410 },
            { id: "u_18", handle: "design_math", name: "Design Math", avatar: "https://i.pravatar.cc/150?img=18", bio: "Exploring the geometry of beautiful interfaces.", niches: ["design", "philosophy"], followersCount: 430, followingCount: 120 },
            { id: "u_19", handle: "founder_flow", name: "Founder Flow", avatar: "https://i.pravatar.cc/150?img=19", bio: "Scaling from 0 to 1 without burnout.", niches: ["startups", "productivity"], followersCount: 1400, followingCount: 380 },
            { id: "u_20", handle: "tech_athlete", name: "Tech Athlete", avatar: "https://i.pravatar.cc/150?img=20", bio: "Code and cardio. Every single day.", niches: ["tech", "fitness"], followersCount: 310, followingCount: 140 }
        ];
        users.forEach(u => { AppState.users[u.id] = u; });

        // 3. Generate 80 Notes
        const texts = ["Clean code is a love letter to your future self.", "Build in public, learn in public.", "AI is a tool, not a replacement.", "Design is thinking made visual.", "Consistency > Intensity."];
        for (let i = 1; i <= 80; i++) {
            const authorId = `u_${Math.floor(Math.random() * 20) + 1}`;
            const nIds = Object.keys(AppState.niches);
            const nId = Math.random() > 0.4 ? nIds[Math.floor(Math.random() * nIds.length)] : null;
            const id = `n_${i}`;
            AppState.notes[id] = {
                id, authorId,
                content: texts[Math.floor(Math.random() * texts.length)],
                visibility: Math.random() > 0.8 ? 'PRIVATE' : (Math.random() > 0.8 ? 'NICHE' : 'PUBLIC'),
                nicheId: nId,
                likesCount: Math.floor(Math.random() * 30),
                renotesCount: Math.floor(Math.random() * 5),
                timestamp: Date.now() - Math.floor(Math.random() * 50000000),
                isAiClassified: Math.random() > 0.7
            };
            if (authorId === 'u_me') AppState.currentUser.ownNotes.add(id);
        }
    }
};

// --- 6. APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => App.init());

</script>
</body>
</html>
