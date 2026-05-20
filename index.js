/* =========================================================
   SISTEMA DE MUEBLERÍA IA - Versión Maestro Integrada (Final V4)
   - Fix: Saludos limpios y reducción de emojis
   - Fix: Selección numérica mejorada (ej: "La 4", "4")
   - Fix: Fallback de catálogo (si no hay tamaño, muestra generales)
   - Fix: Persistencia de producto (mantiene el mueble seleccionado)
   - Envío de imágenes individual para WhatsApp
   - 100% Compatible con Cloudflare (Sin comillas invertidas)
========================================================= */

const ordenEstados = { nuevo: 0, catalogo: 1, producto: 2, precio: 3, objecion: 4, cierre: 5 };

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

async function sendMessageToGHL(contactId, text, env, trace, imagenes = [], caption = "") {
  if (!text && (!imagenes || imagenes.length === 0)) return false;
  const filtradas = (Array.isArray(imagenes) ? imagenes : [imagenes])
    .map(img => typeof img === "string" ? img : (img?.url || img?.link || img?.link_publico || img?.imagen1 || img?.imagen2 || img?.imagen))
    .filter(url => typeof url === "string" && url.length > 10 && url.startsWith("http"));

  if (trace) trace.add("URLs de imágenes procesadas: " + JSON.stringify(filtradas));
  let success = false;

  if (text && text.trim()) {
    try {
      const res = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
        method: "POST", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-04-15" },
        body: JSON.stringify({ type: "WhatsApp", contactId: contactId, message: text, status: "delivered" })
      });
      if (res.ok) { success = true; if (trace) trace.add("[API GHL] Mensaje de texto enviado satisfactoriamente."); }
      else if (trace) { const errTxt = await res.text(); trace.add("[API GHL] Error enviando texto (Status " + res.status + "): " + errTxt); }
    } catch (err) { if (trace) trace.error("Excepción enviando texto: ", err); }
  }

  for (let imgUrl of filtradas.slice(0, 5)) {
    try {
      const res = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
        method: "POST", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-04-15" },
        body: JSON.stringify({ type: "WhatsApp", contactId: contactId, message: caption, attachments: [imgUrl], status: "delivered" })
      });
      if (res.ok) { success = true; if (trace) trace.add("[API GHL] Adjunto enviado: " + imgUrl); }
      else if (trace) { const errTxt = await res.text(); trace.add("[API GHL] Error enviando adjunto (" + res.status + "): " + errTxt); }
    } catch (err) { if (trace) trace.error("Excepción enviando imagen: ", err); }
  }
  return success;
}

async function triggerHandover(contactId, env, trace) {
  try {
    await fetch("https://services.leadconnectorhq.com/contacts/" + contactId, {
      method: "PUT", headers: { "Authorization": "Bearer " + env.GHL_API_KEY, "Content-Type": "application/json", "Version": "2021-07-28" },
      body: JSON.stringify({ tags: ["humano"] })
    });
    if (env.GHL_HANDOVER_WORKFLOW_ID) await addToWorkflow(contactId, env.GHL_HANDOVER_WORKFLOW_ID, env, trace);
  } catch (err) {}
}

async function obtenerRespuestaCoverage(texto, env, trace) { try { const listadoRaw = await env.COVERAGE_DB.get("coverage:listado"); const listado = JSON.parse(listadoRaw || "[]"); const m = normalizarTextoGlobal(texto); for (const item of listado) { const u = normalizarTextoGlobal(item.ubicacion); if (u.length > 3 && m.includes(u)) return item.respuesta; } } catch (e) {} return null; }

