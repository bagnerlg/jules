const fs = require('node:fs/promises');
const path = require('node:path');
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const P = require('pino');
const QRCode = require('qrcode');

function createBaileysManager(options = {}) {
  const manager = new BaileysManager(options);
  return manager;
}

class BaileysManager {
  constructor(options = {}) {
    this.authRoot = options.authRoot || path.join(__dirname, 'auth');
    this.outputDir = options.outputDir || path.join(__dirname, 'capturas');
    this.ignoreFromMe = options.ignoreFromMe !== false;
    this.firstOnly = Boolean(options.firstOnly);
    this.adOnly = Boolean(options.adOnly);
    this.dedupAdByChatAndSource = options.dedupAdByChatAndSource !== false;
    this.onPayload = options.onPayload || (async () => {});
    this.onContactUpdate = options.onContactUpdate || (async () => {});
    this.onStatusChange = options.onStatusChange || (async () => {});
    this.sessions = new Map();
    this.seenMessageIds = new Set();
    this.seenChats = new Set();
    this.seenAdKeys = new Set();
  }

  getStatus(accountKey) {
    const key = safeText(accountKey, "default");
    const session = this.sessions.get(key);
    if (!session) {
      return {
        accountKey: key,
        state: "stopped",
        connected: false,
        qrDataUrl: null,
        accountJid: null,
        lastMessageAt: null,
        lastError: null
      };
    }

    return {
      accountKey: key,
      state: session.state,
      connected: session.state === "connected",
      qrDataUrl: session.qrDataUrl || null,
      accountJid: session.accountJid || null,
      lastMessageAt: session.lastMessageAt || null,
      lastError: session.lastError || null
    };
  }

  async start(account = {}) {
    const accountKey = safeText(account.accountKey || account.account_key || account.username, "default");
    const existing = this.sessions.get(accountKey);
    if (existing?.sock && ["connecting", "qr", "connected"].includes(existing.state)) {
      return this.getStatus(accountKey);
    }

    const authDir = path.join(this.authRoot, safeFilePart(accountKey));
    await fs.mkdir(authDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, safeFilePart(accountKey)), { recursive: true });

    const session = {
      accountKey,
      account,
      authDir,
      sock: null,
      state: "connecting",
      qrDataUrl: null,
      accountJid: null,
      lastMessageAt: null,
      lastError: null,
      manualStop: false,
      identityByJid: new Map()
    };
    this.sessions.set(accountKey, session);

    this.connect(session).catch((error) => {
      session.state = "error";
      session.lastError = error.message;
      this.notifyStatus(accountKey);
    });

