/**
 * NOTEBING - CORE ENGINE v3
 * 
 * Cambios recientes:
 * - Lucide Icons integrados (0% emojis, 100% SVG minimalista).
 * - CSS Grid Layout (Notion / X style compliance).
 */

/* ==========================================================================
   1. STATE MANAGEMENT
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
    users: {},
    niches: {},
    notes: {}
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
                likesCount: 0, renotesCount: 0,
                timestamp: Date.now(), isAiClassified: false
            };
            AppState.notes[id] = note;
            AppState.currentUser.ownNotes.add(id);
            res(note);
        }, 800));
    },

    async classify(content) {
        return new Promise(res => setTimeout(() => {
            const text = content.toLowerCase();
            if (text.match(/\b(code|app|js|css|html|dev|software|api)\b/)) res('tech');
            else if (text.match(/\b(startup|mvp|saas|founder|build|product)\b/)) res('startups');
            else if (text.match(/\b(ai|llm|model|gpt|gemini|neural)\b/)) res('ai');
            else if (text.match(/\b(design|ui|ux|color|font|visual)\b/)) res('design');
            else if (text.match(/\b(god|mind|purpose|truth|meaning|stoic)\b/)) res('philosophy');
            else if (text.match(/\b(gym|lift|run|food|health|diet|fitness)\b/)) res('fitness');
            else res('productivity');
        }, 1200));
    }
};

/* ==========================================================================
   3. MODAL SYSTEM
   ========================================================================== */
const Modal = {
    _resolve: null,
    _el: {
        overlay:   () => document.getElementById('modal-overlay'),
        message:   () => document.getElementById('modal-message'),
        inputWrap: () => document.getElementById('modal-input-wrap'),
        input:     () => document.getElementById('modal-input'),
        confirm:   () => document.getElementById('modal-confirm'),
        cancel:    () => document.getElementById('modal-cancel'),
    },
    init() {
        this._el.confirm().addEventListener('click', () => this._close(true));
        this._el.cancel().addEventListener('click',  () => this._close(false));
        this._el.overlay().addEventListener('click', (e) => {
            if (e.target === this._el.overlay()) this._close(false);
        });
    },
    confirm(message, danger = true) {
        this._el.message().innerHTML = message;
        this._el.inputWrap().classList.add('hidden');
        this._el.confirm().textContent = 'Eliminar';
        this._el.confirm().className = 'btn-primary' + (danger ? ' btn--danger' : '');
        this._el.overlay().classList.remove('hidden');
        return new Promise(res => { this._resolve = res; });
    },
    prompt(message, currentValue = '') {
        this._el.message().innerHTML = message;
        this._el.inputWrap().classList.remove('hidden');
        this._el.input().value = currentValue;
        this._el.confirm().textContent = 'Guardar';
        this._el.confirm().className = 'btn-primary';
        this._el.overlay().classList.remove('hidden');
        setTimeout(() => this._el.input().focus(), 50);
        return new Promise(res => { this._resolve = res; });
    },
    _close(confirmed) {
        const value = confirmed
            ? (this._el.inputWrap().classList.contains('hidden') ? true : this._el.input().value.trim())
            : null;
        this._el.overlay().classList.add('hidden');
        this._el.input().value = '';
        if (this._resolve) this._resolve(value);
        this._resolve = null;
    }
};

/* ==========================================================================
   4. VIEW MODULES
   ========================================================================== */
