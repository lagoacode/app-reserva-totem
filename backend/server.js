/*
 * BFF do totem (Fase 1).
 * - Serve o front estático (index.html, css, js, assets) na mesma origem — some CORS/mixed-content.
 * - Expõe GET /api/reservas/:numero?hotel=<chave> fazendo proxy do eSolution com o token
 *   injetado no servidor (o token nunca chega ao navegador).
 */
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "./config.js";
import { esolutionGet, EsolutionError } from "./esolution.js";
import { mapReserva } from "./mapReserva.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");   // raiz do projeto (onde está o front)

const app = express();
app.disable("x-powered-by");

/* ---------- API ---------- */

// Busca a reserva pelo número (Id). 404 = não encontrada/não confirmada.
app.get("/api/reservas/:numero", async (req, res) => {
  const hotelCfg = config.hoteis[req.query.hotel];
  if (!hotelCfg) return res.status(400).json({ erro: "hotel inválido" });

  const numero = String(req.params.numero || "").replace(/\D/g, "");
  if (!numero) return res.status(400).json({ erro: "número inválido" });

  try {
    const data = await esolutionGet(hotelCfg, "/v1/reservas/reserva", { Id: numero }, config.timeoutMs);
    const r = Array.isArray(data) ? data[0] : data;   // Data vem como array
    const reserva = mapReserva(r);
    if (!reserva) return res.status(404).json({ erro: "reserva não encontrada" });
    res.json(reserva);
  } catch (e) {
    if (e instanceof EsolutionError) {
      // 401/403/negócio -> 502 (falha upstream); timeout/rede (status 0) -> 504
      const status = e.status === 0 ? 504 : 502;
      return res.status(status).json({ erro: e.message });
    }
    console.error("Erro inesperado em /api/reservas:", e);
    res.status(500).json({ erro: "erro interno" });
  }
});

/* ---------- Front estático (apenas os assets do totem) ---------- */
app.get("/", (_req, res) => res.sendFile(path.join(ROOT, "index.html")));
app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/js", express.static(path.join(ROOT, "js")));
app.use("/assets", express.static(path.join(ROOT, "assets")));

app.listen(config.port, () => {
  console.log(`Totem backend em http://localhost:${config.port}  (abra /?hotel=ecotowers)`);
});
