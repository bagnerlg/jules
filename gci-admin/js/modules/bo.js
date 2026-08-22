/**
 * GCI ADMIN - Módulo BO (Back Office / Órdenes de Venta)
 * Conexión a Google Sheets (Apps Script API) con sincronización automática cada 5 minutos
 * Cruzamiento de información comercial y crediticia de clientes.
 */

export const APPS_SCRIPT_BO_URL = "https://script.google.com/macros/s/AKfycbwQPiGNy1jQ-dmq-xz1_ZcPxtQJdTqyVptIXnPKzwi53j5SZ30N3gwdkZsGm7raVXF4/exec";

export const MOCK_BO_ORDERS = [
    {
        pedidoId: "PED-2026-0801",
        clienteId: "CLI-7655982",
        clienteNombre: "DON LEON - EMPRESAS ASLAN, S.A.",
        fechaPedido: "2026-08-16",
        antiguedadDias: 1,
        montoTotal: 18500.00,
        tipoCobro: "Crédito",
        diasMora: 12,
        montoMora: 4500.00,
        creditoActivo: 50000.00,
        frecuenciaCompraScore: 9,
        frecuenciaPagoScore: 8,
        departamento: "Suchitepéquez",
        municipio: "Mazatenango",
        estadoPEPS: "Pendiente"
    },
    {
        pedidoId: "PED-2026-0802",
        clienteId: "CLI-6576974",
        clienteNombre: "ELEKTRA DE GUATEMALA",
        fechaPedido: "2026-08-15",
        antiguedadDias: 2,
        montoTotal: 42000.00,
        tipoCobro: "Crédito",
        diasMora: 45,
        montoMora: 60000.00, // Mora > Crédito Activo (50,000) -> Se filtrará/ocultará en PEPS
        creditoActivo: 50000.00,
        frecuenciaCompraScore: 10,
        frecuenciaPagoScore: 4,
        departamento: "Suchitepéquez",
        municipio: "Mazatenango",
        estadoPEPS: "Pendiente"
    },
    {
        pedidoId: "PED-2026-0803",
        clienteId: "CLI-60895616",
        clienteNombre: "JIMMY JHONATÁN ESTRADA",
        fechaPedido: "2026-08-14",
        antiguedadDias: 3,
        montoTotal: 8900.00,
        tipoCobro: "Contado",
        diasMora: 0,
        montoMora: 0.00,
        creditoActivo: 15000.00,
        frecuenciaCompraScore: 7,
        frecuenciaPagoScore: 9,
        departamento: "Chiquimula",
        municipio: "Chiquimula",
        estadoPEPS: "Pendiente"
    },
    {
        pedidoId: "PED-2026-0804",
        clienteId: "CLI-74853627",
        clienteNombre: "JORGE VICTOR, GASPAR LÓPEZ",
        fechaPedido: "2026-08-13",
        antiguedadDias: 4,
        montoTotal: 25400.00,
        tipoCobro: "Crédito",
        diasMora: 5,
        montoMora: 1200.00,
        creditoActivo: 35000.00,
        frecuenciaCompraScore: 8,
        frecuenciaPagoScore: 9,
        departamento: "Quetzaltenango",
        municipio: "Quetzaltenango",
        estadoPEPS: "Pendiente"
    },
    {
        pedidoId: "PED-2026-0805",
        clienteId: "CLI-33550328",
        clienteNombre: "JUAN GABRIEL ACEITUNO BARRIENTOS",
        fechaPedido: "2026-08-12",
        antiguedadDias: 5,
        montoTotal: 12300.00,
        tipoCobro: "Contado",
        diasMora: 0,
        montoMora: 0.00,
        creditoActivo: 20000.00,
        frecuenciaCompraScore: 6,
        frecuenciaPagoScore: 10,
        departamento: "Guatemala",
        municipio: "Villa Nueva",
        estadoPEPS: "Pendiente"
    }
];

export class BOModule {
    constructor() {
        this.orders = this.loadOrdersFromStorage();
        this.syncInterval = null;
        this.lastSyncTime = localStorage.getItem("gci_bo_last_sync") || "Nunca";
        this.isSyncing = false;
        this.autoSyncTimer = null;
    }

