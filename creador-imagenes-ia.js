
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Servir el Frontend
    if (request.method === "GET") {
      return new Response(getHTML(), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // Manejar la generación de imagen
    if (request.method === "POST" && url.pathname === "/generate") {
      try {
        const body = await request.json();
        const { config, quality: selectedModel } = body;

        console.log("Configuración recibida:", JSON.stringify(config, null, 2).substring(0, 500));

        if (!config.productos || config.productos.length === 0) {
          return new Response(JSON.stringify({ error: "Se requieren productos." }), { status: 400 });
        }

        // 1. Construir el Prompt Maestro
        const promptMaestro = construirPrompt(config);
        console.log("Prompt Maestro Construido:", promptMaestro);

        // 2. Construir Contenido (Prompt + Imágenes)
        const contenido = [];
        contenido.push({ type: "input_text", text: promptMaestro });

        if (config.fondoMaestro) {
          contenido.push({
            type: "input_image",
            image_url: config.fondoMaestro.startsWith("http") ? config.fondoMaestro : `data:image/jpeg;base64,${config.fondoMaestro}`
          });
        }

        for (const p of config.productos) {
          contenido.push({
            type: "input_image",
            image_url: p.url.startsWith("http") ? p.url : `data:image/jpeg;base64,${p.url}`
          });
        }

        // 3. Llamada al endpoint de RESPONSES (Multimodal Image Generation)
        console.log(`Iniciando generación multimodal con modelo: ${selectedModel}...`);

        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            input: [
              {
                role: "user",
                content: contenido
              }
            ],
            tools: [
              { type: "image_generation" }
            ]
          })
        });

        const data = await response.json();

        if (data.error) {
          console.error("OpenAI API Error:", data.error);
          throw new Error(`Error: ${data.error.message}`);
        }

        // 4. Obtener imagen del resultado
        const imageResult = data.output?.find(item => item.type === "image_generation_call");

        if (!imageResult || !imageResult.result) {
          console.error("No se generó imagen en la respuesta:", data);
          throw new Error("La IA no devolvió ninguna imagen generada.");
        }

        const finalImage = `data:image/png;base64,${imageResult.result}`;

        console.log("Imagen generada correctamente (Base64)");

        return new Response(JSON.stringify({
          imageUrl: finalImage,
          promptUsed: promptMaestro,
          modelUsed: selectedModel
        }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });

      } catch (error) {
        console.error("Error en Worker:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

/**
 * Genera el prompt basado en la estructura solicitada por el usuario
 */
function construirPrompt(config) {
  const listaProductos = config.productos
    .map(p => `- ${p.nombre}: ${p.posicion}`)
    .join("\n");

  return `
Crea UNA SOLA imagen ambientada profesional.

OBJETIVO:
Crear una escena tipo catálogo premium usando EXACTAMENTE
los productos enviados como referencia.

REGLAS OBLIGATORIAS:

- Usa EXACTAMENTE los productos enviados.
- NO cambies colores.
- NO rediseñes muebles.
- NO alteres tamaños reales.
- NO cambies materiales.
- NO inventes muebles nuevos.
- NO agregues productos adicionales.
- Mantén apariencia fotográfica real.
- Conserva texturas originales.
- Mantén proporciones reales.
- Integra los productos naturalmente.
- Mantén calidad tipo fotografía profesional.

IMPORTANTE:
Los productos deben verse como fotografías reales
integradas en el ambiente.

MANTENER EXACTAMENTE:
- iluminación
- estilo
- perspectiva
- fondo base
- decoración general

ESTILO DEL AMBIENTE:
- ${config.estilo.tipo}
- iluminación ${config.estilo.iluminacion}
- piso ${config.estilo.piso}
- paredes ${config.estilo.paredes}
- decoración ${config.estilo.decoracion}
- ${config.estilo.calidad}

DISTRIBUCION DE PRODUCTOS:
${listaProductos}

RESULTADO ESPERADO:
Una imagen profesional de catálogo de muebles,
realista, elegante y coherente visualmente.
`;
}

function getHTML() {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creador de Imágenes IA - Configuración Maestra</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --secondary: #6366f1;
            --bg: #f8fafc;
            --card: #ffffff;
            --text: #1e293b;
            --border: #e2e8f0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 20px;
        }

        .main-container {
            max-width: 1000px;
            margin: 0 auto;
            background: var(--card);
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        header {
            text-align: center;
            margin-bottom: 30px;
        }

        h1 {
            color: var(--primary);
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .section-title {
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--primary);
        }

        .grid-config {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        @media (max-width: 768px) {
            .grid-config { grid-template-columns: 1fr; }
        }

        .panel {
            border: 1px solid var(--border);
            padding: 20px;
            border-radius: 12px;
            background: #fdfdfd;
        }

        .input-group {
            margin-bottom: 15px;
        }

        label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 5px;
        }

        input, select, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 0.9rem;
            box-sizing: border-box;
        }

        .products-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }

        .product-card {
            border: 1px solid var(--border);
            padding: 15px;
            border-radius: 12px;
            position: relative;
            background: white;
            transition: transform 0.2s;
        }

        .product-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .preview-img {
            width: 100%;
            height: 120px;
            background: #f1f5f9;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
        }

        .preview-img img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        .preview-img .placeholder-text {
            color: #94a3b8;
            font-size: 0.8rem;
        }

        .btn-generate {
            background: var(--primary);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 1.1rem;
            width: 100%;
            cursor: pointer;
            transition: background 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .btn-generate:hover {
            background: var(--primary-hover);
        }

        .btn-generate:disabled {
            background: #94a3b8;
            cursor: not-allowed;
        }

        #resultArea {
            margin-top: 30px;
            text-align: center;
            display: none;
        }

        #resultImage {
            max-width: 100%;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .loading-spinner {
            display: none;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        details {
            margin-top: 20px;
            background: #f1f5f9;
            padding: 15px;
            border-radius: 8px;
            text-align: left;
            border: 1px solid var(--border);
        }

        summary {
            font-weight: 600;
            cursor: pointer;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        summary::after {
            content: '▼';
            font-size: 0.7rem;
            transition: transform 0.3s;
        }

        details[open] summary::after {
            transform: rotate(180deg);
        }

        pre {
            white-space: pre-wrap;
            font-size: 0.8rem;
            color: #334155;
            margin-top: 10px;
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px inset var(--border);
        }

        .campaign-badge {
            background: #fee2e2;
            color: #b91c1c;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: bold;
            display: inline-block;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="main-container">
        <header>
            <h1><i class="fas fa-magic"></i> Creador de Imágenes IA <span class="campaign-badge">MODO CAMPAÑA</span></h1>
            <p>Configuración Maestra para Catálogo Premium</p>
        </header>

        <!-- CONFIGURACIÓN DE ESCENARIO -->
        <div class="grid-config">
            <div class="panel">
                <div class="section-title">
                    <i class="fas fa-mountain"></i> Escenario Base
                    <button onclick="toggleLockFondo()" id="lockFondoBtn" style="margin-left:auto; font-size:0.7rem; padding:2px 5px; cursor:pointer;">
                        <i class="fas fa-unlock"></i> Bloquear Fondo
                    </button>
                </div>
                <div class="input-group">
                    <label>Fondo Maestro (Imagen de ambiente)</label>
                    <input type="file" id="fondoFile" accept="image/*" style="margin-bottom: 10px;">
                    <input type="text" id="fondoUrl" placeholder="O pega URL de fondo" oninput="handleFondoUrl(this.value)">
                    <div id="fondoPreview" class="preview-img" style="height: 150px; margin-top:10px">
                        <span class="placeholder-text">Fondo no seleccionado</span>
                    </div>
                </div>
            </div>

            <div class="panel">
                <div class="section-title"><i class="fas fa-paint-roller"></i> Estilo General</div>
                <div class="grid-config" style="grid-template-columns: 1fr 1fr; margin-bottom: 0; gap: 10px;">
                    <div class="input-group">
                        <label>Tipo</label>
                        <input type="text" id="estiloTipo" value="Catálogo Premium">
                    </div>
                    <div class="input-group">
                        <label>Iluminación</label>
                        <input type="text" id="estiloLuz" value="Cálida y Elegante">
                    </div>
                    <div class="input-group">
                        <label>Piso</label>
                        <input type="text" id="estiloPiso" value="Madera clara">
                    </div>
                    <div class="input-group">
                        <label>Paredes</label>
                        <input type="text" id="estiloParedes" value="Minimalistas modernas">
                    </div>
                </div>
                <div class="input-group">
                    <label>Decoración</label>
                    <input type="text" id="estiloDeco" value="Minimal y elegante">
                </div>
            </div>
        </div>

        <div class="section-title"><i class="fas fa-couch"></i> Productos a Integrar</div>
        <div class="products-container" id="productsGrid"></div>

        <button type="button" onclick="addProduct()" style="margin-bottom: 20px; background: #e2e8f0; border:none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-plus"></i> Añadir Producto
        </button>

        <div class="input-group">
            <label>Modelo de Chat GPT</label>
            <select id="quality">
                <option value="gpt-5.5">GPT-5.5 (Recomendado)</option>
                <option value="gpt-4.1">GPT-4.1</option>
                <option value="gpt-4o">GPT-4o</option>
            </select>
        </div>

        <button id="generateBtn" class="btn-generate" onclick="generate()">
            <span>GENERAR IMAGEN AMBIENTADA</span>
            <div class="loading-spinner" id="spinner"></div>
        </button>

        <div id="resultArea">
            <div class="section-title"><i class="fas fa-check-circle"></i> Resultado Final</div>
            <img id="resultImage" src="">
            <div style="margin-top: 15px;">
                <a id="downloadLink" href="#" download="resultado-ia.png" style="background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    <i class="fas fa-download"></i> Descargar
                </a>
            </div>
            <details>
                <summary>Detalles Técnicos del Prompt</summary>
                <pre id="promptDebug">El prompt generado aparecerá aquí después de la primera generación...</pre>
            </details>
        </div>
    </div>

    <script>
        let products = [
            { id: 1, nombre: 'Cama Matrimonial', posicion: 'centro', url: '' },
            { id: 2, nombre: 'Ropero 3 Puertas', posicion: 'izquierda', url: '' },
            { id: 3, nombre: 'Mesa de Noche', posicion: 'laterales', url: '' }
        ];

        function renderProducts() {
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = '';

            products.forEach((p, idx) => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.id = 'p-card-' + idx;

                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.style.cssText = 'position:absolute; top:5px; right:5px; border:none; background:none; color:#ef4444; cursor:pointer;';
                removeBtn.onclick = () => removeProduct(idx);
                card.appendChild(removeBtn);

                const previewDiv = document.createElement('div');
                previewDiv.className = 'preview-img';
                previewDiv.id = 'prev-' + idx;

                if (p.url) {
                    const img = document.createElement('img');
                    img.src = p.url;
                    previewDiv.appendChild(img);
                } else {
                    const span = document.createElement('span');
                    span.className = 'placeholder-text';
                    span.textContent = 'Producto ' + (idx + 1);
                    previewDiv.appendChild(span);
                }
                card.appendChild(previewDiv);

                const nameGroup = createInputGroup('Nombre', (val) => updateProduct(idx, 'nombre', val), p.nombre);
                card.appendChild(nameGroup);

                const imageGroup = document.createElement('div');
                imageGroup.className = 'input-group';
                const imgLabel = document.createElement('label');
                imgLabel.textContent = 'Imagen (URL o Archivo)';
                imageGroup.appendChild(imgLabel);

                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.className = 'p-file';
                fileInput.style.cssText = 'font-size: 0.7rem; margin-bottom:5px';
                fileInput.onchange = (e) => handleFile(idx, e.target);
                imageGroup.appendChild(fileInput);

                const urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.className = 'p-url';
                urlInput.placeholder = 'URL de imagen';
                urlInput.value = p.url.startsWith('data:') ? '' : p.url;
                urlInput.oninput = (e) => updateProduct(idx, 'url', e.target.value);
                imageGroup.appendChild(urlInput);
                card.appendChild(imageGroup);

                const posGroup = document.createElement('div');
                posGroup.className = 'input-group';
                const posLabel = document.createElement('label');
                posLabel.textContent = 'Posición';
                posGroup.appendChild(posLabel);

                const select = document.createElement('select');
                ['centro', 'izquierda', 'derecha', 'laterales', 'fondo'].forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
                    if (p.posicion === opt) option.selected = true;
                    select.appendChild(option);
                });
                select.onchange = (e) => updateProduct(idx, 'posicion', e.target.value);
                posGroup.appendChild(select);
                card.appendChild(posGroup);

                grid.appendChild(card);
            });
        }

        function createInputGroup(labelText, onChange, initialValue) {
            const group = document.createElement('div');
            group.className = 'input-group';
            const label = document.createElement('label');
            label.textContent = labelText;
            group.appendChild(label);
            const input = document.createElement('input');
            input.type = 'text';
            input.value = initialValue;
            input.onchange = (e) => onChange(e.target.value);
            group.appendChild(input);
            return group;
        }

        function addProduct() {
            products.push({ id: Date.now(), nombre: 'Nuevo Producto', posicion: 'derecha', url: '' });
            renderProducts();
        }

        function removeProduct(idx) {
            products.splice(idx, 1);
            renderProducts();
        }

        function updateProduct(idx, field, value) {
            products[idx][field] = value;
            if (field === 'url') {
                const prev = document.getElementById('prev-' + idx);
                prev.innerHTML = '';
                if (value) {
                    const img = document.createElement('img');
                    img.src = value;
                    prev.appendChild(img);
                } else {
                    const span = document.createElement('span');
                    span.className = 'placeholder-text';
                    span.textContent = 'Producto ' + (idx + 1);
                    prev.appendChild(span);
                }
            }
        }

        async function handleFile(idx, input) {
            const file = input.files[0];
            if (file) {
                const base64 = await toBase64(file);
                const dataUrl = 'data:image/jpeg;base64,' + base64;
                products[idx].url = dataUrl;
                const prev = document.getElementById('prev-' + idx);
                prev.innerHTML = '';
                const img = document.createElement('img');
                img.src = dataUrl;
                prev.appendChild(img);
            }
        }

        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });

        // Manejo de Fondo
        document.getElementById('fondoFile').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const base64 = await toBase64(file);
                window.fondoBase64 = base64;
                updateFondoPreview('data:image/jpeg;base64,' + base64);
            }
        });

        function handleFondoUrl(url) {
            if (url) {
                window.fondoBase64 = null;
                updateFondoPreview(url);
            } else {
                updateFondoPreview(null);
            }
        }

        function updateFondoPreview(src) {
            const preview = document.getElementById('fondoPreview');
            preview.innerHTML = '';
            if (src) {
                const img = document.createElement('img');
                img.src = src;
                preview.appendChild(img);
            } else {
                const span = document.createElement('span');
                span.className = 'placeholder-text';
                span.textContent = 'Fondo no seleccionado';
                preview.appendChild(span);
            }
        }

        async function generate() {
            const btn = document.getElementById('generateBtn');
            const spinner = document.getElementById('spinner');
            const resultArea = document.getElementById('resultArea');

            try {
                btn.disabled = true;
                spinner.style.display = 'inline-block';
                resultArea.style.display = 'none';

                const config = {
                    fondoMaestro: window.fondoBase64 || document.getElementById('fondoUrl').value,
                    productos: products.map(p => ({
                        nombre: p.nombre,
                        url: p.url,
                        posicion: p.posicion
                    })).filter(p => p.url),
                    estilo: {
                        tipo: document.getElementById('estiloTipo').value,
                        iluminacion: document.getElementById('estiloLuz').value,
                        piso: document.getElementById('estiloPiso').value,
                        paredes: document.getElementById('estiloParedes').value,
                        decoracion: document.getElementById('estiloDeco').value,
                        calidad: 'ultra realista'
                    }
                };

                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config, quality: document.getElementById('quality').value })
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error);

                document.getElementById('resultImage').src = data.imageUrl;
                document.getElementById('downloadLink').href = data.imageUrl;
                document.getElementById('promptDebug').textContent = data.promptUsed;
                resultArea.style.display = 'block';
                resultArea.scrollIntoView({ behavior: 'smooth' });

            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                btn.disabled = false;
                spinner.style.display = 'none';
            }
        }

        // Persistencia de Fondo
        let isFondoLocked = localStorage.getItem('fondoLocked') === 'true';
        if (isFondoLocked) {
            window.fondoBase64 = localStorage.getItem('fondoBase64');
            const url = localStorage.getItem('fondoUrl');
            if (url) document.getElementById('fondoUrl').value = url;
            if (window.fondoBase64) {
                updateFondoPreview('data:image/jpeg;base64,' + window.fondoBase64);
            } else if (url) {
                updateFondoPreview(url);
            }
            updateLockButton();
        }

        function toggleLockFondo() {
            isFondoLocked = !isFondoLocked;
            if (isFondoLocked) {
                localStorage.setItem('fondoLocked', 'true');
                localStorage.setItem('fondoBase64', window.fondoBase64 || '');
                localStorage.setItem('fondoUrl', document.getElementById('fondoUrl').value || '');
            } else {
                localStorage.setItem('fondoLocked', 'false');
            }
            updateLockButton();
        }

        function updateLockButton() {
            const btn = document.getElementById('lockFondoBtn');
            btn.innerHTML = isFondoLocked ? '<i class="fas fa-lock"></i> Fondo Bloqueado' : '<i class="fas fa-unlock"></i> Bloquear Fondo';
            btn.style.color = isFondoLocked ? '#16a34a' : '#475569';
        }

        renderProducts();
    </script>
</body>
</html>
  `;
}