    return this.getStatus(accountKey);
  }

  async stop(accountKey) {
    const key = safeText(accountKey, "default");
    const session = this.sessions.get(key);
    if (!session) return this.getStatus(key);

    session.manualStop = true;
    session.state = "stopped";
    session.qrDataUrl = null;

    try {
      session.sock?.end?.(new Error("Sesion detenida por el usuario."));
    } catch (err) {
      session.lastError = err.message;
    }

    this.sessions.delete(key);
    this.notifyStatus(key);
    return this.getStatus(key);
  }

  notifyStatus(accountKey) {
    const status = this.getStatus(accountKey);
    Promise.resolve(this.onStatusChange(status)).catch(() => {});
  }

  async connect(session) {
    const { state, saveCreds } = await useMultiFileAuthState(session.authDir);
    let version;
    try {
      const vObj = await fetchLatestBaileysVersion();
      version = vObj.version;
    } catch (e) {
      version = [2, 3000, 1015901307];
    }

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: P({ level: "silent" }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      browser: [`Admin Basico CRM ${session.accountKey}`, "Chrome", "1.0.0"]
    });

    session.sock = sock;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("contacts.upsert", (contacts) => {
      this.cacheContacts(session, contacts, "contacts.upsert");
    });
    sock.ev.on("contacts.update", (contacts) => {
      this.cacheContacts(session, contacts, "contacts.update");
    });
    sock.ev.on("lid-mapping.update", (mapping) => {
      this.cacheContacts(session, mapping, "lid-mapping.update");
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        session.state = "qr";
        session.qrDataUrl = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 280
        });
        this.notifyStatus(session.accountKey);
      }

      if (connection === "open") {
        session.accountJid = sock.user?.id || session.accountJid || null;
        session.state = "connected";
        session.qrDataUrl = null;
        session.lastError = null;
        this.notifyStatus(session.accountKey);
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = !session.manualStop && statusCode !== DisconnectReason.loggedOut;

        session.sock = null;
        session.state = shouldReconnect ? "reconnecting" : "stopped";
        session.lastError = `Conexion cerrada. status=${statusCode || "desconocido"}`;
        this.notifyStatus(session.accountKey);

        if (shouldReconnect) {
          setTimeout(() => this.connect(session).catch((error) => {
            session.state = "error";
            session.lastError = error.message;
            this.notifyStatus(session.accountKey);
          }), 3000);
        }
      }
    });

    sock.ev.on("messages.upsert", async (event) => {
      for (const message of event.messages || []) {
        await this.captureMessage(session, message).catch((error) => {
          session.lastError = error.message;
        });
      }
    });
  }

  async captureMessage(session, message) {
    if (!message?.message || message.key?.remoteJid === "status@broadcast") return;
    if (this.ignoreFromMe && message.key?.fromMe) return;

    const messageId = message.key?.id || "";
    const messageKey = `${session.accountKey}:${messageId}`;
    if (messageId && this.seenMessageIds.has(messageKey)) return;
    if (messageId) this.seenMessageIds.add(messageKey);

    const chatId = message.key?.remoteJid || "unknown";
    const chatKey = `${session.accountKey}:${chatId}`;
    if (this.firstOnly && this.seenChats.has(chatKey)) return;
    if (this.firstOnly) this.seenChats.add(chatKey);

    const unwrapped = unwrapMessage(message.message);
    const senderIdentity = resolveCachedIdentity(extractSenderIdentity(message), session.identityByJid);
    const contactProfile = cachedProfileForIdentity(senderIdentity, session.identityByJid);
    const text = extractText(unwrapped);
    const adReply = extractExternalAdReply(message);
    const adSignals = findAdSignals(message);
    const hasPossibleAdData = Boolean(adReply) || adSignals.length > 0;
    const capturedAt = new Date().toISOString();

    if (this.adOnly && !hasPossibleAdData) return;

    if (this.dedupAdByChatAndSource && adReply?.sourceId) {
      const adKey = `${session.accountKey}:${chatId}:${adReply.sourceId}`;
      if (this.seenAdKeys.has(adKey)) return;
      this.seenAdKeys.add(adKey);
    }

    const contactojson = buildContactoJson({
      capturedAt,
      account: {
        id: session.accountKey,
        selfJid: session.accountJid,
        vendor: session.account.vendor,
        gerente: session.account.gerente
      },
      message,
      unwrapped,
      senderIdentity,
      chatId,
      messageId,
      text,
      adReply,
      adSignals,
      contactProfile
    });

    const normalized = {
      capturedAt,
      event: "messages.upsert",
      accountId: session.accountKey,
      account: session.accountKey,
      assigned_to: session.accountKey,
      accountJid: session.accountJid || null,
      contactId: senderIdentity.contactId,
      senderPhone: senderIdentity.senderPhone,
      senderPhoneJid: senderIdentity.senderPhoneJid,
      senderLid: senderIdentity.senderLid,
      senderIdentity,
      chatId,
      fromMe: Boolean(message.key?.fromMe),
      messageId,
      participant: message.key?.participant || null,
      pushName: message.pushName || contactProfile?.name || null,
      name: message.pushName || contactProfile?.name || null,
      messageTimestamp: normalizeScalar(message.messageTimestamp),
      messageType: firstKey(unwrapped),
      text,
      hasPossibleAdData,
      adReply,
      adSignals,
      vendor: session.account.vendor || null,
      gerente: session.account.gerente || null,
      contactojson,
      raw: message
    };

    const accountOutputDir = path.join(this.outputDir, safeFilePart(session.accountKey));
    await fs.mkdir(accountOutputDir, { recursive: true });
    const fileName = `${safeStamp()}-${safeFilePart(senderIdentity.contactId || chatId)}-${safeFilePart(messageId || "sin-id")}.json`;
    await fs.writeFile(path.join(accountOutputDir, fileName), safeJson(normalized), "utf8");

    session.lastMessageAt = capturedAt;
    await this.onPayload(normalized, session.account);
  }

  cacheContacts(session, payload, eventName) {
    const items = Array.isArray(payload) ? payload : [payload];
    for (const item of items) {
      const candidates = collectJidCandidates(item);
      const phones = uniqueCandidates([
        ...candidates.filter((entry) => entry.kind === "phone_jid"),
        ...collectBarePhoneCandidates(item)
      ]).filter((entry) => entry.phone);
      const lids = candidates.filter((entry) => entry.kind === "lid_jid" && entry.jid);
      const name = firstContactName(item);
      for (const lid of lids) {
        for (const phone of phones) {
          const profile = {
            lid: lid.jid,
            phone: phone.phone,
            phoneJid: phone.jid || `${phone.phone}@s.whatsapp.net`,
            name,
            resolution: eventName,
            updatedAt: new Date().toISOString(),
            raw: sanitizeForSignal(item)
          };
          session.identityByJid.set(lid.jid, profile);
          session.identityByJid.set(profile.phoneJid, profile);
          Promise.resolve(this.onContactUpdate(profile, session.account)).catch((error) => {
            session.lastError = error.message;
          });
        }
      }
    }
  }
}

