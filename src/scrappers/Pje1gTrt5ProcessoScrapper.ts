import ScrappedProcesso, {
  SimpleType,
} from "../data-structures/ScrappedProcesso";
import ScrappedAndamento from "../data-structures/ScrappedAndamento";
import ScrappedUnidadeJurisdicional from "../data-structures/ScrappedUnidadeJurisdicional";
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException";
import ProcessoScrapper from "./ProcessoScrapper";
import Pje1gTrt5AndamentosScrapper from "./Pje1gTrt5AndamentosScrapper";
import Pje1gTrt5PartesScrapper from "./Pje1gTrt5PartesScrapper";
import {
  getValueFollowingCellSearchedByTextContent,
  waitForElement,
} from "../utils";
import { PartesReturn } from "./PartesScrapper";

export default class Pje1gTrt5ProcessoScrapper extends ProcessoScrapper {
  protected static PROCESSO_HOME_PATH_PART = "/pjekz/processo/";
  protected static IGNORE_URLS_CONTAINING = [
    "https://pje.trt5.jus.br/pjekz/assets/pdf/web/viewer.html",
    "https://pje.trt5.jus.br/pjekz/downloadBinario.seam",
  ];
  protected static tiposAcao: Record<string, string> = {
    ATOrd: "Ação Trabalhista Ordinária",
  };
  protected elResumoProcesso: HTMLElement;
  protected divDetails: HTMLElement;

  constructor(protected doc: Document) {
    super(doc);
  }

  public async fetchProcessoInfo(): Promise<ScrappedProcesso> {
    return super.fetchProcessoInfo();
  }

  public checkProcessoHomepage(url: string): boolean {
    if (
      Pje1gTrt5ProcessoScrapper.IGNORE_URLS_CONTAINING.some(itemToIgnore =>
        url.includes(itemToIgnore)
      )
    ) {
      return false;
    } else if (
      !url ||
      !url.includes(Pje1gTrt5ProcessoScrapper.PROCESSO_HOME_PATH_PART)
    ) {
      throw new NotProcessoHomepageException(new URL(url));
    } else {
      return true;
    }
  }

  protected async loadPageCheckpoints() {
    this.elResumoProcesso = this.doc.querySelector("pje-resumo-processo");
    this.divDetails = await this.getDetailsDiv();
    this.divDetails = this.divDetails.cloneNode(true) as HTMLElement;
    this.closeDetailsDiv();
  }

  protected async getDetailsDiv(): Promise<HTMLElement> {
    const expandDetailsButton = this.doc.querySelector<HTMLElement>(
      "[aria-label*='resumo do processo']"
    );
    expandDetailsButton.click();
    return await waitForElement("pje-parte-processo > section > ul", this.doc, {
      returnElementSelector: "#processo > div",
    });
  }

  protected closeDetailsDiv() {
    this.doc.querySelector<HTMLElement>("a:has(~ pje-autuacao)").click();
  }

  protected async ScrappeProcessoInfo(): Promise<ScrappedProcesso> {
    const andamentos = await this.getAndamentos();
    const { poloAtivo, poloPassivo, outros } = this.getPartes();
    return new ScrappedProcesso(
      this.getNumero(),
      "pje1gTrt5",
      poloAtivo,
      poloPassivo,
      outros,
      andamentos,
      this.getPedidos(),
      this.getUrl(),
      this.getDataDistribuicao(),
      this.getValorDaCausa(),
      this.getCausaDePedir(),
      this.getJuizo(),
      this.getJuizAtual(),
      await this.getAudienciaFutura(),
      this.getTipoDeAcao(),
      this.getSegredoJustica(),
      this.getNumeroProcessoPrincipal(),
      this.getNumeroRegional(),
      this.getNumerosIncidentes(),
      this.getNumerosProcessosRelacionados()
    );
  }

  protected getNumero(): string {
    const containerNumeroProcesso = this.doc.querySelector(
      "[aria-label*='Abre o resumo do processo']"
    );
    return containerNumeroProcesso.textContent.trim();
  }

