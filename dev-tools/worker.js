const tribunalDomainsToScrappe = ["projudi.tjba.jus.br", "pje.tjba.jus.br"];

chrome.runtime.onInstalled.addListener(() => chrome.action.disable());

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.from === "sisifoContent" && msg.url) {
    if (urlEnablesAction(msg.url) && sender.tab) chrome.action.enable(sender.tab.id);
    sendResponse("dummy message to avoid error logging");
  }
});

function urlEnablesAction(activeUrl) {
  return tribunalDomainsToScrappe.some(tribunalSiteUrl => activeUrl.includes(tribunalSiteUrl));
}