function extractSenderIdentity(message) {
  const remoteJid = stringOrNull(message?.key?.remoteJid);
  const participant = stringOrNull(message?.key?.participant);
  const remoteJidAlt = findFirstStringByKey(message, "remoteJidAlt");
  const participantPn = findFirstStringByKey(message, "participantPn");
  const senderPn = findFirstStringByKey(message, "senderPn");
  const candidates = collectJidCandidates(message);

  const directPhoneCandidate = firstNonNull([
    jidToPhoneCandidate(remoteJid, "$.key.remoteJid"),
    jidToPhoneCandidate(participant, "$.key.participant"),
    jidToPhoneCandidate(remoteJidAlt, "$.key.remoteJidAlt"),
    jidToPhoneCandidate(participantPn, "$.participantPn"),
    jidToPhoneCandidate(senderPn, "$.senderPn")
  ]);

  const hintedPhoneCandidate = candidates.find((candidate) => (
    candidate.kind === "phone_jid" &&
    /remoteJidAlt|participantPn|senderPn|phone|pn\b/i.test(candidate.path)
  ));

  const anyPhoneCandidate = candidates.find((candidate) => candidate.kind === "phone_jid");
  const barePhoneCandidate = collectBarePhoneCandidates(message)
    .find((candidate) => /remoteJidAlt|participantPn|senderPn|phone|pn\b/i.test(candidate.path));
  const phoneCandidate = directPhoneCandidate || hintedPhoneCandidate || anyPhoneCandidate || barePhoneCandidate || null;

  const directLidCandidate = firstNonNull([
    jidToLidCandidate(remoteJid, "$.key.remoteJid"),
    jidToLidCandidate(participant, "$.key.participant")
  ]);
  const anyLidCandidate = candidates.find((candidate) => candidate.kind === "lid_jid");
  const lidCandidate = directLidCandidate || anyLidCandidate || null;

  const senderPhone = phoneCandidate?.phone || null;
  const senderPhoneJid = phoneCandidate?.jid || (senderPhone ? `${senderPhone}@s.whatsapp.net` : null);
  const senderLid = lidCandidate?.jid || null;
  const contactId = senderPhoneJid || senderLid || remoteJid || participant || "unknown";

  return {
    contactId,
    senderPhone,
    senderPhoneJid,
    senderLid,
    remoteJid,
    remoteJidAlt,
    participant,
    participantPn,
    senderPn,
    phoneResolution: senderPhone ? phoneCandidate.resolution : (senderLid ? "lid_only" : "unknown"),
    jidCandidates: candidates.slice(0, 40),
    barePhoneCandidates: collectBarePhoneCandidates(message).slice(0, 20)
  };
}

function resolveCachedIdentity(identity, cache) {
  const profile = cachedProfileForIdentity(identity, cache);
  if (!profile?.phone || identity.senderPhone) return identity;
  return {
    ...identity,
    contactId: identity.senderLid || profile.phoneJid,
    senderPhone: profile.phone,
    senderPhoneJid: profile.phoneJid,
    senderLid: identity.senderLid || profile.lid,
    phoneResolution: `baileys_${profile.resolution || "contact_cache"}`,
    cachedProfile: profile
  };
}

