/**
 * NOTEBING - CORE ENGINE vFinal
 * 
 * Architecture: Strict bounded contexts.
 * Features: SPA Router, Notification System, Notion-like Block Editor with HTML5 DnD.
 * Animations: Hardware-accelerated iOS 26.1 Spring View Transitions.
 */

/* ==========================================================================
   1. UTILS & SECURITY (Pure Functions)
   ========================================================================== */
const Utils = {
    escapeMap: { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#96;' },
    escapeRegex: /[&<>"'\/`]/g,
    escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(this.escapeRegex, ch => this.escapeMap[ch]);
    },
    timeAgo(ts) {
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60)    return '1m';
        if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    },
    generateId(prefix = 'id') {
        return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    }
};

/* ==========================================================================
   2. STATE MANAGEMENT (Single Source of Truth)
   ========================================================================== */
const AppState = {
    currentView: 'home',
    currentParam: null,
    currentFilter: 'for_you',
    isPublishing: false,
    currentUser: {
        id: 'u_me', handle: 'tu_usuario', name: 'Tú', avatar: 'T',
        bio: "Frontend Architect & Product Thinker 🚀",
        followersCount: 342, followingCount: 128,
        likedNotes: new Set(), savedNotes: new Set(), renotedNotes: new Set(),
        followedUsers: new Set(), followedNiches: new Set(),
        ownNotes: new Set(),
        
        folders: [
            { id: 'f_cerebro', name: 'Mi Cerebro (Privadas)', icon: 'brain', isPrivate: true },
            { id: 'f_public', name: 'Notas Públicas', icon: 'globe', isPrivate: false }
        ],
        followerAccess: {},
        profileBlocks: [
            { id: 'b_1', type: 'h1', content: '¡Hola! Soy Yo 👋' },
            { id: 'b_2', type: 'h3', content: 'Senior Developer' },
            { id: 'b_3', type: 'text', content: 'Este es mi perfil atómico. Explora mis carpetas.' },
            { id: 'b_4', type: 'folder', content: 'f_public' }
        ]
    },
    users: {},
    niches: {},
    notes: {},
    notifications: []
};

/* ==========================================================================
   3. DATA SERVICE (Mock API)
   ========================================================================== */
