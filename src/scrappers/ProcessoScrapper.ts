type ElementSearcherParams = {
  parentElement: HTMLElement;
  firstGuessQuerySelector: string;
  IterableElementsQuerySelector: string;
  partialTextToSearch: string;
};

export default class ProcessoScrapper {
  protected static getValueFollowingCellSearchedByTextContent(
    searcherParams: ElementSearcherParams
  ): string {
    return this.getElementFollowingCellSearchedByTextContent(searcherParams)
      ?.textContent;
  }

  protected static getElementFollowingCellSearchedByTextContent({
    parentElement,
    firstGuessQuerySelector,
    IterableElementsQuerySelector,
    partialTextToSearch,
  }: ElementSearcherParams): HTMLElement {
    const firstGuess = parentElement.querySelector(firstGuessQuerySelector);
    if (
      firstGuess?.textContent
        .toLowerCase()
        .includes(partialTextToSearch.toLowerCase())
    ) {
      return firstGuess.nextElementSibling as HTMLElement;
    }

    const slowChoice = Array.from(
      parentElement.querySelectorAll(IterableElementsQuerySelector)
    ).filter(iElement => {
      return iElement.textContent
        .toLowerCase()
        .includes(partialTextToSearch.toLowerCase());
    });
    return slowChoice[0]?.nextElementSibling as HTMLElement;
  }
}
