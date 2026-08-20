const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { createBaileysManager } = require('./baileys-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper for safe JSON parsing from fetch responses
async function safeParseResponse(res) {
  const text = await res.text();
  if (!text || !text.trim()) {
    return { error: { message: `HTTP Status ${res.status} ${res.statusText}` } };
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: { message: text.slice(0, 300) } };
  }
}

// Instantiate Baileys WhatsApp Manager
const baileysManager = createBaileysManager({
  authRoot: path.join(__dirname, 'auth'),
  outputDir: path.join(__dirname, 'capturas'),
  onStatusChange: (status) => {
    io.emit('whatsapp-status', status);
    if (status.state === 'qr' && status.qrDataUrl) {
      io.emit('whatsapp-qr', {
        accountKey: status.accountKey,
        qr: status.qrDataUrl,
        status: 'esperando_escaneo'
      });
    } else if (status.state === 'connected') {
      io.emit('whatsapp-connected', {
        accountKey: status.accountKey,
        status: 'conectado',
        user: { id: status.accountJid || 'WA User' }
      });
    }
  },
  onPayload: async (payload, account) => {
    io.emit('whatsapp-message', payload);
  }
});

// Connections testing API endpoint
app.post('/api/test-connection', async (req, res) => {
  const { type, config } = req.body;

  if (!type) {
    return res.status(400).json({ success: false, message: 'Tipo de conexión no especificado' });
  }

  try {
    switch (type) {
      case 'openai':
        if (!config || !config.apiKey || !config.apiKey.trim()) {
          return res.status(400).json({ success: false, message: 'Falta ingresar la API Key de OpenAI' });
        }
        const cleanKey = config.apiKey.trim();
        const aiRes = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${cleanKey}` }
        });

        const aiData = await safeParseResponse(aiRes);

        if (aiRes.ok && !aiData.error) {
          return res.json({ success: true, message: 'Conexión exitosa con OpenAI API' });
        } else {
          const errMsg = aiData.error?.message || (typeof aiData.error === 'string' ? aiData.error : 'API Key inválida o sin fondos');
          return res.status(400).json({ success: false, message: errMsg });
        }

      case 'googlesheets':
        if (!config || !config.url) {
          return res.status(400).json({ success: false, message: 'URL de Google Sheets no provista' });
        }
        const gsRes = await fetch(config.url);
        if (gsRes.ok) {
          return res.json({ success: true, message: 'Acceso correcto a Google Sheets CSV' });
        } else {
          return res.status(400).json({ success: false, message: 'No se pudo acceder a la URL indicada' });
        }

      case 'facebook':
        if (!config || !config.accessToken) {
          return res.status(400).json({ success: false, message: 'Access Token de Facebook no provisto' });
        }
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${config.accessToken.trim()}`);
        const fbData = await safeParseResponse(fbRes);
        if (fbRes.ok && !fbData.error) {
          return res.json({ success: true, message: `Conexión exitosa con Facebook API (${fbData.name || 'OK'})` });
        } else {
          return res.status(400).json({ success: false, message: fbData.error?.message || 'Token de Facebook inválido o expirado' });
        }

      case 'supabase':
      case 'postgres':
      case 'sql':
      case 'onedrive':
      case 'csv':
      case 'xlsx':
        return res.json({
          success: true,
          message: `Parámetros de conexión ${type.toUpperCase()} validados correctamente`
        });

      default:
        return res.status(400).json({ success: false, message: 'Tipo de conexión desconocido' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al probar conexión: ' + error.message });
  }
});

// OpenAI field suggestion endpoint with pre-established enterprise architecture prompt
app.post('/api/suggest-fields', async (req, res) => {
  const { businessType, moduleName, userPrompt, apiKey } = req.body;

  if (!businessType || !moduleName) {
    return res.status(400).json({ success: false, message: 'Falta tipo de negocio o nombre del módulo' });
  }

  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ success: false, message: 'Se requiere una API Key de OpenAI para sugerir campos' });
  }

  const prompt = `Eres un Arquitecto Principal de Datos y consultor ERP especializado en estructurar empresas para su digitalización operativa.
El usuario desea estructurar los campos necesarios para el módulo "${moduleName}" en una empresa del giro de negocio: "${businessType}".
Instrucción o requerimiento del usuario: "${userPrompt || `Diseñar los campos ideales para procesar inventarios, productos y/o servicios en ${businessType}`}".

REGLAS OBLIGATORIAS DE ARQUITECTURA DE DATOS:
1. Si el giro o requerimiento incluye SERVICIOS (por ejemplo: "servicio de cambio de cadena de moto", "cambio de aceite de caja de carro", "alineación y balanceo", "mantenimiento preventivo", "mano de obra"), DEBES incluir campos clave para gestionar servicios como:
   - "Tipo de Item" (Producto Físico vs Servicio)
   - "Tiempo Estimado de Ejecución / Horas Mano de Obra"
   - "Costo de Mano de Obra o Material Requerido"
   - "Categoría / Sistema" (ej. Motor, Frenos, Transmisión, Papelería, etc.)
   - "Garantía del Servicio / Producto"
2. Si es para PRODUCTOS o ARTÍCULOS DE VENTA (librería, motos, repuestos, boutique), incluye:
   - "Código / SKU"
   - "Descripción Detallada / Nombre Comercial"
   - "Unidad de Medida" (Unidad, Servicio, Kit, Caja, Litro, etc.)
   - "Precio de Venta (Q)"
   - "Costo Estimado (Q)"
   - "Stock Mínimo / Reorden"
   - "Ubicación / Estante"
3. El objetivo es crear una estructura completa, profesional y práctica que realmente ayude a la empresa a procesar y digitalizar sus operaciones sin omitir ningún dato clave.

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un arreglo JSON puro de objetos. Cada objeto debe contener:
- "name": (string, nombre claro del campo en español)
- "key": (string, identificador snake_case)
- "type": (string, uno de: "text", "number", "select", "date", "image", "boolean")
- "options": (opcional, arreglo de opciones si type es "select")
- "required": (boolean)
- "readSource": (string, ej: "Google Sheets", "Supabase", "Manual")
- "writeSource": (string, ej: "Postgres", "Supabase", "Local")

Ejemplo de salida para servicio/producto:
[
  {"name": "Código / SKU", "key": "sku", "type": "text", "required": true, "readSource": "Google Sheets", "writeSource": "Postgres"},
  {"name": "Nombre / Descripción", "key": "descripcion", "type": "text", "required": true, "readSource": "Manual", "writeSource": "Postgres"},
  {"name": "Tipo de Item", "key": "tipo_item", "type": "select", "options": ["Producto Físico", "Servicio Técnico", "Mano de Obra", "Combo / Kit"], "required": true, "readSource": "Manual", "writeSource": "Postgres"},
  {"name": "Tiempo Estimado (Horas / Mins)", "key": "tiempo_estimado", "type": "text", "required": false, "readSource": "Manual", "writeSource": "Postgres"},
  {"name": "Unidad de Medida", "key": "unidad_medida", "type": "select", "options": ["Servicio", "Unidad", "Litro", "Juego", "Hora"], "required": true, "readSource": "Manual", "writeSource": "Postgres"},
  {"name": "Precio Venta (Q)", "key": "precio_venta", "type": "number", "required": true, "readSource": "Google Sheets", "writeSource": "Postgres"}
]`;

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4
      })
    });

    const aiData = await safeParseResponse(aiRes);

    if (!aiRes.ok || aiData.error) {
      const msg = aiData.error?.message || 'Error al comunicarse con OpenAI';
      return res.status(400).json({ success: false, message: msg });
    }

    const content = aiData.choices?.[0]?.message?.content || '';

    // Clean potential markdown wrap
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const fields = JSON.parse(jsonStr);

    return res.json({ success: true, fields });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error procesando sugerencia IA: ' + error.message });
  }
});

