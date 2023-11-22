export const REGEX_CNJ_NUMBER = /(\d{7}-\d{2}.\d{4}.)(\d)(.\d{2}.\d{4})/;

export const EMAIL_REGEX =
  /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;

export type tiposParte =
  | "autor"
  | "reu"
  | "testemunha"
  | "terceiro"
  | "advogado contrário"
  | "magistrado"
  | "perito"
  | "assistente"
  | "administrador"
  | "servidor"
  | "outros";

export enum trtInterfacePolosNames {
  "ativo",
  "passivo",
  "outros",
}

export type Sistema = "projudiTjba" | "pje1gTjba" | "pje1gTrt5";

export function recursivelyRemoveDuplicatedLineBreaks(str: string): string {
  const newStr = str.replace("\n\n", "\n");
  if (newStr === str) return newStr;
  return recursivelyRemoveDuplicatedLineBreaks(newStr);
}

type OptionsType = {
  returnElementSelector: string;
  documentParent: HTMLObjectElement;
  waitForTextContent: boolean;
  doc: Document;
};

type CheckpointReturn = {
  documentToSearch: Document;
  searchedInfoWasFound: boolean;
};

export async function waitForElement(
  selector: string,
  {
    returnElementSelector = selector,
    documentParent,
    waitForTextContent = false,
    doc,
  }: Partial<OptionsType> = {}
): Promise<HTMLElement | null> {
  function reevaluateCheckpoints(): CheckpointReturn {
    const documentToSearch = documentParent
      ? documentParent.contentDocument ?? doc
      : doc;
    const awaitedElement = documentToSearch.querySelector(selector);
    const searchedInfoWasFound = waitForTextContent
      ? !!awaitedElement?.textContent
      : !!awaitedElement;
    return { documentToSearch, searchedInfoWasFound };
  }

  return await new Promise(resolve => {
    const { documentToSearch, searchedInfoWasFound } = reevaluateCheckpoints();
    if (searchedInfoWasFound) {
      return resolve(
        documentToSearch.querySelector<HTMLElement>(returnElementSelector)
      );
    }

    const timerId = setInterval(() => {
      const { documentToSearch, searchedInfoWasFound } =
        reevaluateCheckpoints();
      if (searchedInfoWasFound) {
        clearInterval(timerId);
        resolve(
          documentToSearch.querySelector<HTMLElement>(returnElementSelector)
        );
      }
    }, 250);
  });
}

export function stripBlankLines(str: string): string {
  const lines = str.split("\n");
  const nonBlankLines = lines.filter(line => line.trim() !== "");
  return nonBlankLines.join("\n").trim();
}

export function stripScriptTagsFromHtmlString(htmlString: string): string {
  const scriptTagWithContentRegex = /<script[^]*?<\/script>/gi;
  const contentScriptTagsStrippedHtml = htmlString.replace(
    scriptTagWithContentRegex,
    ""
  );
  const selfEnclosingScriptTagRegex = /<script[^]*?>/gi;
  return contentScriptTagsStrippedHtml.replace(selfEnclosingScriptTagRegex, "");
}

type Replace = { expressionToSearch: RegExp | string; replacingText: string };

export function getTextContent(
  innerHtml: string,
  replaces: Replace[] = [],
  doc: Document
): string {
  const div = doc.createElement("div");
  replaces.forEach(({ expressionToSearch, replacingText }) =>
    innerHtml.replace(expressionToSearch, replacingText)
  );
  div.innerHTML = innerHtml;
  return recursivelyRemoveDuplicatedLineBreaks(div.textContent ?? "").trim();
}

export function extendedTrim(
  str: string,
  trimmableCharacters: string[]
): string {
  const specialRegexChars = "^$.|?*+()[]{}\\";
  const escapedTrimmableCharsArray = trimmableCharacters.map(str => {
    return specialRegexChars.includes(str) ? "\\" + str : str;
  });
  const escapedTrimmableChars = escapedTrimmableCharsArray.join("");
  const trimRegex = new RegExp(
    `(^[${escapedTrimmableChars}])|([${escapedTrimmableChars}]$)`,
    "gi"
  );
  const trimmedStr = str.trim().replaceAll(trimRegex, "");
  return trimmedStr === str
    ? trimmedStr
    : extendedTrim(trimmedStr, trimmableCharacters);
}
