const urlObj = new URL(document.URL);

document.addEventListener("readystatechange", async () => {
  if (!document.readyState === "complete") return;
  const src = chrome.runtime.getURL("./build/index.js");
  const { NotProcessoHomepageException, identifyCorrectScrapper } = await import(src);
  if (!NotProcessoHomepageException || !identifyCorrectScrapper) return;
  try {
    const scrapperClass = identifyCorrectScrapper(document);
    const scrapper = new scrapperClass(document);
    if (!scrapper.checkProcessoHomepage()) return;
    scrapper
      .fetchProcessoInfo()
      .then(processoInfo => {
        console.log({ processoInfo });
      })
      .catch(e => console.error(e));
  } catch (e) {
    console.log({ e });
    if (!(e instanceof NotProcessoHomepageException)) sendResponse(e);
  }
});

chrome.runtime.sendMessage(
  {
    from: "sisifoContent",
    url: urlObj,
  },
  () => {}
);
