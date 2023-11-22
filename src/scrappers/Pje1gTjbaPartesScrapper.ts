import ScrappedParte from "../data-structures/ScrappedParte";
import { tiposParte } from "../utils";

export type PartesReturn = {
  poloAtivo: ScrappedParte[] | null;
  poloPassivo: ScrappedParte[] | null;
  outros: ScrappedParte[] | null;
};

type ParteCpfCnpjReturn = {
  dontHaveCpfCnpj: boolean;
  noCpfCnpjReason: string;
  cpf: string;
  cnpj: string;
};

export default class Pje1gTjbaParteScrapper {
  static #PJE_OAB_REGEX = /OAB [A-Z]{2}\d{4,}/;
  static #divPoloAtivoTbody: HTMLElement;
  static #divPoloPassivoTbody: HTMLElement;

  static fetchParticipantesInfo(doc: Document): PartesReturn {
    try {
      this.#loadPageCheckpoints(doc);
      return this.#getPartes();
    } catch (e) {
      console.error(e);
    }
  }

  static #loadPageCheckpoints(doc: Document): void {
    this.#divPoloAtivoTbody = doc.querySelector("#poloAtivo > table > tbody")!;
    this.#divPoloPassivoTbody = doc.querySelector(
      "#poloPassivo > table > tbody"
    )!;
  }

  static #getPartes(): PartesReturn {
    const poloAtivo = this.#getPartesWithoutEnderecos(
      this.#divPoloAtivoTbody,
      "autor"
    );
    const poloPassivo = this.#getPartesWithoutEnderecos(
      this.#divPoloPassivoTbody,
      "reu"
    );
    const outros: ScrappedParte[] = [];
    return { poloAtivo, poloPassivo, outros };
  }

  static #getPartesWithoutEnderecos(
    tbody: HTMLElement,
    tipoDeParte: tiposParte
  ): ScrappedParte[] {
    const partes: ScrappedParte[] = [];
    tbody.querySelectorAll<HTMLElement>(":scope > tr").forEach(tr => {
      const parteString = tr
        .querySelector("td:nth-child(1) > span:nth-child(1) > span")!
        .textContent!.trim();
      const name = this.#getNameFromPje1gTjbaParteString(parteString);
      const cpfCnpjStr = this.#getCpfCnpjFromPje1gTjbaParteString(parteString);
      const { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj } =
        this.#getParteCpfCnpjFromString(cpfCnpjStr);
      const advogados = this.#getParteAdvogados(tr);
      const parte = new ScrappedParte(
        name,
        tipoDeParte,
        dontHaveCpfCnpj,
        noCpfCnpjReason,
        cpf,
        cnpj,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        advogados
      );
      partes.push(parte);
    });
    return partes;
  }

  static #getNameFromPje1gTjbaParteString(parteStr: string): string {
    const stringWithoutParteType = parteStr
      .replace(/ \([A-Za-z]*\)$/, "")
      .trim();
    const nameWithoutCpfCnpj = stringWithoutParteType
      .replace(
        /(CPF: \d{3}\x2E\d{3}\x2E\d{3}\x2D\d{2})|(CNPJ: \d{2}.\d{3}.\d{3}\/\d{4}-\d{2})$/,
        ""
      )
      .replace(/ - $/, "");
    const nameWithoutOab = nameWithoutCpfCnpj
      .replace(this.#PJE_OAB_REGEX, "")
      .replace(/ - $/, "");
    return nameWithoutOab;
  }

  static #getCpfCnpjFromPje1gTjbaParteString(parteStr: string): string {
    const cpfCnpj = parteStr.match(
      /(\d{3}\x2E\d{3}\x2E\d{3}\x2D\d{2})|(\d{2}.\d{3}.\d{3}\/\d{4}-\d{2})/
    );
    return cpfCnpj ? cpfCnpj[0] : "";
  }

  static #getOabFromPje1gTjbaParteString(parteStr: string): string {
    const oab = parteStr.match(this.#PJE_OAB_REGEX);
    if (!oab) return "";
    return oab[0].replace("OAB ", "");
  }

  static #getParteCpfCnpjFromString(cpfCnpj: string): ParteCpfCnpjReturn {
    cpfCnpj = cpfCnpj.trim();
    const dontHaveCpfCnpj = !cpfCnpj;
    const noCpfCnpjReason = cpfCnpj ? "" : "Não cadastrado no PJe";
    const dashDotSlashStrippedString = cpfCnpj.replaceAll(/[^\d]/g, "");
    const cpf =
      dashDotSlashStrippedString.length === 11
        ? dashDotSlashStrippedString
        : "";
    const cnpj =
      dashDotSlashStrippedString.length === 14
        ? dashDotSlashStrippedString
        : "";
    return { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj };
  }

  static #getParteAdvogados(parteWrapperTr: HTMLElement): ScrappedParte[] {
    const advogadosLists = parteWrapperTr.querySelectorAll(":scope > td > ul");
    const advogadosLis = Array.from(advogadosLists)
      .map(ulList => ulList.querySelectorAll(":scope > li"))
      .flat()[0];
    return Array.from(advogadosLis).map(li => {
      const advString = li
        .querySelector(":scope > small > span > span")!
        .textContent!.trim();
      const name = this.#getNameFromPje1gTjbaParteString(advString);
      const cpf = this.#getCpfCnpjFromPje1gTjbaParteString(advString);
      const oab = this.#getOabFromPje1gTjbaParteString(advString);
      return new ScrappedParte(
        name,
        "advogado contrário",
        false,
        undefined,
        cpf,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        oab
      );
    });
  }
}
