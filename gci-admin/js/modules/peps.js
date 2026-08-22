/**
 * GCI ADMIN - Módulo PEPS (Priorización de Ensamble y Producción de Ventas)
 * Regulado por el Configurador de Reglas de Filtro (Mora vs Crédito, Frecuencia, Tipo Cobro)
 * Votación Ciega entre 3 Validadores (Producción, Logística, Ventas)
 * Panel de Organizador y Pestaña de Cola de Fabricación "Proceso del Día".
 */

export const DEFAULT_PEPS_RULES = [
    {
        id: "PEPS-R1",
        name: "Excluir con Mora mayor al Crédito Activo",
        enabled: true,
        type: "strict_filter", // 'strict_filter'
        filterAction: "exclude", // 'exclude'
        logic: "AND",
        conditions: [
            { field: "moraVsCreditoExceeded", operator: "==", value: true }
        ]
    },
    {
        id: "PEPS-R2",
        name: "Frecuencia Mínima de Compra o Pago",
        enabled: true,
        type: "strict_filter",
        filterAction: "exclude",
        logic: "OR",
        conditions: [
            { field: "frecuenciaCompraScore", operator: "<", value: 3 },
            { field: "frecuenciaPagoScore", operator: "<", value: 3 }
        ]
    },
    {
        id: "PEPS-R3",
        name: "Mora Estricta Superior a 60 Días en Crédito",
        enabled: true,
        type: "strict_filter",
        filterAction: "exclude",
        logic: "AND",
        conditions: [
            { field: "tipoCobro", operator: "==", value: "Crédito" },
            { field: "diasMora", operator: ">", value: 60 }
        ]
    }
];

export class PEPSModule {
    constructor() {
        this.rules = this.loadRulesFromStorage();
        this.activeRole = "validador_1"; // 'validador_1' (Producción), 'validador_2' (Logística), 'validador_3' (Ventas), 'organizador'
        this.activeSubTab = "evaluacion"; // 'evaluacion', 'proceso_dia'
        this.votes = this.loadVotesFromStorage();
    }

    loadRulesFromStorage() {
        try {
            const stored = localStorage.getItem("gci_peps_rules");
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn("Error leyendo gci_peps_rules de localStorage", e);
        }
        localStorage.setItem("gci_peps_rules", JSON.stringify(DEFAULT_PEPS_RULES));
        return DEFAULT_PEPS_RULES;
    }

    saveRulesToStorage(newRules) {
        this.rules = newRules;
        localStorage.setItem("gci_peps_rules", JSON.stringify(newRules));
    }

    loadVotesFromStorage() {
        try {
            const stored = localStorage.getItem("gci_peps_votes");
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn("Error leyendo gci_peps_votes de localStorage", e);
        }
        return {}; // { "PED-2026-0801": { v1: true, v2: true, v3: false, estado: 'En_Evaluación' } }
    }

    saveVotesToStorage() {
        localStorage.setItem("gci_peps_votes", JSON.stringify(this.votes));
    }

    getBOOrders() {
        try {
            const stored = localStorage.getItem("gci_bo_orders");
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn("Error leyendo órdenes de BO para PEPS", e);
        }
        return [];
    }

    /**
     * Aplica las reglas estrictas de PEPS para filtrar las órdenes.
     * Si no cumple con una regla activa (por ej. mora > crédito activo), la orden SE OCULTA para producción.
     */
    getFilteredOrders() {
        const boOrders = this.getBOOrders();

        return boOrders.filter(order => {
            const moraVsCreditoExceeded = (order.montoMora > order.creditoActivo) && (order.tipoCobro === 'Crédito');

            // Evaluar reglas activas
            for (const rule of this.rules) {
                if (!rule.enabled) continue;

                if (rule.type === 'strict_filter' && rule.filterAction === 'exclude') {
                    let ruleFailed = false;

                    if (rule.logic === 'OR') {
                        ruleFailed = rule.conditions.some(cond => this.evaluateCondition(order, cond, moraVsCreditoExceeded));
                    } else {
                        ruleFailed = rule.conditions.every(cond => this.evaluateCondition(order, cond, moraVsCreditoExceeded));
                    }

                    if (ruleFailed) {
                        return false; // SE OCULTA PARA PRODUCCIÓN
                    }
                }
            }
            return true;
        });
    }