async function obtenerProductoSeguro(id, env) {
  if (!id) return null;
  let rid = id.toString().trim().toUpperCase();
  if (rid.includes(":")) rid = rid.split(":").pop();

  const rawCombo = await env.PRODUCTS_DB.get("combo:" + rid);
  const meta = await env.PRODUCTS_DB.get("combo_meta:" + rid, { type: "json" });

  if (rawCombo || meta) {
    let items = [];
    let totalPiezas = 0;
    if (rawCombo) {
      const parts = rawCombo.split(/[\s,]+/).map(s => s.trim()).filter(s => s);
      for (let i = 0; i < parts.length; i += 2) {
        const cId = parts[i];
        const qty = parseInt(parts[i + 1]) || 1;
        const pData = await env.PRODUCTS_DB.get("individual:" + cId, { type: "json" });
        if (pData) {
          const tit = (pData.titulo || pData.nombre || "").toUpperCase();
          const esFlete = tit.includes("FLETE") || cId.toUpperCase().includes("FLETE");
          if (!esFlete) totalPiezas += qty;
          items.push({ p: pData, q: qty });
        }
      }
    }

    const res = {
      id: rid, key: "combo:" + rid, tipo: "combo", conteo_piezas: totalPiezas,
      titulo: meta?.titulo || ("Combo " + rid),
      precio: meta?.precio || items.reduce((t, item) => t + ((parseFloat(item.p.precio) || 0) * item.q), 0),
      descripcion: meta?.descripcion || "",
      medidas: meta?.medidas || items.map(i => i.p.medidas).filter(x => x && x !== "N/A").join(" | "),
      estructura: meta?.estructura || items.map(i => i.p.estructura).filter(x => x && x !== "N/A").join(" | "),
      colores: meta?.colores || items.map(i => i.p.colores).filter(x => x && x !== "N/A").join(", "),
      resistencia_peso: meta?.resistencia_peso || items.map(i => i.p.resistencia_peso).filter(x => x && x !== "N/A").join(" | "),
      garantia: meta?.garantia || items.map(i => i.p.garantia).filter(x => x && x !== "N/A").join(" | "),
      imagenes: [
        meta?.imagen1, meta?.imagen2,
        ...items.flatMap(i => [i.p.imagen1, i.p.imagen2, i.p.imagen, i.p.url, i.p.link, i.p.link_publico])
      ].filter(img => typeof img === "string" && img.length > 10 && img.startsWith("http")),
      ficha_combinada: items.map(item => {
        const pre = item.q > 1 ? "(" + item.q + " Unidades) " : "";
        return "[" + pre + (item.p.titulo || item.p.nombre) + "] - Medidas: " + (item.p.medidas || "N/A") + " - Material: " + (item.p.estructura || "N/A") + " - Colores: " + (item.p.colores || "N/A");
      }).join("\n"),
      ...(meta || {}),
      items: items.map(i => i.p)
    };
    res.imagenes = [...new Set(res.imagenes)];
    return res;
  }

  const ind = await env.PRODUCTS_DB.get("individual:" + rid, { type: "json" });
  return ind ? {
    ...ind, id: rid, key: "individual:" + rid, tipo: "individual",
    titulo: ind.titulo || ind.nombre,
    imagenes: [ind.imagen1, ind.imagen2, ind.link_publico, ind.url, ind.link, ind.imagen].filter(img => typeof img === "string" && img.length > 10 && img.startsWith("http"))
  } : null;
}

async function buscarProductoPorNombreEnMensaje(mensaje, env, trace) {
  try {
    const listadoRaw = await env.PRODUCTS_DB.get("productos:listado");
    const listado = JSON.parse(listadoRaw || "[]");
    const m = normalizarTextoGlobal(mensaje);
    if (m.length < 4) return null;

    let mejorMatch = null;
    let maxScore = 0;

    for (const p of listado) {
      const nombre = normalizarTextoGlobal(p.nombre || p.titulo || "");
      if (nombre.length < 4) continue;

      let score = 0;
      const palabras = nombre.split(" ");
      for (let pal of palabras) {
        if (pal.length > 3 && m.includes(pal)) score += pal.length;
      }

      if (score > maxScore && score >= 8) {
        maxScore = score;
        mejorMatch = p;
      }
    }

    if (mejorMatch) {
      const id = mejorMatch.key ? mejorMatch.key.split(":").pop() : null;
      if (id) return await obtenerProductoSeguro(id, env);
    }
  } catch (e) { if (trace) trace.error("Error en buscarProductoPorNombreEnMensaje", e); }
  return null;
}

