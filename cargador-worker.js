/* =========================================================
   CARGADOR DE MUEBLES IA - Versión Worker Única (Autocontenido)
   - Gestión de productos (Individual / Combo)
   - Generación de ficha técnica con GPT-4o-mini
   - Persistencia directa en Cloudflare KV
========================================================= */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- API ENDPOINTS ---
    if (path.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
      }

      try {
        // 1. VERIFICAR ID
        if (path.startsWith('/api/check-id/')) {
          const id = path.split('/').pop();
          const individual = await env.PRODUCTS_DB.get(`individual:${id}`, { type: 'json' });
          if (individual) return jsonRes({ success: true, exists: true, type: 'individual', data: individual });

          const comboMeta = await env.PRODUCTS_DB.get(`combo_meta:${id}`, { type: 'json' });
          const comboRaw = await env.PRODUCTS_DB.get(`combo:${id}`);
          if (comboMeta || comboRaw) {
            return jsonRes({ success: true, exists: true, type: 'combo', data: comboMeta || {}, components: comboRaw || "" });
          }
          return jsonRes({ success: true, exists: false });
        }

        // 2. GENERAR PREVIEW (IA)
        if (path === '/api/generate-preview' && request.method === 'POST') {
          const body = await request.json();
          const { nombre, precio, categoria, idManual, esCombo, imageBase64, imageUrl } = body;
          if (!nombre || !precio || !categoria) throw new Error('Nombre, precio y categoría son requeridos.');

          const finalId = idManual || `M${Math.floor(Math.random() * 9000) + 1000}`;
          const existingKey = esCombo ? `combo_meta:${finalId}` : `individual:${finalId}`;
          const existingData = await env.PRODUCTS_DB.get(existingKey, { type: 'json' });
          if (existingData) return jsonRes({ success: true, data: existingData, fromKV: true });

          const systemPrompt = "Eres un experto vendedor de muebles en Guatemala. Genera la ficha técnica JSON con 17 campos exactos.\n\nREGLAS PARA EL TÍTULO:\n- Debe ser ATRACTIVO y PERSUASIVO, en MAYÚSCULAS.\n- Empieza con adjetivos: LINDA, HERMOSA, BELLA o ELEGANTE.\n- PROHIBIDO usar: MELAMINA, FROST MONT, WENGUE, o nombres de colores técnicos.\n\nESTRUCTURA REQUERIDA (JSON):\n{\n  \"id\": \"" + finalId + "\",\n  \"titulo\": \"...\", \"descripcion\": \"...\", \"medidas\": \"...\", \"estructura\": \"...\",\n  \"precio\": " + precio + ", \"categoria\": \"" + categoria + "\", \"colores\": \"...\", \"garantia\": \"...\",\n  \"grosor_material\": \"...\", \"tipo_ensamble\": \"...\", \"resistencia_peso\": \"...\",\n  \"refuerzos\": \"...\", \"personalizacion\": \"...\", \"limpieza\": \"...\",\n  \"imagen1\": \"...\", \"imagen2\": \"...\"\n}";

          const aiResponse = await getAIResponse(env.OPENAI_API_KEY, systemPrompt, "Genera JSON para: " + nombre + ".", imageBase64, imageUrl);
          const cleaned = aiResponse.replace(/```json|```/g, '').trim();
          let generatedData = JSON.parse(cleaned);
          if (Object.keys(generatedData).length === 1 && typeof Object.values(generatedData)[0] === 'object') {
            generatedData = Object.values(generatedData)[0];
          }
          generatedData.categoria = categoria;
          return jsonRes({ success: true, data: generatedData, fromKV: false });
        }

        // 3. CONFIRMAR PUBLICACIÓN
        if (path === '/api/confirm-publish' && request.method === 'POST') {
          const { productData, esCombo, componentes } = await request.json();
          const finalId = productData.id;
          const finalKey = esCombo ? `combo_meta:${finalId}` : `individual:${finalId}`;

          await env.PRODUCTS_DB.put(finalKey, JSON.stringify(productData));
          if (esCombo) await env.PRODUCTS_DB.put(`combo:${finalId}`, componentes);

          let listado = await env.PRODUCTS_DB.get('productos:listado', { type: 'json' }) || [];
          listado = listado.filter(p => p.sku !== finalId);
          listado.push({ nombre: productData.titulo, key: finalKey, tipo: esCombo ? 'combo' : 'individual', precio: Number(productData.precio), sku: finalId });
          await env.PRODUCTS_DB.put('productos:listado', JSON.stringify(listado));
          return jsonRes({ success: true });
        }

        // 4. ELIMINAR
        if (path === '/api/delete-product' && request.method === 'POST') {
          const { id, esCombo } = await request.json();
          const finalKey = esCombo ? `combo_meta:${id}` : `individual:${id}`;
          await env.PRODUCTS_DB.delete(finalKey);
          if (esCombo) await env.PRODUCTS_DB.delete(`combo:${id}`);

          let listado = await env.PRODUCTS_DB.get('productos:listado', { type: 'json' }) || [];
          listado = listado.filter(p => p.sku !== id);
          await env.PRODUCTS_DB.put('productos:listado', JSON.stringify(listado));
          return jsonRes({ success: true });
        }

      } catch (e) {
        return jsonRes({ success: false, error: e.message }, 500);
      }
    }

    // --- SERVIR INTERFAZ (HTML) ---
    return new Response(getHTML(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};

function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}

