
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Servir el Frontend
    if (request.method === "GET") {
      return new Response(getHTML(), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // Endpoint para remover fondo (Hugging Face)
    if (request.method === "POST" && url.pathname === "/remove-bg") {
      try {
        const formData = await request.formData();
        const imageFile = formData.get("image");
        if (!imageFile) throw new Error("No image provided");

        const response = await fetch(
          "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
          {
            headers: { Authorization: `Bearer ${env.HF_API_KEY}` },
            method: "POST",
            body: await imageFile.arrayBuffer(),
          }
        );

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`HF Error: ${err}`);
        }

        const blob = await response.blob();
        return new Response(blob, {
          headers: { "Content-Type": "image/png" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Endpoint para analizar escena y productos (GPT-4o mini)
    if (request.method === "POST" && url.pathname === "/analyze") {
      try {
        const { config } = await request.json();

        const messages = [
          {
            role: "system",
            content: `Eres un Director de Arte experto en fotografía de catálogos de muebles.
Tu tarea es analizar los productos enviados y las preferencias de estilo del usuario para diseñar una escena de campaña.
Debes devolver un JSON estrictamente estructurado con:
1. bg_prompt: Un prompt detallado en inglés para generar el fondo (background) de la escena usando DALL-E 3. El fondo debe estar vacío en los lugares donde se colocarán los productos.
2. layout: Una lista de objetos para cada producto con:
   - id: el nombre del producto.
   - x: posición horizontal (0 a 1024).
   - y: posición vertical (0 a 1024, base del mueble).
   - scale: escala relativa (ej. 0.8).
   - zIndex: orden de capa.
   - flip: boolean (opcional).

REGLAS:
- La imagen es cuadrada (1024x1024).
- Los muebles deben estar apoyados en el suelo de la escena.
- Mantén proporciones realistas entre cama, roperos y mesas de noche.
- El prompt del fondo NO debe incluir los muebles, solo el ambiente (paredes, piso, ventanas, iluminación, decoración de fondo).`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Estilo deseado: ${JSON.stringify(config.estilo)}. Productos a integrar: ${config.productos.map(p => p.nombre).join(", ")}. Por favor, analiza la mejor distribución y genera el prompt del fondo.` },
              ...config.productos.map(p => ({
                type: "image_url",
                image_url: { url: p.url }
              }))
            ]
          }
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            response_format: { type: "json_object" }
          })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data.choices[0].message.content), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Endpoint para generar fondo (DALL-E 3)
    if (request.method === "POST" && url.pathname === "/generate-bg") {
      try {
        const { prompt } = await request.json();
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: `Professional architectural interior photography, empty room, NO FURNITURE, ${prompt}, ultra realistic, 8k, highly detailed, campaign style.`,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return new Response(JSON.stringify({ b64: data.data[0].b64_json }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

function getHTML() {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creador de Imágenes IA - MODO CAMPAÑA</title>
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
            max-width: 1100px;
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
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .btn-generate:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
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

        canvas {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            background: #eee;
        }

        .loading-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.8);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid var(--border);
            border-top: 5px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
        }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .status-text {
            font-weight: 600;
            color: var(--primary);
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

        .step-info {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="loading-overlay" id="loader">
        <div class="spinner"></div>
        <div class="status-text" id="loaderText">Procesando...</div>
        <div class="step-info" id="loaderStep">Iniciando flujo de campaña</div>
    </div>

    <div class="main-container">
        <header>
            <h1><i class="fas fa-camera-retro"></i> Creador de Imágenes IA <span class="campaign-badge">FIDELIDAD 100%</span></h1>
            <p>Generación de Ambientes con Productos Reales Integrados</p>
        </header>

        <div class="grid-config">
            <div class="panel">
                <div class="section-title"><i class="fas fa-paint-roller"></i> Estilo del Ambiente</div>
                <div class="input-group">
                    <label>Tipo de Habitación</label>
                    <input type="text" id="estiloHabitacion" value="Dormitorio moderno de lujo">
                </div>
                <div class="grid-config" style="grid-template-columns: 1fr 1fr; margin-bottom: 0; gap: 10px;">
                    <div class="input-group">
                        <label>Iluminación</label>
                        <select id="estiloLuz">
                            <option value="Natural de tarde">Natural de tarde</option>
                            <option value="Estudio profesional">Estudio profesional</option>
                            <option value="Cálida acogedora">Cálida acogedora</option>
                            <option value="Minimalista fría">Minimalista fría</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Piso</label>
                        <input type="text" id="estiloPiso" value="Parquet de roble claro">
                    </div>
                </div>
                <div class="input-group">
                    <label>Decoración Adicional</label>
                    <input type="text" id="estiloDeco" value="Plantas de interior, cuadros minimalistas, alfombra de lana">
                </div>
            </div>

            <div class="panel">
                <div class="section-title"><i class="fas fa-cog"></i> Configuración Técnica</div>
                <div class="input-group">
                    <label>Calidad de Sombra</label>
                    <select id="sombraCalidad">
                        <option value="8">Suave (Recomendado)</option>
                        <option value="4">Muy Suave</option>
                        <option value="15">Marcada</option>
                        <option value="0">Sin Sombra</option>
                    </select>
                </div>
                <p style="font-size: 0.75rem; color: #64748b;">
                    <i class="fas fa-info-circle"></i> Este modo utiliza GPT-4o mini para diseñar la escena y DALL-E 3 para el fondo. El producto se mantiene idéntico.
                </p>
            </div>
        </div>

        <div class="section-title"><i class="fas fa-couch"></i> Productos (Máx. 3 sugerido)</div>
        <div class="products-container" id="productsGrid"></div>

        <button type="button" onclick="addProduct()" style="margin-bottom: 20px; background: #f1f5f9; border:1px solid var(--border); padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-plus"></i> Añadir Producto
        </button>

        <button id="generateBtn" class="btn-generate" onclick="startCampaignFlow()">
            <span>GENERAR COMPOSICIÓN DE CAMPAÑA</span>
        </button>

        <div id="resultArea">
            <div class="section-title"><i class="fas fa-check-circle"></i> Resultado Final (1024x1024)</div>
            <canvas id="mainCanvas" width="1024" height="1024"></canvas>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                <button onclick="downloadCanvas()" style="background: #16a34a; color: white; padding: 12px 25px; border-radius: 8px; border:none; font-weight: 600; cursor:pointer;">
                    <i class="fas fa-download"></i> Descargar Imagen
                </button>
                <button onclick="location.reload()" style="background: #64748b; color: white; padding: 12px 25px; border-radius: 8px; border:none; font-weight: 600; cursor:pointer;">
                    <i class="fas fa-redo"></i> Nueva Imagen
                </button>
            </div>
        </div>
    </div>

    <script>
        let products = [
            { id: 1, nombre: 'Cama Principal', file: null, preview: '', noBg: null },
            { id: 2, nombre: 'Mueble Lateral', file: null, preview: '', noBg: null },
            { id: 3, nombre: 'Accesorio', file: null, preview: '', noBg: null }
        ];

        function renderProducts() {
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = '';
            products.forEach((p, idx) => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = \`
                    <button onclick="removeProduct(\${idx})" style="position:absolute; top:5px; right:5px; border:none; background:none; color:#ef4444; cursor:pointer;"><i class="fas fa-times"></i></button>
                    <div class="preview-img" id="prev-\${idx}">
                        \${p.preview ? \`<img src="\${p.preview}">\` : '<span style="color:#94a3b8; font-size:0.8rem;">Sin imagen</span>'}
                    </div>
                    <div class="input-group">
                        <label>Nombre</label>
                        <input type="text" value="\${p.nombre}" onchange="products[\${idx}].nombre = this.value">
                    </div>
                    <div class="input-group">
                        <label>Foto del Producto</label>
                        <input type="file" accept="image/*" onchange="handleProductFile(\${idx}, this)">
                    </div>
                \`;
                grid.appendChild(card);
            });
        }

        function addProduct() {
            products.push({ id: Date.now(), nombre: 'Nuevo Producto', file: null, preview: '', noBg: null });
            renderProducts();
        }

        function removeProduct(idx) {
            products.splice(idx, 1);
            renderProducts();
        }

        async function handleProductFile(idx, input) {
            const file = input.files[0];
            if (file) {
                products[idx].file = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    products[idx].preview = e.target.result;
                    renderProducts();
                };
                reader.readAsDataURL(file);
            }
        }

        function showLoader(text, step) {
            document.getElementById('loader').style.display = 'flex';
            document.getElementById('loaderText').textContent = text;
            document.getElementById('loaderStep').textContent = step;
        }

        function hideLoader() {
            document.getElementById('loader').style.display = 'none';
        }

        async function startCampaignFlow() {
            const validProducts = products.filter(p => p.file);
            if (validProducts.length === 0) return alert("Carga al menos un producto.");

            try {
                showLoader("Procesando Imágenes", "Paso 1/4: Removiendo fondos de productos...");

                // 1. Quitar fondos
                for (let p of validProducts) {
                    const formData = new FormData();
                    formData.append('image', p.file);
                    const res = await fetch('/remove-bg', { method: 'POST', body: formData });
                    if (!res.ok) throw new Error("Error quitando fondo a " + p.nombre);
                    const blob = await res.blob();
                    p.noBg = await blobToImage(blob);
                }

                // 2. Analizar Escena con GPT-4o mini
                showLoader("Diseñando Escena", "Paso 2/4: GPT-4o mini analizando distribución...");
                const analyzeConfig = {
                    estilo: {
                        habitacion: document.getElementById('estiloHabitacion').value,
                        iluminacion: document.getElementById('estiloLuz').value,
                        piso: document.getElementById('estiloPiso').value,
                        deco: document.getElementById('estiloDeco').value
                    },
                    productos: validProducts.map(p => ({ nombre: p.nombre, url: p.preview }))
                };

                const analyzeRes = await fetch('/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config: analyzeConfig })
                });
                const sceneData = JSON.parse(await analyzeRes.json());

                // 3. Generar Fondo con DALL-E 3
                showLoader("Generando Ambiente", "Paso 3/4: Creando fondo personalizado...");
                const bgRes = await fetch('/generate-bg', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: sceneData.bg_prompt })
                });
                const bgData = await bgRes.json();
                if (bgData.error) throw new Error(bgData.error);
                const bgImage = await b64ToImage(bgData.b64);

                // 4. Ensamblado Final en Canvas
                showLoader("Ensamblado Final", "Paso 4/4: Integrando productos en el ambiente...");
                await assembleCanvas(bgImage, validProducts, sceneData.layout);

                hideLoader();
                document.getElementById('resultArea').style.display = 'block';
                document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });

            } catch (err) {
                console.error(err);
                alert("Error en el proceso: " + err.message);
                hideLoader();
            }
        }

        function blobToImage(blob) {
            return new Promise((resolve) => {
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = url;
            });
        }

        function b64ToImage(b64) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = 'data:image/png;base64,' + b64;
            });
        }

        async function assembleCanvas(bg, productsWithNoBg, layout) {
            const canvas = document.getElementById('mainCanvas');
            const ctx = canvas.getContext('2d');

            // Dibujar Fondo
            ctx.drawImage(bg, 0, 0, 1024, 1024);

            // Ordenar productos por zIndex
            const sortedLayout = layout.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            const shadowBlur = parseInt(document.getElementById('sombraCalidad').value);

            for (let item of sortedLayout) {
                const p = productsWithNoBg.find(prod => prod.nombre === item.id);
                if (!p || !p.noBg) continue;

                const img = p.noBg;
                const aspect = img.width / img.height;
                const displayHeight = 400 * (item.scale || 1); // Escala base
                const displayWidth = displayHeight * aspect;

                ctx.save();

                // Aplicar Sombra si es necesario
                if (shadowBlur > 0) {
                    ctx.shadowColor = "rgba(0,0,0,0.4)";
                    ctx.shadowBlur = shadowBlur;
                    ctx.shadowOffsetY = shadowBlur / 2;
                }

                // Dibujar Imagen (Posición Y es la base del mueble)
                const posX = item.x - (displayWidth / 2);
                const posY = item.y - displayHeight;

                if (item.flip) {
                    ctx.translate(posX + displayWidth, posY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
                } else {
                    ctx.drawImage(img, posX, posY, displayWidth, displayHeight);
                }

                ctx.restore();
            }
        }

        function downloadCanvas() {
            const canvas = document.getElementById('mainCanvas');
            const link = document.createElement('a');
            link.download = 'campaña-muebles-ia.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

        renderProducts();
    </script>
</body>
</html>
  `;
}
