/*
 * Configuração dos empreendimentos.
 * Escolha qual totem está rodando pela URL:  index.html?hotel=ecotowers
 * Sem parâmetro, usa o valor de PADRAO.
 */
window.KIOSK_CONFIG = {
  PADRAO: "ecotowers",

  // Segundos sem toque antes de perguntar "Você ainda está aí?"
  inatividadeSegundos: 45,
  // Contagem regressiva do aviso antes de voltar para a tela inicial
  avisoSegundos: 15,
  // Posição do leitor de pulseira, embaixo da tela: 0 = canto esquerdo, 1 = canto direito
  leitorPulseiraX: 0.7,
  // Posição da maquininha de cartão, embaixo da tela: 0 = esquerda, 1 = direita
  maquininhaX: 0.5,
  // Segundos na tela final antes de reiniciar
  telaFinalSegundos: 20,
  // true = usa dados de exemplo (js/api.js). false = chama a API real.
  // Default demo; cada totem liga o modo real em js/config.local.js (não versionado).
  modoDemonstracao: true,
  // Endereço da API de reservas quando modoDemonstracao = false (endpoints ainda não ligados: pulseira, pagamento...)
  apiBase: "https://SEU-SERVIDOR/api/checkin",

  // Parâmetros gerais da integração eSolution (valem quando modoDemonstracao = false)
  integracao: {
    timeoutMs: 15000,
    // Query param da rota /v1/reservas/reserva. O valor é o NÚMERO da reserva que o hóspede
    // digita no totem. A rota só retorna reservas confirmadas (Status "CF").
    campoBuscaReserva: "Id"
  },

  empreendimentos: {
    ecotowers: {
      nome: "Ecotowers",
      local: "Caldas Novas · Goiás",
      foto: "assets/img/lobby-ecotowers.jpg",
      horarioEntrada: "14h",
      horarioSaida: "11h",
      // Integração eSolution. base = servidor:porta. O token (Credencial Fixa) NÃO fica aqui:
      // é definido em js/config.local.js (não versionado). Veja js/config.local.example.js.
      webSales: { base: "http://192.168.6.19:1625", token: "" },
      // PDV (não-virtual) para as rotas de conta/cartão no check-out. Preencher quando definido.
      pdvId: null
    },
    // Preencher quando os outros empreendimentos forem configurados
    empreendimento2: {
      nome: "Empreendimento 2",
      local: "Caldas Novas · Goiás",
      foto: "assets/img/lobby-ecotowers.jpg",
      horarioEntrada: "14h",
      horarioSaida: "11h"
    },
    empreendimento3: {
      nome: "Empreendimento 3",
      local: "Caldas Novas · Goiás",
      foto: "assets/img/lobby-ecotowers.jpg",
      horarioEntrada: "14h",
      horarioSaida: "11h"
    }
  }
};
