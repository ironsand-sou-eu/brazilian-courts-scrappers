import ScrappedAndamento from "../data-structures/ScrappedAndamento";

export default class AndamentosScrapper {
  constructor(protected doc: Document) {}

  public async fetchAndamentosInfo(): Promise<ScrappedAndamento[] | undefined> {
    try {
      await this.loadPageCheckpoints();
      return await this.getAndamentos();
    } catch (e) {
      console.error(e);
    }
  }

  protected loadPageCheckpoints(): void {}
  protected async getAndamentos(): Promise<ScrappedAndamento[] | undefined> {
    return;
  }
}
