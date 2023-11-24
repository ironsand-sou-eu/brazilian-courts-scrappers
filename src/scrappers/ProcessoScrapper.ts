import ScrappedProcesso from "../data-structures/ScrappedProcesso";
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException";

export default class ProcessoScrapper {
  constructor(protected doc: Document) {}

  public async fetchProcessoInfo(): Promise<ScrappedProcesso> {
    try {
      await this.loadPageCheckpoints();
      return await this.scrappeProcessoInfo();
    } catch (e) {
      if (!(e instanceof NotProcessoHomepageException)) console.error(e);
    }
  }

  protected loadPageCheckpoints(): void {}
  protected async scrappeProcessoInfo(): Promise<ScrappedProcesso> {
    return;
  }
}