async function getAIResponse(apiKey, systemPrompt, userContent, imageBase64 = null, imageUrl = null) {
  const userMessageContent = [{ type: "text", text: userContent }];
  if (imageBase64) userMessageContent.push({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + imageBase64 } });
  else if (imageUrl) userMessageContent.push({ type: "image_url", image_url: { url: imageUrl } });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessageContent }],
      temperature: 0.2
    })
  });
  if (!res.ok) throw new Error('Error en conexión con IA: ' + res.status);
  const data = await res.json();
  return data.choices[0].message.content;
}

function getHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8"><title>Cargador de Muebles IA</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #f8f9fa; }
        .card { background: white; padding: 25px; border-radius: 12px; max-width: 900px; margin: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        input, textarea, select { padding: 12px; border: 1px solid #ddd; border-radius: 8px; width: 100%; box-sizing: border-box; }
        button { padding: 12px 24px; cursor: pointer; border: none; border-radius: 8px; font-weight: 600; transition: 0.3s; }
        .btn-gen { background: #007bff; color: white; }
        .btn-check { background: #6c757d; color: white; }
        .btn-save { background: #28a745; color: white; margin-top: 20px; }
        .hidden { display: none; }
        .preview-box { margin-top: 30px; border-top: 2px solid #f1f1f1; padding-top: 20px; }
        label { display: block; margin-bottom: 5px; font-size: 0.85rem; color: #666; font-weight: bold; }
        .id-section { background: #f1f3f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid #007bff; }
    </style>
</head>
<body>
    <div class="card">
        <h2>🚀 Cargador de Muebles con Visión IA</h2>
        <div class="id-section">
            <label>1️⃣ Verificar Existencia por ID:</label>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="idm" placeholder="Ingresa el ID del mueble">
                <button type="button" id="btn-check-id" class="btn-check">🔍 Buscar ID</button>
            </div>
        </div>
        <form id="main-form">
            <label>2️⃣ Datos del Mueble:</label>
            <div class="grid" style="margin-top: 10px;">
                <input type="text" id="nombre" placeholder="Nombre del mueble" required>
                <input type="number" id="precio" placeholder="Precio (Q)" required>
                <input type="text" id="cat" placeholder="Categoría (ej: Sala)" required>
            </div>
            <div style="margin-bottom: 15px;">
                <label>📸 Imagen del mueble (Archivo o URL):</label>
                <input type="file" id="foto" accept="image/*" style="margin-bottom:10px">
                <input type="url" id="foto-url" placeholder="Pega el link de la imagen pública">
            </div>
            <label><input type="checkbox" id="is-combo"> ¿Es un Combo?</label>
            <textarea id="comp" placeholder="IDs de los componentes..." class="hidden" style="margin-top:10px"></textarea>
            <br>
            <button type="submit" class="btn-gen">Generar Ficha con IA ✨</button>
        </form>
        <div id="editor-area" class="preview-box hidden">
            <h3>📋 Edición de Ficha Técnica (17 Campos):</h3>
            <div id="fields-grid" class="grid"></div>
            <button id="save-to-cloud" class="btn-save">Confirmar y Sincronizar Listado ☁️</button>
        </div>
        <p id="status-msg" style="margin-top:15px; font-weight: 600;"></p>
    </div>
    <script>
        const mainForm = document.getElementById('main-form');
        const editorArea = document.getElementById('editor-area');
        const fieldsGrid = document.getElementById('fields-grid');
        const saveBtn = document.getElementById('save-to-cloud');
        const statusMsg = document.getElementById('status-msg');
        const isCombo = document.getElementById('is-combo');
        const compArea = document.getElementById('comp');
        const fotoUrlInput = document.getElementById('foto-url');
        const idInput = document.getElementById('idm');
        const btnCheckId = document.getElementById('btn-check-id');
        let currentData = null;

        isCombo.onchange = () => compArea.classList.toggle('hidden', !isCombo.checked);

        btnCheckId.onclick = async () => {
            const id = idInput.value.trim();
            if (!id) { statusMsg.innerText = "❌ Ingresa un ID primero."; return; }
            statusMsg.innerText = "🔍 Buscando ID en Cloudflare...";
            try {
                const res = await fetch('/api/check-id/' + id);
                const result = await res.json();
                if (result.exists) {
                    statusMsg.innerHTML = '✅ <b>ID Encontrado:</b> Datos cargados para <b>'+id+'</b>.<br><button onclick="deleteExisting(\\''+id+'\\', '+(result.type === 'combo')+')" style="background:#dc3545; color:white; padding:5px 10px; margin-top:5px; border-radius:5px; border:none; cursor:pointer;">Eliminar Mueble 🗑️</button>';
                    let data = result.data;
                    if (typeof data === 'string') data = JSON.parse(data);
                    currentData = data;
                    document.getElementById('nombre').value = data.titulo || "";
                    document.getElementById('precio').value = data.precio || "";
                    document.getElementById('cat').value = data.categoria || "";
                    if (result.type === 'combo') {
                        isCombo.checked = true;
                        compArea.classList.remove('hidden');
                        compArea.value = result.components || "";
                    } else {
                        isCombo.checked = false;
                        compArea.classList.add('hidden');
                    }
                    if (Object.keys(data).length > 0) showEditor(data);
                } else {
                    statusMsg.innerText = "✨ El ID no existe en la base de datos.";
                    editorArea.classList.add('hidden');
                }
            } catch (e) { statusMsg.innerText = "❌ Error al buscar ID."; }
        };

        function showEditor(data) {
            fieldsGrid.innerHTML = Object.keys(data).map(key => '<div><label>'+key.toUpperCase()+'</label><input type="text" id="edit-'+key+'" value="'+(typeof data[key] === 'object' ? JSON.stringify(data[key]).replace(/"/g, '&quot;') : String(data[key]).replace(/"/g, '&quot;'))+'"></div>').join('');
            editorArea.classList.remove('hidden');
            editorArea.scrollIntoView({ behavior: 'smooth' });
        }

        async function processImage(file, maxWidth = 1024) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width; let height = img.height;
                        if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
                    };
                };
            });
        }

        mainForm.onsubmit = async (e) => {
            e.preventDefault();
            statusMsg.innerText = "⏳ Consultando IA...";
            let base64 = null;
            const fileInput = document.getElementById('foto');
            if (fileInput.files[0]) base64 = await processImage(fileInput.files[0]);
            try {
                const res = await fetch('/api/generate-preview', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        nombre: document.getElementById('nombre').value,
                        precio: document.getElementById('precio').value,
                        categoria: document.getElementById('cat').value,
                        idManual: idInput.value,
                        esCombo: isCombo.checked,
                        componentes: compArea.value,
                        imageBase64: base64,
                        imageUrl: fotoUrlInput.value.trim()
                    })
                });
                const responseJson = await res.json();
                if (!responseJson.success) throw new Error(responseJson.error);
                currentData = responseJson.data;
                statusMsg.innerText = "✨ Ficha técnica generada.";
                showEditor(currentData);
            } catch (err) { statusMsg.innerText = "❌ Error: " + err.message; }
        };

        window.deleteExisting = async (id, esCombo) => {
            if (!confirm('¿Borrar definitivamente el producto '+id+'?')) return;
            try {
                await fetch('/api/delete-product', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ id, esCombo })
                });
                statusMsg.innerText = "✅ Producto eliminado.";
                editorArea.classList.add('hidden');
                mainForm.reset();
            } catch (e) { statusMsg.innerText = "❌ Error al borrar."; }
        };

        saveBtn.onclick = async () => {
            statusMsg.innerText = "☁️ Sincronizando...";
            const updatedData = {};
            Object.keys(currentData).forEach(key => { updatedData[key] = document.getElementById('edit-'+key).value; });
            try {
                const res = await fetch('/api/confirm-publish', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ productData: updatedData, esCombo: isCombo.checked, componentes: compArea.value })
                });
                const result = await res.json();
                if (!result.success) throw new Error(result.error);
                statusMsg.innerText = "🚀 ¡ÉXITO! Sincronizado.";
                mainForm.reset();
                editorArea.classList.add('hidden');
            } catch (err) { statusMsg.innerText = "❌ Error al guardar."; }
        };
    </script>
</body>
</html>`;
}
