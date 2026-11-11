/*
 * Template de configuração local. Copie para js/config.local.js e preencha.
 * js/config.local.js é ignorado pelo git e não deve ser commitado.
 */
(function () {
  var cfg = window.KIOSK_CONFIG;
  cfg.modoDemonstracao = false; // false = API real; remova/true = mantém a demonstração
  cfg.empreendimentos.ecotowers.webSales.token = "COLE-AQUI-O-TOKEN-DO-ECOTOWERS";
  // cfg.empreendimentos.empreendimento2.webSales.token = "...";
})();