const DataService = {
    async publish(content, visibility, nicheId) {
        return new Promise(res => setTimeout(() => {
            const id = Utils.generateId('n');
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
    },

    addNotification(type, message, relatedId = null) {
        AppState.notifications.unshift({
            id: Utils.generateId('notif'),
            type, // 'like', 'follow', 'renote'
            message,
            relatedId,
            timestamp: Date.now(),
            read: false
        });
        UI.updateBadge();
    }
};

/* ==========================================================================
   4. UI COMPONENTS (Reusable Modals, Toasts)
   ========================================================================== */
const UI = {
    _modalResolve: null,
    els: {
        toast: () => document.getElementById('toast'),
        overlay: () => document.getElementById('modal-overlay'),
        message: () => document.getElementById('modal-message'),
        inputWrap: () => document.getElementById('modal-input-wrap'),
        input: () => document.getElementById('modal-input'),
        confirm: () => document.getElementById('modal-confirm'),
        cancel: () => document.getElementById('modal-cancel'),
        notifCount: () => document.getElementById('notif-count')
    },
    
    init() {
        this.els.confirm().addEventListener('click', () => this._closeModal(true));
        this.els.cancel().addEventListener('click', () => this._closeModal(false));
        this.els.overlay().addEventListener('click', (e) => {
            if (e.target === this.els.overlay()) this._closeModal(false);
        });
    },

    showToast(htmlMsg) {
        const t = this.els.toast();
        if (!t) return;
        t.innerHTML = htmlMsg;
        App.initIcons(); 
        t.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
    },

    updateBadge() {
        const unread = AppState.notifications.filter(n => !n.read).length;
        const badge = this.els.notifCount();
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
    },

    async confirm(msg, danger = true) {
        this.els.message().innerHTML = msg;
        this.els.inputWrap().classList.add('hidden');
        this.els.confirm().textContent = 'Eliminar';
        this.els.confirm().className = 'btn-primary' + (danger ? ' btn--danger' : '');
        this.els.overlay().classList.remove('hidden');
        App.initIcons();
        return new Promise(res => { this._modalResolve = res; });
    },

    async prompt(msg, currentVal = '') {
        this.els.message().innerHTML = msg;
        this.els.inputWrap().classList.remove('hidden');
        this.els.input().value = currentVal;
        this.els.confirm().textContent = 'Guardar';
        this.els.confirm().className = 'btn-primary';
        this.els.overlay().classList.remove('hidden');
        setTimeout(() => this.els.input().focus(), 50);
        App.initIcons();
        return new Promise(res => { this._modalResolve = res; });
    },

    async selectFolder(msg, folders) {
        const wrap = this.els.inputWrap();
        this.els.message().innerHTML = msg;
        wrap.classList.remove('hidden');

        wrap.innerHTML = `
            <div class="folder-select-list">
                ${folders.map((f, i) => `
                    <label class="folder-option" data-folder-id="${f.id}">
                        <input type="radio" name="folder-select" value="${f.id}" ${i === 0 ? 'checked' : ''}>
                        <div class="folder-option-inner">
                            <i data-lucide="${f.icon}" style="width:18px;height:18px;color:var(--accent-primary);"></i>
                            <span>${Utils.escapeHTML(f.name)}</span>
                        </div>
                    </label>
                `).join('')}
            </div>
        `;

        this.els.confirm().textContent = 'Confirmar';
        this.els.confirm().className = 'btn-primary';
        this.els.overlay().classList.remove('hidden');
        App.initIcons();

        return new Promise(res => {
            this._modalResolve = (confirmed) => {
                if (!confirmed) { res(null); return; }
                const checked = document.querySelector('input[name="folder-select"]:checked');
                res(checked ? checked.value : null);
            };
        });
    },

    async addBlockMenu() {
        const wrap = this.els.inputWrap();
        this.els.message().innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><i data-lucide="blocks"></i> Añadir Bloque</div>';
        wrap.classList.remove('hidden');
        
        wrap.innerHTML = `
            <div class="folder-select-list">
                <label class="folder-option"><input type="radio" name="block-type" value="text" checked><div class="folder-option-inner"><i data-lucide="type"></i> Texto</div></label>
                <label class="folder-option"><input type="radio" name="block-type" value="h1"><div class="folder-option-inner"><b>H1</b> Título Principal</div></label>
                <label class="folder-option"><input type="radio" name="block-type" value="h2"><div class="folder-option-inner"><b>H2</b> Subtítulo</div></label>
                <label class="folder-option"><input type="radio" name="block-type" value="h3"><div class="folder-option-inner"><b>H3</b> Sección</div></label>
                <label class="folder-option"><input type="radio" name="block-type" value="quote"><div class="folder-option-inner"><i data-lucide="quote"></i> Cita / Quote</div></label>
                <label class="folder-option"><input type="radio" name="block-type" value="divider"><div class="folder-option-inner"><i data-lucide="minus"></i> Divisor</div></label>
                <label class="folder-option"><input type="radio" name="block-type" value="folder"><div class="folder-option-inner"><i data-lucide="folder"></i> Acceso a Carpeta</div></label>
            </div>
        `;
        this.els.confirm().textContent = 'Añadir';
        this.els.confirm().className = 'btn-primary';
        this.els.overlay().classList.remove('hidden');
        App.initIcons();

        return new Promise(res => {
            this._modalResolve = (confirmed) => {
                if (!confirmed) { res(null); return; }
                const checked = document.querySelector('input[name="block-type"]:checked');
                res(checked ? checked.value : null);
            };
        });
    },

    _closeModal(confirmed) {
        if (typeof this._modalResolve === 'function') {
            this._modalResolve(confirmed);
        } else if (this._modalResolve) {
            const val = confirmed
                ? (this.els.inputWrap().classList.contains('hidden') ? true : this.els.input().value.trim())
                : null;
            this._modalResolve(val);
        }

        this.els.overlay().classList.add('hidden');
        
        // Restore standard textarea
        const wrap = this.els.inputWrap();
        if (!wrap.querySelector('#modal-input')) {
            wrap.innerHTML = '<textarea id="modal-input" class="modal-textarea" rows="4"></textarea>';
        }
        const input = this.els.input();
        if (input) input.value = '';

        this._modalResolve = null;
    }
};

/* ==========================================================================
   5. NOTION BLOCK EDITOR ENGINE
   ========================================================================== */
const BlockEditor = {
    isEditMode: false,
    draggedBlockIndex: null,

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        Views.userProfile.renderProfileContent(); // Re-render local content
    },

    renderBlock(block, index, allowEdit) {
        let contentHtml = '';
        
        if (block.type === 'divider') {
            contentHtml = '<hr class="block-content block-divider" data-type="divider">';
        } else if (block.type === 'folder') {
            const f = AppState.currentUser.folders.find(fol => fol.id === block.content);
            if (f) {
                contentHtml = `<div class="block-content block-folder" data-type="folder"><i data-lucide="${f.icon}"></i> ${Utils.escapeHTML(f.name)}</div>`;
            } else {
                contentHtml = `<div class="block-content block-folder" data-type="folder" style="opacity:0.5"><i data-lucide="folder-x"></i> Carpeta No Encontrada</div>`;
            }
        } else {
            // Text based blocks (h1, h2, h3, text, quote)
            const tag = ['h1','h2','h3'].includes(block.type) ? block.type : (block.type === 'quote' ? 'blockquote' : 'p');
            contentHtml = `<${tag} class="block-content" data-type="${block.type}">${Utils.escapeHTML(block.content)}</${tag}>`;
        }

        const editUIMarkup = allowEdit ? `
            <div class="block-handle" draggable="true" data-index="${index}">
                <i data-lucide="grip-vertical"></i>
                <div class="block-handle-arrows">
                   <i data-lucide="chevron-up" class="arrow-up" data-index="${index}"></i>
                   <i data-lucide="chevron-down" class="arrow-down" data-index="${index}"></i>
                </div>
            </div>
            <div class="block-actions">
                ${block.type !== 'divider' && block.type !== 'folder' ? `<button class="opt-btn" data-editor-action="edit" data-index="${index}" title="Editar Mapeo"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>` : ''}
                <button class="opt-btn" data-editor-action="delete" data-index="${index}" title="Eliminar"><i data-lucide="trash-2" style="width:14px;height:14px;color:var(--danger-color)"></i></button>
            </div>
        ` : '';

        return `
            <div class="block-wrapper ${allowEdit ? 'is-edit-mode' : ''}" data-index="${index}">
                ${editUIMarkup}
                ${contentHtml}
            </div>
        `;
    },

    bindEvents(container) {
        if (!this.isEditMode) return;

        // Drag and Drop implementation
        const handles = container.querySelectorAll('.block-handle');
        handles.forEach(handle => {
            handle.addEventListener('dragstart', (e) => {
                this.draggedBlockIndex = parseInt(e.target.closest('.block-handle').dataset.index);
                e.target.closest('.block-wrapper').style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
            });
            handle.addEventListener('dragend', (e) => {
                e.target.closest('.block-wrapper').style.opacity = '1';
                this.draggedBlockIndex = null;
            });
        });

        const wrappers = container.querySelectorAll('.block-wrapper');
        wrappers.forEach(wrapper => {
            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                e.dataTransfer.dropEffect = 'move';
            });
            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.draggedBlockIndex === null) return;
                const dropIndex = parseInt(wrapper.dataset.index);
                if (dropIndex === this.draggedBlockIndex) return;

                const blocks = AppState.currentUser.profileBlocks;
                const moved = blocks.splice(this.draggedBlockIndex, 1)[0];
                blocks.splice(dropIndex, 0, moved);
                
                Views.userProfile.renderProfileContent();
            });
        });

        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-editor-action]');
            if (btn) {
                const action = btn.dataset.editorAction;
                if (action === 'add') await this.addBlock();
                if (action === 'edit') await this.editBlock(parseInt(btn.dataset.index));
                if (action === 'delete') this.deleteBlock(parseInt(btn.dataset.index));
            }
            
            // Fallback arrows support
            const arrowUp = e.target.closest('.arrow-up');
            if (arrowUp) this.moveBlock(parseInt(arrowUp.dataset.index), -1);
            
            const arrowDown = e.target.closest('.arrow-down');
            if (arrowDown) this.moveBlock(parseInt(arrowDown.dataset.index), 1);
        });
    },

    moveBlock(index, dir) {
        const blocks = AppState.currentUser.profileBlocks;
        const target = index + dir;
        if (target < 0 || target >= blocks.length) return;
        const temp = blocks[index];
        blocks[index] = blocks[target];
        blocks[target] = temp;
        Views.userProfile.renderProfileContent();
    },

    async addBlock() {
        const type = await UI.addBlockMenu();
        if (!type) return;

        let content = '';
        if (type !== 'divider') {
            if (type === 'folder') {
                const fid = await UI.selectFolder('<i data-lucide="folder"></i> Mapear Carpeta', AppState.currentUser.folders);
                if (!fid) return;
                content = fid;
            } else {
                content = await UI.prompt('<i data-lucide="type"></i> Escribe el contenido del bloque:');
                if (!content) return;
            }
        }
        
        AppState.currentUser.profileBlocks.push({ id: Utils.generateId('b'), type, content });
        Views.userProfile.renderProfileContent();
        UI.showToast('<i data-lucide="check"></i> Bloque añadido');
    },

    async editBlock(index) {
        const block = AppState.currentUser.profileBlocks[index];
        const newText = await UI.prompt('<i data-lucide="edit-3"></i> Editar contenido:', block.content);
        if (newText !== null && newText !== '') {
            block.content = newText;
            Views.userProfile.renderProfileContent();
        }
    },

    async deleteBlock(index) {
        const block = AppState.currentUser.profileBlocks[index];
        if (block.type === 'folder') {
            const conf = await UI.confirm('<div style="display:flex;align-items:center;gap:8px;"><i data-lucide="alert-triangle"></i> ¿Borrar acceso a carpeta? Las notas no se perderán.</div>');
            if (!conf) return;
        }
        AppState.currentUser.profileBlocks.splice(index, 1);
        Views.userProfile.renderProfileContent();
    }
};