    evaluateCondition(order, cond, moraVsCreditoExceeded) {
        let actualVal;
        if (cond.field === 'moraVsCreditoExceeded') actualVal = moraVsCreditoExceeded;
        else actualVal = order[cond.field];

        switch (cond.operator) {
            case '>': return Number(actualVal) > Number(cond.value);
            case '<': return Number(actualVal) < Number(cond.value);
            case '>=': return Number(actualVal) >= Number(cond.value);
            case '<=': return Number(actualVal) <= Number(cond.value);
            case '==': return String(actualVal) === String(cond.value);
            case '!=': return String(actualVal) !== String(cond.value);
            default: return false;
        }
    }

    render() {
        const qualifyingOrders = this.getFilteredOrders();
        const boCount = this.getBOOrders().length;
        const hiddenCount = boCount - qualifyingOrders.length;

        return `
            <div class="module-container peps-module">
                <!-- Header del Módulo PEPS -->
                <div class="card header-actions-card mb-4">
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="floating-badge-icon" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: #fff;">
                                <i class="fa-solid fa-industry" style="font-size: 1.4rem;"></i>
                            </div>
                            <div>
                                <h2 class="m-0 fw-bold title-gradient">Módulo PEPS - Priorización y Validación de Producción</h2>
                                <p class="text-muted m-0 small">Filtro automático por reglas financieras + Votación ciega de 3 Validadores + Proceso del Día</p>
                            </div>
                        </div>

                        <div class="d-flex align-items-center gap-2">
                            <!-- Selector de Rol Activo para Votación Ciega -->
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-light text-dark extra-small fw-bold"><i class="fa-solid fa-user-check me-1"></i> Rol:</span>
                                <select id="peps-role-select" class="form-select extra-small fw-bold" style="min-width: 190px;">
                                    <option value="validador_1" ${this.activeRole === 'validador_1' ? 'selected' : ''}>Validador 1 (Producción)</option>
                                    <option value="validador_2" ${this.activeRole === 'validador_2' ? 'selected' : ''}>Validador 2 (Logística)</option>
                                    <option value="validador_3" ${this.activeRole === 'validador_3' ? 'selected' : ''}>Validador 3 (Ventas)</option>
                                    <option value="organizador" ${this.activeRole === 'organizador' ? 'selected' : ''}>Organizador (Resultado Votación)</option>
                                </select>
                            </div>

                            <button id="btn-open-peps-rules-modal" class="btn btn-capsule btn-outline-primary" style="border-radius: 20px;">
                                <i class="fa-solid fa-sliders me-1"></i> Reglas de Producción
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Sub-Navegación: Evaluación vs Proceso del Día -->
                <ul class="nav nav-pills mb-4 border-bottom pb-2">
                    <li class="nav-item">
                        <button class="nav-link peps-tab-btn ${this.activeSubTab === 'evaluacion' ? 'active fw-bold' : ''}" data-tab="evaluacion">
                            <i class="fa-solid fa-check-double me-1"></i> Evaluación & Votación Ciega
                            <span class="badge bg-primary ms-1">${qualifyingOrders.length}</span>
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link peps-tab-btn ${this.activeSubTab === 'proceso_dia' ? 'active fw-bold' : ''}" data-tab="proceso_dia">
                            <i class="fa-solid fa-boxes-packing me-1"></i> Proceso del Día (Cola de Fábrica)
                            <span class="badge bg-success ms-1" id="badge-proceso-dia-count">${this.getApprovedProcesoDiaOrders().length}</span>
                        </button>
                    </li>
                </ul>

                <!-- Resumen de Filtro de Reglas -->
                <div class="alert alert-info border-info p-2 mb-4 rounded extra-small d-flex align-items-center justify-content-between">
                    <div>
                        <i class="fa-solid fa-filter me-2 fs-6"></i>
                        <span>Filtro de Reglas Activo: <b>${qualifyingOrders.length}</b> órdenes elegibles para producción. <b>${hiddenCount}</b> órdenes ocultadas por reglas de mora/crédito.</span>
                    </div>
                    <span class="badge bg-secondary font-mono">${this.rules.filter(r => r.enabled).length} Reglas Activas</span>
                </div>

                <!-- Vista 1: Evaluación y Votación Ciega -->
                ${this.activeSubTab === 'evaluacion' ? this.renderEvaluacionView(qualifyingOrders) : this.renderProcesoDiaView()}
            </div>

            <!-- MODAL DE CONFIGURACIÓN DE REGLAS DE PRODUCCIÓN PEPS -->
            <div id="peps-rules-modal" class="modal-overlay" style="display: none;">
                <div class="modal-dialog-gci" style="max-width: 800px;">
                    <div class="modal-header-gci">
                        <h3><i class="fa-solid fa-sliders text-primary"></i> Configurar Reglas de Producción PEPS</h3>
                        <button id="btn-close-peps-rules-modal" class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body-gci">
                        <p class="text-muted extra-small mb-3">
                            Las órdenes del BO que NO cumplan con estas reglas se **ocultarán automáticamente** para evitar que ingresen a la cola de fabricación de fábrica.
                        </p>

                        <div class="d-flex flex-column gap-3 mb-4" id="peps-rules-editor-list">
                            ${this.renderRulesEditorItems()}
                        </div>

                        <div class="text-end border-top pt-3">
                            <button type="button" id="btn-save-peps-rules" class="btn btn-capsule btn-success-gradient">
                                <i class="fa-solid fa-floppy-disk me-1"></i> Guardar Reglas de Producción
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRulesEditorItems() {
        return this.rules.map((rule, idx) => `
            <div class="p-3 bg-light rounded border border-secondary-subtle">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                        <div class="form-check form-switch m-0">
                            <input class="form-check-input peps-rule-toggle" type="checkbox" data-idx="${idx}" ${rule.enabled ? 'checked' : ''}>
                        </div>
                        <span class="fw-bold extra-small text-dark">${rule.name}</span>
                    </div>
                    <span class="badge ${rule.enabled ? 'bg-success' : 'bg-secondary'} font-mono">${rule.enabled ? 'ACTIVA' : 'INACTIVA'}</span>
                </div>
                <div class="extra-small text-muted font-mono ps-4">
                    Efecto: Filtro Estricto &rarr; Ocultar Orden si (${rule.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(` ${rule.logic} `)})
                </div>
            </div>
        `).join('');
    }

    renderEvaluacionView(qualifyingOrders) {
        if (qualifyingOrders.length === 0) {
            return `
                <div class="card p-5 text-center text-muted">
                    <i class="fa-solid fa-circle-check fs-1 text-success mb-2"></i>
                    <h5>No hay órdenes pendientes en evaluación</h5>
                    <p class="extra-small m-0">Todas las órdenes han sido procesadas o se encuentran ocultas por reglas de crédito.</p>
                </div>
            `;
        }

        return `
            <div class="row g-3">
                ${qualifyingOrders.map(order => this.renderOrderCard(order)).join('')}
            </div>
        `;
    }

    renderOrderCard(order) {
        const voteState = this.votes[order.pedidoId] || { v1: null, v2: null, v3: null, estado: 'Pendiente' };
        const isOrganizer = this.activeRole === 'organizador';

        // Determinar si el usuario activo ya votó
        let currentRoleKey = '';
        let currentRoleLabel = '';
        if (this.activeRole === 'validador_1') { currentRoleKey = 'v1'; currentRoleLabel = 'Validador 1 (Producción)'; }
        else if (this.activeRole === 'validador_2') { currentRoleKey = 'v2'; currentRoleLabel = 'Validador 2 (Logística)'; }
        else if (this.activeRole === 'validador_3') { currentRoleKey = 'v3'; currentRoleLabel = 'Validador 3 (Ventas)'; }

        const currentRoleVote = voteState[currentRoleKey];

        // Conteo de votos para el Organizador
        const posCount = [voteState.v1, voteState.v2, voteState.v3].filter(v => v === true).length;
        const negCount = [voteState.v1, voteState.v2, voteState.v3].filter(v => v === false).length;
        const totalVoted = [voteState.v1, voteState.v2, voteState.v3].filter(v => v !== null && v !== undefined).length;

        const qualifiesForProduction = (posCount === 3) || (posCount === 2 && negCount === 1);

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card p-3 h-100 shadow-sm border-0 rounded-3 card-peps-item position-relative">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <span class="badge bg-primary font-mono fw-bold">${order.pedidoId}</span>
                            <span class="badge bg-secondary font-mono ms-1">${order.tipoCobro}</span>
                        </div>
                        <span class="badge ${order.estadoPEPS === 'Aprobado' ? 'bg-success' : 'bg-warning text-dark'} font-mono">
                            ${order.estadoPEPS || 'Pendiente Votación'}
                        </span>
                    </div>

                    <h6 class="fw-bold text-dark mb-1">${order.clienteNombre}</h6>
                    <div class="extra-small text-muted mb-2 font-mono">
                        <i class="fa-solid fa-location-dot text-danger me-1"></i> ${order.municipio}, ${order.departamento}
                    </div>

                    <!-- Datos Financieros Clave -->
                    <div class="p-2 bg-light rounded border mb-3 extra-small font-mono">
                        <div class="d-flex justify-content-between">
                            <span>Monto Pedido:</span>
                            <strong class="text-dark">Q${order.montoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Crédito Activo:</span>
                            <span>Q${order.creditoActivo.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Mora Actual:</span>
                            <span class="${order.montoMora > 0 ? 'text-danger fw-bold' : 'text-success'}">
                                ${order.montoMora > 0 ? `Q${order.montoMora.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${order.diasMora}d)` : 'Q0.00 (Al día)'}
                            </span>
                        </div>
                        <div class="d-flex justify-content-between mt-1 pt-1 border-top">
                            <span>Frec. Compra / Pago:</span>
                            <span class="text-info fw-bold">C: ${order.frecuenciaCompraScore}/10 | P: ${order.frecuenciaPagoScore}/10</span>
                        </div>
                    </div>

                    <!-- SECCIÓN DE VOTACIÓN CIEGA PARA VALIDACIÓN POR ROL -->
                    ${!isOrganizer ? `
                        <div class="p-2 bg-primary-subtle rounded border border-primary-subtle extra-small mt-auto">
                            <div class="fw-bold text-primary mb-1 d-flex align-items-center justify-content-between">
                                <span><i class="fa-solid fa-user-check me-1"></i> Tu Voto (${currentRoleLabel}):</span>
                                <span class="badge ${currentRoleVote === true ? 'bg-success' : (currentRoleVote === false ? 'bg-danger' : 'bg-secondary')}">
                                    ${currentRoleVote === true ? 'APROBADO 👍' : (currentRoleVote === false ? 'DESAPROBADO 👎' : 'PENDIENTE')}
                                </span>
                            </div>
                            <div class="extra-small text-muted mb-2">Votación ciega: No puedes ver los votos de los otros validadores.</div>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-sm btn-success w-100 extra-small btn-vote-peps" data-pedido="${order.pedidoId}" data-role="${currentRoleKey}" data-vote="true">
                                    <i class="fa-solid fa-thumbs-up me-1"></i> Aprobar
                                </button>
                                <button type="button" class="btn btn-sm btn-danger w-100 extra-small btn-vote-peps" data-pedido="${order.pedidoId}" data-role="${currentRoleKey}" data-vote="false">
                                    <i class="fa-solid fa-thumbs-down me-1"></i> Desaprobar
                                </button>
                            </div>
                        </div>
                    ` : `
                        <!-- PANEL DEL ORGANIZADOR (MUESTRA DESGLOSE Y VALIDACIÓN) -->
                        <div class="p-2 bg-dark-subtle rounded border extra-small mt-auto">
                            <div class="fw-bold text-dark mb-1"><i class="fa-solid fa-square-poll-vertical me-1"></i> Panel del Organizador:</div>
                            <div class="d-flex justify-content-around my-2 text-center">
                                <div>
                                    <span class="extra-small text-muted d-block">Voto V1 (Prod)</span>
                                    <span class="badge ${voteState.v1 === true ? 'bg-success' : (voteState.v1 === false ? 'bg-danger' : 'bg-secondary')} font-mono">
                                        ${voteState.v1 === true ? '👍 Sí' : (voteState.v1 === false ? '👎 No' : 'Pend')}
                                    </span>
                                </div>
                                <div>
                                    <span class="extra-small text-muted d-block">Voto V2 (Log)</span>
                                    <span class="badge ${voteState.v2 === true ? 'bg-success' : (voteState.v2 === false ? 'bg-danger' : 'bg-secondary')} font-mono">
                                        ${voteState.v2 === true ? '👍 Sí' : (voteState.v2 === false ? '👎 No' : 'Pend')}
                                    </span>
                                </div>
                                <div>
                                    <span class="extra-small text-muted d-block">Voto V3 (Vent)</span>
                                    <span class="badge ${voteState.v3 === true ? 'bg-success' : (voteState.v3 === false ? 'bg-danger' : 'bg-secondary')} font-mono">
                                        ${voteState.v3 === true ? '👍 Sí' : (voteState.v3 === false ? '👎 No' : 'Pend')}
                                    </span>
                                </div>
                            </div>

                            <div class="extra-small mb-2 text-center">
                                ${totalVoted < 3 ? '<span class="text-muted"><i class="fa-solid fa-clock me-1"></i> Esperando que los 3 validadores voten...</span>' : ''}
                                ${totalVoted === 3 && qualifiesForProduction ? '<span class="text-success fw-bold"><i class="fa-solid fa-circle-check me-1"></i> CUMPLE CRITERIO (3 Positivos ó 2 Positivos + 1 Negativo)</span>' : ''}
                                ${totalVoted === 3 && !qualifiesForProduction ? '<span class="text-danger fw-bold"><i class="fa-solid fa-circle-xmark me-1"></i> RECHAZADO POR MAYORÍA NEGATIVA</span>' : ''}
                            </div>

                            ${totalVoted === 3 && qualifiesForProduction && order.estadoPEPS !== 'Aprobado' ? `
                                <button type="button" class="btn btn-sm btn-success w-100 extra-small btn-approve-proceso-dia" data-pedido="${order.pedidoId}">
                                    <i class="fa-solid fa-industry me-1"></i> Validar e Ingresar a Proceso del Día
                                </button>
                            ` : ''}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    getApprovedProcesoDiaOrders() {
        const boOrders = this.getBOOrders();
        return boOrders.filter(o => o.estadoPEPS === 'Aprobado');
    }

    renderProcesoDiaView() {
        const approvedOrders = this.getApprovedProcesoDiaOrders();

        if (approvedOrders.length === 0) {
            return `
                <div class="card p-5 text-center text-muted">
                    <i class="fa-solid fa-industry fs-1 text-secondary mb-2"></i>
                    <h5>No hay órdenes en la cola de fábrica "Proceso del Día"</h5>
                    <p class="extra-small m-0">Al validarse las votaciones en la pestaña de evaluación, aparecerán automáticamente en el plan de producción del día.</p>
                </div>
            `;
        }

        return `
            <div class="card p-3 shadow-sm border-0">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="m-0 fw-bold text-success"><i class="fa-solid fa-boxes-packing me-2"></i> Cola de Fabricación - Proceso del Día</h5>
                    <span class="badge bg-success font-mono fs-6">${approvedOrders.length} Órdenes Aprobadas</span>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover align-middle extra-small">
                        <thead class="table-light">
                            <tr>
                                <th>No. Pedido</th>
                                <th>Cliente</th>
                                <th>Monto Total</th>
                                <th>Tipo Cobro</th>
                                <th>Validación PEPS</th>
                                <th>Estado Producción</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${approvedOrders.map(o => `
                                <tr>
                                    <td class="fw-bold font-mono text-primary">${o.pedidoId}</td>
                                    <td>
                                        <div class="fw-bold text-dark">${o.clienteNombre}</div>
                                        <span class="text-muted extra-small">${o.municipio}, ${o.departamento}</span>
                                    </td>
                                    <td class="fw-bold font-mono text-dark">Q${o.montoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                                    <td><span class="badge ${o.tipoCobro === 'Contado' ? 'bg-success' : 'bg-primary'}">${o.tipoCobro}</span></td>
                                    <td><span class="badge bg-success font-mono"><i class="fa-solid fa-circle-check me-1"></i> Aprobado por Validadores</span></td>
                                    <td><span class="badge bg-info text-dark font-mono"><i class="fa-solid fa-gears me-1"></i> En Ensamblado</span></td>
                                    <td>
                                        <button class="btn btn-xs btn-outline-secondary font-mono" onclick="alert('Orden ${o.pedidoId} asignada a estación de corte y ensamble.')">
                                            <i class="fa-solid fa-print me-1"></i> Imprimir Ficha de Fábrica
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    initEvents() {
        // Selector de Rol
        const roleSelect = document.getElementById('peps-role-select');
        if (roleSelect) {
            roleSelect.addEventListener('change', (e) => {
                this.activeRole = e.target.value;
                this.refreshUI();
            });
        }

        // Cambio de Pestaña Sub-Navegación
        document.querySelectorAll('.peps-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeSubTab = btn.dataset.tab;
                this.refreshUI();
            });
        });

        // Eventos de Votación por Rol
        document.querySelectorAll('.btn-vote-peps').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pedidoId = e.currentTarget.dataset.pedido;
                const roleKey = e.currentTarget.dataset.role;
                const voteVal = e.currentTarget.dataset.vote === 'true';

                if (!this.votes[pedidoId]) {
                    this.votes[pedidoId] = { v1: null, v2: null, v3: null, estado: 'Pendiente' };
                }

                this.votes[pedidoId][roleKey] = voteVal;
                this.saveVotesToStorage();
                this.refreshUI();
            });
        });

        // Evento Aprobar para Proceso del Día por Organizador
        document.querySelectorAll('.btn-approve-proceso-dia').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pedidoId = e.currentTarget.dataset.pedido;
                const boOrders = this.getBOOrders();
                const found = boOrders.find(o => o.pedidoId === pedidoId);
                if (found) {
                    found.estadoPEPS = 'Aprobado';
                    localStorage.setItem("gci_bo_orders", JSON.stringify(boOrders));
                    alert(`Orden ${pedidoId} validada exitosamente y transferida a la pestaña "Proceso del Día" para producción de fábrica.`);
                    this.refreshUI();
                }
            });
        });

        // Modal de Reglas de Producción
        const btnOpenRules = document.getElementById('btn-open-peps-rules-modal');
        const modalRules = document.getElementById('peps-rules-modal');
        const btnCloseRules = document.getElementById('btn-close-peps-rules-modal');
        const btnSaveRules = document.getElementById('btn-save-peps-rules');

        if (btnOpenRules && modalRules) {
            btnOpenRules.addEventListener('click', () => {
                modalRules.style.display = 'flex';
            });
        }

        if (btnCloseRules && modalRules) {
            btnCloseRules.addEventListener('click', () => {
                modalRules.style.display = 'none';
            });
        }

        if (btnSaveRules) {
            btnSaveRules.addEventListener('click', () => {
                document.querySelectorAll('.peps-rule-toggle').forEach(chk => {
                    const idx = parseInt(chk.dataset.idx, 10);
                    this.rules[idx].enabled = chk.checked;
                });
                this.saveRulesToStorage(this.rules);
                if (modalRules) modalRules.style.display = 'none';
                alert("Reglas de producción PEPS guardadas exitosamente.");
                this.refreshUI();
            });
        }
    }

    refreshUI() {
        const container = document.getElementById('gci-content-area');
        if (container) {
            container.innerHTML = this.render();
            this.initEvents();
        }
    }
}
