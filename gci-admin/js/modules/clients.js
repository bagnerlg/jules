/**
 * Módulo de Clientes (Socios de Negocios - SAP Business One / Supabase)
 * Gestiona la información completa de clientes, contactos, direcciones,
 * condiciones de pago, datos bancarios y finanzas.
 */

const STORAGE_KEY = 'gci_clients';

// Datos de ejemplo iniciales si no existen registros
const INITIAL_CLIENTS = [
    {
        id: 'CLI-72436190',
        codigo: '72436190',
        tipoCodigo: 'Manual',
        tipoSN: 'Cliente',
        nombre: 'Claudia Torres',
        nombreExtranjero: 'Claudia Torres Int',
        grupoCanal: 'CLAN 1',
        moneda: 'Quetzales',
        rfc: '000000000000',
        saldoCuenta: '0.00',
        entregas: '0.00',
        pedidosClientes: '3447.00',
        oportunidades: '0.00',
        general: {
            telefono1: '56629815',
            telefono2: '41437870',
            telefonoMovil: '56629815',
            fax: '',
            email: 'claudia.torres@ejemplo.com',
            sitioWeb: '',
            centroDistribucion: 'CENTRAL',
            claveAcceso: 'CLAVE-72436',
            indicadorFactoring: '',
            proyectoSN: '',
            industria: '',
            tipoSocioNegocios: 'Sociedades',
            nombreAlias: 'Claudia T.',
            personaContacto: 'Claudia Torres',
            dpi: '1234567890101',
            nitParaFacturas: '72436190',
            comentarios: 'Cliente preferencial de canal clan 1',
            vendedor: 'PAOLA SOLIS',
            codigoCanalSN: '',
            tecnico: '',
            territorio: 'Guatemala Sur',
            gln: '',
            estadoCliente: 'Activo',
            bloquearMarketing: false
        },
        contactos: [
            {
                idContacto: 'CONT-01',
                nombre: 'Claudia',
                segundoNombre: '',
                apellido: 'Torres',
                titulo: 'Ingeniera',
                posicion: 'Gerente General',
                direccion: 'Zona 6 Villa Nueva',
                telefono1: '56629815',
                telefono2: '41437870',
                telefonoMovil: '56629815',
                fax: '',
                email: 'claudia.torres@ejemplo.com',
                grupoEmail: 'General',
                pager: '',
                observaciones1: 'Contacto principal',
                observaciones2: '',
                claveAcceso: '',
                ciudadNacimiento: 'Guatemala',
                bloquearMarketing: false,
                activo: true
            }
        ],
        direcciones: [
            {
                id: 'DIR-01',
                tipo: 'Destinatario de factura',
                nombreDireccion: 'Villa Nueva - Central',
                municipio: 'Villa Nueva',
                direccion2: '',
                direccion3: '',
                direccionFel: '2da. Calle 5-69 zona 6, Villa Nueva',
                colonia: 'Zona 6',
                codigoPostal: '01064',
                condado: 'Guatemala',
                estado: 'Guatemala',
                pais: 'Guatemala',
                esEstandar: true
            },
            {
                id: 'DIR-02',
                tipo: 'Destino',
                nombreDireccion: 'Villa Nueva - Entrega',
                municipio: 'Villa Nueva',
                direccion2: 'Bodega 3',
                direccion3: '',
                direccionFel: '2da. Calle 5-69 zona 6, Villa Nueva',
                colonia: 'Zona 6',
                codigoPostal: '01064',
                condado: 'Guatemala',
                estado: 'Guatemala',
                pais: 'Guatemala',
                esEstandar: false
            }
        ],
        condicionesPago: {
            condicionesPago: 'EFECTIVO',
            interesesRetraso: '0.00',
            listaPrecios: 'Lista de precios 01',
            descuentoTotal: '0.00',
            limiteCredito: '5000.00',
            limiteComprometido: '3447.00',
            plazoReclamaciones: '30 días',
            descuentoEfectivo: 'Descuento más bajo',
            paisBanco: 'Guatemala',
            nombreBanco: 'Banco Industrial',
            codigoBancario: 'BI-01',
            cuentaBanco: '001-234567-8',
            bicSwift: 'BINGGTGT',
            nombreCuentaBancaria: 'Claudia Torres',
            sucursal: 'Villa Nueva',
            iban: '',
            permitirEntregaParcial: true,
            permitirEntregaParcialFilas: true,
            noAplicarGruposDescuento: false,
            chequesEndosar: true,
            aceptaChequesEndosados: false
        },
        ejecucionPago: {
            paisBancoPropio: 'Guatemala',
            bancoPropio: 'Banco Industrial',
            cuentaPropia: '000-111222-3',
            sucursalPropia: 'Central',
            ibanPropio: '',
            bicSwiftPropio: 'BINGGTGT',
            numeroControl: 'CTL-88',
            infoReferencia: 'REF-CLIENTE-72436190',
            bloqueoPago: false,
            pagoUnico: false,
            autorizacionConsolidacion: false,
            metodosPago: [
                { codigo: 'TRANSF', descripcion: 'Transferencia Bancaria', incluir: true, valido: true },
                { codigo: 'CHEQUE', descripcion: 'Cheque Visi', incluir: true, valido: true },
                { codigo: 'EFECT', descripcion: 'Efectivo', incluir: true, valido: true }
            ]
        },
        finanzas: {
            consolidador: 'Consolidación de pagos',
            deudoresCuenta: '11201001-00-00',
            deudoresNombre: 'Clientes locales',
            cuentaCompensacionAntic: '',
            cuentaProvisionalAntic: '',
            bloquearReclamaciones: false,
            nivelReclamacion: '',
            fechaReclamacion: '',
            proveedorConectado: '',
            grupoPlanificacion: '',
            empresaAsociada: false,
            utilizarCuentaMercanciasEnviadas: false
        },
        propiedades: {
            categoria: 'VIP',
            zonaComercial: 'Metropolitana'
        },
        comentarios: 'Cliente recurrente con historial excelente de pago.',
        anexos: [],
        documentosElec: {
            felHabilitado: true,
            regimen: 'General'
        }
    }
];

