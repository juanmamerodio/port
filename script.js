/**
 * NOTEBING - Core Application Logic (Vanilla JS Prototype)
 * Arquitectura: MVC / Capas simuladas para preparar la transición a Android (MVI/MVVM)
 */

/* ==========================================================================
   1. STATE MANAGEMENT (Simulando el ViewModel / StateFlow en Android)
   ========================================================================== */
const AppState = {
    currentUser: {
        username: 'usuario_dev',
        avatar: 'avatar.jpg'
    },
    isSubmitting: false,
    // Aquí viviría la lista de notas en una app real (StateFlow<List<Note>>)
};

/* ==========================================================================
   2. SERVICES & API (Simulando la capa Data / Repositories / Retrofit)
   ========================================================================== */
class ApiService {
    /**
     * Simula una llamada al backend para guardar la nota en PostgreSQL.
     */
    static async createNote(noteData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    id: Date.now(),
                    ...noteData,
                    createdAt: new Date().toISOString(),
                    likes: 0
                });
            }, 600); // Simula latencia de red
        });
    }

    /**
     * INTEGRACIÓN IA: Simula la llamada al backend que conecta con Gemini 3.1 Flash.
     * Si el usuario no elige un nicho, la IA lee el contenido y lo clasifica.
     */
    static async classifyWithGemini(content) {
        console.log("🧠 [Gemini 3.1 Flash] Analizando contenido para auto-etiquetado...");
        return new Promise((resolve) => {
            setTimeout(() => {
                const lowerContent = content.toLowerCase();
                let suggestedNiche = { id: 'general', name: 'General', icon: '🌐' };

                // Lógica mockeada de clasificación NLP
                if (lowerContent.includes('android') || lowerContent.includes('kotlin') || lowerContent.includes('compose')) {
                    suggestedNiche = { id: 'android', name: 'Desarrollo Android', icon: '🤖' };
                } else if (lowerContent.includes('startup') || lowerContent.includes('mvp') || lowerContent.includes('negocio')) {
                    suggestedNiche = { id: 'startups', name: 'Startups', icon: '🚀' };
                } else if (lowerContent.includes('ia') || lowerContent.includes('gemini') || lowerContent.includes('prompt')) {
                    suggestedNiche = { id: 'ai', name: 'Inteligencia Artificial', icon: '✨' };
                }

                console.log(`✅ [Gemini 3.1 Flash] Nicho detectado: ${suggestedNiche.name}`);
                resolve(suggestedNiche);
            }, 800); // Simula el tiempo de inferencia de la IA
        });
    }
}

/* ==========================================================================
   3. UI CONTROLLER (Simulando Jetpack Compose / Activity)
   ========================================================================== */
class UIController {
    static init() {
        this.cacheDOM();
        this.bindEvents();
        console.log("🚀 Notebing App Inicializada. Arquitectura lista.");
    }

    static cacheDOM() {
        this.form = document.querySelector('form[action="/api/notes"]');
        this.feedContainer = document.querySelector('section[aria-labelledby="feed-title"]');
        this.submitBtn = this.form.querySelector('button[type="submit"]');
        this.contentInput = this.form.querySelector('textarea[name="content"]');
        this.nicheSelect = this.form.querySelector('select[name="nicheId"]');
    }

    static bindEvents() {
        // Evento de creación de nota
        this.form.addEventListener('submit', (e) => this.handleNoteSubmit(e));
        
        // Event Delegation para interacciones en el feed (Likes, Re-notes, Brain)
        this.feedContainer.addEventListener('click', (e) => this.handleFeedInteractions(e));
    }

