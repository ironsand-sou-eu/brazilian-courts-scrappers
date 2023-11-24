import ScrappedAndamento from "../data-structures/ScrappedAndamento";
import {
  getTextContent,
  stripBlankLines,
  stripScriptTagsFromHtmlString,
} from "../utils";
import Pje1gTjbaProcessoScrapper from "./Pje1gTjbaProcessoScrapper";

class Pje1gTjbaAndamentosScrapper {
  static #divTimeline: HTMLElement | null;

  /**
   * @returns {ScrappedAndamento[]}
   */
  static async fetchAndamentosInfo(
    doc: Document
  ): Promise<ScrappedAndamento[] | undefined> {
    try {
      this.#loadPageCheckpoints(doc);
      return await this.#getAndamentos(doc);
    } catch (e) {
      console.error(e);
    }
  }

  static #loadPageCheckpoints(doc: Document) {
    this.#divTimeline = doc.getElementById(
      "divTimeLine:eventosTimeLineElement"
    );
  }

  /**
   * @returns {ScrappedAndamento[]}
   */

  static async #getAndamentos(doc: Document): Promise<ScrappedAndamento[]> {
    if (this.#divTimeline == null) return [];
    const andamentosMediaDivs = this.#divTimeline.querySelectorAll(
      ":scope > .media:not(.data)"
    ) as NodeListOf<HTMLElement>;
    const andamentos: ScrappedAndamento[] = [];
    for (const mediaDiv of Array.from(andamentosMediaDivs)) {
      const andamentoPjeType = Array.from(mediaDiv.classList).includes("tipo-D")
        ? "documento"
        : "movimentação";
      const bodyBoxDiv = mediaDiv.querySelector(".media-body") as HTMLElement;
      if (!bodyBoxDiv) continue;
      const horaAndamento =
        bodyBoxDiv.querySelector("small.text-muted")?.textContent?.trim() ?? "";
      const [id, cancelado, docName, docContent] = await this.#getDocumentInfo(
        bodyBoxDiv,
        andamentoPjeType,
        doc
      );
      const data = this.#getDate(mediaDiv, horaAndamento);
      const nomeOriginalSistemaJustica = this.#getNome(
        bodyBoxDiv,
        docName as string
      );
      const fullObservacao = `${docName ?? ""}\n${docContent ?? ""}`;
      const observacao = stripBlankLines(fullObservacao);
      const andamento = new ScrappedAndamento(
        nomeOriginalSistemaJustica,
        data,
        id as string,
        observacao,
        undefined,
        cancelado as boolean
      );
      andamentos.unshift(andamento);
    }
    return andamentos;
  }

  static async #getDocumentInfo(
    bodyBoxDiv: HTMLElement,
    andamentoType: string,
    doc: Document
  ): Promise<(string | boolean)[]> {
    if (andamentoType !== "documento") {
      return new Promise(resolve => resolve([]));
    }
    let mainDocumentNameString: string;
    let docContent: string = "";
    const isCancelado = this.#isCancelado(bodyBoxDiv);
    if (isCancelado) {
      mainDocumentNameString = bodyBoxDiv
        .querySelector(".anexos > .anexos-inativos > span")!
        .textContent!.trim();
    } else {
      const mainDocumentA = bodyBoxDiv.querySelector(
        ".anexos > a:first-child"
      ) as HTMLAnchorElement;
      mainDocumentNameString = mainDocumentA!
        .querySelector(":scope > span")!
        .textContent!.trim();
      docContent = await this.#getDocumentTextContentIfExists(
        mainDocumentA,
        doc
      );
    }
    const id = this.#getIdFromDocString(mainDocumentNameString);
    const docName = this.#getNameFromDocString(mainDocumentNameString);
    return [id, isCancelado, docName, docContent];
  }

  static #getIdFromDocString(docString: string): string {
    const idRegex = /^\d+(?= -)/;
    const match = docString.match(idRegex);
    return match ? match[0] : "";
  }

  static #getNameFromDocString(docString: string): string {
    const idRegex = /(?<=^\d+ - ).+/;
    const match = docString.match(idRegex);
    return match ? match[0] : "";
  }

  static #getDate(mediaDiv: HTMLElement, horaAndamento: string): Date {
    const dateString = this.#findDateSibling(mediaDiv).textContent!.trim();
    return Pje1gTjbaProcessoScrapper.getDateFromPjeTjbaDateString(
      dateString,
      horaAndamento
    );
  }

  static #findDateSibling(mediaDiv: HTMLElement): HTMLElement {
    const prevSibling = mediaDiv.previousElementSibling! as HTMLElement;
    if (Array.from(prevSibling.classList).includes("data")) return prevSibling;
    return this.#findDateSibling(prevSibling);
  }

  static #getNome(bodyBoxDiv: HTMLElement, filename: string = ""): string {
    if (filename !== "") {
      const matchParenthesisResults = filename.match(/.+(?= (\(.+\))$)/);
      return matchParenthesisResults
        ? matchParenthesisResults[0].trim()
        : filename;
    }
    const titleDivs = bodyBoxDiv.querySelectorAll(
      ":scope > :not(.anexos, .col-sm-12)"
    );
    const titles = Array.from(titleDivs).map(titleDiv =>
      titleDiv.querySelector("span")!.textContent!.trim()
    );
    return titles[0];
  }

  static #isCancelado(bodyBoxDiv: HTMLElement): boolean {
    const inativosDiv = bodyBoxDiv.querySelector(".anexos > .anexos-inativos");
    return !!inativosDiv;
    // TODO: buscar exemplo de andamento cancelado SEM DOCUMENTO no PJe
  }

  static async #getDocumentTextContentIfExists(
    documentAnchor: HTMLAnchorElement,
    doc: Document
  ): Promise<string> {
    if (this.#isPdf(documentAnchor)) return new Promise(resolve => resolve(""));
    documentAnchor.click();
    const contentDoc = await this.#waitPageLoad("#frameHtml", doc);
    await new Promise(resolve => setTimeout(resolve, 250));
    if (this.#isPjeDocumentLandingPageBug(contentDoc))
      return new Promise(resolve => resolve(""));
    else return this.#getDocumentTextContent(contentDoc);
  }

  static #isPdf(documentAnchor: HTMLAnchorElement): boolean {
    const icon = documentAnchor.querySelector(":scope > i:first-child")!;
    return Array.from(icon.classList).includes("fa-file-pdf-o");
  }

  static async #waitPageLoad(
    iframeDocSelector: string,
    doc: Document
  ): Promise<Document> {
    let readystateComplete: boolean = false;
    let bodyLengthChanged: boolean = false;
    let bodyLength: number | undefined = undefined;
    let iframe: HTMLIFrameElement | null;
    while (!readystateComplete || bodyLengthChanged) {
      await new Promise(resolve => setTimeout(resolve, 350));
      iframe = doc.querySelector(iframeDocSelector);
      readystateComplete = iframe?.contentDocument?.readyState === "complete";
      bodyLengthChanged =
        bodyLength !== iframe?.contentDocument?.body.children.length;
      bodyLength = iframe?.contentDocument?.body.children.length;
    }
    return iframe!.contentDocument!;
  }

  static #isPjeDocumentLandingPageBug(htmlDoc: Document): boolean {
    if (htmlDoc.head.children.length > 3) return true;
    else return false;
  }

  static #getDocumentTextContent(contentDoc: Document): string {
    const noScriptInnerHtml = stripScriptTagsFromHtmlString(
      contentDoc.body.innerHTML
    );
    return getTextContent(noScriptInnerHtml, contentDoc);
  }
}
export default Pje1gTjbaAndamentosScrapper;
