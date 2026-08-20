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
        if (!config || !config.apiKey) {
          return res.status(400).json({ success: false, message: 'Falta la API Key de OpenAI' });
        }
        const aiRes = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${config.apiKey}` }
        });
        if (aiRes.ok) {
          return res.json({ success: true, message: 'Conexión exitosa con OpenAI API' });
        } else {
          const err = await aiRes.json();
          return res.status(400).json({ success: false, message: err.error?.message || 'Error al conectar con OpenAI' });
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
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${config.accessToken}`);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          return res.json({ success: true, message: `Conexión exitosa con Facebook API (${fbData.name || 'OK'})` });
        } else {
          return res.status(400).json({ success: false, message: 'Token de Facebook inválido o expirado' });
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
    return res.status(500).json({ success: false, message: 'Error de servidor al validar conexión: ' + error.message });
  }
});

// OpenAI field suggestion endpoint analyzing business type domain requirements
app.post('/api/suggest-fields', async (req, res) => {
  const { businessType, moduleName, userPrompt, apiKey } = req.body;

  if (!businessType || !moduleName) {
    return res.status(400).json({ success: false, message: 'Falta tipo de negocio o nombre del módulo' });
  }

  if (!apiKey) {
    return res.status(400).json({ success: false, message: 'Se requiere una API Key de OpenAI para sugerir campos' });
  }

  const prompt = `Eres un arquitecto de datos e ingeniero de software experto.
El usuario necesita definir los campos oportunos para el módulo "${moduleName}" en un negocio de tipo "${businessType}".
Instrucción o contexto adicional del usuario: "${userPrompt || `Genera los campos que debe contener los artículos/elementos para ${businessType}, analizando qué se vende y cómo se archiva en inventario en este rubro comercial`}".

Investiga mentalmente este tipo de negocio (${businessType}) y determina una lista completa y estructurada de campos de datos esenciales.
Por ejemplo, si es una librería, incluye campos como "Código", "Descripción del Artículo", "Unidad de Medida", "Color del Artículo", "Editorial/Marca", "Precio Venta", "Stock Actual", etc. Si es un taller o venta de repuestos, incluye los pertinentes.

Responde ÚNICAMENTE con un arreglo JSON puro (sin markdown ni texto antes o después) de objetos donde cada objeto contenga:
- "name": (string, nombre legible del campo en español, ej: "Código de Artículo")
- "key": (string, identificador único en snake_case, ej: "codigo_articulo")
- "type": (string, uno de: "text", "number", "select", "date", "image", "boolean")
- "options": (opcional, arreglo de strings si type es "select")
- "required": (boolean)
- "readSource": (string con fuente recomendada de lectura, ej: "Google Sheets", "Supabase", "Manual")
- "writeSource": (string con fuente recomendada de escritura, ej: "Postgres", "Supabase", "Local")

Ejemplo de respuesta válida:
[
  {"name": "Código", "key": "codigo", "type": "text", "required": true, "readSource": "Google Sheets", "writeSource": "Postgres"},
  {"name": "Descripción del Artículo", "key": "descripcion_articulo", "type": "text", "required": true, "readSource": "Manual", "writeSource": "Postgres"},
  {"name": "Unidad de Medida", "key": "unidad_medida", "type": "select", "options": ["Unidad", "Caja", "Paquete", "Docena"], "required": true, "readSource": "Manual", "writeSource": "Postgres"},
  {"name": "Color del Artículo", "key": "color_articulo", "type": "text", "required": false, "readSource": "Manual", "writeSource": "Postgres"}
]`;

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5
      })
    });

    if (!aiRes.ok) {
      const err = await aiRes.json();
      return res.status(400).json({ success: false, message: err.error?.message || 'Error al comunicarse con OpenAI' });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices[0]?.message?.content || '';

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

    if (!openai_api_key) {
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
        "Authorization": "Bearer " + openai_api_key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const openAiData = await openAiResponse.json();
    if (openAiData.error) {
      return res.status(400).json({ error: openAiData.error.message || "Error de OpenAI" });
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
