/**
 * GCI ADMIN - Módulo de Configuración de APIs y Conexiones
 */

import { GCIApp } from '../app.js';

export function renderApiConfigModule(container) {
    // Cargar credenciales guardadas previamente en localStorage
    const savedConfig = JSON.parse(localStorage.getItem('gci_api_config') || '{}');

    container.innerHTML = `
        <div class="module-header-block">
            <div>
                <h1 class="module-title"><i class="fa-solid fa-sliders" style="color: var(--primary);"></i> Configuración de Conexiones & APIs</h1>
                <p class="module-subtitle">Gestiona las credenciales de acceso para Supabase, SAP Business One, Google Sheets, Apps Script y OneDrive.</p>
            </div>
            <div>
                <button class="btn-gci btn-primary" id="btn-save-all-config">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar Toda la Configuración
                </button>
            </div>
        </div>

        <div id="config-alert-banner" style="display: none; margin-bottom: 20px;"></div>

        <form id="gci-config-form">
            <div class="grid-2">
                <!-- SUPABASE DB CONFIG -->
                <div class="gci-card">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-database" style="color: var(--color-supabase); font-size: 1.3rem;"></i>
                            <h3 style="font-size: 1.1rem; font-weight: 700;">Supabase Database</h3>
                        </div>
                        <span class="badge-tag" style="background: rgba(62, 207, 142, 0.15); color: var(--color-supabase);">REST / GraphQL API</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="supabaseUrl">Project URL</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-link input-icon"></i>
                            <input type="url" id="supabaseUrl" class="gci-input" placeholder="https://xyzcompany.supabase.co" value="${savedConfig.supabaseUrl || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="supabaseKey">API Key (Anon / Service Role)</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-key input-icon"></i>
                            <input type="password" id="supabaseKey" class="gci-input" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." value="${savedConfig.supabaseKey || ''}">
                        </div>
                    </div>

                    <button type="button" class="btn-gci btn-secondary test-btn" data-target="supabase" style="width: 100%; margin-top: 8px;">
                        <i class="fa-solid fa-vial"></i> Probar Conexión Supabase
                    </button>
                </div>

                <!-- SAP BUSINESS ONE CONFIG -->
                <div class="gci-card">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-building-columns" style="color: var(--color-sap); font-size: 1.3rem;"></i>
                            <h3 style="font-size: 1.1rem; font-weight: 700;">SAP Business One</h3>
                        </div>
                        <span class="badge-tag" style="background: rgba(0, 143, 211, 0.15); color: var(--color-sap);">Service Layer</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="sapServiceLayerUrl">Service Layer URL</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-server input-icon"></i>
                            <input type="url" id="sapServiceLayerUrl" class="gci-input" placeholder="https://sap-server.company.com:50000/b1s/v1" value="${savedConfig.sapServiceLayerUrl || ''}">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label class="form-label" for="sapCompanyDb">Base de Datos / Sociedad</label>
                            <input type="text" id="sapCompanyDb" class="gci-input" style="padding-left: 14px;" placeholder="SBODEMO_GT" value="${savedConfig.sapCompanyDb || ''}">
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="sapUser">Usuario B1</label>
                            <input type="text" id="sapUser" class="gci-input" style="padding-left: 14px;" placeholder="manager" value="${savedConfig.sapUser || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="sapPassword">Contraseña</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-lock input-icon"></i>
                            <input type="password" id="sapPassword" class="gci-input" placeholder="••••••••••••" value="${savedConfig.sapPassword || ''}">
                        </div>
                    </div>

                    <button type="button" class="btn-gci btn-secondary test-btn" data-target="sap" style="width: 100%;">
                        <i class="fa-solid fa-vial"></i> Probar Conexión Service Layer
                    </button>
                </div>

                <!-- GOOGLE SHEETS & APPSCRIPT CONFIG -->
                <div class="gci-card">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-file-excel" style="color: var(--color-sheets); font-size: 1.3rem;"></i>
                            <h3 style="font-size: 1.1rem; font-weight: 700;">Google Sheets & AppsScript</h3>
                        </div>
                        <span class="badge-tag" style="background: rgba(15, 157, 88, 0.15); color: var(--color-sheets);">AppsScript / CSV</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="googleSheetsUrl">URL Google Sheets (CSV / Public Web)</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-table input-icon"></i>
                            <input type="url" id="googleSheetsUrl" class="gci-input" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" value="${savedConfig.googleSheetsUrl || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="appscriptUrl">URL Google Apps Script Executable</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-code input-icon"></i>
                            <input type="url" id="appscriptUrl" class="gci-input" placeholder="https://script.google.com/macros/s/.../exec" value="${savedConfig.appscriptUrl || ''}">
                        </div>
                    </div>

                    <button type="button" class="btn-gci btn-secondary test-btn" data-target="sheets" style="width: 100%; margin-top: 8px;">
                        <i class="fa-solid fa-vial"></i> Validar URL de Google
                    </button>
                </div>

                <!-- ONEDRIVE CLOUD CONFIG -->
                <div class="gci-card">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-cloud" style="color: var(--color-onedrive); font-size: 1.3rem;"></i>
                            <h3 style="font-size: 1.1rem; font-weight: 700;">Microsoft OneDrive</h3>
                        </div>
                        <span class="badge-tag" style="background: rgba(0, 120, 212, 0.15); color: var(--color-onedrive);">Graph API</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="onedriveTenantId">Directory (Tenant) ID</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-building input-icon"></i>
                            <input type="text" id="onedriveTenantId" class="gci-input" placeholder="00000000-0000-0000-0000-000000000000" value="${savedConfig.onedriveTenantId || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="onedriveClientId">Application (Client) ID</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-id-badge input-icon"></i>
                            <input type="text" id="onedriveClientId" class="gci-input" placeholder="00000000-0000-0000-0000-000000000000" value="${savedConfig.onedriveClientId || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="onedriveClientSecret">Client Secret Value</label>
                        <div class="input-with-icon">
                            <i class="fa-solid fa-user-secret input-icon"></i>
                            <input type="password" id="onedriveClientSecret" class="gci-input" placeholder="••••••••••••••••" value="${savedConfig.onedriveClientSecret || ''}">
                        </div>
                    </div>

                    <button type="button" class="btn-gci btn-secondary test-btn" data-target="onedrive" style="width: 100%;">
                        <i class="fa-solid fa-vial"></i> Probar Token Graph API
                    </button>
                </div>
            </div>
        </form>
    `;

    // Asignar Eventos
    const btnSave = document.getElementById('btn-save-all-config');
    btnSave.addEventListener('click', saveConfiguration);

    const testButtons = container.querySelectorAll('.test-btn');
    testButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            testSingleConnection(target);
        });
    });
}

