/**
 * ADMIN BÁSICO - FRONTEND CORE APPLICATION JS
 */

const app = {
  state: {
    currentUser: null,
    users: [],
    connections: {},
    modules: [],
    catalog: [],
    salesAndExpenses: [],
    logs: [],
    activeView: 'landing',
    activeEditingModuleKey: 'catalogo',
    socket: null
  },

  init() {
    console.log('🚀 Inicializando Admin Básico App...');

    // Connect WebSocket gracefully if socket.io is available
    if (typeof io !== 'undefined') {
      try {
        this.state.socket = io();
        this.setupWebSocketListeners();
      } catch (e) {
        console.warn('Socket.io client notice:', e);
      }
    }

    // Load initial data from localStorage or create default state
    this.loadStateFromStorage();

    // Check saved session
    const savedUser = localStorage.getItem('admin_current_user');
    if (savedUser) {
      this.state.currentUser = JSON.parse(savedUser);
    }

    this.renderUserBar();
    this.renderTabs();
    this.renderView(this.state.activeView || 'landing');
  },

  setupWebSocketListeners() {
    const socket = this.state.socket;
    if (!socket) return;

    socket.on('whatsapp-qr', (data) => {
      const qrContainer = document.getElementById('whatsapp-qr-container');
      const msgContainer = document.getElementById('msg-conn-whatsapp');
      if (qrContainer) {
        qrContainer.innerHTML = `<img src="${data.qr}" alt="Código QR WhatsApp"><p style="font-size:11px; margin-top:6px; color:#555;">Escanea con WhatsApp Business</p>`;
      }
      if (msgContainer) {
        msgContainer.className = 'conn-status-msg success';
        msgContainer.innerText = 'Código QR generado. Listo para ser escaneado.';
      }
    });

    socket.on('whatsapp-connected', (data) => {
      const qrContainer = document.getElementById('whatsapp-qr-container');
      const msgContainer = document.getElementById('msg-conn-whatsapp');
      if (qrContainer) {
        qrContainer.innerHTML = `<div style="color:#27AE60; font-weight:bold;"><i class="fa-solid fa-circle-check">✔</i><p style="margin-top:8px;">WhatsApp Vinculado</p></div>`;
      }
      if (msgContainer) {
        msgContainer.className = 'conn-status-msg success';
        msgContainer.innerText = `Conectado como: ${data.user.name} (${data.user.id})`;
      }
      this.state.connections.whatsapp = { status: 'conectado', account: data.user.name };
      this.saveStateToStorage();
    });
  },

  loadStateFromStorage() {
    // Default system users if none exist
    const savedUsers = localStorage.getItem('admin_users');
    if (savedUsers) {
      this.state.users = JSON.parse(savedUsers);
    } else {
      this.state.users = [
        {
          id: 'usr-1',
          name: 'Administrador Principal',
          email: 'admin@admin.com',
          password: 'admin123',
          role: 'Administrador',
          status: 'Activo',
          avatar: 'https://ui-avatars.com/api/?name=Admin+Basico&background=3F51B5&color=fff',
          connections: ['googlesheets', 'openai', 'whatsapp', 'supabase', 'postgres', 'facebook', 'csv'],
          permissions: ['landing', 'dashboard', 'users', 'connections', 'modules-builder', 'catalogo', 'sales-expenses', 'logs']
        },
        {
          id: 'usr-2',
          name: 'Carlos Vendedor',
          email: 'carlos@empresa.com',
          password: '123',
          role: 'Vendedor',
          status: 'Activo',
          avatar: 'https://ui-avatars.com/api/?name=Carlos+Vendedor&background=009688&color=fff',
          connections: ['googlesheets'],
          permissions: ['landing', 'catalogo', 'sales-expenses']
        }
      ];
      localStorage.setItem('admin_users', JSON.stringify(this.state.users));
    }

    // Default connections
    const savedConnections = localStorage.getItem('admin_connections');
    if (savedConnections) {
      this.state.connections = JSON.parse(savedConnections);
    } else {
      this.state.connections = {
        googlesheets: { url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-example/pub?output=csv', status: 'Inactiva' },
        openai: { apiKey: '', status: 'Inactiva' },
        whatsapp: { status: 'Desconectado' },
        supabase: { url: '', key: '', status: 'Inactiva' },
        postgres: { host: 'localhost', db: 'admin_db', user: 'postgres', status: 'Inactiva' },
        facebook: { accessToken: '', status: 'Inactiva' },
        csv: { path: '', status: 'Inactiva' }
      };
      localStorage.setItem('admin_connections', JSON.stringify(this.state.connections));
    }

    // Default system modules matching pestañas.jpg themes
    const savedModules = localStorage.getItem('admin_modules');
    if (savedModules) {
      this.state.modules = JSON.parse(savedModules);
    } else {
      this.state.modules = [
        {
          key: 'landing',
          name: 'Presentación',
          icon: '🏠',
          color: 'teal',
          isSystem: true
        },
        {
          key: 'dashboard',
          name: 'Dashboard',
          icon: '📊',
          color: 'gold',
          isSystem: true
        },
        {
          key: 'users',
          name: 'Usuarios',
          icon: '👤',
          color: 'coral',
          isSystem: true
        },
        {
          key: 'connections',
          name: 'Conexiones',
          icon: '🔌',
          color: 'green',
          isSystem: true
        },
        {
          key: 'modules-builder',
          name: 'Diseñador IA',
          icon: '🪄',
          color: 'purple',
          isSystem: true
        },
        {
          key: 'catalogo',
          name: 'Catálogo',
          icon: '📦',
          color: 'blue',
          isSystem: false,
          fields: [
            { name: 'Código / SKU', key: 'sku', type: 'text', required: true, readSource: 'Google Sheets', writeSource: 'Postgres' },
            { name: 'Descripción / Producto', key: 'descripcion', type: 'text', required: true, readSource: 'Google Sheets', writeSource: 'Postgres' },
            { name: 'Precio Venta (Q)', key: 'precio', type: 'number', required: true, readSource: 'Google Sheets', writeSource: 'Postgres' },
            { name: 'Existencia / Stock', key: 'stock', type: 'number', required: false, readSource: 'Supabase', writeSource: 'Supabase' }
          ]
        },
        {
          key: 'sales-expenses',
          name: 'Ventas y Gastos',
          icon: '🧾',
          color: 'coral',
          isSystem: false
        },
        {
          key: 'logs',
          name: 'Logs Audit',
          icon: '📋',
          color: 'teal',
          isSystem: true
        }
      ];
      localStorage.setItem('admin_modules', JSON.stringify(this.state.modules));
    }

    // Default Catalog items
    const savedCatalog = localStorage.getItem('admin_catalog');
    if (savedCatalog) {
      this.state.catalog = JSON.parse(savedCatalog);
    } else {
      this.state.catalog = [
        { id: 'cat-1', sku: 'MOTO-125', descripcion: 'Motocicleta 125cc Roja', precio: 8500, stock: 5 },
        { id: 'cat-2', sku: 'CASCO-DOT', descripcion: 'Casco Certificado DOT', precio: 350, stock: 12 }
      ];
      localStorage.setItem('admin_catalog', JSON.stringify(this.state.catalog));
    }

    // Default Transactions
    const savedSales = localStorage.getItem('admin_sales');
    if (savedSales) {
      this.state.salesAndExpenses = JSON.parse(savedSales);
    } else {
      this.state.salesAndExpenses = [
        { id: 'tx-1', date: new Date().toISOString(), type: 'Venta', user: 'admin@admin.com', userName: 'Administrador Principal', concept: 'Venta de Motocicleta 125cc', amount: 8500 },
        { id: 'tx-2', date: new Date().toISOString(), type: 'Gasto', user: 'carlos@empresa.com', userName: 'Carlos Vendedor', concept: 'Pago de Combustible de Reparto', amount: 150 }
      ];
      localStorage.setItem('admin_sales', JSON.stringify(this.state.salesAndExpenses));
    }

    // Default Logs
    const savedLogs = localStorage.getItem('admin_logs');
    if (savedLogs) {
      this.state.logs = JSON.parse(savedLogs);
    } else {
      this.state.logs = [
        { date: new Date().toISOString(), user: 'admin@admin.com', module: 'Sistema', action: 'Inicio de Sistema Central Admin Básico', details: 'Plataforma lista' }
      ];
      localStorage.setItem('admin_logs', JSON.stringify(this.state.logs));
    }
  },

  saveStateToStorage() {
    localStorage.setItem('admin_users', JSON.stringify(this.state.users));
    localStorage.setItem('admin_connections', JSON.stringify(this.state.connections));
    localStorage.setItem('admin_modules', JSON.stringify(this.state.modules));
    localStorage.setItem('admin_catalog', JSON.stringify(this.state.catalog));
    localStorage.setItem('admin_sales', JSON.stringify(this.state.salesAndExpenses));
    localStorage.setItem('admin_logs', JSON.stringify(this.state.logs));
  },

  logActivity(moduleName, action, details = '') {
    const userEmail = this.state.currentUser ? this.state.currentUser.email : 'Invitado / Anónimo';
    const newLog = {
      date: new Date().toISOString(),
      user: userEmail,
      module: moduleName,
      action: action,
      details: details
    };
    this.state.logs.unshift(newLog);
    if (this.state.logs.length > 200) this.state.logs.pop();
    this.saveStateToStorage();
    this.renderLogs();
  },

  renderUserBar() {
    const userBar = document.getElementById('user-bar');
    if (!userBar) return;

    if (this.state.currentUser) {
      userBar.innerHTML = `
        <div class="user-profile-badge">
          <img src="${this.state.currentUser.avatar || 'https://ui-avatars.com/api/?name=User'}" class="user-avatar-mini" alt="User Avatar">
          <div>
            <div style="font-size:12px; font-weight:700; color:#FFF;">${this.state.currentUser.name}</div>
            <div style="font-size:10px; color:#BDC3C7;">${this.state.currentUser.role}</div>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="app.handleLogout()" style="color:#FFF; border-color:rgba(255,255,255,0.3);">
          🚪 Salir
        </button>
      `;
    } else {
      userBar.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="app.showLoginModal()">
          🔑 Iniciar Sesión
        </button>
      `;
    }
  },

  renderTabs() {
    const tabsList = document.getElementById('nav-tabs-list');
    if (!tabsList) return;

    tabsList.innerHTML = '';

    const allowedPermissions = this.state.currentUser ? (this.state.currentUser.permissions || []) : ['landing'];

    this.state.modules.forEach((mod) => {
      // Admin sees all tabs; non-admins or guests see permitted tabs
      if (this.state.currentUser && this.state.currentUser.role !== 'Administrador' && !allowedPermissions.includes(mod.key) && mod.key !== 'landing') {
        return;
      }

      const isActive = this.state.activeView === mod.key ? 'active' : '';
      const tabEl = document.createElement('a');
      tabEl.href = 'javascript:void(0)';
      tabEl.className = `nav-tab-item ${mod.color || 'teal'} ${isActive}`;
      tabEl.onclick = () => this.switchView(mod.key);

      // Replicate pestañas.jpg structure: White icon block + accent strip + vibrant title banner
      tabEl.innerHTML = `
        <div class="nav-tab-content">
          <div class="nav-tab-icon-block">${mod.icon || '❖'}</div>
          <div class="nav-tab-accent-strip"></div>
          <div class="nav-tab-title-banner">${mod.name}</div>
        </div>
      `;
      tabsList.appendChild(tabEl);
    });
  },

  switchView(viewKey) {
    this.state.activeView = viewKey;
    this.renderTabs();
    this.renderView(viewKey);
    this.logActivity(viewKey, 'Navegación Módulo', `Ingresó a ${viewKey}`);
  },

  renderView(viewKey) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

    const targetSection = document.getElementById(`view-${viewKey}`);
    if (targetSection) {
      targetSection.classList.add('active');
    } else {
      const catalogSection = document.getElementById('view-catalogo');
      if (catalogSection) catalogSection.classList.add('active');
    }

    switch (viewKey) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'users':
        this.renderUsers();
        break;
      case 'connections':
        this.renderConnectionsView();
        break;
      case 'modules-builder':
        this.renderModulesBuilder();
        break;
      case 'catalogo':
        this.renderCatalog();
        break;
      case 'sales-expenses':
        this.renderSalesExpenses();
        break;
      case 'logs':
        this.renderLogs();
        break;
    }
  },

  // --- DASHBOARD RENDERER ---
  renderDashboard() {
    const totalUsers = this.state.users.length;
    const activeUsers = this.state.users.filter(u => u.status === 'Activo').length;
    const activeConnCount = Object.values(this.state.connections).filter(c => c.status === 'Exitoso' || c.status === 'conectado').length;
    const totalModules = this.state.modules.length;

    document.getElementById('dash-total-users').innerText = totalUsers;
    document.getElementById('dash-active-users').innerText = activeUsers;
    document.getElementById('dash-active-connections').innerText = activeConnCount;
    document.getElementById('dash-total-modules').innerText = totalModules;

    // Analytics table (Sales & Expenses by User)
    const analyticsBody = document.getElementById('dash-analytics-table');
    if (analyticsBody) {
      analyticsBody.innerHTML = '';

      this.state.users.forEach(usr => {
        const userSales = this.state.salesAndExpenses
          .filter(t => t.user === usr.email && t.type === 'Venta')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const userExpenses = this.state.salesAndExpenses
          .filter(t => t.user === usr.email && t.type === 'Gasto')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const balance = userSales - userExpenses;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="${usr.avatar}" style="width:28px; height:28px; border-radius:50%;" alt="User">
              <strong>${usr.name}</strong>
            </div>
          </td>
          <td><span class="badge badge-info">${usr.role}</span></td>
          <td style="color:#27AE60; font-weight:700;">Q${userSales.toFixed(2)}</td>
          <td style="color:#E74C3C; font-weight:700;">Q${userExpenses.toFixed(2)}</td>
          <td style="font-weight:700; color:${balance >= 0 ? '#27AE60' : '#E74C3C'};">
            Q${balance.toFixed(2)}
          </td>
        `;
        analyticsBody.appendChild(row);
      });
    }

    // Connections Status Widget
    const connWidget = document.getElementById('dash-connections-status');
    if (connWidget) {
      connWidget.innerHTML = '';
      const connTypes = [
        { key: 'googlesheets', label: 'Google Sheets CSV', icon: '📄' },
        { key: 'openai', label: 'OpenAI API (IA)', icon: '🧠' },
        { key: 'whatsapp', label: 'WhatsApp Baileys', icon: '💬' },
        { key: 'supabase', label: 'Supabase Postgres', icon: '⚡' },
        { key: 'postgres', label: 'PostgreSQL / SQL', icon: '🗄' },
        { key: 'facebook', label: 'Facebook Graph API', icon: '🌐' }
      ];

      connTypes.forEach(ct => {
        const connObj = this.state.connections[ct.key] || {};
        const isOk = connObj.status === 'Exitoso' || connObj.status === 'conectado';

        const item = document.createElement('div');
        item.style.cssText = 'display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee; font-size:13px;';
        item.innerHTML = `
          <span>${ct.icon} ${ct.label}</span>
          <span class="badge ${isOk ? 'badge-success' : 'badge-danger'}">
            ${isOk ? 'ACTIVO' : 'INACTIVO'}
          </span>
        `;
        connWidget.appendChild(item);
      });
    }
  },

  // --- USERS RENDERER & ACTIONS ---
  renderUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    this.state.users.forEach(usr => {
      const row = document.createElement('tr');
      const connTags = (usr.connections || []).map(c => `<span class="badge badge-info">${c}</span>`).join(' ');

      row.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${usr.avatar}" style="width:36px; height:36px; border-radius:50%;" alt="User">
            <div>
              <strong style="display:block;">${usr.name}</strong>
              <span style="font-size:11px; color:#7F8C8D;">${usr.role}</span>
            </div>
          </div>
        </td>
        <td>${usr.email}</td>
        <td><span class="badge badge-info">${usr.role}</span></td>
        <td>
          <span class="badge ${usr.status === 'Activo' ? 'badge-success' : 'badge-danger'}">
            ${usr.status}
          </span>
        </td>
        <td>${connTags || '<em>Ninguna</em>'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.toggleUserStatus('${usr.id}')">
            ⚡ ${usr.status === 'Activo' ? 'Desactivar' : 'Activar'}
          </button>
          <button class="btn btn-primary btn-sm" onclick="app.editUser('${usr.id}')">
            ✏ Editar
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  openUserModal() {
    document.getElementById('user-edit-id').value = '';
    document.getElementById('user-name').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-avatar').value = '';
    document.getElementById('user-modal-title').innerText = 'Crear Nuevo Usuario';

    this.renderPermissionsCheckboxes([]);
    this.openModal('modal-user');
  },

  renderPermissionsCheckboxes(selectedPerms = []) {
    const container = document.getElementById('user-permissions-checkboxes');
    if (!container) return;
    container.innerHTML = '';

    this.state.modules.forEach(mod => {
      const isChecked = selectedPerms.includes(mod.key) ? 'checked' : '';
      const item = document.createElement('label');
      item.className = 'checkbox-item';
      item.innerHTML = `
        <input type="checkbox" value="${mod.key}" ${isChecked}> ${mod.name}
      `;
      container.appendChild(item);
    });
  },

  saveUser(e) {
    e.preventDefault();
    const id = document.getElementById('user-edit-id').value;
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const status = document.getElementById('user-status').value;
    const avatar = document.getElementById('user-avatar').value || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3F51B5&color=fff`;

    const checkedBoxes = document.querySelectorAll('#user-permissions-checkboxes input[type="checkbox"]:checked');
    const permissions = Array.from(checkedBoxes).map(cb => cb.value);

    if (id) {
      const usr = this.state.users.find(u => u.id === id);
      if (usr) {
        usr.name = name;
        usr.email = email;
        if (password) usr.password = password;
        usr.role = role;
        usr.status = status;
        usr.avatar = avatar;
        usr.permissions = permissions;
      }
    } else {
      const newUser = {
        id: 'usr-' + Date.now(),
        name,
        email,
        password: password || '123456',
        role,
        status,
        avatar,
        connections: ['googlesheets', 'openai'],
        permissions
      };
      this.state.users.push(newUser);
    }

    this.saveStateToStorage();
    this.closeModal('modal-user');
    this.renderUsers();
    this.logActivity('Usuarios', id ? 'Edición de Usuario' : 'Creación de Usuario', `Usuario: ${email}`);
  },

  toggleUserStatus(userId) {
    const usr = this.state.users.find(u => u.id === userId);
    if (usr) {
      usr.status = usr.status === 'Activo' ? 'Inactivo' : 'Activo';
      this.saveStateToStorage();
      this.renderUsers();
      this.logActivity('Usuarios', 'Cambio de Estado', `Usuario ${usr.email} cambió a ${usr.status}`);
    }
  },

  editUser(userId) {
    const usr = this.state.users.find(u => u.id === userId);
    if (!usr) return;

    document.getElementById('user-edit-id').value = usr.id;
    document.getElementById('user-name').value = usr.name;
    document.getElementById('user-email').value = usr.email;
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = usr.role;
    document.getElementById('user-status').value = usr.status;
    document.getElementById('user-avatar').value = usr.avatar;
    document.getElementById('user-modal-title').innerText = 'Editar Usuario';

    this.renderPermissionsCheckboxes(usr.permissions || []);
    this.openModal('modal-user');
  },

  // --- CONNECTIONS RENDERER & ACTIONS ---
  renderConnectionsView() {
    const conn = this.state.connections;
    if (conn.googlesheets && conn.googlesheets.url) {
      document.getElementById('conn-gs-url').value = conn.googlesheets.url;
    }
    if (conn.openai && conn.openai.apiKey) {
      document.getElementById('conn-openai-key').value = conn.openai.apiKey;
    }
    if (conn.supabase) {
      document.getElementById('conn-supa-url').value = conn.supabase.url || '';
      document.getElementById('conn-supa-key').value = conn.supabase.key || '';
    }
    if (conn.postgres) {
      document.getElementById('conn-pg-host').value = conn.postgres.host || '';
      document.getElementById('conn-pg-db').value = conn.postgres.db || '';
      document.getElementById('conn-pg-user').value = conn.postgres.user || '';
    }
    if (conn.facebook) {
      document.getElementById('conn-fb-token').value = conn.facebook.accessToken || '';
    }
    if (conn.csv) {
      document.getElementById('conn-file-path').value = conn.csv.path || '';
    }
  },

  async testConnection(type) {
    const msgEl = document.getElementById(`msg-conn-${type}`);
    if (msgEl) {
      msgEl.className = 'conn-status-msg';
      msgEl.innerText = 'Probando conexión...';
      msgEl.style.display = 'block';
    }

    let config = {};
    if (type === 'openai') config = { apiKey: document.getElementById('conn-openai-key').value };
    if (type === 'googlesheets') config = { url: document.getElementById('conn-gs-url').value };
    if (type === 'facebook') config = { accessToken: document.getElementById('conn-fb-token').value };

    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config })
      });
      const data = await res.json();

      if (msgEl) {
        if (data.success) {
          msgEl.className = 'conn-status-msg success';
          msgEl.innerText = '✅ ' + data.message;
          if (!this.state.connections[type]) this.state.connections[type] = {};
          this.state.connections[type].status = 'Exitoso';
          this.saveStateToStorage();
        } else {
          msgEl.className = 'conn-status-msg error';
          msgEl.innerText = '❌ ' + data.message;
        }
      }
    } catch (err) {
      if (msgEl) {
        msgEl.className = 'conn-status-msg error';
        msgEl.innerText = '❌ Error de red: ' + err.message;
      }
    }
  },

  saveConnection(type) {
    if (!this.state.connections[type]) this.state.connections[type] = {};

    if (type === 'googlesheets') this.state.connections[type].url = document.getElementById('conn-gs-url').value;
    if (type === 'openai') this.state.connections[type].apiKey = document.getElementById('conn-openai-key').value;
    if (type === 'supabase') {
      this.state.connections[type].url = document.getElementById('conn-supa-url').value;
      this.state.connections[type].key = document.getElementById('conn-supa-key').value;
    }
    if (type === 'postgres') {
      this.state.connections[type].host = document.getElementById('conn-pg-host').value;
      this.state.connections[type].db = document.getElementById('conn-pg-db').value;
      this.state.connections[type].user = document.getElementById('conn-pg-user').value;
    }
    if (type === 'facebook') this.state.connections[type].accessToken = document.getElementById('conn-fb-token').value;
    if (type === 'csv') this.state.connections[type].path = document.getElementById('conn-file-path').value;

    this.state.connections[type].status = 'Exitoso';
    this.saveStateToStorage();

    const msgEl = document.getElementById(`msg-conn-${type}`);
    if (msgEl) {
      msgEl.className = 'conn-status-msg success';
      msgEl.innerText = '💾 Configuración guardada correctamente';
      msgEl.style.display = 'block';
    }
    this.logActivity('Conexiones', 'Guardar Configuración', `Conexión: ${type}`);
  },

  startWhatsAppQR() {
    if (this.state.socket) {
      this.state.socket.emit('start-whatsapp');
      const msgEl = document.getElementById('msg-conn-whatsapp');
      if (msgEl) {
        msgEl.className = 'conn-status-msg';
        msgEl.innerText = 'Solicitando QR al servidor de Baileys...';
        msgEl.style.display = 'block';
      }
    }
  },

  simulateWhatsAppConnect() {
    if (this.state.socket) {
      this.state.socket.emit('simulate-whatsapp-connect');
    }
  },

  // --- MODULES & AI FIELDS BUILDER ---
  renderModulesBuilder() {
    const pillsContainer = document.getElementById('modules-list-selector');
    if (!pillsContainer) return;
    pillsContainer.innerHTML = '';

    this.state.modules.forEach(mod => {
      const pill = document.createElement('div');
      pill.className = `module-pill ${this.state.activeEditingModuleKey === mod.key ? 'active' : ''}`;
      pill.onclick = () => this.selectModuleToEdit(mod.key);
      pill.innerHTML = `${mod.icon || '❖'} ${mod.name}`;
      pillsContainer.appendChild(pill);
    });

    this.renderSelectedModuleFields();
  },

  selectModuleToEdit(modKey) {
    this.state.activeEditingModuleKey = modKey;
    this.renderModulesBuilder();
  },

  renderSelectedModuleFields() {
    const editor = document.getElementById('selected-module-editor');
    const mod = this.state.modules.find(m => m.key === this.state.activeEditingModuleKey);
    if (!mod || !editor) return;

    editor.style.display = 'block';
    document.getElementById('editor-module-title').innerText = `Módulo: ${mod.name}`;
    document.getElementById('editor-module-key').innerText = mod.key;

    const tbody = document.getElementById('module-fields-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const fields = mod.fields || [];
    fields.forEach((f, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="text" class="form-control form-control-sm" value="${f.name}" onchange="app.updateFieldProp(${idx}, 'name', this.value)"></td>
        <td><code>${f.key}</code></td>
        <td>
          <select class="form-control form-control-sm" onchange="app.updateFieldProp(${idx}, 'type', this.value)">
            <option value="text" ${f.type==='text'?'selected':''}>Texto</option>
            <option value="number" ${f.type==='number'?'selected':''}>Número</option>
            <option value="date" ${f.type==='date'?'selected':''}>Fecha</option>
            <option value="image" ${f.type==='image'?'selected':''}>Imagen / URL</option>
          </select>
        </td>
        <td>
          <select class="form-control form-control-sm" onchange="app.updateFieldProp(${idx}, 'readSource', this.value)">
            <option value="Google Sheets" ${f.readSource==='Google Sheets'?'selected':''}>Google Sheets</option>
            <option value="Supabase" ${f.readSource==='Supabase'?'selected':''}>Supabase DB</option>
            <option value="Postgres" ${f.readSource==='Postgres'?'selected':''}>PostgreSQL</option>
            <option value="Manual" ${f.readSource==='Manual'?'selected':''}>Entrada Manual</option>
          </select>
        </td>
        <td>
          <select class="form-control form-control-sm" onchange="app.updateFieldProp(${idx}, 'writeSource', this.value)">
            <option value="Postgres" ${f.writeSource==='Postgres'?'selected':''}>PostgreSQL</option>
            <option value="Supabase" ${f.writeSource==='Supabase'?'selected':''}>Supabase DB</option>
            <option value="Google Sheets" ${f.writeSource==='Google Sheets'?'selected':''}>Google Sheets</option>
            <option value="Local" ${f.writeSource==='Local'?'selected':''}>Almacenamiento Local</option>
          </select>
        </td>
        <td>
          <input type="checkbox" ${f.required ? 'checked' : ''} onchange="app.updateFieldProp(${idx}, 'required', this.checked)">
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="app.removeFieldFromModule(${idx})">🗑</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  updateFieldProp(idx, prop, value) {
    const mod = this.state.modules.find(m => m.key === this.state.activeEditingModuleKey);
    if (mod && mod.fields && mod.fields[idx]) {
      mod.fields[idx][prop] = value;
    }
  },

  addFieldToActiveModule() {
    const mod = this.state.modules.find(m => m.key === this.state.activeEditingModuleKey);
    if (!mod) return;
    if (!mod.fields) mod.fields = [];

    const newKey = 'campo_' + Date.now().toString().slice(-4);
    mod.fields.push({
      name: 'Nuevo Campo',
      key: newKey,
      type: 'text',
      required: false,
      readSource: 'Manual',
      writeSource: 'Local'
    });

    this.renderSelectedModuleFields();
  },

  removeFieldFromModule(idx) {
    const mod = this.state.modules.find(m => m.key === this.state.activeEditingModuleKey);
    if (mod && mod.fields) {
      mod.fields.splice(idx, 1);
      this.renderSelectedModuleFields();
    }
  },

  async suggestFieldsWithAI() {
    const businessType = document.getElementById('ai-business-type').value.trim();
    if (!businessType) {
      alert('Por favor ingresa el giro de negocio (ej. Venta de Motos, Taller Mecánico, Boutique)');
      return;
    }

    const mod = this.state.modules.find(m => m.key === this.state.activeEditingModuleKey);
    const apiKey = this.state.connections.openai?.apiKey;

    if (!apiKey) {
      alert('Primero debes configurar y guardar la API Key de OpenAI en la pestaña de Conexiones');
      return;
    }

    try {
      const res = await fetch('/api/suggest-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          moduleName: mod.name,
          apiKey
        })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.fields)) {
        mod.fields = data.fields;
        this.renderSelectedModuleFields();
        this.saveStateToStorage();
        alert(`✨ Se sugirieron ${data.fields.length} campos con éxito según el giro "${businessType}"`);
        this.logActivity('Diseñador IA', 'Campos Sugeridos por IA', `Giro: ${businessType}`);
      } else {
        alert('Error al obtener campos IA: ' + data.message);
      }
    } catch (err) {
      alert('Error de conexión al sugerir campos IA: ' + err.message);
    }
  },

  saveActiveModuleSchema() {
    this.saveStateToStorage();
    alert('✅ Estructura del módulo guardada exitosamente.');
    this.logActivity('Diseñador IA', 'Estructura Guardada', `Módulo: ${this.state.activeEditingModuleKey}`);
  },

  openNewModuleModal() {
    this.openModal('modal-new-module');
  },

  createNewModule(e) {
    e.preventDefault();
    const name = document.getElementById('new-mod-name').value.trim();
    const icon = document.getElementById('new-mod-icon').value.trim() || '🛠';
    const color = document.getElementById('new-mod-color').value;

    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const newMod = {
      key,
      name,
      icon,
      color,
      isSystem: false,
      fields: [
        { name: 'Nombre / Título', key: 'nombre', type: 'text', required: true, readSource: 'Manual', writeSource: 'Local' }
      ]
    };

    this.state.modules.push(newMod);
    this.saveStateToStorage();
    this.closeModal('modal-new-module');
    this.renderTabs();
    this.selectModuleToEdit(key);
    this.logActivity('Diseñador IA', 'Nuevo Módulo Creado', `Módulo: ${name}`);
  },

  // --- CATALOG MODULE ---
  renderCatalog() {
    const head = document.getElementById('catalog-table-head');
    const body = document.getElementById('catalog-table-body');
    const catalogMod = this.state.modules.find(m => m.key === 'catalogo') || {};
    const fields = catalogMod.fields || [
      { name: 'SKU', key: 'sku' },
      { name: 'Descripción', key: 'descripcion' },
      { name: 'Precio (Q)', key: 'precio' },
      { name: 'Stock', key: 'stock' }
    ];

    if (head) {
      head.innerHTML = `
        <tr>
          ${fields.map(f => `<th>${f.name}</th>`).join('')}
          <th>Acciones</th>
        </tr>
      `;
    }

    if (body) {
      body.innerHTML = '';
      this.state.catalog.forEach((item, idx) => {
        const row = document.createElement('tr');
        const cells = fields.map(f => `<td>${item[f.key] !== undefined ? item[f.key] : '-'}</td>`).join('');
        row.innerHTML = `
          ${cells}
          <td>
            <button class="btn btn-danger btn-sm" onclick="app.deleteCatalogItem(${idx})">🗑 Eliminat</button>
          </td>
        `;
        body.appendChild(row);
      });
    }
  },

  openCatalogItemModal() {
    const container = document.getElementById('dynamic-catalog-form-fields');
    const catalogMod = this.state.modules.find(m => m.key === 'catalogo') || {};
    const fields = catalogMod.fields || [];

    if (container) {
      container.innerHTML = fields.map(f => `
        <div class="form-group">
          <label>${f.name}:</label>
          <input type="${f.type === 'number' ? 'number' : 'text'}" name="${f.key}" class="form-control" ${f.required ? 'required' : ''}>
        </div>
      `).join('');
    }

    this.openModal('modal-catalog-item');
  },

  saveCatalogItem(e) {
    e.preventDefault();
    const form = document.getElementById('form-catalog-fields');
    const formData = new FormData(form);
    const newItem = { id: 'cat-' + Date.now() };

    for (let [key, val] of formData.entries()) {
      newItem[key] = val;
    }

    this.state.catalog.push(newItem);
    this.saveStateToStorage();
    this.closeModal('modal-catalog-item');
    this.renderCatalog();
    this.logActivity('Catálogo', 'Nuevo Ítem Agregado', `SKU/Descripción: ${newItem.sku || newItem.descripcion || 'Ítem'}`);
  },

  deleteCatalogItem(idx) {
    this.state.catalog.splice(idx, 1);
    this.saveStateToStorage();
    this.renderCatalog();
  },

  // --- SALES & EXPENSES MODULE ---
  renderSalesExpenses() {
    const tbody = document.getElementById('transactions-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    this.state.salesAndExpenses.forEach(t => {
      const row = document.createElement('tr');
      const isSale = t.type === 'Venta';

      row.innerHTML = `
        <td>${new Date(t.date).toLocaleString()}</td>
        <td>
          <span class="badge ${isSale ? 'badge-success' : 'badge-danger'}">
            ${t.type}
          </span>
        </td>
        <td>${t.userName || t.user}</td>
        <td>${t.concept}</td>
        <td style="font-weight:700; color:${isSale ? '#27AE60' : '#E74C3C'};">
          ${isSale ? '+' : '-'}Q${Number(t.amount).toFixed(2)}
        </td>
        <td><span class="badge badge-success">Completado</span></td>
      `;
      tbody.appendChild(row);
    });
  },

  openTransactionModal() {
    this.openModal('modal-transaction');
  },

  saveTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('trans-type').value;
    const concept = document.getElementById('trans-concept').value;
    const amount = Number(document.getElementById('trans-amount').value);

    const currentUser = this.state.currentUser || { email: 'admin@admin.com', name: 'Administrador Principal' };

    const newTx = {
      id: 'tx-' + Date.now(),
      date: new Date().toISOString(),
      type,
      user: currentUser.email,
      userName: currentUser.name,
      concept,
      amount
    };

    this.state.salesAndExpenses.unshift(newTx);
    this.saveStateToStorage();
    this.closeModal('modal-transaction');
    this.renderSalesExpenses();
    this.logActivity('Ventas y Gastos', `Registro de ${type}`, `${concept} por Q${amount}`);
  },

  // --- LOGS AUDIT MODULE ---
  renderLogs() {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    this.state.logs.forEach(l => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><small>${new Date(l.date).toLocaleString()}</small></td>
        <td><strong>${l.user}</strong></td>
        <td><span class="badge badge-info">${l.module}</span></td>
        <td>${l.action}</td>
        <td><span style="font-size:11px; color:#7F8C8D;">${l.details || ''}</span></td>
      `;
      tbody.appendChild(row);
    });
  },

  // --- AUTHENTICATION ---
  showLoginModal() {
    this.openModal('modal-login');
  },

  handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const user = this.state.users.find(u => u.email === email && u.password === password);

    if (user) {
      if (user.status !== 'Activo') {
        alert('Este usuario se encuentra inactivo en el sistema. Contacta al administrador.');
        return;
      }

      this.state.currentUser = user;
      localStorage.setItem('admin_current_user', JSON.stringify(user));

      this.closeModal('modal-login');
      this.renderUserBar();
      this.renderTabs();
      this.switchView('dashboard');
      this.logActivity('Sistema', 'Inicio de Sesión', `Usuario autenticado: ${email}`);
    } else {
      alert('Credenciales incorrectas. Verifica tu correo y contraseña.');
    }
  },

  handleLogout() {
    this.logActivity('Sistema', 'Cierre de Sesión', `Usuario ${this.state.currentUser?.email} cerró sesión`);
    this.state.currentUser = null;
    localStorage.removeItem('admin_current_user');
    this.renderUserBar();
    this.renderTabs();
    this.renderView('landing');
  },

  // --- MODAL HELPERS ---
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  scrollToFeatures() {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
