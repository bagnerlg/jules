/**
 * GCI ADMIN - Módulo PEPS (Priorización de Ensamble y Producción de Ventas)
 * Regulado por el Configurador Dinámico de Reglas (estilo Agenda de Rutas)
 * Evaluador de Condiciones con conectores Y / O y Operadores (>, <, >=, <=, ==, !=, contiene)
 * Botón "Generar Sugerido de Plan Analizado"
 * Votación Ciega entre 3 Validadores + Panel Organizador + Pestaña "Proceso del Día" (Cola de Fábrica).
 */

export const DEFAULT_PEPS_FIELDS = [
    { id: "montoTotal", label: "Monto Total (Q)", type: "number" },
    { id: "diasMora", label: "Días de Mora", type: "number" },
    { id: "montoMora", label: "Monto de Mora (Q)", type: "number" },
    { id: "creditoActivo", label: "Crédito Activo (Q)", type: "number" },
    { id: "frecuenciaCompraScore", label: "Score Frecuencia Compra (0-10)", type: "number" },
    { id: "frecuenciaPagoScore", label: "Score Frecuencia Pago (0-10)", type: "number" },
    { id: "antiguedadDias", label: "Antigüedad Pedido (Días)", type: "number" },
    { id: "tipoCobro", label: "Tipo Cobro (Contado/Crédito)", type: "text" },
    { id: "departamento", label: "Departamento", type: "text" },
    { id: "municipio", label: "Municipio", type: "text" },
    { id: "canal", label: "Canal de Venta", type: "text" }
];

export const DEFAULT_PEPS_RULES = [
    {
        id: "PEPS-R1",
        name: "Excluir Mora excesiva superior a Crédito",
        enabled: true,
        logic: "AND",
        conditions: [
            { field: "montoMora", operator: ">", value: "30000" },
            { field: "tipoCobro", operator: "==", value: "Crédito" }
        ]
    },
    {
        id: "PEPS-R2",
        name: "Frecuencia Mínima de Compra o Pago Baja",
        enabled: true,
        logic: "OR",
        conditions: [
            { field: "frecuenciaCompraScore", operator: "<", value: "4" },
            { field: "frecuenciaPagoScore", operator: "<", value: "4" }
        ]
    },
    {
        id: "PEPS-R3",
        name: "Días de Mora Superior a 30 Días",
        enabled: true,
        logic: "AND",
        conditions: [
            { field: "diasMora", operator: ">", value: "30" }
        ]
    }
];