const Views = {
    home: {
        title: "Inicio",
        render: () => `
            <div class="composer">
                <div class="avatar avatar--md">T</div>
                <div class="composer-body">
                    <textarea id="note-input" placeholder="¿Qué estás aprendiendo?"></textarea>
                    <div class="composer-actions">
                        <div class="select-group">
                            <div class="pill-select-wrapper">
                                <i data-lucide="globe" class="select-icon"></i>
                                <select id="note-visibility" class="pill-select" style="padding-left: 28px;">
                                    <option value="PUBLIC">Público</option>
                                    <option value="NICHE">Nicho</option>
                                    <option value="PRIVATE">Privado</option>
                                </select>
                            </div>
                            <div class="pill-select-wrapper">
                                <i data-lucide="sparkles" class="select-icon"></i>
                                <select id="note-niche" class="pill-select" style="padding-left: 28px;">
                                    <option value="">IA Automático</option>
                                    ${Object.values(AppState.niches).map(n =>
                                        `<option value="${n.id}">${App.escapeHTML(n.name)}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        <button id="btn-publish" class="btn-primary">Postear</button>
                    </div>
                </div>
            </div>
            <div id="feed-container" class="feed-container"></div>
        `,
        onMount: () => {
            App.bindComposer();
            App.renderFeed();
        }
    },

    niches: {
        title: "Tus Nichos",
        render: () => `
            <div style="padding: 24px;">
                <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 24px;">Explorar Nichos</h2>
                <div class="niches-grid">
                    ${Object.values(AppState.niches).map(n => `
                        <div class="widget niche-card" data-niche-id="${n.id}" style="margin-bottom: 0;">
                            <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                                <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--accent-alpha); color: var(--accent-primary); display: flex; align-items: center; justify-content: center;">
                                    <i data-lucide="${n.icon}" style="width: 24px; height: 24px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 700;">${App.escapeHTML(n.name)}</div>
                                    <div style="font-size: 13px; color: var(--text-secondary);">${n.followersCount.toLocaleString()} notas</div>
                                </div>
                            </div>
                            <button class="btn-follow ${AppState.currentUser.followedNiches.has(n.id) ? 'following' : ''}" data-type="niche" data-id="${n.id}">
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
            <div style="padding: 24px 24px 8px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <i data-lucide="brain" style="width: 28px; height: 28px; color: var(--accent-primary);"></i>
                    <h2 style="font-size: 24px; font-weight: 800;">Tu Segundo Cerebro</h2>
                </div>
                <p style="color: var(--text-secondary); font-size: 15px; margin-bottom: 16px;">Tus notas privadas y todo lo que has guardado como conocimiento.</p>
            </div>
            <div id="feed-container" class="feed-container"></div>
        `,
        onMount: () => App.renderFeed()
    },

    profile: {
        title: "Perfil",
        render: () => {
            const u = AppState.currentUser;
            return `
                <div style="padding: 32px 24px;">
                    <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 32px;">
                        <div class="avatar avatar--lg" style="margin-bottom: 16px;">${App.escapeHTML(u.avatar)}</div>
                        <h2 style="font-size: 24px; font-weight: 800;">${App.escapeHTML(u.name)}</h2>
                        <p style="color: var(--text-secondary);">@${App.escapeHTML(u.handle)}</p>
                        <p style="margin-top: 16px; font-size: 15px; max-width: 320px;">${App.escapeHTML(u.bio)}</p>
                        <div style="display: flex; gap: 40px; margin-top: 24px; background: var(--bg-surface-hover); padding: 16px 32px; border-radius: var(--radius-lg);">
                            <div style="text-align: center;">
                                <div style="font-weight: 800; font-size: 20px;">${u.followingCount}</div>
                                <div style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">Siguiendo</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-weight: 800; font-size: 20px;">${u.followersCount}</div>
                                <div style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">Seguidores</div>
                            </div>
                        </div>
                    </div>
                    <h3 style="font-weight: 800; font-size: 18px; margin-bottom: 16px; padding: 0 16px;">Mis Notas</h3>
                    <div id="feed-container" class="feed-container"></div>
                </div>
            `;
        },
        onMount: () => App.renderFeed()
    }
};

/* ==========================================================================
   5. ROUTER
   ========================================================================== */
const Router = {
    navigate(viewName) {
        if (!Views[viewName]) return;
        AppState.currentView = viewName;

        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.view === viewName);
        });

        document.getElementById('view-title').textContent = Views[viewName].title;

        const container = document.getElementById('view-container');
        container.innerHTML = Views[viewName].render();

        if (Views[viewName].onMount) {
            Views[viewName].onMount();
        }

        App.renderSidebars();
        App.initIcons(); // Instanciar SVG de Lucide
    }
};

