/**
 * GCI ADMIN - Módulo de Agenda de Rutas & Planificación Comercial Waze
 * Ofrece vista de calendario interactivo, agendamiento de visitas, motor de optimización
 * de rutas con mapa Leaflet / OpenStreetMap y alertas de Waze en tiempo real.
 */

import { RouteEngine, GUATEMALA_REGIONS, DEFAULT_ORIGIN_LOCATION, GUATEMALA_DEPARTMENTS_MUNICIPALITIES, parseGoogleMapsInput } from './route-engine.js';

const AVAILABLE_RULE_FIELDS = [
    { id: 'diasMoraMax', label: 'Días Máximos de Mora (diasMoraMax)' },
    { id: 'frecuenciaCompraScore', label: 'Score Frecuencia de Compra (frecuenciaCompraScore)' },
    { id: 'garantiasAbiertas', label: 'Órdenes de Garantía Abiertas (garantiasAbiertas)' },
    { id: 'pedidoListoPagoPendiente', label: 'Pedido Listo Pago Pendiente (pedidoListoPagoPendiente)' },
    { id: 'carteraVencidaTotal', label: 'Monto Cartera Vencida (carteraVencidaTotal)' },
    { id: 'diasSinComprar', label: 'Días Sin Comprar (diasSinComprar)' },
    { id: 'ultimoPagoDias', label: 'Días desde Último Pago (ultimoPagoDias)' },
    { id: 'isAgreed', label: 'Visita Acordada Agendada (isAgreed)' },
    { id: 'esIncobrableCandidate', label: 'Candidato a Incobrable (esIncobrableCandidate)' },
    { id: 'departamento', label: 'Departamento (departamento)' },
    { id: 'municipio', label: 'Municipio (municipio)' },
    { id: 'cliente', label: 'Nombre Cliente (cliente)' },
    { id: 'nit', label: 'NIT del Cliente (nit)' }
];

export class RoutesModule {
    constructor() {
        this.engine = new RouteEngine();
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.selectedRegion = 'costa_sur';
        this.originType = 'default'; // 'default', 'gps', 'muni', 'custom_link'
        this.selectedDept = 'Guatemala';
        this.selectedMuni = 'Guatemala (Sede GCI Central)';
        this.customMapsUrl = '';
        this.currentGpsCoords = { lat: 14.5800, lng: -90.5400, label: 'Ubicación GPS Live' };
        this.routesByDate = {}; // { '2026-08-15': [ routeObj1, routeObj2 ] }
        this.activeRouteIndex = 0;
        this.map = null;
        this.tempRules = [];
        this.tempTimeConfig = {};
    }

    openRulesModal() {
        const modal = document.getElementById('route-rules-modal');
        if (!modal) return;

        this.tempRules = this.engine.getRules();
        this.tempTimeConfig = this.engine.getTimeConfig();
        this.renderRulesEditor();
        modal.style.display = 'flex';
    }

