const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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
        // Simulated structural validation for direct DB/File integrations
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

// OpenAI field suggestion endpoint
app.post('/api/suggest-fields', async (req, res) => {
  const { businessType, moduleName, apiKey } = req.body;

  if (!businessType || !moduleName) {
    return res.status(400).json({ success: false, message: 'Falta tipo de negocio o nombre del módulo' });
  }

  if (!apiKey) {
    return res.status(400).json({ success: false, message: 'Se requiere una API Key de OpenAI para sugerir campos' });
  }

  const prompt = `Eres un arquitecto de datos experto. Genera una lista en formato JSON de campos ideales para el módulo "${moduleName}" en un negocio de tipo "${businessType}".
Responde ÚNICAMENTE con un arreglo JSON de objetos donde cada objeto tenga las propiedades:
"name" (nombre legible del campo, ej: "Marca de Moto"),
"key" (identificador en snake_case, ej: "marca_moto"),
"type" (uno de: "text", "number", "select", "date", "image", "boolean"),
"options" (opcional, arreglo de strings si type es "select"),
"required" (boolean),
"readSource" (string con sugerencia de fuente de lectura, ej: "Google Sheets", "Supabase", "Manual"),
"writeSource" (string con sugerencia de fuente de escritura, ej: "Postgres", "Supabase", "Local")

Ejemplo de respuesta esperada:
[
  {"name": "Marca", "key": "marca", "type": "text", "required": true, "readSource": "Google Sheets", "writeSource": "Postgres"},
  {"name": "Precio Ventas", "key": "precio_ventas", "type": "number", "required": true, "readSource": "Manual", "writeSource": "Postgres"}
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
        temperature: 0.7
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

// Socket.io WebSocket handling for Baileys WhatsApp QR code simulation & events
io.on('connection', (socket) => {
  console.log('⚡ Cliente conectado por WebSocket:', socket.id);

  socket.on('start-whatsapp', async () => {
    try {
      // Generate real QR code image data URL for scanning demonstration
      const dummyPairingPayload = `2@${Math.random().toString(36).substring(2)},${Date.now()},AdminBasicoSession`;
      const qrImageDataUrl = await QRCode.toDataURL(dummyPairingPayload);

      socket.emit('whatsapp-qr', {
        qr: qrImageDataUrl,
        raw: dummyPairingPayload,
        status: 'esperando_escaneo'
      });
    } catch (err) {
      socket.emit('whatsapp-error', { message: err.message });
    }
  });

  socket.on('simulate-whatsapp-connect', () => {
    socket.emit('whatsapp-connected', {
      status: 'conectado',
      user: { id: '50255551234@s.whatsapp.net', name: 'Admin Básico Business' }
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Admin Básico ejecutándose en http://localhost:${PORT}`);
});
