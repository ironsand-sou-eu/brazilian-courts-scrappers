import ScrappedProcesso, {
  SimpleType,
} from "../data-structures/ScrappedProcesso";
import ScrappedAndamento from "../data-structures/ScrappedAndamento";
import ScrappedUnidadeJurisdicional from "../data-structures/ScrappedUnidadeJurisdicional";
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException";
import ProcessoScrapper from "./ProcessoScrapper";
import Pje1gTrt5AndamentosScrapper from "./Pje1gTrt5AndamentosScrapper";
import Pje1gTrt5PartesScrapper, {
  PartesReturn,
} from "./Pje1gTrt5PartesScrapper";
import { waitForElement } from "../utils";

export default class Pje1gTrt5ProcessoScrapper extends ProcessoScrapper {
  private static PROCESSO_HOME_PATH_PART = "/pjekz/processo/";
  private static IGNORE_URLS_CONTAINING = [
    "https://pje.trt5.jus.br/pjekz/assets/pdf/web/viewer.html",
    "https://pje.trt5.jus.br/pjekz/downloadBinario.seam",
  ];
  private static tiposAcao: Record<string, string> = {
    ATOrd: "Ação Trabalhista Ordinária",
  };
  private static elResumoProcesso: HTMLElement;
  private static divDetails: HTMLElement;

  public static async fetchProcessoInfo(
    doc: Document
  ): Promise<ScrappedProcesso> {
    try {
      await this.loadPageCheckpoints(doc);
      return await this.ScrappeProcessoInfo(doc);
    } catch (e) {
      if (!(e instanceof NotProcessoHomepageException)) console.error(e);
    }
  }

  public static checkProcessoHomepage(url: string): boolean {
    if (
      this.IGNORE_URLS_CONTAINING.some(itemToIgnore =>
        url.includes(itemToIgnore)
      )
    ) {
      return false;
    } else if (!url || !url.includes(this.PROCESSO_HOME_PATH_PART)) {
      throw new NotProcessoHomepageException(new URL(url));
    } else {
      return true;
    }
  }

  private static async loadPageCheckpoints(doc: Document) {
    this.elResumoProcesso = doc.querySelector("pje-resumo-processo");
    this.divDetails = await this.getDetailsDiv(doc);
    this.divDetails = this.divDetails.cloneNode(true) as HTMLElement;
    this.closeDetailsDiv(doc);
  }

  private static async getDetailsDiv(doc: Document): Promise<HTMLElement> {
    const expandDetailsButton = doc.querySelector<HTMLElement>(
      "[aria-label*='resumo do processo']"
    );
    expandDetailsButton.click();
    return await waitForElement("pje-parte-processo > section > ul", {
      returnElementSelector: "#processo > div",
      doc,
    });
  }

  private static closeDetailsDiv(doc: Document) {
    doc.querySelector<HTMLElement>("a:has(~ pje-autuacao)").click();
  }

  private static async ScrappeProcessoInfo(
    doc: Document
  ): Promise<ScrappedProcesso> {
    const andamentos = await this.getAndamentos(doc);
    const { poloAtivo, poloPassivo, outros } = this.getPartes();
    return new ScrappedProcesso(
      this.getNumero(doc),
      "pje1gTrt5",
      poloAtivo,
      poloPassivo,
      outros,
      andamentos,
      this.getPedidos(),
      this.getUrl(doc),
      this.getDataDistribuicao(),
      this.getValorDaCausa(),
      this.getCausaDePedir(),
      this.getJuizo(),
      this.getJuizAtual(),
      await this.getAudienciaFutura(),
      this.getTipoDeAcao(doc),
      this.getSegredoJustica(),
      this.getNumeroProcessoPrincipal(),
      this.getNumeroRegional(),
      this.getNumerosIncidentes(),
      this.getNumerosProcessosRelacionados()
    );
  }

  private static getNumero(doc: Document): string {
    const containerNumeroProcesso = doc.querySelector(
      "[aria-label*='Abre o resumo do processo']"
    );
    return containerNumeroProcesso.textContent.trim();
  }

  private static getNumeroRegional(): string | null {
    return null;
  }

  private static getUrl(doc: Document): URL {
    return new URL(doc.URL);
  }

  private static getDataDistribuicao(): Date {
    const params = {
      parentElement: this.elResumoProcesso,
      firstGuessQuerySelector: "#dataAutuacao + dd",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "Autuado",
    };
    const dateString = super.getValueFollowingCellSearchedByTextContent(params);
    return this.getDateFromPjeTrt1gDateString(dateString);
  }

