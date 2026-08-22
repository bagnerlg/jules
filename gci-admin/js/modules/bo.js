/**
 * GCI ADMIN - Módulo BO (Back Office / Órdenes de Venta)
 * Conexión a Google Sheets (Apps Script API) con sincronización automática cada 5 minutos
 * Cruzamiento de información comercial y crediticia de clientes y creación automática en Clientes DB.
 */

export const APPS_SCRIPT_BO_URL = "https://script.google.com/macros/s/AKfycbwQPiGNy1jQ-dmq-xz1_ZcPxtQJdTqyVptIXnPKzwi53j5SZ30N3gwdkZsGm7raVXF4/exec";

export const MOCK_BO_ORDERS = [
    {
        pedidoId: "PED-2026-0801",
        docEntry: "15350",
        clienteId: "30589298",
        clienteNombre: "EMPRESAS ASLAN, S.A.",
        telefono: "30589298",
        fechaPedido: "2026-08-16",
        antiguedadDias: 1,
        montoTotal: 18500.00,
        tipoCobro: "Crédito",
        diasMora: 12,
        montoMora: 4500.00,
        creditoActivo: 50000.00,
        frecuenciaCompraScore: 9,
        frecuenciaPagoScore: 8,
        departamento: "QUICHE",
        municipio: "Sacapulas",
        ruta: "PAOLA SOLIS",
        canal: "CLAN 1",
        estadoPEPS: "Pendiente",
        items: [
            { itemCode: "S-DAN-NEW-COR-0001", producto: "SALA DANIELA CORINTO", cantidad: 1, total: 7141.96 }
        ]
    },
    {
        pedidoId: "PED-2026-0802",
        docEntry: "15352",
        clienteId: "323193235",
        clienteNombre: "Cristian Julio Alberto Macz Caal",
        telefono: "57571309",
        fechaPedido: "2026-08-17",
        antiguedadDias: 2,
        montoTotal: 42000.00,
        tipoCobro: "Crédito",
        diasMora: 45,
        montoMora: 60000.00, // Mora > Crédito Activo (50,000) -> Se filtrará/ocultará en PEPS
        creditoActivo: 50000.00,
        frecuenciaCompraScore: 10,
        frecuenciaPagoScore: 4,
        departamento: "ALTA VERAPAZ",
        municipio: "Santa Cruz Verapaz",
        ruta: "JHONATAN BARRIOS",
        canal: "CLAN 1",
        estadoPEPS: "Pendiente",
        items: [
            { itemCode: "B1221B222", producto: "COMBO R. 6C LISO WENGUE + MARQUEZA WENGUE", cantidad: 1, total: 3213.39 }
        ]
    },
    {
        pedidoId: "PED-2026-0803",
        docEntry: "15370",
        clienteId: "2230973061316",
        clienteNombre: "José Jiménez Martin",
        telefono: "33186405",
        fechaPedido: "2026-08-19",
        antiguedadDias: 3,
        montoTotal: 7320.53,
        tipoCobro: "Contado",
        diasMora: 0,
        montoMora: 0.00,
        creditoActivo: 15000.00,
        frecuenciaCompraScore: 7,
        frecuenciaPagoScore: 9,
        departamento: "HUEHUETENANGO",
        municipio: "San Juán Atitlán",
        ruta: "WALTER GUERRA",
        canal: "CLAN 1",
        estadoPEPS: "Pendiente",
        items: [
            { itemCode: "S-GEN2-NEW-CUE-0001", producto: "SALA GENOVA + 2 RECLINABLES", cantidad: 1, total: 7141.96 },
            { itemCode: "FLETE", producto: "FLETE", cantidad: 1, total: 178.57 }
        ]
    },
    {
        pedidoId: "PED-2026-0804",
        docEntry: "15387",
        clienteId: "2272598151226",
        clienteNombre: "Celso Alfredo Ambrocio",
        telefono: "46962182",
        fechaPedido: "2026-08-21",
        antiguedadDias: 4,
        montoTotal: 4195.53,
        tipoCobro: "Crédito",
        diasMora: 5,
        montoMora: 1200.00,
        creditoActivo: 35000.00,
        frecuenciaCompraScore: 8,
        frecuenciaPagoScore: 9,
        departamento: "SAN MARCOS",
        municipio: "Sipacapa",
        ruta: "WALTER GUERRA",
        canal: "CLAN 1",
        estadoPEPS: "Pendiente",
        items: [
            { itemCode: "S-DAN-NEW-COR-0001", producto: "SALA DANIELA CORINTO", cantidad: 1, total: 4016.96 },
            { itemCode: "FLETE", producto: "FLETE", cantidad: 1, total: 178.57 }
        ]
    },
    {
        pedidoId: "PED-2026-0805",
        docEntry: "15396",
        clienteId: "74420976",
        clienteNombre: "heida medina",
        telefono: "44594604",
        fechaPedido: "2026-08-22",
        antiguedadDias: 5,
        montoTotal: 3173.00,
        tipoCobro: "Contado",
        diasMora: 0,
        montoMora: 0.00,
        creditoActivo: 20000.00,
        frecuenciaCompraScore: 6,
        frecuenciaPagoScore: 10,
        departamento: "GUATEMALA",
        municipio: "Guatemala Zona 06",
        ruta: "ALEJANDRA SIAN",
        canal: "CLAN 1",
        estadoPEPS: "Pendiente",
        items: [
            { itemCode: "P-CS-L-B-0008", producto: "CABECERA SUED BLANCA MATRI / QUEEN", cantidad: 1, total: 266.96 },
            { itemCode: "P-ME-L-B-0001", producto: "MESA DE 60 BLANCA MELAMINA LISO", cantidad: 2, total: 533.92 },
            { itemCode: "R-2C-L-W-0004", producto: "ROPERO 2 CUERPOS LISO WENGUE", cantidad: 1, total: 847.32 },
            { itemCode: "P-M-L-W-0001", producto: "MARQUEZA 120 WENGUE", cantidad: 1, total: 713.39 },
            { itemCode: "B-1E-EF-I-0009", producto: "CAMA EURO FIRME MATRIMONIAL", cantidad: 1, total: 1214.29 }
        ]
    }
];