async function buscarProductoPorCodigoEnMensaje(mensaje, env, trace) { try { const listadoRaw = await env.PRODUCTS_DB.get("productos:listado"); const listado = JSON.parse(listadoRaw || "[]"); const m = mensaje.toUpperCase(); for (const p of listado) { const fullKey = (p.key || "").toUpperCase(); const idFromKey = fullKey.split(':').pop(); const sku = (p.sku || "").toUpperCase(); const codigo = sku || idFromKey; if (codigo && codigo.length > 4 && m.includes(codigo)) { if (trace) trace.add("Producto encontrado por codigo: " + codigo); const kvProd = await obtenerProductoSeguro(codigo, env); return kvProd || { ...p, titulo: p.nombre || p.titulo }; } } } catch (e) { if (trace) trace.error("Error en buscarProductoPorCodigoEnMensaje", e); } return null; }

function detectarSeleccionNatural(mensaje, lista) {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const m = normalizarEntradaAvanzada(mensaje);
  if (/\b(medida|cuanto|precio|limpia|resiste|material|fotos|imagenes|color|garantia|dimension)\b/i.test(m)) return null;

  const mapa = {
    "primero": 0, "primer": 0, "uno": 0, "la 1": 0, "el 1": 0,
    "segundo": 1, "dos": 1, "la 2": 1, "el 2": 1,
    "tercero": 2, "tres": 2, "la 3": 2, "el 3": 2,
    "cuarto": 3, "cuatro": 3, "la 4": 3, "el 4": 3,
    "ultimo": lista.length - 1
  };
  for (let key in mapa) { if (new RegExp("\\b" + key + "\\b", "i").test(m)) return mapa[key]; }

  const matchNum = /\b([1-4])\b(?!\s*(cuerpo|puerta|plaza|gaveta|cajon|c|k|q|p|mt|cm|unid|pieza))/i.exec(m);
  if (matchNum) { const idx = parseInt(matchNum[1]) - 1; if (idx < lista.length) return idx; }

  const scores = lista.map((item, index) => {
    const textoBase = normalizarTextoGlobal(item.nombre || item.titulo || "");
    let score = 0;
    const pesos = { "arisona": 60, "frostmont": 60, "wengue": 60, "slah": 60, "estandar": 30 };
    Object.keys(pesos).forEach(p => { if (m.includes(p) && textoBase.includes(p)) score += pesos[p]; });
    m.split(/\s+/).forEach(word => { if (word.length > 3 && textoBase.includes(word)) score += 15; });
    return { index, score };
  });

  const ganador = scores.sort((a, b) => b.score - a.score)[0];
  return (ganador && ganador.score >= 10) ? ganador.index : null;
}

