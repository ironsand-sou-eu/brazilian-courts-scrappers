import ScrappedAndamento from "../data-structures/ScrappedAndamento";
import {
  getTextContent,
  stripBlankLines,
  stripScriptTagsFromHtmlString,
  waitForElement,
} from "../utils";
import AndamentosScrapper from "./AndamentosScrapper";

type AndamentoType = "documento" | "movimentação";

class Pje1gTjbaAndamentosScrapper extends AndamentosScrapper {
  protected lisAndamentos: NodeListOf<HTMLElement>;

  constructor(protected doc: Document) {
    super(doc);
  }

  public async fetchAndamentosInfo(): Promise<ScrappedAndamento[] | undefined> {
    return await super.fetchAndamentosInfo();
  }

  protected async loadPageCheckpoints(): Promise<void> {
    await this.expandMovimentos();
    this.lisAndamentos =
      this.doc.querySelectorAll<HTMLElement>(".pje-timeline > li");
  }

  protected async expandMovimentos() {
    const expandButton = this.doc.querySelector(
      "button[aria-label='Exibir movimentos.']"
    ) as HTMLButtonElement;
    expandButton.click();
    await waitForElement(
      ".pje-timeline > li > div > mat-card[id^='mov']",
      this.doc
    );
  }

  protected async getAndamentos(): Promise<ScrappedAndamento[] | undefined> {
    const andamentos = [];
    for (const li of Array.from(this.lisAndamentos)) {
      const andamentoMatcardId = li
        .querySelector(":scope > div > mat-card")!
        .getAttribute("id")!;
      const andamentoType = andamentoMatcardId.startsWith("doc")
        ? "documento"
        : "movimentação";
      const elMatCard = li.querySelector("mat-card") as HTMLElement;
      const [id, cancelado, docName, docContent] = await this.getDocumentInfo(
        elMatCard,
        andamentoType
      );
      const horaAndamento = elMatCard
        .querySelector(":scope div.tl-item-hora")!
        .textContent!.trim();
      const data = this.getDate(li, horaAndamento);
      const nomeOriginalSistemaJustica = this.getNome(
        elMatCard,
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
    return await Promise.all(andamentos);
  }

  protected async getDocumentInfo(
    elMatCard: HTMLElement,
    andamentoType: AndamentoType
  ): Promise<(string | boolean)[]> {
    if (andamentoType !== "documento") {
      return new Promise(resolve => resolve([]));
    }
    const isCancelado = !!elMatCard.querySelector(":scope a.is-inativo");
    const docName = this.getDocName(elMatCard);
    const id =
      elMatCard
        .querySelector(":scope > div > a > span.ng-star-inserted")
        ?.textContent?.replace("- ", "")
        .trim() ?? "";
    const docContent = await this.getDocContent(elMatCard, isCancelado);
    return [id, isCancelado, docName, docContent];
  }

  protected getDocName(elMatCard: HTMLElement): string {
    const nameSpans = Array.from(
      elMatCard.querySelectorAll(":scope > div > a > span:not([class])")
    );
    const [firstNameStr, secondNameStr] = nameSpans.map(
      span => span.textContent?.trim()
    );
    if (firstNameStr === `(${secondNameStr})`) return firstNameStr;
    return `${firstNameStr} ${secondNameStr}`;
  }

  protected async getDocContent(
    elMatCard: HTMLElement,
    isCancelado: boolean
  ): Promise<string> {
    if (isCancelado) return new Promise(resolve => resolve(""));
    const mainDocumentA = elMatCard.querySelector(
      "a:not(.ng-star-inserted)"
    ) as HTMLAnchorElement;
    if (!mainDocumentA) return new Promise(resolve => resolve(""));
    const docContent = await this.getDocumentTextContentIfExists(mainDocumentA);
    return docContent ?? "";
  }

  protected async getDocumentTextContentIfExists(
    documentAnchor: HTMLAnchorElement
  ): Promise<string> {
    documentAnchor.click();
    const docAreaContainer = await waitForElement(
      "pje-historico-scroll-documento",
      documentAnchor.ownerDocument
    );
    if (!docAreaContainer) return new Promise(resolve => resolve(""));
    const extractors = {
      pdf: async () => {
        console.warn(1);
        const documentWrapper = (await waitForElement(
          "pje-historico-scroll-documento object",
          documentAnchor.ownerDocument
        )) as HTMLObjectElement;
        if (!documentWrapper) return new Promise(resolve => resolve(""));
        console.warn(2, documentWrapper);
        const contentElement = await waitForElement(
          "body div#viewer div.endOfContent",
          documentAnchor.ownerDocument,
          {
            returnElementSelector: "body div#viewer",
            documentParent: documentWrapper,
            waitForTextContent: false,
          }
        );
        console.warn(3, contentElement);
        return contentElement;
      },
      inline: async () => {
        return await waitForElement(
          "pje-historico-scroll-documento mat-card-content > span",
          documentAnchor.ownerDocument,
          { waitForTextContent: true }
        );
      },
    };
    const parser = this.isPdf(<HTMLElement>docAreaContainer)
      ? extractors.pdf
      : extractors.inline;
    const contentElement = await parser();
    if (!contentElement) return new Promise(resolve => resolve(""));
    return this.getElementInnerText(<HTMLElement>contentElement);
  }

  protected isPdf(docAreaContainer: HTMLElement): boolean {
    console.warn({
      docAreaContainer,
      ifQs: !!docAreaContainer.querySelector("div.container-pdf > object"),
    });
    return !!docAreaContainer.querySelector("div.container-pdf > object");
  }

  protected getElementInnerText(contentElement: HTMLElement): string {
    const inHtml = contentElement.innerHTML;
    const noScriptInnerHtml = stripScriptTagsFromHtmlString(inHtml);
    return getTextContent(noScriptInnerHtml, contentElement.ownerDocument, [
      { expressionToSearch: /<br.*?>/gim, replacingText: "\n" },
    ]);
  }

  protected getDate(li: HTMLElement, horaAndamento: string): Date {
    const dateString = this.findDateString(li);
    return this.getDateFromPje1gTrt5AndamentoDateString(
      dateString,
      horaAndamento
    );
  }

  protected findDateString(li: Element): string {
    if (li.querySelector(":scope > div[role=heading]")) {
      return (
        li.querySelector(":scope > div[role=heading]")?.textContent?.trim() ??
        ""
      );
    }
    return this.findDateString(li.previousElementSibling!);
  }

  protected getDateFromPje1gTrt5AndamentoDateString(
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
    const mesStr = dateArray[1].replace(".", "").toLowerCase();
    const monthNumberString: string = meses[mesStr as keyof typeof meses];
    const iso8601DateString = `${dateArray[2]}-${monthNumberString}-${dateArray[0]}T${timeStr}-03:00`;
    return new Date(iso8601DateString);
  }

  protected getNome(elMatCard: HTMLElement, docName = ""): string {
    if (docName !== "") {
      const withoutParenthesisResults = docName.match(/.+(?= ?(\(.+\))$)/);
      return withoutParenthesisResults
        ? withoutParenthesisResults[0].trim()
        : docName;
    }
    const divString =
      elMatCard.querySelector(":scope > div")?.textContent ?? "";
    return divString.replace("Descrição do movimento:", "").trim();
  }
}
export default Pje1gTjbaAndamentosScrapper;
