import { JSDOM } from "jsdom";
import fs from "fs";

export function createHtmlDocument(): Document {
  return new JSDOM("<html><body></body></html>").window.document;
}

export function getTestDocument(fileName: string): Document {
  const doc = createHtmlDocument();
  const bodyInnerHtml = fs.readFileSync(fileName, "utf8");
  doc.body.innerHTML = bodyInnerHtml;
  return doc;
}