    renderRulesEditor() {
        const container = document.getElementById('rules-editor-list-container');
        if (!container) return;

        if (!this.tempRules || this.tempRules.length === 0) {
            container.innerHTML = '<div class="text-muted extra-small">No hay reglas configuradas.</div>';
            return;
        }

        container.innerHTML = this.tempRules.map((rule, rIdx) => `
            <div class="p-3 bg-light rounded border border-secondary-subtle card-rule-item">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 pb-2 border-bottom">
                    <div class="d-flex align-items-center gap-2">
                        <div class="form-check form-switch m-0">
                            <input class="form-check-input rule-toggle-enabled" type="checkbox" data-ridx="${rIdx}" ${rule.enabled ? 'checked' : ''}>
                        </div>
                        <input type="text" class="form-control form-control-sm font-mono fw-bold rule-name-input extra-small" data-ridx="${rIdx}" value="${rule.name || ''}" placeholder="Nombre de la regla..." style="min-width: 250px;">
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <select class="form-select form-select-sm extra-small rule-type-select" data-ridx="${rIdx}" style="width: 140px;">
                            <option value="score" ${rule.type === 'score' ? 'selected' : ''}>Puntuación (+Pts)</option>
                            <option value="strict_filter" ${rule.type === 'strict_filter' ? 'selected' : ''}>Filtro Estricto</option>
                        </select>

                        ${rule.type === 'strict_filter' ? `
                            <select class="form-select form-select-sm extra-small rule-action-select" data-ridx="${rIdx}" style="width: 140px;">
                                <option value="max_limit" ${rule.filterAction === 'max_limit' ? 'selected' : ''}>Límite Máximo N</option>
                                <option value="exclude" ${rule.filterAction === 'exclude' ? 'selected' : ''}>Excluir Cliente</option>
                                <option value="include" ${rule.filterAction === 'include' ? 'selected' : ''}>Incluir Forzado</option>
                            </select>
                            ${rule.filterAction === 'max_limit' ? `
                                <input type="number" class="form-control form-control-sm font-mono extra-small rule-limit-input" data-ridx="${rIdx}" value="${rule.maxLimitValue || 1}" style="width: 60px;" title="Límite máximo por ruta">
                            ` : ''}
                        ` : ''}

                        <div class="d-flex align-items-center gap-1">
                            <span class="extra-small text-muted">Pts:</span>
                            <input type="number" class="form-control form-control-sm font-mono extra-small rule-points-input" data-ridx="${rIdx}" value="${rule.scorePoints || 0}" style="width: 70px;">
                        </div>

                        <select class="form-select form-select-sm extra-small rule-logic-select" data-ridx="${rIdx}" style="width: 80px;" title="Conector lógico entre condiciones">
                            <option value="AND" ${rule.logic === 'AND' ? 'selected' : ''}>Y (AND)</option>
                            <option value="OR" ${rule.logic === 'OR' ? 'selected' : ''}>O (OR)</option>
                        </select>

                        <button type="button" class="btn btn-xs btn-outline-danger btn-delete-rule" data-ridx="${rIdx}" title="Eliminar Regla">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>

                <!-- Condiciones de la Regla -->
                <div class="ps-2">
                    <div class="extra-small fw-bold text-muted mb-1"><i class="fa-solid fa-filter me-1"></i> Condiciones (Evaluación ${rule.logic || 'AND'}):</div>
                    <div class="d-flex flex-column gap-2 mb-2">
                        ${(rule.conditions || []).map((cond, cIdx) => `
                            <div class="d-flex align-items-center gap-2">
                                <select class="form-select form-select-sm extra-small cond-field-select" data-ridx="${rIdx}" data-cidx="${cIdx}">
                                    ${AVAILABLE_RULE_FIELDS.map(f => `
                                        <option value="${f.id}" ${f.id === cond.field ? 'selected' : ''}>${f.label}</option>
                                    `).join('')}
                                </select>

                                <select class="form-select form-select-sm extra-small cond-op-select" data-ridx="${rIdx}" data-cidx="${cIdx}" style="width: 100px;">
                                    <option value=">" ${cond.operator === '>' ? 'selected' : ''}>Mayor (>)</option>
                                    <option value="<" ${cond.operator === '<' ? 'selected' : ''}>Menor (<)</option>
                                    <option value=">=" ${cond.operator === '>=' ? 'selected' : ''}>Mayor/Igual (>=)</option>
                                    <option value="<=" ${cond.operator === '<=' ? 'selected' : ''}>Menor/Igual (<=)</option>
                                    <option value="==" ${cond.operator === '==' ? 'selected' : ''}>Igual (==)</option>
                                    <option value="!=" ${cond.operator === '!=' ? 'selected' : ''}>Diferente (!=)</option>
                                    <option value="contains" ${cond.operator === 'contains' ? 'selected' : ''}>Contiene</option>
                                </select>

                                <input type="text" class="form-control form-control-sm font-mono extra-small cond-val-input" data-ridx="${rIdx}" data-cidx="${cIdx}" value="${cond.value !== undefined ? cond.value : ''}" placeholder="Valor..." style="width: 140px;">

                                ${(rule.conditions || []).length > 1 ? `
                                    <button type="button" class="btn btn-xs btn-outline-danger btn-delete-cond" data-ridx="${rIdx}" data-cidx="${cIdx}" title="Quitar Condición">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>

                    <button type="button" class="btn btn-xs btn-outline-primary btn-add-cond" data-ridx="${rIdx}">
                        <i class="fa-solid fa-plus me-1"></i> Agregar Condición
                    </button>
                </div>
            </div>
        `).join('');

        this.bindRulesEditorEvents();
    }

    bindRulesEditorEvents() {
        const container = document.getElementById('rules-editor-list-container');
        if (!container) return;

        // Toggles ON/OFF
        container.querySelectorAll('.rule-toggle-enabled').forEach(el => {
            el.addEventListener('change', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                this.tempRules[rIdx].enabled = e.target.checked;
            });
        });

        // Nombres de regla
        container.querySelectorAll('.rule-name-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                this.tempRules[rIdx].name = e.target.value;
            });
        });

        // Tipo de Regla
        container.querySelectorAll('.rule-type-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                this.tempRules[rIdx].type = e.target.value;
                this.renderRulesEditor();
            });
        });

        // Acción de filtro estricto
        container.querySelectorAll('.rule-action-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                this.tempRules[rIdx].filterAction = e.target.value;
                this.renderRulesEditor();
            });
        });

        // Límite máximo
        container.querySelectorAll('.rule-limit-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                this.tempRules[rIdx].maxLimitValue = parseInt(e.target.value, 10) || 1;
            });
        });

        // Puntos de prioridad
        container.querySelectorAll('.rule-points-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                this.tempRules[rIdx].scorePoints = parseInt(e.target.value, 10) || 0;
            });
        });

        // Conector Lógico Y / O
        container.querySelectorAll('.rule-logic-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                this.tempRules[rIdx].logic = e.target.value;
                this.renderRulesEditor();
            });
        });

        // Eliminar Regla
        container.querySelectorAll('.btn-delete-rule').forEach(el => {
            el.addEventListener('click', (e) => {
                const rIdx = parseInt(e.currentTarget.dataset.ridx, 10);
                this.tempRules.splice(rIdx, 1);
                this.renderRulesEditor();
            });
        });

        // Campos, operadores y valores de condiciones
        container.querySelectorAll('.cond-field-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                const cIdx = parseInt(e.target.dataset.cidx, 10);
                this.tempRules[rIdx].conditions[cIdx].field = e.target.value;
            });
        });

        container.querySelectorAll('.cond-op-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                const cIdx = parseInt(e.target.dataset.cidx, 10);
                this.tempRules[rIdx].conditions[cIdx].operator = e.target.value;
            });
        });

        container.querySelectorAll('.cond-val-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const rIdx = parseInt(e.target.dataset.ridx, 10);
                const cIdx = parseInt(e.target.dataset.cidx, 10);
                let val = e.target.value;
                if (val === 'true') val = true;
                else if (val === 'false') val = false;
                else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
                this.tempRules[rIdx].conditions[cIdx].value = val;
            });
        });

        // Agregar Condición
        container.querySelectorAll('.btn-add-cond').forEach(el => {
            el.addEventListener('click', (e) => {
                const rIdx = parseInt(e.currentTarget.dataset.ridx, 10);
                if (!this.tempRules[rIdx].conditions) this.tempRules[rIdx].conditions = [];
                this.tempRules[rIdx].conditions.push({
                    field: 'diasMoraMax',
                    operator: '>',
                    value: 0
                });
                this.renderRulesEditor();
            });
        });

        // Eliminar Condición
        container.querySelectorAll('.btn-delete-cond').forEach(el => {
            el.addEventListener('click', (e) => {
                const rIdx = parseInt(e.currentTarget.dataset.ridx, 10);
                const cIdx = parseInt(e.currentTarget.dataset.cidx, 10);
                this.tempRules[rIdx].conditions.splice(cIdx, 1);
                this.renderRulesEditor();
            });
        });
    }

    render() {
        return `
            <div class="module-container routes-module">
                <!-- Barra de Título & Acciones del Módulo -->
                <div class="card header-actions-card mb-4">
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="floating-badge-icon" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #fff;">
                                <i class="fa-solid fa-route" style="font-size: 1.4rem;"></i>
                            </div>
                            <div>
                                <h2 class="m-0 fw-bold title-gradient">Agenda de Rutas & Navegación Waze</h2>
                                <p class="text-muted m-0 small">Planificación inteligente de visitas comerciales por corredores viales de Guatemala</p>
                            </div>
                        </div>

                        <div class="d-flex align-items-center gap-2">
                            <button id="btn-open-rules-config-modal" class="btn btn-capsule btn-outline-primary" style="border-radius: 20px;">
                                <i class="fa-solid fa-sliders me-1"></i> Configurar Parámetros de Rutas
                            </button>
                            <button id="btn-open-schedule-modal" class="btn btn-capsule btn-primary-gradient">
                                <i class="fa-solid fa-calendar-plus me-1"></i> Agendar Visita Acordada
                            </button>
                            <button id="btn-plan-route-now" class="btn btn-capsule btn-success-gradient">
                                <i class="fa-solid fa-wand-magic-sparkles me-1"></i> Planificar Ruta del Día
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Panel de Parámetros de Ruta (Región & Ubicación Origen) -->
                <div class="card p-3 mb-4 route-config-card">
                    <div class="row g-3 align-items-center">
                        <div class="col-md-3">
                            <label class="form-label extra-small fw-bold">1. Corredor Vial / Región</label>
                            <select id="route-region-select" class="form-select form-control-capsule">
                                ${Object.keys(GUATEMALA_REGIONS).map(key => `
                                    <option value="${key}" ${key === this.selectedRegion ? 'selected' : ''}>
                                        ${GUATEMALA_REGIONS[key].name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label extra-small fw-bold d-flex justify-content-between align-items-center">
                                <span>2. Punto de Partida del Vendedor</span>
                                <a href="${DEFAULT_ORIGIN_LOCATION.mapsUrl}" target="_blank" class="extra-small text-primary text-decoration-none" title="Ubicación base predeterminada">
                                    <i class="fa-solid fa-location-dot me-1"></i> Enlace Base GCI
                                </a>
                            </label>
                            <div class="row g-2">
                                <div class="col-6 col-sm-3">
                                    <button id="btn-use-default-origin" class="btn btn-sm w-100 ${this.originType === 'default' ? 'btn-primary' : 'btn-outline-secondary'}" style="border-radius: 6px; font-size: 0.72rem;">
                                        <i class="fa-solid fa-building me-1"></i> Sede GCI
                                    </button>
                                </div>
                                <div class="col-6 col-sm-3">
                                    <button id="btn-use-gps" class="btn btn-sm w-100 ${this.originType === 'gps' ? 'btn-primary' : 'btn-outline-secondary'}" style="border-radius: 6px; font-size: 0.72rem;">
                                        <i class="fa-solid fa-location-crosshairs me-1"></i> GPS Live
                                    </button>
                                </div>
                                <div class="col-6 col-sm-3">
                                    <select id="route-dept-select" class="form-select form-select-sm extra-small" title="Departamento de Salida">
                                        ${Object.keys(GUATEMALA_DEPARTMENTS_MUNICIPALITIES).map(dept => `
                                            <option value="${dept}" ${dept === this.selectedDept ? 'selected' : ''}>${dept}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-6 col-sm-3">
                                    <select id="route-muni-select" class="form-select form-select-sm extra-small" title="Municipio de Salida">
                                        ${(GUATEMALA_DEPARTMENTS_MUNICIPALITIES[this.selectedDept] || []).map(muni => `
                                            <option value="${muni.name}" ${muni.name === this.selectedMuni ? 'selected' : ''}>${muni.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>

                            <!-- Pegar Enlace Personalizado Google Maps -->
                            <div class="mt-2 input-group input-group-sm">
                                <span class="input-group-text bg-light text-muted extra-small"><i class="fa-solid fa-link me-1"></i> Enlace / Maps:</span>
                                <input type="text" id="custom-maps-url-input" class="form-control extra-small" placeholder="https://maps.app.goo.gl/... o coordenadas lat,lng" value="${this.customMapsUrl}">
                                <button id="btn-apply-custom-url" class="btn btn-outline-primary extra-small" type="button">Usar Enlace</button>
                            </div>
                        </div>

                        <div class="col-md-3 text-end">
                            <span class="extra-small text-muted d-block">Fecha Seleccionada</span>
                            <span class="fw-bold font-mono text-primary fs-6" id="lbl-selected-date">${this.selectedDate}</span>
                        </div>
                    </div>
                </div>

                <!-- Layout Principal: Calendario Interactivo + Vista de Ruta y Mapa -->
                <div class="row g-3">
                    <!-- Columna Izquierda: Calendario -->
                    <div class="col-lg-5">
                        <div class="card p-3 h-100 calendar-card">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5 class="fw-bold m-0 text-primary"><i class="fa-solid fa-calendar-days me-2"></i>Calendario Comercial</h5>
                                <input type="date" id="calendar-date-picker" class="form-control form-control-sm font-mono" style="max-width: 150px;" value="${this.selectedDate}">
                            </div>

                            <div class="calendar-month-grid mb-3" id="calendar-grid-container">
                                ${this.renderCalendarGrid()}
                            </div>

                            <div class="scheduled-visits-box border-top pt-3">
                                <h6 class="extra-small fw-bold text-muted uppercase mb-2">Visitas Acordadas Previamente</h6>
                                <div id="scheduled-visits-list">
                                    ${this.renderScheduledVisitsList()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Columna Derecha: Mapa & Detalle de Ruta Ordenada -->
                    <div class="col-lg-7">
                        <div class="card p-3 h-100 route-results-card">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <h5 class="fw-bold m-0 text-dark"><i class="fa-solid fa-map-location-dot me-2 text-primary"></i>Hoja de Ruta & Navegación Waze</h5>
                                    <span class="extra-small text-muted" id="route-subtitle-info">Seleccione una fecha y presione "Planificar Ruta del Día".</span>
                                </div>
                                <div id="waze-badge-container" class="d-flex align-items-center gap-2">
                                    <span class="badge bg-info text-dark extra-small"><i class="fa-solid fa-traffic-light me-1"></i> Waze API Lista</span>
                                </div>
                            </div>

                            <!-- Pestañas de Múltiples Rutas del Día -->
                            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" id="route-tabs-container">
                                ${this.renderRouteTabs()}
                            </div>

                            <!-- Botón de Abrir Ruta Completa con Paradas -->
                            <div class="mb-3" id="full-route-btn-container">
                                ${this.renderFullRouteButton()}
                            </div>

                            <!-- Contenedor del Mapa Leaflet -->
                            <div id="route-map" class="route-map-container mb-3" style="height: 320px; border-radius: 8px; border: 1px solid #cbd5e1; background: #e2e8f0;">
                                <div class="d-flex align-items-center justify-content-center h-100 text-muted extra-small">
                                    <span>Presione "Planificar Ruta del Día" para trazar mapa con OpenStreetMap y Waze.</span>
                                </div>
                            </div>

                            <!-- Lista Ordenada de Puntos de Visita -->
                            <div class="waypoints-container" id="waypoints-list-container">
                                <div class="text-center p-4 text-muted extra-small">
                                    No hay ruta calculada para la fecha seleccionada.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL DE REPORTE DE CUMPLIMIENTO DE VISITA CON FOTO Y PRODUCTOS -->
            <div id="completion-report-modal" class="modal-overlay" style="display: none;">
                <div class="modal-dialog-gci" style="max-width: 600px;">
                    <div class="modal-header-gci">
                        <h3><i class="fa-solid fa-clipboard-check text-success"></i> Reporte de Visita y Cumplimiento</h3>
                        <button id="btn-close-completion-modal" class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body-gci">
                        <form id="form-completion-report">
                            <input type="hidden" id="rep-client-id">
                            <div class="mb-3">
                                <label class="form-label extra-small fw-bold">Cliente Visitado</label>
                                <input type="text" id="rep-client-name" class="form-control form-control-capsule bg-light" readonly>
                            </div>

                            <!-- Carga de Foto del Local del Cliente -->
                            <div class="mb-3">
                                <label class="form-label extra-small fw-bold text-primary"><i class="fa-solid fa-camera me-1"></i> Foto del Local / Fachada del Cliente *</label>
                                <input type="file" id="rep-photo-input" class="form-control form-control-sm" accept="image/*" required>
                                <div class="extra-small text-muted mt-1">Requerido como comprobante físico si no hay GPS activo o comprobante de visita.</div>
                                <div id="rep-photo-preview" class="mt-2 text-center" style="display: none;">
                                    <img id="img-preview" src="" alt="Vista previa" style="max-height: 140px; border-radius: 8px; border: 1px solid #cbd5e1;">
                                </div>
                            </div>

                            <!-- Registro de Productos Nuestros en Tienda -->
                            <div class="p-3 mb-3 bg-light rounded border">
                                <h6 class="extra-small fw-bold text-dark uppercase mb-2"><i class="fa-solid fa-boxes-stacked me-1 text-info"></i> Inventario de Nuestros Productos en Tienda</h6>
                                <div class="row g-2 mb-2">
                                    <div class="col-7">
                                        <label class="extra-small fw-bold">Producto en Exhibición</label>
                                        <input type="text" id="rep-prod-name" class="form-control form-control-sm extra-small" placeholder="Ej: Ropero 2 Puertas L">
                                    </div>
                                    <div class="col-3">
                                        <label class="extra-small fw-bold">Cantidad</label>
                                        <input type="number" id="rep-prod-qty" class="form-control form-control-sm extra-small font-mono" min="1" value="1">
                                    </div>
                                    <div class="col-2 d-flex align-items-end">
                                        <button type="button" id="btn-add-prod-item" class="btn btn-sm btn-primary w-100 extra-small"><i class="fa-solid fa-plus"></i></button>
                                    </div>
                                </div>
                                <div id="rep-products-list" class="extra-small text-muted">
                                    No hay productos agregados al reporte.
                                </div>
                            </div>

                            <!-- Ventas Realizadas en la Semana -->
                            <div class="mb-3">
                                <label class="form-label extra-small fw-bold">¿Se vendió algún producto en la semana?</label>
                                <div class="d-flex gap-3 mb-2">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="soldThisWeek" id="soldYes" value="SI">
                                        <label class="form-check-label extra-small" for="soldYes">Sí, hubo venta</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="soldThisWeek" id="soldNo" value="NO" checked>
                                        <label class="form-check-label extra-small" for="soldNo">No hubo venta</label>
                                    </div>
                                </div>
                                <textarea id="rep-sales-details" class="form-control form-control-capsule" rows="2" placeholder="Detalle de productos vendidos o notas de la venta..."></textarea>
                            </div>

                            <div class="text-end">
                                <button type="button" id="btn-submit-visit-report" class="btn btn-capsule btn-success-gradient">
                                    <i class="fa-solid fa-check-circle me-1"></i> Registrar Parada como Cumplida
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- MODAL DE CONFIGURACIÓN DE PARÁMETROS DE RUTAS Y REGLAS DINÁMICAS -->
            <div id="route-rules-modal" class="modal-overlay" style="display: none;">
                <div class="modal-dialog-gci" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header-gci">
                        <h3><i class="fa-solid fa-sliders text-primary"></i> Configurar Parámetros y Reglas de Rutas</h3>
                        <button id="btn-close-rules-modal" class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body-gci">
                        <!-- Sección 1: Parámetros de Horarios y Distancias -->
                        <div class="p-3 mb-4 bg-light rounded border border-primary-subtle">
                            <h6 class="extra-small fw-bold text-primary uppercase mb-2"><i class="fa-solid fa-business-time me-1"></i> Jornada Laboral & Parámetros de Tiempo (7:00 AM - 5:00 PM)</h6>
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label extra-small fw-bold">Inicio Jornada</label>
                                    <input type="time" id="time-cfg-start" class="form-control form-control-sm font-mono extra-small" value="${(this.engine.getTimeConfig()).workStartHour || '07:00'}">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label extra-small fw-bold">Fin Jornada</label>
                                    <input type="time" id="time-cfg-end" class="form-control form-control-sm font-mono extra-small" value="${(this.engine.getTimeConfig()).workEndHour || '17:00'}">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label extra-small fw-bold">Atención por Visita (Mins)</label>
                                    <input type="number" id="time-cfg-visit-duration" class="form-control form-control-sm font-mono extra-small" min="15" max="120" value="${(this.engine.getTimeConfig()).visitDurationMinutes || 60}" placeholder="Ej: 60 (1 hora)">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label extra-small fw-bold">Distancia Máx Sub-Zona (KM)</label>
                                    <input type="number" id="time-cfg-max-km" class="form-control form-control-sm font-mono extra-small" min="1" max="100" value="${(this.engine.getTimeConfig()).maxConsecutiveDistanceKm || 20}" placeholder="Ej: 20">
                                </div>
                            </div>
                        </div>

                        <!-- Sección 2: Reglas Dinámicas -->
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <p class="text-muted extra-small m-0">Ajuste las reglas dinámicas, active/desactive criterios, configure puntuación de prioridad o filtros estrictos.</p>
                            <div class="d-flex gap-2">
                                <button type="button" id="btn-reset-route-rules" class="btn btn-sm btn-outline-secondary extra-small" style="border-radius: 6px;">
                                    <i class="fa-solid fa-rotate-left me-1"></i> Restablecer Por Defecto
                                </button>
                                <button type="button" id="btn-add-new-rule" class="btn btn-sm btn-primary extra-small" style="border-radius: 6px;">
                                    <i class="fa-solid fa-plus me-1"></i> Nueva Regla
                                </button>
                            </div>
                        </div>

                        <div id="rules-editor-list-container" class="d-flex flex-column gap-3 mb-4">
                            <!-- Se renderiza dinámicamente -->
                        </div>

                        <div class="text-end border-top pt-3">
                            <button type="button" id="btn-save-route-rules" class="btn btn-capsule btn-success-gradient">
                                <i class="fa-solid fa-floppy-disk me-1"></i> Guardar Parámetros de Rutas
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL DE AGENDAR VISITA ACORDADA (REGLA 8) -->
            <div id="schedule-visit-modal" class="modal-overlay" style="display: none;">
                <div class="modal-dialog-gci" style="max-width: 500px;">
                    <div class="modal-header-gci">
                        <h3><i class="fa-solid fa-calendar-plus text-primary"></i> Agendar Visita Acordada</h3>
                        <button id="btn-close-schedule-modal" class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body-gci">
                        <form id="form-schedule-visit">
                            <div class="mb-3">
                                <label class="form-label extra-small fw-bold">Seleccionar Cliente</label>
                                <select id="sch-client-id" class="form-select form-control-capsule" required>
                                    <option value="CLI-7655982">CLI-7655982 - DON LEON - EMPRESAS ASLAN, S.A. (Suchitepéquez)</option>
                                    <option value="CLI-6576974">CLI-6576974 - ELEKTRA DE GUATEMALA (Mazatenango)</option>
                                    <option value="CLI-60895616">CLI-60895616 - JIMMY JHONATÁN ESTRADA (Chiquimula)</option>
                                    <option value="CLI-74853627">CLI-74853627 - JORGE VICTOR, GASPAR LÓPEZ (Quetzaltenango)</option>
                                    <option value="CLI-33550328">CLI-33550328 - JUAN GABRIEL ACEITUNO BARRIENTOS (Villa Nueva)</option>
                                    <option value="CLI-47326905">CLI-47326905 - ALMACENES DON LEÓN RETALHULEU (Retalhuleu)</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label extra-small fw-bold">Fecha de Visita Acordada</label>
                                <input type="date" id="sch-date" class="form-control form-control-capsule font-mono" value="${this.selectedDate}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label extra-small fw-bold">Notas del Acuerdo / Motivo</label>
                                <textarea id="sch-notes" class="form-control form-control-capsule" rows="3" placeholder="Ej: Pago comprometido, entrega directa o revisión de crédito..."></textarea>
                            </div>
                            <div class="text-end">
                                <button type="button" id="btn-save-scheduled-visit" class="btn btn-capsule btn-primary-gradient">
                                    <i class="fa-solid fa-floppy-disk me-1"></i> Guardar Acuerdo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    renderRouteTabs() {
        const routes = this.routesByDate[this.selectedDate] || [];
        if (routes.length === 0) {
            return `<span class="extra-small text-muted font-italic"><i class="fa-solid fa-circle-info me-1"></i> No se han generado rutas para hoy</span>`;
        }

        let tabsHtml = `<div class="btn-group btn-group-sm" role="group">`;
        routes.forEach((r, idx) => {
            const isActive = idx === this.activeRouteIndex;
            tabsHtml += `
                <button type="button" class="btn ${isActive ? 'btn-primary fw-bold' : 'btn-outline-primary'} route-tab-btn" data-index="${idx}" style="font-size: 0.72rem;">
                    <i class="fa-solid fa-route me-1"></i> ${r.title || `Ruta #${idx + 1}`}
                </button>
            `;
        });
        tabsHtml += `</div>`;

        tabsHtml += `
            <div class="d-flex align-items-center gap-1">
                <button id="btn-delete-active-route" class="btn btn-xs btn-outline-danger" style="font-size: 0.72rem; border-radius: 6px;" title="Eliminar la ruta seleccionada">
                    <i class="fa-solid fa-trash-can me-1"></i> Eliminar Ruta
                </button>
            </div>
        `;

        return tabsHtml;
    }

    renderFullRouteButton() {
        const activeRoute = this.getActiveRoute();
        if (!activeRoute || !activeRoute.waypoints || activeRoute.waypoints.length === 0) {
            return '';
        }

        const originStr = `${activeRoute.origin.lat},${activeRoute.origin.lng}`;
        const destinationWp = activeRoute.waypoints[activeRoute.waypoints.length - 1];
        const destinationStr = `${destinationWp.lat},${destinationWp.lng}`;

        // Construir waypoints intermedios para Google Maps
        const waypointsStr = activeRoute.waypoints.slice(0, activeRoute.waypoints.length - 1)
            .map(w => `${w.lat},${w.lng}`).join('|');

        const fullGmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destinationStr}&waypoints=${waypointsStr}&travelmode=driving`;
        const firstWazeUrl = activeRoute.waypoints[0].wazeUrl;

        return `
            <div class="d-flex flex-wrap align-items-center gap-2 p-2 bg-light rounded border border-info">
                <span class="extra-small fw-bold text-dark"><i class="fa-solid fa-diamond-turn-right text-primary me-1"></i> Navegación de Ruta Completa (${activeRoute.waypoints.length} paradas):</span>
                <a href="${fullGmapsUrl}" target="_blank" class="btn btn-xs btn-primary fw-bold" style="border-radius: 6px; font-size: 0.72rem;">
                    <i class="fa-solid fa-map-location-dot me-1"></i> Abrir Ruta Completa (Google Maps Multiparada)
                </a>
                <a href="${firstWazeUrl}" target="_blank" class="btn btn-xs btn-info text-white fw-bold" style="border-radius: 6px; font-size: 0.72rem; background: #0284c7;">
                    <i class="fa-solid fa-location-arrow me-1"></i> Iniciar Parada #1 en Waze
                </a>
            </div>
        `;
    }

    renderCalendarGrid() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let html = '<div class="calendar-days-grid d-grid" style="grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;">';
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        dayNames.forEach(d => {
            html += `<div class="extra-small fw-bold text-muted py-1">${d}</div>`;
        });

        const scheduled = this.engine.getScheduledVisits();

        for (let day = 1; day <= daysInMonth; day++) {
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dayStr === this.selectedDate;
            const hasAgreements = scheduled.some(s => s.date === dayStr);

            html += `
                <button class="calendar-day-btn btn btn-sm ${isSelected ? 'btn-primary fw-bold' : 'btn-light'} ${hasAgreements ? 'border-primary' : ''}"
                        data-date="${dayStr}" style="padding: 6px 2px; font-size: 0.78rem; position: relative;">
                    ${day}
                    ${hasAgreements ? '<span class="position-absolute top-0 start-100 translate-middle p-1 bg-warning border border-light rounded-circle"></span>' : ''}
                </button>
            `;
        }

        html += '</div>';
        return html;
    }

    renderScheduledVisitsList() {
        const scheduled = this.engine.getScheduledVisits().filter(s => s.date === this.selectedDate);

        if (scheduled.length === 0) {
            return '<div class="text-muted extra-small">No hay acuerdos para esta fecha.</div>';
        }

        return scheduled.map(s => `
            <div class="p-2 mb-2 bg-light rounded border-start border-3 border-primary extra-small d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold text-primary">${s.clientName}</div>
                    <div class="text-muted">${s.notes || 'Visita acordada'}</div>
                </div>
                <button class="btn btn-xs btn-outline-danger btn-delete-scheduled-visit ms-2" data-visit-id="${s.id}" title="Eliminar visita acordada">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `).join('');
    }

    openCompletionModal(clientId, clientName) {
        const modal = document.getElementById('completion-report-modal');
        if (!modal) return;

        document.getElementById('rep-client-id').value = clientId;
        document.getElementById('rep-client-name').value = clientName;
        document.getElementById('rep-photo-input').value = '';
        document.getElementById('rep-photo-preview').style.display = 'none';
        document.getElementById('rep-prod-name').value = '';
        document.getElementById('rep-prod-qty').value = '1';
        document.getElementById('rep-sales-details').value = '';
        document.getElementById('soldNo').checked = true;

        this.currentReportProducts = [];
        this.renderReportProductsList();

        modal.style.display = 'flex';
    }

    renderReportProductsList() {
        const listContainer = document.getElementById('rep-products-list');
        if (!listContainer) return;

        if (!this.currentReportProducts || this.currentReportProducts.length === 0) {
            listContainer.innerHTML = '<span class="text-muted font-italic">No hay productos agregados.</span>';
            return;
        }

        listContainer.innerHTML = `
            <div class="d-flex flex-wrap gap-1">
                ${this.currentReportProducts.map((p, idx) => `
                    <span class="badge bg-secondary d-flex align-items-center gap-1">
                        ${p.name} (${p.qty})
                        <button type="button" class="btn-close btn-close-white btn-remove-rep-prod" data-index="${idx}" style="font-size: 0.55rem;"></button>
                    </span>
                `).join('')}
            </div>
        `;

        listContainer.querySelectorAll('.btn-remove-rep-prod').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                this.currentReportProducts.splice(idx, 1);
                this.renderReportProductsList();
            });
        });
    }

    initEvents() {
        // Modal de Configurar Parámetros de Rutas
        const btnOpenRules = document.getElementById('btn-open-rules-config-modal');
        const modalRules = document.getElementById('route-rules-modal');
        const btnCloseRules = document.getElementById('btn-close-rules-modal');
        const btnSaveRules = document.getElementById('btn-save-route-rules');
        const btnResetRules = document.getElementById('btn-reset-route-rules');
        const btnAddNewRule = document.getElementById('btn-add-new-rule');

        if (btnOpenRules && modalRules) {
            btnOpenRules.addEventListener('click', () => {
                this.openRulesModal();
            });
        }

        if (btnCloseRules && modalRules) {
            btnCloseRules.addEventListener('click', () => {
                modalRules.style.display = 'none';
            });
        }

        if (btnSaveRules) {
            btnSaveRules.addEventListener('click', () => {
                const startTime = document.getElementById('time-cfg-start')?.value || '07:00';
                const endTime = document.getElementById('time-cfg-end')?.value || '17:00';
                const visitDuration = parseInt(document.getElementById('time-cfg-visit-duration')?.value, 10) || 60;
                const maxKm = parseInt(document.getElementById('time-cfg-max-km')?.value, 10) || 20;

                this.engine.saveTimeConfig({
                    workStartHour: startTime,
                    workEndHour: endTime,
                    visitDurationMinutes: visitDuration,
                    maxConsecutiveDistanceKm: maxKm
                });

                this.engine.saveRules(this.tempRules);
                if (modalRules) modalRules.style.display = 'none';
                alert("Parámetros y reglas de rutas guardados exitosamente.");
            });
        }

        if (btnResetRules) {
            btnResetRules.addEventListener('click', () => {
                if (confirm("¿Desea restablecer las reglas de rutas a la configuración por defecto?")) {
                    this.tempRules = this.engine.resetRulesToDefault();
                    this.renderRulesEditor();
                    alert("Reglas restablecidas a los parámetros predeterminados.");
                }
            });
        }

        if (btnAddNewRule) {
            btnAddNewRule.addEventListener('click', () => {
                const newId = 'RULE-' + (this.tempRules.length + 1) + '-' + Date.now().toString().slice(-4);
                this.tempRules.push({
                    id: newId,
                    name: `Nueva Regla #${this.tempRules.length + 1}`,
                    type: 'score',
                    enabled: true,
                    scorePoints: 100,
                    logic: 'AND',
                    conditions: [
                        { field: 'diasMoraMax', operator: '>', value: 30 }
                    ]
                });
                this.renderRulesEditor();
            });
        }

        // Modal de Reporte de Cumplimiento
        const modalComp = document.getElementById('completion-report-modal');
        const btnCloseComp = document.getElementById('btn-close-completion-modal');
        const btnAddProd = document.getElementById('btn-add-prod-item');
        const photoInput = document.getElementById('rep-photo-input');
        const btnSubmitComp = document.getElementById('btn-submit-visit-report');

        if (btnCloseComp && modalComp) {
            btnCloseComp.addEventListener('click', () => {
                modalComp.style.display = 'none';
            });
        }

        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const img = document.getElementById('img-preview');
                        if (img) img.src = evt.target.result;
                        const preview = document.getElementById('rep-photo-preview');
                        if (preview) preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (btnAddProd) {
            btnAddProd.addEventListener('click', () => {
                const name = document.getElementById('rep-prod-name').value.trim();
                const qty = parseInt(document.getElementById('rep-prod-qty').value, 10) || 1;
                if (name) {
                    if (!this.currentReportProducts) this.currentReportProducts = [];
                    this.currentReportProducts.push({ name, qty });
                    document.getElementById('rep-prod-name').value = '';
                    document.getElementById('rep-prod-qty').value = '1';
                    this.renderReportProductsList();
                }
            });
        }

        if (btnSubmitComp) {
            btnSubmitComp.addEventListener('click', () => {
                const clientId = document.getElementById('rep-client-id').value;
                const photoInputElem = document.getElementById('rep-photo-input');

                if (!photoInputElem.files || photoInputElem.files.length === 0) {
                    alert("Por favor adjunte la foto del local/fachada del cliente como comprobante de visita.");
                    return;
                }

                const soldThisWeek = document.querySelector('input[name="soldThisWeek"]:checked').value;
                const salesDetails = document.getElementById('rep-sales-details').value;

                const reportData = {
                    photoAttached: true,
                    products: this.currentReportProducts || [],
                    soldThisWeek: soldThisWeek,
                    salesDetails: salesDetails
                };

                this.engine.saveVisitCompletion(this.selectedDate, clientId, reportData);
                modalComp.style.display = 'none';
                this.renderWaypointsList();
                this.renderMap();
            });
        }

        // Modal de Agendar Visita
        const btnOpenSchedule = document.getElementById('btn-open-schedule-modal');
        const modalSchedule = document.getElementById('schedule-visit-modal');
        const btnCloseSchedule = document.getElementById('btn-close-schedule-modal');

        if (btnOpenSchedule && modalSchedule) {
            btnOpenSchedule.addEventListener('click', () => {
                modalSchedule.style.display = 'flex';
            });
        }

        if (btnCloseSchedule && modalSchedule) {
            btnCloseSchedule.addEventListener('click', () => {
                modalSchedule.style.display = 'none';
            });
        }

        // Guardar Visita Acordada
        const btnSaveSchedule = document.getElementById('btn-save-scheduled-visit');
        if (btnSaveSchedule) {
            btnSaveSchedule.addEventListener('click', () => {
                const clientId = document.getElementById('sch-client-id').value;
                const clientSelect = document.getElementById('sch-client-id');
                const clientName = clientSelect.options[clientSelect.selectedIndex].text;
                const date = document.getElementById('sch-date').value;
                const notes = document.getElementById('sch-notes').value;

                this.engine.addScheduledVisit({ clientId, clientName, date, notes });
                modalSchedule.style.display = 'none';
                this.refreshUI();
            });
        }

        // Selector de Región
        const regionSelect = document.getElementById('route-region-select');
        if (regionSelect) {
            regionSelect.addEventListener('change', (e) => {
                this.selectedRegion = e.target.value;
            });
        }

        // Selección de Origen por Defecto Sede GCI
        const btnDefault = document.getElementById('btn-use-default-origin');
        if (btnDefault) {
            btnDefault.addEventListener('click', () => {
                this.originType = 'default';
                this.refreshUI();
            });
        }

        // Selección de Origen GPS Live
        const btnGps = document.getElementById('btn-use-gps');
        if (btnGps) {
            btnGps.addEventListener('click', () => {
                this.originType = 'gps';
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            this.currentGpsCoords = {
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                                label: `Mi Ubicación Actual (GPS Live: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
                            };
                            alert(`Ubicación GPS obtenida: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                            this.refreshUI();
                        },
                        () => {
                            alert(`No se pudo obtener el GPS. Se utilizará la ubicación por defecto Sede Central GCI (${DEFAULT_ORIGIN_LOCATION.mapsUrl}).`);
                            this.originType = 'default';
                            this.refreshUI();
                        }
                    );
                } else {
                    this.refreshUI();
                }
            });
        }

        // Selección de Origen por Departamento y Municipio
        const deptSelect = document.getElementById('route-dept-select');
        const muniSelect = document.getElementById('route-muni-select');

        if (deptSelect) {
            deptSelect.addEventListener('change', (e) => {
                this.originType = 'muni';
                this.selectedDept = e.target.value;
                const munis = GUATEMALA_DEPARTMENTS_MUNICIPALITIES[this.selectedDept] || [];
                this.selectedMuni = munis.length > 0 ? munis[0].name : '';
                this.refreshUI();
            });
        }

        if (muniSelect) {
            muniSelect.addEventListener('change', (e) => {
                this.originType = 'muni';
                this.selectedMuni = e.target.value;
            });
        }

        // Date picker y botones de calendario
        const picker = document.getElementById('calendar-date-picker');
        if (picker) {
            picker.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                this.refreshUI();
            });
        }

        document.querySelectorAll('.calendar-day-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedDate = btn.dataset.date;
                this.refreshUI();
            });
        });

        // Aplicar Enlace Personalizado de Google Maps
        const btnCustomUrl = document.getElementById('btn-apply-custom-url');
        if (btnCustomUrl) {
            btnCustomUrl.addEventListener('click', () => {
                const val = document.getElementById('custom-maps-url-input').value.trim();
                if (val) {
                    this.originType = 'custom_link';
                    this.customMapsUrl = val;
                    alert("Enlace de origen personalizado aplicado.");
                    this.refreshUI();
                }
            });
        }

        // Botón Planificar Ruta
        const btnPlan = document.getElementById('btn-plan-route-now');
        if (btnPlan) {
            btnPlan.addEventListener('click', () => {
                this.executeRoutePlanning();
            });
        }

        // Pestañas de Selección de Ruta
        document.querySelectorAll('.route-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeRouteIndex = parseInt(btn.dataset.index, 10);
                this.renderWaypointsList();
                this.renderMap();
                this.refreshTabsUI();
            });
        });

        // Eliminar Ruta Activa del Día
        const btnDeleteRoute = document.getElementById('btn-delete-active-route');
        if (btnDeleteRoute) {
            btnDeleteRoute.addEventListener('click', () => {
                this.deleteActiveRoute();
            });
        }

        // Eliminar Visita Acordada Previamente
        document.querySelectorAll('.btn-delete-scheduled-visit').forEach(btn => {
            btn.addEventListener('click', () => {
                const visitId = btn.dataset.visitId;
                this.engine.deleteScheduledVisit(visitId);
                this.refreshUI();
            });
        });

        this.loadLeafletAssets();
    }

    refreshTabsUI() {
        const container = document.getElementById('route-tabs-container');
        if (container) {
            container.innerHTML = this.renderRouteTabs();
            // Re-vincular eventos de pestañas
            document.querySelectorAll('.route-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.activeRouteIndex = parseInt(btn.dataset.index, 10);
                    this.renderWaypointsList();
                    this.renderMap();
                    this.refreshTabsUI();
                });
            });

            const btnDeleteRoute = document.getElementById('btn-delete-active-route');
            if (btnDeleteRoute) {
                btnDeleteRoute.addEventListener('click', () => {
                    this.deleteActiveRoute();
                });
            }
        }

        const fullRouteContainer = document.getElementById('full-route-btn-container');
        if (fullRouteContainer) {
            fullRouteContainer.innerHTML = this.renderFullRouteButton();
        }
    }

    loadLeafletAssets() {
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        if (!window.L) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                console.log("Leaflet.js cargado correctamente.");
            };
            document.head.appendChild(script);
        }
    }

    async executeRoutePlanning() {
        let originCoords;

        if (this.originType === 'custom_link' && this.customMapsUrl) {
            originCoords = parseGoogleMapsInput(this.customMapsUrl);
        } else if (this.originType === 'default') {
            originCoords = {
                lat: DEFAULT_ORIGIN_LOCATION.lat,
                lng: DEFAULT_ORIGIN_LOCATION.lng,
                label: `${DEFAULT_ORIGIN_LOCATION.name} (${DEFAULT_ORIGIN_LOCATION.mapsUrl})`,
                mapsUrl: DEFAULT_ORIGIN_LOCATION.mapsUrl
            };
        } else if (this.originType === 'gps') {
            originCoords = {
                lat: this.currentGpsCoords.lat,
                lng: this.currentGpsCoords.lng,
                label: this.currentGpsCoords.label
            };
        } else {
            const munis = GUATEMALA_DEPARTMENTS_MUNICIPALITIES[this.selectedDept] || [];
            const foundMuni = munis.find(m => m.name === this.selectedMuni) || munis[0] || DEFAULT_ORIGIN_LOCATION;
            originCoords = {
                lat: foundMuni.lat,
                lng: foundMuni.lng,
                label: `Municipio de Salida: ${foundMuni.name}, ${this.selectedDept}`
            };
        }

        const newRoute = this.engine.planRoute({
            regionKey: this.selectedRegion,
            originCoords: originCoords,
            targetDateStr: this.selectedDate
        });

        if (!this.routesByDate[this.selectedDate]) {
            this.routesByDate[this.selectedDate] = [];
        }

        const routeNum = this.routesByDate[this.selectedDate].length + 1;
        newRoute.title = `Ruta #${routeNum} (${newRoute.region.name.split('/')[0].trim()})`;
        newRoute.isOriginal = true; // Ruta autogenerada del sistema

        // Consultar Waze API Driving Directions para la primera parada o segmento
        if (newRoute.waypoints.length > 0) {
            const firstWp = newRoute.waypoints[0];
            const wazeRes = await this.engine.fetchWazeDrivingDirections(newRoute.origin, firstWp);
            if (wazeRes.status === 'OK' && wazeRes.routes.length > 0) {
                newRoute.wazeApiData = wazeRes.routes[0];
            }
        }

        this.routesByDate[this.selectedDate].push(newRoute);
        this.activeRouteIndex = this.routesByDate[this.selectedDate].length - 1;

        this.refreshTabsUI();
        this.renderWaypointsList();
        this.renderMap();
    }

    getActiveRoute() {
        const routes = this.routesByDate[this.selectedDate] || [];
        if (routes.length === 0) return null;
        if (this.activeRouteIndex >= routes.length) {
            this.activeRouteIndex = routes.length - 1;
        }
        return routes[this.activeRouteIndex] || null;
    }

    deleteActiveRoute() {
        const routes = this.routesByDate[this.selectedDate] || [];
        if (routes.length === 0) return;

        routes.splice(this.activeRouteIndex, 1);
        if (this.activeRouteIndex >= routes.length) {
            this.activeRouteIndex = Math.max(0, routes.length - 1);
        }

        this.refreshTabsUI();
        this.renderWaypointsList();
        this.renderMap();
    }

    removeClientFromActiveRoute(clientId) {
        const activeRoute = this.getActiveRoute();
        if (!activeRoute) return;

        // Si es la ruta original autogenerada del sistema, creamos una copia de ruta editada para el vendedor
        let routeToModify = activeRoute;
        if (activeRoute.isOriginal) {
            const routes = this.routesByDate[this.selectedDate];
            const editedNum = routes.length + 1;
            const routeCopy = JSON.parse(JSON.stringify(activeRoute));
            routeCopy.title = `Ruta Personalizada #${editedNum}`;
            routeCopy.isOriginal = false;

            routes.push(routeCopy);
            this.activeRouteIndex = routes.length - 1;
            routeToModify = routeCopy;
        }

        // Filtrar el cliente quitado
        routeToModify.waypoints = routeToModify.waypoints.filter(wp => wp.id !== clientId);

        // Recalcular distancias, orden numerado de paradas y enlaces en tiempo real
        routeToModify.waypoints.forEach((wp, idx) => {
            wp.step = idx + 1;
            const dist = this.engine.calculateHaversineDistance(
                routeToModify.origin.lat, routeToModify.origin.lng, wp.lat, wp.lng
            );
            wp.distanceKm = parseFloat(dist.toFixed(2));
            wp.wazeUrl = `https://www.waze.com/live-map/directions?from=ll.${routeToModify.origin.lat}%2C${routeToModify.origin.lng}&to=ll.${wp.lat}%2C${wp.lng}`;
            wp.wazeAppUrl = `https://www.waze.com/ul?ll=${wp.lat}%2C${wp.lng}&navigate=yes`;
            wp.mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${routeToModify.origin.lat},${routeToModify.origin.lng}&destination=${wp.lat},${wp.lng}&travelmode=driving`;
        });

        routeToModify.totalWaypoints = routeToModify.waypoints.length;
        routeToModify.totalEstimatedKm = parseFloat(
            routeToModify.waypoints.reduce((sum, w) => sum + w.distanceKm, 0).toFixed(1)
        );

        this.refreshTabsUI();
        this.renderWaypointsList();
        this.renderMap();
    }

    renderWaypointsList() {
        const container = document.getElementById('waypoints-list-container');
        const activeRoute = this.getActiveRoute();
        if (!container) return;

        const subInfo = document.getElementById('route-subtitle-info');

        if (!activeRoute || activeRoute.waypoints.length === 0) {
            if (subInfo) {
                subInfo.textContent = 'Seleccione una fecha y presione "Planificar Ruta del Día".';
            }
            container.innerHTML = '<div class="text-center p-4 text-muted extra-small">No hay paradas en la ruta seleccionada.</div>';
            return;
        }

        if (subInfo) {
            let wazeTxt = '';
            if (activeRoute.wazeApiData) {
                const durMin = activeRoute.wazeApiData.duration ? Math.round(activeRoute.wazeApiData.duration / 60) : null;
                if (durMin) wazeTxt = ` | Waze API Tiempo Est. Parada 1: ~${durMin} min`;
            }
            subInfo.textContent = `${activeRoute.title}: ${activeRoute.totalWaypoints} paradas, ~${activeRoute.totalEstimatedKm} KM estimados desde origen.${wazeTxt}`;
        }

        const completions = this.engine.getCompletions();

        let alertSuggestionHtml = '';
        if (activeRoute.suggestionMsg) {
            alertSuggestionHtml = `
                <div class="alert alert-warning border-warning p-2 mb-3 rounded extra-small d-flex align-items-center gap-2">
                    <i class="fa-solid fa-clock-triangle-exclamation fs-5 text-warning"></i>
                    <div>
                        <strong class="d-block text-dark">Aviso de Ventana de Trabajo (7:00 AM - 5:00 PM):</strong>
                        <span>${activeRoute.suggestionMsg}</span>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            ${alertSuggestionHtml}
            <div class="list-group extra-small">
                ${activeRoute.waypoints.map(wp => {
                    const isCompleted = this.engine.isVisitCompleted(this.selectedDate, wp.id);
                    const compData = completions[`${this.selectedDate}_${wp.id}`];

                    return `
                        <div class="list-group-item p-3 mb-2 rounded border ${isCompleted ? 'bg-success-subtle border-success' : (wp.isAgreed ? 'bg-warning-soft border-warning' : 'bg-white')}">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge ${isCompleted ? 'bg-success' : 'bg-primary'} rounded-circle" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">${wp.step}</span>
                                    <div>
                                        <h6 class="m-0 fw-bold text-dark d-flex flex-wrap align-items-center gap-2">
                                            ${wp.cliente}
                                            <span class="badge bg-secondary font-mono" style="font-size: 0.65rem;"><i class="fa-solid fa-layer-group me-1"></i> Sub-Zona: ${wp.subZona || wp.municipio}</span>
                                            <span class="badge bg-primary-subtle text-primary font-mono fw-bold" style="font-size: 0.65rem;"><i class="fa-solid fa-clock me-1"></i> Horario: ${wp.timeWindow || '07:00 - 08:00'}</span>
                                            ${isCompleted ? '<span class="badge bg-success font-mono"><i class="fa-solid fa-circle-check me-1"></i> Parada Cumplida</span>' : ''}
                                        </h6>
                                    </div>
                                </div>
                                <div class="mt-1 d-flex flex-wrap align-items-center gap-2 text-muted font-mono extra-small">
                                    <span>Llegada Real: <input type="time" class="form-control form-control-sm font-mono extra-small d-inline-block wp-actual-arrival" data-wpid="${wp.id}" value="${wp.actualArrival || wp.estimatedArrival || '07:00'}" style="width: 90px; padding: 2px 4px;"></span>
                                    <span>Salida Real: <input type="time" class="form-control form-control-sm font-mono extra-small d-inline-block wp-actual-departure" data-wpid="${wp.id}" value="${wp.actualDeparture || wp.estimatedDeparture || '08:00'}" style="width: 90px; padding: 2px 4px;"></span>
                                </div>
                                <div class="d-flex align-items-center gap-1">
                                    ${!isCompleted ? `
                                        <button class="btn btn-xs btn-success text-white fw-bold btn-open-completion-modal" data-client-id="${wp.id}" data-client-name="${wp.cliente}" style="border-radius: 12px;" title="Registrar cumplimiento de parada">
                                            <i class="fa-solid fa-check me-1"></i> Cumplido
                                        </button>
                                    ` : ''}
                                    <a href="${wp.wazeUrl}" target="_blank" class="btn btn-xs btn-info text-white fw-bold" style="border-radius: 12px; background: #0284c7;">
                                        <i class="fa-solid fa-location-arrow me-1"></i> Waze
                                    </a>
                                    <button class="btn btn-xs btn-outline-danger btn-remove-client-from-route" data-client-id="${wp.id}" title="Quitar cliente de esta ruta">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="mt-2 text-muted">
                                <i class="fa-solid fa-location-dot text-danger me-1"></i> ${wp.direccion}, ${wp.municipio}, ${wp.departamento}
                                <span class="ms-2 font-mono fw-bold text-dark">(${wp.distanceKm} KM desde origen)</span>
                                <div class="extra-small text-info mt-1 font-mono">
                                    <i class="fa-solid fa-route me-1"></i> Origen Waze: <code>${activeRoute.origin.lat.toFixed(4)},${activeRoute.origin.lng.toFixed(4)}</code> &rarr; Destino Waze: <code>${wp.lat.toFixed(4)},${wp.lng.toFixed(4)}</code>
                                </div>
                            </div>

                            ${isCompleted && compData ? `
                                <div class="mt-2 p-2 bg-white rounded border border-success-subtle extra-small text-dark">
                                    <div class="fw-bold text-success"><i class="fa-solid fa-camera me-1"></i> Reporte de Visita Registrado:</div>
                                    <div class="text-muted">Productos nuestros en tienda: <b>${compData.products ? compData.products.map(p => `${p.name} (${p.qty})`).join(', ') : 'Ninguno registrado'}</b></div>
                                    <div class="text-muted">Venta en la semana: <b>${compData.soldThisWeek}</b> ${compData.salesDetails ? `(${compData.salesDetails})` : ''}</div>
                                </div>
                            ` : ''}

                            <div class="mt-2">
                                ${wp.priorityReasons.map(r => `<span class="badge bg-secondary me-1 mb-1">${r}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Eventos para botones de quitar cliente individual
        container.querySelectorAll('.btn-remove-client-from-route').forEach(btn => {
            btn.addEventListener('click', () => {
                const clientId = btn.dataset.clientId;
                this.removeClientFromActiveRoute(clientId);
            });
        });

        // Eventos para abrir modal de reporte de cumplimiento
        container.querySelectorAll('.btn-open-completion-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const clientId = btn.dataset.clientId;
                const clientName = btn.dataset.clientName;
                this.openCompletionModal(clientId, clientName);
            });
        });
    }

    renderMap() {
        const mapContainer = document.getElementById('route-map');
        const activeRoute = this.getActiveRoute();

        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        if (!mapContainer || !window.L) return;

        mapContainer.innerHTML = ''; // Limpiar mapa

        if (!activeRoute || activeRoute.waypoints.length === 0) {
            mapContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center h-100 text-muted extra-small">
                    <span>Mapa sin puntos trazados para la ruta seleccionada.</span>
                </div>
            `;
            return;
        }

        const origin = activeRoute.origin;
        this.map = L.map('route-map').setView([origin.lat, origin.lng], 9);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors | Waze Live Data'
        }).addTo(this.map);

        // Marcador del Punto de Partida
        L.marker([origin.lat, origin.lng])
            .addTo(this.map)
            .bindPopup(`<b>Punto de Partida (Origen)</b><br>${origin.label}`)
            .openPopup();

        const latLngs = [[origin.lat, origin.lng]];

        // Marcadores numerados de Clientes
        activeRoute.waypoints.forEach(wp => {
            latLngs.push([wp.lat, wp.lng]);
            L.marker([wp.lat, wp.lng])
                .addTo(this.map)
                .bindPopup(`
                    <b>Parada ${wp.step}: ${wp.cliente}</b><br>
                    ${wp.direccion}<br>
                    <a href="${wp.wazeUrl}" target="_blank" class="text-primary font-weight-bold">Abrir en App Waze</a>
                `);
        });

        // Trazar línea de ruta
        L.polyline(latLngs, { color: '#2563eb', weight: 4, opacity: 0.8 }).addTo(this.map);
    }

    refreshUI() {
        const container = document.getElementById('gci-content-area');
        if (container) {
            container.innerHTML = this.render();
            this.initEvents();
        }
    }
}
