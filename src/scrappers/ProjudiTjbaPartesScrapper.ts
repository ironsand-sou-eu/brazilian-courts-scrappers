import ScrappedParte from "../data-structures/ScrappedParte";
import { extendedTrim, tiposParte } from "../utils";

type ContactInfo = { address: string; email: string; phone: string };

export type PartesReturn = {
  poloAtivo: ScrappedParte[] | null;
  poloPassivo: ScrappedParte[] | null;
  outros: ScrappedParte[] | null;
};

export default class ProjudiTjbaPartesScrapper {
  static #poloAtivoWrapperTd: HTMLElement;
  static #poloPassivoWrapperTd: HTMLElement;
  static #testemunhasWrapperTd: HTMLElement;
  static #terceirosWrapperTd: HTMLElement;

  static fetchParticipantesInfo(doc: Document): PartesReturn | undefined {
    try {
      this.#loadPageCheckpoints(doc);
      return this.#getPartes();
    } catch (e) {
      console.error(e);
    }
  }

  static #loadPageCheckpoints(doc: Document): void {
    const divPartesTbody = doc.querySelector("#Partes > table > tbody")!;
    const querySelectors = {
      autor: ":scope > tr:nth-child(2) > td:nth-child(2)",
      reu: ":scope > tr:nth-child(3) > td:nth-child(2)",
      testemunha: ":scope > tr:nth-child(4) > td:nth-child(2)",
      terceiro: ":scope > tr:nth-child(5) > td:nth-child(2)",
    };
    this.#poloAtivoWrapperTd = divPartesTbody.querySelector(
      querySelectors.autor
    )!;
    this.#poloPassivoWrapperTd = divPartesTbody.querySelector(
      querySelectors.reu
    )!;
    this.#testemunhasWrapperTd = divPartesTbody.querySelector(
      querySelectors.testemunha
    )!;
    this.#terceirosWrapperTd = divPartesTbody.querySelector(
      querySelectors.terceiro
    )!;
  }

  static #getPartes(): PartesReturn {
    const poloAtivo = this.#getCompletePolo(this.#poloAtivoWrapperTd, "autor");
    const poloPassivo = this.#getCompletePolo(
      this.#poloPassivoWrapperTd,
      "reu"
    );
    const testemunhas = this.#getCompletePolo(
      this.#testemunhasWrapperTd,
      "testemunha"
    );
    const terceiros = this.#getCompletePolo(
      this.#terceirosWrapperTd,
      "terceiro"
    );
    const outros = testemunhas.concat(terceiros);
    return { poloAtivo, poloPassivo, outros };
  }

  static #getCompletePolo(
    poloWrapperTd: HTMLElement,
    tipoDeParte: tiposParte
  ): ScrappedParte[] {
    const partesTbody = poloWrapperTd.querySelector(
      "table.tabelaLista tbody"
    ) as HTMLElement;
    return Array.from(
      partesTbody.querySelectorAll<HTMLElement>(
        ":scope > tbody > tr[id]:not([id^=trAdv])"
      )
    ).map(tr => {
      return this.#getParte(poloWrapperTd, tr, tipoDeParte);
    });
  }

  static #getParte(
    poloWrapperTd: HTMLElement,
    tr: HTMLElement,
    tipoDeParte: tiposParte
  ): ScrappedParte {
    const name = tr.querySelector("td:nth-child(2)")!.textContent!.trim();
    const cpfCnpjStr = tr
      .querySelector<HTMLElement>("td:nth-child(4)")!
      .innerText!.trim();
    const { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj } =
      this.#getCpfCnpjFromString(cpfCnpjStr);
    const judSystemId = tr.id.replace("tr", "");
    const { address, email, phone } = this.#getParteContatos(
      poloWrapperTd,
      judSystemId
    );
    const advogados = this.#getParteAdvogados(poloWrapperTd, judSystemId);
    return new ScrappedParte(
      name,
      tipoDeParte,
      dontHaveCpfCnpj,
      noCpfCnpjReason,
      cpf,
      cnpj,
      judSystemId,
      address,
      email,
      phone,
      undefined,
      advogados
    );
  }

  static #getCpfCnpjFromString(cpfCnpj: string) {
    const dontHaveCpfCnpj = cpfCnpj.toLowerCase() === "não cadastrado";
    const noCpfCnpjReason =
      cpfCnpj.toLowerCase() === "não cadastrado"
        ? "Não cadastrado no Projudi"
        : "";
    const dashDotSlashStrippedString = cpfCnpj.replaceAll(/[^\d]/g, "");
    const cpf = dashDotSlashStrippedString.length === 11 ? cpfCnpj : "";
    const cnpj = dashDotSlashStrippedString.length === 14 ? cpfCnpj : "";
    return { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj };
  }

  static #getParteContatos(
    poloWrapperTd: HTMLElement,
    parteJudSystemId: string
  ): ContactInfo {
    const contactsSpanSelector = `span[id^="spanEnd${parteJudSystemId}"]`;
    const contactsSpan = poloWrapperTd.querySelector(
      contactsSpanSelector
    ) as HTMLElement;
    const contactInfo = contactsSpan
      .textContent!.replaceAll(String.fromCharCode(10), "")
      .replaceAll(/\s+/g, " ")
      .trim();
    return this.#parseContactInfo(contactInfo);
  }

  static #parseContactInfo(contactInfo: string): ContactInfo {
    let baseStr = contactInfo;
    const email = this.#getEmail(contactInfo);
    if (email) baseStr = baseStr.replace(email, "");
    const phoneWithTag = this.#getPhoneWithTag(contactInfo);
    const phone = phoneWithTag
      ? phoneWithTag.replace(/(\()|(Contato: )|(\))/g, "")
      : "";
    if (phoneWithTag) baseStr = baseStr.replace(phoneWithTag, "");
    const address = extendedTrim(baseStr, [","]);
    return { address, email, phone };
  }

  static #getEmail(str: string): string {
    const emailRegex =
      /[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*/;
    const result = str.match(emailRegex);
    return result ? result[0].toLowerCase() : "";
  }

  static #getPhoneWithTag(str: string): string {
    const phoneRegex = /\(Contato: \+?[0-9 ]{10,}\)/;
    const result = str.match(phoneRegex);
    return result ? result[0] : "";
  }

  static #getParteAdvogados(
    partesWrapperTd: HTMLElement,
    parteJudSystemId: string
  ): ScrappedParte[] {
    const advogadosTbody = partesWrapperTd.querySelector(
      `span[id^="spanAdv${parteJudSystemId}"] table[id^="tabelaAdvogadoPartes"] > tbody`
    )!;
    const advogadosTrs = advogadosTbody.querySelectorAll(
      'tr[class]:not([class="ultimaLinha"])'
    );
    return Array.from(advogadosTrs).map(tr => {
      const nomeCpfString = tr
        .querySelector("td:nth-child(1)")!
        .textContent!.trim();
      const oabString = tr
        .querySelector("td:nth-child(2)")!
        .textContent!.trim();
      const nomeCpf = nomeCpfString.split(" (CPF:");
      nomeCpf[1] = nomeCpf[1] ? nomeCpf[1].replace(")", "") : "";
      const name = nomeCpf[0];
      const cpf = nomeCpf[1];
      const oab = oabString;
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
        oab,
        undefined
      );
    });
  }
}