async function callVendedorElitePro(message, contact, env, productoActual, intencionCierre, coverage, esSoloSaludo = false, esPrimerMensaje = false) {
  let info = "";
  if (productoActual) {
    const p = productoActual;
    if (p.tipo === "combo") {
      info = "PRODUCTO: " + p.titulo + " (Combo de " + p.conteo_piezas + " piezas)\n" +
             "Precio: Q" + p.precio + "\n" +
             "Descripción: " + (p.descripcion || "N/A") + "\n" +
             "Medidas: " + (p.medidas || "N/A") + "\n" +
             "Material: " + (p.estructura || "N/A") + "\n" +
             "Colores: " + (p.colores || "N/A") + "\n" +
             "Garantía: " + (p.garantia || "N/A") + "\n" +
             "Componentes del combo:\n" + p.ficha_combinada;
    } else {
      info = "PRODUCTO: " + p.titulo + "\n" +
             "Precio: Q" + p.precio + "\n" +
             "Descripción: " + (p.descripcion || "N/A") + "\n" +
             "Medidas: " + (p.medidas || "N/A") + "\n" +
             "Material: " + (p.estructura || "N/A") + "\n" +
             "Colores: " + (p.colores || "N/A") + "\n" +
             "Resistencia: " + (p.resistencia_peso || "N/A") + "\n" +
             "Garantía: " + (p.garantia || "N/A");
    }
  }

  const mostrarMenu = !!productoActual && !esSoloSaludo;
  const helpMenu = mostrarMenu ? "\n\nAl final del mensaje añade EXACTAMENTE esta línea: Puedo informarle sobre: Medidas, Colores, Materiales, Precios, Envío y Cuotas. 😉" : "";

  let instruccionSaludo = "";
  if (esSoloSaludo) {
    instruccionSaludo = esPrimerMensaje ? "Saluda cordialmente al cliente." : "Responde de forma muy breve sin saludar de nuevo, ya estamos en una conversación.";
  }

  const prompt = "Eres un asesor amable de La Mueblería. REGLAS:\n1. BREVEDAD TOTAL: Máximo 2 oraciones.\n2. SOLO LO SOLICITADO.\n3. MENÚ DE AYUDA: " + (mostrarMenu ? "Añade el menú al final." : "NO añadas menú de ayuda.") + "\n4. EMOJIS: Máximo uno.\n5. CIERRE: Nombre, DPI, Dirección y Teléfono juntos si quiere comprar.\n6. SALUDO: " + instruccionSaludo + "\nPUNTOS VENTA: Envío GRATIS (" + (coverage || "Toda Guatemala") + "), Pago Contra Entrega, Cuotas SIN RECARGO.\n\n" + info + helpMenu + "\n\nMensaje del cliente: " + message;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.OPENAI_API_KEY },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: "Asesor de muebles breve y amable." }, { role: "user", content: prompt }], temperature: 0.1 })
    });
    const data = await res.json();
    let content = data.choices[0].message.content;
    if (!mostrarMenu) content = content.replace(/Puedo informarle sobre: Medidas, Colores, Materiales, Precios, Envío y Cuotas.*/gi, "").trim();
    return content;
  } catch (err) { return "Con gusto le ayudo. Permítame un momento para confirmarle la información exacta."; }
}

async function moduloCatalogo(message, contact, env, trace) {
  const m = normalizarEntradaAvanzada(message);
  const listadoRaw = await env.PRODUCTS_DB.get("productos:listado");
  const listado = JSON.parse(listadoRaw || "[]");
  const categorias = ["cama", "cocina", "ropero", "sofa", "comedor", "gavetero", "tocador", "cabecera", "mesita", "librera", "mesa", "trinchante", "platera", "mueble", "amueblado"];
  const fUltimaCat = getFieldId(env, "ultima_categoria");
  const fFiltroTamano = getFieldId(env, "filtro_tamano");
  let catFound = categorias.find(c => m.includes(c));
  let cat = catFound || getCustomFieldValue(contact, fUltimaCat) || "muebles";
  let tamano = getCustomFieldValue(contact, fFiltroTamano);
  const mTamano = m.match(/\b(mediano|mediana|grande|pequeño|pequeña)\b/i);
  if (mTamano) {
    const matched = mTamano[1].toLowerCase();
    tamano = (matched.startsWith("median") || matched.startsWith("peque")) ? "mediano" : "grande";
    await setCustomFieldValue(contact, fFiltroTamano, tamano, env, trace);
  }
  if (catFound) await setCustomFieldValue(contact, fUltimaCat, cat, env, trace);
  if (!tamano) {
    const genero = (cat === "cama" || cat === "cocina" || cat === "sala" || cat === "mesa") ? "a" : "o";
    const catDisplayName = cat === "muebles" ? "muebles" : cat.toUpperCase();
    return { text: "¿Busca opciones de " + catDisplayName + " en tamaño " + (genero === "a" ? "mediana" : "mediano") + " o grande? 😉" };
  }
  const resultadosBase = (cat === "muebles") ? listado : listado.filter(p => normalizarTextoGlobal(p.nombre || p.titulo).includes(cat));
  let resultados = resultadosBase;
  if (tamano === "mediano") resultados = resultadosBase.filter(p => (parseFloat(p.precio) || 0) <= 5000);
  else if (tamano === "grande") resultados = resultadosBase.filter(p => (parseFloat(p.precio) || 0) > 5000);

  let preMsg = "";
  if (resultados.length === 0 && tamano) {
    preMsg = "Por el momento no tengo opciones de " + cat.toUpperCase() + " en tamaño " + tamano.toUpperCase() + " disponibles, pero aquí le muestro las opciones de " + cat.toUpperCase() + " que tenemos para usted:\n\n";
    resultados = resultadosBase;
  }

  resultados = resultados.slice(0, 4);
  if (resultados.length === 0) {
    return { text: "Lo siento, no encontré opciones de " + cat.toUpperCase() + " disponibles en este momento, pero un asesor le ayudará en breve. 😉", handover: true };
  }
  const paraGuardar = resultados.map(p => ({ key: p.key, nombre: p.nombre || p.titulo, precio: p.precio }));
  await setCustomFieldValue(contact, getFieldId(env, "carrito_json"), JSON.stringify(paraGuardar), env, trace);
  await setCustomFieldValue(contact, getFieldId(env, "carrito"), paraGuardar.map(p => p.nombre).join(", "), env, trace);
  await setCustomFieldValue(contact, fFiltroTamano, null, env, trace);
  let resp = preMsg || ("Aquí tiene opciones de " + cat.toUpperCase() + (tamano ? " " + tamano.toUpperCase() : "") + "S disponibles:\n\n");
  resultados.forEach((p, i) => { resp += (i + 1) + ". " + (p.nombre || p.titulo).toUpperCase() + " - Q" + p.precio + "\n"; });
  resp += "\n¿Cuál le gustaría conocer a detalle? 😉";
  return { text: resp };
}