function cachedProfileForIdentity(identity, cache) {
  if (!cache?.get) return null;
  const keys = [
    identity.senderLid,
    identity.senderPhoneJid,
    identity.remoteJid,
    identity.remoteJidAlt,
    identity.participant,
    identity.participantPn
  ].filter(Boolean);
  for (const key of keys) {
    const profile = cache.get(key);
    if (profile) return profile;
  }
  return null;
}

function firstContactName(value) {
  if (!value || typeof value !== "object") return null;
  const candidates = [value.name, value.notify, value.verifiedName, value.pushName, value.shortName];
  for (const candidate of candidates) {
    const text = stringOrNull(candidate);
    if (text && !["SIN NOMBRE", "NO DISPONIBLE"].includes(text.toUpperCase())) return text;
  }
  return null;
}

function buildContactoJson({
  capturedAt,
  account,
  message,
  unwrapped,
  senderIdentity,
  chatId,
  messageId,
  text,
  adReply,
  adSignals,
  contactProfile
}) {
  return {
    capturedAt,
    accountId: account.id,
    accountJid: account.selfJid || null,
    vendor: account.vendor || null,
    gerente: account.gerente || null,
    contactId: senderIdentity.contactId,
    chatId,
    messageId,
    participant: message.key?.participant || null,
    pushName: message.pushName || null,
    messageTimestamp: normalizeScalar(message.messageTimestamp),
    messageType: firstKey(unwrapped),
    text,
    senderIdentity,
    phoneCandidates: uniqueCandidates([
      ...(senderIdentity.jidCandidates || []),
      ...(senderIdentity.barePhoneCandidates || [])
    ]),
    phoneDebugCandidates: collectPhoneDebugCandidates(message).slice(0, 80),
    baileysContactCache: contactProfile || null,
    adReply,
    adSignals,
    key: message.key || null,
    raw: message
  };
}

function collectJidCandidates(root) {
  const out = [];
  walkJids(root, "$", out, new WeakSet());
  return uniqueCandidates(out);
}

function walkJids(value, currentPath, out, seen) {
  if (value === null || value === undefined) return;

  if (typeof value === "string") {
    const jid = extractJid(value);
    if (!jid) return;
    const phone = jidToPhone(jid);
    const lid = jidToLid(jid);

    if (phone) {
      out.push({ path: currentPath, value, jid, phone, kind: "phone_jid", resolution: "phone_jid" });
    } else if (lid) {
      out.push({ path: currentPath, value, jid, lid, kind: "lid_jid", resolution: "lid_jid" });
    }
    return;
  }

  if (typeof value !== "object" || isBinaryLike(value) || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    walkJids(child, `${currentPath}.${key}`, out, seen);
  }
}

function collectBarePhoneCandidates(root) {
  const out = [];
  walkBarePhones(root, "$", out, new WeakSet());
  return uniqueCandidates(out);
}