export class PEPSModule {
    constructor() {
        this.rules = this.loadRulesFromStorage();
        this.activeRole = "validador_1"; // 'validador_1', 'validador_2', 'validador_3', 'organizador'
        this.activeSubTab = "evaluacion"; // 'evaluacion', 'proceso_dia'
        this.votes = this.loadVotesFromStorage();
        this.analyzedPlan = null; // Guardará el resultado del análisis cuando se presione "Generar Sugerido"
        this.filterAnalyzedOnly = false;
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
        return {};
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
     * Evalúa una condición matemática/lógica sobre una orden de BO.
     */
    evaluateCondition(order, cond) {
        let actualVal = order[cond.field];
        if (actualVal === undefined || actualVal === null) actualVal = "";

        const targetVal = cond.value;

        switch (cond.operator) {
            case '>': return Number(actualVal) > Number(targetVal);
            case '<': return Number(actualVal) < Number(targetVal);
            case '>=': return Number(actualVal) >= Number(targetVal);
            case '<=': return Number(actualVal) <= Number(targetVal);
            case '==': return String(actualVal).toLowerCase().trim() === String(targetVal).toLowerCase().trim();
            case '!=': return String(actualVal).toLowerCase().trim() !== String(targetVal).toLowerCase().trim();
            case 'contiene': return String(actualVal).toLowerCase().includes(String(targetVal).toLowerCase());
            default: return false;
        }
    }

    /**
     * Filtra las órdenes aplicando el conjunto de reglas activas.
     */
    getFilteredOrders() {
        const boOrders = this.getBOOrders();

        return boOrders.filter(order => {
            for (const rule of this.rules) {
                if (!rule.enabled || !rule.conditions || rule.conditions.length === 0) continue;

                let ruleMatched = false;
                if (rule.logic === 'OR') {
                    ruleMatched = rule.conditions.some(cond => this.evaluateCondition(order, cond));
                } else {
                    ruleMatched = rule.conditions.every(cond => this.evaluateCondition(order, cond));
                }

                // Si la regla coincide (ej. Mora excesiva), se descarta de la lista elegible
                if (ruleMatched) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * "Generar Sugerido de Plan Analizado":
     * Evalúa exhaustivamente todas las órdenes y genera recomendaciones automáticas (Sugerido Aprobar vs Sugerido Rechazar)
     */
    generateSuggestedPlan() {
        const boOrders = this.getBOOrders();
        const results = [];

        boOrders.forEach(order => {
            const failedRules = [];

            this.rules.forEach(rule => {
                if (!rule.enabled || !rule.conditions || rule.conditions.length === 0) return;

                let ruleMatched = false;
                if (rule.logic === 'OR') {
                    ruleMatched = rule.conditions.some(cond => this.evaluateCondition(order, cond));
                } else {
                    ruleMatched = rule.conditions.every(cond => this.evaluateCondition(order, cond));
                }

                if (ruleMatched) {
                    failedRules.push(rule.name);
                }
            });

            const isSuggestedApprove = failedRules.length === 0;

            // Auto-asociar votos sugeridos si no se ha votado
            if (!this.votes[order.pedidoId]) {
                this.votes[order.pedidoId] = {
                    v1: isSuggestedApprove,
                    v2: isSuggestedApprove,
                    v3: isSuggestedApprove,
                    estado: isSuggestedApprove ? 'Sugerido Aprobar' : 'Sugerido Rechazar'
                };
            }

            results.push({
                order,
                isSuggestedApprove,
                failedRules
            });
        });

        this.analyzedPlan = results;
        this.filterAnalyzedOnly = true;
        this.saveVotesToStorage();
        this.refreshUI();
    }

    /**
     * Transfiere todas las órdenes aprobadas directamente a Proceso del Día
     */
    transferApprovedToProcesoDia() {
        const boOrders = this.getBOOrders();
        let count = 0;

        boOrders.forEach(order => {
            const voteState = this.votes[order.pedidoId] || {};
            const posCount = [voteState.v1, voteState.v2, voteState.v3].filter(v => v === true).length;
            const negCount = [voteState.v1, voteState.v2, voteState.v3].filter(v => v === false).length;

            if ((posCount === 3 || (posCount === 2 && negCount === 1)) || voteState.estado === 'Sugerido Aprobar') {
                order.estadoPEPS = 'Aprobado';
                count++;
            }
        });

        localStorage.setItem("gci_bo_orders", JSON.stringify(boOrders));
        alert(`¡${count} órdenes han sido transferidas con éxito a la pestaña "Proceso del Día" para cola de fabricación!`);
        this.activeSubTab = 'proceso_dia';
        this.refreshUI();
    }

    render() {
        const qualifyingOrders = this.getFilteredOrders();
        const boOrders = this.getBOOrders();
        const hiddenCount = boOrders.length - qualifyingOrders.length;

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
                                <p class="text-muted m-0 small">Configurador dinámico de reglas + Sugerido de Plan + Votación ciega de 3 Validadores + Proceso del Día</p>
                            </div>
                        </div>

                        <div class="d-flex align-items-center gap-2">
                            <!-- Selector de Rol Activo -->
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-light text-dark extra-small fw-bold"><i class="fa-solid fa-user-check me-1"></i> Rol:</span>
                                <select id="peps-role-select" class="form-select extra-small fw-bold" style="min-width: 190px;">
                                    <option value="validador_1" ${this.activeRole === 'validador_1' ? 'selected' : ''}>Validador 1 (Producción)</option>
                                    <option value="validador_2" ${this.activeRole === 'validador_2' ? 'selected' : ''}>Validador 2 (Logística)</option>
                                    <option value="validador_3" ${this.activeRole === 'validador_3' ? 'selected' : ''}>Validador 3 (Ventas)</option>
                                    <option value="organizador" ${this.activeRole === 'organizador' ? 'selected' : ''}>Organizador (Resultado Votación)</option>
                                </select>
                            </div>

                            <button id="btn-open-peps-rules-modal" class="btn btn-capsule btn-outline-primary" style="border-radius: 6px;">
                                <i class="fa-solid fa-sliders me-1"></i> Configurar Reglas
                            </button>

                            <button id="btn-generate-suggested-plan" class="btn btn-capsule btn-success-gradient" style="border-radius: 6px;">
                                <i class="fa-solid fa-wand-magic-sparkles me-1"></i> Generar Sugerido de Plan Analizado
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Sub-Navegación: Evaluación vs Proceso del Día -->
                <ul class="nav nav-pills mb-3 border-bottom pb-2">
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

                <!-- Barra Informativa de Estado de Reglas -->
                <div class="alert alert-info border-info p-2 mb-4 rounded extra-small d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <i class="fa-solid fa-filter text-primary fs-6"></i>
                        <span>Filtro de Reglas Activo: <b>${qualifyingOrders.length}</b> órdenes elegibles para producción. <b>${hiddenCount}</b> ocultadas por reglas.</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        ${this.analyzedPlan ? `
                            <span class="badge bg-success font-mono"><i class="fa-solid fa-check me-1"></i> Plan Analizado Generado</span>
                            <button id="btn-transfer-bulk-proceso-dia" class="btn btn-xs btn-success fw-bold font-mono">
                                <i class="fa-solid fa-angles-right me-1"></i> Pasar Aprobados a Proceso del Día
                            </button>
                        ` : ''}
                        <span class="badge bg-secondary font-mono">${this.rules.filter(r => r.enabled).length} Reglas Activas</span>
                    </div>
                </div>

                <!-- Vista Principal: Evaluación o Proceso del Día -->
                ${this.activeSubTab === 'evaluacion' ? this.renderEvaluacionView(qualifyingOrders) : this.renderProcesoDiaView()}
            </div>

            <!-- MODAL DINÁMICO DE CONFIGURACIÓN DE REGLAS PEPS (ESTILO AGENDA DE RUTAS) -->
            <div id="peps-rules-modal" class="modal-overlay" style="display: none;">
                <div class="modal-dialog-gci" style="max-width: 850px;">
                    <div class="modal-header-gci">
                        <h3><i class="fa-solid fa-sliders text-primary me-2"></i> Configurar Reglas Dinámicas de Validación PEPS</h3>
                        <button id="btn-close-peps-rules-modal" class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body-gci">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <p class="text-muted extra-small m-0">
                                Defina condiciones con operadores numéricos/texto (`>`, `<`, `>=`, `<=`, `==`, `!=`, `contiene`) y conectores lógicos (`Y` / `O`). Las órdenes que coincidan serán **excluidas automáticamente** de fábrica.
                            </p>
                            <button id="btn-add-peps-rule" class="btn btn-xs btn-primary-gradient">
                                <i class="fa-solid fa-plus me-1"></i> Nueva Regla
                            </button>
                        </div>

                        <div class="d-flex flex-column gap-3 mb-4" id="peps-rules-builder-container" style="max-height: 480px; overflow-y: auto;">
                            ${this.renderRulesBuilder()}
                        </div>

                        <div class="text-end border-top pt-3 d-flex justify-content-between align-items-center">
                            <button type="button" id="btn-reset-default-peps-rules" class="btn btn-xs btn-outline-danger">
                                Restablecer Reglas por Defecto
                            </button>
                            <button type="button" id="btn-save-peps-rules" class="btn btn-capsule btn-success-gradient">
                                <i class="fa-solid fa-floppy-disk me-1"></i> Guardar Reglas
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRulesBuilder() {
        if (!this.rules || this.rules.length === 0) {
            return `<div class="text-center p-4 text-muted extra-small">No hay reglas configuradas. Presione "+ Nueva Regla" para agregar una.</div>`;
        }

        return this.rules.map((rule, ruleIdx) => `
            <div class="p-3 bg-light rounded border border-secondary-subtle peps-rule-card" data-rule-idx="${ruleIdx}">
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom">
                    <div class="d-flex align-items-center gap-2 flex-grow-1">
                        <div class="form-check form-switch m-0">
                            <input class="form-check-input rule-enabled-chk" type="checkbox" ${rule.enabled ? 'checked' : ''}>
                        </div>
                        <input type="text" class="form-control form-control-sm font-weight-bold rule-name-input" value="${rule.name}" style="max-width: 320px;" placeholder="Nombre de la Regla">
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <span class="extra-small fw-bold text-muted">Conector entre Condiciones:</span>
                        <select class="form-select form-select-sm rule-logic-select" style="width: 80px;">
                            <option value="AND" ${rule.logic === 'AND' ? 'selected' : ''}>Y (AND)</option>
                            <option value="OR" ${rule.logic === 'OR' ? 'selected' : ''}>O (OR)</option>
                        </select>

                        <button class="btn btn-xs btn-outline-danger btn-delete-rule" data-rule-idx="${ruleIdx}" title="Eliminar Regla">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                <!-- Lista de Condiciones de la Regla -->
                <div class="rule-conditions-container d-flex flex-column gap-2 mb-2">
                    ${(rule.conditions || []).map((cond, condIdx) => `
                        <div class="d-flex align-items-center gap-2 condition-row">
                            <select class="form-select form-select-sm cond-field-select" style="min-width: 200px;">
                                ${DEFAULT_PEPS_FIELDS.map(f => `<option value="${f.id}" ${cond.field === f.id ? 'selected' : ''}>${f.label}</option>`).join('')}
                            </select>

                            <select class="form-select form-select-sm cond-op-select font-mono" style="width: 110px;">
                                <option value=">" ${cond.operator === '>' ? 'selected' : ''}>Mayor (>)</option>
                                <option value="<" ${cond.operator === '<' ? 'selected' : ''}>Menor (<)</option>
                                <option value=">=" ${cond.operator === '>=' ? 'selected' : ''}>Mayor o igual (>=)</option>
                                <option value="<=" ${cond.operator === '<=' ? 'selected' : ''}>Menor o igual (<=)</option>
                                <option value="==" ${cond.operator === '==' ? 'selected' : ''}>Igual (==)</option>
                                <option value="!=" ${cond.operator === '!=' ? 'selected' : ''}>Diferente (!=)</option>
                                <option value="contiene" ${cond.operator === 'contiene' ? 'selected' : ''}>Contiene</option>
                            </select>

                            <input type="text" class="form-control form-control-sm font-mono cond-val-input" value="${cond.value}" placeholder="Valor límite">

                            <button class="btn btn-xs btn-outline-secondary btn-delete-condition" data-rule-idx="${ruleIdx}" data-cond-idx="${condIdx}">
                                &times;
                            </button>
                        </div>
                    `).join('')}
                </div>

                <button class="btn btn-xs btn-link text-primary p-0 btn-add-condition" data-rule-idx="${ruleIdx}">
                    <i class="fa-solid fa-plus me-1"></i> Agregar otra condición
                </button>
            </div>
        `).join('');
    }

    renderEvaluacionView(qualifyingOrders) {
        if (qualifyingOrders.length === 0) {
            return `
                <div class="card p-5 text-center text-muted">
                    <i class="fa-solid fa-circle-check fs-1 text-success mb-2"></i>
                    <h5>No hay órdenes pendientes en evaluación</h5>
                    <p class="extra-small m-0">Todas las órdenes han sido procesadas o se encuentran ocultas por las reglas activas.</p>
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

        let currentRoleKey = '';
        let currentRoleLabel = '';
        if (this.activeRole === 'validador_1') { currentRoleKey = 'v1'; currentRoleLabel = 'Validador 1 (Producción)'; }
        else if (this.activeRole === 'validador_2') { currentRoleKey = 'v2'; currentRoleLabel = 'Validador 2 (Logística)'; }
        else if (this.activeRole === 'validador_3') { currentRoleKey = 'v3'; currentRoleLabel = 'Validador 3 (Ventas)'; }

        const currentRoleVote = voteState[currentRoleKey];

        const posCount = [voteState.v1, voteState.v2, voteState.v3].filter(v => v === true).length;
        const negCount = [voteState.v1, voteState.v2, voteState.v3].filter(v => v === false).length;
        const totalVoted = [voteState.v1, voteState.v2, voteState.v3].filter(v => v !== null && v !== undefined).length;

        const qualifiesForProduction = (posCount === 3) || (posCount === 2 && negCount === 1);

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card p-3 h-100 shadow-sm border-0 rounded-3 card-peps-item">
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

                    <!-- Detalle Financiero & Productos -->
                    <div class="p-2 bg-light rounded border mb-3 extra-small font-mono">
                        <div class="d-flex justify-content-between">
                            <span>Monto Pedido:</span>
                            <strong class="text-dark">Q${order.montoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Crédito Activo:</span>
                            <span>Q${(order.creditoActivo || 35000).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Mora Actual:</span>
                            <span class="${order.montoMora > 0 ? 'text-danger fw-bold' : 'text-success'}">
                                ${order.montoMora > 0 ? `Q${order.montoMora.toLocaleString('es-GT', { minimumFractionDigits: 2 })} (${order.diasMora}d)` : 'Q0.00 (Al día)'}
                            </span>
                        </div>
                        <div class="mt-1 pt-1 border-top text-truncate text-muted">
                            <strong>Contenido:</strong> ${(order.items || []).map(i => `${i.cantidad}x ${i.producto}`).join(', ')}
                        </div>
                    </div>

                    <!-- PANEL DE VOTACIÓN CIEGA O PANEL ORGANIZADOR -->
                    ${!isOrganizer ? `
                        <div class="p-2 bg-primary-subtle rounded border border-primary-subtle extra-small mt-auto">
                            <div class="fw-bold text-primary mb-1 d-flex align-items-center justify-content-between">
                                <span><i class="fa-solid fa-user-check me-1"></i> Tu Voto (${currentRoleLabel}):</span>
                                <span class="badge ${currentRoleVote === true ? 'bg-success' : (currentRoleVote === false ? 'bg-danger' : 'bg-secondary')}">
                                    ${currentRoleVote === true ? 'APROBADO 👍' : (currentRoleVote === false ? 'DESAPROBADO 👎' : 'PENDIENTE')}
                                </span>
                            </div>
                            <div class="d-flex gap-2 mt-2">
                                <button type="button" class="btn btn-sm btn-success w-100 extra-small btn-vote-peps" data-pedido="${order.pedidoId}" data-role="${currentRoleKey}" data-vote="true">
                                    <i class="fa-solid fa-thumbs-up me-1"></i> Aprobar
                                </button>
                                <button type="button" class="btn btn-sm btn-danger w-100 extra-small btn-vote-peps" data-pedido="${order.pedidoId}" data-role="${currentRoleKey}" data-vote="false">
                                    <i class="fa-solid fa-thumbs-down me-1"></i> Desaprobar
                                </button>
                            </div>
                        </div>
                    ` : `
                        <!-- PANEL ORGANIZADOR -->
                        <div class="p-2 bg-dark-subtle rounded border extra-small mt-auto">
                            <div class="fw-bold text-dark mb-1"><i class="fa-solid fa-square-poll-vertical me-1"></i> Panel del Organizador:</div>
                            <div class="d-flex justify-content-around my-2 text-center">
                                <div>
                                    <span class="extra-small text-muted d-block">V1 (Prod)</span>
                                    <span class="badge ${voteState.v1 === true ? 'bg-success' : (voteState.v1 === false ? 'bg-danger' : 'bg-secondary')} font-mono">
                                        ${voteState.v1 === true ? '👍 Sí' : (voteState.v1 === false ? '👎 No' : 'Pend')}
                                    </span>
                                </div>
                                <div>
                                    <span class="extra-small text-muted d-block">V2 (Log)</span>
                                    <span class="badge ${voteState.v2 === true ? 'bg-success' : (voteState.v2 === false ? 'bg-danger' : 'bg-secondary')} font-mono">
                                        ${voteState.v2 === true ? '👍 Sí' : (voteState.v2 === false ? '👎 No' : 'Pend')}
                                    </span>
                                </div>
                                <div>
                                    <span class="extra-small text-muted d-block">V3 (Vent)</span>
                                    <span class="badge ${voteState.v3 === true ? 'bg-success' : (voteState.v3 === false ? 'bg-danger' : 'bg-secondary')} font-mono">
                                        ${voteState.v3 === true ? '👍 Sí' : (voteState.v3 === false ? '👎 No' : 'Pend')}
                                    </span>
                                </div>
                            </div>

                            <div class="extra-small mb-2 text-center">
                                ${totalVoted < 3 ? '<span class="text-muted"><i class="fa-solid fa-clock me-1"></i> Esperando votación de 3 validadores...</span>' : ''}
                                ${totalVoted === 3 && qualifiesForProduction ? '<span class="text-success fw-bold"><i class="fa-solid fa-circle-check me-1"></i> APROBABLE (3 Positivos ó 2 Pos + 1 Neg)</span>' : ''}
                                ${totalVoted === 3 && !qualifiesForProduction ? '<span class="text-danger fw-bold"><i class="fa-solid fa-circle-xmark me-1"></i> RECHAZADO POR MAYORÍA</span>' : ''}
                            </div>

                            ${order.estadoPEPS !== 'Aprobado' ? `
                                <button type="button" class="btn btn-sm btn-success w-100 extra-small btn-approve-proceso-dia" data-pedido="${order.pedidoId}">
                                    <i class="fa-solid fa-industry me-1"></i> Pasar a Proceso del Día
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
                    <p class="extra-small m-0">Al validarse las votaciones o transferir el plan analizado, los pedidos aprobados se trasladan directamente aquí.</p>
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
                                <th>Ítems del Pedido</th>
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
                                    <td>
                                        <span class="badge bg-secondary mb-1">${(o.items || []).length} productos</span>
                                        <div class="text-muted extra-small text-truncate" style="max-width: 200px;">
                                            ${(o.items || []).map(i => `${i.cantidad}x ${i.producto}`).join(', ')}
                                        </div>
                                    </td>
                                    <td class="fw-bold font-mono text-dark">Q${o.montoTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                                    <td><span class="badge ${o.tipoCobro === 'Contado' ? 'bg-success' : 'bg-primary'}">${o.tipoCobro}</span></td>
                                    <td><span class="badge bg-success font-mono"><i class="fa-solid fa-circle-check me-1"></i> Aprobado 3 Validadores / Plan</span></td>
                                    <td><span class="badge bg-info text-dark font-mono"><i class="fa-solid fa-gears me-1"></i> En Ensamblado</span></td>
                                    <td>
                                        <button class="btn btn-xs btn-outline-secondary font-mono" onclick="alert('Imprimiendo ficha técnica de fábrica para ${o.pedidoId}')">
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

        // Botón "Generar Sugerido de Plan Analizado"
        const btnSuggested = document.getElementById('btn-generate-suggested-plan');
        if (btnSuggested) {
            btnSuggested.addEventListener('click', () => {
                this.generateSuggestedPlan();
                alert("¡Plan analizado generado con éxito! Las órdenes han sido evaluadas con las reglas activas.");
            });
        }

        // Botón "Pasar Aprobados a Proceso del Día en Bloque"
        const btnTransferBulk = document.getElementById('btn-transfer-bulk-proceso-dia');
        if (btnTransferBulk) {
            btnTransferBulk.addEventListener('click', () => {
                this.transferApprovedToProcesoDia();
            });
        }

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

        // Evento Aprobar Individual para Proceso del Día
        document.querySelectorAll('.btn-approve-proceso-dia').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pedidoId = e.currentTarget.dataset.pedido;
                const boOrders = this.getBOOrders();
                const found = boOrders.find(o => o.pedidoId === pedidoId);
                if (found) {
                    found.estadoPEPS = 'Aprobado';
                    localStorage.setItem("gci_bo_orders", JSON.stringify(boOrders));
                    alert(`Orden ${pedidoId} aprobada y transferida directamente a la pestaña "Proceso del Día".`);
                    this.refreshUI();
                }
            });
        });

        // Modal de Reglas y sus Eventos Dinámicos
        const btnOpenRules = document.getElementById('btn-open-peps-rules-modal');
        const modalRules = document.getElementById('peps-rules-modal');
        const btnCloseRules = document.getElementById('btn-close-peps-rules-modal');
        const btnSaveRules = document.getElementById('btn-save-peps-rules');
        const btnAddRule = document.getElementById('btn-add-peps-rule');
        const btnResetRules = document.getElementById('btn-reset-default-peps-rules');

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

        if (btnAddRule) {
            btnAddRule.addEventListener('click', () => {
                this.collectRulesFromModal();
                this.rules.push({
                    id: `PEPS-R${this.rules.length + 1}`,
                    name: `Nueva Regla ${this.rules.length + 1}`,
                    enabled: true,
                    logic: "AND",
                    conditions: [
                        { field: "montoTotal", operator: ">", value: "10000" }
                    ]
                });
                const container = document.getElementById('peps-rules-builder-container');
                if (container) container.innerHTML = this.renderRulesBuilder();
                this.initRulesModalDynamicEvents();
            });
        }

        if (btnResetRules) {
            btnResetRules.addEventListener('click', () => {
                if (confirm('¿Restablecer las reglas de producción PEPS a los valores predeterminados?')) {
                    this.saveRulesToStorage(DEFAULT_PEPS_RULES);
                    const container = document.getElementById('peps-rules-builder-container');
                    if (container) container.innerHTML = this.renderRulesBuilder();
                    this.initRulesModalDynamicEvents();
                }
            });
        }

        if (btnSaveRules) {
            btnSaveRules.addEventListener('click', () => {
                this.collectRulesFromModal();
                this.saveRulesToStorage(this.rules);
                if (modalRules) modalRules.style.display = 'none';
                alert("Reglas de producción PEPS guardadas exitosamente.");
                this.refreshUI();
            });
        }

        this.initRulesModalDynamicEvents();
    }

    initRulesModalDynamicEvents() {
        // Eliminar Regla
        document.querySelectorAll('.btn-delete-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleIdx = parseInt(e.currentTarget.dataset.ruleIdx, 10);
                this.collectRulesFromModal();
                this.rules.splice(ruleIdx, 1);
                const container = document.getElementById('peps-rules-builder-container');
                if (container) container.innerHTML = this.renderRulesBuilder();
                this.initRulesModalDynamicEvents();
            });
        });

        // Agregar Condición a Regla
        document.querySelectorAll('.btn-add-condition').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleIdx = parseInt(e.currentTarget.dataset.ruleIdx, 10);
                this.collectRulesFromModal();
                this.rules[ruleIdx].conditions = this.rules[ruleIdx].conditions || [];
                this.rules[ruleIdx].conditions.push({ field: "montoTotal", operator: ">", value: "5000" });
                const container = document.getElementById('peps-rules-builder-container');
                if (container) container.innerHTML = this.renderRulesBuilder();
                this.initRulesModalDynamicEvents();
            });
        });

        // Eliminar Condición
        document.querySelectorAll('.btn-delete-condition').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleIdx = parseInt(e.currentTarget.dataset.ruleIdx, 10);
                const condIdx = parseInt(e.currentTarget.dataset.condIdx, 10);
                this.collectRulesFromModal();
                this.rules[ruleIdx].conditions.splice(condIdx, 1);
                const container = document.getElementById('peps-rules-builder-container');
                if (container) container.innerHTML = this.renderRulesBuilder();
                this.initRulesModalDynamicEvents();
            });
        });
    }

    collectRulesFromModal() {
        const cards = document.querySelectorAll('.peps-rule-card');
        const updatedRules = [];

        cards.forEach((card, rIdx) => {
            const enabled = card.querySelector('.rule-enabled-chk').checked;
            const name = card.querySelector('.rule-name-input').value || `Regla ${rIdx + 1}`;
            const logic = card.querySelector('.rule-logic-select').value;

            const condRows = card.querySelectorAll('.condition-row');
            const conditions = [];

            condRows.forEach(row => {
                const field = row.querySelector('.cond-field-select').value;
                const operator = row.querySelector('.cond-op-select').value;
                const value = row.querySelector('.cond-val-input').value;
                conditions.push({ field, operator, value });
            });

            updatedRules.push({
                id: `PEPS-R${rIdx + 1}`,
                name,
                enabled,
                logic,
                conditions
            });
        });

        this.rules = updatedRules;
    }

    refreshUI() {
        const container = document.getElementById('gci-content-area');
        if (container) {
            container.innerHTML = this.render();
            this.initEvents();
        }
    }
}
