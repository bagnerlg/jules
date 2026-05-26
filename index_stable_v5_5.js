/* =========================================================
   SISTEMA DE MUEBLERÍA IA - Versión Maestro Integrada (Final V5.5)
   - Fix: Coverage persistence (Auto-matches municipality after department selection)
   - Fix: Catalog refinement (Allows "otras opciones", "queen", specific names)
   - Fix: Tiered Coverage flow (Dept -> Mun) with fuzzy matching
   - Fix: Enhanced size selection (Synonyms + Category Price/Text filters)
   - Fix: Category switch confirmation
   - Fix: Info hierarchy & Repetition control
   - Envío de imágenes individual para WhatsApp
========================================================= */

const ordenEstados = {
  nuevo: 0, catalogo: 1, producto: 2, precio: 3, objecion: 4, cierre: 5,
  confirmacion_categoria: 6, esperando_departamento: 7, esperando_municipio: 8
};

function getFieldId(env, key) {
  const variations = [
    "GHL_" + key.toUpperCase() + "_FIELD_ID",
    "GHL_" + key.toLowerCase() + "_FIELD_ID",
    "GHL_" + key + "_FIELD_ID",
    "GHL" + key.toUpperCase() + "FIELD_ID",
    "GHL" + key.toLowerCase() + "FIELD_ID",
    "GHL" + key + "FIELD_ID",
    key.toUpperCase(),
    key.toLowerCase(),
    key
  ];
  for (let v of variations) { if (env[v]) return env[v]; }
  return null;
}

class TraceLog {
  constructor() {
    this.logs = ["[FLOW] === INICIO DE PROCESO === " + new Date().toISOString()];
  }
  add(msg) {
    this.logs.push("[" + new Date().toLocaleTimeString('es-GT') + "] [TRACE] " + msg);
  }
  error(msg, err) {
    this.logs.push("[" + new Date().toLocaleTimeString('es-GT') + "] [ERROR] " + msg + (err ? (err.message || err) : ""));
  }
  flush() {
    console.log(this.logs.join("\n") + "\n[FLOW] === FIN DE PROCESO ===");
  }
}

function limpiarMensaje(rawMessage) {
  if (!rawMessage || typeof rawMessage !== "string") return "";
  const headlineMatch = rawMessage.match(new RegExp("Headline:\\s*(.*?)(?:\\n|$)", "i"));
  const headline = headlineMatch ? headlineMatch[1] : "";
  let cleaned = rawMessage.replace(new RegExp("Headline:.*?\\n", "gi"), "").replace(new RegExp("Source URL:.*?\\n", "gi"), "").replace(/Message Details/gi, "").trim();
  return (cleaned.length < 5 && headline) ? headline + " " + cleaned : cleaned;
}

function normalizarTextoGlobal(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").replace(/z/g, "s").trim();
}

function normalizarEntradaAvanzada(texto) {
  let t = normalizarTextoGlobal(texto);
  const sinonimos = { "closet": "ropero", "placard": "ropero", "guardarropa": "ropero", "chilero": "bonito", "peinador": "marquesa", "tocador": "marquesa", "marqueza": "marquesa", "matrimonial": "matri", "cosina": "cocina" };
  Object.keys(sinonimos).forEach(key => { t = t.replace(new RegExp("\\b" + key + "\\b", "g"), sinonimos[key]); });
  return t;
}

function getCustomFieldValue(contact, fieldId) { if (!contact || !Array.isArray(contact.customFields) || !fieldId) return null; const field = contact.customFields.find(f => f.id === fieldId); return field ? (field.value || field.field_value) : null; }

