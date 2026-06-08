export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Servir el Frontend
    if (request.method === "GET") {
      return new Response(getHTML(), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // Endpoint para remover fondo (ClearBackdrop API)
    if (request.method === "POST" && url.pathname === "/remove-bg") {
      try {
        const formData = await request.formData();
        const imageFile = formData.get("image");
        const imageUrl = formData.get("image_url");

        let imageToProcess;
        if (imageFile) {
          imageToProcess = imageFile;
        } else if (imageUrl) {
          const imgRes = await fetch(imageUrl);
          if (!imgRes.ok) throw new Error("No se pudo obtener la imagen desde la URL.");
          imageToProcess = await imgRes.blob();
        } else {
          throw new Error("No se proporcionó ninguna imagen.");
        }

        const cbFormData = new FormData();
        cbFormData.append("image", imageToProcess);

        const response = await fetch(
          "https://clearbackdrop.com/api/v1/remove-background",
          {
            method: "POST",
            body: cbFormData,
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`ClearBackdrop Error (${response.status}): ${errText.substring(0, 100)}`);
        }

        const blob = await response.blob();
        return new Response(blob, {
          headers: {
            "Content-Type": "image/png",
            "Access-Control-Allow-Origin": "*"
          },
        });
      } catch (error) {
        console.error("Remove-BG Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Endpoint para analizar escena y productos (GPT-4o mini)
    if (request.method === "POST" && url.pathname === "/analyze") {
      try {
        const { config } = await request.json();

        const messages = [
          {
            role: "system",
            content: `Eres un Director de Arte experto en campañas publicitarias de muebles de lujo.
Tu tarea es diseñar una composición 1024x1024 realista.
Debes devolver un JSON con:
1. bg_prompt: Un prompt en inglés MUY DETALLADO para DALL-E describiendo un ambiente de lujo TOTALMENTE VACÍO. Debe decir: "Completely empty room, absolutely NO furniture, clear floors, architectural photography, 8k, professional lighting".
2. layout: Lista de objetos para posicionar los productos reales:
   - id: nombre del producto (exactamente como se envió).
   - x: centro horizontal (0-1024).
   - y: BASE del mueble tocando el suelo (600-950).
   - scale: escala relativa (0.5 a 1.3).
   - zIndex: orden de capas (1 atrás, 10 adelante).
   - shadow_opacity: opacidad de la sombra (0.2 a 0.6).
   - shadow_blur: difusión de la sombra (5 a 20).

REGLAS DE ORO:
- Los productos deben estar apoyados en el suelo (no flotando).
- La cama suele ir al centro (x:512).
- Roperos y cocinas suelen ir al fondo.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Estilo: ${JSON.stringify(config.estilo)}. Productos a integrar: ${config.productos.map(p => p.nombre).join(", ")}.` },
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
        if (data.error) throw new Error(`OpenAI Analyze Error: ${data.error.message}`);

        return new Response(JSON.stringify(data.choices[0].message.content), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error("Analyze Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Endpoint para generar fondo con Fallback inteligente de modelos
    if (request.method === "POST" && url.pathname === "/generate-bg") {
      try {
        const body = await request.json();
        const { prompt } = body;

        const models = ["gpt-image", "gpt-image-1-mini", "chatgpt-image-latest", "dall-e-3"];
        let lastError = null;

        for (const model of models) {
          try {
            console.log(`Intentando generar imagen con modelo: ${model}`);
            const response = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: model,
                prompt: `Professional high-end architectural interior photography, strictly EMPTY LUXURY ROOM, ZERO FURNITURE, clear floors, ${prompt}`,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
              })
            });

            const data = await response.json();

            if (data.error) {
              const code = data.error.code || "";
              const msg = data.error.message || "";
              console.warn(`Error con modelo ${model}: ${msg}`);

              // Si es un error fatal (cuota, etc), detenemos
              if (code === "insufficient_quota") throw new Error(msg);

              lastError = msg;
              continue; // Intentar siguiente modelo
            }

            if (data.data && data.data[0]) {
              console.log(`Imagen generada exitosamente con ${model}`);
              return new Response(JSON.stringify({ b64: data.data[0].b64_json, modelUsed: model }), {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                }
              });
            }
          } catch (e) {
            console.error(`Excepción probando modelo ${model}:`, e.message);
            lastError = e.message;
          }
        }

        throw new Error(`No se pudo generar la imagen con ningún modelo disponible. Último error: ${lastError}`);

      } catch (error) {
        console.error("Generate-BG Fatal Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
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
    <title>IA Campaign Creator - Fidelidad 100%</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --primary: #4f46e5; --primary-hover: #4338ca; --bg: #f3f4f6; --text: #111827; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 30px; }
        .badge { background: #fee2e2; color: #b91c1c; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; vertical-align: middle; }
        .grid-config { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .config-card { border: 1px solid #e5e7eb; padding: 20px; border-radius: 15px; background: #fafafa; }
        .label { display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; color: #4b5563; }
        input, select { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; margin-bottom: 15px; font-family: inherit; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .p-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 15px; background: white; transition: 0.2s; position: relative; }
        .p-card:hover { border-color: var(--primary); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .p-preview { width: 100%; height: 160px; background: #f9fafb; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 12px; border: 1px dashed #d1d5db; }
        .p-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .btn-main { background: var(--primary); color: white; border: none; padding: 18px; border-radius: 12px; width: 100%; font-weight: 700; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.3s; }
        .btn-main:hover { background: var(--primary-hover); }
        .btn-main:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-remove { position: absolute; top: 10px; right: 10px; background: #fee2e2; color: #b91c1c; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; z-index: 10; }
        #result-area { margin-top: 40px; display: none; text-align: center; }
        canvas { max-width: 100%; border-radius: 15px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; }
        .spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loading-overlay" id="loader">
        <div class="spinner"></div>
        <p id="loader-text" style="margin-top:20px; font-weight:800; color:var(--primary); font-size:1.2rem;"></p>
    </div>

    <div class="container">
        <div class="header">
            <h1>🎨 IA Campaign Creator <span class="badge">FIDELIDAD 100%</span></h1>
            <p>Tus productos reales integrados en ambientes profesionales sin cambiar su forma.</p>
        </div>

        <div class="grid-config">
            <div class="config-card">
                <label class="label">Ambiente Deseado</label>
                <input type="text" id="env-room-type" value="Dormitorio moderno de lujo">
                <label class="label">Iluminación</label>
                <select id="env-lighting">
                    <option value="Natural cálida de atardecer">Atardecer (Cálido)</option>
                    <option value="Estudio profesional neutra">Estudio (Limpio)</option>
                    <option value="Mañana luminosa">Mañana (Brillante)</option>
                </select>
            </div>
            <div class="config-card">
                <label class="label">Texturas y Materiales</label>
                <input type="text" id="env-textures" value="Piso de madera clara, paredes grises seda">
                <label class="label">Decoración Extra</label>
                <input type="text" id="env-decoration" value="Plantas, cuadros abstractos, alfombra suave">
            </div>
        </div>

        <div class="products-grid" id="products-grid"></div>
        <button onclick="addProduct()" style="margin-bottom:25px; padding:10px 20px; border-radius:10px; border:1px solid #ddd; cursor:pointer; font-weight:600; background: white;">
            <i class="fas fa-plus"></i> Agregar Producto
        </button>

        <button id="generate-btn" class="btn-main" onclick="runGenerationFlow()">
            <i class="fas fa-sparkles"></i> GENERAR IMAGEN DE CAMPAÑA
        </button>

        <div id="result-area">
            <h2 style="margin-bottom:20px;">Resultado Final de Campaña</h2>
            <canvas id="main-canvas" width="1024" height="1024"></canvas>
            <div style="margin-top:25px; display:flex; gap:15px; justify-content:center;">
                <button onclick="downloadImage()" style="background:#059669; color:white; padding:15px 30px; border-radius:12px; border:none; font-weight:700; cursor:pointer;">
                    <i class="fas fa-download"></i> DESCARGAR IMAGEN
                </button>
                <button onclick="location.reload()" style="background:#4b5563; color:white; padding:15px 30px; border-radius:12px; border:none; font-weight:700; cursor:pointer;">
                    <i class="fas fa-undo"></i> NUEVA ESCENA
                </button>
            </div>
        </div>
    </div>

    <script>
        let products = [
            { id: 1, name: 'Cama Principal', file: null, url: '', preview: '', noBgBlob: null },
            { id: 2, name: 'Mueble Lateral', file: null, url: '', preview: '', noBgBlob: null }
        ];

        function renderProducts() {
            const grid = document.getElementById('products-grid');
            if (!grid) return;
            grid.innerHTML = '';
            products.forEach((p, i) => {
                const card = document.createElement('div');
                card.className = 'p-card';
                card.innerHTML = \`
                    <button class="btn-remove" onclick="removeProduct(\${i})"><i class="fas fa-times"></i></button>
                    <div class="p-preview">\${p.preview ? \`<img src="\${p.preview}">\` : '<i class="fas fa-image" style="color:#ccc; font-size:2rem;"></i>'}</div>

                    <label class="label">Nombre del Producto</label>
                    <input type="text" value="\${p.name}" onchange="products[\${i}].name=this.value" placeholder="Ej: Cama King">

                    <label class="label">Imagen (Archivo o URL)</label>
                    <input type="file" accept="image/*" onchange="handleFileChange(\${i}, this)" style="font-size:0.75rem; margin-bottom:5px;">
                    <input type="text" value="\${p.url || ''}" onchange="handleUrlChange(\${i}, this.value)" placeholder="Pega URL de imagen">
                \`;
                grid.appendChild(card);
            });
        }

        async function handleFileChange(i, input) {
            const file = input.files[0];
            if (!file) return;
            products[i].file = file;
            products[i].url = '';
            products[i].preview = await fileToBase64(file);
            renderProducts();
        }

        function handleUrlChange(i, url) {
            products[i].url = url;
            products[i].file = null;
            products[i].preview = url || '';
            renderProducts();
        }

        function fileToBase64(file) {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }

        function addProduct() {
            products.push({ id: Date.now(), name: 'Nuevo Producto', file: null, url: '', preview: '' });
            renderProducts();
        }

        function removeProduct(i) {
            products.splice(i, 1);
            renderProducts();
        }

        async function runGenerationFlow() {
            const activeProducts = products.filter(p => p.file || p.url);
            if (!activeProducts.length) return alert("Por favor sube al menos una imagen o pega una URL.");

            const loader = document.getElementById('loader');
            const loaderText = document.getElementById('loader-text');
            loader.style.display = 'flex';

            try {
                // 1. Quitar fondos
                loaderText.textContent = "✨ Removiendo fondos de productos...";
                for (let p of activeProducts) {
                    const formData = new FormData();
                    if (p.file) {
                        formData.append('image', p.file);
                    } else {
                        formData.append('image_url', p.url);
                    }

                    const res = await fetch('/remove-bg', { method: 'POST', body: formData });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error("Error quitando fondo: " + (err.error || "Desconocido"));
                    }
                    p.noBgBlob = await blobToImage(await res.blob());
                }

                // 2. Analizar Escena
                loaderText.textContent = "🧠 GPT-4o mini diseñando composición...";
                const config = {
                    estilo: {
                        room: document.getElementById('env-room-type').value,
                        light: document.getElementById('env-lighting').value,
                        textures: document.getElementById('env-textures').value,
                        decoration: document.getElementById('env-decoration').value
                    },
                    productos: activeProducts.map(p => ({ nombre: p.name, url: p.preview }))
                };
                const analyzeRes = await fetch('/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config })
                });
                if (!analyzeRes.ok) {
                    const err = await analyzeRes.json();
                    throw new Error("Error analizando escena: " + (err.error || "Desconocido"));
                }
                const scene = JSON.parse(await analyzeRes.json());

                // 3. Generar Fondo
                loaderText.textContent = "🖼️ Generando ambiente de lujo...";
                const bgRes = await fetch('/generate-bg', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: scene.bg_prompt })
                });
                if (!bgRes.ok) {
                    const err = await bgRes.json();
                    throw new Error("Error generando fondo: " + (err.error || "Desconocido"));
                }
                const bgData = await bgRes.json();
                const bgImage = await b64ToImage(bgData.b64);

                // 4. Finalizar Composición
                loaderText.textContent = "🎨 Finalizando composición...";
                drawFinalScene(bgImage, activeProducts, scene.layout);

                loader.style.display = 'none';
                document.getElementById('result-area').style.display = 'block';
                document.getElementById('result-area').scrollIntoView({ behavior: 'smooth' });

            } catch (e) {
                console.error(e);
                alert("Error: " + e.message);
                loader.style.display = 'none';
            }
        }

        function b64ToImage(base64) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = "data:image/png;base64," + base64;
            });
        }

        function blobToImage(blob) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = URL.createObjectURL(blob);
            });
        }

        function drawFinalScene(bg, productsWithNoBg, layout) {
            const canvas = document.getElementById('main-canvas');
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bg, 0, 0, 1024, 1024);

            layout.sort((a,b) => (a.zIndex||0) - (b.zIndex||0)).forEach(item => {
                const product = productsWithNoBg.find(x => x.name === item.id);
                if (!product || !product.noBgBlob) return;

                const img = product.noBgBlob;
                const scale = item.scale || 1;
                const height = 480 * scale;
                const width = (img.width / img.height) * height;
                const xPos = item.x - (width/2);
                const yPos = item.y - height;

                // Sombra de contacto profesional
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(item.x, item.y, width/2.2, height/18, 0, 0, Math.PI*2);
                ctx.fillStyle = \`rgba(0,0,0,\${item.shadow_opacity || 0.4})\`;
                ctx.filter = \`blur(\${item.shadow_blur || 10}px)\`;
                ctx.fill();
                ctx.restore();

                // Integración de color sutil (luz ambiente)
                ctx.drawImage(img, xPos, yPos, width, height);
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                ctx.fillRect(xPos, yPos, width, height);
                ctx.restore();
            });
        }

        function downloadImage() {
            const canvas = document.getElementById('main-canvas');
            const link = document.createElement('a');
            link.download = 'campaña-muebles-ia.png';
            link.href = canvas.toDataURL();
            link.click();
        }

        renderProducts();
    </script>
</body>
</html>
  `;
}