/* ==========================================================================
   6. VIEWS
   ========================================================================== */
const Views = {
    home: {
        title: "Inicio",
        render: () => `
            <div class="composer">
                <div class="avatar avatar--md">T</div>
                <div class="composer-body">
                    <textarea id="note-input" placeholder="¿Qué estás descubriendo hoy?"></textarea>
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
                                    ${Object.values(AppState.niches).map(n => `<option value="${n.id}">${Utils.escapeHTML(n.name)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <button id="btn-publish" class="btn-primary">Postear</button>
                    </div>
                </div>
            </div>
            <div class="feed-filters-wrapper">
               <div class="feed-filters" id="home-filters"></div>
            </div>
            <div id="feed-container" class="feed-container"></div>
        `,
        onMount: () => {
             const btn = document.getElementById('btn-publish');
             if (btn) btn.addEventListener('click', () => App.handlePublish());
             
             const filterContainer = document.getElementById('home-filters');
             if (filterContainer) {
                 let pillsHTML = `
                    <button class="filter-pill ${AppState.currentFilter === 'for_you' ? 'active' : ''}" data-filter="for_you">Para ti</button>
                    <button class="filter-pill ${AppState.currentFilter === 'following' ? 'active' : ''}" data-filter="following">Siguiendo</button>
                 `;
                 Object.values(AppState.niches).forEach(n => {
                    pillsHTML += `<button class="filter-pill ${AppState.currentFilter === n.id ? 'active' : ''}" data-filter="${n.id}">${Utils.escapeHTML(n.name)}</button>`;
                 });
                 filterContainer.innerHTML = pillsHTML;
 
                 filterContainer.addEventListener('click', e => {
                    const pill = e.target.closest('.filter-pill');
                    if(!pill) return;
                    AppState.currentFilter = pill.dataset.filter;
                    filterContainer.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
                    pill.classList.add('active');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    App.renderFeed();
                 });
             }
             App.renderFeed();
        }
    },

    notifications: {
        title: "Notificaciones",
        render: () => `
            <div style="padding: 24px;">
                <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 24px;">Tus Alertas</h2>
                <div id="notif-container" style="display:flex; flex-direction:column; background:var(--bg-glass-strong); border-radius:var(--radius-lg); overflow:hidden; border:1px solid var(--border-color);"></div>
            </div>
        `,
        onMount: () => {
            const container = document.getElementById('notif-container');
            if (AppState.notifications.length === 0) {
                container.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center; color:var(--text-secondary);"><i data-lucide="bell" style="width:40px; height:40px; opacity:0.5; margin-bottom:16px;"></i><div>Sin actividad reciente.</div></div>`;
            } else {
                container.innerHTML = AppState.notifications.map(n => `
                    <div class="notif-item ${!n.read ? 'unread' : ''}">
                        <div class="notif-icon-wrap ${n.type}">
                            <i data-lucide="${n.type === 'like' ? 'heart' : (n.type === 'renote' ? 'repeat-2' : 'user-plus')}"></i>
                        </div>
                        <div>
                            <div style="font-size:15px; color:var(--text-primary); line-height:1.4;">${n.message}</div>
                            <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${Utils.timeAgo(n.timestamp)}</div>
                        </div>
                    </div>
                `).join('');
                
                // Mark all as read
                AppState.notifications.forEach(n => n.read = true);
                UI.updateBadge();
            }
            App.initIcons();
        }
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

    niches: {
        title: "Explorar Nichos",
        render: () => `
            <div style="padding: 24px;">
                <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 24px;">Descubrir</h2>
                <div class="niches-grid" style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                    ${Object.values(AppState.niches).map(n => `
                        <div class="widget niche-card niche-link" data-niche-id="${n.id}" style="margin-bottom: 0; cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                                <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--accent-alpha); color: var(--accent-primary); display: flex; align-items: center; justify-content: center;">
                                    <i data-lucide="${n.icon}" style="width: 24px; height: 24px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 700;">${Utils.escapeHTML(n.name)}</div>
                                    <div style="font-size: 13px; color: var(--text-secondary);">${n.followersCount.toLocaleString()} notas</div>
                                </div>
                            </div>
                            <button class="btn-follow ${AppState.currentUser.followedNiches.has(n.id) ? 'following' : ''} z-button" data-type="niche" data-id="${n.id}">
                                ${AppState.currentUser.followedNiches.has(n.id) ? 'Siguiendo' : 'Seguir'}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `,
        onMount: () => {
            const style = document.createElement('style');
            style.textContent = `@media (min-width: 600px) { .niches-grid { grid-template-columns: 1fr 1fr !important; } } .niche-card { display: flex; align-items: center; justify-content: space-between; transition: all var(--transition-fast); } .niche-card:hover { box-shadow: var(--shadow-card-hover); transform: translateY(-2px); }`;
            document.head.appendChild(style);
        }
    },
    
    nicheDetail: {
        title: (id) => AppState.niches[id] ? AppState.niches[id].name : "Nicho",
        render: (id) => {
            const n = AppState.niches[id];
            if (!n) return `<div class="empty-state">Nicho no encontrado</div>`;
            return `
                <div style="padding: 32px 24px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--accent-alpha); color: var(--accent-primary); display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="${n.icon}" style="width: 32px; height: 32px;"></i>
                        </div>
                        <div>
                            <h2 style="font-size: 24px; font-weight: 800;">${Utils.escapeHTML(n.name)}</h2>
                            <div style="font-size: 15px; color: var(--text-secondary);">${n.followersCount.toLocaleString()} contribuciones</div>
                        </div>
                    </div>
                    <button class="btn-follow ${AppState.currentUser.followedNiches.has(n.id) ? 'following' : ''}" data-type="niche" data-id="${n.id}">
                        ${AppState.currentUser.followedNiches.has(n.id) ? 'Siguiendo' : 'Seguir'}
                    </button>
                </div>
                <div id="feed-container" class="feed-container"></div>
            `;
        },
        onMount: () => App.renderFeed()
    },

    profile: {
        title: "Tu Perfil",
        render: () => Views.userProfile.render('u_me'),
        onMount: () => Views.userProfile.onMount('u_me')
    },

    userProfile: {
        title: (id) => id === 'u_me' ? 'Tu Perfil' : (AppState.users[id]?.name || "Perfil"),
        render: (id) => {
            const isMe = id === 'u_me';
            const u = isMe ? AppState.currentUser : AppState.users[id];
            if (!u) return `<div class="empty-state">Usuario no encontrado</div>`;
            
            return `
                <div style="padding: 32px 24px 0 24px;">
                    <div style="position: relative; margin-bottom: 24px;">
                        ${isMe ? `
                            <div style="position: absolute; right: 0; top: 0; z-index: 10;">
                                <button class="icon-btn btn-secondary" id="btn-edit-profile" title="Modo Builder">
                                    <i data-lucide="edit-3"></i>
                                </button>
                            </div>
                        ` : ''}
                        <div class="avatar avatar--lg" style="margin-bottom: 24px;">${u.avatar.startsWith('http') ? `<img src="${u.avatar}">` : Utils.escapeHTML(u.avatar)}</div>
                        <h2 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">${Utils.escapeHTML(u.name)}</h2>
                        <p style="color: var(--text-secondary); font-size:15px;">@${Utils.escapeHTML(u.handle)}</p>
                        
                        <div style="display: flex; gap: 32px; margin-top: 16px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span style="font-weight: 800; color:var(--text-primary);">${u.followingCount}</span>
                                <span style="font-size: 14px; color: var(--text-secondary);">Siguiendo</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span style="font-weight: 800; color:var(--text-primary);">${u.followersCount}</span>
                                <span style="font-size: 14px; color: var(--text-secondary);">Seguidores</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="profile-dynamic-content" style="padding: 0 24px var(--space-xl) 24px;">
                    <!-- Render Block Engine -->
                </div>
                
                <div style="border-top: 1px solid var(--border-color); margin-top:16px;">
                    <h3 style="font-weight: 800; font-size: 18px; margin-bottom: 16px; padding: 24px 24px 0;">Últimas Notas</h3>
                    <div id="feed-container" class="feed-container"></div>
                </div>
            `;
        },
        onMount: (id) => {
            BlockEditor.isEditMode = false;
            if (id === 'u_me') {
                const btnEdit = document.getElementById('btn-edit-profile');
                if (btnEdit) btnEdit.addEventListener('click', () => {
                    BlockEditor.toggleEditMode();
                    btnEdit.innerHTML = BlockEditor.isEditMode ? '<i data-lucide="check" style="color:var(--success-color)"></i>' : '<i data-lucide="edit-3"></i>';
                    App.initIcons();
                });
            }
            Views.userProfile.renderProfileContent(id);
            App.renderFeed();
        },
        renderProfileContent: (idParam) => {
            const id = AppState.currentView === 'profile' ? 'u_me' : (idParam || AppState.currentParam);
            const container = document.getElementById('profile-dynamic-content');
            if(!container) return;
            
            const isMe = id === 'u_me';
            
            // Logic for Lock / Render blocks
            if (!isMe) {
                // Mock user profile block injection for others
                container.innerHTML = `<div class="block-content block-text" data-type="text">${Utils.escapeHTML(AppState.users[id].bio)}</div>
                <div style="margin-top:24px;">
                    <button class="btn-primary btn-follow ${AppState.currentUser.followedUsers.has(id)?'following':''}" data-type="user" data-id="${id}" style="width:100%;">
                        ${AppState.currentUser.followedUsers.has(id)?'Siguiendo':'Seguir Perfil'}
                    </button>
                </div>`;
                App.initIcons();
                return;
            }

            // IS ME (My Profile Block Engine)
            const publicFolders = AppState.currentUser.folders.filter(f => !f.isPrivate);
            const hasPublicFolders = publicFolders.length > 0;

            let html = `<div class="block-list">`;
            AppState.currentUser.profileBlocks.forEach((b, i) => {
                html += BlockEditor.renderBlock(b, i, BlockEditor.isEditMode);
            });
            html += `</div>`;

            if (BlockEditor.isEditMode) {
                html += `<button class="add-block-btn" data-editor-action="add"><i data-lucide="plus"></i> Añadir Bloque Notion</button>`;
            }

            if (!hasPublicFolders) {
                html += `
                    <div class="profile-locked">
                        <i data-lucide="lock"></i>
                        <h4 style="font-size:18px; font-weight:700; color:var(--text-primary);">Perfil Cerrado</h4>
                        <p style="color:var(--text-secondary); font-size:14px; margin-top:8px;">No tienes carpetas públicas. Nadie podrá seguirte ni ver tu perfil.</p>
                    </div>
                `;
            }

            container.innerHTML = html;
            BlockEditor.bindEvents(container);
            App.initIcons();
        }
    }
};

/* ==========================================================================
   7. ROUTER
   ========================================================================== */
const Router = {
    navigate(viewName, param = null) {
        if (!Views[viewName]) return;
        AppState.currentView = viewName;
        AppState.currentParam = param;
        if (viewName !== 'home') AppState.currentFilter = 'for_you';

        // Update nav active states
        document.querySelectorAll('.nav-item').forEach(el => {
            if(el.dataset.view) {
                el.classList.toggle('active', el.dataset.view === viewName || (viewName === 'userProfile' && el.dataset.view === 'profile' && param === 'u_me'));
            }
        });

        // Set Title
        const vTitle = typeof Views[viewName].title === 'function' ? Views[viewName].title(param) : Views[viewName].title;
        const titleEl = document.getElementById('view-title');
        if (titleEl) titleEl.textContent = vTitle;

        // Render with iOS Spring Transition
        const container = document.getElementById('view-container');
        window.scrollTo(0, 0);
        
        // Remove animation class to reset, then flush layout
        container.classList.remove('view-enter');
        void container.offsetWidth; 
        
        container.innerHTML = Views[viewName].render(param);
        container.classList.add('view-enter');

        if (Views[viewName].onMount) Views[viewName].onMount(param);

        App.renderSidebars();
        App.initIcons();
        UI.updateBadge(); // ensure badge is updated on view switch
    }
};

/* ==========================================================================
   8. APP CONTROLLER
   ========================================================================== */
const App = {
    init() {
        MockEngine.generate();
        UI.init();
        this.bindEvents();
        Router.navigate(AppState.currentView);
        
        // Simulate a welcome notification
        setTimeout(() => {
            DataService.addNotification('user-plus', '<b>Notebing Team</b> ha empezado a seguirte.');
        }, 3000);
    },

    initIcons() {
        if (window.lucide) window.lucide.createIcons();
    },

    bindEvents() {
        document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-compose-mobile')) {
                    e.preventDefault();
                    Router.navigate(btn.dataset.view);
                }
            });
        });

        const toggleBtn = document.getElementById('theme-toggle');
        if(toggleBtn) toggleBtn.addEventListener('click', () => this.toggleTheme());

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn, .opt-btn, .btn-follow');
            if (btn && !btn.hasAttribute('data-editor-action')) {
                const { action, id, type } = btn.dataset;
                if(!btn.classList.contains('z-button')) {
                    if (action === 'like')   this.handleLike(id, btn);
                    if (action === 'save')   this.handleSave(id, btn);
                    if (action === 'delete') this.handleDelete(id);
                    if (action === 'renote') this.handleRenote(id, btn);
                }
                if (btn.classList.contains('btn-follow')) {
                    e.stopPropagation();
                    if (type === 'user')  this.handleFollowUser(id, btn);
                    if (type === 'niche') this.handleFollowNiche(id, btn);
                }
                return;
            }

            const userLink = e.target.closest('.user-link');
            if (userLink && userLink.dataset.userId) {
                e.stopPropagation();
                Router.navigate('userProfile', userLink.dataset.userId);
                return;
            }

            const nicheLink = e.target.closest('.niche-link');
            if (nicheLink && nicheLink.dataset.nicheId) {
                e.stopPropagation();
                Router.navigate('nicheDetail', nicheLink.dataset.nicheId);
            }
        });
    },

    focusComposer() {
        if (AppState.currentView !== 'home') Router.navigate('home');
        setTimeout(() => {
            const input = document.getElementById('note-input');
            if (input) {
                input.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 150);
    },

    async handlePublish() {
        const input = document.getElementById('note-input');
        const rVis = document.getElementById('note-visibility');
        const rNiche = document.getElementById('note-niche');

        if (!input) return;
        const content = input.value.trim();
        if (!content || AppState.isPublishing) return;

        AppState.isPublishing = true;
        const publishBtn = document.getElementById('btn-publish');
        if (publishBtn) publishBtn.disabled = true;
        UI.showToast("<i data-lucide='loader'></i> Procesando...");

        try {
            let finalNiche = rNiche ? rNiche.value : '';
            let isAi = false;
            const vis = rVis ? rVis.value : 'PUBLIC';
            
            if (!finalNiche && vis !== 'PRIVATE') {
                finalNiche = await DataService.classify(content);
                isAi = true;
            }

            const note = await DataService.publish(content, vis, finalNiche || null);
            note.isAiClassified = isAi;
            UI.showToast("<i data-lucide='check-circle'></i> Nota publicada");

            if (AppState.currentView === 'home') {
                const container = document.getElementById('feed-container');
                if (container) {
                    const emptyState = container.querySelector('.empty-state');
                    if (emptyState) emptyState.remove();
                    container.prepend(this._buildNoteCard(note));
                    this.initIcons();
                }
                input.value = '';
            }
        } catch (e) {
            UI.showToast("<i data-lucide='alert-triangle'></i> Error");
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
        const count = btn.querySelector('.count-like');
        if (count) count.textContent = note.likesCount;
    },

    handleSave(id, btn) {
        const isSaved = AppState.currentUser.savedNotes.has(id);
        if (isSaved) AppState.currentUser.savedNotes.delete(id);
        else         AppState.currentUser.savedNotes.add(id);
        
        btn.classList.toggle('saved', !isSaved);
        UI.showToast(!isSaved ? "<i data-lucide='bookmark-check'></i> Guardado" : "<i data-lucide='bookmark-minus'></i> Removido");
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
        UI.showToast(!isRenoted ? "<i data-lucide='repeat-2'></i> Nota compartida" : "<i data-lucide='undo-2'></i> Deshecho");
    },

    async handleDelete(id) {
        const confirmed = await UI.confirm('<div style="display:flex; align-items:center; gap:8px;"><i data-lucide="alert-triangle" style="color:var(--danger-color)"></i> ¿Eliminar permanentemente?</div>', true);
        if (!confirmed) return;
        delete AppState.notes[id];
        AppState.currentUser.ownNotes.delete(id);
        UI.showToast("<i data-lucide='trash'></i> Eliminada");
        
        const card = document.querySelector(`.note-card[data-note-id="${id}"]`);
        if (card) {
            card.style.animation = 'fadeOutCard 0.25s ease forwards';
            setTimeout(() => card.remove(), 250);
        }
    },

    async handleFollowUser(userId, btn) {
        const isFollowing = AppState.currentUser.followedUsers.has(userId);
        const targetUser = AppState.users[userId];

        if (isFollowing) {
            AppState.currentUser.followedUsers.delete(userId);
            AppState.currentUser.followingCount = Math.max(0, AppState.currentUser.followingCount - 1);
            delete AppState.currentUser.followerAccess[userId];
            btn.textContent = 'Seguir';
            btn.classList.remove('following');
            UI.showToast('<i data-lucide="user-minus"></i> Dejaste de seguir');
        } else {
            const sharableFolders = AppState.currentUser.folders.filter(f => !f.isPrivate);
            if (sharableFolders.length === 0) {
                UI.showToast('<i data-lucide="lock"></i> Perfil bloqueado. No tienes accesos.');
                return;
            }

            const selectedFolderId = await UI.selectFolder(
                `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <i data-lucide="shield" style="color:var(--accent-primary);width:24px;height:24px;"></i>
                    <div>
                        <div style="font-weight:800;font-size:16px;">Restricción de Acceso</div>
                        <div style="font-size:14px;color:var(--text-secondary);margin-top:4px;">Siguiendo a ${targetUser ? Utils.escapeHTML(targetUser.name) : 'usuario'}. ¿Qué carpeta de lectura abres?</div>
                    </div>
                </div>`,
                sharableFolders
            );

            if (!selectedFolderId) {
                UI.showToast('<i data-lucide="x"></i> Cancelado');
                return;
            }

            AppState.currentUser.followedUsers.add(userId);
            AppState.currentUser.followingCount++;
            AppState.currentUser.followerAccess[userId] = selectedFolderId;
            btn.textContent = 'Siguiendo';
            btn.classList.add('following');
            UI.showToast(`<i data-lucide="folder-check"></i> Acceso Granted`);
        }

        this.renderSidebars();
    },

    handleFollowNiche(nicheId, btn) {
        const isFollowing = AppState.currentUser.followedNiches.has(nicheId);
        if (isFollowing) AppState.currentUser.followedNiches.delete(nicheId);
        else AppState.currentUser.followedNiches.add(nicheId);
        
        document.querySelectorAll(`.btn-follow[data-type="niche"][data-id="${nicheId}"]`).forEach(b => {
            b.textContent = isFollowing ? 'Seguir' : 'Siguiendo';
            b.classList.toggle('following', !isFollowing);
        });
        
        UI.showToast(isFollowing ? '<i data-lucide="minus"></i> Dejaste el nicho' : '<i data-lucide="check"></i> Te uniste');
        this.renderSidebars();
        if (AppState.currentView === 'home' || (AppState.currentView === 'nicheDetail' && AppState.currentParam === nicheId)) {
             this.renderFeed();
        }
    },

    toggleTheme() {
        const doc = document.documentElement;
        const next = doc.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        doc.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    },

    renderFeed() {
        const container = document.getElementById('feed-container');
        if (!container) return;
        container.innerHTML = '';

        let notes = Object.values(AppState.notes).sort((a, b) => b.timestamp - a.timestamp);

        if (AppState.currentView === 'brain') {
            notes = notes.filter(n => n.visibility === 'PRIVATE' || AppState.currentUser.savedNotes.has(n.id));
        } else if (AppState.currentView === 'profile' || (AppState.currentView === 'userProfile' && AppState.currentParam === 'u_me')) {
            notes = notes.filter(n => n.authorId === AppState.currentUser.id);
        } else if (AppState.currentView === 'userProfile') {
            notes = notes.filter(n => n.authorId === AppState.currentParam && n.visibility !== 'PRIVATE');
        } else if (AppState.currentView === 'nicheDetail') {
            notes = notes.filter(n => n.nicheId === AppState.currentParam && n.visibility !== 'PRIVATE');
        } else if (AppState.currentView === 'home') {
            const f = AppState.currentFilter;
            if (f === 'for_you') {
                notes = notes.filter(n => n.visibility === 'PUBLIC');
            } else if (f === 'following') {
                notes = notes.filter(n => 
                    n.visibility !== 'PRIVATE' &&
                    (AppState.currentUser.followedUsers.has(n.authorId) ||
                     AppState.currentUser.followedNiches.has(n.nicheId) ||
                     n.authorId === AppState.currentUser.id)
                );
            } else {
                notes = notes.filter(n => n.visibility !== 'PRIVATE' && n.nicheId === f);
            }
        }

        if (notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 64px 24px; color: var(--text-secondary);">
                    <i data-lucide="layers" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <div style="font-weight: 700; font-size: 18px; color: var(--text-primary); margin-bottom: 8px;">Nada por aquí</div>
                    <div style="font-size: 15px;">Aún no hay notas en esta sección.</div>
                </div>
            `;
            this.initIcons();
            return;
        }

        const frag = document.createDocumentFragment();
        notes.forEach(note => frag.appendChild(this._buildNoteCard(note)));
        container.appendChild(frag);
        this.initIcons();
    },

    _buildNoteCard(note) {
        const author = AppState.users[note.authorId] || AppState.currentUser;
        const niche  = note.nicheId ? AppState.niches[note.nicheId] : null;
        const isOwn  = note.authorId === AppState.currentUser.id;
        const isLiked   = AppState.currentUser.likedNotes.has(note.id);
        const isSaved   = AppState.currentUser.savedNotes.has(note.id);
        const isRenoted = AppState.currentUser.renotedNotes.has(note.id);

        const avatar = author.avatar && author.avatar.startsWith('http')
            ? `<img src="${author.avatar}" loading="lazy">` : Utils.escapeHTML(author.avatar || '?');

        const div = document.createElement('div');
        div.className = 'note-card';
        div.dataset.noteId = note.id;
        div.innerHTML = `
            <div class="note-header">
                <div class="note-author-wrap user-link" data-user-id="${author.id}">
                    <div class="avatar avatar--md">${avatar}</div>
                    <div class="note-meta">
                        <span class="note-author">${Utils.escapeHTML(author.name)}
                            <span class="note-handle">@${Utils.escapeHTML(author.handle)}</span>
                        </span>
                        <span class="note-time">${Utils.timeAgo(note.timestamp)}</span>
                    </div>
                </div>
                ${isOwn ? `<div class="note-options"><button class="opt-btn" data-action="delete" data-id="${note.id}" title="Eliminar nota"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button></div>` : ''}
            </div>
            <div class="note-body">
                <div class="note-content">${Utils.escapeHTML(note.content)}</div>
                <div class="badges-container">
                    ${note.isAiClassified ? `<span class="badge badge-ai"><i data-lucide="sparkles"></i> AI Suggested</span>` : ''}
                    ${niche ? `<span class="badge badge-niche niche-link" data-niche-id="${niche.id}"><i data-lucide="${niche.icon}"></i> ${Utils.escapeHTML(niche.name)}</span>` : ''}
                    ${note.visibility === 'PRIVATE' ? `<span class="badge badge-private"><i data-lucide="lock"></i> Privado</span>` : ''}
                </div>
                <div class="note-actions">
                    <button class="action-btn ${isLiked ? 'liked' : ''}" data-action="like" data-id="${note.id}">
                        <i data-lucide="heart" class="action-icon"></i><span class="count-like">${note.likesCount}</span>
                    </button>
                    <button class="action-btn ${isRenoted ? 'renoted' : ''}" data-action="renote" data-id="${note.id}">
                        <i data-lucide="repeat-2" class="action-icon"></i><span class="count-renote">${note.renotesCount}</span>
                    </button>
                    <button class="action-btn ${isSaved ? 'saved' : ''}" data-action="save" data-id="${note.id}">
                        <i data-lucide="bookmark" class="action-icon"></i>
                    </button>
                </div>
            </div>
        `;
        return div;
    },

    renderSidebars() {
        const nList = document.getElementById('trending-niches');
        if (nList) nList.innerHTML = Object.values(AppState.niches).slice(0, 5).map(n => `
            <div class="trend-item">
                <div class="trend-info niche-link" data-niche-id="${n.id}">
                    <strong><i data-lucide="${n.icon}" style="width: 16px; color: var(--accent-primary);"></i> ${Utils.escapeHTML(n.name)}</strong>
                    <span>${n.followersCount.toLocaleString()} contribuciones</span>
                </div>
                <button class="btn-follow ${AppState.currentUser.followedNiches.has(n.id) ? 'following' : ''}" data-type="niche" data-id="${n.id}">
                    ${AppState.currentUser.followedNiches.has(n.id) ? 'Siguiendo' : 'Seguir'}
                </button>
            </div>
        `).join('');

        const uList = document.getElementById('suggested-users');
        if (uList) uList.innerHTML = Object.values(AppState.users)
            .filter(u => u.id !== 'u_me' && !AppState.currentUser.followedUsers.has(u.id))
            .slice(0, 4)
            .map(u => `
                <div class="trend-item">
                    <div class="user-link" data-user-id="${u.id}" style="display:flex;align-items:center;gap:10px;">
                        <div class="avatar avatar--sm">${u.avatar.startsWith('http')?`<img src="${u.avatar}">`:Utils.escapeHTML(u.avatar)}</div>
                        <div>
                            <div style="font-size:14px;font-weight:700;">${Utils.escapeHTML(u.name)}</div>
                            <div style="font-size:13px;color:var(--text-secondary);">@${Utils.escapeHTML(u.handle)}</div>
                        </div>
                    </div>
                    <button class="btn-follow" data-type="user" data-id="${u.id}">Seguir</button>
                </div>
            `).join('');
    }
};