    loadOrdersFromStorage() {
        try {
            const stored = localStorage.getItem("gci_bo_orders");
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn("Error leyendo gci_bo_orders de localStorage", e);
        }
        localStorage.setItem("gci_bo_orders", JSON.stringify(MOCK_BO_ORDERS));
        return MOCK_BO_ORDERS;
    }

    saveOrdersToStorage() {
        try {
            localStorage.setItem("gci_bo_orders", JSON.stringify(this.orders));
            this.lastSyncTime = new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            localStorage.setItem("gci_bo_last_sync", this.lastSyncTime);
        } catch (e) {
            console.error("Error guardando gci_bo_orders en localStorage", e);
        }
    }

    async fetchOrdersFromSheets() {
        this.isSyncing = true;
        this.updateSyncBadgeUI(true);

        try {
            const res = await fetch(APPS_SCRIPT_BO_URL, { redirect: 'follow' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    // Mapear campos si vienen en formato sheets
                    this.orders = data.map((item, idx) => ({
                        pedidoId: item.pedidoId || item.NoPedido || `PED-2026-${String(idx + 1).padStart(4, '0')}`,
                        clienteId: item.clienteId || item.CodigoCliente || `CLI-${Math.floor(100000 + Math.random() * 900000)}`,
                        clienteNombre: item.clienteNombre || item.Cliente || "Cliente General",
                        fechaPedido: item.fechaPedido || item.Fecha || new Date().toISOString().split('T')[0],
                        antiguedadDias: parseInt(item.antiguedadDias || item.Antiguedad || "1", 10),
                        montoTotal: parseFloat(item.montoTotal || item.Total || "0"),
                        tipoCobro: item.tipoCobro || item.TipoCobro || "Crédito",
                        diasMora: parseInt(item.diasMora || item.DiasMora || "0", 10),
                        montoMora: parseFloat(item.montoMora || item.MontoMora || "0"),
                        creditoActivo: parseFloat(item.creditoActivo || item.CreditoActivo || "30000"),
                        frecuenciaCompraScore: parseInt(item.frecuenciaCompraScore || "8", 10),
                        frecuenciaPagoScore: parseInt(item.frecuenciaPagoScore || "8", 10),
                        departamento: item.departamento || "Guatemala",
                        municipio: item.municipio || "Guatemala",
                        estadoPEPS: item.estadoPEPS || "Pendiente"
                    }));
                }
            }
        } catch (err) {
            console.warn("Fetch a Apps Script Google Sheets falló o fue bloqueado por CORS. Conservando datos locales/MOCK.", err);
        } finally {
            this.isSyncing = false;
            this.saveOrdersToStorage();
            this.updateSyncBadgeUI(false);
            this.renderOrdersTable();
        }
    }

    startAutoSync() {
        if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
        // Sincronización automática cada 5 minutos (300,000 ms)
        this.autoSyncTimer = setInterval(() => {
            console.log("[BO Module] Ejecutando sincronización automática de 5 minutos con Google Sheets...");
            this.fetchOrdersFromSheets();
        }, 300000);
    }

