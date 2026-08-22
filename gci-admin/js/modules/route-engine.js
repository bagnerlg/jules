/**
 * GCI ADMIN - Motor de Algoritmo de Optimización de Rutas (RouteEngine)
 * Procesa cartera, cobros, pedidos, garantías y acuerdos de visita para armar
 * la ruta óptima en Guatemala ordenada del punto más lejano al más cercano.
 */

// Mapeo de Regiones por Corredores Viales Principales de Guatemala
export const GUATEMALA_REGIONS = {
    'central': { name: 'Región Central / Metro (CA-1 / CA-9)', departments: ['Guatemala', 'Sacatepéquez', 'Chimaltenango'], lat: 14.6349, lng: -90.5069 },
    'occidente': { name: 'Ruta CA-1 Occidente / Altiplano', departments: ['Sololá', 'Totonicapán', 'Quetzaltenango', 'San Marcos', 'Huehuetenango'], lat: 14.8347, lng: -91.5181 },
    'oriente': { name: 'Ruta CA-1 Oriente / Suroriente', departments: ['El Progreso', 'Jalapa', 'Jutiapa', 'Santa Rosa', 'Zacapa', 'Chiquimula'], lat: 14.8333, lng: -89.5333 },
    'costa_sur': { name: 'Ruta CA-9 Sur & CA-2 Occidente (Costa Sur)', departments: ['Escuintla', 'Suchitepéquez', 'Retalhuleu'], lat: 14.3000, lng: -90.7833 },
    'verapaces_peten': { name: 'Ruta Verapaces - Petén (CA-14 & CA-13)', departments: ['Baja Verapaz', 'Alta Verapaz', 'Petén'], lat: 15.4667, lng: -90.3667 }
};

// Ubicación por Defecto Predeterminada (Sede GCI)
export const DEFAULT_ORIGIN_LOCATION = {
    name: 'Sede Central GCI Guatemala',
    mapsUrl: 'https://maps.app.goo.gl/TVUtjbZEseeTLVwu6',
    lat: 14.5800,
    lng: -90.5400,
    dept: 'Guatemala',
    muni: 'Guatemala'
};

// Helper para extraer latitud y longitud de un enlace o texto de Google Maps
export function parseGoogleMapsInput(input) {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim();
    if (!clean) return null;

    // Buscar patrón @lat,lng
    const atMatch = clean.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
        return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]), label: 'Ubicación Google Maps Personalizada' };
    }

    // Buscar patrón q=lat,lng o lat,lng directo
    const coordMatch = clean.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), label: 'Coordenadas Personalizadas' };
    }

    // Si es un enlace corto o dirección personalizada
    return {
        lat: DEFAULT_ORIGIN_LOCATION.lat,
        lng: DEFAULT_ORIGIN_LOCATION.lng,
        label: `Ubicación Vendedor: ${clean.length > 35 ? clean.substring(0, 35) + '...' : clean}`,
        mapsUrl: clean
    };
}