/* ==========================================================================
   6. APP CONTROLLER
   ========================================================================== */
const App = {
    init() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            const toggleBtn = document.getElementById('theme-toggle');
            if(savedTheme === 'dark' && toggleBtn) {
                // Se invierten manual por si no actua el CSS
                toggleBtn.querySelector('.theme-icon-dark').style.display = 'none';
                toggleBtn.querySelector('.theme-icon-light').style.display = 'block';
            }
        }

        MockEngine.generate();
        Modal.init();
        this.bindEvents();
        Router.navigate(AppState.currentView);
        this.initIcons();
    },

    get feedContainer() { return document.getElementById('feed-container'); },

    initIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    bindEvents() {
        document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevenir interferencia en el fab click
                if(!e.target.closest('.btn-compose-mobile')) {
                    e.preventDefault();
                    Router.navigate(btn.dataset.view);
                }
            });
        });

        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn, .opt-btn, .btn-follow, #btn-publish');
            if (!btn) return;

            const { action, id, type } = btn.dataset;
            if (action === 'like')   this.handleLike(id, btn);
            if (action === 'save')   this.handleSave(id, btn);
            if (action === 'delete') this.handleDelete(id);
            if (action === 'edit')   this.handleEdit(id);
            if (action === 'renote') this.handleRenote(id, btn);

            if (btn.classList.contains('btn-follow')) {
                if (type === 'user')  this.handleFollowUser(id, btn);
                if (type === 'niche') this.handleFollowNiche(id, btn);
            }

            if (btn.id === 'btn-publish') this.handlePublish();
        });
    },

    bindComposer() {
        const btn = document.getElementById('btn-publish');
        if (btn) btn.addEventListener('click', () => this.handlePublish());
    },

    focusComposer() {
        if (AppState.currentView !== 'home') Router.navigate('home');
        setTimeout(() => {
            const input = document.getElementById('note-input');
            if (input) {
                input.focus();
                // scroll to top en mobile
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 150);
    },

    renderFeed() {
        const container = this.feedContainer;
        if (!container) return;
        container.innerHTML = '';

        let notes = Object.values(AppState.notes).sort((a, b) => b.timestamp - a.timestamp);

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
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="layers" class="empty-icon text-secondary"></i>
                    <div class="empty-title">Nada por aquí</div>
                    <div class="empty-desc">Sigue a usuarios o explora nichos para construir tu feed personalizado.</div>
                </div>
            `;
            this.initIcons();
            return;
        }

        const frag = document.createDocumentFragment();
        notes.forEach(note => {
            const author = AppState.users[note.authorId] || AppState.currentUser;
            const niche  = note.nicheId ? AppState.niches[note.nicheId] : null;
            const isOwn  = note.authorId === AppState.currentUser.id;
            const isLiked   = AppState.currentUser.likedNotes.has(note.id);
            const isSaved   = AppState.currentUser.savedNotes.has(note.id);
            const isRenoted = AppState.currentUser.renotedNotes.has(note.id);

            const avatarContent = author.avatar && author.avatar.startsWith('http')
                ? `<img src="${author.avatar}" alt="${App.escapeHTML(author.name)}" loading="lazy">`
                : App.escapeHTML(author.avatar || '?');

            const div = document.createElement('div');
            div.className = 'note-card';
            div.innerHTML = `
                <div class="note-header">
                    <div class="note-author-wrap">
                        <div class="avatar avatar--md">${avatarContent}</div>
                        <div class="note-meta">
                            <span class="note-author">${App.escapeHTML(author.name)}
                                <span class="note-handle">@${App.escapeHTML(author.handle)}</span>
                            </span>
                            <span class="note-time">${this.timeAgo(note.timestamp)}</span>
                        </div>
                    </div>
                    ${isOwn ? `
                        <div class="note-options">
                            <button class="opt-btn edit" data-action="edit" data-id="${note.id}" title="Editar nota">
                               <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
                            </button>
                            <button class="opt-btn" data-action="delete" data-id="${note.id}" title="Eliminar nota">
                               <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="note-body">
                    <div class="note-content">${App.escapeHTML(note.content)}</div>
                    <div class="badges-container">
                        ${note.isAiClassified ? `<span class="badge badge-ai"><i data-lucide="sparkles"></i> AI Suggested</span>` : ''}
                        ${niche ? `<span class="badge badge-niche"><i data-lucide="${niche.icon}"></i> ${App.escapeHTML(niche.name)}</span>` : ''}
                        ${note.visibility === 'PRIVATE' ? `<span class="badge badge-private"><i data-lucide="lock"></i> Privado</span>` : ''}
                    </div>
                    <div class="note-actions">
                        <button class="action-btn ${isLiked ? 'liked' : ''}" data-action="like" data-id="${note.id}" aria-label="Me gusta">
                            <i data-lucide="heart" class="action-icon"></i>
                            <span class="count-like">${note.likesCount}</span>
                        </button>
                        <button class="action-btn ${isRenoted ? 'renoted' : ''}" data-action="renote" data-id="${note.id}" aria-label="Renotear">
                            <i data-lucide="repeat-2" class="action-icon"></i>
                            <span class="count-renote">${note.renotesCount}</span>
                        </button>
                        <button class="action-btn ${isSaved ? 'saved' : ''}" data-action="save" data-id="${note.id}" aria-label="Guardar">
                            <i data-lucide="bookmark" class="action-icon"></i>
                        </button>
                    </div>
                </div>
            `;
            frag.appendChild(div);
        });

        container.appendChild(frag);
        this.initIcons();
    },

    renderSidebars() {
        const nicheList = document.getElementById('trending-niches');
        if (nicheList) {
            nicheList.innerHTML = Object.values(AppState.niches).slice(0, 5).map(n => `
                <div class="trend-item">
                    <div class="trend-info">
                        <strong><i data-lucide="${n.icon}" style="width: 16px; height: 16px; color: var(--accent-primary);"></i> ${App.escapeHTML(n.name)}</strong>
                        <span>${n.followersCount.toLocaleString()} contribuciones</span>
                    </div>
                    <button class="btn-follow ${AppState.currentUser.followedNiches.has(n.id) ? 'following' : ''}" data-type="niche" data-id="${n.id}">
                        ${AppState.currentUser.followedNiches.has(n.id) ? 'Siguiendo' : 'Seguir'}
                    </button>
                </div>
            `).join('');
        }

        const userList = document.getElementById('suggested-users');
        if (userList) {
            userList.innerHTML = Object.values(AppState.users)
                .filter(u => u.id !== 'u_me' && !AppState.currentUser.followedUsers.has(u.id))
                .slice(0, 4)
                .map(u => {
                    const av = u.avatar && u.avatar.startsWith('http')
                        ? `<img src="${u.avatar}" alt="${App.escapeHTML(u.name)}" loading="lazy">`
                        : App.escapeHTML(u.avatar || '?');
                    return `
                        <div class="trend-item" style="border: none; padding: 10px 0;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="avatar avatar--sm">${av}</div>
                                <div>
                                    <div style="font-size: 14px; font-weight: 700; line-height: 1.2;">${App.escapeHTML(u.name)}</div>
                                    <div style="font-size: 13px; color: var(--text-secondary);">@${App.escapeHTML(u.handle)}</div>
                                </div>
                            </div>
                            <button class="btn-follow ${AppState.currentUser.followedUsers.has(u.id) ? 'following' : ''}" data-type="user" data-id="${u.id}">
                                ${AppState.currentUser.followedUsers.has(u.id) ? 'Siguiendo' : 'Seguir'}
                            </button>
                        </div>
                    `;
                }).join('');
        }
        this.initIcons();
    },

    // --- ACTIONS ---
    async handlePublish() {
        const input      = document.getElementById('note-input');
        const visibility = document.getElementById('note-visibility');
        const nicheEl    = document.getElementById('note-niche');

        if (!input) return;
        const content = input.value.trim();
        if (!content || AppState.isPublishing) return;

        const publishBtn = document.getElementById('btn-publish');
        AppState.isPublishing = true;
        if (publishBtn) publishBtn.disabled = true;
        this.showToast("<i data-lucide='loader'></i> Publicando...");

        try {
            let finalNiche = nicheEl ? nicheEl.value : '';
            let isAi = false;
            if (!finalNiche && visibility && visibility.value !== 'PRIVATE') {
                finalNiche = await ApiService.classify(content);
                isAi = true;
            }

            const note = await ApiService.publish(content, visibility ? visibility.value : 'PUBLIC', finalNiche || null);
            note.isAiClassified = isAi;
            this.showToast("<i data-lucide='check-circle'></i> Publicado con éxito");

            if (AppState.currentView === 'home') {
                this.renderFeed();
                if (input) input.value = '';
            }
        } catch (e) {
            this.showToast("<i data-lucide='alert-triangle'></i> Error al publicar");
        } finally {
            AppState.isPublishing = false;
            if (publishBtn) publishBtn.disabled = false;
        }
    },

    handleLike(id, btn) {
        const note = AppState.notes[id];
        if (!note) return;
        
        const isLiked = AppState.currentUser.likedNotes.has(id);
        if (isLiked) {
            AppState.currentUser.likedNotes.delete(id);
            note.likesCount = Math.max(0, note.likesCount - 1);
        } else {
            AppState.currentUser.likedNotes.add(id);
            note.likesCount++;
        }
        btn.classList.toggle('liked', !isLiked);
        // El icono de Lucide cambia de color usando CSS .liked .lucide { fill: var(--danger-color); stroke: ...}
        const count = btn.querySelector('.count-like');
        if (count) count.textContent = note.likesCount;
    },

    handleSave(id, btn) {
        const isSaved = AppState.currentUser.savedNotes.has(id);
        if (isSaved) AppState.currentUser.savedNotes.delete(id);
        else         AppState.currentUser.savedNotes.add(id);
        
        btn.classList.toggle('saved', !isSaved);
        this.showToast(
            !isSaved ? "<i data-lucide='bookmark-check'></i> Guardado en Segundo Cerebro" : "<i data-lucide='bookmark-minus'></i> Removido"
        );
    },

    handleRenote(id, btn) {
        const note = AppState.notes[id];
        if (!note) return;
        const isRenoted = AppState.currentUser.renotedNotes.has(id);
        if (isRenoted) {
            AppState.currentUser.renotedNotes.delete(id);
            note.renotesCount = Math.max(0, note.renotesCount - 1);
        } else {
            AppState.currentUser.renotedNotes.add(id);
            note.renotesCount++;
        }
        btn.classList.toggle('renoted', !isRenoted);
        const count = btn.querySelector('.count-renote');
        if (count) count.textContent = note.renotesCount;
        
        this.showToast(!isRenoted ? "<i data-lucide='repeat-2'></i> Nota compartida" : "<i data-lucide='undo-2'></i> Deshecho");
    },

    async handleDelete(id) {
        const confirmed = await Modal.confirm('<div style="display:flex; align-items:center; gap:8px;"><i data-lucide="alert-triangle" style="color:var(--danger-color)"></i> ¿Eliminar esta nota de manera permanente?</div>', true);
        if (!confirmed) return;
        delete AppState.notes[id];
        AppState.currentUser.ownNotes.delete(id);
        this.showToast("<i data-lucide='trash'></i> Nota eliminada");
        
        const card = document.querySelector(`[data-action="delete"][data-id="${id}"]`)?.closest('.note-card');
        if (card) {
            card.style.animation = 'fadeOutCard 0.25s ease forwards';
            setTimeout(() => card.remove(), 250);
        }
    },

    async handleEdit(id) {
        const note = AppState.notes[id];
        if (!note) return;
        const newText = await Modal.prompt('<div style="display:flex; align-items:center; gap:8px;"><i data-lucide="edit-3"></i> Editar nota atómica</div>', note.content);
        if (!newText || newText === note.content) return;
        
        note.content = newText;
        this.showToast("<i data-lucide='check'></i> Actualizada");
        
        const card = document.querySelector(`[data-action="edit"][data-id="${id}"]`)?.closest('.note-card');
        if (card) {
            const contentEl = card.querySelector('.note-content');
            if (contentEl) contentEl.textContent = note.content;
        }
    },

    handleFollowUser(userId, btn) {
        const isFollowing = AppState.currentUser.followedUsers.has(userId);
        if (isFollowing) {
            AppState.currentUser.followedUsers.delete(userId);
            AppState.currentUser.followingCount = Math.max(0, AppState.currentUser.followingCount - 1);
        } else {
            AppState.currentUser.followedUsers.add(userId);
            AppState.currentUser.followingCount++;
        }
        btn.textContent = isFollowing ? 'Seguir' : 'Siguiendo';
        btn.classList.toggle('following', !isFollowing);
        this.showToast(isFollowing ? '<i data-lucide="user-minus"></i> Dejaste de seguir al perfil' : '<i data-lucide="user-plus"></i> Siguiendo nuevo perfil');
        this.renderSidebars();
        if (AppState.currentView === 'home') this.renderFeed();
    },

    handleFollowNiche(nicheId, btn) {
        const isFollowing = AppState.currentUser.followedNiches.has(nicheId);
        if (isFollowing) AppState.currentUser.followedNiches.delete(nicheId);
        else             AppState.currentUser.followedNiches.add(nicheId);
        
        document.querySelectorAll(`.btn-follow[data-type="niche"][data-id="${nicheId}"]`).forEach(b => {
            b.textContent = isFollowing ? 'Seguir' : 'Siguiendo';
            b.classList.toggle('following', !isFollowing);
        });
        
        this.showToast(isFollowing ? '<i data-lucide="minus"></i> Dejaste el nicho' : '<i data-lucide="check"></i> Te uniste al nicho');
        
        this.renderSidebars();
        if (AppState.currentView === 'home') this.renderFeed();
    },

    toggleTheme() {
        const doc = document.documentElement;
        const current = doc.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        doc.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        
        const darkIcon = document.querySelector('.theme-icon-dark');
        const lightIcon = document.querySelector('.theme-icon-light');
        if(darkIcon && lightIcon) {
            darkIcon.style.display = next === 'light' ? 'block' : 'none';
            lightIcon.style.display = next === 'light' ? 'none' : 'block';
        }
    },

    showToast(htmlMsg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.innerHTML = htmlMsg;
        this.initIcons(); // por si se pasa un svg en el html
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
    },

    timeAgo(ts) {
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60)    return '1m';
        if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    },

    escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

