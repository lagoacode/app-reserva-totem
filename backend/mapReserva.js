/*
 * Mapeia o DTO do eSolution (GET /v1/reservas/reserva?Id=) para o formato que as telas esperam.
 * DTO: { Id, Status, TipoUh (nome), UH, CheckInPrevisao, CheckOutPrevisao, NomeHospedePrincipal,
 *        ListaHospede: [{ Principal: "S"|"N", FaixaEtaria: "AD"|"C1"|"C2", Pessoa: { Nome } }] }
 * A rota só retorna reservas confirmadas ("CF").
 */
function soData(dt) { return dt ? String(dt).slice(0, 10) : ""; }   // "2026-12-20T00:00:00" -> "2026-12-20"

export function mapReserva(r) {
  if (!r) return null;
  const lista = Array.isArray(r.ListaHospede) ? r.ListaHospede : [];
  let hospedes = lista.map((h) => {
    const faixa = (h.FaixaEtaria || "").toUpperCase();   // AD = adulto; C1/C2 = criança
    return {
      nome: (h.Pessoa && h.Pessoa.Nome) || "",
      titular: h.Principal === "S",
      crianca: faixa.charAt(0) === "C"
    };
  });
  if (!hospedes.length && r.NomeHospedePrincipal) hospedes = [{ nome: r.NomeHospedePrincipal, titular: true }];
  const criancas = hospedes.filter((h) => h.crianca).length;
  return {
    numero: String(r.Id),
    entrada: soData(r.CheckInPrevisao),
    saida: soData(r.CheckOutPrevisao),
    acomodacao: r.TipoUh || "",
    apartamento: r.UH || "",
    adultos: hospedes.length - criancas,
    criancas: criancas,
    hospedes: hospedes
  };
}
