
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
        const { images, environment } = await request.json();

        if (!images || images.length !== 3) {
          return new Response(JSON.stringify({ error: "Se requieren exactamente 3 imágenes." }), { status: 400 });
        }

        // 1. Analizar imágenes con GPT-4o-mini para generar el prompt de DALL-E 3
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
                content: `Eres un experto en diseño de interiores y descripción técnica de muebles.
                Tu tarea es analizar 3 fotos de productos diferentes y crear un prompt detallado para DALL-E 3.
                El objetivo es situar estos 3 productos en un solo ambiente coherente.

                REGLAS CRÍTICAS PARA EL PROMPT DE DALL-E 3:
                1. Describe cada producto con precisión quirúrgica basándote en las fotos: color exacto, materiales, forma de las patas, presencia o ausencia de vidrios, cantidad de módulos, tiradores, etc.
                2. NO añadas elementos que no estén en las fotos originales (ej: no añadas vidrios si el mueble no tiene, no añadas patas extras).
                3. Mantén las proporciones lógicas: un ropero es más grande que una mesita de noche, una cama es más grande que una cabecera, etc.
                4. La iluminación y el ambiente deben ser coherentes pero NO deben alterar el color ni la forma de los productos originales.
                5. El estilo debe ser fotorealista, de catálogo profesional, alta resolución.
                6. El prompt debe estar en inglés para mejores resultados con DALL-E 3.
                7. Devuelve SOLO el texto del prompt, nada más.`
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
            max_tokens: 500
          })
        });

        const gptData = await gptResponse.json();
        if (gptData.error) throw new Error(`GPT Error: ${gptData.error.message}`);

        const generatedPrompt = gptData.choices[0].message.content.trim();

        // 2. Generar imagen con DALL-E 3
        const dallEResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: generatedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            response_format: "url"
          })
        });

        const dallEData = await dallEResponse.json();
        if (dallEData.error) throw new Error(`DALL-E Error: ${dallEData.error.message}`);

        return new Response(JSON.stringify({
          imageUrl: dallEData.data[0].url,
          promptUsed: generatedPrompt
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
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 2s linear infinite;
            display: inline-block;
            vertical-align: middle;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-100 min-h-screen p-4 md:p-8">
    <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 class="text-3xl font-bold text-center mb-8 text-indigo-600">Creador de Imágenes IA ✨</h1>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- Producto 1 -->
            <div class="p-4 border rounded-lg bg-gray-50">
                <label class="block font-semibold mb-2">Producto 1</label>
                <input type="file" id="file1" accept="image/*" class="mb-2 w-full text-sm">
                <input type="text" id="url1" placeholder="O pega URL de imagen" class="w-full p-2 text-sm border rounded">
                <div id="preview1" class="mt-2 h-32 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                    <span class="text-gray-400 text-xs">Sin imagen</span>
                </div>
            </div>
            <!-- Producto 2 -->
            <div class="p-4 border rounded-lg bg-gray-50">
                <label class="block font-semibold mb-2">Producto 2</label>
                <input type="file" id="file2" accept="image/*" class="mb-2 w-full text-sm">
                <input type="text" id="url2" placeholder="O pega URL de imagen" class="w-full p-2 text-sm border rounded">
                <div id="preview2" class="mt-2 h-32 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                    <span class="text-gray-400 text-xs">Sin imagen</span>
                </div>
            </div>
            <!-- Producto 3 -->
            <div class="p-4 border rounded-lg bg-gray-50">
                <label class="block font-semibold mb-2">Producto 3</label>
                <input type="file" id="file3" accept="image/*" class="mb-2 w-full text-sm">
                <input type="text" id="url3" placeholder="O pega URL de imagen" class="w-full p-2 text-sm border rounded">
                <div id="preview3" class="mt-2 h-32 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                    <span class="text-gray-400 text-xs">Sin imagen</span>
                </div>
            </div>
        </div>

        <div class="mb-8">
            <label class="block font-semibold mb-2">Descripción del Ambiente</label>
            <textarea id="environment" rows="3" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none" placeholder="Ej: Fondo verde con ambientado de sala de estar que genere paz..."></textarea>
            <p class="text-xs text-gray-500 mt-1">La IA respetará la forma y elementos originales de tus productos.</p>
        </div>

        <button id="generateBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-md">
            <span>Generar Imagen de Campaña</span>
            <div id="btnLoader" class="loader hidden"></div>
        </button>

        <div id="resultContainer" class="mt-12 hidden border-t pt-8 text-center">
            <h2 class="text-2xl font-bold mb-4">Resultado Final</h2>
            <img id="resultImage" src="" alt="Imagen Generada" class="mx-auto rounded-lg shadow-2xl mb-6 max-w-full">
            <div class="flex gap-4 justify-center">
                <a id="downloadBtn" href="#" download="campaña-ia.png" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">Descargar Imagen</a>
                <button onclick="window.location.reload()" class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors">Nueva Imagen</button>
            </div>
            <details class="mt-6 text-left">
                <summary class="text-gray-500 cursor-pointer text-sm">Ver Prompt generado por IA</summary>
                <p id="promptText" class="mt-2 p-4 bg-gray-100 rounded text-xs italic text-gray-700"></p>
            </details>
        </div>
    </div>

    <script>
        const inputs = [
            { file: 'file1', url: 'url1', preview: 'preview1' },
            { file: 'file2', url: 'url2', preview: 'preview2' },
            { file: 'file3', url: 'url3', preview: 'preview3' }
        ];

        // Lógica de previsualización
        inputs.forEach(input => {
            const fileEl = document.getElementById(input.file);
            const urlEl = document.getElementById(input.url);
            const previewEl = document.getElementById(input.preview);

            fileEl.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        previewEl.innerHTML = \`<img src="\${re.target.result}" class="h-full w-full object-contain">\`;
                        urlEl.value = '';
                    };
                    reader.readAsDataURL(file);
                }
            });

            urlEl.addEventListener('input', (e) => {
                if (e.target.value) {
                    previewEl.innerHTML = \`<img src="\${e.target.value}" class="h-full w-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-red-500 text-xs\\'>Error URL</span>'">\`;
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
                resultContainer.classList.add('hidden');

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
                    alert('Debes proporcionar las 3 imágenes (ya sea por archivo o por URL).');
                    btn.disabled = false;
                    loader.classList.add('hidden');
                    return;
                }

                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ images, environment })
                });

                const data = await response.json();

                if (data.error) throw new Error(data.error);

                document.getElementById('resultImage').src = data.imageUrl;
                document.getElementById('downloadBtn').href = data.imageUrl;
                document.getElementById('promptText').innerText = data.promptUsed;
                resultContainer.classList.remove('hidden');
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
