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

    // Endpoint para analizar escena (GPT-4o mini como Fotógrafo Profesional)
    if (request.method === "POST" && url.pathname === "/analyze") {
      try {
        const { config } = await request.json();

        const messages = [
          {
            role: "system",
            content: `Eres un Fotógrafo y Director de Arte experto en catálogos de muebles premium.
Tu misión es diseñar una escena 1024x1024 coherente.
Debes devolver un JSON con:
1. bg_prompt: Prompt en inglés para DALL-E describiendo un ambiente arquitectónico de lujo TOTALMENTE VACÍO. Usa términos como: "wide angle interior photography", "f/8", "natural daylight", "high-end textures".
2. scene_config:
   - light_direction: "left", "right" o "center".
   - light_warmth: número de 0 a 1 (0 frío, 1 cálido).
3. layout: Lista de objetos para posicionar los productos:
   - id: nombre del producto.
   - x: centro horizontal (0-1024).
   - y: base del mueble en el suelo (600-950).
   - scale: escala (0.5 a 1.2).
   - zIndex: orden de capa.
   - shadow_offset_x: desplazamiento de sombra basado en light_direction (ej: -15 si la luz viene de la derecha).

REGLAS:
- Los productos deben estar apoyados en el suelo.
- Evita que los muebles se vean flotando sugiriendo posiciones y escalas realistas según el tipo de mueble.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Estilo: ${JSON.stringify(config.estilo)}. Productos: ${config.productos.map(p => p.nombre).join(", ")}.` },
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
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Endpoint para generar fondo
    if (request.method === "POST" && url.pathname === "/generate-bg") {
      try {
        const { prompt } = await request.json();
        const models = ["gpt-image", "gpt-image-1-mini", "chatgpt-image-latest", "dall-e-3"];
        let lastError = null;

        for (const model of models) {
          try {
            const response = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: model,
                prompt: `Luxury architectural interior photography, NO FURNITURE, strictly empty room, clear polished floors, realistic textures, catalog style, ${prompt}`,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
              })
            });

            const data = await response.json();
            if (data.error) {
              lastError = data.error.message;
              continue;
            }
            return new Response(JSON.stringify({ b64: data.data[0].b64_json }), {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          } catch (e) {
            lastError = e.message;
          }
        }
        throw new Error(lastError);
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
    <title>IA Campaign Master - Fidelidad Pro</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --primary: #6366f1; --primary-dark: #4f46e5; --bg: #f8fafc; --card: #ffffff; --text: #1e293b; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
        .container { max-width: 1100px; margin: 0 auto; background: white; padding: 30px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); }
        .header { text-align: center; margin-bottom: 35px; }
        .badge { background: #fee2e2; color: #b91c1c; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
        .grid-main { display: grid; grid-template-columns: 350px 1fr; gap: 30px; }
        @media (max-width: 900px) { .grid-main { grid-template-columns: 1fr; } }
        .sidebar { background: #fcfcfc; border: 1px solid #f1f5f9; padding: 20px; border-radius: 20px; height: fit-content; }
        .config-group { margin-bottom: 20px; }
        .label { display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 8px; color: #64748b; text-transform: uppercase; }
        input, select { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px; font-family: inherit; }
        .products-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .p-item { background: white; border: 1px solid #e2e8f0; padding: 12px; border-radius: 15px; position: relative; }
        .p-item img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
        .btn-main { background: var(--primary); color: white; border: none; padding: 18px; border-radius: 16px; width: 100%; font-weight: 700; font-size: 1rem; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3); }
        .btn-main:hover { background: var(--primary-dark); transform: translateY(-2px); }
        .btn-main:disabled { opacity: 0.5; transform: none; }
        #canvas-wrap { position: sticky; top: 20px; text-align: center; }
        canvas { max-width: 100%; border-radius: 20px; background: #eee; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.15); }
        .refinement-panel { margin-top: 20px; display: none; background: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 15px; text-align: left; }
        .slider-group { margin-bottom: 10px; }
        .slider-group label { font-size: 0.7rem; font-weight: 600; display: flex; justify-content: space-between; }
        .loading { position: fixed; inset: 0; background: rgba(255,255,255,0.95); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; }
        .spinner { width: 60px; height: 60px; border: 6px solid #f1f5f9; border-top: 6px solid var(--primary); border-radius: 50%; animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loading" id="loader">
        <div class="spinner"></div>
        <p id="l-text" style="margin-top:25px; font-weight:800; color:var(--primary); font-size:1.1rem;"></p>
    </div>

    <div class="container">
        <div class="header">
            <h1>🎨 IA Campaign Master <span class="badge">Ambientado Pro</span></h1>
            <p>Composición fotográfica de alta fidelidad basada en productos reales.</p>
        </div>

        <div class="grid-main">
            <div class="sidebar">
                <div class="config-group">
                    <label class="label">Escenario Arquitectónico</label>
                    <input type="text" id="env-room" value="Dormitorio moderno minimalista">
                    <label class="label">Iluminación de Escena</label>
                    <select id="env-light">
                        <option value="Suave luz de tarde">Suave luz de tarde</option>
                        <option value="Estudio profesional neutro">Estudio profesional neutro</option>
                        <option value="Contraluz dramático">Contraluz dramático</option>
                    </select>
                </div>

                <label class="label">Productos (Fotos Reales)</label>
                <div class="products-list" id="p-list"></div>
                <button onclick="addP()" style="width:100%; padding:10px; border-radius:12px; border:1px dashed #cbd5e1; background:none; cursor:pointer; font-weight:600; margin-bottom:25px;">+ Añadir Otro Mueble</button>

                <button id="go" class="btn-main" onclick="run()">GENERAR COMPOSICIÓN PRO</button>

                <div class="refinement-panel" id="refine">
                    <label class="label" style="color:#92400e;">Ajuste de Composición</label>
                    <div class="slider-group">
                        <label>Brillo Productos <span id="v-bright">100%</span></label>
                        <input type="range" min="50" max="150" value="100" oninput="updateRefine('bright', this.value)">
                    </div>
                    <div class="slider-group">
                        <label>Calidez (Ambiente) <span id="v-warm">0%</span></label>
                        <input type="range" min="-30" max="30" value="0" oninput="updateRefine('warm', this.value)">
                    </div>
                    <div class="slider-group">
                        <label>Intensidad Sombra <span id="v-shad">40%</span></label>
                        <input type="range" min="0" max="100" value="40" oninput="updateRefine('shad', this.value)">
                    </div>
                </div>
            </div>

            <div id="canvas-wrap">
                <canvas id="c" width="1024" height="1024"></canvas>
                <div id="res-btns" style="margin-top:20px; display:none; gap:10px; justify-content:center;">
                    <button onclick="download()" style="background:#059669; color:white; padding:12px 25px; border:none; border-radius:12px; font-weight:700; cursor:pointer;">Descargar Campaña</button>
                    <button onclick="location.reload()" style="background:#64748b; color:white; padding:12px 25px; border:none; border-radius:12px; font-weight:700; cursor:pointer;">Reiniciar</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let ps = [{ id: 1, n: 'Producto Principal', f: null, pr: '', nb: null }];
        let currentScene = null;
        let bgImg = null;
        let refine = { bright: 100, warm: 0, shad: 40 };

        function render() {
            const l = document.getElementById('p-list');
            l.innerHTML = '';
            ps.forEach((p, i) => {
                const d = document.createElement('div');
                d.className = 'p-item';
                d.innerHTML = \`
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        \${p.pr ? \`<img src="\${p.pr}">\` : '<div style="width:40px;height:40px;background:#eee;border-radius:8px"></div>'}
                        <input type="text" value="\${p.n}" onchange="ps[\${i}].n=this.value" placeholder="Nombre mueble" style="margin:0; padding:8px;">
                    </div>
                    <input type="file" accept="image/*" onchange="hF(\${i}, this)" style="font-size:0.7rem; padding:0; border:none;">
                \`;
                l.appendChild(d);
            });
        }

        async function hF(i, input) {
            const f = input.files[0];
            if (!f) return;
            ps[i].f = f;
            const r = new FileReader();
            r.onload = e => { ps[i].pr = e.target.result; render(); };
            r.readAsDataURL(f);
        }

        function addP() { ps.push({ id: Date.now(), n: 'Nuevo Producto', f: null, pr: '' }); render(); }

        function updateRefine(type, val) {
            refine[type] = parseInt(val);
            document.getElementById('v-'+type).textContent = (type==='bright' ? val+'%' : (type==='shad' ? val+'%' : val));
            if (bgImg) draw();
        }

        async function run() {
            const active = ps.filter(p => p.f || p.pr.startsWith('http'));
            if (!active.length) return alert("Sube al menos una imagen de producto.");
            const loader = document.getElementById('loader');
            const lt = document.getElementById('l-text');
            loader.style.display = 'flex';

            try {
                lt.textContent = "📸 Extrayendo productos reales...";
                for (let p of active) {
                    const fd = new FormData();
                    if (p.f) fd.append('image', p.f); else fd.append('image_url', p.pr);
                    const res = await fetch('/remove-bg', { method: 'POST', body: fd });
                    if (!res.ok) throw new Error("Error en recorte");
                    p.nb = await bToI(await res.blob());
                }

                lt.textContent = "🧠 Diseñando iluminación y perspectiva...";
                const aRes = await fetch('/analyze', {
                    method: 'POST',
                    body: JSON.stringify({ config: {
                        estilo: { room: document.getElementById('env-room').value, light: document.getElementById('env-light').value },
                        productos: active.map(p => ({ nombre: p.n, url: p.pr }))
                    }})
                });
                currentScene = JSON.parse(await aRes.json());

                lt.textContent = "🖼️ Generando escenario de lujo...";
                const bRes = await fetch('/generate-bg', { method: 'POST', body: JSON.stringify({ prompt: currentScene.bg_prompt }) });
                const bData = await bRes.json();
                bgImg = await b64ToI(bData.b64);

                draw();
                loader.style.display = 'none';
                document.getElementById('refine').style.display = 'block';
                document.getElementById('res-btns').style.display = 'flex';

            } catch (e) { alert(e.message); loader.style.display = 'none'; }
        }

        function b64ToI(b) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + b; }); }
        function bToI(b) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(b); }); }

        function draw() {
            const canvas = document.getElementById('c');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 1024, 1024);

            // 1. Dibujar Fondo con Filtro de Temperatura
            ctx.save();
            if (refine.warm !== 0) {
                ctx.filter = \`sepia(\${Math.abs(refine.warm)}%) hue-rotate(\${refine.warm > 0 ? 0 : 180}deg)\`;
            }
            ctx.drawImage(bgImg, 0, 0, 1024, 1024);
            ctx.restore();

            // 2. Dibujar Productos
            const active = ps.filter(p => p.nb);
            currentScene.layout.sort((a,b) => (a.zIndex||0) - (b.zIndex||0)).forEach(item => {
                const product = active.find(x => x.n === item.id);
                if (!product) return;

                const img = product.nb;
                const scale = item.scale || 1;
                const h = 480 * scale;
                const w = (img.width / img.height) * h;
                const x = item.x - (w/2);
                const y = item.y - h;

                // Sombra de Capas (Contacto + Direccional)
                ctx.save();
                const shadOp = refine.shad / 100;
                // Sombra de contacto (oscura, cerrada)
                ctx.beginPath();
                ctx.ellipse(item.x, item.y, w/2.2, h/25, 0, 0, Math.PI*2);
                ctx.fillStyle = \`rgba(0,0,0,\${shadOp * 0.8})\`;
                ctx.filter = 'blur(4px)';
                ctx.fill();

                // Sombra proyectada (suave, desplazada)
                ctx.beginPath();
                ctx.ellipse(item.x + (item.shadow_offset_x || 0), item.y + 5, w/2, h/15, 0, 0, Math.PI*2);
                ctx.fillStyle = \`rgba(0,0,0,\${shadOp * 0.4})\`;
                ctx.filter = 'blur(12px)';
                ctx.fill();
                ctx.restore();

                // Producto con Ajuste de Brillo
                ctx.save();
                ctx.filter = \`brightness(\${refine.bright}%)\`;
                ctx.drawImage(img, x, y, w, h);

                // Mezcla Ambiental (Tintar ligeramente el producto con el color del cuarto)
                ctx.globalCompositeOperation = 'soft-light';
                ctx.fillStyle = refine.warm > 0 ? 'rgba(255,150,0,0.05)' : 'rgba(0,100,255,0.05)';
                ctx.fillRect(x, y, w, h);
                ctx.restore();
            });
        }

        function download() {
            const c = document.getElementById('c');
            const a = document.createElement('a');
            a.download = 'campaña-pro.png';
            a.href = c.toDataURL('image/png', 1.0);
            a.click();
        }

        render();
    </script>
</body>
</html>
  `;
}
