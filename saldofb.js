export default {

  async fetch(request, env) {

    // =====================================================
    // CONFIG
    // =====================================================

    const GAS_URL =
      "https://script.google.com/macros/s/AKfycbwQPiGNy1jQ-dmq-xz1_ZcPxtQJdTqyVptIXnPKzwi53j5SZ30N3gwdkZsGm7raVXF4/exec";

    const FX_RATE = 7.8; // USD to QTZ
    const CACHE_KEY = "dashboard:cache:v1";
    const CACHE_TTL = 60; // 1 minute in seconds

    // =====================================================
    // FECHA HOY
    // =====================================================

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // =====================================================
    // CACHE LOGIC
    // =====================================================
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    let dashboardData = null;
    if (!forceRefresh && env.PRODUCTS_DB) {
      const cached = await env.PRODUCTS_DB.get(CACHE_KEY, "json");
      if (cached && cached.today === today) {
        dashboardData = cached;
      }
    }

    if (!dashboardData) {
      // =====================================================
      // CONSULTA VT / BO
      // =====================================================

      let vt = [];
      let bo = [];

      try {
        const gasRes = await fetch(GAS_URL + "?ruta=");
        const gasData = await gasRes.json();
        vt = gasData.vt || [];
        bo = gasData.bo || [];
      } catch (e) {
        console.error("Error fetching GAS data:", e);
      }

      // =====================================================
      // VT HOY
      // =====================================================

      const vtHoy = vt.filter(r => {
        if (!r.Fecha) return false;
        const f = new Date(r.Fecha).toISOString().split("T")[0];
        return f === today;
      });

      // =====================================================
      // BO HOY
      // =====================================================

      const boHoy = bo.filter(r => {
        if (!r.FechaCreado) return false;
        const f = new Date(r.FechaCreado).toISOString().split("T")[0];
        return f === today;
      });

      // =====================================================
      // BO ANTERIOR
      // =====================================================

      const boAnterior = bo.filter(r => {
        if (!r.FechaCreado) return false;
        const f = new Date(r.FechaCreado).toISOString().split("T")[0];
        return f < today;
      });

      // =====================================================
      // TOTALS
      // =====================================================

      const totalVT = vtHoy.reduce((acc, row) => acc + (Number(row.QMonto) || 0), 0);
      const totalBOHoy = boHoy.reduce((acc, row) => acc + (Number(row.TPedidoQTZ) || 0), 0);
      const totalBOAnterior = boAnterior.reduce((acc, row) => acc + (Number(row.TPedidoQTZ) || 0), 0);
      const totalGeneral = totalBOHoy + totalBOAnterior;

      // =====================================================
      // META ADS DATA FETCH HELPER
      // =====================================================

      async function getFBData(accountId, fallbackLimit) {
        let results = {
          spendToday: 0,
          saldoPendiente: 0,
          limiteCorte: Number(fallbackLimit || 0)
        };

        if (!accountId) return results;

        // 1. GASTO HOY (Insights)
        try {
          const insightsURL =
            `https://graph.facebook.com/v23.0/act_${accountId}/insights` +
            `?fields=spend` +
            `&time_range={'since':'${today}','until':'${today}'}` +
            `&access_token=${env.ACCESS_TOKEN}`;

          const res = await fetch(insightsURL);
          const data = await res.json();
          results.spendToday = Number(data?.data?.[0]?.spend || 0);
        } catch (e) { console.error(`Error spend act_${accountId}:`, e); }

        // 2. BALANCE PENDIENTE (Account)
        try {
          const accountURL =
            `https://graph.facebook.com/v23.0/act_${accountId}` +
            `?fields=balance` +
            `&access_token=${env.ACCESS_TOKEN}`;

          const res = await fetch(accountURL);
          const data = await res.json();
          results.saldoPendiente = Number(data.balance || 0) / 100;
        } catch (e) { console.error(`Error balance act_${accountId}:`, e); }

        // 3. UMBRAL DE PAGO (Payment Cycle)
        try {
          const cycleURL =
            `https://graph.facebook.com/v23.0/act_${accountId}` +
            `?fields=adspaymentcycle` +
            `&access_token=${env.ACCESS_TOKEN}`;

          const res = await fetch(cycleURL);
          const data = await res.json();
          const threshold = data.adspaymentcycle?.data?.[0]?.threshold_amount;
          if (threshold) {
            results.limiteCorte = Number(threshold) / 100;
          }
        } catch (e) { console.error(`Error threshold act_${accountId}:`, e); }

        return results;
      }

      // FETCH ACCOUNTS
      const acc1 = await getFBData(env.AD_ACCOUNT_ID, env.LIMITE_Q || 6918);
      const acc2 = await getFBData(env.AD_ACCOUNT_ID_2, env.LIMITE_USD || 0);

      dashboardData = {
        today,
        updatedAt: new Date().toLocaleString("es-GT", { timeZone: "America/Guatemala" }),
        totalVT,
        totalBOHoy,
        totalBOAnterior,
        totalGeneral,
        spend1: acc1.spendToday,
        balance1: acc1.saldoPendiente,
        limit1: acc1.limiteCorte,
        spend2: acc2.spendToday * FX_RATE,
        balance2: acc2.saldoPendiente * FX_RATE,
        limit2: acc2.limiteCorte * FX_RATE
      };

      if (env.PRODUCTS_DB) {
        await env.PRODUCTS_DB.put(CACHE_KEY, JSON.stringify(dashboardData), { expirationTtl: CACHE_TTL });
      }
    }

    // Calculations
    const totalSpendToday = dashboardData.spend1 + dashboardData.spend2;
    const totalBalance = dashboardData.balance1 + dashboardData.balance2;

    const restante1 = dashboardData.limit1 - dashboardData.balance1;
    const enGracia1 = restante1 < 0;
    const colorPendiente1 = enGracia1 ? "#dc3545" : "#0d6efd";

    const restante2 = dashboardData.limit2 - dashboardData.balance2;
    const enGracia2 = restante2 < 0;
    const colorPendiente2 = enGracia2 ? "#dc3545" : "#0d6efd";

    // =====================================================
    // HTML
    // =====================================================

    const html = `
    <!DOCTYPE html>

    <html lang="es">

    <head>

      <meta charset="UTF-8">

      <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
      >

      <title>
        Dashboard Comercial
      </title>

      <style>

        *{
          box-sizing:border-box;
          font-family:Arial,sans-serif;
        }

        body{
          margin:0;
          padding:25px;
          background:#f4f7fb;
          color:#222;
        }

        .wrap{
          max-width:1450px;
          margin:auto;
        }

        .header-flex {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
        }

        h1{
          margin:0;
          font-size:34px;
        }

        .fecha{
          margin-top:8px;
          color:#666;
        }

        .btn-refresh {
          background: #0d6efd;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 6px rgba(0,0,0,.1);
          transition: background 0.2s;
        }

        .btn-refresh:hover {
          background: #0b5ed7;
        }

        .top-grid{
          display:grid;
          grid-template-columns: repeat(6, 1fr);
          gap:10px;
        }

        .card{
          background:#fff;
          border-radius:18px;
          padding:15px;
          box-shadow:
          0 4px 14px rgba(0,0,0,.08);
          text-align:center;
        }

        .label{
          font-size:12px;
          color:#666;
          margin-bottom:6px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .value{
          font-size:20px;
          font-weight:bold;
        }

        .vt{
          color:#198754;
        }

        .bo{
          color:#dc3545;
        }

        .bo2{
          color:#fd7e14;
        }

        .total{
          color:#6f42c1;
        }

        .meta{
          color:#0d6efd;
        }

        .big-card{

          margin-top:25px;

          background:#fff;

          border-radius:24px;

          padding:30px;

          text-align:center;

          box-shadow:
          0 4px 18px rgba(0,0,0,.08);

        }

        .big-label{
          font-size:18px;
          color:#666;
          margin-bottom:12px;
        }

        .big-value{
          font-size:68px;
          font-weight:bold;
        }

        .sub-grid {
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 25px;
        }

        .sub{
          margin-top:15px;
          font-size:16px;
          color:#666;
        }

        .alerta{

          margin-top:20px;

          background:#dc3545;

          color:white;

          padding:15px;

          border-radius:14px;

          font-size:20px;

          font-weight:bold;

          animation:pulse 1.5s infinite;

        }

        @keyframes pulse{

          0%{
            transform:scale(1);
          }

          50%{
            transform:scale(1.02);
          }

          100%{
            transform:scale(1);
          }

        }

        .footer{
          margin-top:30px;
          color:#666;
          font-size:13px;
          text-align:center;
        }

        @media(max-width:1024px){
           .value { font-size:16px; }
           .top-grid { gap: 6px; }
           .card { padding: 10px; }
        }

        @media(max-width:768px){

          body{
            padding:15px;
          }

          .header-flex { flex-direction: column; gap: 15px; }

          .value{
            font-size:14px;
          }

          .label { font-size: 10px; }

          .big-value{
            font-size:42px;
          }

          .alerta{
            font-size:18px;
          }

        }

      </style>

    </head>

    <body>

      <div class="wrap">

        <div class="header-flex">
          <div>
            <h1>Dashboard Comercial</h1>
            <div class="fecha">Fecha: ${today}</div>
          </div>
          <button class="btn-refresh" onclick="location.href='?refresh=true'">
            🔄 Actualizar Ahora
          </button>
        </div>

        <!-- KPIS -->

        <div class="top-grid">

          <div class="card">

            <div class="label">
              VT Hoy
            </div>

            <div class="value vt">
              Q${money(dashboardData.totalVT)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              BO Carga
            </div>

            <div class="value bo">
              Q${money(dashboardData.totalBOHoy)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              BO Anterior
            </div>

            <div class="value bo2">
              Q${money(dashboardData.totalBOAnterior)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              BO TOTAL
            </div>

            <div class="value total">
              Q${money(dashboardData.totalGeneral)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              Gasto Cuenta Q
            </div>

            <div class="value meta">
              Q${money(dashboardData.spend1)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              Gasto Cuenta $
            </div>

            <div class="value meta">
              Q${money(dashboardData.spend2)}
            </div>

          </div>

        </div>

        <!-- META TOTAL -->

        <div class="big-card">

          <div class="big-label">

            Total Gasto (Ambas Cuentas)

          </div>

          <div
            class="big-value"
            style="color:#6f42c1"
          >

            Q${money(totalBalance)}

          </div>
        </div>

        <!-- DETALLE POR CUENTA -->
        <div class="sub-grid">

          <!-- CUENTA Q -->
          <div class="card" style="text-align:center;">
            <div class="big-label">Cuenta Q</div>
            <div class="value" style="color:${colorPendiente1}; font-size:38px;">
              Q${money(dashboardData.balance1)}
            </div>
            <div class="sub">
              Pagarás cuando tu saldo llegue a:
              <b>Q${money(dashboardData.limit1)}</b>
            </div>
            <div class="sub">
              Balance para corte:
              <b style="color:${enGracia1 ? '#dc3545' : '#198754'}">
                Q${money(restante1)}
              </b>
            </div>
            ${enGracia1 ? `<div class="alerta">⚠️ CUENTA EN PERIODO DE GRACIA</div>` : ""}
          </div>

          <!-- CUENTA $ -->
          <div class="card" style="text-align:center;">
            <div class="big-label">Cuenta $</div>
            <div class="value" style="color:${colorPendiente2}; font-size:38px;">
              Q${money(dashboardData.balance2)}
            </div>
            <div class="sub">
              Pagarás cuando tu saldo llegue a:
              <b>Q${money(dashboardData.limit2)}</b>
            </div>
            <div class="sub">
              Balance para corte:
              <b style="color:${enGracia2 ? '#dc3545' : '#198754'}">
                Q${money(restante2)}
              </b>
            </div>
            ${enGracia2 ? `<div class="alerta">⚠️ CUENTA EN PERIODO DE GRACIA</div>` : ""}
          </div>

        </div>

        <div class="footer">

          Última actualización: ${dashboardData.updatedAt}

        </div>

      </div>

    </body>

    </html>
    `;

    return new Response(html, {

      headers: {
        "content-type":
          "text/html;charset=UTF-8"
      }

    });

  }

};

// =====================================================
// HELPERS
// =====================================================

function money(n) {

  return Number(n || 0)
    .toLocaleString(
      "es-GT",
      {
        minimumFractionDigits: 2
      }
    );

}
