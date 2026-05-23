const mainForm = document.getElementById('main-form');
const editorArea = document.getElementById('editor-area');
const fieldsGrid = document.getElementById('fields-grid');
const saveBtn = document.getElementById('save-to-cloud');
const statusMsg = document.getElementById('status-msg');
const isCombo = document.getElementById('is-combo');
const compArea = document.getElementById('comp');
const fotoUrlInput = document.getElementById('foto-url');
const idInput = document.getElementById('idm');
const btnCheckId = document.getElementById('btn-check-id');

let currentData = null;

isCombo.onchange = () => compArea.classList.toggle('hidden', !isCombo.checked);

// FUNCIÓN: Buscar por ID y autocompletar
btnCheckId.onclick = async () => {
    const id = idInput.value.trim();
    if (!id) { statusMsg.innerText = "❌ Ingresa un ID primero."; return; }

    statusMsg.innerText = "🔍 Buscando ID en Cloudflare...";
    try {
        const res = await fetch(`/api/publish/check-id/${id}`);
        const result = await res.json();

        if (result.exists) {
            statusMsg.innerHTML = `✅ <b>ID Encontrado:</b> Datos cargados para <b>${id}</b>.<br>
            <button onclick="deleteExisting('${id}', ${result.type === 'combo'})" style="background:#dc3545; color:white; padding:5px 10px; margin-top:5px; border-radius:5px; border:none; cursor:pointer;">Eliminar Mueble 🗑️</button>`;

            let data = result.data;
            if (typeof data === 'string') data = JSON.parse(data);
            currentData = data;

            // Llenar campos si existen
            document.getElementById('nombre').value = data.titulo || "";
            document.getElementById('precio').value = data.precio || "";
            document.getElementById('cat').value = data.categoria || "";
            if (result.type === 'combo') {
                isCombo.checked = true;
                compArea.classList.remove('hidden');
                compArea.value = result.components || "";
            } else {
                isCombo.checked = false;
                compArea.classList.add('hidden');
            }

            if (Object.keys(data).length > 0) showEditor(data);
        } else {
            statusMsg.innerText = "✨ El ID no existe en la base de datos.";
            editorArea.classList.add('hidden');
        }
    } catch (e) { statusMsg.innerText = "❌ Error al buscar ID."; }
};

function showEditor(data) {
    fieldsGrid.innerHTML = Object.keys(data).map(key => `
        <div>
            <label>${key.toUpperCase()}</label>
            <input type="text" id="edit-${key}" value="${typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]}">
        </div>
    `).join('');
    editorArea.classList.remove('hidden');
    editorArea.scrollIntoView({ behavior: 'smooth' });
}

async function processImage(file, maxWidth = 1024) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
            };
        };
    });
}

mainForm.onsubmit = async (e) => {
    e.preventDefault();
    statusMsg.innerText = "⏳ Consultando IA...";
    let base64 = null;
    const fileInput = document.getElementById('foto');
    if (fileInput.files[0]) base64 = await processImage(fileInput.files[0]);

    try {
        const res = await fetch('/api/publish/generate-preview', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                nombre: document.getElementById('nombre').value,
                precio: document.getElementById('precio').value,
                categoria: document.getElementById('cat').value,
                idManual: idInput.value,
                esCombo: isCombo.checked,
                componentes: compArea.value,
                imageBase64: base64,
                imageUrl: fotoUrlInput.value.trim()
            })
        });
        const responseJson = await res.json();
        if (!responseJson.success) throw new Error(responseJson.error);
        currentData = responseJson.data;
        statusMsg.innerText = "✨ Ficha técnica generada.";
        showEditor(currentData);
    } catch (err) { statusMsg.innerText = "❌ Error: " + err.message; }
};

window.deleteExisting = async (id, esCombo) => {
    if (!confirm(`¿Borrar definitivamente el producto ${id}?`)) return;
    try {
        await fetch('/api/publish/delete-product', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, esCombo })
        });
        statusMsg.innerText = "✅ Producto eliminado.";
        editorArea.classList.add('hidden');
        mainForm.reset();
    } catch (e) { statusMsg.innerText = "❌ Error al borrar."; }
};

saveBtn.onclick = async () => {
    statusMsg.innerText = "☁️ Sincronizando...";
    const updatedData = {};
    Object.keys(currentData).forEach(key => { updatedData[key] = document.getElementById(`edit-${key}`).value; });
    try {
        const res = await fetch('/api/publish/confirm-publish', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productData: updatedData, esCombo: isCombo.checked, componentes: compArea.value })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        statusMsg.innerText = "🚀 ¡ÉXITO! Sincronizado.";
        mainForm.reset();
        editorArea.classList.add('hidden');
    } catch (err) { statusMsg.innerText = "❌ Error al guardar."; }
};
