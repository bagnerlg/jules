const express = require('express');
const router = express.Router();
const { getAIResponse } = require('../utils/aiService');
const kvService = require('../utils/kvService');

/**
 * 0. PASO VERIFICACIÓN: Revisa si un ID existe en KV (Individual o Combo).
 */
router.get('/check-id/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Buscar como individual
    const individual = await kvService.get(`individual:${id}`);
    if (individual) return res.json({ success: true, exists: true, type: 'individual', data: individual });

    // 2. Buscar como combo (Revisamos meta Y raw por si acaso)
    const comboMeta = await kvService.get(`combo_meta:${id}`);
    const comboRaw = await kvService.get(`combo:${id}`);

    if (comboMeta || comboRaw) {
      return res.json({
        success: true,
        exists: true,
        type: 'combo',
        data: comboMeta || {},
        components: comboRaw || ""
      });
    }

    res.json({ success: true, exists: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 1. PASO GENERACIÓN: Revisa KV primero; si no existe, llama a la IA.
 */
router.post('/generate-preview', async (req, res) => {
  const { nombre, precio, categoria, idManual, esCombo, componentes, imageBase64, imageUrl } = req.body;

  if (!nombre || !precio || !categoria) {
    return res.status(400).json({ success: false, error: 'Nombre, precio y categoría son requeridos.' });
  }

  try {
    const finalId = idManual || `M${Math.floor(Math.random() * 9000) + 1000}`;

    const existingKey = esCombo ? `combo_meta:${finalId}` : `individual:${finalId}`;
    let existingData = await kvService.get(existingKey);

    if (existingData) {
      if (typeof existingData === 'string') existingData = JSON.parse(existingData);
      return res.json({ success: true, data: existingData, fromKV: true });
    }

    const systemPrompt = `Eres un experto vendedor de muebles en Guatemala. Genera la ficha técnica JSON con 17 campos exactos.

REGLAS PARA EL TÍTULO:
- Debe ser ATRACTIVO y PERSUASIVO, en MAYÚSCULAS.
- Empieza con adjetivos: LINDA, HERMOSA, BELLA o ELEGANTE.
- PROHIBIDO usar: MELAMINA, FROST MONT, WENGUE, o nombres de colores técnicos.

ESTRUCTURA REQUERIDA (JSON):
{
  "id": "${finalId}",
  "titulo": "...", "descripcion": "...", "medidas": "...", "estructura": "...",
  "precio": ${precio}, "categoria": "${categoria}", "colores": "...", "garantia": "...",
  "grosor_material": "...", "tipo_ensamble": "...", "resistencia_peso": "...",
  "refuerzos": "...", "personalizacion": "...", "limpieza": "...",
  "imagen1": "...", "imagen2": "..."
}`;

    const aiResponse = await getAIResponse(systemPrompt, `Genera JSON para: ${nombre}.`, [], imageBase64, imageUrl);
    const cleaned = aiResponse.replace(/```json|```/g, '').trim();
    let generatedData = JSON.parse(cleaned);

    if (Object.keys(generatedData).length === 1 && typeof Object.values(generatedData)[0] === 'object') {
      generatedData = Object.values(generatedData)[0];
    }
    generatedData.categoria = categoria;

    res.json({ success: true, data: generatedData, fromKV: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. PASO CONFIRMACIÓN: Guarda en KV y actualiza productos:listado.
 */
router.post('/confirm-publish', async (req, res) => {
  const { productData, esCombo, componentes } = req.body;
  try {
    const finalId = productData.id;
    const finalKey = esCombo ? `combo_meta:${finalId}` : `individual:${finalId}`;

    await kvService.put(finalKey, productData);
    if (esCombo) await kvService.put(`combo:${finalId}`, componentes);

    let listado = await kvService.get('productos:listado') || [];
    if (typeof listado === 'string') listado = JSON.parse(listado);

    listado = listado.filter(p => p.sku !== finalId);
    listado.push({
      nombre: productData.titulo, key: finalKey,
      tipo: esCombo ? 'combo' : 'individual',
      precio: Number(productData.precio), sku: finalId
    });
    await kvService.put('productos:listado', listado);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. PASO ELIMINACIÓN
 */
router.post('/delete-product', async (req, res) => {
  const { id, esCombo } = req.body;
  try {
    const finalKey = esCombo ? `combo_meta:${id}` : `individual:${id}`;
    await kvService.delete(finalKey);
    if (esCombo) await kvService.delete(`combo:${id}`);

    let listado = await kvService.get('productos:listado') || [];
    if (typeof listado === 'string') listado = JSON.parse(listado);
    listado = listado.filter(p => p.sku !== id);
    await kvService.put('productos:listado', listado);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
