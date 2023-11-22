export default class NotProcessoHomepageException extends Error {
  constructor(url: URL) {
    const errorMessage = `A página "${url.href}" não é uma página inicial de processo.`;
    super(errorMessage);
  }
}
