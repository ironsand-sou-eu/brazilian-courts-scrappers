import ScrappedProcesso, {
  SimpleType,
} from "../data-structures/ScrappedProcesso";
import ScrappedAndamento from "../data-structures/ScrappedAndamento";
import ScrappedUnidadeJurisdicional from "../data-structures/ScrappedUnidadeJurisdicional";
import ProcessoScrapper from "./ProcessoScrapper";
import Pje1gTjbaAndamentosScrapper from "./Pje1gTjbaAndamentosScrapper";
import Pje1gTjbaParteScrapper from "./Pje1gTjbaPartesScrapper";
import { PartesReturn } from "./PartesScrapper";
import {
  REGEX_CNJ_NUMBER,
  getValueFollowingCellSearchedByTextContent,
} from "../utils";

export default class Pje1gTjbaProcessoScrapper extends ProcessoScrapper {
  protected static PROCESSO_HOME_PATH_PART =
    "/pje/Processo/ConsultaProcesso/Detalhe/";
  protected static IGNORE_URLS_CONTAINING = [
    "https://pje.tjba.jus.br/pje/downloadBinario.seam",
  ];
  protected static PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID = /(?<=\()\d*(?=\)$)/g;
  protected static PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME = /.*(?=\(\d*\)$)/g;
  protected divMaisDetalhes: HTMLElement;

  constructor(protected doc: Document) {
    super(doc);
  }

  public async fetchProcessoInfo(): Promise<ScrappedProcesso> {
    return super.fetchProcessoInfo();
  }

  public checkProcessoHomepage(): boolean {
    return super.checkProcessoHomepage(
      this.doc.URL,
      Pje1gTjbaProcessoScrapper.IGNORE_URLS_CONTAINING,
      Pje1gTjbaProcessoScrapper.PROCESSO_HOME_PATH_PART
    );
  }

  protected loadPageCheckpoints(): void {
    this.divMaisDetalhes = this.doc.querySelector("#maisDetalhes");
  }

  protected async scrappeProcessoInfo(): Promise<ScrappedProcesso> {
    const andamentos = await this.getAndamentos();
    const { poloAtivo, poloPassivo, outros } = this.getPartes();
    return new ScrappedProcesso(
      this.getNumero(),
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

  protected getNumero(): string {
    const containerNumeroProcesso = this.doc.querySelector(
      "a.titulo-topo:has(i)"
    );
    const classAndNumeroProcessoString =
      containerNumeroProcesso.firstChild.textContent.trim();
    return REGEX_CNJ_NUMBER.exec(classAndNumeroProcessoString)[0];
  }

  protected getNumeroRegional(): string {
    return null;
  }

  protected getUrl(): URL {
    return null;
  }

  protected getDataDistribuicao(): Date {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(7)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "autuação",
    };
    const dateString = getValueFollowingCellSearchedByTextContent(params);
    return Pje1gTjbaProcessoScrapper.getDateFromPjeTjbaDateString(dateString);
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

  protected getValorDaCausa(): number {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(11)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "valor da causa",
    };
    const valorDaCausaString =
      getValueFollowingCellSearchedByTextContent(params);

    let valorDaCausa = valorDaCausaString.trim().replace(/(R\$ )|(\.)/g, "");
    return parseFloat(valorDaCausa.replace(",", "."));
  }

  protected getTipoDeAcao(): SimpleType[] {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(1)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "classe judicial",
    };
    const tipoDeAcaoFullString =
      getValueFollowingCellSearchedByTextContent(params).trim();
    const tipoDeAcaoId = tipoDeAcaoFullString.match(
      Pje1gTjbaProcessoScrapper.PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID
    );
    const tipoDeAcaoNome = tipoDeAcaoFullString.match(
      Pje1gTjbaProcessoScrapper.PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME
    );
    return [
      {
        id: tipoDeAcaoId ? Number(tipoDeAcaoId[0]) : null,
        valor: tipoDeAcaoNome ? tipoDeAcaoNome[0].trim() : null,
      },
    ];
  }

  protected getCausaDePedir(): SimpleType[] {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(3)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "assunto",
    };
    const causaDePedirFullString =
      getValueFollowingCellSearchedByTextContent(params).trim();
    const causaDePedirId = causaDePedirFullString.match(
      Pje1gTjbaProcessoScrapper.PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID
    );
    const causaDePedirNome = causaDePedirFullString.match(
      Pje1gTjbaProcessoScrapper.PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME
    );
    return [
      {
        id: causaDePedirId ? Number(causaDePedirId[0]) : null,
        valor: causaDePedirNome ? causaDePedirNome[0].trim() : null,
      },
    ];
  }

  protected getSegredoJustica(): boolean {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "dl > dt:nth-child(13)",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "segredo de justiça",
    };
    const projudiSegredoJusticaString =
      getValueFollowingCellSearchedByTextContent(params);
    return projudiSegredoJusticaString.toLowerCase() === "sim";
  }

  protected getJuizo(): ScrappedUnidadeJurisdicional {
    const params = {
      parentElement: this.divMaisDetalhes,
      firstGuessQuerySelector: "div:nth-child(2) > dl > dt",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "órgão julgador",
    };
    const juizoName = getValueFollowingCellSearchedByTextContent(params);
    return new ScrappedUnidadeJurisdicional(juizoName);
  }

  protected getJuizAtual(): string {
    return null;
  }

  protected getNumeroProcessoPrincipal(): string {
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

  protected getNumerosIncidentes(): string[] {
    return [];
  }

  protected getNumerosProcessosRelacionados(): string[] {
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

  protected getPartes(): PartesReturn {
    const partesScrapper = new Pje1gTjbaParteScrapper(this.doc);
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

  protected async getAndamentos(): Promise<ScrappedAndamento[]> {
    const scrapper = new Pje1gTjbaAndamentosScrapper(this.doc);
    return await scrapper.fetchAndamentosInfo();
  }

  protected getPedidos(): string[] {
    return [];
  }

  protected getAudienciaFutura(): ScrappedAndamento {
    // TODO: Procurar processo com audiência marcada para ver como o PJe mostra.
    // 'navbar:linkAbaAudiencia'
    // const audienciaProjudiDateString = lastRelevantAudiencia.observacao.match(this.PROJUDI_EXTENDED_DATE_REGEX)[0]
    // const audienciaFutura = {...lastRelevantAudiencia,
    //     data: this.getDatFomPjeTjbaDateString(audienciaProjudiDateString),
    // }
    return null;
  }
}
