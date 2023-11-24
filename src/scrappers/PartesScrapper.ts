import ScrappedParte from "../data-structures/ScrappedParte";

export type PartesReturn = {
  poloAtivo: ScrappedParte[] | null;
  poloPassivo: ScrappedParte[] | null;
  outros: ScrappedParte[] | null;
};

export default class PartesScrapper {
  constructor(protected macroContainer: Document | HTMLElement) {}

  public fetchParticipantesInfo(): PartesReturn | undefined {
    try {
      this.loadPageCheckpoints();
      return this.getPartes();
    } catch (e) {
      console.error(e);
    }
  }

  protected loadPageCheckpoints(): void {}
  protected getPartes(): PartesReturn | undefined {
    return;
  }
}
