
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
        const { config, quality: selectedQuality } = body;

        console.log("Configuración recibida:", JSON.stringify(config, null, 2).substring(0, 500));

        if (!config.productos || config.productos.length === 0) {
          return new Response(JSON.stringify({ error: "Se requieren productos." }), { status: 400 });
        }

        // 1. Construir el Prompt Maestro (Basado en la estructura del usuario)
        const promptMaestro = construirPrompt(config);
        console.log("Prompt Maestro Construido:", promptMaestro);

        // 2. Analizar imágenes con GPT-4o-mini para generar el prompt técnico final de DALL-E
        // Enviamos el Fondo Maestro + Los Productos
        const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Eres un experto en fotografía de catálogo y diseño de interiores. Tu objetivo es convertir una "Configuración Maestra" y fotos de referencia en un PROMPT DETALLADO para DALL-E 3.

                REGLA SUPREMA: Debes describir los productos con tal precisión técnica que DALL-E no los modifique. Describe materiales (textura de madera, tipo de tela), herrajes, colores exactos y proporciones.

                INSTRUCCIONES:
                1. Analiza el Fondo Maestro proporcionado como primera imagen.
                2. Analiza cada producto proporcionado a continuación.
                3. Genera un prompt en INGLÉS que describa la escena final integrando todo según las posiciones indicadas.
                4. NO uses palabras vagas. Usa términos técnicos: "matte finish", "oak wood grain", "brushed gold handles", "1:1 scale fidelity".`
              },
              {
                role: "user",
                content: [
                  { type: "text", text: promptMaestro },
                  // Imagen de Fondo si existe
                  ...(config.fondoMaestro ? [{
                    type: "image_url",
                    image_url: { url: config.fondoMaestro.startsWith("http") ? config.fondoMaestro : `data:image/jpeg;base64,${config.fondoMaestro}` }
                  }] : []),
                  // Imágenes de Productos
                  ...config.productos.map(p => ({
                    type: "image_url",
                    image_url: { url: p.url.startsWith("http") ? p.url : `data:image/jpeg;base64,${p.url}` }
                  }))
                ]
              }
            ],
            max_tokens: 500
          })
        });

        const gptData = await gptResponse.json();
        if (gptData.error) throw new Error(`GPT Error: ${gptData.error.message}`);

        let finalPromptForDallE = gptData.choices[0].message.content.trim();
        // Limpiar markdown si existe
        finalPromptForDallE = finalPromptForDallE.replace(/^```[a-zA-Z]*\n/g, "").replace(/\n```$/g, "").trim();

        console.log("Prompt Final para DALL-E:", finalPromptForDallE);

        // 3. Generación de Imagen (DALL-E 3)
        let modelUsed = selectedQuality === "low" ? "gpt-image-1-mini" : "gpt-image";
        let size = "1024x1024";

        console.log(`Intentando generar con modelo: ${modelUsed}...`);

        let dallEResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelUsed,
            prompt: finalPromptForDallE,
            n: 1,
            size: size
          })
        });

        let dallEData = await dallEResponse.json();

        // Fallback inteligente en cadena
        if (dallEData.error) {
          const errMsg = dallEData.error.message || "";
          const isModelError = errMsg.includes("not found") || errMsg.includes("does not exist") || dallEData.error.code === "model_not_found";

          if (isModelError) {
            const fallbacks = ["gpt-image", "gpt-image-1-mini", "dall-e-3", "dall-e-2"];
            for (const fallbackModel of fallbacks) {
              if (fallbackModel === modelUsed) continue;

              console.log(`Reintentando con fallback: ${fallbackModel}...`);
              dallEResponse = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: fallbackModel,
                  prompt: finalPromptForDallE,
                  n: 1,
                  size: fallbackModel === "dall-e-2" ? "512x512" : "1024x1024"
                })
              });
              dallEData = await dallEResponse.json();
              if (!dallEData.error) {
                modelUsed = fallbackModel;
                break;
              }
            }
          }
        }

        if (dallEData.error) throw new Error(`DALL-E Final Error: ${dallEData.error.message}`);

        const finalImage = dallEData.data[0].url || `data:image/png;base64,${dallEData.data[0].b64_json}`;

        return new Response(JSON.stringify({
          imageUrl: finalImage,
          promptUsed: finalPromptForDallE,
          modelUsed: modelUsed
        }), {
          headers: { "Content-Type": "application/json" }
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
        }

        .preview-img img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
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
                    <input type="text" id="fondoUrl" placeholder="O pega URL de fondo">
                    <div id="fondoPreview" class="preview-img" style="height: 150px; margin-top:10px">
                        <span>Fondo no seleccionado</span>
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
        <div class="products-container" id="productsGrid">
            <!-- Los productos se generan aquí dinámicamente -->
        </div>

        <button type="button" onclick="addProduct()" style="margin-bottom: 20px; background: #e2e8f0; border:none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-plus"></i> Añadir Producto
        </button>

        <div class="input-group">
            <label>Calidad de Generación</label>
            <select id="quality">
                <option value="high">Alta Fidelidad (GPT-Image)</option>
                <option value="low">Rápida / Ahorro (GPT-Image-Mini)</option>
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
            { id: 1, nombre: 'Cama Matrimonial', posicion: 'centro' },
            { id: 2, nombre: 'Ropero 3 Puertas', posicion: 'izquierda' },
            { id: 3, nombre: 'Mesa de Noche', posicion: 'laterales' }
        ];

        function renderProducts() {
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = products.map((p, idx) => `
                <div class="product-card" id="p-card-${idx}">
                    <button onclick="removeProduct(${idx})" style="position:absolute; top:5px; right:5px; border:none; background:none; color:#ef4444; cursor:pointer;"><i class="fas fa-times"></i></button>
                    <div class="preview-img" id="prev-${idx}"><span>Producto ${idx+1}</span></div>
                    <div class="input-group">
                        <label>Nombre</label>
                        <input type="text" class="p-nombre" value="${p.nombre}" onchange="updateProduct(${idx}, 'nombre', this.value)">
                    </div>
                    <div class="input-group">
                        <label>Imagen (URL o Archivo)</label>
                        <input type="file" class="p-file" onchange="handleFile(${idx}, this)" style="font-size: 0.7rem; margin-bottom:5px">
                        <input type="text" class="p-url" placeholder="URL de imagen" oninput="updateProduct(${idx}, 'url', this.value)">
                    </div>
                    <div class="input-group">
                        <label>Posición</label>
                        <select class="p-posicion" onchange="updateProduct(${idx}, 'posicion', this.value)">
                            <option value="centro" ${p.posicion==='centro'?'selected':''}>Centro</option>
                            <option value="izquierda" ${p.posicion==='izquierda'?'selected':''}>Izquierda</option>
                            <option value="derecha" ${p.posicion==='derecha'?'selected':''}>Derecha</option>
                            <option value="laterales" ${p.posicion==='laterales'?'selected':''}>Laterales</option>
                            <option value="fondo" ${p.posicion==='fondo'?'selected':''}>Al fondo</option>
                        </select>
                    </div>
                </div>
            `).join('');
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
            if (field === 'url' && value) {
                const prev = document.getElementById('prev-'+idx);
                prev.innerHTML = \`<img src="\${value}">\`;
            }
        }

        async function handleFile(idx, input) {
            const file = input.files[0];
            if (file) {
                const base64 = await toBase64(file);
                products[idx].fileData = base64;
                const prev = document.getElementById('prev-'+idx);
                prev.innerHTML = \`<img src="data:image/jpeg;base64,\${base64}">\`;
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
                document.getElementById('fondoPreview').innerHTML = \`<img src="data:image/jpeg;base64,\${base64}">\`;
            }
        });

        document.getElementById('fondoUrl').addEventListener('input', (e) => {
            const url = e.target.value;
            if (url) {
                document.getElementById('fondoPreview').innerHTML = \`<img src="\${url}">\`;
            }
        });

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
                        url: p.fileData || p.url,
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
                document.getElementById('promptDebug').innerText = data.promptUsed;
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
                document.getElementById('fondoPreview').innerHTML = `<img src="data:image/jpeg;base64,${window.fondoBase64}">`;
            } else if (url) {
                document.getElementById('fondoPreview').innerHTML = `<img src="${url}">`;
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
