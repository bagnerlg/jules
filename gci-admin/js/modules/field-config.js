/**
 * Motor de Configuración Dinámica de Campos para el Módulo Clientes (GCI Admin)
 * Permite agregar, ocultar, renombrar y configurar conexiones externas o
 * comportamiento de autocompletado/búsqueda en campos.
 */

const FIELD_CONFIG_STORAGE_KEY = 'gci_clients_field_config';

export const DEFAULT_FIELD_CONFIG = {
    // Cabecera Principal
    'hdr-codigo': { id: 'hdr-codigo', label: 'Código', section: 'Cabecera', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'SAP Business One / Secuencia Auto' },
    'hdr-tipoSN': { id: 'hdr-tipoSN', label: 'Tipo SN', section: 'Cabecera', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'hdr-nombre': { id: 'hdr-nombre', label: 'Nombre', section: 'Cabecera', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Directorio de Contactos' },
    'hdr-nombreExtranjero': { id: 'hdr-nombreExtranjero', label: 'Nombre extranjero', section: 'Cabecera', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'hdr-grupoCanal': { id: 'hdr-grupoCanal', label: 'Grupo - Canales', section: 'Cabecera', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Tabla Grupos SAP B1 / Supabase' },
    'hdr-moneda': { id: 'hdr-moneda', label: 'Moneda', section: 'Cabecera', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'hdr-rfc': { id: 'hdr-rfc', label: 'RFC / ID Fiscal', section: 'Cabecera', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },

    // Pestaña General
    'gen-telefono1': { id: 'gen-telefono1', label: 'Teléfono 1', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-telefono2': { id: 'gen-telefono2', label: 'Teléfono 2', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-telefonoMovil': { id: 'gen-telefonoMovil', label: 'Teléfono móvil', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-fax': { id: 'gen-fax', label: 'Fax', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-email': { id: 'gen-email', label: 'Correo electrónico', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-sitioWeb': { id: 'gen-sitioWeb', label: 'Sitio Web', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-centroDistribucion': { id: 'gen-centroDistribucion', label: 'Centro Distribución', section: 'General', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Catálogo Centros Logísticos' },
    'gen-claveAcceso': { id: 'gen-claveAcceso', label: 'Clave de acceso', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-personaContacto': { id: 'gen-personaContacto', label: 'Persona de contacto', section: 'General', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Módulo Contactos' },
    'gen-dpi': { id: 'gen-dpi', label: 'DPI', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-nitParaFacturas': { id: 'gen-nitParaFacturas', label: 'NIT para Facturas', section: 'General', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Padrón SAT / FEL' },
    'gen-vendedor': { id: 'gen-vendedor', label: 'Vendedor', section: 'General', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Empleados de Ventas SAP' },
    'gen-territorio': { id: 'gen-territorio', label: 'Territorio', section: 'General', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Zonas Geográficas' },
    'gen-tipoSocioNegocios': { id: 'gen-tipoSocioNegocios', label: 'Tipo socio negocios', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'gen-nombreAlias': { id: 'gen-nombreAlias', label: 'Nombre alias', section: 'General', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },

    // Direcciones
    'dir-tipo': { id: 'dir-tipo', label: 'Tipo de Dirección', section: 'Direcciones', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'dir-nombreDireccion': { id: 'dir-nombreDireccion', label: 'Nombre de Dirección', section: 'Direcciones', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'dir-municipio': { id: 'dir-municipio', label: 'MUNICIPIO', section: 'Direcciones', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Catálogo Google Sheets Ubicaciones' },
    'dir-colonia': { id: 'dir-colonia', label: 'Colonia', section: 'Direcciones', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'dir-direccionFel': { id: 'dir-direccionFel', label: 'DIRECCION FEL', section: 'Direcciones', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'dir-codigoPostal': { id: 'dir-codigoPostal', label: 'Código Postal', section: 'Direcciones', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'dir-estado': { id: 'dir-estado', label: 'Estado / Departamento', section: 'Direcciones', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Catálogo Departamentos Guatemala' },
    'dir-pais': { id: 'dir-pais', label: 'País', section: 'Direcciones', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },

    // Condiciones de Pago
    'cnd-condicionesPago': { id: 'cnd-condicionesPago', label: 'Condiciones de pago', section: 'Condiciones de Pago', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Términos Crédito SAP B1' },
    'cnd-listaPrecios': { id: 'cnd-listaPrecios', label: 'Listas de precios', section: 'Condiciones de Pago', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Módulo Precios / Catálogo Combos' },
    'cnd-limiteCredito': { id: 'cnd-limiteCredito', label: 'Límite de crédito (Q)', section: 'Condiciones de Pago', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'cnd-limiteComprometido': { id: 'cnd-limiteComprometido', label: 'Límite comprometido (Q)', section: 'Condiciones de Pago', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'cnd-paisBanco': { id: 'cnd-paisBanco', label: 'País del banco', section: 'Condiciones de Pago', visible: true, hasConnection: false, searchEnabled: false, connectionSource: '' },
    'cnd-nombreBanco': { id: 'cnd-nombreBanco', label: 'Nombre del banco', section: 'Condiciones de Pago', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Sistema Bancario Nacional' },

    // Finanzas
    'fin-deudoresCuenta': { id: 'fin-deudoresCuenta', label: 'Deudores (Cuenta SAP)', section: 'Finanzas', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Plan de Cuentas Contables SAP B1' },
    'fin-cuentaCompensacionAntic': { id: 'fin-cuentaCompensacionAntic', label: 'Cuenta compensación anticipos', section: 'Finanzas', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Plan de Cuentas' },
    'fin-cuentaProvisionalAntic': { id: 'fin-cuentaProvisionalAntic', label: 'Cuenta provisional anticipos', section: 'Finanzas', visible: true, hasConnection: true, searchEnabled: true, connectionSource: 'Plan de Cuentas' }
};

export class FieldConfigEngine {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        const stored = localStorage.getItem(FIELD_CONFIG_STORAGE_KEY);
        if (!stored) {
            this.saveConfig(DEFAULT_FIELD_CONFIG);
            return { ...DEFAULT_FIELD_CONFIG };
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error al cargar la configuración de campos:', e);
            return { ...DEFAULT_FIELD_CONFIG };
        }
    }

    saveConfig(cfg) {
        this.config = cfg;
        localStorage.setItem(FIELD_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
    }

    getField(fieldId) {
        return this.config[fieldId] || {
            id: fieldId,
            label: fieldId,
            section: 'General',
            visible: true,
            hasConnection: false,
            searchEnabled: false,
            connectionSource: ''
        };
    }

    resetToDefaults() {
        this.saveConfig(DEFAULT_FIELD_CONFIG);
        return { ...DEFAULT_FIELD_CONFIG };
    }
}