export class ClientsModule {
    constructor() {
        this.clients = this.loadClients();
        this.selectedClientId = this.clients.length > 0 ? this.clients[0].id : null;
        this.activeTab = 'general';
        this.activeContactIndex = 0;
        this.activeAddressIndex = 0;
    }

    loadClients() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CLIENTS));
            return INITIAL_CLIENTS;
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error al cargar clientes de localStorage:', e);
            return INITIAL_CLIENTS;
        }
    }

    saveClients() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.clients));
    }

    getSelectedClient() {
        return this.clients.find(c => c.id === this.selectedClientId) || null;
    }

    render() {
        const client = this.getSelectedClient();

        return `
            <div class="module-container clients-module">
                <!-- Barra superior de acciones del módulo -->
                <div class="card header-actions-card mb-4">
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="floating-badge-icon">
                                <i class="bi bi-people-fill">
                                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
                                    </svg>
                                </i>
                            </div>
                            <div>
                                <h2 class="m-0 fw-bold title-gradient">Gestión de Clientes (Socios de Negocios)</h2>
                                <p class="text-muted m-0 small">Ficha Maestra conectada a SAP Business One / Supabase</p>
                            </div>
                        </div>

                        <div class="d-flex align-items-center gap-2">
                            <button id="btn-new-client" class="btn btn-capsule btn-primary-gradient">
                                <svg width="16" height="16" fill="currentColor" class="me-1" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                                Nuevo Cliente
                            </button>
                            <button id="btn-save-client" class="btn btn-capsule btn-success-gradient">
                                <svg width="16" height="16" fill="currentColor" class="me-1" viewBox="0 0 16 16"><path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm12 1v12H2V2h12z"/><path d="M10.5 4a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0v-3a.5.5 0 0 0-.5-.5z"/><path d="M5.5 4a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0v-3a.5.5 0 0 0-.5-.5z"/></svg>
                                Guardar
                            </button>
                            <button id="btn-sync-supabase" class="btn btn-capsule btn-accent-gradient" title="Sincronizar con Supabase API">
                                <svg width="16" height="16" fill="currentColor" class="me-1" viewBox="0 0 16 16"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.9 4c1.552 0 2.94-.707 3.857-1.818a.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/></svg>
                                Sync Supabase
                            </button>
                            <button id="btn-delete-client" class="btn btn-capsule btn-outline-danger">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Layout Principal: Selector Lateral + Ficha Maestra -->
                <div class="row g-3">
                    <!-- Lista Lateral de Clientes -->
                    <div class="col-lg-3">
                        <div class="card h-100 p-3 client-selector-card">
                            <div class="mb-3">
                                <label class="form-label font-weight-bold">Buscar Cliente</label>
                                <input type="text" id="client-search" class="form-control form-control-capsule" placeholder="Código o Nombre...">
                            </div>
                            <div class="client-list-container" id="client-list">
                                ${this.renderClientList()}
                            </div>
                        </div>
                    </div>

                    <!-- Ficha del Cliente Seleccionado -->
                    <div class="col-lg-9">
                        ${client ? this.renderClientForm(client) : '<div class="card p-5 text-center text-muted">Seleccione un cliente o cree uno nuevo.</div>'}
                    </div>
                </div>
            </div>
        `;
    }

    renderClientList() {
        if (this.clients.length === 0) {
            return '<div class="text-center p-3 text-muted small">No hay clientes registrados</div>';
        }

        return this.clients.map(c => `
            <div class="client-item-card ${c.id === this.selectedClientId ? 'active' : ''}" data-id="${c.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <span class="badge bg-primary-soft text-primary font-mono small">${c.codigo || 'SIN COD'}</span>
                    <span class="text-muted small">${c.tipoSN || 'Cliente'}</span>
                </div>
                <div class="fw-bold mt-1 text-truncate">${c.nombre || 'Sin nombre'}</div>
                <div class="text-muted extra-small d-flex justify-content-between mt-1">
                    <span>NIT: ${c.general?.nitParaFacturas || 'CF'}</span>
                    <span class="fw-bold text-success">Q${c.pedidosClientes || '0.00'}</span>
                </div>
            </div>
        `).join('');
    }

    renderClientForm(client) {
        return `
            <div class="card p-4 master-client-card">
                <!-- Cabecera de Datos Maestros (SAP Business One) -->
                <div class="sap-header-grid mb-4 pb-3 border-bottom">
                    <div class="row g-2">
                        <div class="col-md-2">
                            <label class="form-label extra-small fw-bold">Código</label>
                            <div class="input-group input-group-sm">
                                <select id="hdr-tipoCodigo" class="form-select form-control-capsule extra-small" style="max-width: 80px;">
                                    <option value="Manual" ${client.tipoCodigo === 'Manual' ? 'selected' : ''}>Manual</option>
                                    <option value="Auto" ${client.tipoCodigo === 'Auto' ? 'selected' : ''}>Auto</option>
                                </select>
                                <input type="text" id="hdr-codigo" class="form-control form-control-capsule font-mono" value="${client.codigo || ''}">
                            </div>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label extra-small fw-bold">Tipo SN</label>
                            <select id="hdr-tipoSN" class="form-select form-select-sm form-control-capsule">
                                <option value="Cliente" ${client.tipoSN === 'Cliente' ? 'selected' : ''}>Cliente</option>
                                <option value="Proveedor" ${client.tipoSN === 'Proveedor' ? 'selected' : ''}>Proveedor</option>
                                <option value="Lead" ${client.tipoSN === 'Lead' ? 'selected' : ''}>Lead</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label extra-small fw-bold">Nombre</label>
                            <input type="text" id="hdr-nombre" class="form-control form-control-capsule fw-bold text-primary" value="${client.nombre || ''}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label extra-small fw-bold">Nombre extranjero</label>
                            <input type="text" id="hdr-nombreExtranjero" class="form-control form-control-capsule" value="${client.nombreExtranjero || ''}">
                        </div>

                        <div class="col-md-3">
                            <label class="form-label extra-small fw-bold">Grupo - Canales</label>
                            <select id="hdr-grupoCanal" class="form-select form-select-sm form-control-capsule">
                                <option value="CLAN 1" ${client.grupoCanal === 'CLAN 1' ? 'selected' : ''}>CLAN 1</option>
                                <option value="MAYOREO" ${client.grupoCanal === 'MAYOREO' ? 'selected' : ''}>MAYOREO</option>
                                <option value="RETAIL" ${client.grupoCanal === 'RETAIL' ? 'selected' : ''}>RETAIL</option>
                                <option value="DISTRIBUIDOR" ${client.grupoCanal === 'DISTRIBUIDOR' ? 'selected' : ''}>DISTRIBUIDOR</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label extra-small fw-bold">Moneda</label>
                            <select id="hdr-moneda" class="form-select form-select-sm form-control-capsule">
                                <option value="Quetzales" ${client.moneda === 'Quetzales' ? 'selected' : ''}>Quetzales</option>
                                <option value="USD" ${client.moneda === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="Moneda local" ${client.moneda === 'Moneda local' ? 'selected' : ''}>Moneda local</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label extra-small fw-bold">RFC / ID Fiscal</label>
                            <input type="text" id="hdr-rfc" class="form-control form-control-capsule font-mono" value="${client.rfc || '000000000000'}">
                        </div>
                        <div class="col-md-4 d-flex align-items-center justify-content-end gap-3 pt-3">
                            <div class="text-end">
                                <span class="extra-small text-muted d-block">Saldo de cuenta</span>
                                <span class="fw-bold text-dark font-mono">Q${client.saldoCuenta || '0.00'}</span>
                            </div>
                            <div class="text-end border-start ps-3">
                                <span class="extra-small text-muted d-block">Pedidos Clientes</span>
                                <span class="fw-bold text-primary font-mono">Q${client.pedidosClientes || '0.00'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Barra de Sub-pestañas -->
                <div class="subtabs-bar mb-3">
                    <button class="subtab-btn ${this.activeTab === 'general' ? 'active' : ''}" data-tab="general">General</button>
                    <button class="subtab-btn ${this.activeTab === 'contactos' ? 'active' : ''}" data-tab="contactos">Personas de contacto</button>
                    <button class="subtab-btn ${this.activeTab === 'direcciones' ? 'active' : ''}" data-tab="direcciones">Direcciones</button>
                    <button class="subtab-btn ${this.activeTab === 'condiciones' ? 'active' : ''}" data-tab="condiciones">Condiciones de pago</button>
                    <button class="subtab-btn ${this.activeTab === 'ejecucion' ? 'active' : ''}" data-tab="ejecucion">Ejecución de pago</button>
                    <button class="subtab-btn ${this.activeTab === 'finanzas' ? 'active' : ''}" data-tab="finanzas">Finanzas</button>
                    <button class="subtab-btn ${this.activeTab === 'propiedades' ? 'active' : ''}" data-tab="propiedades">Propiedades</button>
                    <button class="subtab-btn ${this.activeTab === 'comentarios' ? 'active' : ''}" data-tab="comentarios">Comentarios</button>
                    <button class="subtab-btn ${this.activeTab === 'anexos' ? 'active' : ''}" data-tab="anexos">Anexos</button>
                    <button class="subtab-btn ${this.activeTab === 'documentos' ? 'active' : ''}" data-tab="documentos">Documentos elec.</button>
                </div>

                <!-- Contenido de la Sub-pestaña Activa -->
                <div class="subtab-content">
                    ${this.renderSubtabContent(client)}
                </div>
            </div>
        `;
    }

    renderSubtabContent(client) {
        switch (this.activeTab) {
            case 'general':
                return this.renderTabGeneral(client.general || {});
            case 'contactos':
                return this.renderTabContactos(client.contactos || []);
            case 'direcciones':
                return this.renderTabDirecciones(client.direcciones || []);
            case 'condiciones':
                return this.renderTabCondiciones(client.condicionesPago || {});
            case 'ejecucion':
                return this.renderTabEjecucion(client.ejecucionPago || {});
            case 'finanzas':
                return this.renderTabFinanzas(client.finanzas || {});
            case 'propiedades':
                return this.renderTabPropiedades(client.propiedades || {});
            case 'comentarios':
                return this.renderTabComentarios(client.comentarios || '');
            case 'anexos':
                return this.renderTabAnexos(client.anexos || []);
            case 'documentos':
                return this.renderTabDocumentos(client.documentosElec || {});
            default:
                return this.renderTabGeneral(client.general || {});
        }
    }

    renderTabGeneral(gen) {
        return `
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Información de Contacto & Ubicación</h6>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Teléfono 1</label>
                                <input type="text" id="gen-telefono1" class="form-control form-control-capsule" value="${gen.telefono1 || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Teléfono 2</label>
                                <input type="text" id="gen-telefono2" class="form-control form-control-capsule" value="${gen.telefono2 || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Teléfono móvil</label>
                                <input type="text" id="gen-telefonoMovil" class="form-control form-control-capsule" value="${gen.telefonoMovil || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Fax</label>
                                <input type="text" id="gen-fax" class="form-control form-control-capsule" value="${gen.fax || ''}">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">Correo electrónico</label>
                                <input type="email" id="gen-email" class="form-control form-control-capsule" value="${gen.email || ''}">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">Sitio Web</label>
                                <input type="text" id="gen-sitioWeb" class="form-control form-control-capsule" value="${gen.sitioWeb || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">CENTRO DISTRIBUCIÓN</label>
                                <select id="gen-centroDistribucion" class="form-select form-control-capsule">
                                    <option value="CENTRAL" ${gen.centroDistribucion === 'CENTRAL' ? 'selected' : ''}>CENTRAL</option>
                                    <option value="NORTE" ${gen.centroDistribucion === 'NORTE' ? 'selected' : ''}>NORTE</option>
                                    <option value="SUR" ${gen.centroDistribucion === 'SUR' ? 'selected' : ''}>SUR</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Clave de acceso</label>
                                <input type="text" id="gen-claveAcceso" class="form-control form-control-capsule bg-warning-soft" value="${gen.claveAcceso || ''}">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Datos Fiscales & Asignación</h6>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Persona de contacto</label>
                                <input type="text" id="gen-personaContacto" class="form-control form-control-capsule" value="${gen.personaContacto || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">DPI</label>
                                <input type="text" id="gen-dpi" class="form-control form-control-capsule font-mono" value="${gen.dpi || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">NIT PARA FACTURAS</label>
                                <input type="text" id="gen-nitParaFacturas" class="form-control form-control-capsule font-mono fw-bold" value="${gen.nitParaFacturas || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Vendedor</label>
                                <select id="gen-vendedor" class="form-select form-control-capsule">
                                    <option value="PAOLA SOLIS" ${gen.vendedor === 'PAOLA SOLIS' ? 'selected' : ''}>PAOLA SOLIS</option>
                                    <option value="CARLOS LÓPEZ" ${gen.vendedor === 'CARLOS LÓPEZ' ? 'selected' : ''}>CARLOS LÓPEZ</option>
                                    <option value="MARÍA PÉREZ" ${gen.vendedor === 'MARÍA PÉREZ' ? 'selected' : ''}>MARÍA PÉREZ</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Territorio</label>
                                <input type="text" id="gen-territorio" class="form-control form-control-capsule" value="${gen.territorio || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Tipo socio negocios</label>
                                <input type="text" id="gen-tipoSocioNegocios" class="form-control form-control-capsule" value="${gen.tipoSocioNegocios || 'Sociedades'}">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">Nombre alias</label>
                                <input type="text" id="gen-nombreAlias" class="form-control form-control-capsule" value="${gen.nombreAlias || ''}">
                            </div>
                            <div class="col-md-12 pt-2">
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="radio" name="estadoCliente" id="st-activo" value="Activo" ${gen.estadoCliente !== 'Inactivo' ? 'checked' : ''}>
                                    <label class="form-check-label extra-small" for="st-activo">Activo</label>
                                </div>
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="radio" name="estadoCliente" id="st-inactivo" value="Inactivo" ${gen.estadoCliente === 'Inactivo' ? 'checked' : ''}>
                                    <label class="form-check-label extra-small" for="st-inactivo">Inactivo</label>
                                </div>
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="gen-bloquearMarketing" ${gen.bloquearMarketing ? 'checked' : ''}>
                                    <label class="form-check-label extra-small" for="gen-bloquearMarketing">Bloquear contenido marketing</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTabContactos(contactos) {
        const activeContact = contactos[this.activeContactIndex] || {};

        return `
            <div class="row g-3">
                <!-- Lista Izquierda de Contactos -->
                <div class="col-md-4">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="fw-bold text-primary m-0">Personas de contacto</h6>
                            <button id="btn-add-contact" class="btn btn-xs btn-capsule btn-outline-primary">+ Agregar</button>
                        </div>
                        <div class="list-group contact-list-group">
                            ${contactos.map((c, idx) => `
                                <button class="list-group-item list-group-item-action ${idx === this.activeContactIndex ? 'active' : ''} contact-item-btn" data-index="${idx}">
                                    <div class="fw-bold extra-small">${c.nombre} ${c.apellido || ''}</div>
                                    <div class="text-muted extra-small">${c.posicion || 'Sin posición'}</div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Detalle Derecho del Contacto -->
                <div class="col-md-8">
                    <div class="p-3 bg-light-gradient rounded-3">
                        <h6 class="fw-bold text-primary mb-3">Detalles del Contacto</h6>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">ID de contacto</label>
                                <input type="text" id="cnt-idContacto" class="form-control form-control-capsule" value="${activeContact.idContacto || 'CONT-01'}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Título</label>
                                <input type="text" id="cnt-titulo" class="form-control form-control-capsule" value="${activeContact.titulo || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">Primer Nombre</label>
                                <input type="text" id="cnt-nombre" class="form-control form-control-capsule" value="${activeContact.nombre || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">Segundo Nombre</label>
                                <input type="text" id="cnt-segundoNombre" class="form-control form-control-capsule" value="${activeContact.segundoNombre || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">Apellido</label>
                                <input type="text" id="cnt-apellido" class="form-control form-control-capsule" value="${activeContact.apellido || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Posición</label>
                                <input type="text" id="cnt-posicion" class="form-control form-control-capsule" value="${activeContact.posicion || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Dirección</label>
                                <input type="text" id="cnt-direccion" class="form-control form-control-capsule" value="${activeContact.direccion || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">Teléfono 1</label>
                                <input type="text" id="cnt-telefono1" class="form-control form-control-capsule" value="${activeContact.telefono1 || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">Teléfono 2</label>
                                <input type="text" id="cnt-telefono2" class="form-control form-control-capsule" value="${activeContact.telefono2 || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">Teléfono móvil</label>
                                <input type="text" id="cnt-telefonoMovil" class="form-control form-control-capsule" value="${activeContact.telefonoMovil || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Correo electrónico</label>
                                <input type="email" id="cnt-email" class="form-control form-control-capsule" value="${activeContact.email || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Ciudad de nacimiento</label>
                                <input type="text" id="cnt-ciudadNacimiento" class="form-control form-control-capsule" value="${activeContact.ciudadNacimiento || ''}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTabDirecciones(direcciones) {
        const activeDir = direcciones[this.activeAddressIndex] || {};

        return `
            <div class="row g-3">
                <!-- Lista Izquierda de Direcciones -->
                <div class="col-md-4">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="fw-bold text-primary m-0">Direcciones</h6>
                            <button id="btn-add-address" class="btn btn-xs btn-capsule btn-outline-primary">+ Agregar</button>
                        </div>
                        <div class="list-group address-list-group">
                            ${direcciones.map((d, idx) => `
                                <button class="list-group-item list-group-item-action ${idx === this.activeAddressIndex ? 'active' : ''} address-item-btn" data-index="${idx}">
                                    <div class="extra-small fw-bold text-primary">${d.tipo}</div>
                                    <div class="fw-bold extra-small text-dark">${d.nombreDireccion || 'Dirección'}</div>
                                    <div class="text-muted extra-small">${d.municipio || ''}, ${d.pais || ''}</div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Detalle Derecho de Dirección -->
                <div class="col-md-8">
                    <div class="p-3 bg-light-gradient rounded-3">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold text-primary m-0">Detalle de la Dirección</h6>
                            <a href="https://maps.google.com" target="_blank" class="extra-small text-primary text-decoration-none">
                                <svg width="14" height="14" fill="currentColor" class="me-1" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
                                Mostrar ubicación en explorador web
                            </a>
                        </div>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Tipo de Dirección</label>
                                <select id="dir-tipo" class="form-select form-control-capsule">
                                    <option value="Destinatario de factura" ${activeDir.tipo === 'Destinatario de factura' ? 'selected' : ''}>Destinatario de factura</option>
                                    <option value="Destino" ${activeDir.tipo === 'Destino' ? 'selected' : ''}>Destino</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Nombre de Dirección</label>
                                <input type="text" id="dir-nombreDireccion" class="form-control form-control-capsule" value="${activeDir.nombreDireccion || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">MUNICIPIO</label>
                                <input type="text" id="dir-municipio" class="form-control form-control-capsule" value="${activeDir.municipio || 'Villa Nueva'}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Colonia</label>
                                <input type="text" id="dir-colonia" class="form-control form-control-capsule" value="${activeDir.colonia || ''}">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">DIRECCION FEL</label>
                                <input type="text" id="dir-direccionFel" class="form-control form-control-capsule fw-bold" value="${activeDir.direccionFel || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">Código Postal</label>
                                <input type="text" id="dir-codigoPostal" class="form-control form-control-capsule font-mono" value="${activeDir.codigoPostal || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">Estado / Departamento</label>
                                <select id="dir-estado" class="form-select form-control-capsule">
                                    <option value="Guatemala" ${activeDir.estado === 'Guatemala' ? 'selected' : ''}>Guatemala</option>
                                    <option value="Sacatepéquez" ${activeDir.estado === 'Sacatepéquez' ? 'selected' : ''}>Sacatepéquez</option>
                                    <option value="Quetzaltenango" ${activeDir.estado === 'Quetzaltenango' ? 'selected' : ''}>Quetzaltenango</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label extra-small fw-bold">País</label>
                                <select id="dir-pais" class="form-select form-control-capsule">
                                    <option value="Guatemala" ${activeDir.pais === 'Guatemala' ? 'selected' : ''}>Guatemala</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTabCondiciones(cond) {
        return `
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Términos Comerciales</h6>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Condiciones de pago</label>
                                <select id="cnd-condicionesPago" class="form-select form-control-capsule">
                                    <option value="EFECTIVO" ${cond.condicionesPago === 'EFECTIVO' ? 'selected' : ''}>EFECTIVO</option>
                                    <option value="CREDITO 30 DIAS" ${cond.condicionesPago === 'CREDITO 30 DIAS' ? 'selected' : ''}>CREDITO 30 DIAS</option>
                                    <option value="CREDITO 60 DIAS" ${cond.condicionesPago === 'CREDITO 60 DIAS' ? 'selected' : ''}>CREDITO 60 DIAS</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Lista de precios</label>
                                <select id="cnd-listaPrecios" class="form-select form-control-capsule">
                                    <option value="Lista de precios 01" ${cond.listaPrecios === 'Lista de precios 01' ? 'selected' : ''}>Lista de precios 01</option>
                                    <option value="Lista Mayorista" ${cond.listaPrecios === 'Lista Mayorista' ? 'selected' : ''}>Lista Mayorista</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Límite de crédito (Q)</label>
                                <input type="text" id="cnd-limiteCredito" class="form-control form-control-capsule font-mono" value="${cond.limiteCredito || '0.00'}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Límite comprometido (Q)</label>
                                <input type="text" id="cnd-limiteComprometido" class="form-control form-control-capsule font-mono" value="${cond.limiteComprometido || '0.00'}">
                            </div>
                            <div class="col-md-12 pt-2">
                                <div class="form-check mb-1">
                                    <input class="form-check-input" type="checkbox" id="cnd-permitirEntregaParcial" ${cond.permitirEntregaParcial ? 'checked' : ''}>
                                    <label class="form-check-label extra-small" for="cnd-permitirEntregaParcial">Permitir entrega parcial del pedido</label>
                                </div>
                                <div class="form-check mb-1">
                                    <input class="form-check-input" type="checkbox" id="cnd-permitirEntregaParcialFilas" ${cond.permitirEntregaParcialFilas ? 'checked' : ''}>
                                    <label class="form-check-label extra-small" for="cnd-permitirEntregaParcialFilas">Permitir entrega parcial por filas</label>
                                </div>
                                <div class="form-check mb-1">
                                    <input class="form-check-input" type="checkbox" id="cnd-chequesEndosar" ${cond.chequesEndosar ? 'checked' : ''}>
                                    <label class="form-check-label extra-small" for="cnd-chequesEndosar">Cheques que se pueden endosar desde este SN</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Banco del Socio de Negocios</h6>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">País del banco</label>
                                <input type="text" id="cnd-paisBanco" class="form-control form-control-capsule" value="${cond.paisBanco || 'Guatemala'}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Nombre del banco</label>
                                <input type="text" id="cnd-nombreBanco" class="form-control form-control-capsule" value="${cond.nombreBanco || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Código bancario</label>
                                <input type="text" id="cnd-codigoBancario" class="form-control form-control-capsule" value="${cond.codigoBancario || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Cuenta bancaria</label>
                                <input type="text" id="cnd-cuentaBanco" class="form-control form-control-capsule font-mono" value="${cond.cuentaBanco || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">BIC / SWIFT</label>
                                <input type="text" id="cnd-bicSwift" class="form-control form-control-capsule font-mono" value="${cond.bicSwift || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Sucursal</label>
                                <input type="text" id="cnd-sucursal" class="form-control form-control-capsule" value="${cond.sucursal || ''}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTabEjecucion(ejec) {
        const metodos = ejec.metodosPago || [
            { codigo: 'TRANSF', descripcion: 'Transferencia Bancaria', incluir: true, valido: true },
            { codigo: 'CHEQUE', descripcion: 'Cheque Visi', incluir: true, valido: true }
        ];

        return `
            <div class="row g-3">
                <div class="col-md-5">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Banco Propio & Gastos</h6>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">País</label>
                                <input type="text" id="ejc-paisBancoPropio" class="form-control form-control-capsule" value="${ejec.paisBancoPropio || 'Guatemala'}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Banco</label>
                                <input type="text" id="ejc-bancoPropio" class="form-control form-control-capsule" value="${ejec.bancoPropio || 'Banco Industrial'}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Cuenta</label>
                                <input type="text" id="ejc-cuentaPropia" class="form-control form-control-capsule font-mono" value="${ejec.cuentaPropia || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label extra-small fw-bold">Número de control</label>
                                <input type="text" id="ejc-numeroControl" class="form-control form-control-capsule font-mono" value="${ejec.numeroControl || ''}">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">Info detallada de referencia</label>
                                <input type="text" id="ejc-infoReferencia" class="form-control form-control-capsule" value="${ejec.infoReferencia || ''}">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-7">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Métodos de Pago Autorizados</h6>
                        <table class="table table-sm extra-small align-middle table-hover">
                            <thead>
                                <tr class="table-light">
                                    <th>#</th>
                                    <th>Código</th>
                                    <th>Descripción</th>
                                    <th class="text-center">Incluir</th>
                                    <th class="text-center">Válido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${metodos.map((m, idx) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td class="font-mono fw-bold text-primary">${m.codigo}</td>
                                        <td>${m.descripcion}</td>
                                        <td class="text-center"><input type="checkbox" ${m.incluir ? 'checked' : ''}></td>
                                        <td class="text-center"><input type="checkbox" ${m.valido ? 'checked' : ''}></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="d-flex justify-content-end gap-2 mt-2">
                            <button class="btn btn-xs btn-outline-secondary">Borrar estándar</button>
                            <button class="btn btn-xs btn-primary-gradient">Fijar como estándar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTabFinanzas(fin) {
        return `
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Cuentas Asociadas</h6>
                        <div class="row g-2">
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">Deudores (Cuenta SAP)</label>
                                <div class="input-group input-group-sm">
                                    <input type="text" id="fin-deudoresCuenta" class="form-control form-control-capsule font-mono fw-bold" value="${fin.deudoresCuenta || '11201001-00-00'}">
                                    <input type="text" id="fin-deudoresNombre" class="form-control form-control-capsule" value="${fin.deudoresNombre || 'Clientes locales'}">
                                </div>
                            </div>
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">Cuenta compensación anticipos</label>
                                <input type="text" id="fin-cuentaCompensacionAntic" class="form-control form-control-capsule font-mono" value="${fin.cuentaCompensacionAntic || ''}">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">Cuenta provisional anticipos</label>
                                <input type="text" id="fin-cuentaProvisionalAntic" class="form-control form-control-capsule font-mono" value="${fin.cuentaProvisionalAntic || ''}">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Consolidación & Reclamaciones</h6>
                        <div class="row g-2">
                            <div class="col-md-12">
                                <label class="form-label extra-small fw-bold">SN de Consolidación</label>
                                <div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="consolidador" id="cn-pagos" value="Consolidación de pagos" ${fin.consolidador !== 'Consolidación de entregas' ? 'checked' : ''}>
                                        <label class="form-check-label extra-small" for="cn-pagos">Consolidación de pagos</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="consolidador" id="cn-entregas" value="Consolidación de entregas" ${fin.consolidador === 'Consolidación de entregas' ? 'checked' : ''}>
                                        <label class="form-check-label extra-small" for="cn-entregas">Consolidación de entregas</label>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-12 pt-2">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="fin-bloquearReclamaciones" ${fin.bloquearReclamaciones ? 'checked' : ''}>
                                    <label class="form-check-label extra-small" for="fin-bloquearReclamaciones">Bloquear reclamaciones</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTabPropiedades(prop) {
        return `
            <div class="p-3 bg-light-gradient rounded-3">
                <h6 class="fw-bold text-primary mb-3">Propiedades y Categorización del Cliente</h6>
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label extra-small fw-bold">Categoría de Cliente</label>
                        <select class="form-select form-control-capsule">
                            <option>VIP / Preferencial</option>
                            <option>Estándar</option>
                            <option>Corporativo</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label extra-small fw-bold">Zona Comercial</label>
                        <input type="text" class="form-control form-control-capsule" value="${prop.zonaComercial || 'Metropolitana'}">
                    </div>
                </div>
            </div>
        `;
    }

    renderTabComentarios(comentarios) {
        return `
            <div class="p-3 bg-light-gradient rounded-3">
                <h6 class="fw-bold text-primary mb-2">Comentarios e Historial de Observaciones</h6>
                <textarea id="txt-comentarios" class="form-control form-control-capsule" rows="5">${comentarios}</textarea>
            </div>
        `;
    }

    renderTabAnexos(anexos) {
        return `
            <div class="p-3 bg-light-gradient rounded-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="fw-bold text-primary m-0">Anexos / Documentos Adjuntos</h6>
                    <button class="btn btn-xs btn-capsule btn-outline-primary">+ Adjuntar Archivo</button>
                </div>
                <p class="text-muted extra-small">Formatos soportados: PDF, PNG, JPG, XML (Max 10MB)</p>
                <div class="border rounded p-4 text-center bg-white">
                    <span class="text-muted extra-small">No hay anexos registrados para este cliente</span>
                </div>
            </div>
        `;
    }

    renderTabDocumentos(doc) {
        return `
            <div class="p-3 bg-light-gradient rounded-3">
                <h6 class="fw-bold text-primary mb-3">Documentos Electrónicos (FEL Guatemala)</h6>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label extra-small fw-bold">Régimen FEL</label>
                        <select class="form-select form-control-capsule">
                            <option value="General" ${doc.regimen === 'General' ? 'selected' : ''}>General de IVA</option>
                            <option value="Pequeño Contribuyente">Pequeño Contribuyente</option>
                            <option value="Exento">Exento</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label extra-small fw-bold">Estado Emisión FEL</label>
                        <input type="text" class="form-control form-control-capsule bg-success-soft text-success font-mono fw-bold" value="HABILITADO" readonly>
                    </div>
                </div>
            </div>
        `;
    }

    initEvents() {
        // Búsqueda de Clientes
        const searchInput = document.getElementById('client-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                document.querySelectorAll('.client-item-card').forEach(card => {
                    const text = card.textContent.toLowerCase();
                    card.style.display = text.includes(query) ? 'block' : 'none';
                });
            });
        }

        // Selección de Cliente
        document.querySelectorAll('.client-item-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedClientId = card.dataset.id;
                this.refreshUI();
            });
        });

        // Cambio de Sub-pestañas
        document.querySelectorAll('.subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.collectFormData();
                this.activeTab = btn.dataset.tab;
                this.refreshUI();
            });
        });

        // Botón Nuevo Cliente
        const btnNew = document.getElementById('btn-new-client');
        if (btnNew) {
            btnNew.addEventListener('click', () => {
                const newId = 'CLI-' + Math.floor(10000000 + Math.random() * 90000000);
                const newClient = {
                    id: newId,
                    codigo: Math.floor(10000000 + Math.random() * 90000000).toString(),
                    tipoCodigo: 'Manual',
                    tipoSN: 'Cliente',
                    nombre: 'Nuevo Cliente',
                    nombreExtranjero: '',
                    grupoCanal: 'CLAN 1',
                    moneda: 'Quetzales',
                    rfc: '000000000000',
                    saldoCuenta: '0.00',
                    entregas: '0.00',
                    pedidosClientes: '0.00',
                    oportunidades: '0.00',
                    general: { nitParaFacturas: 'CF', vendedor: 'PAOLA SOLIS' },
                    contactos: [{ idContacto: 'CONT-01', nombre: 'Contacto', apellido: 'Nuevo' }],
                    direcciones: [{ id: 'DIR-01', tipo: 'Destinatario de factura', nombreDireccion: 'Central', municipio: 'Guatemala', pais: 'Guatemala' }],
                    condicionesPago: { condicionesPago: 'EFECTIVO' },
                    ejecucionPago: {},
                    finanzas: {},
                    propiedades: {},
                    comentarios: ''
                };
                this.clients.unshift(newClient);
                this.selectedClientId = newId;
                this.saveClients();
                this.refreshUI();
            });
        }

        // Botón Guardar Cliente
        const btnSave = document.getElementById('btn-save-client');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                this.collectFormData();
                this.saveClients();
                alert('¡Cliente guardado exitosamente en almacenamiento local!');
                this.refreshUI();
            });
        }

        // Botón Eliminar Cliente
        const btnDelete = document.getElementById('btn-delete-client');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                if (confirm('¿Está seguro de eliminar este cliente?')) {
                    this.clients = this.clients.filter(c => c.id !== this.selectedClientId);
                    this.selectedClientId = this.clients.length > 0 ? this.clients[0].id : null;
                    this.saveClients();
                    this.refreshUI();
                }
            });
        }

        // Botón Sync Supabase
        const btnSync = document.getElementById('btn-sync-supabase');
        if (btnSync) {
            btnSync.addEventListener('click', () => {
                const config = JSON.parse(localStorage.getItem('gci_api_config') || '{}');
                if (!config.supabaseUrl || !config.supabaseKey) {
                    alert('Supabase no está configurado. Por favor, configure la URL y API Key en el modal de "Configuración de Conexiones".');
                } else {
                    alert(`Simulando sincronización hacia Supabase REST API (${config.supabaseUrl})...\n¡Sincronización completada!`);
                }
            });
        }

        // Botones de Contactos y Direcciones
        document.querySelectorAll('.contact-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.collectFormData();
                this.activeContactIndex = parseInt(btn.dataset.index, 10);
                this.refreshUI();
            });
        });

        document.querySelectorAll('.address-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.collectFormData();
                this.activeAddressIndex = parseInt(btn.dataset.index, 10);
                this.refreshUI();
            });
        });

        // Botón Agregar Contacto
        const btnAddContact = document.getElementById('btn-add-contact');
        if (btnAddContact) {
            btnAddContact.addEventListener('click', () => {
                const client = this.getSelectedClient();
                if (!client) return;
                client.contactos = client.contactos || [];
                const newContactNum = client.contactos.length + 1;
                const newContact = {
                    idContacto: `CONT-0${newContactNum}`,
                    nombre: `Contacto ${newContactNum}`,
                    segundoNombre: '',
                    apellido: '',
                    titulo: '',
                    posicion: 'Contacto General',
                    direccion: '',
                    telefono1: '',
                    telefono2: '',
                    telefonoMovil: '',
                    fax: '',
                    email: '',
                    ciudadNacimiento: '',
                    bloquearMarketing: false,
                    activo: true
                };
                client.contactos.push(newContact);
                this.activeContactIndex = client.contactos.length - 1;
                this.saveClients();
                this.refreshUI();
            });
        }

        // Botón Agregar Dirección
        const btnAddAddress = document.getElementById('btn-add-address');
        if (btnAddAddress) {
            btnAddAddress.addEventListener('click', () => {
                const client = this.getSelectedClient();
                if (!client) return;
                client.direcciones = client.direcciones || [];
                const newDirNum = client.direcciones.length + 1;
                const newAddress = {
                    id: `DIR-0${newDirNum}`,
                    tipo: newDirNum % 2 === 0 ? 'Destino' : 'Destinatario de factura',
                    nombreDireccion: `Sucursal ${newDirNum}`,
                    municipio: 'Guatemala',
                    direccionFel: '',
                    colonia: '',
                    codigoPostal: '01001',
                    estado: 'Guatemala',
                    pais: 'Guatemala'
                };
                client.direcciones.push(newAddress);
                this.activeAddressIndex = client.direcciones.length - 1;
                this.saveClients();
                this.refreshUI();
            });
        }
    }

    collectFormData() {
        const client = this.getSelectedClient();
        if (!client) return;

        // Recolectar datos de Cabecera
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        client.codigo = getVal('hdr-codigo') || client.codigo;
        client.tipoCodigo = getVal('hdr-tipoCodigo') || client.tipoCodigo;
        client.tipoSN = getVal('hdr-tipoSN') || client.tipoSN;
        client.nombre = getVal('hdr-nombre') || client.nombre;
        client.nombreExtranjero = getVal('hdr-nombreExtranjero') || client.nombreExtranjero;
        client.grupoCanal = getVal('hdr-grupoCanal') || client.grupoCanal;
        client.moneda = getVal('hdr-moneda') || client.moneda;
        client.rfc = getVal('hdr-rfc') || client.rfc;

        // Recolectar según sub-pestaña
        if (this.activeTab === 'general') {
            client.general = client.general || {};
            client.general.telefono1 = getVal('gen-telefono1');
            client.general.telefono2 = getVal('gen-telefono2');
            client.general.telefonoMovil = getVal('gen-telefonoMovil');
            client.general.fax = getVal('gen-fax');
            client.general.email = getVal('gen-email');
            client.general.sitioWeb = getVal('gen-sitioWeb');
            client.general.centroDistribucion = getVal('gen-centroDistribucion');
            client.general.claveAcceso = getVal('gen-claveAcceso');
            client.general.personaContacto = getVal('gen-personaContacto');
            client.general.dpi = getVal('gen-dpi');
            client.general.nitParaFacturas = getVal('gen-nitParaFacturas');
            client.general.vendedor = getVal('gen-vendedor');
            client.general.territorio = getVal('gen-territorio');
            client.general.tipoSocioNegocios = getVal('gen-tipoSocioNegocios');
            client.general.nombreAlias = getVal('gen-nombreAlias');
        } else if (this.activeTab === 'contactos') {
            client.contactos = client.contactos || [];
            if (client.contactos[this.activeContactIndex]) {
                const c = client.contactos[this.activeContactIndex];
                c.idContacto = getVal('cnt-idContacto') || c.idContacto;
                c.titulo = getVal('cnt-titulo');
                c.nombre = getVal('cnt-nombre') || c.nombre;
                c.segundoNombre = getVal('cnt-segundoNombre');
                c.apellido = getVal('cnt-apellido');
                c.posicion = getVal('cnt-posicion');
                c.direccion = getVal('cnt-direccion');
                c.telefono1 = getVal('cnt-telefono1');
                c.telefono2 = getVal('cnt-telefono2');
                c.telefonoMovil = getVal('cnt-telefonoMovil');
                c.email = getVal('cnt-email');
                c.ciudadNacimiento = getVal('cnt-ciudadNacimiento');
            }
        } else if (this.activeTab === 'direcciones') {
            client.direcciones = client.direcciones || [];
            if (client.direcciones[this.activeAddressIndex]) {
                const d = client.direcciones[this.activeAddressIndex];
                d.tipo = getVal('dir-tipo') || d.tipo;
                d.nombreDireccion = getVal('dir-nombreDireccion') || d.nombreDireccion;
                d.municipio = getVal('dir-municipio');
                d.colonia = getVal('dir-colonia');
                d.direccionFel = getVal('dir-direccionFel');
                d.codigoPostal = getVal('dir-codigoPostal');
                d.estado = getVal('dir-estado');
                d.pais = getVal('dir-pais');
            }
        } else if (this.activeTab === 'condiciones') {
            client.condicionesPago = client.condicionesPago || {};
            client.condicionesPago.condicionesPago = getVal('cnd-condicionesPago');
            client.condicionesPago.listaPrecios = getVal('cnd-listaPrecios');
            client.condicionesPago.limiteCredito = getVal('cnd-limiteCredito');
            client.condicionesPago.limiteComprometido = getVal('cnd-limiteComprometido');
            client.condicionesPago.paisBanco = getVal('cnd-paisBanco');
            client.condicionesPago.nombreBanco = getVal('cnd-nombreBanco');
            client.condicionesPago.codigoBancario = getVal('cnd-codigoBancario');
            client.condicionesPago.cuentaBanco = getVal('cnd-cuentaBanco');
            client.condicionesPago.bicSwift = getVal('cnd-bicSwift');
            client.condicionesPago.sucursal = getVal('cnd-sucursal');
        } else if (this.activeTab === 'ejecucion') {
            client.ejecucionPago = client.ejecucionPago || {};
            client.ejecucionPago.paisBancoPropio = getVal('ejc-paisBancoPropio');
            client.ejecucionPago.bancoPropio = getVal('ejc-bancoPropio');
            client.ejecucionPago.cuentaPropia = getVal('ejc-cuentaPropia');
            client.ejecucionPago.numeroControl = getVal('ejc-numeroControl');
            client.ejecucionPago.infoReferencia = getVal('ejc-infoReferencia');
        } else if (this.activeTab === 'finanzas') {
            client.finanzas = client.finanzas || {};
            client.finanzas.deudoresCuenta = getVal('fin-deudoresCuenta');
            client.finanzas.deudoresNombre = getVal('fin-deudoresNombre');
            client.finanzas.cuentaCompensacionAntic = getVal('fin-cuentaCompensacionAntic');
            client.finanzas.cuentaProvisionalAntic = getVal('fin-cuentaProvisionalAntic');
        } else if (this.activeTab === 'comentarios') {
            const txt = document.getElementById('txt-comentarios');
            if (txt) client.comentarios = txt.value;
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