  private static getDateFromPjeTrt1gDateString(dateTimeStr: string): Date {
    dateTimeStr = dateTimeStr.replace(" ", "/");
    const dateArray = dateTimeStr.split("/");
    const iso8601DateString = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${dateArray[3]}-03:00`;
    return new Date(iso8601DateString);
  }

  private static getValorDaCausa(): number {
    const params = {
      parentElement: this.elResumoProcesso,
      firstGuessQuerySelector: "#valorCausa",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "valor da causa",
    };
    const valorDaCausaString = super.getValueFollowingCellSearchedByTextContent(
      params
    );

    let valorDaCausa = valorDaCausaString.trim().replace(/(R\$ )|(\.)/g, "");
    return parseFloat(valorDaCausa.replace(",", "."));
  }

  private static getTipoDeAcao(doc: Document): SimpleType[] {
    const containerDescricaoProcesso = doc.querySelector(
      "pje-descricao-processo"
    );
    const stringTipoProcesso = containerDescricaoProcesso
      .querySelector("span:first-child")
      .querySelector("span:last-child")
      .textContent.trim();
    const tipoDeAcaoNome = this.tiposAcao[stringTipoProcesso];
    return [
      {
        id: null,
        valor: tipoDeAcaoNome,
      },
    ];
  }

  private static getCausaDePedir(): SimpleType[] {
    const detailsList = this.divDetails.querySelector<HTMLElement>(
      "div:first-child > dl:only-child"
    );
    const params = {
      parentElement: detailsList,
      firstGuessQuerySelector: "dt:last-of-type",
      IterableElementsQuerySelector: "*",
      partialTextToSearch: "Assunto(s)",
    };
    const causaDePedir = super
      .getValueFollowingCellSearchedByTextContent(params)
      ?.trim();
    return [
      {
        id: null,
        valor: causaDePedir,
      },
    ];
  }

  private static getSegredoJustica(): boolean {
    //TODO: descobrir um processo em segredo de justiça para encontrar onde fica a informação
    return null;
  }

  private static getJuizo(): ScrappedUnidadeJurisdicional {
    const detailsList = this.divDetails.querySelector<HTMLElement>(
      "div:first-child > dl:only-child"
    );
    const params = {
      parentElement: detailsList,
      firstGuessQuerySelector: "dt:first-child",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "Órgão julgador",
    };
    const nomeOriginalSistemaJustica =
      super.getValueFollowingCellSearchedByTextContent(params);
    const juizo = new ScrappedUnidadeJurisdicional(nomeOriginalSistemaJustica);
    return juizo;
  }

  private static getJuizAtual(): string | null {
    return null;
  }

  private static getNumeroProcessoPrincipal(): string | null {
    return null;
    //TODO: encontrar um processo que tenha processo principal para localizar a informação.
    // const params = {
    //     parentElement: this.#divMaisDetalhes,
    //     firstGuessQuerySelector: 'div:nth-child(2) > dl > dt',
    //     IterableElementsQuerySelector: 'dl dt',
    //     partialTextToSearch: 'órgão julgador'
    // }
    // const processoPrincipal = super.getValueFollowingCellSearchedByTextContent(params)
    // return processoPrincipal.toLowerCase().includes('o próprio') ? null : processoPrincipal
  }

  private static getNumerosIncidentes(): string[] {
    return [];
  }

  private static getNumerosProcessosRelacionados(): string[] {
    return [];
    //TODO: encontrar um processo que tenha processos relacionados para localizar a informação.
    // const params = {
    //     parentElement: this.#divMaisDetalhes,
    //     firstGuessQuerySelector: 'div:nth-child(2) > dl > dt',
    //     IterableElementsQuerySelector: 'dl dt',
    //     partialTextToSearch: 'órgão julgador'
    // }
    // const processosRelacionados = super.getValueFollowingCellSearchedByTextContent(params).trim()
    // return processosRelacionados ? [processosRelacionados] : null
  }

  private static getPartes(): PartesReturn {
    const partes = Pje1gTrt5PartesScrapper.fetchParticipantesInfo(
      this.divDetails
    );
    if (!partes) {
      return {
        poloAtivo: null,
        poloPassivo: null,
        outros: null,
      } as PartesReturn;
    }
    return partes;
  }

  private static async getAndamentos(
    doc: Document
  ): Promise<ScrappedAndamento[]> {
    return await Pje1gTrt5AndamentosScrapper.fetchAndamentosInfo(doc);
  }

  private static getPedidos(): string[] {
    return [];
  }

  private static async getAudienciaFutura(): Promise<ScrappedAndamento | null> {
    // const audienciasUrl = processoUrl.replace(
    //   "/detalhe",
    //   "/audiencias-sessoes"
    // );

    // TODO: Procurar processo com audiência marcada para ver como o PJe mostra.
    return null;
  }
}
