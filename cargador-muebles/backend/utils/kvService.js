const axios = require('axios');

const kvStore = {
  async put(key, value) {
    const content = typeof value === 'object' ? JSON.stringify(value) : value;
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_NAMESPACE_ID}/values/${key}`;
    try {
      await axios.put(url, content, {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'text/plain'
        }
      });
    } catch (error) { throw new Error(`Cloudflare PUT Error: ${error.message}`); }
  },
  async get(key) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_NAMESPACE_ID}/values/${key}`;
    try {
      const res = await axios.get(url, { headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } });
      return res.data;
    } catch(e) { return null; }
  },
  async delete(key) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_NAMESPACE_ID}/values/${key}`;
    try {
      await axios.delete(url, { headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } });
    } catch (e) { throw new Error(`Cloudflare DELETE Error: ${e.message}`); }
  }
};

module.exports = kvStore;