/* ==========================================================================
   9. MOCK DATA BOOTSTRAP
   ========================================================================== */
const MockEngine = {
    generate() {
        const niches = [
            { id: 'tech', name: 'Software Dev', icon: 'cpu' }, { id: 'startups', name: 'Startups', icon: 'rocket' },
            { id: 'ai', name: 'Agentes IA', icon: 'bot' }, { id: 'productivity', name: 'Sistemas', icon: 'timer' },
            { id: 'philosophy', name: 'Mindset', icon: 'book-open' }
        ];
        niches.forEach(n => { AppState.niches[n.id] = { ...n, followersCount: 4000 + Math.floor(Math.random() * 5000) }; });

        const uData = [
            { id: "u_1", handle: "alex_chen", name: "Alex Chen", bio: "Building distributed systems.", avatar: "https://i.pravatar.cc/150?u=1", followersCount: 842, followingCount: 20 },
            { id: "u_2", handle: "design_queen", name: "Elena S", bio: "Visual storytelling.", avatar: "https://i.pravatar.cc/150?u=2", followersCount: 1205, followingCount: 430 }
        ];
        uData.forEach(u => { AppState.users[u.id] = u; });

        for (let i = 1; i <= 20; i++) {
            const id = Utils.generateId('n');
            AppState.notes[id] = {
                id, authorId: i%3===0 ? 'u_me':'u_1', content: "Draft atomic note " + i,
                visibility: i%5===0 ? 'PRIVATE' : 'PUBLIC', nicheId: 'tech',
                likesCount: 12, renotesCount: 2, timestamp: Date.now() - (i*10000), isAiClassified: false
            };
            if(i%3===0) AppState.currentUser.ownNotes.add(id);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
