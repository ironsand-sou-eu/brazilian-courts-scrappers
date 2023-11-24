import {
  extendedTrim,
  getTextContent,
  stripBlankLines,
  stripScriptTagsFromHtmlString,
  waitForElement,
} from "../src/utils";
import { createHtmlDocument } from "./test-utils";

describe("utils", () => {
  it("should remove blank lines", () => {
    const testStr =
      "lkashfgas ljg hajslk fgjahg fjha \n\n         \n\n\n   pashfglah slkghal skhgt lasfh gl \n pkidswhfglkiasg \n\n qdwshglsakfgl";
    const resultStr =
      "lkashfgas ljg hajslk fgjahg fjha \n   pashfglah slkghal skhgt lasfh gl \n pkidswhfglkiasg \n qdwshglsakfgl";
    expect(stripBlankLines(testStr)).toEqual(resultStr);
  });

  it("should strip script tags from html string", () => {
    const testStr =
      "<html><head><title><scirpt>esse é pegadinha</scirpt><script>myscripts\nlaksdhadhg</script><script>more</script><script>even more</script><script src='src.js' defer /></head><body>Many contents</body></html>";
    const resultStr =
      "<html><head><title><scirpt>esse é pegadinha</scirpt></head><body>Many contents</body></html>";
    expect(stripScriptTagsFromHtmlString(testStr)).toEqual(resultStr);
  });

  it("should get an element's innerHtml as textContent (i.e., parsing HTML tags)", () => {
    const doc = createHtmlDocument();
    const testStr = "<div><div>Many contents</div></div>";
    doc.body.innerHTML = testStr;

    expect(getTextContent(testStr, doc)).toBe("Many contents");
  });

  it("should get an element's innerHtml as textContent with replaces", () => {
    const doc = createHtmlDocument();
    const testStr = "<div><div>Many contents</div></div>";
    doc.body.innerHTML = testStr;

    expect(
      getTextContent(testStr, doc, [
        { expressionToSearch: "contents", replacingText: "Joel Ciclones" },
      ])
    ).toBe("Many Joel Ciclones");
  });

  it("should get an element's innerHtml as textContent if it is empty", () => {
    const doc = createHtmlDocument();
    const testStr = "<div><div></div></div>";
    doc.body.innerHTML = testStr;

    expect(getTextContent(testStr, doc)).toBe("");
  });

  it("should trim a string of whitespace as well as of characters provided", () => {
    const testStr = ",[<div><div>Many contents</div></div>,,,,  ,";
    const resultStr = "div><div>Many contents</div></div";
    expect(extendedTrim(testStr, [",", "[", "<", ">"])).toBe(resultStr);
  });

  it("should wait for element to appear in document", async () => {
    const doc = createHtmlDocument();
    const span = doc.createElement("span");
    span.classList.add("test");
    setTimeout(() => {
      doc.body.appendChild(span);
    }, 1000);
    const awaitedElement = await waitForElement("span.test", doc);
    expect(awaitedElement).toBe(span);
  });

  it("should return already existing element in document", async () => {
    const doc = createHtmlDocument();
    const span = doc.createElement("span");
    span.classList.add("test");
    doc.body.appendChild(span);
    const awaitedElement = await waitForElement("span.test", doc);
    expect(awaitedElement).toBe(span);
  });

  it("should return already existing element in embedded document", async () => {
    const doc = createHtmlDocument();
    const documentParent = doc.createElement("iframe");
    doc.body.appendChild(documentParent);
    documentParent.contentWindow.document.open();
    documentParent.contentDocument.write(
      "<html><body><span class='test' /></body></html>"
    );
    documentParent.contentDocument.close();

    const awaitedElement = await waitForElement("span.test", doc, {
      documentParent,
    });
    expect(awaitedElement.outerHTML).toBe('<span class="test"></span>');
  });

  it("should return already existing element in document to have text content", async () => {
    const doc = createHtmlDocument();
    const span = doc.createElement("span");
    span.classList.add("test");
    setTimeout(() => {
      doc.body.appendChild(span);
      span.textContent = "My example text";
    }, 1000);

    const awaitedElement = await waitForElement("span.test", doc, {
      waitForTextContent: true,
    });
    expect(awaitedElement.outerHTML).toBe(
      '<span class="test">My example text</span>'
    );
  });
});
