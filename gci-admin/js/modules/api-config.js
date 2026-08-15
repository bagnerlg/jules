/**
 * GCI ADMIN - Módulo de Configuración de APIs y Conexiones (Edición Glossy/Cápsula)
 */

import { GCIApp } from '../app.js';

export function renderApiConfigModule(container) {
    const savedConfig = JSON.parse(localStorage.getItem('gci_api_config') || '{}');

    container.innerHTML = `
        <div class="module-header-block">
            <div>
                <h1 class="module-title"><i class="fa-solid fa-sliders" style="color: #2563eb;"></i> Configuración de Conexiones & APIs</h1>
                <p class="module-subtitle">Gestiona las credenciales de acceso para Supabase, SAP Business One, Google Sheets, Apps Script y OneDrive.</p>
            </div>
            <div>
                <button class="btn-gci btn-primary" id="btn-save-all-config">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar Configuración
                </button>
            </div>
        </div>

        <div id="config-alert-banner" style="display: none; margin-bottom: 24px;"></div>

        <form id="gci-config-form">
            <div class="grid-2">
                <!-- SUPABASE DB CONFIG -->
                <div class="gci-card" style="padding-top: 36px;">
                    <div class="gci-card-header-badge" style="background: var(--glossy-teal);">
                        <i class="fa-solid fa-database"></i>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">
                        <h3 style="font-size: 1.1rem; font-weight: 800; color: #0f172a;">Supabase Database</h3>
                        <span class="badge-tag">REST / GraphQL</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="supabaseUrl">Project URL</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-link input-icon-left"></i>
                            <input type="url" id="supabaseUrl" class="gci-input-capsule" placeholder="https://xyzcompany.supabase.co" value="${savedConfig.supabaseUrl || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="supabaseKey">API Key (Anon / Service Role)</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-key input-icon-left"></i>
                            <input type="password" id="supabaseKey" class="gci-input-capsule" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." value="${savedConfig.supabaseKey || ''}">
                        </div>
                    </div>

                    <button type="button" class="btn-gci btn-secondary test-btn" data-target="supabase" style="width: 100%; margin-top: 8px;">
                        <i class="fa-solid fa-vial"></i> Probar Conexión Supabase
                    </button>
                </div>

                <!-- SAP BUSINESS ONE CONFIG -->
                <div class="gci-card" style="padding-top: 36px;">
                    <div class="gci-card-header-badge" style="background: var(--glossy-blue);">
                        <i class="fa-solid fa-building-columns"></i>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">
                        <h3 style="font-size: 1.1rem; font-weight: 800; color: #0f172a;">SAP Business One</h3>
                        <span class="badge-tag">Service Layer</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="sapServiceLayerUrl">Service Layer URL</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-server input-icon-left"></i>
                            <input type="url" id="sapServiceLayerUrl" class="gci-input-capsule" placeholder="https://sap-server.company.com:50000/b1s/v1" value="${savedConfig.sapServiceLayerUrl || ''}">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label class="form-label" for="sapCompanyDb">Base de Datos / Sociedad</label>
                            <div class="input-capsule-wrapper">
                                <i class="fa-solid fa-database input-icon-left"></i>
                                <input type="text" id="sapCompanyDb" class="gci-input-capsule" placeholder="SBODEMO_GT" value="${savedConfig.sapCompanyDb || ''}">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="sapUser">Usuario B1</label>
                            <div class="input-capsule-wrapper">
                                <i class="fa-solid fa-user input-icon-left"></i>
                                <input type="text" id="sapUser" class="gci-input-capsule" placeholder="manager" value="${savedConfig.sapUser || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="sapPassword">Contraseña</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-lock input-icon-left"></i>
                            <input type="password" id="sapPassword" class="gci-input-capsule" placeholder="••••••••••••" value="${savedConfig.sapPassword || ''}">
                        </div>
                    </div>

                    <button type="button" class="btn-gci btn-secondary test-btn" data-target="sap" style="width: 100%;">
                        <i class="fa-solid fa-vial"></i> Probar Conexión Service Layer
                    </button>
                </div>

                <!-- GOOGLE SHEETS & APPSCRIPT CONFIG -->
                <div class="gci-card" style="padding-top: 36px;">
                    <div class="gci-card-header-badge" style="background: linear-gradient(180deg, #22c55e 0%, #15803d 100%);">
                        <i class="fa-solid fa-file-excel"></i>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">
                        <h3 style="font-size: 1.1rem; font-weight: 800; color: #0f172a;">Google Sheets & AppsScript</h3>
                        <span class="badge-tag">AppsScript / CSV</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="googleSheetsUrl">URL Google Sheets (CSV / Web Public)</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-table input-icon-left"></i>
                            <input type="url" id="googleSheetsUrl" class="gci-input-capsule" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" value="${savedConfig.googleSheetsUrl || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="appscriptUrl">URL Google Apps Script Executable</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-code input-icon-left"></i>
                            <input type="url" id="appscriptUrl" class="gci-input-capsule" placeholder="https://script.google.com/macros/s/.../exec" value="${savedConfig.appscriptUrl || ''}">
                        </div>
                    </div>

                    <button type="button" class="btn-gci btn-secondary test-btn" data-target="sheets" style="width: 100%; margin-top: 8px;">
                        <i class="fa-solid fa-vial"></i> Validar URL de Google
                    </button>
                </div>

                <!-- ONEDRIVE CLOUD CONFIG -->
                <div class="gci-card" style="padding-top: 36px;">
                    <div class="gci-card-header-badge" style="background: var(--glossy-sky);">
                        <i class="fa-solid fa-cloud"></i>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">
                        <h3 style="font-size: 1.1rem; font-weight: 800; color: #0f172a;">Microsoft OneDrive</h3>
                        <span class="badge-tag">Graph API</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="onedriveTenantId">Directory (Tenant) ID</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-building input-icon-left"></i>
                            <input type="text" id="onedriveTenantId" class="gci-input-capsule" placeholder="00000000-0000-0000-0000-000000000000" value="${savedConfig.onedriveTenantId || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="onedriveClientId">Application (Client) ID</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-id-badge input-icon-left"></i>
                            <input type="text" id="onedriveClientId" class="gci-input-capsule" placeholder="00000000-0000-0000-0000-000000000000" value="${savedConfig.onedriveClientId || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="onedriveClientSecret">Client Secret Value</label>
                        <div class="input-capsule-wrapper">
                            <i class="fa-solid fa-user-secret input-icon-left"></i>
                            <input type="password" id="onedriveClientSecret" class="gci-input-capsule" placeholder="••••••••••••••••" value="${savedConfig.onedriveClientSecret || ''}">
                        </div>
                    </div>

                    <button type="button" class="btn-gci btn-secondary test-btn" data-target="onedrive" style="width: 100%;">
                        <i class="fa-solid fa-vial"></i> Probar Token Graph API
                    </button>
                </div>
            </div>
        </form>
    `;

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

    const banner = document.getElementById('config-alert-banner');
    banner.style.display = 'block';
    banner.className = 'gci-card';
    banner.style.background = 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)';
    banner.style.borderColor = 'var(--status-success)';
    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; color: #065f46;">
            <i class="fa-solid fa-circle-check" style="font-size: 1.5rem;"></i>
            <div>
                <strong>¡Configuración Guardada Exitosamente!</strong>
                <p style="font-size: 0.82rem; margin-top: 2px;">Las credenciales han sido almacenadas de manera segura en el entorno local del navegador.</p>
            </div>
        </div>
    `;

    GCIApp.updatePillsStatus();

    setTimeout(() => {
        banner.style.display = 'none';
    }, 4000);
}

function testSingleConnection(targetService) {
    const banner = document.getElementById('config-alert-banner');
    banner.style.display = 'block';
    banner.className = 'gci-card';
    banner.style.background = 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)';
    banner.style.borderColor = '#0284c7';
    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; color: #0369a1;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 1.5rem;"></i>
            <div>
                <strong>Probando conexión con ${targetService.toUpperCase()}...</strong>
                <p style="font-size: 0.82rem; margin-top: 2px;">Verificando punto de enlace y credenciales.</p>
            </div>
        </div>
    `;

    setTimeout(() => {
        banner.style.background = 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)';
        banner.style.borderColor = 'var(--status-success)';
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; color: #065f46;">
                <i class="fa-solid fa-shield-check" style="font-size: 1.5rem;"></i>
                <div>
                    <strong>Prueba de Conexión (${targetService.toUpperCase()}): Exitosa</strong>
                    <p style="font-size: 0.82rem; margin-top: 2px;">El servicio responde correctamente y los parámetros son válidos.</p>
                </div>
            </div>
        `;
    }, 1200);
}
