/**
 * GCI ADMIN - Módulo Dashboard Principal
 */

export function renderDashboardModule(container) {
    const configData = JSON.parse(localStorage.getItem('gci_api_config') || '{}');
    const localFiles = JSON.parse(localStorage.getItem('gci_uploaded_files') || '[]');

    // Conteo de APIs activas
    let activeApisCount = 0;
    if (configData.supabaseUrl) activeApisCount++;
    if (configData.sapServiceLayerUrl) activeApisCount++;
    if (configData.googleSheetsUrl) activeApisCount++;
    if (configData.onedriveClientId) activeApisCount++;

    container.innerHTML = `
        <!-- Header del Módulo -->
        <div class="module-header-block">
            <div>
                <h1 class="module-title"><i class="fa-solid fa-chart-pie" style="color: var(--primary);"></i> Dashboard de Control Central</h1>
                <p class="module-subtitle">Visión general del estado del sistema, integraciones activas y métricas operativas.</p>
            </div>
            <div>
                <a href="#api-config" class="btn-gci btn-primary"><i class="fa-solid fa-plus"></i> Nueva Conexión</a>
            </div>
        </div>

        <!-- Tarjetas KPI -->
        <div class="grid-4">
            <div class="gci-card kpi-card">
                <div class="kpi-info-content">
                    <span class="kpi-label">Integraciones Activas</span>
                    <span class="kpi-value">${activeApisCount} / 5</span>
                    <span class="kpi-trend positive"><i class="fa-solid fa-circle-check"></i> Supabase, SAP, Sheets...</span>
                </div>
                <div class="kpi-icon-box blue">
                    <i class="fa-solid fa-plug-circle-check"></i>
                </div>
            </div>

            <div class="gci-card kpi-card">
                <div class="kpi-info-content">
                    <span class="kpi-label">Archivos Locales</span>
                    <span class="kpi-value">${localFiles.length}</span>
                    <span class="kpi-trend neutral"><i class="fa-solid fa-hard-drive"></i> En almacenamiento local</span>
                </div>
                <div class="kpi-icon-box emerald">
                    <i class="fa-solid fa-folder-open"></i>
                </div>
            </div>

            <div class="gci-card kpi-card">
                <div class="kpi-info-content">
                    <span class="kpi-label">Peticiones API (24h)</span>
                    <span class="kpi-value">1,482</span>
                    <span class="kpi-trend positive"><i class="fa-solid fa-arrow-trend-up"></i> +12.4% este día</span>
                </div>
                <div class="kpi-icon-box purple">
                    <i class="fa-solid fa-network-wired"></i>
                </div>
            </div>

            <div class="gci-card kpi-card">
                <div class="kpi-info-content">
                    <span class="kpi-label">Estado de Servidor</span>
                    <span class="kpi-value" style="color: var(--accent-emerald);">99.9%</span>
                    <span class="kpi-trend positive"><i class="fa-solid fa-shield-halved"></i> Latencia ~ 42ms</span>
                </div>
                <div class="kpi-icon-box amber">
                    <i class="fa-solid fa-server"></i>
                </div>
            </div>
        </div>

        <!-- Sección Principal de Gráficos y Estado -->
        <div class="grid-2">
            <!-- Estado de Conexiones de la Plataforma -->
            <div class="gci-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="font-size: 1.1rem; font-weight: 700;"><i class="fa-solid fa-signal" style="color: var(--accent-cyan); margin-right: 8px;"></i> Estado de Módulos de Integración</h3>
                    <span style="font-size: 0.75rem; color: var(--text-muted); background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">En Tiempo Real</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <!-- Supabase -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border-light);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; background: rgba(62, 207, 142, 0.15); color: var(--color-supabase); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                                <i class="fa-solid fa-database"></i>
                            </div>
                            <div>
                                <h4 style="font-size: 0.9rem; font-weight: 700;">Supabase API</h4>
                                <p style="font-size: 0.75rem; color: var(--text-secondary);">${configData.supabaseUrl ? 'URL Configurada' : 'Sin configurar'}</p>
                            </div>
                        </div>
                        <span class="status-pill" style="border: none; background: ${configData.supabaseUrl ? '#ecfdf5' : '#f1f5f9'}; color: ${configData.supabaseUrl ? 'var(--status-success)' : 'var(--text-muted)'}; font-weight: 700;">
                            <i class="fa-solid fa-circle pill-dot ${configData.supabaseUrl ? 'dot-active' : 'dot-inactive'}"></i>
                            ${configData.supabaseUrl ? 'Conectado' : 'Pendiente'}
                        </span>
                    </div>

                    <!-- SAP B1 -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border-light);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; background: rgba(0, 143, 211, 0.15); color: var(--color-sap); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                                <i class="fa-solid fa-building-columns"></i>
                            </div>
                            <div>
                                <h4 style="font-size: 0.9rem; font-weight: 700;">SAP Business One</h4>
                                <p style="font-size: 0.75rem; color: var(--text-secondary);">${configData.sapCompanyDb ? 'Sociedad: ' + configData.sapCompanyDb : 'Sin configurar'}</p>
                            </div>
                        </div>
                        <span class="status-pill" style="border: none; background: ${configData.sapServiceLayerUrl ? '#ecfdf5' : '#f1f5f9'}; color: ${configData.sapServiceLayerUrl ? 'var(--status-success)' : 'var(--text-muted)'}; font-weight: 700;">
                            <i class="fa-solid fa-circle pill-dot ${configData.sapServiceLayerUrl ? 'dot-active' : 'dot-inactive'}"></i>
                            ${configData.sapServiceLayerUrl ? 'Conectado' : 'Pendiente'}
                        </span>
                    </div>

                    <!-- Google Sheets / AppScript -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border-light);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; background: rgba(15, 157, 88, 0.15); color: var(--color-sheets); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                                <i class="fa-solid fa-file-excel"></i>
                            </div>
                            <div>
                                <h4 style="font-size: 0.9rem; font-weight: 700;">Google Sheets & AppScript</h4>
                                <p style="font-size: 0.75rem; color: var(--text-secondary);">${configData.googleSheetsUrl ? 'Sheet URL Registrada' : 'Sin configurar'}</p>
                            </div>
                        </div>
                        <span class="status-pill" style="border: none; background: ${configData.googleSheetsUrl ? '#ecfdf5' : '#f1f5f9'}; color: ${configData.googleSheetsUrl ? 'var(--status-success)' : 'var(--text-muted)'}; font-weight: 700;">
                            <i class="fa-solid fa-circle pill-dot ${configData.googleSheetsUrl ? 'dot-active' : 'dot-inactive'}"></i>
                            ${configData.googleSheetsUrl ? 'Conectado' : 'Pendiente'}
                        </span>
                    </div>

                    <!-- OneDrive -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border-light);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; background: rgba(0, 120, 212, 0.15); color: var(--color-onedrive); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                                <i class="fa-solid fa-cloud"></i>
                            </div>
                            <div>
                                <h4 style="font-size: 0.9rem; font-weight: 700;">OneDrive Cloud Storage</h4>
                                <p style="font-size: 0.75rem; color: var(--text-secondary);">${configData.onedriveClientId ? 'Client ID Registrado' : 'Sin configurar'}</p>
                            </div>
                        </div>
                        <span class="status-pill" style="border: none; background: ${configData.onedriveClientId ? '#ecfdf5' : '#f1f5f9'}; color: ${configData.onedriveClientId ? 'var(--status-success)' : 'var(--text-muted)'}; font-weight: 700;">
                            <i class="fa-solid fa-circle pill-dot ${configData.onedriveClientId ? 'dot-active' : 'dot-inactive'}"></i>
                            ${configData.onedriveClientId ? 'Conectado' : 'Pendiente'}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Bitácora de Actividad Reciente -->
            <div class="gci-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="font-size: 1.1rem; font-weight: 700;"><i class="fa-solid fa-list-check" style="color: var(--primary); margin-right: 8px;"></i> Bitácora de Actividad</h3>
                    <button class="btn-gci btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" id="btn-refresh-log">
                        <i class="fa-solid fa-arrows-rotate"></i> Actualizar
                    </button>
                </div>

                <div class="gci-table-wrapper">
                    <table class="gci-table">
                        <thead>
                            <tr>
                                <th>Evento</th>
                                <th>Origen</th>
                                <th>Fecha / Hora</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Inicio de Sesión Admin</strong></td>
                                <td>GCI Core UI</td>
                                <td style="color: var(--text-muted); font-size: 0.8rem;">Hoy, 10:42 AM</td>
                                <td><span style="color: var(--status-success); font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Exitoso</span></td>
                            </tr>
                            <tr>
                                <td><strong>Verificación de Entorno</strong></td>
                                <td>Sistema Central</td>
                                <td style="color: var(--text-muted); font-size: 0.8rem;">Hoy, 10:40 AM</td>
                                <td><span style="color: var(--status-success); font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Completado</span></td>
                            </tr>
                            <tr>
                                <td><strong>Carga de Módulo API Config</strong></td>
                                <td>Navegador Local</td>
                                <td style="color: var(--text-muted); font-size: 0.8rem;">Hoy, 09:15 AM</td>
                                <td><span style="color: var(--primary); font-weight: 600;"><i class="fa-solid fa-info-circle"></i> Info</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Event Listeners del Dashboard
    const btnRefresh = document.getElementById('btn-refresh-log');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            renderDashboardModule(container);
        });
    }
}
