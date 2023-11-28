import ScrappedProcesso from "../data-structures/ScrappedProcesso";
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException";

type Interface<T> = { [P in keyof T]: T[P] };
export interface IProcessoScrapper extends Interface<ProcessoScrapper> {}

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

  public checkProcessoHomepage(
    url: string,
    ignorePages: string[],
    homeHostnamePath: string
  ): boolean {
    if (ignorePages.some(itemToIgnore => url.includes(itemToIgnore))) {
      return false;
    } else if (!url || !url.includes(homeHostnamePath)) {
      throw new NotProcessoHomepageException(new URL(url));
    } else {
      return true;
    }
  }

  protected loadPageCheckpoints(): void {}
  protected async scrappeProcessoInfo(): Promise<ScrappedProcesso> {
    return;
  }
}