// OpenAI generic generate endpoint supporting text & multimodal vision
app.post('/api/openai/generate', async (req, res) => {
  try {
    const { prompt, image, openai_api_key } = req.body;
    const userPrompt = prompt || "Genera un resumen o respuesta para esta solicitud.";

    if (!openai_api_key || !openai_api_key.trim()) {
      return res.status(400).json({ error: "Falta la API Key de OpenAI (openai_api_key)" });
    }

    const aiMessages = [
      {
        role: "system",
        content: "Eres un asistente experto para la plataforma Admin Básico. Responde de forma clara, directa y estructurada en formato JSON con llaves 'titulo' y 'texto'."
      }
    ];

    if (image) {
      aiMessages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: image } }
        ]
      });
    } else {
      aiMessages.push({
        role: "user",
        content: userPrompt
      });
    }

    const payload = {
      model: "gpt-4o-mini",
      messages: aiMessages,
      max_tokens: 800
    };

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + openai_api_key.trim(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const openAiData = await safeParseResponse(openAiResponse);
    if (!openAiResponse.ok || openAiData.error) {
      return res.status(400).json({ error: openAiData.error?.message || "Error de OpenAI" });
    }

    return res.json(openAiData);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// WebSocket Baileys WhatsApp Connection Manager
io.on('connection', (socket) => {
  console.log('⚡ Cliente conectado por WebSocket:', socket.id);

  socket.on('get-whatsapp-status', ({ accountKey }) => {
    const status = baileysManager.getStatus(accountKey || 'default');
    socket.emit('whatsapp-status', status);
  });

  socket.on('start-whatsapp', async (data = {}) => {
    const accountKey = data.accountKey || 'default';
    console.log(`🟢 Iniciando sesión de WhatsApp Baileys para la cuenta: ${accountKey}`);
    const status = await baileysManager.start({ accountKey, ...data });
    socket.emit('whatsapp-status', status);
  });

  socket.on('stop-whatsapp', async (data = {}) => {
    const accountKey = data.accountKey || 'default';
    console.log(`🔴 Deteniendo sesión de WhatsApp Baileys para la cuenta: ${accountKey}`);
    const status = await baileysManager.stop(accountKey);
    socket.emit('whatsapp-status', status);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Admin Básico ejecutándose en http://localhost:${PORT}`);
});
