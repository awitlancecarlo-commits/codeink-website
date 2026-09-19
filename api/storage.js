// Serverless function (Vercel) that proxies to Supabase.
// All shop data lives under keys prefixed "codeink:" in one table,
// so every visitor and the admin dashboard read/write the same data.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { key, prefix } = req.query;

      if (prefix !== undefined) {
        const { data, error } = await supabase
          .from("codeink_storage")
          .select("key")
          .like("key", `codeink:${prefix}%`);
        if (error) throw error;
        return res.status(200).json({ keys: data.map((d) => d.key.replace("codeink:", "")) });
      }

      if (!key) return res.status(400).json({ error: "key required" });
      const { data, error } = await supabase
        .from("codeink_storage")
        .select("value")
        .eq("key", `codeink:${key}`)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "not found" });
      return res.status(200).json({ key, value: data.value });
    }

    if (req.method === "POST") {
      const { key, value } = req.body || {};
      if (!key) return res.status(400).json({ error: "key required" });
      const { error } = await supabase
        .from("codeink_storage")
        .upsert({ key: `codeink:${key}`, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      return res.status(200).json({ key, value });
    }

    if (req.method === "DELETE") {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: "key required" });
      const { error } = await supabase
        .from("codeink_storage")
        .delete()
        .eq("key", `codeink:${key}`);
      if (error) throw error;
      return res.status(200).json({ key, deleted: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