async function getContactFromGHL(contactId, env, trace) { try { const res = await fetch("https://services.leadconnectorhq.com/contacts/" + contactId, { method: "GET", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-07-28" } }); if (!res.ok) return null; const data = await res.json(); return data.contact; } catch (err) { return null; } }

async function setCustomFieldValue(contact, fieldId, value, env, trace) { if (!fieldId || value === undefined || value === null) return; try { const res = await fetch("https://services.leadconnectorhq.com/contacts/" + contact.id, { method: "PUT", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-07-28" }, body: JSON.stringify({ customFields: [{ id: fieldId, value: value, field_value: value }] }) }); if (!res.ok && trace) trace.add("Error update field: " + res.status); } catch (err) {} }

async function addToWorkflow(contactId, workflowId, env, trace) { try { const eventStartTime = new Date().toISOString().split(".")[0] + "+00:00"; await fetch("https://services.leadconnectorhq.com/contacts/" + contactId + "/workflow/" + workflowId, { method: "POST", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-07-28" }, body: JSON.stringify({ eventStartTime }) }); } catch (err) {} }

async function sendMessageToGHL(contactId, text, env, trace, imagenes = [], locationId = null, conversationId = null) {
  if (!text && (!imagenes || imagenes.length === 0)) return false;
  const filtradas = (Array.isArray(imagenes) ? imagenes : [imagenes])
    .map(img => typeof img === "string" ? img : (img?.url || img?.link || img?.link_publico || img?.imagen1 || img?.imagen2 || img?.imagen))
    .filter(url => typeof url === "string" && url.length > 10 && url.startsWith("http"));
  let success = false;
  if (text && text.trim()) {
    try {
      const payload = { type: "WhatsApp", contactId: contactId, message: text, text: { body: text }, direction: "outbound" };
      if (locationId) payload.locationId = locationId;
      if (conversationId) payload.conversationId = conversationId;
      const res = await fetch("https://services.leadconnectorhq.com/conversations/messages", { method: "POST", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-04-15" }, body: JSON.stringify(payload) });
      if (res.ok) { success = true; }
    } catch (err) {}
  }
  for (let imgUrl of filtradas.slice(0, 5)) {
    try {
      await new Promise(r => setTimeout(r, 1500));
      const payload = { type: "WhatsApp", contactId: contactId, message: imgUrl, text: { body: imgUrl }, direction: "outbound" };
      if (locationId) payload.locationId = locationId;
      if (conversationId) payload.conversationId = conversationId;
      await fetch("https://services.leadconnectorhq.com/conversations/messages", { method: "POST", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-04-15" }, body: JSON.stringify(payload) });
    } catch (err) {}
  }
  return success;
}

async function getProductList(env, trace) { try { const raw = await env.PRODUCTS_DB.get("productos:listado"); if (!raw) return []; const list = JSON.parse(raw); return Array.isArray(list) ? list : []; } catch (e) { return []; } }

async function triggerHandover(contactId, env, trace) {
  try {
    await fetch("https://services.leadconnectorhq.com/contacts/" + contactId, { method: "PUT", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-07-28" }, body: JSON.stringify({ tags: ["humano"] }) });
    if (env.GHL_HANDOVER_WORKFLOW_ID) await addToWorkflow(contactId, env.GHL_HANDOVER_WORKFLOW_ID, env, trace);
  } catch (err) {}
}

async function obtenerRespuestaCoverage(texto, env, trace) {
  try { const listadoRaw = await env.COVERAGE_DB.get("coverage:listado"); const listado = JSON.parse(listadoRaw || "[]"); const m = normalizarTextoGlobal(texto); for (const item of listado) { const u = normalizarTextoGlobal(item.ubicacion); if (u.length > 3 && m.includes(u)) return item.respuesta; } } catch (e) {} return null;
}

async function fuzzyMatchMunicipio(municipio, listaMunicipios, env, trace) {
  const prompt = "El cliente escribió '" + municipio + "'. Los válidos son: " + listaMunicipios.join(", ") + ". ¿Cuál es el correcto? Responde SOLO el nombre o 'NULL'.";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.OPENAI_API_KEY }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: "Responde solo con el nombre." }, { role: "user", content: prompt }], temperature: 0 }) });
    const data = await res.json(); return data.choices[0].message.content.trim();
  } catch (err) { return "NULL"; }
}

async function obtenerProductoSeguro(id, env) {
  if (!id) return null;
  let rid = id.toString().trim().toUpperCase(); if (rid.includes(":")) rid = rid.split(":").pop();
  const rawCombo = await env.PRODUCTS_DB.get("combo:" + rid); const meta = await env.PRODUCTS_DB.get("combo_meta:" + rid, { type: "json" });
  if (rawCombo || meta) {
    let items = []; let totalPiezas = 0;
    if (rawCombo) {
      const parts = rawCombo.split(/[\s,]+/).map(s => s.trim()).filter(s => s);
      for (let i = 0; i < parts.length; i += 2) {
        const cId = parts[i]; const qty = parseInt(parts[i + 1]) || 1; const pData = await env.PRODUCTS_DB.get("individual:" + cId, { type: "json" });
        if (pData) { const tit = (pData.titulo || pData.nombre || "").toUpperCase(); if (!tit.includes("FLETE") && !cId.toUpperCase().includes("FLETE")) totalPiezas += qty; items.push({ p: pData, q: qty }); }
      }
    }
    const res = { id: rid, key: "combo:" + rid, tipo: "combo", conteo_piezas: totalPiezas, titulo: meta?.titulo || ("Combo " + rid), precio: meta?.precio || items.reduce((t, i) => t + ((parseFloat(i.p.precio) || 0) * i.q), 0), descripcion: meta?.descripcion || "", medidas: meta?.medidas || items.map(i => (i.p.titulo || i.p.nombre) + ": " + (i.p.medidas || "N/A")).filter(x => !x.endsWith(": N/A")).join("\n"), estructura: meta?.estructura || items.map(i => (i.p.titulo || i.p.nombre) + ": " + (i.p.estructura || "N/A")).filter(x => !x.endsWith(": N/A")).join("\n"), colores: meta?.colores || items.map(i => (i.p.titulo || i.p.nombre) + ": " + (i.p.colores || "N/A")).filter(x => !x.endsWith(": N/A")).join("\n"), resistencia_peso: meta?.resistencia_peso || items.map(i => (i.p.titulo || i.p.nombre) + ": " + (i.p.resistencia_peso || "N/A")).filter(x => !x.endsWith(": N/A")).join("\n"), garantia: meta?.garantia || items.map(i => (i.p.titulo || i.p.nombre) + ": " + (i.p.garantia || "N/A")).filter(x => !x.endsWith(": N/A")).join("\n"), imagenes: [ meta?.imagen1, meta?.imagen2, ...items.flatMap(i => [i.p.imagen1, i.p.imagen2, i.p.imagen, i.p.url, i.p.link, i.p.link_publico]) ].filter(img => typeof img === "string" && img.length > 10 && img.startsWith("http")), ficha_combinada: items.map(i => { const pre = i.q > 1 ? "(" + i.q + " Unidades) " : ""; return "[" + pre + (i.p.titulo || i.p.nombre) + "] - Medidas: " + (i.p.medidas || "N/A") + " - Material: " + (i.p.estructura || "N/A") + " - Colores: " + (i.p.colores || "N/A"); }).join("\n"), ...(meta || {}), items: items.map(i => i.p) };
    res.imagenes = [...new Set(res.imagenes)]; return res;
  }
  const ind = await env.PRODUCTS_DB.get("individual:" + rid, { type: "json" });
  return ind ? { ...ind, id: rid, key: "individual:" + rid, tipo: "individual", titulo: ind.titulo || ind.nombre, imagenes: [ind.imagen1, ind.imagen2, ind.link_publico, ind.url, ind.link, ind.imagen].filter(img => typeof img === "string" && img.length > 10 && img.startsWith("http")) } : null;
}

async function buscarProductoPorNombreEnMensaje(mensaje, env, trace) {
  try {
    const listado = await getProductList(env, trace); const m = normalizarTextoGlobal(mensaje); const ignorar = ["cocina", "ropero", "cama", "mueble", "amueblado", "comedor", "sofa", "gavetero", "tocador", "cabecera", "mesita", "librera"]; if (m.length < 4) return null;
    let mejorMatch = null; let maxScore = 0;
    for (const p of listado) { const nombre = normalizarTextoGlobal(p.nombre || p.titulo || ""); if (nombre.length < 4) continue; let score = 0; const palabras = nombre.split(" "); for (let pal of palabras) { if (pal.length > 4 && !ignorar.includes(pal) && m.includes(pal)) score += pal.length; } if (score > maxScore && score >= 10) { maxScore = score; mejorMatch = p; } }
    if (mejorMatch) { const id = mejorMatch.key ? mejorMatch.key.split(":").pop() : null; if (id) return await obtenerProductoSeguro(id, env); }
  } catch (e) {} return null;
}

async function buscarProductoPorCodigoEnMensaje(mensaje, env, trace) { try { const listado = await getProductList(env, trace); const m = mensaje.toUpperCase(); for (const p of listado) { const idFromKey = (p.key || "").toUpperCase().split(':').pop(); const codigo = (p.sku || "").toUpperCase() || idFromKey; if (codigo && codigo.length > 4 && m.includes(codigo)) { return await obtenerProductoSeguro(codigo, env); } } } catch (e) {} return null; }

function detectarSeleccionNatural(mensaje, lista) {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const m = normalizarEntradaAvanzada(mensaje); if (/\b(medida|cuanto|precio|limpia|resiste|material|fotos|imagenes|color|garantia|dimension)\b/i.test(m)) return null;
  const mapa = { "primero": 0, "primer": 0, "uno": 0, "la 1": 0, "el 1": 0, "segundo": 1, "dos": 1, "la 2": 1, "el 2": 1, "tercero": 2, "tres": 2, "la 3": 2, "el 3": 2, "cuarto": 3, "cuatro": 3, "la 4": 3, "el 4": 3, "ultimo": lista.length - 1 };
  for (let key in mapa) { if (new RegExp("\\b" + key + "\\b", "i").test(m)) return mapa[key]; }
  const matchNum = /\b([1-4])\b(?!\s*(cuerpo|puerta|plaza|gaveta|cajon|c|k|q|p|mt|cm|unid|pieza))/i.exec(m); if (matchNum) { const idx = parseInt(matchNum[1]) - 1; if (idx < lista.length) return idx; }
  const scores = lista.map((item, index) => {
    const textoBase = normalizarTextoGlobal(item.nombre || item.titulo || ""); let score = 0; const ignorar = ["cocina", "ropero", "cama", "mueble", "amueblado", "comedor", "sofa", "gavetero", "tocador", "cabecera", "mesita", "librera"];
    const pesos = { "arisona": 60, "frostmont": 60, "wengue": 60, "slah": 60, "estandar": 30 }; Object.keys(pesos).forEach(p => { if (m.includes(p) && textoBase.includes(p)) score += pesos[p]; });
    m.split(/\s+/).forEach(word => { if (word.length >= 5 && !ignorar.includes(word) && textoBase.includes(word)) score += 15; });
    return { index, score };
  });
  const ganador = scores.sort((a, b) => b.score - a.score)[0]; return (ganador && ganador.score >= 15) ? ganador.index : null;
}

async function callVendedorElitePro(message, contact, env, productoActual, intencionCierre, coverage, esSoloSaludo = false, esPrimerMensaje = false, yaEnvioMenu = false, esNuevoProducto = false, confirmandoCat = null) {
  let info = "";
  if (productoActual) {
    const p = productoActual; const fullSpecs = "Medidas: " + (p.medidas || "N/A") + "\nMaterial: " + (p.estructura || "N/A") + "\nColores: " + (p.colores || "N/A") + "\nResistencia: " + (p.resistencia_peso || "N/A") + "\nGarantía: " + (p.garantia || "N/A");
    if (esNuevoProducto) { info = "PRODUCTO: " + p.titulo + "\nPrecio: Q" + p.precio + "\nDescripción: " + (p.descripcion || "N/A") + (p.tipo === "combo" ? "\nComponentes: " + (p.ficha_combinada || "N/A") : "") + "\n(NOTA: El resto de especificaciones técnicas están ocultas para esta primera respuesta, solo da el resumen)"; }
    else { info = "PRODUCTO: " + p.titulo + "\nPrecio: Q" + p.precio + "\nDescripción: " + (p.descripcion || "N/A") + "\n" + (p.tipo === "combo" ? "Componentes: " + p.ficha_combinada + "\n" : "") + fullSpecs; }
  }
  const mostrarMenu = !!productoActual && !esSoloSaludo && (!yaEnvioMenu || esNuevoProducto);
  const instruccionSaludo = esPrimerMensaje ? "Saluda amablemente al inicio." : "ESTÁ PROHIBIDO SALUDAR. Ve directo al punto.";
  let reglas = [ "1. BREVEDAD EXTREMA.", "2. LISTAS: Viñetas ✨.", "3. PRESENTACIÓN: esNuevoProducto=TRUE -> Resume. Oculta Medidas/Material.", "4. COMBOS: Datos detallados de CADA componente si piden.", "5. SOLO LO SOLICITADO.", "6. AYUDA: " + (mostrarMenu ? "Opcional: Detalles Medidas, Colores." : "NO ayuda."), "7. COMPRA: Invita si esNuevoProducto.", "8. EMOJIS: Máximo uno.", "9. CIERRE: No pidas datos si hay dudas.", "10. SALUDO: " + instruccionSaludo ];
  if (confirmandoCat) { reglas.push("11. CONFIRMACIÓN: Cliente mencionó '" + confirmandoCat + "'. Pregunta si desea ver esa categoría o seguir con " + (productoActual ? productoActual.titulo : "lo actual") + "."); }
  const prompt = "Asesor muebles. REGLAS:\n" + reglas.join("\n") + "\n\nDATOS PRODUCTO:\n" + info + "\n\nMensaje cliente: " + message;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.OPENAI_API_KEY }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: "Asesor breve." }, { role: "user", content: prompt }], temperature: 0.1 }) });
    const data = await res.json(); let content = data.choices[0].message.content;
    if (!mostrarMenu) { content = content.replace(/.*(informar sobre|ayudarte con|detalles sobre|puedo darle|puedo informarle).*(Medidas|Colores|Materiales|Precios|Envío|Cuotas).*/gi, "").trim(); }
    return content;
  } catch (err) { return "Con gusto le ayudo."; }
}

async function moduloCatalogo(message, contact, env, trace, forcingCat = null) {
  const m = forcingCat || normalizarEntradaAvanzada(message);
  const listado = await getProductList(env, trace);
  const categorias = ["cama", "cocina", "ropero", "sofa", "comedor", "gavetero", "tocador", "cabecera", "mesita", "librera", "mesa", "trinchante", "platera", "mueble", "amueblado"];
  const fUltimaCat = getFieldId(env, "ultima_categoria"); const fFiltroTamano = getFieldId(env, "filtro_tamano");
  let catFound = categorias.find(c => m.includes(c)); let cat = catFound || getCustomFieldValue(contact, fUltimaCat) || "muebles";
  let tamano = getCustomFieldValue(contact, fFiltroTamano); const mTamano = m.match(/\b(mediano|mediana|grande|pequeño|pequeña|chico|chica|enorme|gigante)\b/i);
  if (mTamano) { const matched = mTamano[1].toLowerCase(); tamano = /median|peque|chico|chica/.test(matched) ? "mediano" : "grande"; await setCustomFieldValue(contact, fFiltroTamano, tamano, env, trace); }
  if (catFound) await setCustomFieldValue(contact, fUltimaCat, cat, env, trace);
  if (!tamano) { const genero = /cama|cocina|sala|mesa/.test(cat) ? "a" : "o"; return { text: "¿Busca opciones de " + cat.toUpperCase() + " en tamaño " + (genero === "a" ? "mediana" : "mediano") + " o grande? 😉" }; }
  let resultados = listado.filter(p => normalizarTextoGlobal(p.nombre || p.titulo).includes(cat)).filter(p => { const k = (p.key || "").toLowerCase(); const n = (p.nombre || p.titulo || "").toLowerCase(); return k.includes("combo") || n.includes("combo") || n.includes("amueblado"); });

  // Refinamiento por palabras clave (V5.4)
  const mNorm = normalizarTextoGlobal(message);
  const stopWords = ["combo", "combos", "opciones", "otros", "otras", "promociones", "promocion", "catálogo", "muestreme", "mostrame", "ver", "mas", "quiero", "gustaria", "tiene"];
  const keywords = mNorm.split(/\s+/).filter(w => w.length > 3 && !stopWords.includes(w) && !categorias.includes(w) && !/mediano|mediana|grande|pequeño|pequeña|chico|chica|enorme|gigante/.test(w));
  if (keywords.length > 0) { trace.add("Refinando por: " + keywords.join(", ")); resultados = resultados.filter(p => { const n = normalizarTextoGlobal(p.nombre || p.titulo); return keywords.some(k => n.includes(k)); }); }

  if (tamano === "mediano") {
    if (cat === "cama") resultados = resultados.filter(p => { const n = normalizarTextoGlobal(p.nombre || p.titulo); return n.includes("matri") || n.includes("queen"); });
    else if (cat === "ropero" || cat === "cocina") resultados = resultados.filter(p => (parseFloat(p.precio) || 0) <= 3499);
    else resultados = resultados.filter(p => (parseFloat(p.precio) || 0) <= 5000);
  } else if (tamano === "grande") {
    if (cat === "cama") resultados = resultados.filter(p => normalizarTextoGlobal(p.nombre || p.titulo).includes("king"));
    else if (cat === "ropero" || cat === "cocina") resultados = resultados.filter(p => (parseFloat(p.precio) || 0) >= 3500);
    else resultados = resultados.filter(p => (parseFloat(p.precio) || 0) > 5000);
  }
  if (resultados.length === 0) {
    if (keywords.length > 0) return { text: "No encontré opciones exactas de " + cat.toUpperCase() + " con esos detalles, pero aquí tiene otras disponibles:\n", handover: false, retryWithoutKeywords: true };
    return { text: "No encontré opciones de " + cat.toUpperCase() + " en este momento. Un asesor le ayudará pronto. 😉", handover: true };
  }
  resultados = resultados.slice(0, 4);
  const paraGuardar = resultados.map(p => ({ key: p.key, nombre: p.nombre || p.titulo, precio: p.precio }));
  await setCustomFieldValue(contact, getFieldId(env, "carrito_json"), JSON.stringify(paraGuardar), env, trace); await setCustomFieldValue(contact, getFieldId(env, "carrito"), paraGuardar.map(p => p.nombre).join(", "), env, trace); await setCustomFieldValue(contact, fFiltroTamano, null, env, trace);
  let resp = "Opciones de " + cat.toUpperCase() + (tamano ? " " + tamano.toUpperCase() : "") + "S:\n\n";
  resultados.forEach((p, i) => { resp += (i + 1) + ". " + (p.nombre || p.titulo).toUpperCase() + " - Q" + p.precio + "\n"; });
  resp += "\n¿Cuál le gustaría conocer a detalle? 😉"; return { text: resp };
}

async function processFullFlow(rawMsg, contactId, contact, env, trace, conversationId = null) {
  try {
    const metaMatch = rawMsg.match(/\b(B[A-Z0-9]{5,})\b/i); const message = limpiarMensaje(rawMsg); const norm = normalizarTextoGlobal(message);
    const pideFotos = /fotos?|imagenes?|verlo|verla|mostrar|enviame|fts/i.test(message); const pideCompra = /\b(quiero comprar|lo quiero|la quiero|comprarlo|comprarla|pedido|ordenar|pagar)\b/i.test(norm);
    const pideInformacion = /(medida|dimension|precio|vale|cuesta|costo|material|color|envio|cuota|detalle|fotos|garantia|resiste)/i.test(norm);
    const pideCatalogo = /catalogo|modelos|opciones|variedad|otros|ver mas|muestreme|mostrame|oferta|venden|vende|que mas/i.test(norm);
    const pideCobertura = /\b(ubicacion|lugar|donde|entrega|envio|cobertura|mandan|reparten|llegan|estan|direccion)\b/i.test(norm);
    const categorias = ["cama", "ropero", "cocina", "mueble", "amueblado", "comedor", "mesa", "gavetero", "tocador", "trinchante", "platera", "marquesa", "cabecera", "mesita", "librera"];
    const catMencionada = categorias.find(c => norm.includes(c)); const tieneCategoria = !!catMencionada; const pideGarantia = /\b(compre|adquiri|garantia|rompio|arruino|dañado|malo|reclamo|fallo)\b/i.test(norm);
    const esAfirmacionGenerica = /^(ok|vale|esta bien|muy bien|si gracias|de acuerdo|perfecto|entendido|así es|si|sii|por favor|claro|envia|mandame|ofertas|oferta)$/i.test(norm.trim());
    const esSoloSaludo = /^(hola|buen|buena|buenas|tarde|dia|dias|noche|noches|\s)+$/i.test(norm.trim());
    const fEstado = getFieldId(env, "estado_actual"); const fMenuEnviado = getFieldId(env, "menu_ayuda_enviado"); const fPropCat = getFieldId(env, "categoria_propuesta"); const fDept = getFieldId(env, "departamento_actual");
    const fMunProp = getFieldId(env, "municipio_propuesto");
    const currentEstado = getCustomFieldValue(contact, fEstado) || "nuevo"; const propCat = getCustomFieldValue(contact, fPropCat); const yaEnvioMenu = getCustomFieldValue(contact, fMenuEnviado) === "true";
    const munProp = getCustomFieldValue(contact, fMunProp);
    const fProductoId = getFieldId(env, "producto_id"); const prevProductoId = getCustomFieldValue(contact, fProductoId); const fUltimaCat = getFieldId(env, "ultima_categoria");
    const fCatInteres = getFieldId(env, "categoria_interes"); const fComboPadre = getFieldId(env, "GHL_combo_padre_FIELD_ID"); const fComboComp = getFieldId(env, "GHL_combo_componentes_FIELD_ID");
    const carrito = JSON.parse(getCustomFieldValue(contact, getFieldId(env, "carrito_json")) || "[]");
    let targetProduct = null; let esSeleccionReciente = false;

    if (currentEstado === "esperando_departamento") {
      const depmunRaw = await env.COVERAGE_DB.get("listado:depmun");
      const depmun = JSON.parse(depmunRaw || "{}");
      const foundDept = Object.keys(depmun).find(d => norm.includes(d));
      if (foundDept) {
        await setCustomFieldValue(contact, fDept, foundDept, env, trace);
        // Lógica V5.5: Si ya teníamos un municipio propuesto, intentar machearlo de una vez
        if (munProp) {
          const municipios = depmun[foundDept] || [];
          let mun = municipios.find(m => munProp.includes(m));
          if (!mun) { mun = await fuzzyMatchMunicipio(munProp, municipios, env, trace); if (mun === "NULL") mun = null; }
          if (mun) {
            const resp = await obtenerRespuestaCoverage(mun, env, trace);
            if (resp) {
              await sendMessageToGHL(contactId, resp, env, trace, [], (env.GHL_LOCATION_ID || contact.locationId), conversationId);
              await setCustomFieldValue(contact, fMunProp, null, env, trace);
              await setCustomFieldValue(contact, fEstado, "producto", env, trace);
              return;
            }
          }
        }
        await setCustomFieldValue(contact, fEstado, "esperando_municipio", env, trace);
        await sendMessageToGHL(contactId, "¿En qué municipio de " + foundDept.toUpperCase() + " está?", env, trace, [], null, conversationId);
        return;
      }
      await sendMessageToGHL(contactId, "¿En qué departamento de Guatemala se encuentra? 🇬🇹", env, trace, [], null, conversationId); return;
    }
    if (currentEstado === "esperando_municipio") { const dept = getCustomFieldValue(contact, fDept); const depmun = JSON.parse(await env.COVERAGE_DB.get("listado:depmun") || "{}"); const municipios = depmun[dept] || []; let mun = municipios.find(m => norm.includes(m)); if (!mun) { mun = await fuzzyMatchMunicipio(message, municipios, env, trace); if (mun === "NULL") mun = null; } if (mun) { const resp = await obtenerRespuestaCoverage(mun, env, trace); if (resp) { await sendMessageToGHL(contactId, resp, env, trace, [], null, conversationId); await setCustomFieldValue(contact, fEstado, "producto", env, trace); return; } } await sendMessageToGHL(contactId, "Un asesor le confirmará cobertura pronto. 😉", env, trace, [], null, conversationId); await triggerHandover(contactId, env, trace); return; }
    if (pideCobertura && !pideInformacion) {
       const resp = await obtenerRespuestaCoverage(message, env, trace);
       if (resp) { await sendMessageToGHL(contactId, resp, env, trace, [], null, conversationId); return; }
       // Si no hay match directo, guardar el posible municipio y pedir departamento (V5.5)
       const stopWords = ["ubicacion", "lugar", "donde", "entrega", "envio", "cobertura", "mandan", "reparten", "llegan", "estan", "direccion", "entregan", "hola", "buen", "dia", "tarde", "noche"];
       const potentialMun = norm.split(/\s+/).filter(w => w.length > 3 && !stopWords.includes(w)).join(" ");
       if (potentialMun) await setCustomFieldValue(contact, fMunProp, potentialMun, env, trace);
       await setCustomFieldValue(contact, fEstado, "esperando_departamento", env, trace);
       await sendMessageToGHL(contactId, "Con gusto. ¿En qué departamento se encuentra? 📍", env, trace, [], null, conversationId); return;
    }

    if (prevProductoId && (pideInformacion || esAfirmacionGenerica || pideFotos) && currentEstado !== "confirmacion_categoria") { targetProduct = await obtenerProductoSeguro(prevProductoId, env); }
    if (!targetProduct && metaMatch) { targetProduct = await obtenerProductoSeguro(metaMatch[1], env); if (targetProduct) await setCustomFieldValue(contact, getFieldId(env, "Anuncio"), metaMatch[1], env, trace); }
    if (!targetProduct) targetProduct = await buscarProductoPorCodigoEnMensaje(rawMsg, env, trace);
    if (!targetProduct) { let selIdx = detectarSeleccionNatural(message, carrito); if (selIdx !== null && carrito[selIdx]) { targetProduct = await obtenerProductoSeguro(carrito[selIdx].key.split(":").pop(), env); if (targetProduct) esSeleccionReciente = true; } }
    if (!targetProduct && prevProductoId) targetProduct = await obtenerProductoSeguro(prevProductoId, env);
    if (!targetProduct && !pideCatalogo && !pideInformacion && !tieneCategoria) targetProduct = await buscarProductoPorNombreEnMensaje(message, env, trace);
    if (targetProduct) await setCustomFieldValue(contact, fProductoId, targetProduct.id, env, trace);
    if (pideGarantia) { await triggerHandover(contactId, env, trace); return; }

    if (currentEstado === "confirmacion_categoria" && esAfirmacionGenerica) { await setCustomFieldValue(contact, fPropCat, null, env, trace); const resCat = await moduloCatalogo(message, contact, env, trace, propCat); if (resCat.text) await sendMessageToGHL(contactId, resCat.text, env, trace, [], (env.GHL_LOCATION_ID || contact.locationId), conversationId); await setCustomFieldValue(contact, fEstado, "catalogo", env, trace); return; }
    if (targetProduct && tieneCategoria && !pideInformacion && !pideFotos) { if (!normalizarTextoGlobal(targetProduct.titulo).includes(catMencionada)) { await setCustomFieldValue(contact, fPropCat, catMencionada, env, trace); const resp = await callVendedorElitePro(message, contact, env, targetProduct, false, null, esSoloSaludo, currentEstado === "nuevo", yaEnvioMenu, false, catMencionada); await setCustomFieldValue(contact, fEstado, "confirmacion_categoria", env, trace); await sendMessageToGHL(contactId, resp, env, trace, [], (env.GHL_LOCATION_ID || contact.locationId), conversationId); return; } }

    if (targetProduct && !pideCatalogo) {
      const catProd = categorias.find(c => normalizarTextoGlobal(targetProduct.titulo).includes(c)) || getCustomFieldValue(contact, fUltimaCat);
      if (catProd) { await setCustomFieldValue(contact, fUltimaCat, catProd, env, trace); await setCustomFieldValue(contact, fCatInteres, catProd, env, trace); }
      if ((pideFotos || pideCompra || esAfirmacionGenerica) && (!targetProduct.imagenes || targetProduct.imagenes.length === 0)) { if (catProd === "ropero") await addToWorkflow(contactId, "9b36093c-f008-4261-b2ba-bc54a0cdd9c9", env, trace); else if (catProd === "cocina") await addToWorkflow(contactId, "a2fca18f-d0c7-4c97-8185-7926540bf2de", env, trace); }
      if (esSeleccionReciente || pideFotos) { if (targetProduct.tipo === "combo" && Array.isArray(targetProduct.items) && targetProduct.items.length >= 3) responseImgs = [...new Set(targetProduct.items.map(i => i.imagen1 || i.imagen2 || i.imagen || i.url).filter(u => typeof u === "string" && u.length > 10 && u.startsWith("http")))]; else responseImgs = targetProduct.imagenes || []; }
      const esNuevo = targetProduct.id !== prevProductoId && !pideInformacion;
      const resp = await callVendedorElitePro(message, contact, env, targetProduct, pideCompra, await obtenerRespuestaCoverage(rawMsg, env, trace), esSoloSaludo, currentEstado === "nuevo", yaEnvioMenu, esNuevo);
      if ((esNuevo || !yaEnvioMenu) && /Medidas|Colores|Materiales|Precios|Envío|Cuotas/i.test(resp)) await setCustomFieldValue(contact, fMenuEnviado, "true", env, trace);
      await setCustomFieldValue(contact, getFieldId(env, "total_pedido"), targetProduct.precio || 0, env, trace);
      if (targetProduct.tipo === "combo") { await setCustomFieldValue(contact, fComboPadre, targetProduct.id, env, trace); if (Array.isArray(targetProduct.items)) await setCustomFieldValue(contact, fComboComp, JSON.stringify(targetProduct.items.map(i => i.id)), env, trace); }
      await setCustomFieldValue(contact, fEstado, pideCompra ? "cierre" : "producto", env, trace);
      let final = resp; if (!resp.toUpperCase().includes(targetProduct.titulo.toUpperCase())) final = "*" + targetProduct.titulo.toUpperCase() + "*\n\n" + resp;
      await sendMessageToGHL(contactId, final, env, trace, responseImgs, (env.GHL_LOCATION_ID || contact.locationId), conversationId); if (pideCompra && !pideInformacion) await triggerHandover(contactId, env, trace); return;
    } else if (pideCatalogo || tieneCategoria || /\b(mediano|mediana|grande|pequeño|pequeña|chico|chica|enorme|gigante)\b/i.test(norm) || (currentEstado === "catalogo" && norm.length > 3)) {
      let resCat = await moduloCatalogo(message, contact, env, trace);
      if (resCat.retryWithoutKeywords) { resCat = await moduloCatalogo("ver mas", contact, env, trace); }
      if (resCat.text) await sendMessageToGHL(contactId, resCat.text, env, trace, [], (env.GHL_LOCATION_ID || contact.locationId), conversationId);
      if (resCat.handover) await triggerHandover(contactId, env, trace);
      await setCustomFieldValue(contact, fEstado, "catalogo", env, trace); return;
    } else {
      const resp = await callVendedorElitePro(message, contact, env, targetProduct, pideCompra, await obtenerRespuestaCoverage(rawMsg, env, trace), esSoloSaludo, currentEstado === "nuevo", yaEnvioMenu, false);
      await sendMessageToGHL(contactId, resp, env, trace, [], (env.GHL_LOCATION_ID || contact.locationId), conversationId); return;
    }
  } catch (err) { await triggerHandover(contactId, env, trace); }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK");
    const trace = new TraceLog(); let contactId;
    try {
      const body = JSON.parse(await request.text()); contactId = body.contact_id || body.contact?.id; if (!contactId) return new Response("OK");
      const contact = await getContactFromGHL(contactId, env, trace); if (!contact || contact.tags?.includes("humano") || contact.assignedTo) { trace.flush(); return new Response("OK"); }
      const rawMsg = body.message?.body || body.message?.text || ""; const convId = body.conversation_id || body.message?.conversationId; const now = Date.now();
      const bKey = "buffer:" + contactId; const lKey = "last:" + contactId;
      await env.PRODUCTS_DB.put(bKey, (await env.PRODUCTS_DB.get(bKey) || "") + " " + rawMsg, { expirationTtl: 60 }); await env.PRODUCTS_DB.put(lKey, now.toString(), { expirationTtl: 60 });
      ctx.waitUntil((async () => { try { await new Promise(r => setTimeout(r, 2500)); if (await env.PRODUCTS_DB.get(lKey) === now.toString()) { const msg = await env.PRODUCTS_DB.get(bKey); await env.PRODUCTS_DB.delete(bKey); await env.PRODUCTS_DB.delete(lKey); await processFullFlow(msg, contactId, contact, env, trace, convId); } } catch (err) {} finally { trace.flush(); } })());
      return new Response("OK");
    } catch (e) { if (contactId) { try { await triggerHandover(contactId, env, trace); } catch (err) {} } return new Response("OK"); }
  }
};