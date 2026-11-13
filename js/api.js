/*
 * Camada de dados do totem.
 * Hoje responde com dados de exemplo. Para ligar ao sistema de reservas,
 * coloque modoDemonstracao = false em js/config.js e ajuste as rotas abaixo.
 *
 * Formato da reserva que as telas esperam:
 * {
 *   numero: "584210",
 *   entrada: "2026-09-07", saida: "2026-09-12",
 *   acomodacao: "Bloco C", apartamento: "312",
 *   adultos: 3, criancas: 1,
 *   hospedes: [{ nome: "Mariana Costa Ribeiro", titular: true, crianca: false }, ...]
 * }
 * Retorne null quando não houver reserva.
 */
(function () {
  var cfg = window.KIOSK_CONFIG;

  var EXEMPLO = {
    numero: "584210",
    entrada: "2026-09-07", saida: "2026-09-12",
    acomodacao: "Bloco C", apartamento: "312",
    adultos: 3, criancas: 1,
    hospedes: [
      { nome: "Mariana Costa Ribeiro", titular: true },
      { nome: "Rafael Lima Ribeiro" },
      { nome: "Sônia Costa Almeida" },
      { nome: "Theo Costa Ribeiro", crianca: true }
    ]
  };

  // consumos por hóspede (mesma ordem de EXEMPLO.hospedes), usados na leitura das pulseiras
  var CONSUMOS_POR_HOSPEDE = [
    [{ descricao: "Restaurante · jantar", local: "Restaurante do hotel", valor: 186.5 }, { descricao: "Frigobar", local: "Apartamento", valor: 30.0 }],
    [{ descricao: "Bar da piscina", local: "Parque", valor: 64.0 }, { descricao: "Sorveteria", local: "Parque", valor: 18.0 }],
    [{ descricao: "Café da tarde", local: "Lobby", valor: 22.9 }],
    []
  ];

  var CONSUMOS_EXEMPLO = [
    { descricao: "Restaurante · jantar", local: "Restaurante do hotel", valor: 186.5 },
    { descricao: "Bar da piscina", local: "Parque", valor: 64.0 },
    { descricao: "Frigobar", local: "Apartamento", valor: 30.0 }
  ];

  function espera(ms, valor) { return new Promise(function (r) { setTimeout(function () { r(valor); }, ms); }); }

  /* Chamada ao backend do totem (mesma origem). 404 vira null; erro propaga. */
  function backend(rota) {
    return fetch(cfg.apiBase + rota).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function chamar(rota, corpo) {
    return fetch(cfg.apiBase + rota, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  window.KioskAPI = {
    /* Busca pela numeração do voucher (6 dígitos) */
    buscarPorReserva: function (numero, hotel) {
      if (!cfg.modoDemonstracao) {
        return backend("/reservas/" + encodeURIComponent(numero) + "?hotel=" + encodeURIComponent(hotel));
      }
      // na demonstração, "123456" simula reserva não encontrada
      if (numero === "123456") return espera(1500, null);
      return espera(1500, Object.assign({}, EXEMPLO, { numero: numero }));
    },

    /* Busca pela pulseira lida no leitor. Retorna { reserva, hospede (índice em reserva.hospedes), consumos: [...] }
     * jaLidas: índices dos hóspedes cujas pulseiras já foram lidas (só usado na demonstração) */
    buscarPorPulseira: function (codigo, hotel, jaLidas) {
      if (!cfg.modoDemonstracao) return chamar("/pulseira", { codigo: codigo, hotel: hotel });
      jaLidas = jaLidas || [];
      var idx = /^\d$/.test(codigo) ? +codigo : EXEMPLO.hospedes.findIndex(function (_, k) { return jaLidas.indexOf(k) < 0; });
      if (idx < 0) idx = 0;
      return espera(jaLidas.length ? 500 : 1200, { reserva: EXEMPLO, hospede: idx, consumos: CONSUMOS_POR_HOSPEDE[idx] || [] });
    },

    /* Pagamento no totem. metodo: "credito" | "debito" | "pix". Retorna { aprovado: true, nsu }
     * Na demonstração, a aprovação vem do botão "Simular pagamento aprovado" ou depois de alguns segundos. */
    pagar: function (metodo, valor, numero, hotel) {
      if (!cfg.modoDemonstracao) return chamar("/pagamento", { metodo: metodo, valor: valor, numero: numero, hotel: hotel });
      return new Promise(function (ok) { window.__aprovarPagamento = function () { ok({ aprovado: true, nsu: "DEMO" }); }; setTimeout(window.__aprovarPagamento, 7000); });
    },

    /* Busca a reserva do dia pelo CPF do titular (11 dígitos, sem máscara) */
    buscarPorCPF: function (cpf, hotel) {
      if (!cfg.modoDemonstracao) return chamar("/cpf", { cpf: cpf, hotel: hotel });
      return espera(1500, EXEMPLO);
    },

    /* Envia o regimento interno pelo WhatsApp. telefone: "55" + DDD + número. Retorna { ok: true } */
    enviarRegimento: function (numero, telefone, hotel) {
      if (!cfg.modoDemonstracao) return chamar("/regimento", { numero: numero, telefone: telefone, hotel: hotel });
      return espera(600, { ok: true });
    },

    /* Consumos em aberto da reserva. Retorna [{ descricao, local, valor }] (valor em reais) */
    consultarConsumos: function (numero, hotel) {
      if (!cfg.modoDemonstracao) return chamar("/consumos", { numero: numero, hotel: hotel });
      return espera(400, CONSUMOS_EXEMPLO);
    },

    /* Registra o check-out e a avaliação. Retorna { ok: true }
     * avaliacao: { nota: 1..5 ou null, tipo: "gostou" | "melhorar", itens: ["comida", "atendimento", ...] } */
    registrarCheckout: function (numero, avaliacao, hotel) {
      if (!cfg.modoDemonstracao) return chamar("/checkout", { numero: numero, avaliacao: avaliacao, hotel: hotel });
      return espera(600, { ok: true });
    },

    /* Registra o check-in e libera as pulseiras para retirada no Fast Check-in. Retorna { pulseiras: n } */
    confirmarCheckin: function (numero, hotel) {
      if (!cfg.modoDemonstracao) return chamar("/confirmar", { numero: numero, hotel: hotel, aceiteCondicoes: true });
      return espera(600, { pulseiras: EXEMPLO.hospedes.length });
    }
  };
})();