async function processFullFlow(rawMsg, contactId, contact, env, trace) {
  try {
    trace.add("Iniciando processFullFlow...");
    const metaMatch = rawMsg.match(/\b(B[A-Z0-9]{5,})\b/i);
    if (metaMatch && metaMatch[1]) {
      const detectedCode = metaMatch[1];
      trace.add("Código detectado: " + detectedCode);
      await setCustomFieldValue(contact, getFieldId(env, "Anuncio"), detectedCode, env, trace);
    }
    const message = limpiarMensaje(rawMsg);
    const norm = normalizarTextoGlobal(message);
    const fEstado = getFieldId(env, "estado_actual");
    const currentEstado = getCustomFieldValue(contact, fEstado) || "nuevo";
    const esPrimerMensaje = (currentEstado === "nuevo");
    const fProductoId = getFieldId(env, "producto_id");
    const fUltimaCat = getFieldId(env, "ultima_categoria");
    const fCatInteres = getFieldId(env, "categoria_interes");
    const fTamanoCat = getFieldId(env, "tamaño_categoria");
    const fComboPadre = getFieldId(env, "GHL_combo_padre_FIELD_ID");
    const fComboComp = getFieldId(env, "GHL_combo_componentes_FIELD_ID");

    const carrito = JSON.parse(getCustomFieldValue(contact, getFieldId(env, "carrito_json")) || "[]");
    let targetProduct = null;
    let esSeleccionReciente = false;

    if (metaMatch) targetProduct = await obtenerProductoSeguro(metaMatch[1], env);
    if (!targetProduct) targetProduct = await buscarProductoPorCodigoEnMensaje(rawMsg, env, trace);

    let selIdx = detectarSeleccionNatural(message, carrito);
    if (selIdx !== null && carrito[selIdx]) {
      const prodFromSel = await obtenerProductoSeguro(carrito[selIdx].key.split(':').pop(), env);
      if (prodFromSel) { targetProduct = prodFromSel; esSeleccionReciente = true; }
    }

    if (!targetProduct) targetProduct = await buscarProductoPorNombreEnMensaje(message, env, trace);

    if (!targetProduct) {
      const pid = getCustomFieldValue(contact, fProductoId);
      if (pid) targetProduct = await obtenerProductoSeguro(pid, env);
    }

    if (targetProduct) {
      trace.add("Producto objetivo: " + targetProduct.titulo);
      await setCustomFieldValue(contact, fProductoId, targetProduct.id, env, trace);
    }

    let responseText, responseImgs = [], estadoPropuesto = currentEstado === "nuevo" ? "interaccion" : currentEstado;
    const pideFotos = /fotos?|imagenes?|verlo|verla|mostrar|enviame|fts/i.test(message);
    const pideCompra = /\b(comprar|adquirir|interesa|ordenar|pedido|quiero el|quiero la|llevarmelo|llevarmela|apartar|reservar|informacion para compra|proceder|comprarla|comprarlo)\b/i.test(norm);
    const pideDuda = /\b(unidad|separado|aparte|solo la|solo el|venden solo|venden solamente)\b/i.test(norm);
    const pideGarantia = /\b(compre|adquiri|garantia|rompio|arruino|dañado|defectuoso|malo|reclamo|fallo|falla)\b/i.test(norm);
    const esAfirmacionGenerica = /^(ok|vale|esta bien|muy bien|si gracias|de acuerdo|perfecto|entendido|así es|esta ok|está ok|si|sii|por favor|porfavor|claro|envia|mandame)$/i.test(norm.trim());
    const pideCatalogo = /catalogo|modelos|opciones|variedad|otros|ver mas|muestreme|mostrame|muestreme mas|oferta|ofertas|otra|otras|venden|vende|que mas/i.test(norm);
    const tieneCategoria = /cama|ropero|cocina|mueble|amueblado|comedor|mesa|gavetero|tocador|trinchante|platera|marquesa|cabecera|mesita|librera/i.test(norm);
    const esSoloSaludo = /^(hola|buen|buena|buenas|tarde|dia|dias|noche|noches|buena tarde|buen dia|buenos dias|buenas noches|buenas tardes|\s)+$/i.test(norm.trim());

    if (pideGarantia) { trace.add("[ROUTER] Intención: Garantía. Iniciando traspaso."); await triggerHandover(contactId, env, trace); return; }

    // LÓGICA DE FLUJO: Priorizar el producto si ya existe uno identificado
    // Solo entramos al catálogo si el usuario no tiene un producto seleccionado O si pide el catálogo explícitamente.
    if (targetProduct && !pideCatalogo && !pideDuda) {
      trace.add("[ROUTER] Ruta: Ficha de Producto / Cierre. Producto: " + targetProduct.titulo);
      estadoPropuesto = pideCompra ? "cierre" : "producto";
      const tituloProd = normalizarTextoGlobal(targetProduct.titulo || "");
      const cats = ["cama", "cocina", "ropero", "sofa", "comedor", "gavetero", "tocador", "cabecera", "mesita", "librera", "mesa"];
      let catProd = cats.find(c => tituloProd.includes(c)) || getCustomFieldValue(contact, fUltimaCat);
      if (catProd) { await setCustomFieldValue(contact, fUltimaCat, catProd, env, trace); await setCustomFieldValue(contact, fCatInteres, catProd, env, trace); }

      if ((pideFotos || pideCompra || esAfirmacionGenerica) && (!targetProduct.imagenes || targetProduct.imagenes.length === 0)) {
        if (catProd === "ropero") { await addToWorkflow(contactId, "9b36093c-f008-4261-b2ba-bc54a0cdd9c9", env, trace); }
        else if (catProd === "cocina") { await addToWorkflow(contactId, "a2fca18f-d0c7-4c97-8185-7926540bf2de", env, trace); }
      }

      responseImgs = (esSeleccionReciente || pideFotos) ? (targetProduct.imagenes || []) : [];
      if (pideFotos && responseImgs.length === 0) { await triggerHandover(contactId, env, trace); return; }
      const coverage = await obtenerRespuestaCoverage(rawMsg, env, trace);
      trace.add("Llamando a OpenAI (Producto)...");
      responseText = await callVendedorElitePro(message, contact, env, targetProduct, pideCompra, coverage, esSoloSaludo, esPrimerMensaje);
      await setCustomFieldValue(contact, fProductoId, targetProduct.id, env, trace);
      await setCustomFieldValue(contact, getFieldId(env, "total_pedido"), targetProduct.precio || 0, env, trace);
      if (targetProduct.tipo === "combo") {
        await setCustomFieldValue(contact, fComboPadre, targetProduct.id, env, trace);
        if (Array.isArray(targetProduct.items)) { await setCustomFieldValue(contact, fComboComp, JSON.stringify(targetProduct.items.map(i => i.id)), env, trace); }
      }
    } else if (pideCatalogo || tieneCategoria || /\b(mediano|grande)\b/i.test(norm)) {
      trace.add("[ROUTER] Ruta: Catálogo / Categoría.");
      estadoPropuesto = "catalogo";
      const resCat = await moduloCatalogo(message, contact, env, trace);
      if (resCat.text) await sendMessageToGHL(contactId, resCat.text, env, trace, []);
      if (resCat.handover) { await triggerHandover(contactId, env, trace); return; }
      if (resCat.text) return;
    } else {
      trace.add("[ROUTER] Ruta: Respuesta General (OpenAI).");
      const coverage = await obtenerRespuestaCoverage(rawMsg, env, trace);
      trace.add("Llamando a OpenAI (General)...");
      responseText = await callVendedorElitePro(message, contact, env, null, pideCompra, coverage, esSoloSaludo, esPrimerMensaje);
    }
    if (responseText && responseText.includes("[TRANSFERIR]")) { trace.add("IA pidió transferencia."); await triggerHandover(contactId, env, trace); return; }
    await setCustomFieldValue(contact, fEstado, estadoPropuesto, env, trace);
    const caption = targetProduct ? (targetProduct.titulo || "").toUpperCase() : "";
    await sendMessageToGHL(contactId, responseText, env, trace, responseImgs, caption);
    if (pideCompra) await triggerHandover(contactId, env, trace);
  } catch (err) { if (trace) trace.error("Error processFullFlow: ", err); await triggerHandover(contactId, env, trace); }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK");
    const trace = new TraceLog();
    let contactId;
    try {
      const rawBody = await request.text();
      const body = JSON.parse(rawBody);
      contactId = body.contact_id || body.contact?.id;
      if (!contactId) return new Response("OK");

      const contact = await getContactFromGHL(contactId, env, trace);
      if (!contact || contact.tags?.includes("humano") || contact.assignedTo) {
        trace.flush();
        return new Response("OK");
      }

      const rawMsg = body.message?.body || body.message?.text || "";
      const bKey = "buffer:" + contactId;
      const lKey = "last:" + contactId;
      const now = Date.now();
      const old = await env.PRODUCTS_DB.get(bKey) || "";
      await env.PRODUCTS_DB.put(bKey, old + " " + rawMsg, { expirationTtl: 60 });
      await env.PRODUCTS_DB.put(lKey, now.toString(), { expirationTtl: 60 });

      ctx.waitUntil((async () => {
        try {
          await new Promise(r => setTimeout(r, 2500));
          const latestTs = await env.PRODUCTS_DB.get(lKey);
          if (latestTs === now.toString()) {
            trace.add("Procesando mensaje consolidado...");
            const consolidatedMsg = await env.PRODUCTS_DB.get(bKey);
            await env.PRODUCTS_DB.delete(bKey);
            await env.PRODUCTS_DB.delete(lKey);
            await processFullFlow(consolidatedMsg, contactId, contact, env, trace);
            trace.add("Flujo completado.");
          }
        } catch (err) {
          trace.error("Error en waitUntil: ", err);
        } finally {
          trace.flush();
        }
      })());

      return new Response("OK");
    } catch (e) {
      trace.error("Error crítico en fetch: ", e);
      if (contactId) { try { await triggerHandover(contactId, env, trace); } catch (err) {} }
      trace.flush();
      return new Response("OK");
    }
  }
};