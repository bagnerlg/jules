/**
 * Módulo de Clientes (Socios de Negocios - SAP Business One / Supabase)
 * Gestiona la información completa de clientes, contactos, direcciones,
 * condiciones de pago, datos bancarios, finanzas y configuración de campos personalizados.
 */

import { FieldConfigEngine } from './field-config.js';

const STORAGE_KEY = 'gci_clients';

// Listas de autocompletado y opciones para campos conectados a otros apartados
const CATALOGS = {
    'listasPrecios': ['Lista de precios 01', 'Lista Mayorista', 'Lista Minorista / Cliente Final', 'Lista Distribuidores', 'Lista Empleados GCI'],
    'deudoresCuenta': ['11201001-00-00 (Clientes locales)', '11201002-00-00 (Clientes del exterior)', '11201003-00-00 (Cuentas por cobrar relacionadas)', '11201004-00-00 (Anticipos de Clientes)'],
    'grupoCanal': ['CLAN 1', 'MAYOREO', 'RETAIL', 'DISTRIBUIDOR', 'PROYECTOS ESPECIALES'],
    'municipios': ['Guatemala', 'Villa Nueva', 'Mixco', 'Santa Catarina Pinula', 'San Miguel Petapa', 'Quetzaltenango', 'Antigua Guatemala', 'Escuintla', 'Cobán'],
    'departamentos': ['Guatemala', 'Sacatepéquez', 'Quetzaltenango', 'Escuintla', 'Alta Verapaz', 'Chimaltenango', 'Izabal', 'San Marcos'],
    'vendedores': ['PAOLA SOLIS', 'CARLOS LÓPEZ', 'MARÍA PÉREZ', 'JORGE MARTÍNEZ', 'ANA GÓMEZ'],
    'condicionesPago': ['EFECTIVO', 'CREDITO 15 DIAS', 'CREDITO 30 DIAS', 'CREDITO 60 DIAS', 'CREDITO 90 DIAS']
};

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
            deudoresCuenta: '11201001-00-00 (Clientes locales)',
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
        this.fieldConfigEngine = new FieldConfigEngine();
        this.clients = this.loadClients();
        this.selectedClientId = this.clients.length > 0 ? this.clients[0].id : null;
        this.activeTab = 'general';
        this.activeContactIndex = 0;
        this.activeAddressIndex = 0;
        this.fieldsSearchFilter = '';
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
                            <button id="btn-open-fields-config" class="btn btn-capsule btn-outline-secondary" style="border-radius: 6px; padding: 8px 14px;">
                                <i class="fa-solid fa-sliders me-1"></i> Configurar Campos
                            </button>
                            <button id="btn-new-client" class="btn btn-capsule btn-primary-gradient">
                                <i class="fa-solid fa-plus me-1"></i> Nuevo Cliente
                            </button>
                            <button id="btn-save-client" class="btn btn-capsule btn-success-gradient">
                                <i class="fa-solid fa-floppy-disk me-1"></i> Guardar
                            </button>
                            <button id="btn-sync-supabase" class="btn btn-capsule btn-accent-gradient" title="Sincronizar con Supabase API">
                                <i class="fa-solid fa-rotate me-1"></i> Sync Supabase
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

    renderFieldLabel(fieldId, fallbackLabel) {
        const field = this.fieldConfigEngine.getField(fieldId);
        const labelText = field.label || fallbackLabel;
        const connectionBadge = field.hasConnection ? `<span class="badge bg-info text-dark ms-1 extra-small" title="Conectado a ${field.connectionSource || 'lista externa'}"><i class="fa-solid fa-link"></i></span>` : '';
        return `<label class="form-label extra-small fw-bold d-flex align-items-center">${labelText} ${connectionBadge}</label>`;
    }

    isFieldVisible(fieldId) {
        return this.fieldConfigEngine.getField(fieldId).visible;
    }

    renderSmartInput(fieldId, value, options = [], datalistId = '') {
        const field = this.fieldConfigEngine.getField(fieldId);
        if (!field.visible) return '';

        const searchAttr = field.searchEnabled && datalistId ? `list="${datalistId}" autocomplete="off"` : '';

        if (field.hasConnection && options.length > 0) {
            return `
                <div class="smart-input-container">
                    <input type="text" id="${fieldId}" class="form-control form-control-capsule" value="${value || ''}" ${searchAttr} placeholder="Buscar o seleccionar ${field.label}...">
                    ${datalistId ? `
                        <datalist id="${datalistId}">
                            ${options.map(opt => `<option value="${opt}">`).join('')}
                        </datalist>
                    ` : ''}
                </div>
            `;
        }

        return `<input type="text" id="${fieldId}" class="form-control form-control-capsule" value="${value || ''}">`;
    }

    renderClientForm(client) {
        return `
            <div class="card p-4 master-client-card">
                <!-- Cabecera de Datos Maestros (SAP Business One) -->
                <div class="sap-header-grid mb-4 pb-3 border-bottom">
                    <div class="row g-2">
                        ${this.isFieldVisible('hdr-codigo') ? `
                            <div class="col-md-2">
                                ${this.renderFieldLabel('hdr-codigo', 'Código')}
                                <div class="input-group input-group-sm">
                                    <select id="hdr-tipoCodigo" class="form-select form-control-capsule extra-small" style="max-width: 80px;">
                                        <option value="Manual" ${client.tipoCodigo === 'Manual' ? 'selected' : ''}>Manual</option>
                                        <option value="Auto" ${client.tipoCodigo === 'Auto' ? 'selected' : ''}>Auto</option>
                                    </select>
                                    <input type="text" id="hdr-codigo" class="form-control form-control-capsule font-mono" value="${client.codigo || ''}">
                                </div>
                            </div>
                        ` : ''}

                        ${this.isFieldVisible('hdr-tipoSN') ? `
                            <div class="col-md-2">
                                ${this.renderFieldLabel('hdr-tipoSN', 'Tipo SN')}
                                <select id="hdr-tipoSN" class="form-select form-select-sm form-control-capsule">
                                    <option value="Cliente" ${client.tipoSN === 'Cliente' ? 'selected' : ''}>Cliente</option>
                                    <option value="Proveedor" ${client.tipoSN === 'Proveedor' ? 'selected' : ''}>Proveedor</option>
                                    <option value="Lead" ${client.tipoSN === 'Lead' ? 'selected' : ''}>Lead</option>
                                </select>
                            </div>
                        ` : ''}

                        ${this.isFieldVisible('hdr-nombre') ? `
                            <div class="col-md-4">
                                ${this.renderFieldLabel('hdr-nombre', 'Nombre')}
                                <input type="text" id="hdr-nombre" class="form-control form-control-capsule fw-bold text-primary" value="${client.nombre || ''}">
                            </div>
                        ` : ''}

                        ${this.isFieldVisible('hdr-nombreExtranjero') ? `
                            <div class="col-md-4">
                                ${this.renderFieldLabel('hdr-nombreExtranjero', 'Nombre extranjero')}
                                <input type="text" id="hdr-nombreExtranjero" class="form-control form-control-capsule" value="${client.nombreExtranjero || ''}">
                            </div>
                        ` : ''}

                        ${this.isFieldVisible('hdr-grupoCanal') ? `
                            <div class="col-md-3">
                                ${this.renderFieldLabel('hdr-grupoCanal', 'Grupo - Canales')}
                                ${this.renderSmartInput('hdr-grupoCanal', client.grupoCanal, CATALOGS.grupoCanal, 'dl-grupoCanal')}
                            </div>
                        ` : ''}

                        ${this.isFieldVisible('hdr-moneda') ? `
                            <div class="col-md-2">
                                ${this.renderFieldLabel('hdr-moneda', 'Moneda')}
                                <select id="hdr-moneda" class="form-select form-select-sm form-control-capsule">
                                    <option value="Quetzales" ${client.moneda === 'Quetzales' ? 'selected' : ''}>Quetzales</option>
                                    <option value="USD" ${client.moneda === 'USD' ? 'selected' : ''}>USD ($)</option>
                                    <option value="Moneda local" ${client.moneda === 'Moneda local' ? 'selected' : ''}>Moneda local</option>
                                </select>
                            </div>
                        ` : ''}

                        ${this.isFieldVisible('hdr-rfc') ? `
                            <div class="col-md-3">
                                ${this.renderFieldLabel('hdr-rfc', 'RFC / ID Fiscal')}
                                <input type="text" id="hdr-rfc" class="form-control form-control-capsule font-mono" value="${client.rfc || '000000000000'}">
                            </div>
                        ` : ''}

                        <div class="col-md-4 d-flex align-items-center justify-content-end gap-3 pt-3 ms-auto">
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
                            ${this.isFieldVisible('gen-telefono1') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-telefono1', 'Teléfono 1')}
                                    <input type="text" id="gen-telefono1" class="form-control form-control-capsule" value="${gen.telefono1 || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-telefono2') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-telefono2', 'Teléfono 2')}
                                    <input type="text" id="gen-telefono2" class="form-control form-control-capsule" value="${gen.telefono2 || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-telefonoMovil') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-telefonoMovil', 'Teléfono móvil')}
                                    <input type="text" id="gen-telefonoMovil" class="form-control form-control-capsule" value="${gen.telefonoMovil || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-fax') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-fax', 'Fax')}
                                    <input type="text" id="gen-fax" class="form-control form-control-capsule" value="${gen.fax || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-email') ? `
                                <div class="col-md-12">
                                    ${this.renderFieldLabel('gen-email', 'Correo electrónico')}
                                    <input type="email" id="gen-email" class="form-control form-control-capsule" value="${gen.email || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-sitioWeb') ? `
                                <div class="col-md-12">
                                    ${this.renderFieldLabel('gen-sitioWeb', 'Sitio Web')}
                                    <input type="text" id="gen-sitioWeb" class="form-control form-control-capsule" value="${gen.sitioWeb || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-centroDistribucion') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-centroDistribucion', 'Centro Distribución')}
                                    <select id="gen-centroDistribucion" class="form-select form-control-capsule">
                                        <option value="CENTRAL" ${gen.centroDistribucion === 'CENTRAL' ? 'selected' : ''}>CENTRAL</option>
                                        <option value="NORTE" ${gen.centroDistribucion === 'NORTE' ? 'selected' : ''}>NORTE</option>
                                        <option value="SUR" ${gen.centroDistribucion === 'SUR' ? 'selected' : ''}>SUR</option>
                                    </select>
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-claveAcceso') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-claveAcceso', 'Clave de acceso')}
                                    <input type="text" id="gen-claveAcceso" class="form-control form-control-capsule bg-warning-soft" value="${gen.claveAcceso || ''}">
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Datos Fiscales & Asignación</h6>
                        <div class="row g-2">
                            ${this.isFieldVisible('gen-personaContacto') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-personaContacto', 'Persona de contacto')}
                                    <input type="text" id="gen-personaContacto" class="form-control form-control-capsule" value="${gen.personaContacto || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-dpi') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-dpi', 'DPI')}
                                    <input type="text" id="gen-dpi" class="form-control form-control-capsule font-mono" value="${gen.dpi || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-nitParaFacturas') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-nitParaFacturas', 'NIT para Facturas')}
                                    <input type="text" id="gen-nitParaFacturas" class="form-control form-control-capsule font-mono fw-bold" value="${gen.nitParaFacturas || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-vendedor') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-vendedor', 'Vendedor')}
                                    ${this.renderSmartInput('gen-vendedor', gen.vendedor, CATALOGS.vendedores, 'dl-vendedor')}
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-territorio') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-territorio', 'Territorio')}
                                    <input type="text" id="gen-territorio" class="form-control form-control-capsule" value="${gen.territorio || ''}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-tipoSocioNegocios') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('gen-tipoSocioNegocios', 'Tipo socio negocios')}
                                    <input type="text" id="gen-tipoSocioNegocios" class="form-control form-control-capsule" value="${gen.tipoSocioNegocios || 'Sociedades'}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('gen-nombreAlias') ? `
                                <div class="col-md-12">
                                    ${this.renderFieldLabel('gen-nombreAlias', 'Nombre alias')}
                                    <input type="text" id="gen-nombreAlias" class="form-control form-control-capsule" value="${gen.nombreAlias || ''}">
                                </div>
                            ` : ''}
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
                                <i class="fa-solid fa-map-location-dot me-1"></i>
                                Mostrar ubicación en explorador web
                            </a>
                        </div>
                        <div class="row g-2">
                            ${this.isFieldVisible('dir-tipo') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('dir-tipo', 'Tipo de Dirección')}
                                    <select id="dir-tipo" class="form-select form-control-capsule">
                                        <option value="Destinatario de factura" ${activeDir.tipo === 'Destinatario de factura' ? 'selected' : ''}>Destinatario de factura</option>
                                        <option value="Destino" ${activeDir.tipo === 'Destino' ? 'selected' : ''}>Destino</option>
                                    </select>
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('dir-nombreDireccion') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('dir-nombreDireccion', 'Nombre de Dirección')}
                                    <input type="text" id="dir-nombreDireccion" class="form-control form-control-capsule" value="${activeDir.nombreDireccion || ''}">
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('dir-municipio') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('dir-municipio', 'MUNICIPIO')}
                                    ${this.renderSmartInput('dir-municipio', activeDir.municipio, CATALOGS.municipios, 'dl-municipios')}
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('dir-colonia') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('dir-colonia', 'Colonia')}
                                    <input type="text" id="dir-colonia" class="form-control form-control-capsule" value="${activeDir.colonia || ''}">
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('dir-direccionFel') ? `
                                <div class="col-md-12">
                                    ${this.renderFieldLabel('dir-direccionFel', 'DIRECCION FEL')}
                                    <input type="text" id="dir-direccionFel" class="form-control form-control-capsule fw-bold" value="${activeDir.direccionFel || ''}">
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('dir-codigoPostal') ? `
                                <div class="col-md-4">
                                    ${this.renderFieldLabel('dir-codigoPostal', 'Código Postal')}
                                    <input type="text" id="dir-codigoPostal" class="form-control form-control-capsule font-mono" value="${activeDir.codigoPostal || ''}">
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('dir-estado') ? `
                                <div class="col-md-4">
                                    ${this.renderFieldLabel('dir-estado', 'Estado / Departamento')}
                                    ${this.renderSmartInput('dir-estado', activeDir.estado, CATALOGS.departamentos, 'dl-departamentos')}
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('dir-pais') ? `
                                <div class="col-md-4">
                                    ${this.renderFieldLabel('dir-pais', 'País')}
                                    <select id="dir-pais" class="form-select form-control-capsule">
                                        <option value="Guatemala" ${activeDir.pais === 'Guatemala' ? 'selected' : ''}>Guatemala</option>
                                    </select>
                                </div>
                            ` : ''}
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
                            ${this.isFieldVisible('cnd-condicionesPago') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('cnd-condicionesPago', 'Condiciones de pago')}
                                    ${this.renderSmartInput('cnd-condicionesPago', cond.condicionesPago, CATALOGS.condicionesPago, 'dl-condiciones')}
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('cnd-listaPrecios') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('cnd-listaPrecios', 'Listas de precios')}
                                    ${this.renderSmartInput('cnd-listaPrecios', cond.listaPrecios, CATALOGS.listasPrecios, 'dl-listasPrecios')}
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('cnd-limiteCredito') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('cnd-limiteCredito', 'Límite de crédito (Q)')}
                                    <input type="text" id="cnd-limiteCredito" class="form-control form-control-capsule font-mono" value="${cond.limiteCredito || '0.00'}">
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('cnd-limiteComprometido') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('cnd-limiteComprometido', 'Límite comprometido (Q)')}
                                    <input type="text" id="cnd-limiteComprometido" class="form-control form-control-capsule font-mono" value="${cond.limiteComprometido || '0.00'}">
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="p-3 bg-light-gradient rounded-3 h-100">
                        <h6 class="fw-bold text-primary mb-3">Banco del Socio de Negocios</h6>
                        <div class="row g-2">
                            ${this.isFieldVisible('cnd-paisBanco') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('cnd-paisBanco', 'País del banco')}
                                    <input type="text" id="cnd-paisBanco" class="form-control form-control-capsule" value="${cond.paisBanco || 'Guatemala'}">
                                </div>
                            ` : ''}
                            ${this.isFieldVisible('cnd-nombreBanco') ? `
                                <div class="col-md-6">
                                    ${this.renderFieldLabel('cnd-nombreBanco', 'Nombre del banco')}
                                    <input type="text" id="cnd-nombreBanco" class="form-control form-control-capsule" value="${cond.nombreBanco || ''}">
                                </div>
                            ` : ''}
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
                            ${this.isFieldVisible('fin-deudoresCuenta') ? `
                                <div class="col-md-12">
                                    ${this.renderFieldLabel('fin-deudoresCuenta', 'Deudores (Cuenta SAP)')}
                                    ${this.renderSmartInput('fin-deudoresCuenta', fin.deudoresCuenta, CATALOGS.deudoresCuenta, 'dl-deudoresCuenta')}
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('fin-cuentaCompensacionAntic') ? `
                                <div class="col-md-12">
                                    ${this.renderFieldLabel('fin-cuentaCompensacionAntic', 'Cuenta compensación anticipos')}
                                    <input type="text" id="fin-cuentaCompensacionAntic" class="form-control form-control-capsule font-mono" value="${fin.cuentaCompensacionAntic || ''}">
                                </div>
                            ` : ''}

                            ${this.isFieldVisible('fin-cuentaProvisionalAntic') ? `
                                <div class="col-md-12">
                                    ${this.renderFieldLabel('fin-cuentaProvisionalAntic', 'Cuenta provisional anticipos')}
                                    <input type="text" id="fin-cuentaProvisionalAntic" class="form-control form-control-capsule font-mono" value="${fin.cuentaProvisionalAntic || ''}">
                                </div>
                            ` : ''}
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

    renderTabAnexos() {
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

    renderFieldsConfigModal() {
        const config = this.fieldConfigEngine.config;
        const keys = Object.keys(config).filter(k => {
            if (!this.fieldsSearchFilter) return true;
            const f = config[k];
            return f.label.toLowerCase().includes(this.fieldsSearchFilter.toLowerCase()) ||
                   f.section.toLowerCase().includes(this.fieldsSearchFilter.toLowerCase()) ||
                   (f.connectionSource || '').toLowerCase().includes(this.fieldsSearchFilter.toLowerCase());
        });

        return `
            <div>
                <p class="text-muted small mb-3">
                    Personalice la visibilidad de los campos, renombre etiquetas y configure conexiones a módulos o listados externos con buscador.
                </p>

                <div class="d-flex justify-content-between align-items-center mb-3 gap-2">
                    <div class="input-group input-group-sm style="max-width: 350px;">
                        <span class="input-group-text bg-white"><i class="fa-solid fa-magnifying-glass"></i></span>
                        <input type="text" id="cfg-field-search" class="form-control" placeholder="Buscar campo por nombre o sección..." value="${this.fieldsSearchFilter}">
                    </div>
                    <div>
                        <button id="btn-reset-fields-config" class="btn btn-xs btn-outline-danger me-2">Restablecer por Defecto</button>
                        <button id="btn-save-fields-config" class="btn btn-xs btn-primary-gradient">Guardar Cambios</button>
                    </div>
                </div>

                <div class="table-responsive" style="max-height: 480px; overflow-y: auto;">
                    <table class="table table-sm extra-small align-middle table-hover">
                        <thead>
                            <tr class="table-light">
                                <th style="width: 50px;">Mostrar</th>
                                <th>Campo / ID</th>
                                <th>Etiqueta Personalizada</th>
                                <th>Sección</th>
                                <th class="text-center">Conexión Externa</th>
                                <th class="text-center">Buscador / Autocompletar</th>
                                <th>Origen de Datos Conectado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${keys.map(k => {
                                const f = config[k];
                                return `
                                    <tr data-key="${k}">
                                        <td class="text-center">
                                            <input type="checkbox" class="cfg-visible-chk" ${f.visible ? 'checked' : ''}>
                                        </td>
                                        <td class="font-mono text-muted">${f.id}</td>
                                        <td>
                                            <input type="text" class="form-control form-control-sm cfg-label-input" value="${f.label}">
                                        </td>
                                        <td><span class="badge bg-secondary">${f.section}</span></td>
                                        <td class="text-center">
                                            <input type="checkbox" class="cfg-conn-chk" ${f.hasConnection ? 'checked' : ''}>
                                        </td>
                                        <td class="text-center">
                                            <input type="checkbox" class="cfg-search-chk" ${f.searchEnabled ? 'checked' : ''}>
                                        </td>
                                        <td>
                                            <input type="text" class="form-control form-control-sm cfg-source-input" value="${f.connectionSource || ''}" placeholder="Ej: SAP B1 / Tabla...">
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    initEvents() {
        // Modal de Configuración de Campos
        const btnOpenConfig = document.getElementById('btn-open-fields-config');
        const modalConfig = document.getElementById('fields-config-modal');
        const modalBodyConfig = document.getElementById('fields-modal-body');
        const btnCloseConfig = document.getElementById('btn-close-fields-modal');

        if (btnOpenConfig && modalConfig && modalBodyConfig) {
            btnOpenConfig.addEventListener('click', () => {
                modalBodyConfig.innerHTML = this.renderFieldsConfigModal();
                modalConfig.style.display = 'flex';
                this.initFieldsModalEvents();
            });
        }

        if (btnCloseConfig && modalConfig) {
            btnCloseConfig.addEventListener('click', () => {
                modalConfig.style.display = 'none';
            });
        }

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
                alert('¡Cliente guardado exitosamente!');
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

        // Botones de Contactos y Direcciones
        document.querySelectorAll('.contact-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.collectFormData();
                this.activeContactIndex = parseInt(btn.dataset.index, 10);
                this.refreshUI();
            });
        });

        document.querySelectorAll('.address-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.collectFormData();
                this.activeAddressIndex = parseInt(btn.dataset.index, 10);
                this.refreshUI();
            });
        });

        // Botón Agregar Contacto
        const btnAddContact = document.getElementById('btn-add-contact');
        if (btnAddContact) {
            btnAddContact.addEventListener('click', () => {
                this.collectFormData();
                const client = this.getSelectedClient();
                if (!client) return;
                client.contactos = client.contactos || [];
                const newContactNum = client.contactos.length + 1;
                client.contactos.push({
                    idContacto: `CONT-0${newContactNum}`,
                    nombre: `Contacto ${newContactNum}`,
                    posicion: 'Contacto General'
                });
                this.activeContactIndex = client.contactos.length - 1;
                this.saveClients();
                this.refreshUI();
            });
        }

        // Botón Agregar Dirección
        const btnAddAddress = document.getElementById('btn-add-address');
        if (btnAddAddress) {
            btnAddAddress.addEventListener('click', () => {
                this.collectFormData();
                const client = this.getSelectedClient();
                if (!client) return;
                client.direcciones = client.direcciones || [];
                const newDirNum = client.direcciones.length + 1;
                client.direcciones.push({
                    id: `DIR-0${newDirNum}`,
                    tipo: newDirNum % 2 === 0 ? 'Destino' : 'Destinatario de factura',
                    nombreDireccion: `Sucursal ${newDirNum}`,
                    municipio: 'Guatemala',
                    pais: 'Guatemala'
                });
                this.activeAddressIndex = client.direcciones.length - 1;
                this.saveClients();
                this.refreshUI();
            });
        }
    }

    initFieldsModalEvents() {
        const modalBody = document.getElementById('fields-modal-body');
        if (!modalBody) return;

        // Filtro de búsqueda dentro del modal
        const searchInput = document.getElementById('cfg-field-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.fieldsSearchFilter = e.target.value;
                modalBody.innerHTML = this.renderFieldsConfigModal();
                this.initFieldsModalEvents();
            });
        }

        // Botón Guardar Configuración de Campos
        const btnSave = document.getElementById('btn-save-fields-config');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const rows = modalBody.querySelectorAll('tbody tr');
                const newConfig = { ...this.fieldConfigEngine.config };

                rows.forEach(tr => {
                    const key = tr.dataset.key;
                    if (newConfig[key]) {
                        newConfig[key].visible = tr.querySelector('.cfg-visible-chk').checked;
                        newConfig[key].label = tr.querySelector('.cfg-label-input').value;
                        newConfig[key].hasConnection = tr.querySelector('.cfg-conn-chk').checked;
                        newConfig[key].searchEnabled = tr.querySelector('.cfg-search-chk').checked;
                        newConfig[key].connectionSource = tr.querySelector('.cfg-source-input').value;
                    }
                });

                this.fieldConfigEngine.saveConfig(newConfig);
                document.getElementById('fields-config-modal').style.display = 'none';
                this.refreshUI();
            });
        }

        // Botón Restablecer
        const btnReset = document.getElementById('btn-reset-fields-config');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm('¿Desea restablecer todos los campos a su configuración original?')) {
                    this.fieldConfigEngine.resetToDefaults();
                    document.getElementById('fields-config-modal').style.display = 'none';
                    this.refreshUI();
                }
            });
        }
    }

    collectFormData() {
        const client = this.getSelectedClient();
        if (!client) return;

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
        } else if (this.activeTab === 'finanzas') {
            client.finanzas = client.finanzas || {};
            client.finanzas.deudoresCuenta = getVal('fin-deudoresCuenta');
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