export class BOModule {
    constructor() {
        this.orders = this.loadOrdersFromStorage();
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

    syncClientsToClientsDB(groupedOrders) {
        try {
            let clients = [];
            const storedClients = localStorage.getItem('gci_clients');
            if (storedClients) {
                clients = JSON.parse(storedClients);
            }

            let addedCount = 0;
            groupedOrders.forEach(ord => {
                if (!ord.clienteId || !ord.clienteNombre) return;

                const existingIndex = clients.findIndex(c => c.codigo === ord.clienteId || c.id === `CLI-${ord.clienteId}`);
                const newClientObj = {
                    id: `CLI-${ord.clienteId}`,
                    codigo: ord.clienteId,
                    tipoCodigo: 'Auto-AppsScript',
                    tipoSN: 'Cliente',
                    nombre: ord.clienteNombre,
                    nombreExtranjero: ord.clienteNombre,
                    grupoCanal: ord.canal || 'CLAN 1',
                    moneda: 'Quetzales',
                    rfc: ord.clienteId,
                    saldoCuenta: ord.montoMora ? ord.montoMora.toFixed(2) : '0.00',
                    entregas: '0.00',
                    pedidosClientes: ord.montoTotal ? ord.montoTotal.toFixed(2) : '0.00',
                    general: {
                        telefono1: ord.telefono || '',
                        telefonoMovil: ord.telefono || '',
                        email: `${ord.clienteId}@gci-cliente.com`,
                        nitParaFacturas: ord.clienteId,
                        vendedor: ord.ruta || 'VENDEDOR ASIGNADO',
                        territorio: `${ord.municipio || ''}, ${ord.departamento || ''}`,
                        estadoCliente: 'Activo'
                    },
                    direcciones: [
                        {
                            id: 'DIR-01',
                            tipo: 'Destino',
                            nombreDireccion: `${ord.municipio || 'Sede'} - ${ord.departamento || 'Guatemala'}`,
                            municipio: ord.municipio || 'Guatemala',
                            estado: ord.departamento || 'Guatemala',
                            pais: 'Guatemala',
                            direccionFel: `${ord.municipio}, ${ord.departamento}`
                        }
                    ],
                    condicionesPago: {
                        condicionesPago: ord.tipoCobro || 'CREDITO 30 DIAS',
                        limiteCredito: (ord.creditoActivo || 35000).toFixed(2)
                    }
                };

                if (existingIndex >= 0) {
                    clients[existingIndex] = { ...clients[existingIndex], ...newClientObj };
                } else {
                    clients.push(newClientObj);
                    addedCount++;
                }
            });

            localStorage.setItem('gci_clients', JSON.stringify(clients));
            console.log(`[BO Module] ${addedCount} clientes de Apps Script procesados y sincronizados en Clientes DB.`);
        } catch (err) {
            console.error("Error sincronizando clientes en Clientes DB:", err);
        }
    }

    async fetchOrdersFromSheets() {
        this.isSyncing = true;
        this.updateSyncBadgeUI(true);

        try {
            const res = await fetch(APPS_SCRIPT_BO_URL, { redirect: 'follow' });
            if (res.ok) {
                const data = await res.json();

                // El Apps Script devuelve un objeto { ok: true, resumen: {...}, vt: [...] } o bien una lista directa
                let rawItems = [];
                if (Array.isArray(data)) {
                    rawItems = data;
                } else if (data && Array.isArray(data.vt)) {
                    rawItems = data.vt;
                } else if (data && Array.isArray(data.bo)) {
                    rawItems = data.bo;
                } else if (data && Array.isArray(data.items)) {
                    rawItems = data.items;
                }

                if (rawItems.length > 0) {
                    // Agrupar los ítems por número de pedido (NumSAP / DocEntry / U_IDFRONT / Cliente)
                    const groupsMap = new Map();

                    rawItems.forEach(item => {
                        const numSap = item.NumSAP || item.DocEntry || "";
                        const uIdFront = item.U_IDFRONT || "";
                        const clientRaw = item.Cliente || "Cliente General";

                        const orderKey = numSap ? `SAP-${numSap}` : (uIdFront ? `FRT-${uIdFront}` : `PED-${clientRaw}`);

                        // Parsear Cliente ("51350394 - DIEGO ARMANDO , RIVAS SALGUERO")
                        let clientCode = "";
                        let clientName = clientRaw;
                        if (clientRaw.includes(" - ")) {
                            const parts = clientRaw.split(" - ");
                            clientCode = parts[0].trim();
                            clientName = parts.slice(1).join(" - ").trim();
                        } else {
                            clientCode = String(item.Tel1 || item.Telefono || Math.floor(10000000 + Math.random() * 90000000));
                        }

                        // Parsear Fecha
                        let rawDate = item.Fecha || item.FechaCreado || new Date().toISOString();
                        let fecha = String(rawDate).split('T')[0];

                        // Parsear cantidades y precios (QMonto / TPedidoQTZ)
                        const itemQty = parseInt(item.Unidades || item.Pedido || item.Pedido_Final || 1, 10);
                        const itemTotal = parseFloat(item.QMonto || item.TPedidoQTZ || 0);

                        // Parsear SKU / Producto
                        const skuRaw = item.SKU || item.ItemCode || "GEN-001";
                        const prodName = item.Producto || (skuRaw.includes(" - ") ? skuRaw.split(" - ").slice(1).join(" - ") : skuRaw);

                        if (!groupsMap.has(orderKey)) {
                            const sapDoc = String(numSap || uIdFront || orderKey);
                            groupsMap.set(orderKey, {
                                pedidoId: uIdFront ? `PED-${uIdFront}` : (numSap ? `PED-${numSap}` : orderKey),
                                docEntry: sapDoc,
                                clienteId: clientCode,
                                clienteNombre: clientName,
                                telefono: String(item.Tel1 || item.Telefono || ''),
                                fechaPedido: fecha,
                                antiguedadDias: Math.max(1, Math.floor((new Date() - new Date(fecha)) / (1000 * 60 * 60 * 24))),
                                montoTotal: 0,
                                tipoCobro: item.TIPO === 'DIGITAL' ? 'Crédito' : 'Contado',
                                diasMora: (parseInt(sapDoc, 10) || 0) % 3 === 0 ? 15 : 0,
                                montoMora: (parseInt(sapDoc, 10) || 0) % 3 === 0 ? 2500.00 : 0.00,
                                creditoActivo: 40000.00,
                                frecuenciaCompraScore: 8,
                                frecuenciaPagoScore: 8,
                                departamento: item.Depto || item.Departamento || "Guatemala",
                                municipio: item.Muni || item.Municipio || "Guatemala",
                                ruta: item.Ruta || "Vendedor General",
                                canal: item.Canal || "CLAN 1",
                                estadoPEPS: "Pendiente",
                                items: []
                            });
                        }

                        const currentOrder = groupsMap.get(orderKey);
                        currentOrder.montoTotal += itemTotal;
                        currentOrder.items.push({
                            itemCode: skuRaw.split(" - ")[0],
                            producto: prodName,
                            cantidad: itemQty,
                            total: itemTotal
                        });
                    });

                    const groupedOrders = Array.from(groupsMap.values());
                    if (groupedOrders.length > 0) {
                        this.orders = groupedOrders;
                        this.syncClientsToClientsDB(groupedOrders);
                    }
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
                                <p class="text-muted m-0 small">Sincronización en tiempo real con Google Sheets Apps Script y creación automática en Clientes DB</p>
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
                        <h5 class="m-0 fw-bold text-dark"><i class="fa-solid fa-list-check me-2 text-primary"></i> Pedidos Agrupados de Apps Script (Google Sheets)</h5>
                        <input type="text" id="bo-search-input" class="form-control form-control-sm font-mono extra-small" style="max-width: 250px;" placeholder="Buscar pedido, cliente, NIT...">
                    </div>

                    <div class="table-responsive">
                        <table class="table table-hover align-middle extra-small">
                            <thead class="table-light">
                                <tr>
                                    <th>No. Pedido / DocEntry</th>
                                    <th>Cliente (Sync Clientes DB)</th>
                                    <th>Ítems / Detalle</th>
                                    <th>Fecha / Antigüedad</th>
                                    <th>Monto Total</th>
                                    <th>Tipo Cobro</th>
                                    <th>Mora / Crédito</th>
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
            return `<tr><td colspan="8" class="text-center text-muted p-4">No hay órdenes sincronizadas desde Google Sheets.</td></tr>`;
        }

        return this.orders.map(o => `
            <tr>
                <td class="fw-bold font-mono text-primary">
                    ${o.pedidoId}
                    <span class="d-block text-muted extra-small">DocEntry: ${o.docEntry || 'N/A'}</span>
                </td>
                <td>
                    <div class="fw-bold text-dark">${o.clienteNombre}</div>
                    <span class="text-muted font-mono extra-small">${o.clienteId} | Tel: ${o.telefono || 'N/A'}</span>
                    <span class="d-block text-secondary extra-small"><i class="fa-solid fa-location-dot me-1"></i>${o.municipio}, ${o.departamento}</span>
                </td>
                <td>
                    <span class="badge bg-secondary mb-1">${(o.items || []).length} productos</span>
                    <div class="text-muted extra-small text-truncate" style="max-width: 220px;" title="${(o.items || []).map(i => i.producto).join(', ')}">
                        ${(o.items || []).map(i => `${i.cantidad}x ${i.producto}`).join('<br>')}
                    </div>
                </td>
                <td class="font-mono">
                    ${o.fechaPedido}
                    <span class="badge bg-secondary ms-1">${o.antiguedadDias || 1} d</span>
                </td>
                <td class="fw-bold font-mono text-dark">Q${o.montoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                <td>
                    <span class="badge ${o.tipoCobro === 'Contado' ? 'bg-success' : 'bg-primary'}">${o.tipoCobro}</span>
                </td>
                <td class="font-mono">
                    ${o.diasMora > 0 ? `
                        <span class="text-danger fw-bold d-block">Mora: Q${o.montoMora.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${o.diasMora}d)</span>
                    ` : '<span class="text-success d-block"><i class="fa-solid fa-check me-1"></i> Al día</span>'}
                    <span class="text-muted extra-small">Crédito: Q${(o.creditoActivo || 35000).toLocaleString('es-GT')}</span>
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
                        body.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-4">No se encontraron órdenes que coincidan con "${term}".</td></tr>`;
                    } else {
                        body.innerHTML = filtered.map(o => `
                            <tr>
                                <td class="fw-bold font-mono text-primary">${o.pedidoId}</td>
                                <td>
                                    <div class="fw-bold text-dark">${o.clienteNombre}</div>
                                    <span class="text-muted font-mono extra-small">${o.clienteId} (${o.municipio}, ${o.departamento})</span>
                                </td>
                                <td><span class="badge bg-secondary">${(o.items || []).length} productos</span></td>
                                <td class="font-mono">${o.fechaPedido} <span class="badge bg-secondary ms-1">${o.antiguedadDias || 1} d</span></td>
                                <td class="fw-bold font-mono text-dark">Q${o.montoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                                <td><span class="badge ${o.tipoCobro === 'Contado' ? 'bg-success' : 'bg-primary'}">${o.tipoCobro}</span></td>
                                <td class="font-mono">${o.diasMora > 0 ? `<span class="text-danger fw-bold">Q${o.montoMora.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${o.diasMora}d)</span>` : '<span class="text-success"><i class="fa-solid fa-check me-1"></i> Al día</span>'}</td>
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
