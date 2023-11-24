import ScrappedProcesso, {
  SimpleType,
} from "../data-structures/ScrappedProcesso";
import ScrappedAndamento from "../data-structures/ScrappedAndamento";
import ScrappedUnidadeJurisdicional from "../data-structures/ScrappedUnidadeJurisdicional";
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException";
import ProcessoScrapper from "./ProcessoScrapper";
import Pje1gTjbaAndamentosScrapper from "./Pje1gTjbaAndamentosScrapper";
import Pje1gTjbaParteScrapper from "./Pje1gTjbaPartesScrapper";
import { PartesReturn } from "./PartesScrapper";
import { REGEX_CNJ_NUMBER } from "../utils";

export default class Pje1gTjbaProcessoScrapper extends ProcessoScrapper {
  private static PROCESSO_HOME_PATH_PART =
    "/pje/Processo/ConsultaProcesso/Detalhe/";
  private static IGNORE_URLS_CONTAINING = [
    "https://pje.tjba.jus.br/pje/downloadBinario.seam",
  ];
  private static PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID = /(?<=\()\d*(?=\)$)/g;
  private static PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME = /.*(?=\(\d*\)$)/g;
  private static divMaisDetalhes: HTMLElement;

  public static async fetchProcessoInfo(
    doc: Document
  ): Promise<ScrappedProcesso> {
    try {
      this.loadPageCheckpoints(doc);
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

  private static loadPageCheckpoints(doc: Document): void {
    this.divMaisDetalhes = doc.querySelector("#maisDetalhes");
  }

  private static async ScrappeProcessoInfo(
    doc: Document
  ): Promise<ScrappedProcesso> {
    const andamentos = await this.getAndamentos(doc);
    const { poloAtivo, poloPassivo, outros } = this.getPartes(doc);
    return new ScrappedProcesso(
      this.getNumero(doc),
      "pje1gTjba",
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
      this.getAudienciaFutura(),
      this.getTipoDeAcao(),
      this.getSegredoJustica(),
      this.getNumeroProcessoPrincipal(),
      this.getNumeroRegional(),
      this.getNumerosIncidentes(),
      this.getNumerosProcessosRelacionados()
    );
  }

  private static getNumero(doc: Document): string {
    const containerNumeroProcesso = doc.querySelector("a.titulo-topo:has(i)");
    const classAndNumeroProcessoString =
      containerNumeroProcesso.firstChild.textContent.trim();
    return REGEX_CNJ_NUMBER.exec(classAndNumeroProcessoString)[0];
  }

  private static getNumeroRegional(): string {
    return null;
  }

  private static getUrl(): URL {
    return null;
  }

  private static getDataDistribuicao(): Date {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(7)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "autuação",
    };
    const dateString = super.getValueFollowingCellSearchedByTextContent(params);
    return this.getDateFromPjeTjbaDateString(dateString);
  }

  public static getDateFromPjeTjbaDateString(
    dateStr: string,
    timeStr = "00:00"
  ): Date {
    const dateArray = dateStr.split(" ");
    const meses = {
      jan: "01",
      fev: "02",
      mar: "03",
      abr: "04",
      mai: "05",
      jun: "06",
      jul: "07",
      ago: "08",
      set: "09",
      out: "10",
      nov: "11",
      dez: "12",
    };
    dateArray[1] = meses[dateArray[1].toLowerCase() as keyof typeof meses];
    const iso8601DateString = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${timeStr}-03:00`;
    return new Date(iso8601DateString);
  }

  private static getValorDaCausa(): number {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(11)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "valor da causa",
    };
    const valorDaCausaString = super.getValueFollowingCellSearchedByTextContent(
      params
    );

    let valorDaCausa = valorDaCausaString.trim().replace(/(R\$ )|(\.)/g, "");
    return parseFloat(valorDaCausa.replace(",", "."));
  }

  private static getTipoDeAcao(): SimpleType[] {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(1)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "classe judicial",
    };
    const tipoDeAcaoFullString = super
      .getValueFollowingCellSearchedByTextContent(params)
      .trim();
    const tipoDeAcaoId = tipoDeAcaoFullString.match(
      this.PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID
    );
    const tipoDeAcaoNome = tipoDeAcaoFullString.match(
      this.PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME
    );
    return [
      {
        id: tipoDeAcaoId ? Number(tipoDeAcaoId[0]) : null,
        valor: tipoDeAcaoNome ? tipoDeAcaoNome[0].trim() : null,
      },
    ];
  }

  private static getCausaDePedir(): SimpleType[] {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(3)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "assunto",
    };
    const causaDePedirFullString = super
      .getValueFollowingCellSearchedByTextContent(params)
      .trim();
    const causaDePedirId = causaDePedirFullString.match(
      this.PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID
    );
    const causaDePedirNome = causaDePedirFullString.match(
      this.PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME
    );
    return [
      {
        id: causaDePedirId ? Number(causaDePedirId[0]) : null,
        valor: causaDePedirNome ? causaDePedirNome[0].trim() : null,
      },
    ];
  }

  private static getSegredoJustica(): boolean {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(13)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "segredo de justiça",
    };
    const projudiSegredoJusticaString =
      super.getValueFollowingCellSearchedByTextContent(params);
    return projudiSegredoJusticaString.toLowerCase() === "sim";
  }

  private static getJuizo(): ScrappedUnidadeJurisdicional {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "div:nth-child(2) > dl > dt",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "órgão julgador",
    };
    const juizoName = super.getValueFollowingCellSearchedByTextContent(params);
    return new ScrappedUnidadeJurisdicional(juizoName);
  }

  private static getJuizAtual(): string {
    return null;
  }

  private static getNumeroProcessoPrincipal(): string {
    return undefined;
    //TODO: encontrar um processo que tenha processo principal para localizar a informação.
    // const params = {
    //     parentElement: this.divMaisDetalhes,
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
    //TODO: encontrar um processo que tenha processos dependentes para localizar a informação.
    // const params = {
    //     parentElement: this.divMaisDetalhes,
    //     firstGuessQuerySelector: 'div:nth-child(2) > dl > dt',
    //     IterableElementsQuerySelector: 'dl dt',
    //     partialTextToSearch: 'órgão julgador'
    // }
    // const processosRelacionados = super.getValueFollowingCellSearchedByTextContent(params).trim()
    // return processosRelacionados ? [processosRelacionados] : null
  }

  private static getPartes(doc: Document): PartesReturn {
    const partesScrapper = new Pje1gTjbaParteScrapper(doc);
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

  private static async getAndamentos(
    doc: Document
  ): Promise<ScrappedAndamento[]> {
    const scrapper = new Pje1gTjbaAndamentosScrapper(doc);
    return await scrapper.fetchAndamentosInfo();
  }

  private static getPedidos(): string[] {
    return [];
  }

  private static getAudienciaFutura(): ScrappedAndamento {
    // TODO: Procurar processo com audiência marcada para ver como o PJe mostra.
    // 'navbar:linkAbaAudiencia'
    // const audienciaProjudiDateString = lastRelevantAudiencia.observacao.match(this.PROJUDI_EXTENDED_DATE_REGEX)[0]
    // const audienciaFutura = {...lastRelevantAudiencia,
    //     data: this.getDatFomPjeTjbaDateString(audienciaProjudiDateString),
    // }
    return null;
  }
}
