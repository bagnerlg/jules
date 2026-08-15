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

// Puntos de Referencia con Coordenadas para Ubicación de Inicio
export const REFERENCE_LOCATIONS = [
    { name: 'Sede Central Guatemala (Zona 12)', lat: 14.5800, lng: -90.5400, dept: 'Guatemala' },
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

export class RouteEngine {
    constructor() {
        this.scheduledVisitsKey = 'gci_scheduled_visits';
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
     * Evalúa las 9 reglas de negocio para cada cliente y asigna una puntuación de prioridad.
     */
    evaluateClientPriority(client, targetDateStr) {
        let score = 0;
        const reasons = [];

        // REGLA 8: Acuerdo de visita agendado para esta fecha específica (MÁXIMA PRIORIDAD)
        const scheduledVisits = this.getScheduledVisits();
        const agreement = scheduledVisits.find(v => v.clientId === client.id && v.date === targetDateStr);
        if (agreement) {
            score += 1000;
            reasons.push(`REGLA 8: Visita acordada previamente (${agreement.notes || 'Confirmado'})`);
        }

        // REGLA 1: Cliente moroso según cartera (días de mora mayores a forma de pago)
        if (client.diasMoraMax > 30) {
            score += 150;
            reasons.push(`REGLA 1: Moroso con ${client.diasMoraMax} días de morosidad`);
        }

        // REGLA 2: Alta frecuencia de compra
        if (client.frecuenciaCompraScore >= 8) {
            score += 120;
            reasons.push(`REGLA 2: Cliente con alta frecuencia de compra (${client.frecuenciaCompraScore}/10)`);
        }

        // REGLA 3: Muchas órdenes de garantía abiertas sin resolver
        if (client.garantiasAbiertas > 0) {
            score += 130 + (client.garantiasAbiertas * 20);
            reasons.push(`REGLA 3: ${client.garantiasAbiertas} órdenes de garantía pendientes`);
        }

        // REGLA 4: Pedido listo para envío con pago pendiente
        if (client.pedidoListoPagoPendiente) {
            score += 140;
            reasons.push(`REGLA 4: Pedido listo de Q${client.montoPedidoListo || 0} pendiente de cobro`);
        }

        // REGLA 5: Atraso importante en cartera cerca de ruta
        const totalAtraso = (client.cartera.d31_60 || 0) + (client.cartera.d61_90 || 0) + (client.cartera.d91_120 || 0);
        if (totalAtraso > 10000) {
            score += 80;
            reasons.push(`REGLA 5: Cartera vencida de Q${totalAtraso.toFixed(2)}`);
        }

        // REGLA 6: Cliente que ha dejado de comprar en los últimos 45 días
        if (client.diasSinComprar >= 45 && client.diasSinComprar < 120) {
            score += 90;
            reasons.push(`REGLA 6: Sin compras en los últimos ${client.diasSinComprar} días`);
        }

        // REGLA 7: Efectuó pagos pero no ha comprado producto en los últimos 45 días
        if (client.diasSinComprar >= 45 && client.ultimoPagoDias <= 30) {
            score += 100;
            reasons.push(`REGLA 7: Pago reciente (${client.ultimoPagoDias}d) pero deserción en compras (${client.diasSinComprar}d)`);
        }

        // REGLA 9: Cliente marcado como incobrable (>120 días mora y >60 días sin pago)
        if (client.esIncobrableCandidate || (client.cartera.d120_mas > 0 && client.ultimoPagoDias > 60)) {
            score += 70;
            reasons.push(`REGLA 9: Candidato a recuperación incobrable (>120 días atraso)`);
        }

        return { score, reasons, isAgreed: !!agreement };
    }

    /**
     * Planifica la ruta óptima iniciando desde el cliente MÁS LEJANO hacia el MÁS CERCANO al origen.
     */
    planRoute({ regionKey, originCoords, targetDateStr }) {
        const selectedRegion = GUATEMALA_REGIONS[regionKey] || GUATEMALA_REGIONS['central'];

        // 1. Filtrar clientes pertenecientes a la región o que tengan acuerdo agendado para hoy
        let candidates = DEMO_ROUTE_DATA.filter(c => {
            const matchesRegion = c.regionKey === regionKey || selectedRegion.departments.includes(c.departamento);
            const { isAgreed } = this.evaluateClientPriority(c, targetDateStr);
            return matchesRegion || isAgreed;
        });

        // 2. Evaluar puntuaciones de prioridad
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

        // Aplicar límite de Regla 9: Máximo 1 cliente incobrable por ruta
        let incobrableCount = 0;
        candidates = candidates.filter(c => {
            const isIncobrable = c.esIncobrableCandidate || (c.cartera.d120_mas > 0 && c.ultimoPagoDias > 60);
            if (isIncobrable) {
                if (incobrableCount >= 1 && !c.isAgreed) return false;
                incobrableCount++;
            }
            return true;
        });

        // 3. Ordenamiento Estratégico de Ruta:
        // Primero aseguramos acuerdos agendados y prioridad alta,
        // ordenados de Mayor a Menor distancia desde el origen (Iniciando por el más lejano).
        candidates.sort((a, b) => {
            if (a.isAgreed !== b.isAgreed) return a.isAgreed ? -1 : 1;
            if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
            return b.distanceKm - a.distanceKm; // De más lejano a más cercano
        });

        // Reordenar secuencia final enumerada (1, 2, 3...)
        const routeWaypoints = candidates.map((item, index) => ({
            step: index + 1,
            ...item,
            wazeUrl: `https://waze.com/ul?ll=${item.lat},${item.lng}&navigate=yes`
        }));

        const totalKm = routeWaypoints.reduce((sum, w) => sum + w.distanceKm, 0);

        return {
            region: selectedRegion,
            date: targetDateStr,
            origin: originCoords,
            totalWaypoints: routeWaypoints.length,
            totalEstimatedKm: parseFloat(totalKm.toFixed(1)),
            waypoints: routeWaypoints
        };
    }

    /**
     * Consulta información de tráfico / alertas desde la API de Waze (OpenWebNinja)
     */
    async fetchWazeTrafficAlerts(bottomLeft, topRight) {
        const configData = JSON.parse(localStorage.getItem('gci_api_config') || '{}');
        const apiKey = configData.wazeApiKey;

        if (!apiKey) {
            console.warn("Waze API Key no configurada.");
            return { status: 'NO_KEY', alerts: [] };
        }

        try {
            const url = `https://api.openwebninja.com/waze/alerts-and-jams?bottom_left=${bottomLeft}&top_right=${topRight}`;
            const response = await fetch(url, {
                headers: { 'x-api-key': apiKey }
            });
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            const json = await response.json();
            return { status: 'OK', alerts: json.data?.alerts || [], jams: json.data?.jams || [] };
        } catch (err) {
            console.error("Error al consultar Waze Traffic API:", err);
            return { status: 'ERROR', message: err.message, alerts: [] };
        }
    }
}