  protected getNumeroRegional(): string | null {
    return null;
  }

  protected getUrl(): URL {
    return new URL(this.doc.URL);
  }

  protected getDataDistribuicao(): Date {
    const params = {
      parentElement: this.elResumoProcesso,
      firstGuessQuerySelector: "#dataAutuacao + dd",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "Autuado",
    };
    const dateString = getValueFollowingCellSearchedByTextContent(params);
    return this.getDateFromPjeTrt1gDateString(dateString);
  }

  protected getDateFromPjeTrt1gDateString(dateTimeStr: string): Date {
    dateTimeStr = dateTimeStr.replace(" ", "/");
    const dateArray = dateTimeStr.split("/");
    const iso8601DateString = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${dateArray[3]}-03:00`;
    return new Date(iso8601DateString);
  }

  protected getValorDaCausa(): number {
    const params = {
      parentElement: this.elResumoProcesso,
      firstGuessQuerySelector: "#valorCausa",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "valor da causa",
    };
    const valorDaCausaString =
      getValueFollowingCellSearchedByTextContent(params);

    let valorDaCausa = valorDaCausaString.trim().replace(/(R\$ )|(\.)/g, "");
    return parseFloat(valorDaCausa.replace(",", "."));
  }

  protected getTipoDeAcao(): SimpleType[] {
    const containerDescricaoProcesso = this.doc.querySelector(
      "pje-descricao-processo"
    );
    const stringTipoProcesso = containerDescricaoProcesso
      .querySelector("span:first-child")
      .querySelector("span:last-child")
      .textContent.trim();
    const tipoDeAcaoNome =
      Pje1gTrt5ProcessoScrapper.tiposAcao[stringTipoProcesso];
    return [
      {
        id: null,
        valor: tipoDeAcaoNome,
      },
    ];
  }

  protected getCausaDePedir(): SimpleType[] {
    const detailsList = this.divDetails.querySelector<HTMLElement>(
      "div:first-child > dl:only-child"
    );
    const params = {
      parentElement: detailsList,
      firstGuessQuerySelector: "dt:last-of-type",
      IterableElementsQuerySelector: "*",
      partialTextToSearch: "Assunto(s)",
    };
    const causaDePedir =
      getValueFollowingCellSearchedByTextContent(params)?.trim();
    return [
      {
        id: null,
        valor: causaDePedir,
      },
    ];
  }

  protected getSegredoJustica(): boolean {
    //TODO: descobrir um processo em segredo de justiça para encontrar onde fica a informação
    return null;
  }

  protected getJuizo(): ScrappedUnidadeJurisdicional {
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
      getValueFollowingCellSearchedByTextContent(params);
    const juizo = new ScrappedUnidadeJurisdicional(nomeOriginalSistemaJustica);
    return juizo;
  }

  protected getJuizAtual(): string | null {
    return null;
  }

  protected getNumeroProcessoPrincipal(): string | null {
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

  protected getNumerosIncidentes(): string[] {
    return [];
  }

  protected getNumerosProcessosRelacionados(): string[] {
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

  protected getPartes(): PartesReturn {
    const partesScrapper = new Pje1gTrt5PartesScrapper(this.divDetails);
    const partes = partesScrapper.fetchParticipantesInfo();
    if (!partes) {
      return {
        poloAtivo: null,
        poloPassivo: null,
        outros: null,
      };
    }
    return partes;
  }

  protected async getAndamentos(): Promise<ScrappedAndamento[]> {
    const scrapper = new Pje1gTrt5AndamentosScrapper(this.doc);
    return await scrapper.fetchAndamentosInfo();
  }

  protected getPedidos(): string[] {
    return [];
  }

  protected async getAudienciaFutura(): Promise<ScrappedAndamento | null> {
    // const audienciasUrl = processoUrl.replace(
    //   "/detalhe",
    //   "/audiencias-sessoes"
    // );

    // TODO: Procurar processo com audiência marcada para ver como o PJe mostra.
    return null;
  }
}