// Catálogo de Departamentos y Municipios de Guatemala con coordenadas para cálculo de origen
export const GUATEMALA_DEPARTMENTS_MUNICIPALITIES = {
    'Guatemala': [
        { name: 'Guatemala (Sede GCI Central)', lat: 14.5800, lng: -90.5400, mapsUrl: 'https://maps.app.goo.gl/TVUtjbZEseeTLVwu6' },
        { name: 'Mixco', lat: 14.6300, lng: -90.5700 },
        { name: 'Villa Nueva', lat: 14.5269, lng: -90.5875 },
        { name: 'Santa Catarina Pinula', lat: 14.5667, lng: -90.4833 },
        { name: 'San Miguel Petapa', lat: 14.5000, lng: -90.5500 },
        { name: 'Chinautla', lat: 14.7000, lng: -90.5000 },
        { name: 'Amatitlán', lat: 14.4833, lng: -90.6167 },
        { name: 'San José Pinula', lat: 14.5458, lng: -90.4131 },
        { name: 'Fraijanes', lat: 14.4639, lng: -90.4403 }
    ],
    'Sacatepéquez': [
        { name: 'Antigua Guatemala', lat: 14.5586, lng: -90.7295 },
        { name: 'Ciudad Vieja', lat: 14.5242, lng: -90.7625 },
        { name: 'Jocotenango', lat: 14.5739, lng: -90.7389 },
        { name: 'Sumpango', lat: 14.6467, lng: -90.7350 }
    ],
    'Chimaltenango': [
        { name: 'Chimaltenango', lat: 14.6611, lng: -90.8194 },
        { name: 'Tecpán Guatemala', lat: 14.7619, lng: -90.9942 },
        { name: 'Patzún', lat: 14.6819, lng: -91.0142 }
    ],
    'Escuintla': [
        { name: 'Escuintla', lat: 14.3000, lng: -90.7833 },
        { name: 'Santa Lucía Cotzumalguapa', lat: 14.3333, lng: -91.0167 },
        { name: 'Tiquisate', lat: 14.2833, lng: -91.3667 },
        { name: 'Puerto San José', lat: 13.9269, lng: -90.8208 }
    ],
    'Suchitepéquez': [
        { name: 'Mazatenango', lat: 14.5342, lng: -91.5033 },
        { name: 'Cuyotenango', lat: 14.5381, lng: -91.5722 },
        { name: 'San Antonio Suchitepéquez', lat: 14.5333, lng: -91.4167 }
    ],
    'Retalhuleu': [
        { name: 'Retalhuleu', lat: 14.5361, lng: -91.6778 },
        { name: 'San Sebastián', lat: 14.5625, lng: -91.6508 },
        { name: 'Champerico', lat: 14.2953, lng: -91.9133 }
    ],
    'Quetzaltenango': [
        { name: 'Quetzaltenango (Xela)', lat: 14.8347, lng: -91.5181 },
        { name: 'Coatepeque', lat: 14.7028, lng: -91.8617 },
        { name: 'Salcajá', lat: 14.8833, lng: -91.4500 },
        { name: 'Esperanza', lat: 14.8694, lng: -91.5622 }
    ],
    'San Marcos': [
        { name: 'San Marcos', lat: 14.9639, lng: -91.7944 },
        { name: 'San Pedro Sacatepéquez', lat: 14.9625, lng: -91.7778 },
        { name: 'Malacatán', lat: 14.9083, lng: -92.0583 }
    ],
    'Huehuetenango': [
        { name: 'Huehuetenango', lat: 15.3197, lng: -91.4708 },
        { name: 'Chiantla', lat: 15.3550, lng: -91.4589 },
        { name: 'Santa Cruz Barillas', lat: 15.8039, lng: -91.3158 }
    ],
    'Sololá': [
        { name: 'Sololá', lat: 14.7725, lng: -91.1833 },
        { name: 'Panajachel', lat: 14.7408, lng: -91.1569 },
        { name: 'San Lucas Tolimán', lat: 14.6300, lng: -91.1350 }
    ],
    'Totonicapán': [
        { name: 'Totonicapán', lat: 14.9111, lng: -91.3611 },
        { name: 'San Cristóbal Totonicapán', lat: 14.9167, lng: -91.4333 }
    ],
    'Quiché': [
        { name: 'Santa Cruz del Quiché', lat: 15.0306, lng: -91.1481 },
        { name: 'Chichicastenango', lat: 14.9439, lng: -91.1111 },
        { name: 'Santa María Nebaj', lat: 15.2972, lng: -91.1472 }
    ],
    'Alta Verapaz': [
        { name: 'Cobán', lat: 15.4667, lng: -90.3667 },
        { name: 'San Pedro Carchá', lat: 15.4764, lng: -90.3111 },
        { name: 'Chisec', lat: 15.8167, lng: -90.3000 }
    ],
    'Baja Verapaz': [
        { name: 'Salamá', lat: 15.1028, lng: -90.3181 },
        { name: 'Rabinal', lat: 15.1014, lng: -90.4903 }
    ],
    'Petén': [
        { name: 'Flores / Santa Elena', lat: 16.9297, lng: -89.8925 },
        { name: 'San Benito', lat: 16.9167, lng: -89.9000 },
        { name: 'Poptún', lat: 16.3319, lng: -89.4181 }
    ],
    'Izabal': [
        { name: 'Puerto Barrios', lat: 15.7278, lng: -88.5944 },
        { name: 'Morales', lat: 15.4833, lng: -88.8167 },
        { name: 'Los Amates', lat: 15.2583, lng: -89.0972 }
    ],
    'Zacapa': [
        { name: 'Zacapa', lat: 14.9722, lng: -89.5306 },
        { name: 'Teculután', lat: 14.9819, lng: -89.7189 },
        { name: 'Estanzuela', lat: 14.9972, lng: -89.5764 }
    ],
    'Chiquimula': [
        { name: 'Chiquimula', lat: 14.7833, lng: -89.5500 },
        { name: 'Esquipulas', lat: 14.5658, lng: -89.3519 },
        { name: 'Jocotán', lat: 14.8219, lng: -89.3889 }
    ],
    'Jalapa': [
        { name: 'Jalapa', lat: 14.6347, lng: -89.9889 },
        { name: 'San Pedro Pinula', lat: 14.6667, lng: -89.8500 }
    ],
    'Jutiapa': [
        { name: 'Jutiapa', lat: 14.2819, lng: -89.8958 },
        { name: 'Asunción Mita', lat: 14.3308, lng: -89.7108 }
    ],
    'El Progreso': [
        { name: 'Guastatoya', lat: 14.8539, lng: -90.0689 },
        { name: 'Sanarate', lat: 14.7819, lng: -90.1989 }
    ],
    'Santa Rosa': [
        { name: 'Cuilapa', lat: 14.2764, lng: -90.2989 },
        { name: 'Barberena', lat: 14.3083, lng: -90.3619 }
    ]
};

