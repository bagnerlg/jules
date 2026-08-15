/**
 * GCI ADMIN - Módulo de Agenda de Rutas & Planificación Comercial Waze
 * Ofrece vista de calendario interactivo, agendamiento de visitas, motor de optimización
 * de rutas con mapa Leaflet / OpenStreetMap y alertas de Waze en tiempo real.
 */

import { RouteEngine, GUATEMALA_REGIONS, REFERENCE_LOCATIONS } from './route-engine.js';

export class RoutesModule {
    constructor() {
        this.engine = new RouteEngine();
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.selectedRegion = 'costa_sur';
        this.originType = 'gps'; // 'gps' o 'manual'
        this.manualOrigin = REFERENCE_LOCATIONS[0];
        this.currentGpsCoords = { lat: 14.5800, lng: -90.5400, label: 'Ubicación GPS (Sede Central)' };
        this.currentRoute = null;
        this.map = null;
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
                        <div class="col-md-4">
                            <label class="form-label extra-small fw-bold">1. Selección de Región / Corredor Vial</label>
                            <select id="route-region-select" class="form-select form-control-capsule">
                                ${Object.keys(GUATEMALA_REGIONS).map(key => `
                                    <option value="${key}" ${key === this.selectedRegion ? 'selected' : ''}>
                                        ${GUATEMALA_REGIONS[key].name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="col-md-5">
                            <label class="form-label extra-small fw-bold">2. Punto de Partida del Vendedor (Origen)</label>
                            <div class="input-group input-group-sm">
                                <button id="btn-use-gps" class="btn ${this.originType === 'gps' ? 'btn-primary' : 'btn-outline-secondary'}" style="border-radius: 6px 0 0 6px;">
                                    <i class="fa-solid fa-location-crosshairs me-1"></i> Mi Ubicación (GPS)
                                </button>
                                <select id="route-manual-origin" class="form-select extra-small" ${this.originType === 'gps' ? 'disabled' : ''}>
                                    ${REFERENCE_LOCATIONS.map((loc, idx) => `
                                        <option value="${idx}">${loc.name} (${loc.dept})</option>
                                    `).join('')}
                                </select>
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
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 class="fw-bold m-0 text-dark"><i class="fa-solid fa-map-location-dot me-2 text-primary"></i>Hoja de Ruta & Navegación Waze</h5>
                                    <span class="extra-small text-muted" id="route-subtitle-info">Seleccione una fecha y presione "Planificar Ruta del Día".</span>
                                </div>
                                <div id="waze-badge-container">
                                    <span class="badge bg-info text-dark extra-small"><i class="fa-solid fa-traffic-light me-1"></i> Waze API Lista</span>
                                </div>
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
            <div class="p-2 mb-2 bg-light rounded border-start border-3 border-primary extra-small">
                <div class="fw-bold text-primary">${s.clientName}</div>
                <div class="text-muted">${s.notes || 'Visita acordada'}</div>
            </div>
        `).join('');
    }

    initEvents() {
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

        // Cambio de GPS / Manual
        const btnGps = document.getElementById('btn-use-gps');
        const manualSelect = document.getElementById('route-manual-origin');

        if (btnGps) {
            btnGps.addEventListener('click', () => {
                this.originType = 'gps';
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            this.currentGpsCoords = {
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                                label: 'Mi Ubicación Actual (GPS Live)'
                            };
                            alert(`Ubicación GPS obtenida: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                            this.refreshUI();
                        },
                        () => {
                            alert("No se pudo obtener la ubicación GPS. Usando ubicación base predeterminada.");
                        }
                    );
                }
            });
        }

        if (manualSelect) {
            manualSelect.addEventListener('change', (e) => {
                this.originType = 'manual';
                const idx = parseInt(e.target.value, 10);
                this.manualOrigin = REFERENCE_LOCATIONS[idx];
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

        // Botón Planificar Ruta
        const btnPlan = document.getElementById('btn-plan-route-now');
        if (btnPlan) {
            btnPlan.addEventListener('click', () => {
                this.executeRoutePlanning();
            });
        }

        this.loadLeafletAssets();
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

    executeRoutePlanning() {
        const originCoords = this.originType === 'gps'
            ? { lat: this.currentGpsCoords.lat, lng: this.currentGpsCoords.lng, label: this.currentGpsCoords.label }
            : { lat: this.manualOrigin.lat, lng: this.manualOrigin.lng, label: this.manualOrigin.name };

        this.currentRoute = this.engine.planRoute({
            regionKey: this.selectedRegion,
            originCoords: originCoords,
            targetDateStr: this.selectedDate
        });

        this.renderWaypointsList();
        this.renderMap();
    }

    renderWaypointsList() {
        const container = document.getElementById('waypoints-list-container');
        if (!container || !this.currentRoute) return;

        const subInfo = document.getElementById('route-subtitle-info');
        if (subInfo) {
            subInfo.textContent = `Ruta calculada para ${this.currentRoute.region.name}: ${this.currentRoute.totalWaypoints} paradas, ~${this.currentRoute.totalEstimatedKm} KM estimados desde el punto de partida.`;
        }

        if (this.currentRoute.waypoints.length === 0) {
            container.innerHTML = '<div class="text-center p-4 text-muted extra-small">No hay clientes con criterios de visita para esta región y fecha.</div>';
            return;
        }

        container.innerHTML = `
            <div class="list-group extra-small">
                ${this.currentRoute.waypoints.map(wp => `
                    <div class="list-group-item p-3 mb-2 rounded border ${wp.isAgreed ? 'bg-warning-soft border-warning' : 'bg-white'}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-primary rounded-circle" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">${wp.step}</span>
                                <h6 class="m-0 fw-bold text-dark">${wp.cliente}</h6>
                            </div>
                            <a href="${wp.wazeUrl}" target="_blank" class="btn btn-xs btn-info text-white fw-bold" style="border-radius: 12px; background: #0284c7;">
                                <i class="fa-solid fa-location-arrow me-1"></i> Navegar con Waze
                            </a>
                        </div>

                        <div class="mt-2 text-muted">
                            <i class="fa-solid fa-location-dot text-danger me-1"></i> ${wp.direccion}, ${wp.municipio}, ${wp.departamento}
                            <span class="ms-2 font-mono fw-bold text-dark">(${wp.distanceKm} KM desde origen)</span>
                        </div>

                        <div class="mt-2">
                            ${wp.priorityReasons.map(r => `<span class="badge bg-secondary me-1 mb-1">${r}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMap() {
        const mapContainer = document.getElementById('route-map');
        if (!mapContainer || !window.L || !this.currentRoute) return;

        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        mapContainer.innerHTML = ''; // Limpiar contenedor

        const origin = this.currentRoute.origin;
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
        this.currentRoute.waypoints.forEach(wp => {
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
