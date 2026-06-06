
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
        console.log("Petición recibida:", { environment, quality: selectedQuality, imagesCount: images?.length });

        if (!images || images.length !== 3) {
          console.error("Error: Se requieren 3 imágenes.");
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
                content: `Eres un experto en muebles y diseño de interiores. Tu tarea es analizar 3 fotos y crear un prompt para generación de imagen técnica y limpia.
                REGLAS DE ORO:
                1. AISLAMIENTO: Identifica el producto principal en cada foto. IGNORA personas, decoraciones sucias, fondos irrelevantes u otros muebles secundarios en la foto original.
                2. MANTÉN LA INTEGRIDAD: Describe el producto principal exactamente (colores, materiales, patas, tiradores). No añadas vidrios o módulos extras.
                3. ESCALA Y POSICIÓN: El mueble más grande (Cama/Ropero) al centro, los pequeños a los lados. Proporciones reales.
                4. AMBIENTE MAESTRO: Usa exactamente la descripción de ambiente proporcionada. El fondo (paredes, suelo, iluminación) debe ser consistente. Estilo Showroom IKEA/Catálogo Premium.
                5. IDIOMA: Prompt final en INGLÉS.
                6. SALIDA: Solo el texto del prompt.`
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
        if (gptData.error) {
          console.error("GPT API Error:", gptData.error);
          throw new Error(`GPT Error: ${gptData.error.message}`);
        }

        const generatedPrompt = gptData.choices[0].message.content.trim();
        console.log("Prompt generado por GPT:", generatedPrompt);

        // 2. Generar imagen con selección de modelo y calidad (basado en billing detectado)
        let modelUsed = selectedQuality === "low" ? "gpt-image-1-mini" : "gpt-image";
        // Los modelos gpt-image requieren mínimo 1024x1024 según el error reportado
        let size = "1024x1024";

        console.log(`Iniciando generación con modelo detectado: ${modelUsed} (${size})...`);

        let dallEResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelUsed,
            prompt: generatedPrompt,
            n: 1,
            size: size
          })
        });

        let dallEData = await dallEResponse.json();

        // Fallback inteligente: solo si el modelo no existe. Si es cuota o saldo, detenerse.
        if (dallEData.error) {
          const errMsg = dallEData.error.message || "";
          const isModelError = errMsg.includes("does not exist") || errMsg.includes("not found") || dallEData.error.code === "model_not_found";

          if (isModelError) {
            console.warn(`Modelo ${modelUsed} no disponible. Intentando fallbacks...`);

            const fallbacks = [
              { model: "chatgpt-image-latest", size: "1024x1024" },
              { model: "gpt-image", size: "1024x1024" },
              { model: "gpt-image-1-mini", size: "1024x1024" },
              { model: "dall-e-3", size: "1024x1024" },
              { model: "dall-e-2", size: "512x512" }
            ];

            for (const fallback of fallbacks) {
              if (fallback.model === modelUsed) continue;

              console.log(`Intentando: ${fallback.model}...`);
              dallEResponse = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: fallback.model,
                  prompt: generatedPrompt,
                  n: 1,
                  size: fallback.size
                })
              });
              dallEData = await dallEResponse.json();
              if (!dallEData.error) {
                modelUsed = fallback.model;
                console.log("Logrado con:", modelUsed);
                break;
              }
              // Si el error del fallback ya NO es sobre el modelo (ej. es cuota), salir del bucle
              if (!dallEData.error.message.includes("not exist")) break;
            }
          } else {
            console.error("Error crítico (no es de modelo):", dallEData.error);
          }
        }

        if (dallEData.error) {
          console.error("DALL-E Final Error:", dallEData.error);
          throw new Error(`DALL-E Error: ${dallEData.error.message}`);
        }

        return new Response(JSON.stringify({
          imageUrl: dallEData.data[0].url,
          promptUsed: generatedPrompt,
          modelUsed: modelUsed
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
            <label class="label">Descripción del Ambiente / Escenario Maestro</label>
            <textarea id="environment" placeholder="Ej: Dormitorio moderno minimalista, pared beige clara, piso madera natural, iluminación cálida..."></textarea>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                <input type="checkbox" id="lockEnvironment" style="width: 1rem; height: 1rem; cursor: pointer;">
                <label for="lockEnvironment" class="hint" style="cursor: pointer; font-weight: 600; color: #1e40af;">Bloquear este ambiente para toda la campaña (Consistencia)</label>
            </div>
            <p class="hint">Al bloquear, GPT usará exactamente la misma descripción de fondo para cada combo.</p>
        </div>

        <div class="environment-section">
            <label class="label">Modelo de Generación</label>
            <select id="quality" class="input-text" style="height: 3rem; font-size: 1rem;">
                <option value="high">Calidad Premium (GPT-Image)</option>
                <option value="low">Ahorro de Saldo (GPT-Image-Mini)</option>
            </select>
        </div>

        <!-- Consejos de Calidad -->
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 1rem; margin-bottom: 2rem; border-radius: 0.5rem;">
            <p style="font-weight: 700; color: #1e40af; font-size: 0.875rem; margin-bottom: 0.5rem;">💡 Consejos para mejores resultados:</p>
            <ul style="font-size: 0.75rem; color: #1e3a8a; padding-left: 1.25rem;">
                <li>Usa fotos con fondo blanco o productos recortados.</li>
                <li>Asegúrate de que los muebles tengan buena iluminación.</li>
                <li>Evita marcas de agua sobre los productos.</li>
            </ul>
        </div>

        <button id="generateBtn" class="btn-generate">
            <span>Generar Imagen de Campaña</span>
            <div id="btnLoader" class="loader hidden"></div>
        </button>

        <div id="resultContainer" class="result-container">
            <h2 id="resultTitle">Resultado Final</h2>
            <p id="modelBadge" style="font-size: 10px; color: #6b7280; margin-bottom: 10px;"></p>
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

        // Cargar estado guardado de ambiente
        const savedEnv = localStorage.getItem('master_env');
        if (savedEnv) {
            document.getElementById('environment').value = savedEnv;
            document.getElementById('lockEnvironment').checked = true;
        }

        inputs.forEach(input => {
            const fileEl = document.getElementById(input.file);
            const urlEl = document.getElementById(input.url);
            const previewEl = document.getElementById(input.preview);

            fileEl.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        const img = document.createElement('img');
                        img.src = re.target.result;
                        previewEl.innerHTML = '';
                        previewEl.appendChild(img);
                        urlEl.value = '';
                    };
                    reader.readAsDataURL(file);
                }
            });

            urlEl.addEventListener('input', (e) => {
                const val = e.target.value;
                if (val) {
                    const img = document.createElement('img');
                    img.src = val;
                    img.onerror = () => {
                        previewEl.innerHTML = '<span style="color:red;font-size:10px">Error URL</span>';
                    };
                    previewEl.innerHTML = '';
                    previewEl.appendChild(img);
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

            // Persistencia de ambiente maestro
            if (document.getElementById('lockEnvironment').checked) {
                localStorage.setItem('master_env', environment);
            } else {
                localStorage.removeItem('master_env');
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
                document.getElementById('modelBadge').innerText = 'Generado con: ' + data.modelUsed;

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
