const express = require("express");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());

// =========================
// CONFIG
// =========================
const PORT = process.env.PORT || 8787;

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "sbawjqooxp6414jkns";

const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || "frpVYDXllu9PG81wzW9GC18rRPGfd0kV";

const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || "http://127.0.0.1:8787/callback";

const pkceStore = new Map();

// =========================
// PKCE HELPERS
// =========================

function generateChallenge(verifier) {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateVerifier() {
  return base64URLEncode(crypto.randomBytes(64));
}

function base64URLEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// =========================
// HOME
// =========================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>TikTok Sandbox Login</title>
</head>
<body style="font-family:Arial;background:#f4f8f8;padding:40px">
<h1>TikTok Sandbox Login</h1>
<a href="/login">
<button style="padding:12px 20px;font-size:16px">
Login con TikTok
</button>
</a>
<hr>
<a href="/privacy">
Política de Privacidad
</a>
<br>
<a href="/terms">
Términos de Servicio
</a>
</body>
</html>
`);
});

// =========================
// PRIVACY
// =========================
app.get("/privacy", (req, res) => {
  res.send(`
<h1>Política de Privacidad</h1>
<p>
Esta aplicación utiliza TikTok Login Kit únicamente para autenticación.
</p>
<p>
No almacenamos ni compartimos datos personales.
</p>
<p>
Contacto: soporte@tuapp.com
</p>
`);
});

// =========================
// TERMS
// =========================
app.get("/terms", (req, res) => {
  res.send(`
<h1>Términos de Servicio</h1>
<p>
El uso implica aceptar autenticación mediante TikTok Login Kit.
</p>
<p>
El usuario es responsable del uso de su cuenta.
</p>
`);
});

// =========================
// LOGIN
// =========================
app.get("/login", (req, res) => {
  const state = crypto.randomUUID();

  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);

  pkceStore.set(state, verifier);

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: "code",
    scope: "user.info.basic",
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  });

  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`);
});

// =========================
// CALLBACK
// =========================
app.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  console.log("STATE:", state);
  console.log("VERIFIER:", pkceStore.get(state));

  const verifier = pkceStore.get(state);

  if (!verifier) {
    return res.send("Verifier perdido");
  }

  pkceStore.delete(state);

  const body = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });

  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const data = await r.json();

  res.send(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
});

// =========================
// SERVER
// =========================
app.listen(PORT, () => {
  console.log(`Servidor corriendo: http://127.0.0.1:${PORT}`);
});