    /**
     * Flujo principal de creación de una nota (Use Case)
     */
    static async handleNoteSubmit(e) {
        e.preventDefault();
        if (AppState.isSubmitting) return;

        const content = this.contentInput.value.trim();
        const visibility = this.form.querySelector('input[name="visibility"]:checked').value;
        let nicheId = this.nicheSelect.value;
        let nicheData = null;

        if (!content) return;

        this.setLoadingState(true);

        try {
            // 1. Lógica de IA: Si es público/nicho y no tiene nicho asignado, Gemini lo clasifica
            if (!nicheId && visibility !== 'PRIVATE') {
                this.showToast("✨ Gemini está analizando tu nota...");
                nicheData = await ApiService.classifyWithGemini(content);
            } else if (nicheId) {
                // Mock de nicho manual
                nicheData = { id: nicheId, name: this.nicheSelect.options[this.nicheSelect.selectedIndex].text, icon: '🏷️' };
            }

            // 2. Construir payload
            const notePayload = {
                content,
                visibility,
                niche: nicheData,
                author: AppState.currentUser
            };

            // 3. Enviar al backend
            const newNote = await ApiService.createNote(notePayload);

            // 4. Actualizar UI (Prepend al feed)
            this.renderNewNote(newNote);
            
            // 5. Limpiar formulario
            this.form.reset();
            this.showToast("✅ Nota publicada con éxito");

        } catch (error) {
            console.error("Error al publicar:", error);
            this.showToast("❌ Error al publicar la nota", "error");
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Maneja los clics en los botones de las notas usando Event Delegation
     * (Mucho más eficiente en memoria que añadir un listener a cada botón)
     */
    static handleFeedInteractions(e) {
        const target = e.target;

        // Lógica de "Me Gusta"
        if (target.textContent.includes('❤️')) {
            const currentLikes = parseInt(target.textContent.replace(/[^0-9]/g, '')) || 0;
            const isLiked = target.classList.contains('liked');
            
            if (isLiked) {
                target.textContent = `❤️ ${currentLikes - 1} Likes`;
                target.classList.remove('liked');
                target.style.color = 'var(--text-secondary)';
            } else {
                target.textContent = `❤️ ${currentLikes + 1} Likes`;
                target.classList.add('liked');
                target.style.color = 'var(--danger-color)'; // Rojo
            }
            // Aquí iría la llamada a ApiService.toggleLike(noteId)
        }

        // Lógica de "Segundo Cerebro"
        if (target.textContent.includes('🧠')) {
            this.showToast("🧠 Guardado en tu Segundo Cerebro (Privado)");
            target.textContent = "🧠 Guardado";
            target.style.color = 'var(--accent-primary)';
            target.disabled = true;
            // Aquí iría la llamada a ApiService.saveToBrain(noteId)
        }
    }

    /**
     * Genera el HTML de la nueva nota y lo inyecta en el DOM
     */
    static renderNewNote(note) {
        const article = document.createElement('article');
        
        // Etiqueta de nicho o privacidad
        let badgeHTML = '';
        if (note.visibility === 'PRIVATE') {
            badgeHTML = `<span style="color: var(--text-secondary);">🔒 Nota Privada (Segundo Cerebro)</span>`;
        } else if (note.niche) {
            badgeHTML = `<a href="/niche/${note.niche.id}">${note.niche.icon} ${note.niche.name}</a>`;
        }

        // Etiqueta de IA si fue auto-clasificado
        const aiHeader = note.niche && !this.nicheSelect.value && note.visibility !== 'PRIVATE' 
            ? `<span style="font-size: 0.8rem; color: var(--accent-primary);">✨ Clasificado por Gemini</span><br>` 
            : '';

        article.innerHTML = `
            <header>
                ${aiHeader}
                <img src="${note.author.avatar}" alt="Avatar" width="30" height="30" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjY2NjIi8+PC9zdmc+'">
                <strong>@${note.author.username}</strong>
                <span>Justo ahora</span>
            </header>
            <p>${this.escapeHTML(note.content)}</p>
            <footer>
                ${badgeHTML}
                <button>❤️ 0 Likes</button>
                <button>🔄 Re-Note</button>
                <button>🧠 Guardar en Segundo Cerebro</button>
            </footer>
        `;

        // Insertar justo después del título del feed
        const feedTitle = this.feedContainer.querySelector('h2');
        feedTitle.insertAdjacentElement('afterend', article);
        
        // Añadir el separador <hr>
        const hr = document.createElement('hr');
        article.insertAdjacentElement('afterend', hr);
    }

    /**
     * Utilidades de UI
     */
    static setLoadingState(isLoading) {
        AppState.isSubmitting = isLoading;
        this.submitBtn.disabled = isLoading;
        this.submitBtn.textContent = isLoading ? 'Publicando...' : 'Publicar Nota';
        this.contentInput.disabled = isLoading;
    }

    static showToast(message, type = 'success') {
        // Crea un elemento toast dinámico
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: ${type === 'error' ? 'var(--danger-color)' : 'var(--bg-surface)'};
            color: ${type === 'error' ? 'white' : 'var(--text-primary)'};
            padding: 12px 24px;
            border-radius: var(--radius-md);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border: 1px solid var(--border-color);
            z-index: 1000;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toast);

        // Desaparecer después de 3 segundos
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Prevenir XSS (Cross-Site Scripting) básico
    static escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    UIController.init();
});
