import { Sistema } from "../utils";
import ScrappedAndamento from "./ScrappedAndamento";
import ScrappedParte from "./ScrappedParte";
import ScrappedUnidadeJurisdicional from "./ScrappedUnidadeJurisdicional";

export type SimpleType = {
  id?: string | number;
  valor: string;
};

export default class ScrappedProcesso {
  constructor(
    public numero: string,
    public sistema: Sistema,
    public partesRequerentes: ScrappedParte[],
    public partesRequeridas: ScrappedParte[],
    public outrosParticipantes: ScrappedParte[],
    public andamentos: ScrappedAndamento[],
    public pedidos?: string[],
    public url?: URL,
    public dataDistribuicao?: Date,
    public valorDaCausa?: number,
    public causaDePedir?: SimpleType[],
    public juizo?: ScrappedUnidadeJurisdicional,
    public juizAtual?: string,
    public audienciaFutura?: ScrappedAndamento,
    public tipoDeAcao?: SimpleType[],
    public segredoJustica?: boolean,
    public numeroProcessoPrincipal?: string,
    public numeroRegional?: string,
    public numerosIncidentes?: string[],
    public numerosProcessosRelacionados?: string[],
    public errorMsgs: string[] = []
  ) {
    this.dataDistribuicao = dataDistribuicao
      ? new Date(dataDistribuicao.getTime())
      : undefined;
  }
}
