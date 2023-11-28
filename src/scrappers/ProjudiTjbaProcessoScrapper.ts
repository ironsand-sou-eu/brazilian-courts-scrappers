import ScrappedProcesso, {
  SimpleType,
} from "../data-structures/ScrappedProcesso";
import ScrappedAndamento from "../data-structures/ScrappedAndamento";
import ScrappedUnidadeJurisdicional from "../data-structures/ScrappedUnidadeJurisdicional";
import ProcessoScrapper from "./ProcessoScrapper";
import ProjudiTjbaAndamentosScrapper from "./ProjudiTjbaAndamentosScrapper";
import ProjudiTjbaPartesScrapper from "./ProjudiTjbaPartesScrapper";
import { PartesReturn } from "./PartesScrapper";
import {
  getElementFollowingCellSearchedByTextContent,
  getValueFollowingCellSearchedByTextContent,
} from "../utils";

type JuizoInfo = { juizo?: ScrappedUnidadeJurisdicional; nomeJuiz?: string };

export default class ProjudiTjbaProcessoScrapper extends ProcessoScrapper {
  protected static PROCESSO_HOME_PATH_PART =
    "/projudi/listagens/DadosProcesso?numeroProcesso=";
  protected static IGNORE_URLS_CONTAINING = [
    "https://projudi.tjba.jus.br/projudi/scripts/subModal/carregando.html",
    "https://projudi.tjba.jus.br/projudi/Cabecalho.jsp",
    "https://projudi.tjba.jus.br/projudi/advogado/CentroAdvogado",
  ];
  protected static PROJUDI_EXTENDED_DATE_REGEX =
    /\d{1,2} de [a-zç]+ de (\d{2}|\d{4}) às \d{1,2}:\d{1,2}/gi;
  protected divPartes: HTMLElement;
  protected divPartesTbody: HTMLElement;

  constructor(protected doc: Document) {
    super(doc);
  }

  public async fetchProcessoInfo(): Promise<ScrappedProcesso> {
    return super.fetchProcessoInfo();
  }

  public checkProcessoHomepage(): boolean {
    const result = super.checkProcessoHomepage(
      this.doc.URL,
      ProjudiTjbaProcessoScrapper.IGNORE_URLS_CONTAINING,
      ProjudiTjbaProcessoScrapper.PROCESSO_HOME_PATH_PART
    );
    return result;
  }

  protected loadPageCheckpoints(): void {
    this.divPartes = this.doc.querySelector("#Partes")!;
    this.divPartesTbody = this.divPartes.querySelector("table > tbody")!;
  }

  protected async scrappeProcessoInfo(): Promise<ScrappedProcesso> {
    const andamentos = (await this.getAndamentos()) ?? [];
    const { poloAtivo, poloPassivo, outros } = this.getPartes();
    const { juizo, nomeJuiz } = this.getJuizoInfo();
    const processoInfo = new ScrappedProcesso(
      this.getNumero(),
      "projudiTjba",
      poloAtivo ?? [],
      poloPassivo ?? [],
      outros ?? [],
      andamentos,
      this.getPedidos(),
      this.getUrl(),
      this.getDataDistribuicao(),
      this.getValorDaCausa(),
      this.getCausaDePedir(),
      juizo,
      nomeJuiz,
      this.getAudienciaFutura(andamentos),
      this.getTipoDeAcao(),
      this.getSegredoJustica(),
      this.getNumeroProcessoPrincipal(),
      this.getNumeroRegional(),
      this.getNumerosIncidentes(),
      this.getNumerosProcessosRelacionados()
    );
    return processoInfo;
  }

  protected getNumero(): string | undefined {
    const linkNumeroProcesso = this.divPartes.querySelector(
      `a[href*="${ProjudiTjbaProcessoScrapper.PROCESSO_HOME_PATH_PART}"]`
    );
    return linkNumeroProcesso?.textContent;
    // TODO: Validar número CNJ com RegEx ou lançar exceção
  }

  protected getNumeroRegional(): null {
    return null;
  }

