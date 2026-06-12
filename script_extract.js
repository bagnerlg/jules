            <button onclick="checkPerms()" class="flex-1 bg-blue-100 text-blue-700 py-4 rounded-xl font-black uppercase tracking-widest text-xs mt-4 border border-blue-200">Verificar Permisos</button>
            <button onclick="alert('Configuración guardada (Local). Use Cloudflare para cambios permanentes.')" class="flex-1 bg-slate-800 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs mt-4">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  </main>

  <div id="ldr" class="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-center hidden text-white flex-col gap-6 z-[100] transition duration-500">
    <div class="relative w-20 h-20">
      <div class="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
      <div class="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    <div class="text-center max-w-sm w-full px-4">
      <p class="font-black tracking-widest uppercase text-sm mb-2">Sincronizando con Meta...</p>
      <div id="ldr-log" class="bg-black/40 rounded-lg p-3 text-left font-mono text-[9px] h-32 overflow-y-auto space-y-1 border border-white/10"></div>
      <p id="ldr-msg" class="mt-2 text-[10px] font-bold text-blue-400 uppercase tracking-tighter opacity-70 animate-pulse">Iniciando proceso...</p>
    </div>
  </div>

  <script>
    window.onerror = function(msg, url, line, col, error) {
      alert("Error en la App: " + msg + "\\nLínea: " + line);
      console.error(error);
      return false;
    };
    let locs=[];
    const DEPTS_GT = ["Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"];

    window.onload=async()=>{
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('rep-start').value = today;
      document.getElementById('rep-end').value = today;
      document.getElementById('sd').value = today;

      const dl = document.getElementById('dept-list');
      DEPTS_GT.forEach(dept => {
        const div = document.createElement('label');
        div.className = 'flex items-center gap-2 bg-slate-100 p-2 rounded cursor-pointer hover:bg-slate-200 transition';
        div.innerHTML = '<input type="checkbox" value="' + dept + '" class="dept-check"> <span class="text-[10px] font-bold">' + dept + '</span>';
        dl.appendChild(div);
      });

      fetchAccounts();
      fetchActiveCampaigns();
      fetchCustomAudiences();
    };

    async function fetchAccounts() {
      try {
        const r=await fetch('/api/get-accounts',{method:'POST'});
        const d=await r.json();
        const s=document.getElementById('pgs');
        s.innerHTML='<option value="">Página de Facebook...</option>';
        if(d.data) d.data.forEach(p=>s.add(new Option(p.name, p.id)));
      } catch(e) { console.error("Error fetching accounts:", e); }
    }

    async function fetchActiveCampaigns() {
      const sc=document.getElementById('sel-camp');
      const old = sc.innerHTML;
      sc.innerHTML = '<option value="">Cargando campañas...</option>';
      try {
        const r=await fetch('/api/get-active-campaigns',{method:'POST'});
        const d=await r.json();
        sc.innerHTML='<option value="NEW">+ Crear Nueva Campaña</option>';
        if(d.data && d.data.length > 0) {
          d.data.forEach(c=>sc.add(new Option(c.name, c.id)));
        } else if(d.error) {
          console.warn("Aviso fetchActiveCampaigns:", d.error);
          alert("Error cargando campañas: " + d.error);
        } else {
          console.log("No se encontraron campañas activas.");
        }
      } catch(e) {
        console.error("Error fetching campaigns:", e);
        sc.innerHTML = old;
      }
    }

    async function fetchCustomAudiences() {
      try {
        const r=await fetch('/api/get-custom-audiences',{method:'POST'});
        const d=await r.json();
        const sa=document.getElementById('sel-audience');
        sa.innerHTML='<option value="">+ Crear Público Manual</option>';
        if(d.data) d.data.forEach(a=>sa.add(new Option(a.name, a.id)));
      } catch(e) { console.error("Error fetching audiences:", e); }
    }

    async function loadAdSets(campId){
      const s=document.getElementById('sel-adset');
      const campConfig = document.getElementById('camp-new-config');
      if(campId === "NEW" || !campId) {
        s.innerHTML='<option value="NEW">+ Crear Nuevo Conjunto</option>';
        if(campId === "NEW") campConfig.classList.remove('hidden');
        else campConfig.classList.add('hidden');
        return;
      }
      campConfig.classList.add('hidden');
      s.innerHTML='<option value="">Cargando conjuntos...</option>';
      try {
        const r=await fetch('/api/get-adsets',{method:'POST',body:JSON.stringify({campaignId:campId})});
        const d=await r.json();
        s.innerHTML='<option value="NEW">+ Crear Nuevo Conjunto</option>';
        if(d.data) d.data.forEach(as=>s.add(new Option(as.name, as.id)));
        if(d.error) console.error("Error loadAdSets:", d.error);
      } catch(e){ console.error("Exception loadAdSets:", e); }
    }

    async function loadAds(adsetId){
      const s=document.getElementById('sel-ad');
      const adsetConfig = document.getElementById('adset-new-config');
      if(adsetId === "NEW" || !adsetId) {
        s.innerHTML='<option value="NEW">+ Crear Nuevo Anuncio</option>';
        if(adsetId === "NEW") adsetConfig.classList.remove('hidden');
        else adsetConfig.classList.add('hidden');
        return;
      }
      adsetConfig.classList.add('hidden');
      s.innerHTML='<option value="">Cargando anuncios...</option>';
      try {
        const r=await fetch('/api/get-ads',{method:'POST',body:JSON.stringify({adsetId})});
        const d=await r.json();
        s.innerHTML='<option value="NEW">+ Crear Nuevo Anuncio</option>';
        if(d.data) d.data.forEach(ad=>s.add(new Option(ad.name, ad.id)));
        if(d.error) console.error("Error loadAds:", d.error);
      } catch(e){ console.error("Exception loadAds:", e); }
    }

    async function loadAdDetails(adId){
      if(adId === "NEW") {
        return;
      }
      try {
        const r = await fetch('/api/get-ad-details', {method:'POST', body:JSON.stringify({adId})});
        const d = await r.json();
        if(d.data) {
          document.getElementById('ad-name').value = d.data.name;
          document.getElementById('pt').value = d.data.creative?.object_story_spec?.link_data?.message || d.data.creative?.object_story_spec?.video_data?.message || "";
          document.getElementById('hd').value = d.data.creative?.name || "";
        }
      } catch(e){}
    }

    async function updatePageDetails(pageId){
      if(!pageId) return;
      try {
        const r1 = await fetch('/api/get-instagram-accounts', {method:'POST', body:JSON.stringify({pageId})});
        const d1 = await r1.json();
        const sig = document.getElementById('sel-ig');
        sig.innerHTML = '<option value="">Perfil de Instagram...</option>';
        if(d1.instagram_business_account) {
          sig.add(new Option(d1.instagram_business_account.name || "Instagram vinculado", d1.instagram_business_account.id));
        } else {
          sig.add(new Option("No hay cuenta de IG vinculada", ""));
        }

        const st = document.getElementById('sel-template');
        st.innerHTML = '<option value="">Cargando plantillas...</option>';
        const r2 = await fetch('/api/get-message-templates', {method:'POST', body:JSON.stringify({pageId})});
        const d2 = await r2.json();
        st.innerHTML = '<option value="NEW">+ Crear Nueva Plantilla</option>';
        if(d2.data && d2.data.length > 0) {
          d2.data.forEach(t=>st.add(new Option(t.name, t.id)));
        }
        initTemplateUI();
      } catch(e){
        console.error("Error updating page details:", e);
      }
    }

    function tab(t){
      ['dash','create','config'].forEach(v=>{
        const el = document.getElementById('tab-'+v);
        if(el) el.classList.add('hidden');
        const nav = document.getElementById('nav-'+v);
        if(nav) nav.classList.remove('active-tab');
      });
      const target = document.getElementById('tab-'+t);
      if(target) target.classList.remove('hidden');
      const targetNav = document.getElementById('nav-'+t);
      if(targetNav) targetNav.classList.add('active-tab');

      const titles = { 'dash': 'Reportes', 'create': 'Crear Anuncio', 'config': 'API Config' };
      const mTitle = document.getElementById('mobile-tab-title');
      if(mTitle) mTitle.innerText = titles[t] || '';

      if(window.innerWidth < 1024) toggleSidebar(false);
    }

    function initTemplateUI() {
      const val = document.getElementById('sel-template').value;
      const config = document.getElementById('new-template-config');
      if (val === 'NEW') {
        config.classList.remove('hidden');
      } else {
        config.classList.add('hidden');
      }
    }

    function toggleSidebar(force) {
      const sb = document.getElementById('sidebar');
      const ov = document.getElementById('side-overlay');
      const isOpen = typeof force === 'boolean' ? !force : sb.classList.contains('translate-x-0');

      if(isOpen) {
        sb.classList.replace('translate-x-0', '-translate-x-full');
        ov.classList.add('hidden');
      } else {
        sb.classList.replace('-translate-x-full', 'translate-x-0');
        ov.classList.remove('hidden');
      }
    }

    async function toggleStatus(id, currentStatus){
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      try {
        const r=await fetch('/api/update-status',{method:'POST',body:JSON.stringify({id, status:newStatus})});
        const d=await r.json();
        if(d.error) alert('Error: ' + d.error.message);
        loadDash();
      } catch(e){ alert('Error al cambiar estado'); }
    }

    async function loadDash(){
      document.getElementById('ldr').classList.remove('hidden');
      const start = document.getElementById('rep-start').value;
      const end = document.getElementById('rep-end').value;
      try {
        const r=await fetch('/api/get-full-report',{method:'POST',body:JSON.stringify({start, end})});
        const d=await r.json();
        if(d.error) { alert('Error: ' + d.error); return; }
        const container = document.getElementById('dash-main');
        container.innerHTML = '';

        d.data.forEach(camp => {
          const ins = camp.insights?.data?.[0] || { spend:0, impressions:0, reach:0, actions:[] };
          const msgs = ins.actions?.find(a => a.action_type === 'onsite_conversion.messaging_first_reply') || { value:0 };

          const campDiv = document.createElement('div');
          campDiv.className = 'bg-white rounded-xl shadow-sm border overflow-hidden mb-4';

          const header = document.createElement('div');
          header.className = 'p-4 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100';
          header.onclick = () => campDiv.querySelector('.adsets-container').classList.toggle('hidden');

          header.innerHTML = '<div class="flex items-center gap-4">' +
              '<div class="w-3 h-3 rounded-full ' + (camp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300') + '"></div>' +
              '<div><p class="text-xs font-black uppercase text-slate-400">Campaña</p><p class="font-bold text-slate-700">' + camp.name + '</p></div>' +
            '</div>' +
            '<div class="flex gap-8 text-right items-center">' +
              '<div><p class="text-[10px] font-black text-slate-400 uppercase">Gasto</p><p class="font-bold text-slate-700">$' + parseFloat(ins.spend).toFixed(2) + '</p></div>' +
              '<div><p class="text-[10px] font-black text-slate-400 uppercase">Mensajes</p><p class="font-bold text-blue-600">' + msgs.value + '</p></div>' +
              '<div><p class="text-[10px] font-black text-slate-400 uppercase">Imp</p><p class="font-bold text-slate-700">' + ins.impressions + '</p></div>' +
              '<div><p class="text-[10px] font-black text-slate-400 uppercase">Alcance</p><p class="font-bold text-slate-700">' + ins.reach + '</p></div>' +
              '<button onclick="event.stopPropagation(); toggleStatus(\\'' + camp.id + '\\', \\'' + camp.status + '\\')" class="px-4 py-2 ' + (camp.status === 'ACTIVE' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600') + ' rounded-lg text-[10px] font-black uppercase">' + (camp.status === 'ACTIVE' ? 'Pausar' : 'Activar') + '</button>' +
            '</div>';

          const adsetsContainer = document.createElement('div');
          adsetsContainer.className = 'adsets-container hidden border-t';

          camp.adsets.forEach(as => {
            const ains = as.insights?.data?.[0] || { spend:0, impressions:0, reach:0, actions:[] };
            const amsgs = ains.actions?.find(a => a.action_type === 'onsite_conversion.messaging_first_reply') || { value:0 };

            const asDiv = document.createElement('div');
            asDiv.className = 'p-4 border-b ml-8 bg-white';
            asDiv.innerHTML = '<div class="flex justify-between items-center mb-4">' +
                '<div class="flex items-center gap-3">' +
                  '<div class="w-2 h-2 rounded-full ' + (as.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300') + '"></div>' +
                  '<p class="text-sm font-bold text-slate-600">AS: ' + as.name + '</p>' +
                '</div>' +
                '<div class="flex gap-6 text-right items-center">' +
                  '<span class="text-[10px] font-bold text-slate-500">$' + parseFloat(ains.spend).toFixed(2) + ' | ' + amsgs.value + ' MSGs | ' + ains.impressions + ' Imp | ' + ains.reach + ' Alcance</span>' +
                  '<button onclick="toggleStatus(\\'' + as.id + '\\', \\'' + as.status + '\\')" class="text-[10px] font-black uppercase ' + (as.status === 'ACTIVE' ? 'text-red-500' : 'text-emerald-500') + '">' + (as.status === 'ACTIVE' ? 'OFF' : 'ON') + '</button>' +
                '</div>' +
              '</div>';

            const adsGrid = document.createElement('div');
            adsGrid.className = 'grid grid-cols-1 gap-2';

            as.ads.forEach(ad => {
              const adins = ad.insights?.data?.[0] || { spend:0, impressions:0, reach:0, actions:[] };
              const admsgs = adins.actions?.find(a => a.action_type === 'onsite_conversion.messaging_first_reply') || { value:0 };

              const adDiv = document.createElement('div');
              adDiv.className = 'bg-slate-50 p-4 rounded-xl ml-4 mb-4 border border-slate-100 shadow-sm';
              adDiv.innerHTML = '<div class="flex flex-col md:flex-row gap-6">' +
                  '<div class="shrink-0 flex justify-center">' +
                    '<img src="' + (ad.creative?.image_url || ad.creative?.thumbnail_url || '') + '" class="w-48 h-48 rounded-lg bg-slate-200 object-cover shadow-inner border border-white">' +
                  '</div>' +
                  '<div class="flex-1 flex flex-col justify-between">' +
                    '<div>' +
                      '<div class="flex items-center gap-2 mb-2">' +
                        '<div class="w-2 h-2 rounded-full ' + (ad.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300') + '"></div>' +
                        '<span class="text-[10px] font-black uppercase text-slate-400 tracking-widest">' + ad.status + '</span>' +
                      '</div>' +
                      '<p class="text-lg font-black text-slate-800 leading-tight mb-4">' + ad.name + '</p>' +

                      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-3 rounded-lg border border-slate-100">' +
                        '<div><p class="text-[9px] font-black text-slate-400 uppercase">Gasto</p><p class="font-bold text-slate-700">$' + parseFloat(adins.spend).toFixed(2) + '</p></div>' +
                        '<div><p class="text-[9px] font-black text-slate-400 uppercase">Mensajes</p><p class="font-bold text-blue-600">' + admsgs.value + '</p></div>' +
                        '<div><p class="text-[9px] font-black text-slate-400 uppercase">Imp</p><p class="font-bold text-slate-700">' + adins.impressions + '</p></div>' +
                        '<div><p class="text-[9px] font-black text-slate-400 uppercase">Alcance</p><p class="font-bold text-slate-700">' + adins.reach + '</p></div>' +
                      '</div>' +
                    '</div>' +

                    '<div class="flex justify-end mt-4">' +
                      '<button onclick="toggleStatus(\\'' + ad.id + '\\', \\'' + ad.status + '\\')" class="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition ' + (ad.status === 'ACTIVE' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100') + '">' +
                        (ad.status === 'ACTIVE' ? 'Pausar' : 'Activar') +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>';
              adsGrid.appendChild(adDiv);
            });

            asDiv.appendChild(adsGrid);
            adsetsContainer.appendChild(asDiv);
          });

          campDiv.appendChild(header);
          campDiv.appendChild(adsetsContainer);
          container.appendChild(campDiv);
        });
      } catch(e){} finally { document.getElementById('ldr').classList.add('hidden'); }
    }

    async function srch(t,id){ const q=document.getElementById(id).value; try { const r=await fetch('/api/search',{method:'POST',body:JSON.stringify({type:t,q})}); const d=await r.json(); if(d.data?.length){ const it=d.data[0]; if(t==='adgeolocation'){ locs.push(it); document.getElementById('lsel').innerHTML+='<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase animate-bounce border border-blue-200">'+it.name+'</span>'; } } } catch(e){} }
    function preview(input){ if(input.files && input.files[0]){ const reader=new FileReader(); reader.onload=e=>document.getElementById('dropzone').innerHTML='<img src="'+e.target.result+'" class="max-h-full rounded-xl shadow-lg border-2 border-white">'; reader.readAsDataURL(input.files[0]); } }

    async function suggestIA(){
      const pt=document.getElementById('pt');
      const hd=document.getElementById('hd');
      const btn=document.getElementById('btn-ia');
      const old=btn.innerHTML;
      btn.innerHTML='<div class="loader-spin mx-auto"></div>';
      try {
        const file = document.getElementById('fi').files[0];
        let base64Image = null;
        if (file && file.type.startsWith('image/')) {
          base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }

        const r=await fetch('/api/openai-generate',{
          method:'POST',
          body:JSON.stringify({
            prompt: 'Genera un anuncio de Facebook Ads (Copywriting experto) para el producto: ' + document.getElementById('cn').value + '. Si hay una imagen, analízala para resaltar sus características.',
            image: base64Image
          })
        });
        const d=await r.json();
        if (d.error) throw new Error(d.error);
        if (!d.choices || !d.choices[0]) throw new Error('No se recibió respuesta de la IA');

        const aiMsg = d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message : null;
        const kField = ["c", "o", "n", "t", "e", "n", "t"].join("");
        if (!aiMsg || !aiMsg[kField]) throw new Error('No se recibió contenido de la IA');

        const aiResponse = aiMsg[kField].replace(/\\\`\\\`\\\`json|\\\`\\\`\\\`/g, '').trim();
        const res = JSON.parse(aiResponse);
        pt.value=res.texto || res.text;
        hd.value=res.titulo || res.headline;
      } catch(e){
        console.error(e);
        pt.value='Error al generar sugerencia. Intente de nuevo.';
      } finally {
        btn.innerHTML=old;
      }
    }

    function setLdr(msg){
      const msgEl = document.getElementById('ldr-msg');
      if (msgEl) msgEl.innerText = msg;
      const log = document.getElementById('ldr-log');
      if (log) {
        const entry = document.createElement('div');
        entry.className = msg.includes('Error') ? 'text-red-400' : 'text-slate-300';
        entry.innerHTML = '<span class="text-white/30 mr-1">' + new Date().toLocaleTimeString() + '</span> ' + msg;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
      }
    }

    async function checkPerms(){
      const ldr = document.getElementById('ldr');
      ldr.classList.remove('hidden');
      setLdr('Analizando Token y Cuenta...');

      try {
        const [r1, r2] = await Promise.all([
          fetch('/api/check-permissions', {method:'POST'}),
          fetch('/api/debug-token', {method:'POST'})
        ]);
        const d1 = await r1.json();
        const d2 = await r2.json();

        let report = "--- REPORTE DE SALUD ---\\n\\n";

        if(d1.token) report += 'TOKEN: ' + d1.token.status.toUpperCase() + ' - ' + d1.token.message + '\\n';
        if(d1.account) report += 'CUENTA: ' + d1.account.status.toUpperCase() + ' - ' + d1.account.message + '\\n';

        if(d2.data) {
          const expires = d2.data.expires_at ? new Date(d2.data.expires_at * 1000).toLocaleString() : "Nunca";
          report += 'EXPIRA: ' + expires + '\\n';
          report += 'TIPO: ' + d2.data.type + '\\n';
        }

        ldr.classList.add('hidden');
        alert(report);
      } catch(e) {
        ldr.classList.add('hidden');
        alert('Error en verificación: ' + e.message);
      }
    }

    async function launchAd(){
      try {
        const isNewAd = document.getElementById('sel-ad').value === 'NEW';
        const f=document.getElementById('fi').files[0];
        const pageId = document.getElementById('pgs').value;

        if(isNewAd && !f) { alert('Debe subir una imagen o video para un anuncio nuevo.'); return; }
        if(!pageId) { alert('Seleccione una página emisora.'); return; }

        const ldr = document.getElementById('ldr');
        const log = document.getElementById('ldr-log');
        log.innerHTML = '';
        ldr.classList.remove('hidden');

        setLdr('Verificando acceso a Meta...');
        try {
          const vr = await fetch('/api/check-permissions', {method:'POST'});
          const vd = await vr.json();
          if(vd.token?.status === 'error') throw new Error('Token inválido: ' + vd.token.message);
          setLdr('Acceso validado correctamente.');
          if(vd.account?.status === 'error') {
            setLdr('Aviso de Cuenta: ' + vd.account.message);
            if(!confirm('Aviso de Cuenta: ' + vd.account.message + '\\n¿Desea intentar publicar de todos modos?')) {
              ldr.classList.add('hidden');
              return;
            }
          }
        } catch(ve) {
          setLdr('Error de validación: ' + ve.message);
          setTimeout(() => ldr.classList.add('hidden'), 3000);
          return;
        }

        let resolvedRegions = [];
        const depts = Array.from(document.querySelectorAll('.dept-check:checked')).map(c => c.value);
        if(depts.length > 0) {
          setLdr("Resolviendo " + depts.length + " ubicaciones en Meta...");
          try {
            const rr = await fetch('/api/resolve-regions', {method:'POST', body:JSON.stringify({depts})});
            const rd = await rr.json();
            resolvedRegions = rd.regions || [];
            setLdr("Ubicaciones resueltas: " + resolvedRegions.length);
          } catch(re) {
            setLdr('Error resolviendo ubicaciones: ' + re.message);
          }
        }

        let mediaId = null, mediaType = null;
        if(f) {
          setLdr("Preparando archivo: " + f.name + "...");
          try {
            const base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result.split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(f);
            });

            setLdr("Subiendo " + (f.size/1024/1024).toFixed(2) + "MB a Meta...");
            const mr = await fetch('/api/upload-media', {
              method:'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: f.name,
                fileType: f.type,
                fileSize: f.size,
                base64: base64
              })
            });
            const md = await mr.json();
            if(md.error) throw new Error(md.error);
            mediaId = md.image_hash || md.video_id || md.id;
            mediaType = md.type;
            setLdr("Archivo subido exitosamente ID: " + mediaId);
          } catch(me) {
            setLdr('Error subiendo archivo: ' + me.message);
            setTimeout(() => ldr.classList.add('hidden'), 5000);
            return;
          }
        }

        setLdr('Publicando anuncio final en Meta...');
        const depts_selected = Array.from(document.querySelectorAll('.dept-check:checked')).map(c => c.value);
        const config={
          mediaId, mediaType, resolvedRegions,
          campaignId:document.getElementById('sel-camp').value,
          campaignName:document.getElementById('cn').value,
          objective:document.getElementById('ob').value,

          adSetId:document.getElementById('sel-adset').value,
          adSetName:document.getElementById('asn').value,
          budgetAmount:document.getElementById('ba').value,
          startDate:document.getElementById('sd').value,
          messagingDestinations: {
            messenger: document.getElementById('dest-msg').checked,
            instagram: document.getElementById('dest-ig').checked,
            whatsapp: document.getElementById('dest-wa').checked
          },
          whatsappNumber: document.getElementById('wa-num').value,
          audienceId: document.getElementById('sel-audience').value,
          manualAudience: {
            depts: depts_selected,
            ageMin: document.getElementById('ami').value,
            interests: document.getElementById('adsug').value
          },
          platforms: {
            facebook: document.getElementById('plat-fb').checked,
            instagram: document.getElementById('plat-ig').checked,
            audience_network: document.getElementById('plat-an').checked,
            messenger: document.getElementById('plat-msg').checked
          },

          adId: document.getElementById('sel-ad').value,
          adName: document.getElementById('ad-name').value,
          pageId: document.getElementById('pgs').value,
          instagramId: document.getElementById('sel-ig').value,
          format: document.getElementById('ad-format').value,
          templateId: document.getElementById('sel-template').value,
          newTemplate: {
            text: document.getElementById('tpl-text').value,
            response: document.getElementById('tpl-res').value
          },
          primaryText:document.getElementById('pt').value,
          headline:document.getElementById('hd').value || document.getElementById('ad-name').value,
          status:'PAUSED'
        };

        const r=await fetch('/api/create-advanced-ad',{
          method:'POST',
          headers: {'Content-Type': 'application/json'},
          body:JSON.stringify({config})
        });
        const res=await r.json();
        if(res.success){
          setLdr('¡ÉXITO! Operación completada.');
          setTimeout(() => {
            ldr.classList.add('hidden');
            alert('¡ÉXITO! Campaña/Anuncio listo. ID: ' + res.adId);
            tab('dash');
            loadDash();
          }, 1500);
        } else {
          setLdr('Error Meta: ' + res.error);
          setTimeout(() => ldr.classList.add('hidden'), 5000);
          alert('ERROR: ' + res.error);
        }
      } catch(e) {
        console.error("Error fatal en launchAd:", e);
        alert('Error fatal: ' + e.message);
        const ldr = document.getElementById('ldr');
        if(ldr) ldr.classList.add('hidden');
      }
    }
  </script>
</body>
</html>`;

  // Inyección segura de variables de entorno
  // Masking simple para no mostrar todo el token en el HTML generado
  const masked_token = meta_token.length > 10 ? meta_token.substring(0, 6) + "..." + meta_token.substring(meta_token.length - 4) : meta_token;
  const masked_openai = openai_key.length > 10 ? openai_key.substring(0, 6) + "..." + openai_key.substring(openai_key.length - 4) : openai_key;

  html = html.replace(/\[META_TOKEN\]/g, masked_token);
  html = html.replace(/\[OPENAI_KEY\]/g, masked_openai);
  html = html.replace(/\[AD_ACC_ID\]/g, ad_acc_id);

  return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}

// --- EXPORT FINAL ---
