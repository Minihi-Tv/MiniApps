let appDatabase = []; // Almacenará la base de datos

// Estado de la vista actual (pestaña, búsqueda, orden, filtro de categoría)
let viewState = { mode: 'tab', tab: 'Inicio', search: '', sort: 'relevancia', catFilter: 'Todas' };

const CATEGORIES = ['Juegos', 'Entretenimiento', 'Herramientas'];

/* ============ ALMACENAMIENTO LOCAL ============ */
function getFavorites() {
    return JSON.parse(localStorage.getItem('iqstore_favorites') || '[]');
}
function saveFavorites(arr) {
    localStorage.setItem('iqstore_favorites', JSON.stringify(arr));
}
function isFavorite(id) {
    return getFavorites().includes(id);
}
function toggleFavorite(id) {
    let favs = getFavorites();
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
        showToast('Eliminado de favoritos', 'info');
    } else {
        favs.push(id);
        showToast('Añadido a favoritos', 'success');
    }
    saveFavorites(favs);
    updateFavCountBadge();
    return favs.includes(id);
}
function updateFavCountBadge() {
    const count = getFavorites().length;
    const el = document.getElementById('favCount');
    if (el) el.textContent = count > 0 ? count : '';
}

function getExtraReviews() {
    return JSON.parse(localStorage.getItem('iqstore_reviews') || '{}');
}
function addReview(appId, rating, comment) {
    const all = getExtraReviews();
    if (!all[appId]) all[appId] = [];
    all[appId].unshift({ author: 'Tú', rating, comment, date: 'Ahora mismo' });
    localStorage.setItem('iqstore_reviews', JSON.stringify(all));
}
function getAllReviewsFor(app) {
    const extra = getExtraReviews()[app.id] || [];
    return [...extra, ...(app.reviews || [])];
}

function getInstalled() {
    return JSON.parse(localStorage.getItem('iqstore_installed') || '[]');
}
function isInstalled(id) {
    return getInstalled().includes(id);
}
function setInstalled(id, val) {
    let list = getInstalled();
    if (val && !list.includes(id)) list.push(id);
    if (!val) list = list.filter(x => x !== id);
    localStorage.setItem('iqstore_installed', JSON.stringify(list));
}

/* ============ TOASTS ============ */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/* ============ INICIO ============ */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('database.json');
        appDatabase = await response.json();

        generateNotifications();
        updateFavCountBadge();
        render();
        setupEventListeners();
    } catch (error) {
        document.getElementById('mainContainer').innerHTML =
            `<p style="color:red; text-align:center;">Error al cargar la base de datos. Si estás probando esto en tu PC local, necesitas un servidor local (Live Server) por políticas de CORS.</p>`;
    }
});