// Puntos de Referencia con Coordenadas para Ubicación de Inicio
export const REFERENCE_LOCATIONS = [
    { name: 'Sede Central GCI Guatemala', lat: 14.5800, lng: -90.5400, dept: 'Guatemala', mapsUrl: 'https://maps.app.goo.gl/TVUtjbZEseeTLVwu6' },
    { name: 'Mixco - Calzada Roosevelt', lat: 14.6300, lng: -90.5700, dept: 'Guatemala' },
    { name: 'Villa Nueva - Central', lat: 14.5269, lng: -90.5875, dept: 'Guatemala' },
    { name: 'Antigua Guatemala - Centro', lat: 14.5586, lng: -90.7295, dept: 'Sacatepéquez' },
    { name: 'Quetzaltenango - Xela Centro', lat: 14.8347, lng: -91.5181, dept: 'Quetzaltenango' },
    { name: 'Escuintla - Centro Comercial', lat: 14.3000, lng: -90.7833, dept: 'Escuintla' },
    { name: 'Mazatenango - Suchitepéquez', lat: 14.5342, lng: -91.5033, dept: 'Suchitepéquez' },
    { name: 'Retalhuleu - Reu Centro', lat: 14.5361, lng: -91.6778, dept: 'Retalhuleu' },
    { name: 'Cobán - Alta Verapaz', lat: 15.4667, lng: -90.3667, dept: 'Alta Verapaz' },
    { name: 'Chiquimula - Centro', lat: 14.7833, lng: -89.5500, dept: 'Chiquimula' }
];

// Configuración de Horarios Laborales y Distancias por Defecto
export const DEFAULT_TIME_CONFIG = {
    workStartHour: '07:00',
    workEndHour: '17:00',
    visitDurationMinutes: 60, // Estándar 1 hora por cliente (máximo 120 min / 2 horas)
    maxConsecutiveDistanceKm: 20 // Máximo 20 KM entre paradas consecutivas
};

// Base de Datos Demostrativa de Cartera, Cobros y Pedidos integrados
const DEMO_ROUTE_DATA = [
    {
        id: 'CLI-7655982',
        nit: '7655982-3',
        cliente: 'DON LEON - EMPRESAS ASLAN, S.A.',
        vendedor: 'ASLAN',
        regionKey: 'occidente',
        municipio: 'Mazatenango',
        departamento: 'Suchitepéquez',
        subZona: 'Mazatenango Centro',
        direccion: 'Calle Principal Don León Z.1',
        lat: 14.5342,
        lng: -91.5033,
        cartera: { noVencido: 72507.50, d01_30: 58696.25, d31_60: 58050.00, d61_90: 57947.50, d91_120: 54682.01, d120_mas: 49145.95 },
        formaPago: '30 Días',
        diasMoraMax: 135,
        frecuenciaCompraScore: 8,
        garantiasAbiertas: 2,
        pedidoListoPagoPendiente: true,
        montoPedidoListo: 2186.03,
        diasSinComprar: 12,
        ultimoPagoDias: 5,
        esIncobrableCandidate: true
    },
    {
        id: 'CLI-6576974',
        nit: '657697-4',
        cliente: 'ELEKTRA DE GUATEMALA - MAZATENANGO',
        vendedor: 'PAOLA SOLIS',
        regionKey: 'costa_sur',
        municipio: 'Mazatenango',
        departamento: 'Suchitepéquez',
        subZona: 'Mazatenango Centro',
        direccion: '4ta Calle 2-15 Zona 1',
        lat: 14.5380,
        lng: -91.5080,
        cartera: { noVencido: 12000.00, d01_30: 45000.00, d31_60: 0, d61_90: 0, d91_120: 0, d120_mas: 0 },
        formaPago: '15 Días',
        diasMoraMax: 28,
        frecuenciaCompraScore: 9,
        garantiasAbiertas: 0,
        pedidoListoPagoPendiente: true,
        montoPedidoListo: 15400.00,
        diasSinComprar: 8,
        ultimoPagoDias: 3
    },
    {
        id: 'CLI-60895616',
        nit: '60895616',
        cliente: 'JIMMY JHONATÁN ESTRADA - DISTRIBUIDORA',
        vendedor: 'CARLOS LÓPEZ',
        regionKey: 'oriente',
        municipio: 'Chiquimula',
        departamento: 'Chiquimula',
        subZona: 'Chiquimula Centro',
        direccion: 'Barrio El Centro',
        lat: 14.7833,
        lng: -89.5500,
        cartera: { noVencido: 8000.00, d01_30: 11592.00, d31_60: 25000.00, d61_90: 18000.00, d91_120: 0, d120_mas: 0 },
        formaPago: '30 Días',
        diasMoraMax: 65,
        frecuenciaCompraScore: 6,
        garantiasAbiertas: 1,
        pedidoListoPagoPendiente: false,
        diasSinComprar: 48, // Ha dejado de comprar > 45 días
        ultimoPagoDias: 10 // Ha pagado pero no comprado
    },
    {
        id: 'CLI-74853627',
        nit: '74853627',
        cliente: 'JORGE VICTOR, GASPAR LÓPEZ',
        vendedor: 'MARÍA PÉREZ',
        regionKey: 'occidente',
        municipio: 'Quetzaltenango',
        departamento: 'Quetzaltenango',
        subZona: 'Xela Urbana / Zona 3',
        direccion: '12 Avenida Zona 3, Xela',
        lat: 14.8347,
        lng: -91.5181,
        cartera: { noVencido: 5000.00, d01_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120_mas: 0 },
        formaPago: 'Efectivo',
        diasMoraMax: 0,
        frecuenciaCompraScore: 9,
        garantiasAbiertas: 3, // Muchas garantías abiertas
        pedidoListoPagoPendiente: false,
        diasSinComprar: 15,
        ultimoPagoDias: 15
    },
    {
        id: 'CLI-33550328',
        nit: '3355032-8',
        cliente: 'JUAN GABRIEL ACEITUNO BARRIENTOS',
        vendedor: 'PAOLA SOLIS',
        regionKey: 'central',
        municipio: 'Villa Nueva',
        departamento: 'Guatemala',
        subZona: 'Villa Nueva Sur / Petapa',
        direccion: '16 Avenida 2-00 Zona 4',
        lat: 14.5269,
        lng: -90.5875,
        cartera: { noVencido: 15000.00, d01_30: 8000.00, d31_60: 12000.00, d61_90: 0, d91_120: 0, d120_mas: 0 },
        formaPago: '30 Días',
        diasMoraMax: 40,
        frecuenciaCompraScore: 7,
        garantiasAbiertas: 1,
        pedidoListoPagoPendiente: true,
        montoPedidoListo: 3583.83,
        diasSinComprar: 20,
        ultimoPagoDias: 20
    },
    {
        id: 'CLI-47326905',
        nit: '47326905',
        cliente: 'ALMACENES DON LEÓN RETALHULEU',
        vendedor: 'JORGE MARTÍNEZ',
        regionKey: 'costa_sur',
        municipio: 'Retalhuleu',
        departamento: 'Retalhuleu',
        subZona: 'Retalhuleu Centro',
        direccion: '5ta Calle Zona 1 Reu',
        lat: 14.5361,
        lng: -91.6778,
        cartera: { noVencido: 0, d01_30: 0, d31_60: 0, d61_90: 0, d91_120: 30000.00, d120_mas: 85000.00 },
        formaPago: '30 Días',
        diasMoraMax: 140,
        frecuenciaCompraScore: 2,
        garantiasAbiertas: 0,
        pedidoListoPagoPendiente: false,
        diasSinComprar: 90,
        ultimoPagoDias: 70, // Incobrable (>120 días mora, >60 días sin pago)
        esIncobrableCandidate: true
    }
];