/* ==========================================================================
   7. MOCK ENGINE 
   ========================================================================== */
const MockEngine = {
    generate() {
        const nicheData = [
            { id: 'tech',         name: 'Ingeniería',   icon: 'cpu' },
            { id: 'startups',     name: 'Startups',     icon: 'rocket' },
            { id: 'ai',           name: 'Agentes IA',   icon: 'bot' },
            { id: 'design',       name: 'UI/UX',        icon: 'palette' },
            { id: 'philosophy',   name: 'Mindset',      icon: 'book-open' },
            { id: 'fitness',      name: 'Rendimiento',  icon: 'activity' },
            { id: 'productivity', name: 'Sistemas',     icon: 'timer' },
            { id: 'crypto',       name: 'Web3',         icon: 'hexagon' }
        ];
        
        nicheData.forEach(n => {
            AppState.niches[n.id] = { ...n, followersCount: Math.floor(Math.random() * 8000) + 1200 };
        });

        const users = [
            { id: "u_1",  handle: "alex_chen_dev",   name: "Alex Chen",     avatar: "https://i.pravatar.cc/150?img=1",  bio: "Software Architect building scalable distributed systems.",    niches: ["tech", "productivity"],    followersCount: 842,  followingCount: 210 },
            { id: "u_2",  handle: "elena_design",    name: "Elena Smith",   avatar: "https://i.pravatar.cc/150?img=2",  bio: "Visual storyteller and UI enthusiast.",                        niches: ["design", "productivity"],  followersCount: 1205, followingCount: 430 },
            { id: "u_3",  handle: "stoic_marcus",    name: "Marcus Aurelius",avatar: "https://i.pravatar.cc/150?img=3", bio: "Applying ancient wisdom to modern chaos.",                     niches: ["philosophy","productivity"],followersCount: 560,  followingCount: 90  },
            { id: "u_4",  handle: "sam_river_ai",    name: "Sam River",     avatar: "https://i.pravatar.cc/150?img=4",  bio: "Exploring the frontiers of Large Language Models.",            niches: ["ai", "tech"],              followersCount: 3400, followingCount: 510 },
            { id: "u_5",  handle: "jordan_lift",     name: "Jordan Lift",   avatar: "https://i.pravatar.cc/150?img=5",  bio: "Daily gains and disciplined routines.",                        niches: ["fitness", "productivity"], followersCount: 2100, followingCount: 340 },
            { id: "u_6",  handle: "max_codes",       name: "Max Code",      avatar: "https://i.pravatar.cc/150?img=6",  bio: "JavaScript fanatic and indie hacker.",                         niches: ["tech", "startups"],        followersCount: 450,  followingCount: 120 },
            { id: "u_7",  handle: "startup_queen",   name: "Startup Queen", avatar: "https://i.pravatar.cc/150?img=7",  bio: "Serial entrepreneur building in public.",                      niches: ["startups", "design"],      followersCount: 890,  followingCount: 300 },
            { id: "u_8",  handle: "phil_mind",       name: "Phil Mind",     avatar: "https://i.pravatar.cc/150?img=8",  bio: "Seeking truth through logic and reason.",                      niches: ["philosophy", "tech"],      followersCount: 320,  followingCount: 150 },
            { id: "u_9",  handle: "fit_tech_guy",    name: "Fit Tech Guy",  avatar: "https://i.pravatar.cc/150?img=9",  bio: "Performance tracking and wearable tech enthusiast.",           niches: ["fitness", "tech"],         followersCount: 760,  followingCount: 280 },
            { id: "u_10", handle: "prod_hacker",     name: "Prod Hacker",   avatar: "https://i.pravatar.cc/150?img=10", bio: "Systems to maximize human output.",                            niches: ["productivity", "ai"],      followersCount: 1500, followingCount: 400 },
            { id: "u_11", handle: "design_lead_pro", name: "Design Lead",   avatar: "https://i.pravatar.cc/150?img=11", bio: "Creative direction for global brands.",                        niches: ["design", "startups"],      followersCount: 920,  followingCount: 210 },
            { id: "u_12", handle: "logic_coder",     name: "Logic Coder",   avatar: "https://i.pravatar.cc/150?img=12", bio: "Where technical implementation meets logic.",                   niches: ["tech", "philosophy"],      followersCount: 410,  followingCount: 180 },
            { id: "u_13", handle: "ai_creative",     name: "AI Creative",   avatar: "https://i.pravatar.cc/150?img=13", bio: "Generative art and AI-driven design.",                         niches: ["ai", "design"],            followersCount: 1100, followingCount: 350 },
            { id: "u_14", handle: "fit_founder",     name: "Fit Founder",   avatar: "https://i.pravatar.cc/150?img=14", bio: "Building empires and building muscle.",                        niches: ["startups", "fitness"],     followersCount: 650,  followingCount: 190 },
            { id: "u_15", handle: "zen_mode_on",     name: "Zen Mode",      avatar: "https://i.pravatar.cc/150?img=15", bio: "Minimalism and deep work.",                                    niches: ["productivity","philosophy"],followersCount: 280,  followingCount: 110 }
        ];
        users.forEach(u => { AppState.users[u.id] = u; });

        const texts = [
            "Clean code is a love letter to your future self.",
            "Build in public, learn in public. The rest follows.",
            "AI is a tool, not a replacement. Use it to amplify, not to abdicate.",
            "Design is thinking made visual. Ugly products are unfinished thoughts.",
            "Consistency beats intensity every single time.",
            "The best architecture is the one your team actually understands.",
            "Ship small, learn fast, iterate constantly. The waterfall is dead.",
            "A startup that doesn't talk to its users is guessing in the dark.",
            "Every great UI begins with empathy, not pixels.",
            "Technical debt is a loan with compound interest. Pay it early."
        ];

        for (let i = 1; i <= 60; i++) {
            const authorId = `u_${Math.floor(Math.random() * 15) + 1}`;
            const nIds = Object.keys(AppState.niches);
            const nId  = Math.random() > 0.3 ? nIds[Math.floor(Math.random() * nIds.length)] : null;
            const id   = `n_${i}`;
            AppState.notes[id] = {
                id, authorId,
                content: texts[Math.floor(Math.random() * texts.length)],
                visibility: Math.random() > 0.85 ? 'PRIVATE' : (Math.random() > 0.85 ? 'NICHE' : 'PUBLIC'),
                nicheId: nId,
                likesCount:   Math.floor(Math.random() * 80),
                renotesCount: Math.floor(Math.random() * 15),
                timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 5),
                isAiClassified: Math.random() > 0.6
            };
        }

        AppState.currentUser.followedNiches.add('tech');
        AppState.currentUser.followedNiches.add('ai');
        AppState.currentUser.followedNiches.add('startups');
        AppState.currentUser.followedUsers.add('u_1');
        AppState.currentUser.followedUsers.add('u_4');

        const welcomeId = 'n_welcome';
        AppState.notes[welcomeId] = {
            id: welcomeId, autorId: 'u_me',
            content: 'Notebing v2 is live! \nDesarrollo fluido y UI re-ingenierada con CSS Grid y Lucide Icons.',
            visibility: 'PUBLIC', nicheId: 'productivity', likesCount: 42, renotesCount: 8,
            timestamp: Date.now() - 60000, isAiClassified: false
        };
        AppState.currentUser.ownNotes.add(welcomeId);

        const style = document.createElement('style');
        style.textContent = `
            .niches-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .niche-card { display: flex; align-items: center; justify-content: space-between; transition: background-color 0.15s ease; border: 1px solid transparent;}
            .niche-card:hover { background-color: var(--bg-surface); border-color: var(--border-color); box-shadow: var(--shadow-sm); transform: translateY(-2px); transition: all var(--transition-fast); }
            @keyframes fadeOutCard { from { opacity: 1; transform: translateX(0); max-height: 200px; } to { opacity: 0; transform: translateX(20px); max-height: 0; padding: 0; margin: 0; border: none; } }
            @media (min-width: 600px) { .niches-grid { grid-template-columns: 1fr 1fr; } }
        `;
        document.head.appendChild(style);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