/* ============ NOTIFICACIONES ============ */
function generateNotifications() {
    const list = document.getElementById('notifList');
    list.innerHTML = '';

    const updates = appDatabase.filter(app => app.isNew || app.updateNotes);

    if (updates.length > 0) {
        document.getElementById('bellBadge').style.display = 'block';

        updates.forEach(app => {
            const tag = app.isNew ? '¡NUEVO!' : 'ACTUALIZACIÓN';
            list.innerHTML += `
                <div class="notif-item" onclick="openModal(${app.id}); toggleNotifications();">
                    <span class="notif-tag">${tag}</span>
                    <div class="notif-title">${app.name}</div>
                    <div class="notif-desc">${app.isNew ? 'Ya disponible para descargar.' : app.updateNotes}</div>
                    <div style="font-size:0.75rem; color:gray; margin-top:5px;">${app.updateDate}</div>
                </div>
            `;
        });
    } else {
        list.innerHTML = `<div class="notif-item"><div class="notif-title">Todo al día</div><div class="notif-desc">No hay novedades por ahora.</div></div>`;
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notifPanel');
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    document.getElementById('bellBadge').style.display = 'none';
}

/* ============ ORDENAR / FILTRAR ============ */
function sortApps(apps, sortKey) {
    const list = [...apps];
    switch (sortKey) {
        case 'rating':
            return list.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        case 'nombre':
            return list.sort((a, b) => a.name.localeCompare(b.name));
        case 'recientes':
            return list.sort((a, b) => (b.isNew === a.isNew) ? b.id - a.id : (b.isNew ? 1 : -1));
        default: // relevancia
            return list.sort((a, b) => (b.isNew === a.isNew) ? 0 : (a.isNew ? -1 : 1));
    }
}

function renderToolbar(showCategoryChips) {
    let html = `<div class="toolbar">`;
    if (showCategoryChips) {
        html += `<div class="chip-group">`;
        ['Todas', ...CATEGORIES].forEach(cat => {
            html += `<button class="chip ${viewState.catFilter === cat ? 'active' : ''}" onclick="setCatFilter('${cat}')">${cat}</button>`;
        });
        html += `</div>`;
    }
    html += `
        <select class="sort-select" onchange="setSort(this.value)">
            <option value="relevancia" ${viewState.sort === 'relevancia' ? 'selected' : ''}>Relevancia</option>
            <option value="rating" ${viewState.sort === 'rating' ? 'selected' : ''}>Mejor valoradas</option>
            <option value="nombre" ${viewState.sort === 'nombre' ? 'selected' : ''}>Nombre A-Z</option>
            <option value="recientes" ${viewState.sort === 'recientes' ? 'selected' : ''}>Más recientes</option>
        </select>
    </div>`;
    return html;
}

function setSort(val) { viewState.sort = val; render(); }
function setCatFilter(val) { viewState.catFilter = val; render(); }

/* ============ RENDER PRINCIPAL ============ */
function render() {
    const main = document.getElementById('mainContainer');
    main.innerHTML = '';

    if (viewState.mode === 'search') {
        let results = appDatabase.filter(app =>
            app.name.toLowerCase().includes(viewState.search.toLowerCase()) ||
            app.category.toLowerCase().includes(viewState.search.toLowerCase())
        );
        if (viewState.catFilter !== 'Todas') results = results.filter(a => a.category === viewState.catFilter);
        results = sortApps(results, viewState.sort);
        main.innerHTML = `<h2 class="section-title">Resultados para "${viewState.search}"</h2>`;
        main.innerHTML += renderToolbar(true);
        main.innerHTML += generateAppGrid(results, `No encontramos apps para "${viewState.search}". Prueba con otro término.`);
        return;
    }

    if (viewState.mode === 'all') {
        let list = viewState.catFilter === 'Todas' ? appDatabase : appDatabase.filter(a => a.category === viewState.catFilter);
        list = sortApps(list, viewState.sort);
        main.innerHTML = `<h2 class="section-title">${viewState.allTitle || 'Todas las apps'}</h2>`;
        main.innerHTML += renderToolbar(true);
        main.innerHTML += generateAppGrid(list);
        return;
    }

    // Modo pestaña
    if (viewState.tab === 'Inicio') {
        const news = appDatabase.filter(app => app.isNew);
        if (news.length > 0) {
            let heroHTML = `<div class="horizontal-scroll">`;
            news.forEach(app => {
                heroHTML += `
                <div class="hero-card" style="background-image: url('${app.banner || app.screenshots[0]}')" onclick="openModal(${app.id})">
                    <div class="hero-gradient">
                        <span style="background:var(--iqiyi-green); color:black; padding:2px 8px; border-radius:4px; font-size:0.8rem; width:fit-content; font-weight:bold; margin-bottom:5px;">Destacado</span>
                        <h2 style="font-size:2rem; margin:0;">${app.name}</h2>
                        <p style="color:#ccc;">${app.category} • ★ ${app.rating}</p>
                    </div>
                </div>`;
            });
            heroHTML += `</div>`;
            main.innerHTML += heroHTML;
        }

        main.innerHTML += `<h2 class="section-title">Recomendados para ti <span onclick="viewAll('Todas', 'Recomendados para ti')">Ver más</span></h2>`;
        main.innerHTML += generateAppGrid(appDatabase.slice(0, 6));

        const updated = appDatabase.filter(app => !app.isNew);
        if (updated.length > 0) {
            main.innerHTML += `<h2 class="section-title">Actualizados recientemente <span onclick="viewAll('Todas', 'Actualizados recientemente')">Ver más</span></h2>`;
            main.innerHTML += generateAppGrid(updated);
        }
    }
    else if (viewState.tab === 'Favoritos') {
        let favs = appDatabase.filter(app => isFavorite(app.id));
        favs = sortApps(favs, viewState.sort);
        main.innerHTML = `<h2 class="section-title">Tus favoritos</h2>`;
        if (favs.length > 0) main.innerHTML += renderToolbar(false);
        main.innerHTML += generateAppGrid(favs, 'Aún no tienes apps favoritas. Toca el corazón de una app para guardarla aquí.');
    }
    else {
        let categoryApps = appDatabase.filter(app => app.category === viewState.tab);
        categoryApps = sortApps(categoryApps, viewState.sort);
        main.innerHTML += `<h2 class="section-title">Top ${viewState.tab}</h2>`;
        main.innerHTML += renderToolbar(false);
        main.innerHTML += generateAppGrid(categoryApps);
    }
}

function viewAll(cat, title) {
    viewState = { mode: 'all', sort: 'relevancia', catFilter: cat, allTitle: title };
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    render();
}

/* ============ TARJETAS ============ */
function generateAppGrid(apps, emptyMessage) {
    if (apps.length === 0) {
        return `<div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <h3>Nada por aquí todavía</h3>
            <p>${emptyMessage || 'No hay apps en esta sección.'}</p>
        </div>`;
    }

    let html = `<div class="app-grid">`;
    apps.forEach(app => {
        const fav = isFavorite(app.id);
        html += `
        <div class="app-card" onclick="openModal(${app.id})">
            <button class="fav-btn ${fav ? 'active' : ''}" onclick="event.stopPropagation(); this.classList.toggle('active', toggleFavorite(${app.id}))">
                <svg viewBox="0 0 24 24"><path d="M12 21s-6.7-4.35-9.3-8.02C1 10.5 1.5 7 4.5 5.5c2.2-1.1 4.4-.3 5.9 1.4L12 8.5l1.6-1.6c1.5-1.7 3.7-2.5 5.9-1.4C22.5 7 23 10.5 21.3 12.98 18.7 16.65 12 21 12 21z"/></svg>
            </button>
            <img src="${app.icon}" alt="Icono" loading="lazy">
            <div class="app-info-small">
                <span class="app-name">${app.name}</span>
                <span class="app-dev">${app.developer}</span>
                <span class="app-rating">${app.rating} ★</span>
            </div>
        </div>`;
    });
    html += `</div>`;
    return html;
}

/* ============ MODAL DE DETALLES ============ */
function openModal(id) {
    const app = appDatabase.find(a => a.id === id);
    const modalContent = document.getElementById('modalContentDynamic');
    const installed = isInstalled(id);
    const fav = isFavorite(id);

    modalContent.innerHTML = `
        <div class="modal-header-large">
            <img src="${app.icon}" alt="Icono">
            <div class="modal-title" style="flex:1; min-width:200px;">
                <h1>${app.name}</h1>
                <p>${app.developer}</p>
                <div style="font-size:0.9rem; color:var(--text-muted); margin-top:5px;">${app.price || 'Gratis'} • ${app.size || ''} • v${app.version || '1.0'}</div>
                <div class="modal-actions">
                    <button class="btn-install ${installed ? 'done' : ''}" id="installBtn" style="width: auto; min-width:200px; padding: 12px 24px; font-size:1rem;" onclick="event.stopPropagation(); downloadApp(this, ${id})">${installed ? 'Descargar de nuevo' : 'Descargar'}</button>
                    <button class="icon-btn ${fav ? 'active' : ''}" id="modalFavBtn" title="Favorito" onclick="toggleModalFav(${id})">
                        <svg viewBox="0 0 24 24"><path d="M12 21s-6.7-4.35-9.3-8.02C1 10.5 1.5 7 4.5 5.5c2.2-1.1 4.4-.3 5.9 1.4L12 8.5l1.6-1.6c1.5-1.7 3.7-2.5 5.9-1.4C22.5 7 23 10.5 21.3 12.98 18.7 16.65 12 21 12 21z"/></svg>
                    </button>
                    <button class="icon-btn" title="Compartir" onclick="shareApp('${app.name.replace(/'/g, "\\'")}')">
                        <svg viewBox="0 0 24 24"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .05 3.11L8.09 10.7a3 3 0 1 0 0 2.6l6.96 3.59A3 3 0 1 0 16 15l-6.96-3.59a3 3 0 0 0 0-.82L16 7a3 3 0 0 0 2 1z"/></svg>
                    </button>
                </div>
            </div>
            <div class="stat-row">
                <div class="stat-item"><div class="val">${app.rating} ★</div><div class="lbl">${getAllReviewsFor(app).length} reseñas</div></div>
                <div class="stat-item"><div class="val">${app.downloads || '—'}</div><div class="lbl">Descargas</div></div>
                <div class="stat-item"><div class="val">${app.size || '—'}</div><div class="lbl">Tamaño</div></div>
            </div>
        </div>
        <div class="modal-body">
            <div class="modal-screenshots">
                ${app.screenshots.map(src => `<img src="${src}" alt="Screenshot" loading="lazy">`).join('')}
            </div>

            <div class="desc-box">
                <h3 style="color:var(--text-main); margin-bottom:10px;">Acerca de este juego/app</h3>
                <p>${app.description}</p>
                <br>
                <ul style="padding-left: 20px; color:var(--iqiyi-green);">
                    ${app.features.map(f => `<li><span style="color:var(--text-muted);">${f}</span></li>`).join('')}
                </ul>
                ${(app.permissions && app.permissions.length) ? `
                <h3 style="color:var(--text-main); margin: 20px 0 5px;">Permisos</h3>
                <div class="permission-list">${app.permissions.map(p => `<span class="permission-tag">${p}</span>`).join('')}</div>` : ''}
            </div>

            ${app.updateNotes ? `
            <div class="update-box">
                <h3 style="color:var(--text-main); margin-bottom:5px;">Novedades</h3>
                <p style="font-size:0.85rem; color:var(--iqiyi-green); margin-bottom:10px;">Última actualización: ${app.updateDate}</p>
                <p>${app.updateNotes}</p>
            </div>` : ''}

            ${renderSimilarApps(app)}
            ${renderReviewsSection(app)}
        </div>
    `;

    document.getElementById('appModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function toggleModalFav(id) {
    const active = toggleFavorite(id);
    const btn = document.getElementById('modalFavBtn');
    btn.classList.toggle('active', active);
}

function shareApp(name) {
    const text = `Mira ${name} en iQ Store`;
    if (navigator.share) {
        navigator.share({ title: name, text }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(`${text} — ${location.href}`).then(() => showToast('Enlace copiado', 'success'));
    } else {
        showToast('No se pudo compartir en este navegador', 'info');
    }
}

function renderSimilarApps(app) {
    const similar = appDatabase.filter(a => a.category === app.category && a.id !== app.id).slice(0, 6);
    if (similar.length === 0) return '';
    let html = `<h3 style="color:var(--text-main); margin: 30px 0 15px;">Similares en ${app.category}</h3><div class="similar-scroll">`;
    similar.forEach(a => {
        html += `<div class="similar-card" onclick="openModal(${a.id})">
            <img src="${a.icon}" alt="${a.name}">
            <span>${a.name}</span>
        </div>`;
    });
    html += `</div>`;
    return html;
}

/* ============ RESEÑAS ============ */
function renderReviewsSection(app) {
    const reviews = getAllReviewsFor(app);
    const dist = [0, 0, 0, 0, 0]; // índices 0-4 para estrellas 1-5
    reviews.forEach(r => { const s = Math.round(r.rating); if (s >= 1 && s <= 5) dist[s - 1]++; });
    const total = reviews.length || 1;

    let barsHTML = '';
    for (let s = 5; s >= 1; s--) {
        const count = dist[s - 1];
        const pct = Math.round((count / total) * 100);
        barsHTML += `<div class="review-bar-row"><span>${s}★</span><div class="review-bar-track"><div class="review-bar-fill" style="width:${pct}%"></div></div><span>${count}</span></div>`;
    }

    const avg = reviews.length ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1) : app.rating;

    let listHTML = reviews.length ? reviews.map(r => `
        <div class="review-item">
            <div class="review-item-head">
                <span class="review-author">${r.author}</span>
                <span class="review-date">${r.date}</span>
            </div>
            <div class="review-stars">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))}</div>
            <div class="review-comment">${r.comment}</div>
        </div>`).join('') : `<p style="color:var(--text-muted);">Sé el primero en dejar una reseña.</p>`;

    return `
    <h3 style="color:var(--text-main); margin: 30px 0 5px;">Reseñas</h3>
    <div class="review-summary">
        <div class="review-score">
            <div class="big">${avg}</div>
            <div class="stars">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</div>
            <div class="count">${reviews.length} reseñas</div>
        </div>
        <div class="review-bars">${barsHTML}</div>
    </div>

    <div class="write-review">
        <strong>Escribe una reseña</strong>
        <div class="star-picker" id="starPicker" data-rating="0">
            ${[1, 2, 3, 4, 5].map(n => `<svg data-star="${n}" viewBox="0 0 24 24" onclick="setStarRating(${n})"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>`).join('')}
        </div>
        <textarea id="reviewText" placeholder="Cuéntanos qué te pareció..."></textarea>
        <button onclick="submitReview(${app.id})">Publicar reseña</button>
    </div>

    <div id="reviewsList">${listHTML}</div>
    `;
}

function setStarRating(n) {
    const picker = document.getElementById('starPicker');
    picker.dataset.rating = n;
    picker.querySelectorAll('svg').forEach(svg => {
        svg.classList.toggle('on', Number(svg.dataset.star) <= n);
    });
}

function submitReview(appId) {
    const picker = document.getElementById('starPicker');
    const rating = Number(picker.dataset.rating);
    const text = document.getElementById('reviewText').value.trim();
    if (rating === 0) { showToast('Selecciona una calificación', 'info'); return; }
    if (!text) { showToast('Escribe un comentario', 'info'); return; }

    addReview(appId, rating, text);
    showToast('¡Gracias por tu reseña!', 'success');
    openModal(appId); // Re-render con la nueva reseña
}

function closeModal() {
    document.getElementById('appModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

/* ============ DESCARGAR ============ */
function downloadApp(btn, id) {
    const app = appDatabase.find(a => a.id === id);
    if (!app || !app.downloadUrl) {
        showToast('Enlace de descarga no disponible', 'info');
        return;
    }

    // Abre el enlace de descarga en una pestaña/página nueva
    window.open(app.downloadUrl, '_blank', 'noopener');

    setInstalled(id, true);
    btn.classList.add('done');
    btn.innerText = 'Descargar de nuevo';
    showToast('Descarga iniciada en una nueva pestaña', 'success');
}

/* ============ EVENTOS GLOBALES ============ */
function setupEventListeners() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            tabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById('searchInput').value = '';
            viewState = { mode: 'tab', tab: target, search: '', sort: 'relevancia', catFilter: 'Todas' };
            render();
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        const val = e.target.value;
        if (val) {
            viewState = { mode: 'search', search: val, sort: 'relevancia', catFilter: 'Todas' };
        } else {
            viewState = { mode: 'tab', tab: 'Inicio', search: '', sort: 'relevancia', catFilter: 'Todas' };
        }
        render();
    });

    // Buscador móvil (mostrar/ocultar)
    const searchToggle = document.getElementById('searchToggleIcon');
    const searchContainer = document.getElementById('searchContainer');
    const searchClose = document.getElementById('searchCloseIcon');
    if (searchToggle) {
        searchToggle.addEventListener('click', () => {
            searchContainer.classList.add('open');
            document.body.classList.add('search-open');
            document.getElementById('searchInput').focus();
        });
    }
    if (searchClose) {
        searchClose.addEventListener('click', () => {
            searchContainer.classList.remove('open');
            document.body.classList.remove('search-open');
        });
    }

    // Cerrar modales/paneles clicando fuera
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('appModal');
        if (e.target === modal) closeModal();

        const notifPanel = document.getElementById('notifPanel');
        const bell = document.getElementById('bellIcon');
        if (e.target !== notifPanel && !notifPanel.contains(e.target) && !bell.contains(e.target)) {
            notifPanel.style.display = 'none';
        }
    });

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}