// Reglas de Negocio Predeterminadas (por defecto)
export const DEFAULT_ROUTE_RULES = [
    {
        id: 'RULE-1',
        name: 'Regla 1: Cliente moroso según días de mora',
        type: 'score', // 'score' o 'strict_filter'
        enabled: true,
        scorePoints: 150,
        logic: 'AND',
        conditions: [
            { field: 'diasMoraMax', operator: '>', value: 30 }
        ]
    },
    {
        id: 'RULE-2',
        name: 'Regla 2: Cliente con alta frecuencia de compra',
        type: 'score',
        enabled: true,
        scorePoints: 120,
        logic: 'AND',
        conditions: [
            { field: 'frecuenciaCompraScore', operator: '>=', value: 8 }
        ]
    },
    {
        id: 'RULE-3',
        name: 'Regla 3: Órdenes de garantía pendientes',
        type: 'score',
        enabled: true,
        scorePoints: 130,
        logic: 'AND',
        conditions: [
            { field: 'garantiasAbiertas', operator: '>', value: 0 }
        ]
    },
    {
        id: 'RULE-4',
        name: 'Regla 4: Pedido listo de envío con pago pendiente',
        type: 'score',
        enabled: true,
        scorePoints: 140,
        logic: 'AND',
        conditions: [
            { field: 'pedidoListoPagoPendiente', operator: '==', value: true }
        ]
    },
    {
        id: 'RULE-5',
        name: 'Regla 5: Cartera vencida de atraso importante (>Q10,000)',
        type: 'score',
        enabled: true,
        scorePoints: 80,
        logic: 'AND',
        conditions: [
            { field: 'carteraVencidaTotal', operator: '>', value: 10000 }
        ]
    },
    {
        id: 'RULE-6',
        name: 'Regla 6: Sin compras en los últimos 45 a 120 días',
        type: 'score',
        enabled: true,
        scorePoints: 90,
        logic: 'AND',
        conditions: [
            { field: 'diasSinComprar', operator: '>=', value: 45 },
            { field: 'diasSinComprar', operator: '<', value: 120 }
        ]
    },
    {
        id: 'RULE-7',
        name: 'Regla 7: Pago reciente pero deserción en compras',
        type: 'score',
        enabled: true,
        scorePoints: 100,
        logic: 'AND',
        conditions: [
            { field: 'diasSinComprar', operator: '>=', value: 45 },
            { field: 'ultimoPagoDias', operator: '<=', value: 30 }
        ]
    },
    {
        id: 'RULE-8',
        name: 'Regla 8: Acuerdo de visita agendado previamente (Máxima Prioridad)',
        type: 'score',
        enabled: true,
        scorePoints: 1000,
        logic: 'AND',
        conditions: [
            { field: 'isAgreed', operator: '==', value: true }
        ]
    },
    {
        id: 'RULE-9',
        name: 'Regla 9: Candidato a recuperación incobrable (Límite Máximo 1 por ruta)',
        type: 'strict_filter',
        enabled: true,
        scorePoints: 70,
        filterAction: 'max_limit',
        maxLimitValue: 1,
        logic: 'AND',
        conditions: [
            { field: 'esIncobrableCandidate', operator: '==', value: true }
        ]
    }
];