function walkBarePhones(value, currentPath, out, seen) {
  if (value === null || value === undefined) return;

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    const normalized = normalizePhoneDigits(value);
    if (!normalized) return;
    out.push({
      path: currentPath,
      value: String(value),
      phone: normalized,
      jid: `${normalized}@s.whatsapp.net`,
      kind: "bare_phone",
      resolution: "bare_phone_hint"
    });
    return;
  }

  if (typeof value !== "object" || isBinaryLike(value) || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${currentPath}.${key}`;
    if (/phone|wa_id|senderPn|participantPn|remoteJidAlt|\bpn\b/i.test(nextPath)) {
      walkBarePhones(child, nextPath, out, seen);
    } else if (child && typeof child === "object" && !isBinaryLike(child)) {
      walkBarePhones(child, nextPath, out, seen);
    }
  }
}

function collectPhoneDebugCandidates(root) {
  const out = [];
  walkPhoneDebugCandidates(root, "$", out, new WeakSet());
  return uniqueCandidates(out);
}

function walkPhoneDebugCandidates(value, currentPath, out, seen) {
  if (value === null || value === undefined) return;

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    const normalizedValue = normalizeScalar(value);
    const jid = extractJid(normalizedValue);

    if (jid) {
      const phone = jidToPhone(jid);
      const lid = jidToLid(jid);
      if (phone) {
        out.push({
          path: currentPath,
          value: String(normalizedValue),
          jid,
          phone,
          kind: "phone_jid",
          resolution: "phone_jid_debug"
        });
      } else if (lid) {
        out.push({
          path: currentPath,
          value: String(normalizedValue),
          jid,
          lid,
          kind: "lid_jid",
          resolution: "lid_jid_debug"
        });
      }
      return;
    }

    if (isPhoneDebugPath(currentPath)) {
      const phone = normalizePhoneDigits(normalizedValue);
      if (phone) {
        out.push({
          path: currentPath,
          value: String(normalizedValue),
          phone,
          jid: `${phone}@s.whatsapp.net`,
          kind: "bare_phone_debug",
          resolution: "bare_phone_debug"
        });
      }
    }
    return;
  }

  if (typeof value !== "object" || isBinaryLike(value) || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    walkPhoneDebugCandidates(child, `${currentPath}.${key}`, out, seen);
  }
}

function isPhoneDebugPath(pathName) {
  const pathText = String(pathName || "");
  if (/sourceId|source_id|adReply|externalAdReply|referral|thumbnail|media|timestamp|amount|price|total|campaign|fbclid|utm/i.test(pathText)) {
    return false;
  }
  return /phone|wa_id|sender|participant|remoteJid|jid|contact|chat|\bpn\b|author/i.test(pathText);
}

function findFirstStringByKey(value, targetKey, seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value !== "object" || isBinaryLike(value)) return null;
  if (seen.has(value)) return null;
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (key === targetKey && child !== null && child !== undefined) {
      return String(normalizeScalar(child));
    }
  }

  for (const child of Object.values(value)) {
    const found = findFirstStringByKey(child, targetKey, seen);
    if (found) return found;
  }
  return null;
}

function jidToPhoneCandidate(value, pathName) {
  const jid = extractJid(value);
  const phone = jidToPhone(jid);
  if (!phone) return null;
  return { path: pathName, value, jid, phone, kind: "phone_jid", resolution: "phone_jid" };
}

function jidToLidCandidate(value, pathName) {
  const jid = extractJid(value);
  const lid = jidToLid(jid);
  if (!lid) return null;
  return { path: pathName, value, jid, lid, kind: "lid_jid", resolution: "lid_jid" };
}

function extractExternalAdReply(root) {
  const externalAdReply = findValueByKey(root, "externalAdReply");
  if (!externalAdReply || typeof externalAdReply !== "object") return null;

  const title = stringOrNull(externalAdReply.title);
  const reference = extractAdReference(title || "");
  return {
    title,
    body: stringOrNull(externalAdReply.body),
    mediaType: normalizeScalar(externalAdReply.mediaType ?? null),
    thumbnailUrl: stringOrNull(externalAdReply.thumbnailUrl),
    sourceType: stringOrNull(externalAdReply.sourceType),
    sourceId: stringOrNull(normalizeScalar(externalAdReply.sourceId)),
    sourceUrl: stringOrNull(externalAdReply.sourceUrl),
    containsAutoReply: booleanOrNull(externalAdReply.containsAutoReply),
    renderLargerThumbnail: booleanOrNull(externalAdReply.renderLargerThumbnail),
    showAdAttribution: booleanOrNull(externalAdReply.showAdAttribution),
    adReference: reference.adReference,
    adCode: reference.adCode,
    raw: sanitizeForSignal(externalAdReply)
  };
}

function findValueByKey(value, targetKey, seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value !== "object" || isBinaryLike(value)) return null;
  if (seen.has(value)) return null;
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (key === targetKey) return child;
  }
  for (const child of Object.values(value)) {
    const found = findValueByKey(child, targetKey, seen);
    if (found) return found;
  }
  return null;
}

function extractAdReference(title) {
  const matches = [...String(title).matchAll(/[A-Z]\d{3,4}[A-Z]\d{3}(?:\.[A-Z]\.\d+)?/gi)]
    .map((match) => match[0].toUpperCase());

  if (!matches.length) return { adReference: null, adCode: null };
  const adReference = matches.sort((a, b) => b.length - a.length)[0];
  return {
    adReference,
    adCode: adReference.split(".")[0] || adReference
  };
}

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 8; i += 1) {
    if (current?.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else if (current?.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current?.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current?.documentWithCaptionMessage?.message) current = current.documentWithCaptionMessage.message;
    else break;
  }
  return current || message;
}

function extractText(message) {
  const m = unwrapMessage(message);
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    m?.buttonsResponseMessage?.selectedDisplayText ||
    m?.templateButtonReplyMessage?.selectedDisplayText ||
    m?.listResponseMessage?.title ||
    m?.listResponseMessage?.description ||
    m?.reactionMessage?.text ||
    ""
  );
}

function findAdSignals(root) {
  const out = [];
  walkAdSignals(root, "$", out, new WeakSet());
  return out.slice(0, 60);
}

function walkAdSignals(value, currentPath, out, seen) {
  if (value === null || value === undefined || typeof value !== "object" || isBinaryLike(value)) return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${currentPath}.${key}`;
    if (isInterestingPath(nextPath, key)) {
      out.push({ path: nextPath, value: sanitizeForSignal(child) });
    }
    if (child && typeof child === "object" && !isBinaryLike(child)) {
      walkAdSignals(child, nextPath, out, seen);
    }
  }
}

