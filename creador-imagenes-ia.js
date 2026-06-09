export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
    // CORS
    // =========================
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // =========================
    // FRONTEND
    // =========================
    if (request.method === "GET") {
      return new Response(getHTML(), {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          ...corsHeaders()
        }
      });
    }

    // =========================
    // REMOVE BG
    // =========================
    if (request.method === "POST" && url.pathname === "/remove-bg") {
      try {
        const formData = await request.formData();
        const image = formData.get("image");
        const imageUrl = formData.get("image_url");

        let blobToProcess;
        if (image) {
          blobToProcess = image;
        } else if (imageUrl) {
          const imgRes = await fetch(imageUrl);
          if (!imgRes.ok) throw new Error("No se pudo obtener la imagen desde la URL.");
          blobToProcess = await imgRes.blob();
        } else {
          throw new Error("No se proporcionó imagen");
        }

        const fd = new FormData();
        fd.append("image", blobToProcess);

        const response = await fetch("https://clearbackdrop.com/api/v1/remove-background", {
          method: "POST",
          body: fd
        });

        if (!response.ok) {
          const txt = await response.text();
          throw new Error(txt);
        }

        const blob = await response.blob();
        return new Response(blob, {
          headers: {
            "Content-Type": "image/png",
            ...corsHeaders()
          }
        });
      } catch (e) {
        return jsonError(e.message);
      }
    }

    // =========================
    // GENERATE BG
    // =========================
    if (request.method === "POST" && url.pathname === "/generate-bg") {
      try {
        const body = await request.json();
        const prompt = body.prompt || "Luxury modern interior";

        // Modelos según memoria del usuario y fallbacks estándar
        const models = ["gpt-image", "gpt-image-1-mini", "dall-e-3"];
        let lastError = null;

        for (const model of models) {
          try {
            const basePayload = {
              model: model,
              size: "1024x1024",
              prompt:
                "Professional architectural interior photography, luxury catalog style, " +
                "completely empty room, NO furniture, clear floor, high realism, 8k, " +
                "warm cinematic lighting, minimalist elegant walls, " +
                prompt
            };

            // Primer intento: con b64_json
            let payload = { ...basePayload, response_format: "b64_json" };
            let response = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.OPENAI_API_KEY}`
              },
              body: JSON.stringify(payload)
            });

            let data = await response.json();

            // Si falla por parámetro desconocido, intentamos sin response_format
            if (data.error && data.error.message.includes("Unknown parameter: 'response_format'")) {
              console.warn(`Fallback: reintentando ${model} sin response_format`);
              response = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${env.OPENAI_API_KEY}`
                },
                body: JSON.stringify(basePayload)
              });
              data = await response.json();
            }

            if (data.error) {
              console.error(`Error con modelo ${model}:`, data.error);
              lastError = data.error.message;
              continue;
            }

            // Manejamos tanto b64 como URL
            const result = data.data[0];
            return new Response(JSON.stringify({
              b64: result.b64_json || null,
              url: result.url || null
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders() }
            });
          } catch (err) {
            console.error(`Excepción fatal con modelo ${model}:`, err);
            lastError = err.message;
          }
        }
        throw new Error(lastError || "No se pudo generar la imagen con ningún modelo.");
      } catch (e) {
        return jsonError(e.message);
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function jsonError(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

function getHTML() {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Campaign Creator Pro</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --primary: #4f46e5; --primary-hover: #4338ca; --bg: #f3f4f6; --text: #111827; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 30px; }
        .grid-config { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .card { border: 1px solid #e5e7eb; padding: 20px; border-radius: 15px; background: #fafafa; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .p-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 15px; background: white; position: relative; }
        .p-preview { width: 100%; height: 160px; background: #f9fafb; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 12px; border: 1px dashed #d1d5db; }
        .p-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .label { display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; color: #4b5563; }
        input, select { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; margin-bottom: 15px; box-sizing: border-box; font-family: inherit; }
        .btn-main { background: var(--primary); color: white; border: none; padding: 18px; border-radius: 12px; width: 100%; font-weight: 700; font-size: 1.1rem; cursor: pointer; transition: 0.3s; }
        .btn-main:hover { background: var(--primary-hover); }
        canvas { max-width: 100%; border-radius: 15px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .loading { position: fixed; inset: 0; background: rgba(255,255,255,0.9); display: none; align-items: center; justify-content: center; flex-direction: column; z-index: 999; }
        .spinner { width: 50px; height: 50px; border: 5px solid #eee; border-top: 5px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .controls-panel { margin-top: 20px; display: none; background: #fefce8; border: 1px solid #fef3c7; padding: 15px; border-radius: 12px; }
        .slider-group { margin-bottom: 10px; }
        .slider-group label { font-size: 0.75rem; font-weight: 600; display: flex; justify-content: space-between; }
    </style>
</head>
<body>
    <div class="loading" id="loader">
        <div class="spinner"></div>
        <p id="loader-text" style="margin-top:20px; font-weight:700;">Procesando...</p>
    </div>

    <div class="container">
        <div class="header">
            <h1>🎨 AI Campaign Creator Pro</h1>
            <p>Integra tus productos reales en ambientes profesionales</p>
        </div>

        <div class="grid-config">
            <div class="card">
                <label class="label">Ambiente Deseado</label>
                <input type="text" id="env-type" value="Luxury modern bedroom">
                <label class="label">Iluminación</label>
                <select id="env-light">
                    <option value="warm cinematic lighting">Cálida Cinematográfica</option>
                    <option value="natural bright daylight">Luz Natural Brillante</option>
                    <option value="soft studio lighting">Estudio Profesional</option>
                </select>
            </div>
            <div class="card">
                <label class="label">Ajustes Pro</label>
                <div class="slider-group">
                    <label>Brillo Productos <span id="val-bright">100%</span></label>
                    <input type="range" id="adj-bright" min="70" max="130" value="100" oninput="updateAdj()">
                </div>
                <div class="slider-group">
                    <label>Intensidad Sombra <span id="val-shad">25%</span></label>
                    <input type="range" id="adj-shad" min="0" max="100" value="25" oninput="updateAdj()">
                </div>
            </div>
        </div>

        <div class="products-grid" id="products-grid"></div>

        <button onclick="addProduct()" style="margin-bottom:25px; padding:10px 20px; border-radius:10px; border:1px solid #ddd; cursor:pointer; font-weight:600; background:white;">
            <i class="fas fa-plus"></i> Agregar Producto
        </button>

        <button class="btn-main" onclick="runGenerationFlow()">
            <i class="fas fa-sparkles"></i> GENERAR CAMPAÑA
        </button>

        <div id="result-area" style="margin-top:40px; display:none; text-align:center;">
            <canvas id="main-canvas" width="1024" height="1024"></canvas>
            <div style="margin-top:20px;">
                <button onclick="downloadImage()" style="background:#059669; color:white; padding:12px 30px; border:none; border-radius:12px; font-weight:700; cursor:pointer;">Descargar Imagen</button>
            </div>
        </div>
    </div>

    <script>
        let products = [];
        let lastBg = null;

        function addProduct() {
            products.push({ id: Date.now(), name: "", file: null, url: "", preview: "", noBg: null });
            renderProducts();
        }

        function renderProducts() {
            const grid = document.getElementById("products-grid");
            grid.innerHTML = "";
            products.forEach((p, i) => {
                const card = document.createElement("div");
                card.className = "p-card";
                card.innerHTML = \`
                    <div class="p-preview">\${p.preview ? \`<img src="\${p.preview}">\` : '<i class="fas fa-image" style="color:#ccc; font-size:2rem;"></i>'}</div>
                    <label class="label">Producto \${i+1}</label>
                    <input type="text" value="\${p.name}" onchange="products[\${i}].name=this.value" placeholder="Nombre (ej: Cama)">
                    <input type="file" accept="image/*" onchange="handleFile(\${i}, this)" style="font-size:0.75rem; margin-bottom:5px;">
                    <input type="text" value="\${p.url}" onchange="handleUrl(\${i}, this.value)" placeholder="O pega URL de imagen">
                \`;
                grid.appendChild(card);
            });
        }

        async function handleFile(i, input) {
            const file = input.files[0];
            if (!file) return;
            products[i].file = file;
            products[i].url = "";
            products[i].preview = await fileToBase64(file);
            renderProducts();
        }

        function handleUrl(i, url) {
            products[i].url = url;
            products[i].file = null;
            products[i].preview = url;
            renderProducts();
        }

        function fileToBase64(file) {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }

        function updateAdj() {
            document.getElementById('val-bright').textContent = document.getElementById('adj-bright').value + '%';
            document.getElementById('val-shad').textContent = document.getElementById('adj-shad').value + '%';
            if (lastBg) drawScene();
        }

        async function runGenerationFlow() {
            const active = products.filter(p => p.file || p.url);
            if (!active.length) return alert("Sube al menos un producto");

            const loader = document.getElementById("loader");
            const lt = document.getElementById("loader-text");
            loader.style.display = "flex";

            try {
                lt.textContent = "Removiendo fondos...";
                for (const p of active) {
                    const fd = new FormData();
                    if (p.file) fd.append("image", p.file); else fd.append("image_url", p.url);
                    const res = await fetch("/remove-bg", { method: "POST", body: fd });
                    if (!res.ok) throw new Error("Error quitando fondo");
                    p.noBg = await blobToImage(await res.blob());
                }

                lt.textContent = "Generando ambiente IA...";
                const bgRes = await fetch("/generate-bg", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: document.getElementById("env-type").value + ", " + document.getElementById("env-light").value })
                });
                const bgData = await bgRes.json();
                if (bgData.error) throw new Error(bgData.error);

                if (bgData.b64) {
                    lastBg = await b64ToImage(bgData.b64);
                } else if (bgData.url) {
                    lastBg = await urlToImage(bgData.url);
                } else {
                    throw new Error("No se recibió imagen del servidor");
                }

                drawScene();

                loader.style.display = "none";
                document.getElementById("result-area").style.display = "block";
                document.getElementById("result-area").scrollIntoView({ behavior: 'smooth' });

            } catch (e) {
                alert(e.message);
                loader.style.display = "none";
            }
        }

        function drawScene() {
            const canvas = document.getElementById("main-canvas");
            const ctx = canvas.getContext("2d");
            const active = products.filter(p => p.noBg);
            const bright = document.getElementById('adj-bright').value / 100;
            const shadOp = document.getElementById('adj-shad').value / 100;

            ctx.drawImage(lastBg, 0, 0, 1024, 1024);

            // Posiciones lógicas: Principal al centro, secundarios a los lados
            const positions = [
                { x: 512, y: 920, width: 720 }, // Principal
                { x: 200, y: 880, width: 250 }, // Izquierda
                { x: 824, y: 880, width: 250 }  // Derecha
            ];

            active.forEach((product, i) => {
                const pos = positions[i] || positions[0];
                const img = product.noBg;
                const w = pos.width;
                const h = img.height * (w / img.width);
                const x = pos.x - w / 2;
                const y = pos.y - h;

                // Sombra profesional
                ctx.save();
                ctx.globalAlpha = shadOp;
                ctx.filter = "blur(15px)";
                ctx.fillStyle = "black";
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y + 5, w * 0.35, 20, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Imagen con ajuste de brillo
                ctx.save();
                ctx.filter = \`brightness(\${bright})\`;
                ctx.drawImage(img, x, y, w, h);
                ctx.restore();
            });
        }

        function blobToImage(blob) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(blob); }); }
        function b64ToImage(b64) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + b64; }); }
        function urlToImage(url) { return new Promise((r, e) => { const i = new Image(); i.crossOrigin = "Anonymous"; i.onload = () => r(i); i.onerror = e; i.src = url; }); }
        function downloadImage() { const c = document.getElementById("main-canvas"); const l = document.createElement("a"); l.download = 'campaña.png'; l.href = c.toDataURL(); l.click(); }

        addProduct();
    </script>
</body>
</html>
  `;
}