export class RouteEngine {
    constructor() {
        this.scheduledVisitsKey = 'gci_scheduled_visits';
        this.completionsKey = 'gci_route_completions';
        this.rulesKey = 'gci_route_rules';
        this.timeConfigKey = 'gci_route_time_config';
    }

    getTimeConfig() {
        try {
            const saved = localStorage.getItem(this.timeConfigKey);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Error al cargar configuración de tiempos:", e);
        }
        return JSON.parse(JSON.stringify(DEFAULT_TIME_CONFIG));
    }

    saveTimeConfig(config) {
        localStorage.setItem(this.timeConfigKey, JSON.stringify(config));
    }

    resetTimeConfigToDefault() {
        localStorage.setItem(this.timeConfigKey, JSON.stringify(DEFAULT_TIME_CONFIG));
        return JSON.parse(JSON.stringify(DEFAULT_TIME_CONFIG));
    }

    /**
     * Obtiene la hora actual en Guatemala en formato "HH:MM" de 24 horas.
     */
    getGuatemalaCurrentTimeStr() {
        const now = new Date();
        const options = { timeZone: 'America/Guatemala', hour: '2-digit', minute: '2-digit', hour12: false };
        const timeParts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        let h = '07', m = '00';
        timeParts.forEach(p => {
            if (p.type === 'hour') h = p.value;
            if (p.type === 'minute') m = p.value;
        });
        if (h === '24') h = '00';
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }

    /**
     * Obtiene la fecha actual en Guatemala en formato "YYYY-MM-DD".
     */
    getGuatemalaTodayDateStr() {
        const now = new Date();
        const options = { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' };
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        let y = '', m = '', d = '';
        parts.forEach(p => {
            if (p.type === 'year') y = p.value;
            if (p.type === 'month') m = p.value;
            if (p.type === 'day') d = p.value;
        });
        return `${y}-${m}-${d}`;
    }

    /**
     * Suma N minutos a un string de hora "HH:MM"
     */
    addMinutesToTimeStr(timeStr, minsToAdd) {
        const [h, m] = timeStr.split(':').map(Number);
        const totalMins = (h * 60) + m + minsToAdd;
        const newH = Math.floor(totalMins / 60) % 24;
        const newM = totalMins % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    /**
     * Retorna la diferencia en minutos entre dos horas (timeStr2 - timeStr1)
     */
    diffMinutes(timeStr1, timeStr2) {
        const [h1, m1] = timeStr1.split(':').map(Number);
        const [h2, m2] = timeStr2.split(':').map(Number);
        return ((h2 * 60) + m2) - ((h1 * 60) + m1);
    }

    getRules() {
        try {
            const saved = localStorage.getItem(this.rulesKey);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Error al cargar reglas guardadas:", e);
        }
        return JSON.parse(JSON.stringify(DEFAULT_ROUTE_RULES));
    }

    saveRules(rules) {
        localStorage.setItem(this.rulesKey, JSON.stringify(rules));
    }

    resetRulesToDefault() {
        localStorage.setItem(this.rulesKey, JSON.stringify(DEFAULT_ROUTE_RULES));
        return JSON.parse(JSON.stringify(DEFAULT_ROUTE_RULES));
    }

    /**
     * Extrae el valor dinámico del objeto cliente para un campo dado.
     */
    extractFieldValue(client, fieldName, targetDateStr) {
        if (fieldName === 'isAgreed') {
            const scheduledVisits = this.getScheduledVisits();
            return scheduledVisits.some(v => v.clientId === client.id && v.date === targetDateStr);
        }
        if (fieldName === 'carteraVencidaTotal') {
            return (client.cartera?.d31_60 || 0) + (client.cartera?.d61_90 || 0) + (client.cartera?.d91_120 || 0);
        }
        if (fieldName in client) {
            return client[fieldName];
        }
        if (client.cartera && fieldName in client.cartera) {
            return client.cartera[fieldName];
        }
        return null;
    }

    /**
     * Evalúa una condición individual entre el valor del cliente y la regla.
     */
    evaluateConditionValue(clientVal, operator, targetVal) {
        if (clientVal === null || clientVal === undefined) return false;

        const numClient = Number(clientVal);
        const numTarget = Number(targetVal);
        const isNumComp = !isNaN(numClient) && !isNaN(numTarget) && typeof targetVal !== 'boolean';

        switch (operator) {
            case '>':
                return isNumComp ? numClient > numTarget : false;
            case '<':
                return isNumComp ? numClient < numTarget : false;
            case '>=':
                return isNumComp ? numClient >= numTarget : false;
            case '<=':
                return isNumComp ? numClient <= numTarget : false;
            case '==':
                return String(clientVal).toLowerCase() === String(targetVal).toLowerCase();
            case '!=':
                return String(clientVal).toLowerCase() !== String(targetVal).toLowerCase();
            case 'contains':
                return String(clientVal).toLowerCase().includes(String(targetVal).toLowerCase());
            default:
                return false;
        }
    }

    /**
     * Evalúa si una regla aplica para un cliente considerando sus condiciones y conectores Y / O.
     */
    evaluateRuleForClient(rule, client, targetDateStr) {
        if (!rule.enabled || !rule.conditions || rule.conditions.length === 0) {
            return false;
        }

        const logic = rule.logic || 'AND';
        const results = rule.conditions.map(cond => {
            const clientVal = this.extractFieldValue(client, cond.field, targetDateStr);
            return this.evaluateConditionValue(clientVal, cond.operator, cond.value);
        });

        if (logic === 'OR') {
            return results.some(r => r === true);
        }
        // Por defecto 'AND'
        return results.every(r => r === true);
    }

    getCompletions() {
        try {
            return JSON.parse(localStorage.getItem(this.completionsKey) || '{}');
        } catch (e) {
            return {};
        }
    }

    saveVisitCompletion(dateStr, clientId, reportData) {
        const completions = this.getCompletions();
        const key = `${dateStr}_${clientId}`;
        completions[key] = {
            date: dateStr,
            clientId: clientId,
            timestamp: new Date().toISOString(),
            ...reportData
        };
        localStorage.setItem(this.completionsKey, JSON.stringify(completions));
    }

    isVisitCompleted(dateStr, clientId) {
        const completions = this.getCompletions();
        return !!completions[`${dateStr}_${clientId}`];
    }

    getScheduledVisits() {
        try {
            return JSON.parse(localStorage.getItem(this.scheduledVisitsKey) || '[]');
        } catch (e) {
            return [];
        }
    }

    addScheduledVisit(visitData) {
        const visits = this.getScheduledVisits();
        visits.push({
            id: 'SCH-' + Date.now(),
            clientId: visitData.clientId,
            clientName: visitData.clientName,
            date: visitData.date, // Formato YYYY-MM-DD
            notes: visitData.notes || '',
            created: new Date().toISOString()
        });
        localStorage.setItem(this.scheduledVisitsKey, JSON.stringify(visits));
    }

    deleteScheduledVisit(visitId) {
        let visits = this.getScheduledVisits();
        visits = visits.filter(v => v.id !== visitId);
        localStorage.setItem(this.scheduledVisitsKey, JSON.stringify(visits));
    }

    // Fórmula Haversine para distancia en línea recta (KM)
    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radio de la Tierra en KM
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Evalúa las reglas dinámicas configuradas para cada cliente y asigna una puntuación de prioridad.
     */
    evaluateClientPriority(client, targetDateStr) {
        let score = 0;
        const reasons = [];

        const activeRules = this.getRules().filter(r => r.enabled);
        const scheduledVisits = this.getScheduledVisits();
        const agreement = scheduledVisits.find(v => v.clientId === client.id && v.date === targetDateStr);
        const isAgreed = !!agreement;

        activeRules.forEach(rule => {
            const applies = this.evaluateRuleForClient(rule, client, targetDateStr);
            if (applies) {
                const pts = Number(rule.scorePoints || 0);
                score += pts;
                reasons.push(`${rule.name} (+${pts} pts)`);
            }
        });

        return { score, reasons, isAgreed };
    }

    /**
     * Planifica la ruta óptima con Agrupación Geográfica (Sub-Zonas / Vecino Más Cercano <= 20KM)
     * y Ventanas de Tiempo Laborales (7:00 AM - 5:00 PM).
     */
    planRoute({ regionKey, originCoords, targetDateStr }) {
        const selectedRegion = GUATEMALA_REGIONS[regionKey] || GUATEMALA_REGIONS['central'];
        const activeRules = this.getRules().filter(r => r.enabled);
        const timeConfig = this.getTimeConfig();

        const todayStr = this.getGuatemalaTodayDateStr();
        const isToday = (targetDateStr === todayStr);

        let startTime = timeConfig.workStartHour || '07:00';
        let workEnd = timeConfig.workEndHour || '17:00';
        let visitMins = Number(timeConfig.visitDurationMinutes) || 60;
        let maxKm = Number(timeConfig.maxConsecutiveDistanceKm) || 20;

        let isWorkDayEnded = false;
        let suggestionMsg = '';

        if (isToday) {
            const currentGuaTime = this.getGuatemalaCurrentTimeStr();
            if (this.diffMinutes(currentGuaTime, workEnd) <= 30) {
                // Son pasadas las 4:30 PM o 5:00 PM
                isWorkDayEnded = true;
                suggestionMsg = `Atención: La jornada laboral de hoy (${startTime} - ${workEnd}) está por finalizar o ha concluido (${currentGuaTime}). Se sugiere seleccionar una fecha futura para programar la ruta desde las 7:00 AM.`;
            } else if (this.diffMinutes(startTime, currentGuaTime) > 0) {
                // Si la hora actual es posterior a 7:00 AM (ej. 3:00 PM / 15:00)
                startTime = currentGuaTime;
            }
        }

        // 1. Filtrar clientes pertenecientes a la región o con acuerdo agendado para hoy
        let candidates = DEMO_ROUTE_DATA.filter(c => {
            const matchesRegion = c.regionKey === regionKey || selectedRegion.departments.includes(c.departamento);
            const { isAgreed } = this.evaluateClientPriority(c, targetDateStr);
            return matchesRegion || isAgreed;
        });

        // 2. Aplicar reglas de Filtro Estricto (exclude)
        const excludeRules = activeRules.filter(r => r.type === 'strict_filter' && r.filterAction === 'exclude');
        if (excludeRules.length > 0) {
            candidates = candidates.filter(client => {
                const isExcluded = excludeRules.some(rule => this.evaluateRuleForClient(rule, client, targetDateStr));
                return !isExcluded;
            });
        }

        // 3. Evaluar puntuaciones de prioridad y distancias al origen
        candidates = candidates.map(client => {
            const evalResult = this.evaluateClientPriority(client, targetDateStr);
            const distFromOrigin = this.calculateHaversineDistance(
                originCoords.lat, originCoords.lng, client.lat, client.lng
            );

            return {
                ...client,
                priorityScore: evalResult.score,
                priorityReasons: evalResult.reasons,
                isAgreed: evalResult.isAgreed,
                distanceKm: parseFloat(distFromOrigin.toFixed(2))
            };
        });

        // 4. Aplicar reglas de Filtro Estricto de límite máximo (max_limit)
        const maxLimitRules = activeRules.filter(r => r.type === 'strict_filter' && r.filterAction === 'max_limit');
        maxLimitRules.forEach(rule => {
            const limit = Number(rule.maxLimitValue || 1);
            let matchCount = 0;
            candidates = candidates.filter(client => {
                const matches = this.evaluateRuleForClient(rule, client, targetDateStr);
                if (matches) {
                    if (matchCount >= limit && !client.isAgreed) return false;
                    matchCount++;
                }
                return true;
            });
        });

        // 5. Algoritmo de Vecino Más Cercano (Nearest-Neighbor) con Límite de Distancia (20 KM) y Ventana Temporal
        let unvisited = [...candidates];
        const routeWaypoints = [];
        const overflowClients = [];

        let currentLat = originCoords.lat;
        let currentLng = originCoords.lng;
        let currentTime = startTime;

        while (unvisited.length > 0) {
            // Evaluar candidatos disponibles desde la posición actual
            let bestIndex = -1;
            let bestScore = -Infinity;
            let minDistance = Infinity;

            for (let i = 0; i < unvisited.length; i++) {
                const client = unvisited[i];
                const dist = this.calculateHaversineDistance(currentLat, currentLng, client.lat, client.lng);

                // Priorizar paradas que estén dentro del límite de Sub-Zona / Vecino Cercano (< 20 KM)
                const isWithinRange = dist <= maxKm;

                // Puntuación combinada (Prioridad de Negocio + Proximidad)
                let combinedScore = client.priorityScore - (dist * 2);
                if (isWithinRange) combinedScore += 500; // Bonificación de cluster cercano

                if (combinedScore > bestScore) {
                    bestScore = combinedScore;
                    minDistance = dist;
                    bestIndex = i;
                }
            }

            if (bestIndex === -1) break;

            const nextClient = unvisited.splice(bestIndex, 1)[0];
            const segDist = this.calculateHaversineDistance(currentLat, currentLng, nextClient.lat, nextClient.lng);

            // Tiempo de viaje estimado en minutos (aprox. 2 min por KM en tráfico comercial)
            const travelMins = Math.max(10, Math.round(segDist * 2));
            const estArrival = this.addMinutesToTimeStr(currentTime, travelMins);
            const estDeparture = this.addMinutesToTimeStr(estArrival, visitMins);

            // Verificar si el cliente puede ser atendido antes de las 5:00 PM (workEnd)
            const remainingMins = this.diffMinutes(estDeparture, workEnd);

            if (remainingMins >= 0) {
                // Cabe dentro de la jornada laboral
                routeWaypoints.push({
                    step: routeWaypoints.length + 1,
                    ...nextClient,
                    segmentDistanceKm: parseFloat(segDist.toFixed(2)),
                    estimatedArrival: estArrival,
                    estimatedDeparture: estDeparture,
                    timeWindow: `${estArrival} - ${estDeparture}`,
                    actualArrival: estArrival, // Por defecto igual a estimada
                    actualDeparture: estDeparture,
                    wazeUrl: `https://www.waze.com/live-map/directions?from=ll.${currentLat}%2C${currentLng}&to=ll.${nextClient.lat}%2C${nextClient.lng}`,
                    wazeAppUrl: `https://www.waze.com/ul?ll=${nextClient.lat}%2C${nextClient.lng}&navigate=yes`,
                    mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${nextClient.lat},${nextClient.lng}&travelmode=driving`
                });

                currentLat = nextClient.lat;
                currentLng = nextClient.lng;
                currentTime = estDeparture;
            } else {
                // Excede las 5:00 PM
                overflowClients.push(nextClient);
            }
        }

        // Si quedaron clientes fuera por límite de horario
        if (overflowClients.length > 0 && !suggestionMsg) {
            suggestionMsg = `Atención: El tiempo restante de la jornada laboral (hasta las 5:00 PM) no permite cubrir a todos los clientes hoy. Se sugiere programar las paradas restantes (${overflowClients.map(c => c.cliente).join(', ')}) para el día siguiente desde las 7:00 AM.`;
        }

        const totalKm = routeWaypoints.reduce((sum, w) => sum + w.distanceKm, 0);

        return {
            region: selectedRegion,
            date: targetDateStr,
            origin: originCoords,
            timeConfig: timeConfig,
            startTimeUsed: startTime,
            isWorkDayEnded: isWorkDayEnded,
            suggestionMsg: suggestionMsg,
            overflowClients: overflowClients,
            totalWaypoints: routeWaypoints.length,
            totalEstimatedKm: parseFloat(totalKm.toFixed(1)),
            waypoints: routeWaypoints
        };
    }

    /**
     * Helper genérico para realizar peticiones a la API de Waze OpenWebNinja.
     * Intenta llamada directa primero; si ocurre un error de CORS o de red, utiliza un proxy CORS.
     */
    async executeWazeApiFetch(targetUrl) {
        const configData = JSON.parse(localStorage.getItem('gci_api_config') || '{}');
        const apiKey = configData.wazeApiKey;

        if (!apiKey) {
            console.warn("Waze API Key no configurada.");
            return { status: 'NO_KEY', message: 'Clave API de Waze (x-api-key) no configurada en Conexiones' };
        }

        const headers = {
            'x-api-key': apiKey,
            'Accept': 'application/json'
        };

        // Intento 1: Fetch directo
        try {
            const response = await fetch(targetUrl, { method: 'GET', headers });
            if (response.ok) {
                const json = await response.json();
                return { status: 'OK', data: json.data || json };
            }
        } catch (directErr) {
            console.warn("Fetch directo a Waze API bloqueado o falló (posible bloqueo CORS). Intentando proxy CORS...", directErr);
        }

        // Intento 2: Fallback con Proxy CORS
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
            const response = await fetch(proxyUrl, { method: 'GET', headers });
            if (response.ok) {
                const json = await response.json();
                return { status: 'OK', data: json.data || json };
            }
        } catch (proxyErr) {
            console.warn("Fallback con corsproxy.io falló. Intentando allorigins...", proxyErr);
        }

        // Intento 3: Fallback alternativo con AllOrigins
        try {
            const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
            const response = await fetch(allOriginsUrl);
            if (response.ok) {
                const wrapperJson = await response.json();
                const json = JSON.parse(wrapperJson.contents);
                return { status: 'OK', data: json.data || json };
            }
        } catch (aoErr) {
            console.error("Error final en todos los intentos de conexión a Waze API:", aoErr);
        }

        return { status: 'ERROR', message: 'No se pudo conectar a la API de Waze. Verifique conexión o la API Key.' };
    }

    /**
     * 1. Driving Directions (/waze/driving-directions)
     * Parámetros requeridos: source_coordinates, destination_coordinates
     */
    async fetchWazeDrivingDirections(sourceCoords, destCoords) {
        const sourceStr = `${sourceCoords.lat},${sourceCoords.lng}`;
        const destStr = `${destCoords.lat},${destCoords.lng}`;
        const url = `https://api.openwebninja.com/waze/driving-directions?source_coordinates=${encodeURIComponent(sourceStr)}&destination_coordinates=${encodeURIComponent(destStr)}`;

        const res = await this.executeWazeApiFetch(url);
        if (res.status === 'OK') {
            return {
                status: 'OK',
                routes: Array.isArray(res.data) ? res.data : (res.data?.routes || [res.data]),
                requestParams: { source: sourceStr, destination: destStr }
            };
        }
        return { status: res.status, message: res.message, routes: [] };
    }

    /**
     * 2. Alerts and Jams (/waze/alerts-and-jams)
     * Parámetros requeridos: bottom_left, top_right
     */
    async fetchWazeTrafficAlerts(bottomLeftStr, topRightStr) {
        const url = `https://api.openwebninja.com/waze/alerts-and-jams?bottom_left=${encodeURIComponent(bottomLeftStr)}&top_right=${encodeURIComponent(topRightStr)}`;
        const res = await this.executeWazeApiFetch(url);
        if (res.status === 'OK') {
            return {
                status: 'OK',
                alerts: res.data?.alerts || [],
                jams: res.data?.jams || []
            };
        }
        return { status: res.status, message: res.message, alerts: [], jams: [] };
    }

    /**
     * 3. Autocomplete (/waze/autocomplete)
     * Parámetros requeridos: q, coordinates
     */
    async fetchWazeAutocomplete(queryStr, coordsObj) {
        const coordsStr = `${coordsObj.lat},${coordsObj.lng}`;
        const url = `https://api.openwebninja.com/waze/autocomplete?q=${encodeURIComponent(queryStr)}&coordinates=${encodeURIComponent(coordsStr)}`;
        const res = await this.executeWazeApiFetch(url);
        if (res.status === 'OK') {
            return {
                status: 'OK',
                suggestions: res.data?.results || res.data || []
            };
        }
        return { status: res.status, message: res.message, suggestions: [] };
    }

    /**
     * 4. Venues (/waze/venues)
     * Parámetros requeridos: bottom_left, top_right
     */
    async fetchWazeVenues(bottomLeftStr, topRightStr) {
        const url = `https://api.openwebninja.com/waze/venues?bottom_left=${encodeURIComponent(bottomLeftStr)}&top_right=${encodeURIComponent(topRightStr)}`;
        const res = await this.executeWazeApiFetch(url);
        if (res.status === 'OK') {
            return {
                status: 'OK',
                venues: res.data?.venues || res.data || []
            };
        }
        return { status: res.status, message: res.message, venues: [] };
    }
}
