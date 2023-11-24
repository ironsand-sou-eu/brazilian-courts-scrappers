import ScrappedAndamento from "../data-structures/ScrappedAndamento";
import {
  getTextContent,
  stripBlankLines,
  stripScriptTagsFromHtmlString,
} from "../utils";
import AndamentosScrapper from "./AndamentosScrapper";

class ProjudiTjbaAndamentosScrapper extends AndamentosScrapper {
  protected HTML_BODY_REGEX = /<body[^]*<\/body>/gi;
  protected divAndamentosTbody: HTMLElement;

  constructor(protected doc: Document) {
    super(doc);
  }

  public async fetchAndamentosInfo(): Promise<ScrappedAndamento[] | undefined> {
    return await super.fetchAndamentosInfo();
  }

  protected loadPageCheckpoints(): void {
    this.divAndamentosTbody = this.doc.querySelector(
      "#Arquivos > table > tbody"
    )!;
  }

  protected async getAndamentos(): Promise<ScrappedAndamento[] | undefined> {
    const andamentos = [];
    const andamentosTrs = this.divAndamentosTbody.querySelectorAll<HTMLElement>(
      "tr:not(tr:first-of-type, tr *)"
    );
    for (const tr of Array.from(andamentosTrs)) {
      const id = tr
        .querySelector("td > table > tbody > tr > td:nth-child(1)")!
        .textContent!.trim();
      const dataStr = tr
        .querySelector("td > table > tbody > tr > td:nth-child(3)")!
        .textContent!.trim();
      const data = this.brStringToDate(dataStr);
      const agente = tr
        .querySelector("td > table > tbody > tr > td:nth-child(4)")!
        .textContent!.trim();
      const nomeAndamentoTd = tr.querySelector(
        "td > table > tbody > tr > td:nth-child(2)"
      ) as HTMLElement;
      const cancelado = this.isCancelado(nomeAndamentoTd);
      const nomeOriginalSistemaJustica = nomeAndamentoTd
        .querySelector<HTMLElement>("b > font")!
        .innerText.trim();
      const obsUnderNomeAndamento = cancelado
        ? nomeAndamentoTd.querySelector("strike")?.textContent?.trim() ?? ""
        : nomeAndamentoTd.childNodes[
            nomeAndamentoTd.TEXT_NODE
          ].textContent?.trim() ?? "";
      const contentInButton =
        tr
          .querySelector("td > table + span:first-of-type")
          ?.textContent?.trim() ?? "";
      const contentInDocument =
        (await this.getDocumentTextContentIfExists(tr)) ?? "";
      const fullObservacao = `${obsUnderNomeAndamento}\n${contentInButton}\n${contentInDocument}`;
      const observacao = stripBlankLines(fullObservacao);
      const andamento = new ScrappedAndamento(
        nomeOriginalSistemaJustica,
        data,
        id,
        observacao,
        agente,
        cancelado
      );
      andamentos.unshift(andamento);
    }
    return andamentos;
  }

  protected brStringToDate(str: string): Date {
    const items = str.split("/");
    if (items[2].length === 2) items[2] = `20` + items[2];
    return new Date(
      parseInt(items[2]),
      parseInt(items[1]) - 1,
      parseInt(items[0])
    );
  }

  protected isCancelado(andamentoTd: HTMLElement): boolean {
    //TODO: provavelmente é na classlist
    return andamentoTd.innerHTML.includes("strike");
  }

  protected async getDocumentTextContentIfExists(
    tr: HTMLElement
  ): Promise<string> {
    const documentsRows = tr.querySelectorAll(
      'td > table ~ span[id^="sub"] > div > div > table > tbody > tr'
    );
    if (!documentsRows) return new Promise(resolve => resolve(""));
    let docUri = "";
    documentsRows.forEach(tr => {
      let a = tr.querySelector("td:nth-child(4) > a") as HTMLAnchorElement;
      if (a && a.innerText === "online.html") docUri = a.href;
    });
    if (!docUri) return new Promise(resolve => resolve(""));
    const docTextContent = await this.getDocumentTextContent(docUri);
    if (this.documentIsNotRelevant(docTextContent))
      return new Promise(resolve => resolve(""));
    return docTextContent;
  }

  protected async getDocumentTextContent(uri: string): Promise<string> {
    const response = await fetch(uri, { method: "GET" });
    if (!response.ok) {
      throw new Error(
        `Não foi possível coletar de forma automática o conteúdo do andamento. Erro: ${response.statusText}`
      );
    }
    const arrBuffer = await response.arrayBuffer();
    const charCodesArray = new Uint8Array(arrBuffer);
    const dec = new TextDecoder("windows-1252");
    const htmlStr = dec.decode(charCodesArray);
    const bodyStr = this.getBodyInnerHtmlFromHtmlString(htmlStr);
    const noScriptBodyStr = stripScriptTagsFromHtmlString(bodyStr);
    return getTextContent(noScriptBodyStr, this.doc);
  }

  protected getBodyInnerHtmlFromHtmlString(htmlStr: string): string {
    const bodyMatches = htmlStr.match(this.HTML_BODY_REGEX);
    if (bodyMatches === null) return `<body>${htmlStr}</body>`;
    return bodyMatches[0];
  }

  protected documentIsNotRelevant(textContent: string): boolean {
    const lowCaseDocText = textContent.toLowerCase();
    const notRelevant =
      lowCaseDocText.includes("endereço para devolução do ar") &&
      lowCaseDocText.includes("assinatura do recebedor") &&
      lowCaseDocText.includes("rubrica e matrícula do carteiro");
    return !!notRelevant;
  }
}
export default ProjudiTjbaAndamentosScrapper;
