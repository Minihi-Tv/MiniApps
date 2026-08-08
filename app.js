let appDatabase = []; // Almacenará la base de datos

// 1. Iniciar Aplicación: Cargar datos desde JSON
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // En GitHub Pages, esto buscará el archivo local database.json
        const response = await fetch('database.json');
        appDatabase = await response.json();
        
        generateNotifications();
        renderView('Inicio'); // Vista por defecto
        setupEventListeners();
    } catch (error) {
        document.getElementById('mainContainer').innerHTML = 
            `<p style="color:red; text-align:center;">Error al cargar la base de datos. Si estás probando esto en tu PC local, necesitas un servidor local (Live Server) por políticas de CORS.</p>`;
    }
});

// 2. Sistema Automático de Notificaciones
function generateNotifications() {
    const list = document.getElementById('notifList');
    list.innerHTML = '';
    
    // Filtrar apps que son nuevas o se actualizaron recientemente
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
    document.getElementById('bellBadge').style.display = 'none'; // Marcar como leídas
}

// 3. Renderizar Contenido (Play Store Layout)
function renderView(tabName, searchQuery = '') {
    const main = document.getElementById('mainContainer');
    main.innerHTML = ''; // Limpiar

    let appsToRender = appDatabase;

    // Filtro de Búsqueda
    if (searchQuery) {
        appsToRender = appDatabase.filter(app => 
            app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            app.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
        main.innerHTML = `<h2 class="section-title">Resultados para "${searchQuery}"</h2>`;
        main.innerHTML += generateAppGrid(appsToRender);
        return;
    }

    // Vistas por Pestaña
    if (tabName === 'Inicio') {
        // Hero Slider (Solo Novedades)
        const news = appDatabase.filter(app => app.isNew);
        if(news.length > 0) {
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

        // Recomendados
        main.innerHTML += `<h2 class="section-title">Recomendados para ti <span>Ver más</span></h2>`;
        main.innerHTML += generateAppGrid(appDatabase.slice(0, 6)); 
        
        // Actualizados Recientemente
        const updated = appDatabase.filter(app => !app.isNew);
        if(updated.length > 0){
            main.innerHTML += `<h2 class="section-title">Actualizados recientemente <span>Ver más</span></h2>`;
            main.innerHTML += generateAppGrid(updated);
        }
    } 
    else {
        // Vista de Categorías Específicas (Juegos, Entretenimiento, Herramientas)
        const categoryApps = appDatabase.filter(app => app.category === tabName);
        main.innerHTML += `<h2 class="section-title">Top ${tabName}</h2>`;
        main.innerHTML += generateAppGrid(categoryApps);
    }
}

// Generador de Tarjetas
function generateAppGrid(apps) {
    if(apps.length === 0) return `<p style="color:var(--text-muted);">No hay apps en esta sección.</p>`;
    
    let html = `<div class="app-grid">`;
    apps.forEach(app => {
        html += `
        <div class="app-card" onclick="openModal(${app.id})">
            <img src="${app.icon}" alt="Icono">
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

// 4. Modal de Detalles (Play Store Style)
function openModal(id) {
    const app = appDatabase.find(a => a.id === id);
    const modalContent = document.getElementById('modalContentDynamic');
    
    modalContent.innerHTML = `
        <div class="modal-header-large">
            <img src="${app.icon}" alt="Icono">
            <div class="modal-title" style="flex:1;">
                <h1>${app.name}</h1>
                <p>${app.developer}</p>
                <div style="font-size:0.9rem; color:var(--text-muted); margin-top:5px;">Contiene anuncios • Compras integradas</div>
                <button class="btn-install" style="width: 250px; padding: 12px; margin-top: 15px; font-size:1.1rem;" onclick="event.stopPropagation(); installApp(this)">Instalar en Windows</button>
            </div>
            <div style="text-align:center; padding-left: 20px; border-left: 1px solid var(--border-color);">
                <div style="font-size: 1.5rem; font-weight:bold;">${app.rating} <span style="font-size:1rem;">★</span></div>
                <div style="font-size: 0.8rem; color:var(--text-muted);">2 M reseñas</div>
            </div>
        </div>
        <div class="modal-body">
            <div class="modal-screenshots">
                ${app.screenshots.map(src => `<img src="${src}" alt="Screenshot">`).join('')}
            </div>
            
            <div class="desc-box">
                <h3 style="color:var(--text-main); margin-bottom:10px;">Acerca de este juego/app</h3>
                <p>${app.description}</p>
                <br>
                <ul style="padding-left: 20px; color:var(--iqiyi-green);">
                    ${app.features.map(f => `<li><span style="color:var(--text-muted);">${f}</span></li>`).join('')}
                </ul>
            </div>

            ${app.updateNotes ? `
            <div class="update-box">
                <h3 style="color:var(--text-main); margin-bottom:5px;">Novedades</h3>
                <p style="font-size:0.85rem; color:var(--iqiyi-green); margin-bottom:10px;">Última actualización: ${app.updateDate}</p>
                <p>${app.updateNotes}</p>
            </div>` : ''}
        </div>
    `;
    
    document.getElementById('appModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('appModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Interacción Instalar
function installApp(btn) {
    if(btn.classList.contains('done') || btn.classList.contains('loading')) return;
    btn.classList.add('loading');
    btn.innerText = "Pendiente...";
    setTimeout(() => { btn.innerText = "Instalando... (45%)"; }, 1000);
    setTimeout(() => {
        btn.classList.remove('loading');
        btn.classList.add('done');
        btn.innerText = "Jugar";
    }, 3000);
}

// 5. Configurar Eventos (Pestañas, Buscador, Click fuera)
function setupEventListeners() {
    // Pestañas
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('searchInput').value = ''; // Limpiar buscador
            renderView(e.target.dataset.target);
        });
    });

    // Buscador
    document.getElementById('searchInput').addEventListener('input', (e) => {
        tabs.forEach(t => t.classList.remove('active')); // Quitar activo de pestañas
        renderView('', e.target.value);
    });

    // Cerrar modales clicando fuera
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('appModal');
        if (e.target === modal) closeModal();
        
        const notifPanel = document.getElementById('notifPanel');
        const bell = document.querySelector('.bell-icon');
        if(e.target !== notifPanel && !notifPanel.contains(e.target) && !bell.contains(e.target)) {
            notifPanel.style.display = 'none';
        }
    });
}
