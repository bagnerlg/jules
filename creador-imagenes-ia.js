
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
        const { images, environment, quality: selectedQuality } = body;

        if (!images || images.length !== 3) {
          return new Response(JSON.stringify({ error: "Se requieren exactamente 3 imágenes." }), { status: 400 });
        }

        // 1. Analizar imágenes con GPT-4o-mini para generar el prompt
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
                content: `Eres un experto en muebles. Analiza 3 fotos y crea un prompt para DALL-E.
                REGLAS:
                1. Describe cada mueble exactamente: color, materiales, patas, módulos, sin añadir vidrios o piezas extra.
                2. Mantén escala lógica (ropero > mesita).
                3. Ambiente coherente sin alterar el mueble.
                4. Estilo fotorealista natural, catálogo profesional.
                5. Prompt en Inglés.
                6. Devuelve SOLO el prompt.`
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Ambiente solicitado: ${environment}. Aquí están los 3 productos:` },
                  ...images.map(img => ({
                    type: "image_url",
                    image_url: { url: img.startsWith("http") ? img : `data:image/jpeg;base64,${img}` }
                  }))
                ]
              }
            ],
            max_tokens: 350
          })
        });

        const gptData = await gptResponse.json();
        if (gptData.error) throw new Error(`GPT Error: ${gptData.error.message}`);

        const generatedPrompt = gptData.choices[0].message.content.trim();

        // 2. Generar imagen con selección de modelo y calidad
        let model = "dall-e-3";
        let size = "1024x1024";
        let extraParams = { style: "natural" };

        if (selectedQuality === "low") {
          model = "dall-e-2";
          size = "512x512";
          extraParams = {};
        }

        let dallEResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: model,
            prompt: generatedPrompt,
            n: 1,
            size: size,
            ...extraParams
          })
        });

        let dallEData = await dallEResponse.json();

        // Fallback robusto si el modelo seleccionado no existe en la cuenta
        if (dallEData.error && (dallEData.error.message.includes("does not exist") || dallEData.error.code === "model_not_found")) {
          const fallbackModel = model === "dall-e-3" ? "dall-e-2" : "dall-e-3";
          console.log(`Modelo ${model} no disponible, intentando fallback a ${fallbackModel}...`);

          dallEResponse = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: fallbackModel,
              prompt: generatedPrompt,
              n: 1,
              size: fallbackModel === "dall-e-2" ? "512x512" : "1024x1024"
            })
          });
          dallEData = await dallEResponse.json();
        }

        if (dallEData.error) throw new Error(`DALL-E Error: ${dallEData.error.message}`);

        return new Response(JSON.stringify({
          imageUrl: dallEData.data[0].url,
          promptUsed: generatedPrompt,
          modelUsed: model
        }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
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
    <title>Creador de Imágenes IA - Muebles</title>
    <style>
        :root {
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --success: #16a34a;
            --success-hover: #15803d;
            --gray-bg: #f3f4f6;
            --white: #ffffff;
            --text-main: #1f2937;
            --text-muted: #6b7280;
            --border-color: #e5e7eb;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--gray-bg);
            color: var(--text-main);
            line-height: 1.5;
            padding: 2rem 1rem;
        }

        .container {
            max-width: 64rem;
            margin: 0 auto;
            background: var(--white);
            border-radius: 0.75rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
        }

        h1 {
            font-size: 1.875rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 2rem;
            color: var(--primary);
        }

        .products-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        @media (min-width: 768px) {
            .products-grid { grid-template-columns: repeat(3, 1fr); }
        }

        .product-card {
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            background-color: #f9fafb;
        }

        .label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .input-file {
            width: 100%;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
        }

        .input-text {
            width: 100%;
            padding: 0.5rem;
            font-size: 0.875rem;
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            outline: none;
        }

        .preview-box {
            margin-top: 0.5rem;
            height: 8rem;
            background-color: #e5e7eb;
            border-radius: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .preview-box img {
            height: 100%;
            width: 100%;
            object-fit: contain;
        }

        .preview-placeholder {
            color: #9ca3af;
            font-size: 0.75rem;
        }

        .environment-section { margin-bottom: 2rem; }

        textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            outline: none;
            resize: vertical;
            min-height: 5rem;
        }

        textarea:focus { border-color: #a5b4fc; box-shadow: 0 0 0 2px #a5b4fc; }

        .hint {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }

        .btn-generate {
            width: 100%;
            background-color: var(--primary);
            color: white;
            font-weight: 700;
            padding: 1rem;
            border-radius: 0.5rem;
            border: none;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            font-size: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .btn-generate:hover { background-color: var(--primary-hover); }
        .btn-generate:disabled { opacity: 0.7; cursor: not-allowed; }

        .loader {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            width: 1.5rem;
            height: 1.5rem;
            animation: spin 1s linear infinite;
            display: inline-block;
        }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .result-container {
            margin-top: 3rem;
            border-top: 1px solid var(--border-color);
            padding-top: 2rem;
            text-align: center;
            display: none;
        }

        .result-container.active { display: block; }

        h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }

        #resultImage {
            max-width: 100%;
            border-radius: 0.5rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            margin-bottom: 1.5rem;
        }

        .actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

        .btn-download {
            background-color: var(--success);
            color: white;
            padding: 0.5rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 600;
            transition: background-color 0.2s;
        }
        .btn-download:hover { background-color: var(--success-hover); }

        .btn-new {
            background-color: var(--text-muted);
            color: white;
            padding: 0.5rem 1.5rem;
            border-radius: 0.5rem;
            border: none;
            cursor: pointer;
            font-weight: 600;
        }

        details { margin-top: 1.5rem; text-align: left; }
        summary { color: var(--text-muted); cursor: pointer; font-size: 0.875rem; }
        .prompt-text {
            margin-top: 0.5rem;
            padding: 1rem;
            background-color: #f3f4f6;
            border-radius: 0.5rem;
            font-size: 0.75rem;
            font-style: italic;
            color: #374151;
        }

        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Creador de Imágenes IA ✨</h1>

        <div class="products-grid">
            <!-- Producto 1 -->
            <div class="product-card">
                <label class="label">Producto 1</label>
                <input type="file" id="file1" accept="image/*" class="input-file">
                <input type="text" id="url1" placeholder="O pega URL de imagen" class="input-text">
                <div id="preview1" class="preview-box">
                    <span class="preview-placeholder">Sin imagen</span>
                </div>
            </div>
            <!-- Producto 2 -->
            <div class="product-card">
                <label class="label">Producto 2</label>
                <input type="file" id="file2" accept="image/*" class="input-file">
                <input type="text" id="url2" placeholder="O pega URL de imagen" class="input-text">
                <div id="preview2" class="preview-box">
                    <span class="preview-placeholder">Sin imagen</span>
                </div>
            </div>
            <!-- Producto 3 -->
            <div class="product-card">
                <label class="label">Producto 3</label>
                <input type="file" id="file3" accept="image/*" class="input-file">
                <input type="text" id="url3" placeholder="O pega URL de imagen" class="input-text">
                <div id="preview3" class="preview-box">
                    <span class="preview-placeholder">Sin imagen</span>
                </div>
            </div>
        </div>

        <div class="environment-section">
            <label class="label">Descripción del Ambiente</label>
            <textarea id="environment" placeholder="Ej: Fondo verde con ambientado de sala de estar que genere paz..."></textarea>
            <p class="hint">La IA respetará la forma y elementos originales de tus productos.</p>
        </div>

        <div class="environment-section">
            <label class="label">Calidad y Gasto</label>
            <select id="quality" class="input-text" style="height: 3rem; font-size: 1rem;">
                <option value="high">Calidad Pro (DALL-E 3 - 1024px - Realista)</option>
                <option value="low">Ahorro de Tokens (DALL-E 2 - 512px)</option>
            </select>
        </div>

        <button id="generateBtn" class="btn-generate">
            <span>Generar Imagen de Campaña</span>
            <div id="btnLoader" class="loader hidden"></div>
        </button>

        <div id="resultContainer" class="result-container">
            <h2>Resultado Final</h2>
            <img id="resultImage" src="" alt="Imagen Generada">
            <div class="actions">
                <a id="downloadBtn" href="#" download="campaña-ia.png" class="btn-download">Descargar Imagen</a>
                <button onclick="window.location.reload()" class="btn-new">Nueva Imagen</button>
            </div>
            <details>
                <summary>Ver Prompt generado por IA</summary>
                <p id="promptText" class="prompt-text"></p>
            </details>
        </div>
    </div>

    <script>
        const inputs = [
            { file: 'file1', url: 'url1', preview: 'preview1' },
            { file: 'file2', url: 'url2', preview: 'preview2' },
            { file: 'file3', url: 'url3', preview: 'preview3' }
        ];

        inputs.forEach(input => {
            const fileEl = document.getElementById(input.file);
            const urlEl = document.getElementById(input.url);
            const previewEl = document.getElementById(input.preview);

            fileEl.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        previewEl.innerHTML = \`<img src="\${re.target.result}">\`;
                        urlEl.value = '';
                    };
                    reader.readAsDataURL(file);
                }
            });

            urlEl.addEventListener('input', (e) => {
                if (e.target.value) {
                    previewEl.innerHTML = \`<img src="\${e.target.value}" onerror="this.parentElement.innerHTML='<span style=\\'color:red;font-size:10px\\'>Error URL</span>'">\`;
                    fileEl.value = '';
                }
            });
        });

        async function getBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
            });
        }

        document.getElementById('generateBtn').addEventListener('click', async () => {
            const btn = document.getElementById('generateBtn');
            const loader = document.getElementById('btnLoader');
            const resultContainer = document.getElementById('resultContainer');
            const environment = document.getElementById('environment').value;

            if (!environment) {
                alert('Por favor describe el ambiente.');
                return;
            }

            try {
                btn.disabled = true;
                loader.classList.remove('hidden');
                resultContainer.classList.remove('active');

                const images = [];
                for (const input of inputs) {
                    const file = document.getElementById(input.file).files[0];
                    const url = document.getElementById(input.url).value;

                    if (file) {
                        const b64 = await getBase64(file);
                        images.push(b64);
                    } else if (url) {
                        images.push(url);
                    }
                }

                if (images.length !== 3) {
                    alert('Debes proporcionar las 3 imágenes.');
                    btn.disabled = false;
                    loader.classList.add('hidden');
                    return;
                }

                const quality = document.getElementById('quality').value;

                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ images, environment, quality })
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error);

                document.getElementById('resultImage').src = data.imageUrl;
                document.getElementById('downloadBtn').href = data.imageUrl;
                document.getElementById('promptText').innerText = data.promptUsed;
                resultContainer.classList.add('active');
                resultContainer.scrollIntoView({ behavior: 'smooth' });

            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                btn.disabled = false;
                loader.classList.add('hidden');
            }
        });
    </script>
</body>
</html>
  `;
}
