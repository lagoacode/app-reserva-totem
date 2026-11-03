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
  modoDemonstracao: true,
  // Endereço da API de reservas quando modoDemonstracao = false
  apiBase: "https://SEU-SERVIDOR/api/checkin",

  empreendimentos: {
    ecotowers: {
      nome: "Ecotowers",
      local: "Caldas Novas · Goiás",
      foto: "assets/img/lobby-ecotowers.jpg",
      horarioEntrada: "14h",
      horarioSaida: "11h"
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
