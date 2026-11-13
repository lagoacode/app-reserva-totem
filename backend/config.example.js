/*
 * Template da configuração do backend. Copie para backend/config.js e preencha.
 * backend/config.js é ignorado pelo git e guarda os segredos (token eSolution,
 * e depois a credencial do banco). Nunca comitar.
 */
export default {
  // Porta onde o backend serve o front + /api
  port: 3100,
  // Timeout das chamadas à API eSolution (ms)
  timeoutMs: 15000,

  // Um bloco por empreendimento. A chave casa com ?hotel=<chave> do totem.
  hoteis: {
    ecotowers: {
      // Servidor:porta do WebSales/WebCheckin do eSolution
      base: "http://192.168.6.19:1625",
      // Token (Credencial Fixa) gerado no eSolution Portal
      token: "COLE-AQUI-O-TOKEN-DO-ECOTOWERS"
      // hotelId (banco) e pdvId entram nas próximas fases
    }
  }
};