function isInterestingPath(currentPath, key) {
  const text = `${currentPath}.${key}`;
  return /externalAdReply|adReply|adContext|referral|sourceUrl|sourceId|sourceType|headline|ctwa|click|campaign|facebook|instagram|fbclid|utm_|ad_|advert/i.test(text);
}

function sanitizeForSignal(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return normalizeScalar(value);
  if (isBinaryLike(value)) return describeBinary(value);

  const safe = {};
  for (const [key, child] of Object.entries(value)) {
    if (isBinaryLike(child)) safe[key] = describeBinary(child);
    else if (typeof child === "object" && child !== null) safe[key] = preview(child);
    else safe[key] = normalizeScalar(child);
  }
  return safe;
}

function safeJson(value) {
  const seen = new WeakSet();
  return `${JSON.stringify(value, (key, child) => {
    if (typeof child === "bigint") return child.toString();
    if (isBinaryLike(child)) return describeBinary(child);
    if (child && typeof child === "object") {
      if (seen.has(child)) return "[Circular]";
      seen.add(child);
    }
    return normalizeScalar(child);
  }, 2)}\n`;
}

function normalizeScalar(value) {
  if (typeof value === "bigint") return value.toString();
  if (value && typeof value === "object" && typeof value.toString === "function" && value.constructor?.name === "Long") {
    return value.toString();
  }
  return value;
}

function extractJid(value) {
  if (value === null || value === undefined) return null;
  const text = String(normalizeScalar(value));
  const match = text.match(/(?:^|[^\w.+-])(\d+)@(s\.whatsapp\.net|lid)(?:$|[^\w.-])/i);
  if (!match) return null;
  return `${match[1]}@${match[2].toLowerCase()}`;
}

function jidToPhone(jid) {
  if (!jid || !/@s\.whatsapp\.net$/i.test(jid)) return null;
  return normalizePhoneDigits(jid.split("@")[0]);
}

function jidToLid(jid) {
  if (!jid || !/@lid$/i.test(jid)) return null;
  return jid.split("@")[0] || null;
}

function normalizePhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const candidate of candidates) {
    const key = `${candidate.kind}:${candidate.jid || candidate.phone || candidate.lid}:${candidate.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

function firstKey(value) {
  return Object.keys(value || {})[0] || null;
}

function stringOrNull(value) {
  if (value === null || value === undefined) return null;
  return String(normalizeScalar(value));
}

function booleanOrNull(value) {
  return typeof value === "boolean" ? value : null;
}

function firstNonNull(values) {
  return values.find((value) => value !== null && value !== undefined) || null;
}

function isBinaryLike(value) {
  return value instanceof Uint8Array ||
    value instanceof ArrayBuffer ||
    Buffer.isBuffer(value) ||
    value?.type === "Buffer";
}

function describeBinary(value) {
  const length = value?.length || value?.byteLength || value?.data?.length || 0;
  return `[Binary ${length} bytes]`;
}

function preview(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 260 ? `${text.slice(0, 260)}...` : text;
}

function safeStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeFilePart(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

module.exports = {
  createBaileysManager,
  BaileysManager
};
