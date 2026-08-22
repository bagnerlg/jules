/**
 * GCI ADMIN - Módulo de Carga y Gestión de Archivos Locales (Edición Glossy)
 */

export function renderFileManagerModule(container) {
    const localFiles = JSON.parse(localStorage.getItem('gci_uploaded_files') || '[]');

    container.innerHTML = `
        <div class="module-header-block">
            <div>
                <h1 class="module-title"><i class="fa-solid fa-folder-open" style="color: #0284c7;"></i> Gestor de Archivos Locales</h1>
                <p class="module-subtitle">Carga, inspecciona y administra archivos locales para procesamiento o envío hacia las APIs conectadas.</p>
            </div>
            <div>
                <button class="btn-gci btn-secondary" id="btn-clear-files">
                    <i class="fa-solid fa-trash-can"></i> Limpiar Todo
                </button>
            </div>
        </div>

        <!-- Zona Drag & Drop Metallic -->
        <div class="gci-card" style="margin-bottom: 28px; padding-top: 36px;">
            <div class="gci-card-header-badge" style="background: var(--glossy-sky);">
                <i class="fa-solid fa-cloud-arrow-up"></i>
            </div>

            <div class="dropzone-area" id="gci-dropzone">
                <div class="dropzone-icon">
                    <i class="fa-solid fa-file-circle-plus"></i>
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                    Arrastra y suelta tus archivos aquí
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 18px;">
                    Soporta imágenes (PNG, JPG), documentos (PDF, CSV, XLSX, JSON) hasta 50MB.
                </p>
                <input type="file" id="file-input-hidden" multiple style="display: none;">
                <button type="button" class="btn-gci btn-primary" id="btn-browse-files">
                    <i class="fa-solid fa-folder-open"></i> Seleccionar Archivos
                </button>
            </div>
        </div>

        <!-- Lista / Tabla de Archivos Locales -->
        <div class="gci-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">
                    <i class="fa-solid fa-list" style="color: #2563eb; margin-right: 8px;"></i>
                    Archivos Cargados (<span id="files-count">${localFiles.length}</span>)
                </h3>
                <span class="badge-tag">Almacenados Localmente</span>
            </div>

            <div class="gci-table-wrapper">
                <table class="gci-table" id="files-table">
                    <thead>
                        <tr>
                            <th>Nombre de Archivo</th>
                            <th>Tipo</th>
                            <th>Tamaño</th>
                            <th>Fecha de Carga</th>
                            <th style="text-align: right;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="files-tbody">
                        ${renderFilesRows(localFiles)}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    setupFileEvents(container);
}

function renderFilesRows(files) {
    if (!files || files.length === 0) {
        return `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-folder-closed" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: #94a3b8;"></i>
                    No hay archivos cargados aún. Utiliza la zona superior para subir tus primeros archivos.
                </td>
            </tr>
        `;
    }

    return files.map((file, index) => `
        <tr>
            <td style="font-weight: 700;">
                <i class="${getFileIcon(file.type)}" style="margin-right: 8px; color: #2563eb;"></i>
                ${escapeHtml(file.name)}
            </td>
            <td><span class="badge-tag">${escapeHtml(file.type || 'Desconocido')}</span></td>
            <td style="color: var(--text-muted); font-weight: 600;">${formatBytes(file.size)}</td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${new Date(file.uploadedAt).toLocaleString()}</td>
            <td style="text-align: right;">
                <button class="btn-gci btn-secondary btn-delete-file" data-index="${index}" style="padding: 4px 12px; font-size: 0.75rem; color: var(--status-danger);">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

function setupFileEvents(container) {
    const dropzone = container.querySelector('#gci-dropzone');
    const fileInput = container.querySelector('#file-input-hidden');
    const btnBrowse = container.querySelector('#btn-browse-files');
    const btnClear = container.querySelector('#btn-clear-files');

    if (btnBrowse && fileInput) {
        btnBrowse.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFilesSelected(e.target.files));
    }

    if (dropzone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files) {
                handleFilesSelected(dt.files);
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            localStorage.removeItem('gci_uploaded_files');
            renderFileManagerModule(container);
        });
    }

    container.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-file')) {
            const idx = parseInt(e.target.closest('.btn-delete-file').getAttribute('data-index'), 10);
            deleteSingleFile(idx, container);
        }
    });
}

function handleFilesSelected(fileList) {
    if (!fileList || fileList.length === 0) return;

    const currentFiles = JSON.parse(localStorage.getItem('gci_uploaded_files') || '[]');

    Array.from(fileList).forEach(file => {
        currentFiles.push({
            name: file.name,
            size: file.size,
            type: file.type || file.name.split('.').pop(),
            uploadedAt: new Date().toISOString()
        });
    });

    localStorage.setItem('gci_uploaded_files', JSON.stringify(currentFiles));

    const container = document.getElementById('gci-content-area');
    renderFileManagerModule(container);
}

function deleteSingleFile(index, container) {
    let currentFiles = JSON.parse(localStorage.getItem('gci_uploaded_files') || '[]');
    currentFiles.splice(index, 1);
    localStorage.setItem('gci_uploaded_files', JSON.stringify(currentFiles));
    renderFileManagerModule(container);
}

function getFileIcon(typeStr) {
    if (!typeStr) return 'fa-solid fa-file';
    if (typeStr.includes('image')) return 'fa-solid fa-file-image';
    if (typeStr.includes('pdf')) return 'fa-solid fa-file-pdf';
    if (typeStr.includes('csv') || typeStr.includes('sheet') || typeStr.includes('excel')) return 'fa-solid fa-file-excel';
    if (typeStr.includes('json') || typeStr.includes('code')) return 'fa-solid fa-file-code';
    return 'fa-solid fa-file';
}

function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
