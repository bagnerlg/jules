/**
 * GCI ADMIN - App Principal & Enrutador Modular (Versión Navbar Glossy)
 */

import { ClientsModule } from './modules/clients.js';
import { renderDashboardModule } from './modules/dashboard.js';
import { renderApiConfigModule } from './modules/api-config.js';
import { renderFileManagerModule } from './modules/file-manager.js';
import { RoutesModule } from './modules/routes.js';
import { BOModule } from './modules/bo.js';
import { PEPSModule } from './modules/peps.js';

// Instancias únicas de los módulos orientados a objetos
const clientsInstance = new ClientsModule();
const routesInstance = new RoutesModule();
const boInstance = new BOModule();
const pepsInstance = new PEPSModule();

// Módulo App Global
export const GCIApp = {
    currentModule: 'clientes',

    // Registro de Módulos disponibles
    modules: {
        'clientes': { title: 'Clientes', render: (container) => { container.innerHTML = clientsInstance.render(); clientsInstance.initEvents(); } },
        'dashboard': { title: 'Dashboard', render: renderDashboardModule },
        'file-manager': { title: 'Archivos Locales', render: renderFileManagerModule },
        'agenda-rutas': { title: 'Agenda de Rutas', render: (container) => { container.innerHTML = routesInstance.render(); routesInstance.initEvents(); } },
        'bo': { title: 'BO - Back Office', render: (container) => { container.innerHTML = boInstance.render(); boInstance.initEvents(); } },
        'peps': { title: 'PEPS - Producción y Votación', render: (container) => { container.innerHTML = pepsInstance.render(); pepsInstance.initEvents(); } },
        'api-config': { title: 'Conexiones & APIs', render: renderApiConfigModule },
        'supabase-view': { title: 'Supabase DB', render: () => renderPlaceholderModule('Supabase DB', 'fa-database', '059669') },
        'sap-view': { title: 'SAP Business One', render: () => renderPlaceholderModule('SAP Business One', 'fa-building-columns', '1e40af') },
        'google-sheets-view': { title: 'Google Sheets', render: () => renderPlaceholderModule('Google Sheets', 'fa-file-excel', '166534') },
        'onedrive-view': { title: 'OneDrive Cloud', render: () => renderPlaceholderModule('OneDrive Cloud', 'fa-cloud', '0284c7') }
    },

    init() {
        console.log("🚀 Inicializando GCI Admin Glossy Core (Módulo Clientes)...");
        this.setupNavigation();
        this.setupConnectionsModal();
        this.updatePillsStatus();

        // Manejar cambio de Hash o carga inicial (Por defecto 'clientes')
        const initialModule = location.hash.replace('#', '') || 'clientes';
        this.navigateTo(initialModule);

        window.addEventListener('hashchange', () => {
            const moduleName = location.hash.replace('#', '') || 'clientes';
            this.navigateTo(moduleName);
        });
    },

    // Manejar clics de navegación en la barra horizontal de pestañas
    setupNavigation() {
        const tabItems = document.querySelectorAll('.nav-tab-item');

        tabItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetModule = item.getAttribute('data-module');
                if (targetModule) {
                    tabItems.forEach(t => t.classList.remove('active'));
                    item.classList.add('active');
                    this.navigateTo(targetModule);
                }
            });
        });
    },

    // Modal de Conexiones API desde la cabecera
    setupConnectionsModal() {
        const modal = document.getElementById('connections-modal');
        const openBtn = document.getElementById('btn-open-connections-modal');
        const closeBtn = document.getElementById('btn-close-connections-modal');
        const modalBody = document.getElementById('connections-modal-body');

        if (openBtn && modal) {
            openBtn.addEventListener('click', () => {
                if (modalBody) {
                    renderApiConfigModule(modalBody);
                }
                modal.style.display = 'flex';
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                this.updatePillsStatus();
            });
        }

        // Cerrar al hacer clic fuera del modal
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    this.updatePillsStatus();
                }
            });
        }
    },

    // Carga de Módulo Dinámica y Aislada
    navigateTo(moduleName) {
        if (!this.modules[moduleName]) {
            moduleName = 'clientes';
        }

        this.currentModule = moduleName;
        const container = document.getElementById('gci-content-area');

        // Actualizar pestaña activa en la barra superior si cambia por hash directo
        document.querySelectorAll('.nav-tab-item').forEach(item => {
            if (item.getAttribute('data-module') === moduleName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Feedback de Carga Glossy
        container.innerHTML = `
            <div class="module-loader">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <p>Cargando ${this.modules[moduleName].title}...</p>
            </div>
        `;

        // Renderizado aislado con timeout suave para transición limpia
        setTimeout(() => {
            try {
                this.modules[moduleName].render(container);
            } catch (error) {
                console.error(`Error al cargar el módulo [${moduleName}]:`, error);
                container.innerHTML = `
                    <div class="gci-card" style="border-left: 4px solid var(--status-danger);">
                        <h3 style="color: var(--status-danger);"><i class="fa-solid fa-triangle-exclamation"></i> Error al cargar módulo</h3>
                        <p style="color: var(--text-dark); margin-top: 8px;">Ocurrió un inconveniente al renderizar esta vista.</p>
                        <pre style="background: #e2e8f0; padding: 12px; border-radius: 8px; margin-top: 12px; font-size: 0.8rem;">${error.message}</pre>
                    </div>
                `;
            }
        }, 50);
    },

    // Actualizar Pills de estado general en el Header superior
    updatePillsStatus() {
        const configData = JSON.parse(localStorage.getItem('gci_api_config') || '{}');

        this.setPillState('pill-supabase', !!configData.supabaseUrl && !!configData.supabaseKey);
        this.setPillState('pill-sap', !!configData.sapServiceLayerUrl && !!configData.sapCompanyDb);
        this.setPillState('pill-sheets', !!configData.googleSheetsUrl || !!configData.appscriptUrl);
        this.setPillState('pill-onedrive', !!configData.onedriveClientId && !!configData.onedriveTenantId);
        this.setPillState('pill-waze', !!configData.wazeApiKey);
    },

    setPillState(pillId, isConfigured) {
        const pill = document.getElementById(pillId);
        if (!pill) return;
        const dot = pill.querySelector('.pill-dot');
        if (isConfigured) {
            dot.className = 'fa-solid fa-circle pill-dot dot-active';
            pill.title = `${pill.innerText}: Configurado`;
        } else {
            dot.className = 'fa-solid fa-circle pill-dot dot-inactive';
            pill.title = `${pill.innerText}: Pendiente de Configuración`;
        }
    }
};

// Render para Módulos Placeholder
function renderPlaceholderModule(title, icon, colorHex) {
    const container = document.getElementById('gci-content-area');
    container.innerHTML = `
        <div class="module-header-block">
            <div>
                <h1 class="module-title"><i class="fa-solid ${icon}" style="color: #${colorHex}"></i> Módulo Integrado: ${title}</h1>
                <p class="module-subtitle">Espacio preparado para la integración profunda con ${title}.</p>
            </div>
        </div>

        <div class="gci-card" style="text-align: center; padding: 50px 20px;">
            <div style="width: 70px; height: 70px; background: var(--glossy-blue); color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px; box-shadow: 0 4px 10px rgba(37,99,235,0.3);">
                <i class="fa-solid ${icon}"></i>
            </div>
            <h2>Módulo listo para conexión</h2>
            <p style="color: var(--text-muted); max-width: 500px; margin: 10px auto 24px;">
                Las credenciales para este servicio pueden configurarse en el botón superior <strong style="color: #2563eb;">"Configuración de Conexiones"</strong>.
            </p>
            <button onclick="document.getElementById('btn-open-connections-modal').click()" class="btn-gci btn-primary"><i class="fa-solid fa-plug"></i> Configurar Credenciales</button>
        </div>
    `;
}

// Iniciar aplicación al cargar el DOM o si ya está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GCIApp.init());
} else {
    GCIApp.init();
}
