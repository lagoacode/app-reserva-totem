/*
 * Cliente HTTP central da integração eSolution.
 * Injeta o header "token", aplica timeout e desembrulha o envelope { Success, Message, Data }.
 * Em erro, rejeita com KioskHTTP.HttpError (tem .status) para o chamador distinguir
 * token/permissão (401/403), servidor (>=500), rede/timeout (0) e falha de negócio (Success:false).
 */
(function () {
  var cfg = window.KIOSK_CONFIG;

  function webSalesDe(hotelId) {
    var e = (cfg.empreendimentos && cfg.empreendimentos[hotelId]) || {};
    return e.webSales || {};
  }
  function timeoutMs() { return (cfg.integracao && cfg.integracao.timeoutMs) || 15000; }

  function HttpError(status, message) { this.name = "HttpError"; this.status = status; this.message = message || ("HTTP " + status); }
  HttpError.prototype = Object.create(Error.prototype);

  function montarQuery(url, query) {
    if (!query) return url;
    var qs = Object.keys(query)
      .filter(function (k) { return query[k] != null && query[k] !== ""; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(query[k]); })
      .join("&");
    return qs ? url + (url.indexOf("?") < 0 ? "?" : "&") + qs : url;
  }

  function pedir(hotelId, metodo, rota, query) {
    var ws = webSalesDe(hotelId);
    if (!ws.base || !ws.token) return Promise.reject(new HttpError(0, "Integração não configurada para " + hotelId));

    var url = montarQuery(ws.base.replace(/\/+$/, "") + rota, query);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs());

    return fetch(url, { method: metodo, headers: { token: ws.token, "Content-Type": "application/x-www-form-urlencoded" }, signal: ctrl.signal })
      .then(function (r) {
        clearTimeout(timer);
        if (r.status === 401 || r.status === 403) throw new HttpError(r.status, "Token inválido ou sem permissão");
        if (r.status >= 500) throw new HttpError(r.status, "Erro no servidor");
        if (r.status === 404) return null;
        return r.json().catch(function () { throw new HttpError(r.status, "Resposta inválida"); });
      })
      .then(function (body) {
        if (body == null) return null;
        // Envelope eSolution: { Success, Message, Data }
        if (body && typeof body === "object" && "Success" in body) {
          if (body.Success === false) throw new HttpError(200, body.Message || "Falha na requisição");
          return body.Data;
        }
        return body;
      })
      .catch(function (e) {
        clearTimeout(timer);
        if (e instanceof HttpError) throw e;
        if (e && e.name === "AbortError") throw new HttpError(0, "Tempo esgotado");
        throw new HttpError(0, "Falha de rede");
      });
  }

  window.KioskHTTP = {
    get: function (hotelId, rota, query) { return pedir(hotelId, "GET", rota, query); },
    post: function (hotelId, rota, query) { return pedir(hotelId, "POST", rota, query); },
    HttpError: HttpError
  };
})();