    render() {
        return `
            <div class="module-container bo-module">
                <!-- Header del Módulo BO -->
                <div class="card header-actions-card mb-4">
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="floating-badge-icon" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff;">
                                <i class="fa-solid fa-table-list" style="font-size: 1.4rem;"></i>
                            </div>
                            <div>
                                <h2 class="m-0 fw-bold title-gradient">Back Office (BO) - Órdenes de Venta</h2>
                                <p class="text-muted m-0 small">Sincronización en tiempo real con Google Sheets (Cada 5 minutos) y Hoja Maestra de Clientes</p>
                            </div>
                        </div>

                        <div class="d-flex align-items-center gap-3">
                            <div class="text-end extra-small font-mono">
                                <span class="text-muted d-block">Sincronización de 5 min:</span>
                                <span class="fw-bold text-success" id="bo-sync-time-badge"><i class="fa-solid fa-arrows-rotate me-1"></i> ${this.lastSyncTime}</span>
                            </div>
                            <button id="btn-sync-bo-sheets" class="btn btn-capsule btn-primary-gradient">
                                <i class="fa-solid fa-rotate me-1"></i> Sincronizar Sheets Ahora
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Resumen Estadístico de Órdenes BO -->
                <div class="row g-3 mb-4">
                    <div class="col-md-3">
                        <div class="card p-3 border-0 shadow-sm rounded-3 bg-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="text-muted extra-small fw-bold uppercase">Total Órdenes BO</span>
                                    <h3 class="m-0 fw-bold text-primary" id="stat-bo-total-count">${this.orders.length}</h3>
                                </div>
                                <div class="p-3 bg-primary-subtle text-primary rounded-circle">
                                    <i class="fa-solid fa-cart-shopping fs-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card p-3 border-0 shadow-sm rounded-3 bg-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="text-muted extra-small fw-bold uppercase">Monto Total BO</span>
                                    <h3 class="m-0 fw-bold text-success font-mono" id="stat-bo-monto-total">
                                        Q${this.orders.reduce((sum, o) => sum + o.montoTotal, 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                    </h3>
                                </div>
                                <div class="p-3 bg-success-subtle text-success rounded-circle">
                                    <i class="fa-solid fa-money-bill-wave fs-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card p-3 border-0 shadow-sm rounded-3 bg-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="text-muted extra-small fw-bold uppercase">Órdenes Contado</span>
                                    <h3 class="m-0 fw-bold text-info" id="stat-bo-contado-count">
                                        ${this.orders.filter(o => o.tipoCobro === 'Contado').length}
                                    </h3>
                                </div>
                                <div class="p-3 bg-info-subtle text-info rounded-circle">
                                    <i class="fa-solid fa-hand-holding-dollar fs-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card p-3 border-0 shadow-sm rounded-3 bg-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="text-muted extra-small fw-bold uppercase">Órdenes Crédito</span>
                                    <h3 class="m-0 fw-bold text-warning" id="stat-bo-credito-count">
                                        ${this.orders.filter(o => o.tipoCobro === 'Crédito').length}
                                    </h3>
                                </div>
                                <div class="p-3 bg-warning-subtle text-warning rounded-circle">
                                    <i class="fa-solid fa-credit-card fs-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabla Principal de Órdenes de Venta BO -->
                <div class="card p-3 shadow-sm border-0">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="m-0 fw-bold text-dark"><i class="fa-solid fa-list-check me-2 text-primary"></i> Listado de Ventas Sincronizadas (Google Sheets)</h5>
                        <input type="text" id="bo-search-input" class="form-control form-control-sm font-mono extra-small" style="max-width: 250px;" placeholder="Buscar pedido, cliente, NIT...">
                    </div>

                    <div class="table-responsive">
                        <table class="table table-hover align-middle extra-small">
                            <thead class="table-light">
                                <tr>
                                    <th>No. Pedido</th>
                                    <th>Cliente</th>
                                    <th>Fecha / Antigüedad</th>
                                    <th>Monto Total</th>
                                    <th>Tipo Cobro</th>
                                    <th>Mora Registrada</th>
                                    <th>Crédito Activo</th>
                                    <th>Score Frec. Compra/Pago</th>
                                    <th>Estado PEPS</th>
                                </tr>
                            </thead>
                            <tbody id="bo-orders-table-body">
                                ${this.renderTableRows()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderTableRows() {
        if (!this.orders || this.orders.length === 0) {
            return `<tr><td colspan="9" class="text-center text-muted p-4">No hay órdenes sincronizadas desde Google Sheets.</td></tr>`;
        }

        return this.orders.map(o => `
            <tr>
                <td class="fw-bold font-mono text-primary">${o.pedidoId}</td>
                <td>
                    <div class="fw-bold text-dark">${o.clienteNombre}</div>
                    <span class="text-muted font-mono extra-small">${o.clienteId} (${o.municipio}, ${o.departamento})</span>
                </td>
                <td class="font-mono">
                    ${o.fechaPedido}
                    <span class="badge bg-secondary ms-1">${o.antiguedadDias} d</span>
                </td>
                <td class="fw-bold font-mono text-dark">Q${o.montoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                <td>
                    <span class="badge ${o.tipoCobro === 'Contado' ? 'bg-success' : 'bg-primary'}">${o.tipoCobro}</span>
                </td>
                <td class="font-mono">
                    ${o.diasMora > 0 ? `
                        <span class="text-danger fw-bold">Q${o.montoMora.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${o.diasMora}d)</span>
                    ` : '<span class="text-success"><i class="fa-solid fa-check me-1"></i> Al día</span>'}
                </td>
                <td class="font-mono text-dark">Q${o.creditoActivo.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                <td>
                    <span class="badge bg-info-subtle text-info me-1">C: ${o.frecuenciaCompraScore}/10</span>
                    <span class="badge bg-primary-subtle text-primary">P: ${o.frecuenciaPagoScore}/10</span>
                </td>
                <td>
                    <span class="badge ${o.estadoPEPS === 'Aprobado' ? 'bg-success' : (o.estadoPEPS === 'Rechazado' ? 'bg-danger' : 'bg-warning text-dark')} font-mono">
                        ${o.estadoPEPS || 'Pendiente'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    renderOrdersTable() {
        const body = document.getElementById('bo-orders-table-body');
        if (body) {
            body.innerHTML = this.renderTableRows();
        }

        const countElem = document.getElementById('stat-bo-total-count');
        if (countElem) countElem.textContent = this.orders.length;

        const montoElem = document.getElementById('stat-bo-monto-total');
        if (montoElem) {
            montoElem.textContent = `Q${this.orders.reduce((sum, o) => sum + o.montoTotal, 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
        }
    }

    updateSyncBadgeUI(isSyncing) {
        const badge = document.getElementById('bo-sync-time-badge');
        if (badge) {
            if (isSyncing) {
                badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i> Sincronizando...`;
                badge.className = "fw-bold text-primary";
            } else {
                badge.innerHTML = `<i class="fa-solid fa-arrows-rotate me-1"></i> ${this.lastSyncTime}`;
                badge.className = "fw-bold text-success";
            }
        }
    }

    initEvents() {
        const btnSync = document.getElementById('btn-sync-bo-sheets');
        if (btnSync) {
            btnSync.addEventListener('click', () => {
                this.fetchOrdersFromSheets();
            });
        }

        const searchInput = document.getElementById('bo-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                const filtered = this.orders.filter(o =>
                    o.pedidoId.toLowerCase().includes(term) ||
                    o.clienteNombre.toLowerCase().includes(term) ||
                    o.clienteId.toLowerCase().includes(term)
                );
                const body = document.getElementById('bo-orders-table-body');
                if (body) {
                    if (filtered.length === 0) {
                        body.innerHTML = `<tr><td colspan="9" class="text-center text-muted p-4">No se encontraron órdenes que coincidan con "${term}".</td></tr>`;
                    } else {
                        body.innerHTML = filtered.map(o => `
                            <tr>
                                <td class="fw-bold font-mono text-primary">${o.pedidoId}</td>
                                <td>
                                    <div class="fw-bold text-dark">${o.clienteNombre}</div>
                                    <span class="text-muted font-mono extra-small">${o.clienteId} (${o.municipio}, ${o.departamento})</span>
                                </td>
                                <td class="font-mono">${o.fechaPedido} <span class="badge bg-secondary ms-1">${o.antiguedadDias} d</span></td>
                                <td class="fw-bold font-mono text-dark">Q${o.montoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                                <td><span class="badge ${o.tipoCobro === 'Contado' ? 'bg-success' : 'bg-primary'}">${o.tipoCobro}</span></td>
                                <td class="font-mono">${o.diasMora > 0 ? `<span class="text-danger fw-bold">Q${o.montoMora.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${o.diasMora}d)</span>` : '<span class="text-success"><i class="fa-solid fa-check me-1"></i> Al día</span>'}</td>
                                <td class="font-mono text-dark">Q${o.creditoActivo.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                                <td><span class="badge bg-info-subtle text-info me-1">C: ${o.frecuenciaCompraScore}/10</span> <span class="badge bg-primary-subtle text-primary">P: ${o.frecuenciaPagoScore}/10</span></td>
                                <td><span class="badge ${o.estadoPEPS === 'Aprobado' ? 'bg-success' : (o.estadoPEPS === 'Rechazado' ? 'bg-danger' : 'bg-warning text-dark')} font-mono">${o.estadoPEPS || 'Pendiente'}</span></td>
                            </tr>
                        `).join('');
                    }
                }
            });
        }

        this.startAutoSync();
    }
}