  protected getUrl(): URL {
    const linkNumeroProcesso = this.divPartes.querySelector<HTMLAnchorElement>(
      `a[href*="${ProjudiTjbaProcessoScrapper.PROCESSO_HOME_PATH_PART}"]`
    );
    return new URL(linkNumeroProcesso!.href);
  }

  protected getDataDistribuicao(): Date | null {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(14) > td:nth-child(3)",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "data de distribuição",
    };
    const projudiDateString =
      getValueFollowingCellSearchedByTextContent(params);
    return projudiDateString
      ? this.getDateFromProjudiTjbaDateString(projudiDateString)
      : null;
  }

  protected getDateFromProjudiTjbaDateString(dateStr: string): Date {
    const timeDiffFromGmt = "-03:00";
    const dateStrWithoutPrepositions = dateStr
      .trim()
      .replaceAll(/(de )|(às )|( h)/g, "");
    const dateStrDividedBySpaces = dateStrWithoutPrepositions.replaceAll(
      ":",
      " "
    );
    const dateArray = dateStrDividedBySpaces.split(" ");
    const meses = {
      Janeiro: "01",
      Fevereiro: "02",
      Março: "03",
      Abril: "04",
      Maio: "05",
      Junho: "06",
      Julho: "07",
      Agosto: "08",
      Setembro: "09",
      Outubro: "10",
      Novembro: "11",
      Dezembro: "12",
    };
    dateArray[1] = meses[dateArray[1] as keyof typeof meses];
    const year = String(dateArray[2]).padStart(4, "0");
    const month = String(dateArray[1]);
    const day = String(dateArray[0]).padStart(2, "0");
    const hour = String(dateArray[3]).padStart(2, "0");
    const minute = String(dateArray[4]).padStart(2, "0");
    const second = String(dateArray[5] ?? "00").padStart(2, "0");
    return new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}${timeDiffFromGmt}`
    );
  }

  protected getValorDaCausa(): number {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(15) > td:first-child",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "valor da causa",
    };
    const projudiValorDaCausaString =
      getValueFollowingCellSearchedByTextContent(params);

    let valorDaCausa =
      projudiValorDaCausaString ?? "".trim().replace(/(R\$ )|(\.)/g, "");
    valorDaCausa = valorDaCausa.replace(",", ".");
    return Number(valorDaCausa);
  }

  protected getTipoDeAcao(): SimpleType[] {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(10) > td:first-child",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "classe",
    };
    const projudiTipoDeAcaoString =
      getValueFollowingCellSearchedByTextContent(params);
    if (!projudiTipoDeAcaoString) return [];
    const tipoDeAcaoStringArray = projudiTipoDeAcaoString
      .split(" « ")
      .reverse();
    return tipoDeAcaoStringArray.map(tipoAcao => {
      return { id: undefined, valor: tipoAcao.trim() };
    });
  }

  protected getCausaDePedir(): SimpleType[] {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(8) > td:first-child",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "assunto",
    };
    const projudiCausaDePedirString =
      getValueFollowingCellSearchedByTextContent(params);
    const causaDePedirStringArray = !projudiCausaDePedirString
      ? []
      : projudiCausaDePedirString.split(" « ").reverse();
    return causaDePedirStringArray.map(causaPedir => {
      return { id: undefined, valor: causaPedir.trim() };
    });
  }

  protected getSegredoJustica(): boolean {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(11) > td:first-child",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "segredo de justiça",
    };
    const projudiSegredoJusticaString =
      getValueFollowingCellSearchedByTextContent(params);
    return projudiSegredoJusticaString === "SIM";
  }

  protected getJuizoInfo(): JuizoInfo {
    const JuizoJuiz = this.getJuizoJuizString()?.split(" Juiz: ");
    if (!JuizoJuiz) return { juizo: undefined, nomeJuiz: undefined };
    const juizo = new ScrappedUnidadeJurisdicional(JuizoJuiz[0]);
    const nomeJuiz = JuizoJuiz[1].replace(" Histórico de Juízes", "").trim();
    return { juizo, nomeJuiz };
  }

  protected getJuizoJuizString(): string | null {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(7) > td:first-child",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "juízo",
    };
    return getValueFollowingCellSearchedByTextContent(params);
  }

  protected getNumeroProcessoPrincipal(): string | null {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(6) > td:first-child",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "proc. principal",
    };
    const processoPrincipal =
      getValueFollowingCellSearchedByTextContent(params);
    return processoPrincipal &&
      !processoPrincipal.toLowerCase().includes("o próprio")
      ? processoPrincipal
      : null;
  }

  protected getNumerosIncidentes(): string[] {
    return [];
  }

  protected getNumerosProcessosRelacionados(): string[] {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(6) > td:nth-child(3)",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "proc. dependentes",
    };
    // TODO: testar processo com mais de um processo dependente. São muitos TD? São múltiplos elementos A
    // na mesma TD?
    const processosRelacionados =
      getValueFollowingCellSearchedByTextContent(params)?.trim();
    return processosRelacionados ? [processosRelacionados] : [];
  }

  protected getPartes(): PartesReturn {
    const partesScrapper = new ProjudiTjbaPartesScrapper(this.doc);
    const partes = partesScrapper.fetchParticipantesInfo();
    if (!partes) {
      return {
        poloAtivo: null,
        poloPassivo: null,
        outros: null,
      } as PartesReturn;
    }
    return partes;
  }

  protected async getAndamentos(): Promise<ScrappedAndamento[] | undefined> {
    const scrapper = new ProjudiTjbaAndamentosScrapper(this.doc);
    return await scrapper.fetchAndamentosInfo();
  }

  protected getPedidos(): string[] {
    const params = {
      parentElement: this.divPartesTbody,
      firstGuessQuerySelector: "tr:nth-child(9) > td:first-child",
      IterableElementsQuerySelector: "tr td",
      partialTextToSearch: "complementares",
    };
    const pedidosTd = getElementFollowingCellSearchedByTextContent(params);
    if (!pedidosTd) return [];
    const pedidos: string[] = [];
    pedidosTd
      .querySelectorAll<HTMLElement>("table > tbody > tr")
      .forEach(tr => {
        pedidos.push(tr.innerText);
      });
    return pedidos;
  }

  protected getAudienciaFutura(
    andamentos: ScrappedAndamento[]
  ): ScrappedAndamento | null {
    const audienciaRelatedAndamentos =
      this.filterAudienciaConcerningAndamentos(andamentos);
    const lastRelevantAudiencia = this.getLastAudienciaOrNullIfCancelled(
      audienciaRelatedAndamentos
    );
    const audienciaProjudiDateRegexMatch =
      lastRelevantAudiencia?.observacao!.match(
        ProjudiTjbaProcessoScrapper.PROJUDI_EXTENDED_DATE_REGEX
      );
    if (!audienciaProjudiDateRegexMatch || !lastRelevantAudiencia) return null;
    const audienciaProjudiDateString = audienciaProjudiDateRegexMatch[0];
    const audienciaFutura = lastRelevantAudiencia;
    audienciaFutura.data = this.getDateFromProjudiTjbaDateString(
      audienciaProjudiDateString
    );
    return audienciaFutura;
  }

  protected filterAudienciaConcerningAndamentos(
    andamentosArray: ScrappedAndamento[]
  ): ScrappedAndamento[] {
    const audienciaRelatedAndamentos = andamentosArray.filter(
      andamento =>
        andamento
          ?.nomeOriginalSistemaJustica!.toLowerCase()
          .includes("audiência") && !andamento.cancelado
    );
    return audienciaRelatedAndamentos;
  }

  protected getLastAudienciaOrNullIfCancelled(
    audienciasUniverse: ScrappedAndamento[]
  ): ScrappedAndamento | null {
    const lastRelevantAudiencia = audienciasUniverse.at(-1);
    if (!lastRelevantAudiencia?.observacao) return null;
    return lastRelevantAudiencia?.observacao.search(
      ProjudiTjbaProcessoScrapper.PROJUDI_EXTENDED_DATE_REGEX
    ) === -1
      ? null
      : lastRelevantAudiencia;
  }
}
