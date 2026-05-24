export default {

  async fetch(request, env) {

    // =====================================================
    // CONFIG
    // =====================================================

    const GAS_URL =
      "https://script.google.com/macros/s/AKfycbwQPiGNy1jQ-dmq-xz1_ZcPxtQJdTqyVptIXnPKzwi53j5SZ30N3gwdkZsGm7raVXF4/exec";

    // =====================================================
    // FECHA HOY
    // =====================================================

    const now = new Date();

    const today =
      now.toISOString().split("T")[0];

    // =====================================================
    // CONSULTA VT / BO
    // =====================================================

    const gasRes =
      await fetch(GAS_URL + "?ruta=");

    const gasData =
      await gasRes.json();

    let vt =
      gasData.vt || [];

    let bo =
      gasData.bo || [];

    // =====================================================
    // VT HOY
    // =====================================================

    const vtHoy =
      vt.filter(r => {

        if (!r.Fecha) return false;

        const f =
          new Date(r.Fecha)
            .toISOString()
            .split("T")[0];

        return f === today;

      });

    // =====================================================
    // BO HOY
    // =====================================================

    const boHoy =
      bo.filter(r => {

        if (!r.FechaCreado) return false;

        const f =
          new Date(r.FechaCreado)
            .toISOString()
            .split("T")[0];

        return f === today;

      });

    // =====================================================
    // BO ANTERIOR
    // =====================================================

    const boAnterior =
      bo.filter(r => {

        if (!r.FechaCreado) return false;

        const f =
          new Date(r.FechaCreado)
            .toISOString()
            .split("T")[0];

        return f < today;

      });

    // =====================================================
    // TOTAL VT HOY
    // =====================================================

    const totalVT =
      vtHoy.reduce((acc, row) => {

        return acc +
          (Number(row.QMonto) || 0);

      }, 0);

    // =====================================================
    // TOTAL BO HOY
    // =====================================================

    const totalBOHoy =
      boHoy.reduce((acc, row) => {

        return acc +
          (Number(row.TPedidoQTZ) || 0);

      }, 0);

    // =====================================================
    // TOTAL BO ANTERIOR
    // =====================================================

    const totalBOAnterior =
      boAnterior.reduce((acc, row) => {

        return acc +
          (Number(row.TPedidoQTZ) || 0);

      }, 0);

    // =====================================================
    // VT + BO HOY
    // =====================================================

    const totalGeneral =
      totalBOHoy + totalBOAnterior;

    // =====================================================
    // META GASTO HOY
    // =====================================================

    const insightsURL =
      `https://graph.facebook.com/v23.0/act_${env.AD_ACCOUNT_ID}/insights` +
      `?fields=spend` +
      `&time_range={'since':'${today}','until':'${today}'}` +
      `&access_token=${env.ACCESS_TOKEN}`;

    const insightsRes =
      await fetch(insightsURL);

    const insightsData =
      await insightsRes.json();

    const spendToday =
      Number(
        insightsData?.data?.[0]?.spend || 0
      );

    // =====================================================
    // META SALDO PENDIENTE
    // =====================================================

    const accountURL =
      `https://graph.facebook.com/v23.0/act_${env.AD_ACCOUNT_ID}` +
      `?fields=balance` +
      `&access_token=${env.ACCESS_TOKEN}`;

    const accountRes =
      await fetch(accountURL);

    const accountData =
      await accountRes.json();

    const rawBalance =
      Number(accountData.balance || 0);

    // =====================================================
    // AJUSTE CORRECTO PARA TU CUENTA
    // =====================================================

    const saldoPendiente =
      rawBalance / 100;

    // =====================================================
    // LIMITE DE CORTE
    // =====================================================

    const limiteCorte =
      6918;

    // =====================================================
    // RESTANTE PARA CORTE
    // =====================================================

    const restante =
      limiteCorte - saldoPendiente;

    // =====================================================
    // ESTADO GRACIA
    // =====================================================

    const enGracia =
      restante < 0;

    const colorPendiente =
      enGracia
        ? "#dc3545"
        : "#0d6efd";

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

        h1{
          margin:0;
          font-size:34px;
        }

        .fecha{
          margin-top:8px;
          color:#666;
          margin-bottom:30px;
        }

        .top-grid{
          display:grid;
          grid-template-columns:
          repeat(auto-fit,minmax(240px,1fr));
          gap:18px;
        }

        .card{
          background:#fff;
          border-radius:18px;
          padding:24px;
          box-shadow:
          0 4px 14px rgba(0,0,0,.08);
        }

        .label{
          font-size:14px;
          color:#666;
          margin-bottom:12px;
        }

        .value{
          font-size:38px;
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

          margin-top:35px;

          background:#fff;

          border-radius:24px;

          padding:45px;

          text-align:center;

          box-shadow:
          0 4px 18px rgba(0,0,0,.08);

        }

        .big-label{
          font-size:20px;
          color:#666;
          margin-bottom:18px;
        }

        .big-value{
          font-size:78px;
          font-weight:bold;
        }

        .sub{
          margin-top:20px;
          font-size:20px;
          color:#666;
        }

        .alerta{

          margin-top:28px;

          background:#dc3545;

          color:white;

          padding:22px;

          border-radius:18px;

          font-size:26px;

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
          font-size:14px;
          text-align:center;
        }

        @media(max-width:768px){

          body{
            padding:15px;
          }

          .value{
            font-size:28px;
          }

          .big-value{
            font-size:48px;
          }

          .alerta{
            font-size:20px;
          }

        }

      </style>

    </head>

    <body>

      <div class="wrap">

        <h1>
          Dashboard Comercial
        </h1>

        <div class="fecha">

          Fecha:
          ${today}

        </div>

        <!-- KPIS -->

        <div class="top-grid">

          <div class="card">

            <div class="label">
              VT Hoy
            </div>

            <div class="value vt">
              Q${money(totalVT)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              BO Carga Hoy
            </div>

            <div class="value bo">
              Q${money(totalBOHoy)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              BO Anterior
            </div>

            <div class="value bo2">
              Q${money(totalBOAnterior)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              BO TOTAL Hoy
            </div>

            <div class="value total">
              Q${money(totalGeneral)}
            </div>

          </div>

          <div class="card">

            <div class="label">
              Gasto Hoy
            </div>

            <div class="value meta">
              Q${money(spendToday)}
            </div>

          </div>

        </div>

        <!-- META -->

        <div class="big-card">

          <div class="big-label">

            Total Gasto

          </div>

          <div
            class="big-value"
            style="color:${colorPendiente}"
          >

            Q${money(saldoPendiente)}

          </div>

          <div class="sub">

            Pagarás cuando tu saldo llegue a:

            <b>
              Q${money(limiteCorte)}
            </b>

          </div>

          <div class="sub">

            Balance para corte:

            <b style="color:${enGracia ? '#dc3545' : '#198754'}">

              Q${money(restante)}

            </b>

          </div>

          ${enGracia
        ?
        `
            <div class="alerta">

              ⚠️ CUENTA EN PERIODO DE GRACIA

            </div>
            `
        :
        ""
      }

        </div>

        <div class="footer">

          Última actualización:${new Date().toLocaleString(
            "es-GT",
            {
              timeZone: "America/Guatemala"
            }
          )}

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