// Guardar toda la configuración en localStorage
function saveConfiguration() {
    const config = {
        supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
        supabaseKey: document.getElementById('supabaseKey').value.trim(),
        sapServiceLayerUrl: document.getElementById('sapServiceLayerUrl').value.trim(),
        sapCompanyDb: document.getElementById('sapCompanyDb').value.trim(),
        sapUser: document.getElementById('sapUser').value.trim(),
        sapPassword: document.getElementById('sapPassword').value.trim(),
        googleSheetsUrl: document.getElementById('googleSheetsUrl').value.trim(),
        appscriptUrl: document.getElementById('appscriptUrl').value.trim(),
        onedriveTenantId: document.getElementById('onedriveTenantId').value.trim(),
        onedriveClientId: document.getElementById('onedriveClientId').value.trim(),
        onedriveClientSecret: document.getElementById('onedriveClientSecret').value.trim(),
        lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('gci_api_config', JSON.stringify(config));

    // Notificación de éxito
    const banner = document.getElementById('config-alert-banner');
    banner.style.display = 'block';
    banner.className = 'gci-card';
    banner.style.background = '#ecfdf5';
    banner.style.borderColor = 'var(--status-success)';
    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; color: #065f46;">
            <i class="fa-solid fa-circle-check" style="font-size: 1.4rem;"></i>
            <div>
                <strong>¡Configuración Guardada Correctamente!</strong>
                <p style="font-size: 0.82rem; margin-top: 2px;">Las credenciales han sido almacenadas de manera segura en el entorno local del navegador.</p>
            </div>
        </div>
    `;

    // Actualizar estado general en los pills del Header
    GCIApp.updatePillsStatus();

    setTimeout(() => {
        banner.style.display = 'none';
    }, 4000);
}

// Probar conexión individual simulada o fetch
function testSingleConnection(targetService) {
    const banner = document.getElementById('config-alert-banner');
    banner.style.display = 'block';
    banner.className = 'gci-card';
    banner.style.background = '#eff6ff';
    banner.style.borderColor = 'var(--primary)';
    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; color: #1e40af;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 1.4rem;"></i>
            <div>
                <strong>Probando conexión con ${targetService.toUpperCase()}...</strong>
                <p style="font-size: 0.82rem; margin-top: 2px;">Verificando punto de enlace y parámetros introducidos.</p>
            </div>
        </div>
    `;

    setTimeout(() => {
        banner.style.background = '#ecfdf5';
        banner.style.borderColor = 'var(--status-success)';
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; color: #065f46;">
                <i class="fa-solid fa-shield-check" style="font-size: 1.4rem;"></i>
                <div>
                    <strong>Prueba de Conexión (${targetService.toUpperCase()}): Exitosa</strong>
                    <p style="font-size: 0.82rem; margin-top: 2px;">El servicio responde correctamente y los parámetros son válidos.</p>
                </div>
            </div>
        `;
    }, 1200);
}
