/*
 * Cliente HTTP da API eSolution (lado servidor).
 * Injeta o header "token", aplica timeout e desembrulha o envelope { Success, Message, Data }.
 * Em erro, lança EsolutionError (tem .status) para o chamador distinguir
 * token/permissão (401/403), servidor (>=500), rede/timeout (0) e falha de negócio (Success:false).
 */
export class EsolutionError extends Error {
  constructor(status, message) {
    super(message || ("HTTP " + status));
    this.name = "EsolutionError";
    this.status = status;
  }
}

function montarQuery(query) {
  if (!query) return "";
  const pares = Object.entries(query).filter(([, v]) => v != null && v !== "");
  if (!pares.length) return "";
  return "?" + new URLSearchParams(Object.fromEntries(pares)).toString();
}

export async function esolutionGet(hotelCfg, rota, query, timeoutMs) {
  if (!hotelCfg || !hotelCfg.base || !hotelCfg.token) {
    throw new EsolutionError(0, "Integração não configurada");
  }
  const url = hotelCfg.base.replace(/\/+$/, "") + rota + montarQuery(query);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 15000);

  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { token: hotelCfg.token, "Content-Type": "application/x-www-form-urlencoded" },
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    throw new EsolutionError(0, e && e.name === "AbortError" ? "Tempo esgotado" : "Falha de rede");
  }
  clearTimeout(timer);

  if (res.status === 401 || res.status === 403) throw new EsolutionError(res.status, "Token inválido ou sem permissão");
  if (res.status >= 500) throw new EsolutionError(res.status, "Erro no servidor eSolution");
  if (res.status === 404) return null;

  let body;
  try { body = await res.json(); } catch { throw new EsolutionError(res.status, "Resposta inválida"); }

  // Envelope eSolution: { Success, Message, Data }
  if (body && typeof body === "object" && "Success" in body) {
    if (body.Success === false) throw new EsolutionError(200, body.Message || "Falha na requisição");
    return body.Data;
  }
  return body;
}
