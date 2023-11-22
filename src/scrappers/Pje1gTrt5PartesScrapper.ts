import ScrappedParte from "../data-structures/ScrappedParte";
import { EMAIL_REGEX, tiposParte, trtInterfacePolosNames } from "../utils";

export type PartesReturn = {
  poloAtivo: ScrappedParte[] | null;
  poloPassivo: ScrappedParte[] | null;
  outros: ScrappedParte[] | null;
};

type Pje1gTrt5WrapperReturn = {
  dontHaveCpfCnpj: boolean;
  noCpfCnpjReason: string;
  cpf: string;
  cnpj: string;
  email: string;
  endereco: string;
};

type CpfCnpjInfoReturn = Pick<
  Pje1gTrt5WrapperReturn,
  "dontHaveCpfCnpj" | "noCpfCnpjReason" | "cpf" | "cnpj"
>;

type AdvogadoInfoReturn = Pick<Pje1gTrt5WrapperReturn, "cpf" | "email"> & {
  oab: string | undefined;
};

class Pje1gTjbaParteScrapper {
  static #poloAtivoContainer: HTMLElement | null;
  static #poloPassivoContainer: HTMLElement | null;
  static #outrosContainer: HTMLElement | null;

  static fetchParticipantesInfo(macroContainer: HTMLElement): PartesReturn {
    try {
      this.#loadPageCheckpoints(macroContainer);
      return this.#getPartes();
    } catch (e) {
      console.error(e);
    }
  }

  static #loadPageCheckpoints(macroContainer: HTMLElement): void {
    const partesContainers = macroContainer.querySelectorAll(
      ".is-item-pilha-parte"
    );
    const poloAtivoWrapper = Array.from(partesContainers).filter(container =>
      container
        .querySelector(".polo")!
        .textContent!.trim()
        .toLowerCase()
        .includes(trtInterfacePolosNames.ativo as unknown as string)
    );
    const poloPassivoWrapper = Array.from(partesContainers).filter(container =>
      container
        .querySelector(".polo")!
        .textContent!.trim()
        .toLowerCase()
        .includes(trtInterfacePolosNames.passivo as unknown as string)
    );
    const poloOutrosWrapper = Array.from(partesContainers).filter(container =>
      container
        .querySelector(".polo")!
        .textContent!.trim()
        .toLowerCase()
        .includes(trtInterfacePolosNames.outros as unknown as string)
    );
    const polos = [poloAtivoWrapper, poloPassivoWrapper, poloOutrosWrapper];
    const [poloAtivoContainer, poloPassivoContainer, outrosContainer] =
      polos.map(poloWrapper => {
        return poloWrapper.length == 0
          ? null
          : poloWrapper[0].querySelector<HTMLElement>(
              "pje-parte-processo > section"
            );
      });
    this.#poloAtivoContainer = poloAtivoContainer;
    this.#poloPassivoContainer = poloPassivoContainer;
    this.#outrosContainer = outrosContainer;
  }

  static #getPartes(): PartesReturn {
    const poloAtivo = this.#getCompletePolo(this.#poloAtivoContainer, "autor");
    const poloPassivo = this.#getCompletePolo(
      this.#poloPassivoContainer,
      "reu"
    );
    const outros = this.#getCompletePolo(this.#outrosContainer, "outros");
    return { poloAtivo, poloPassivo, outros };
  }

  static #getCompletePolo(
    partesWrapper: HTMLElement | null,
    tipoDeParte: tiposParte
  ): ScrappedParte[] {
    if (!partesWrapper) return [];
    const partes: ScrappedParte[] = [];
    partesWrapper.querySelectorAll(":scope > ul").forEach(item => {
      const nome = item
        .querySelector("pje-nome-parte")!
        .textContent!.trim()
        .toUpperCase();
      const until3Wrappers =
        item.firstElementChild!.querySelectorAll<HTMLElement>(
          ":scope > span.ng-star-inserted"
        );
      const { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj, email, endereco } =
        this.#getInfoFromPje1gTrt5Wrappers(until3Wrappers);
      const advogados = this.#getAdvogados(
        item.querySelectorAll(".partes-representante")
      );
      partes.push(
        new ScrappedParte(
          nome,
          tipoDeParte,
          dontHaveCpfCnpj,
          noCpfCnpjReason,
          cpf,
          cnpj,
          undefined,
          endereco,
          email,
          undefined,
          undefined,
          advogados
        )
      );
    });
    return partes;
  }

  static #getInfoFromPje1gTrt5Wrappers(
    until3Wrappers: NodeListOf<HTMLElement>
  ): Pje1gTrt5WrapperReturn {
    const cpfCnpjWrapperArray = Array.from(until3Wrappers).filter(
      wrapper => wrapper.textContent?.trim().toLowerCase().startsWith("cpf:")
    );
    const emailWrapperArray = Array.from(until3Wrappers).filter(
      wrapper => wrapper.textContent?.trim().toLowerCase().startsWith("(email:")
    );
    const addressWrapperArray = Array.from(until3Wrappers).filter(
      wrapper =>
        !wrapper.textContent?.trim().toLowerCase().startsWith("cpf:") &&
        !wrapper.textContent?.trim().toLowerCase().startsWith("(email:")
    );
    const { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj } =
      this.#getCpfCnpjInfo(cpfCnpjWrapperArray);
    const emailRegexMatch = emailWrapperArray.length
      ? emailWrapperArray[0].textContent?.match(EMAIL_REGEX)
      : "";
    const email = emailRegexMatch ? emailRegexMatch[0] ?? "" : "";
    const endereco = addressWrapperArray.length
      ? addressWrapperArray[0].textContent?.trim() ?? ""
      : "";
    return { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj, email, endereco };
  }

  static #getCpfCnpjInfo(wrapperArray: HTMLElement[]): CpfCnpjInfoReturn {
    const dontHaveCpfCnpj = !wrapperArray.length;
    const noCpfCnpjReason = wrapperArray.length ? "" : "Não cadastrado no PJe";
    let cpf = "",
      cnpj = "";
    if (wrapperArray.length) {
      const onlyNumbersCpfCnpj = wrapperArray[0].textContent!.replaceAll(
        /[^\d]/g,
        ""
      );
      if (onlyNumbersCpfCnpj.length === 11) cpf = onlyNumbersCpfCnpj;
      if (onlyNumbersCpfCnpj.length === 14) cnpj = onlyNumbersCpfCnpj;
    }
    return { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj };
  }

  static #getAdvogados(advsWrapper: NodeListOf<HTMLElement>): ScrappedParte[] {
    return Array.from(advsWrapper).map(advWrapper => {
      const name = this.#getAdvogadoName(advWrapper);
      const infoTexts = Array.from(
        advWrapper.querySelectorAll("span.span-informacao")
      ).map(span => span.textContent ?? "");
      const { cpf, oab, email } = this.#getAdvogadoInfo(infoTexts);
      return new ScrappedParte(
        name,
        "advogado contrário",
        false,
        undefined,
        cpf,
        undefined,
        undefined,
        undefined,
        email,
        undefined,
        oab
      );
    });
  }

  static #getAdvogadoName(advWrapper: HTMLElement): string {
    const nameStr = advWrapper
      .querySelector("span:not(.ng-star-inserted)")!
      .textContent!.toUpperCase();
    return nameStr!.replace("(ADVOGADO)", "").trim();
  }

  static #getAdvogadoInfo(array: string[]): AdvogadoInfoReturn {
    const cpfArray = array.find(str => str.toLowerCase().includes("(cpf:"));
    const oabArray = array.find(str => str.includes("(OAB:"));
    const emailArray = array.find(str => str.match(EMAIL_REGEX) ?? false);
    const cpf = cpfArray ? cpfArray[0].replaceAll(/[^\d]/g, "") : "";
    const oab = oabArray
      ? oabArray[0].replace("(OAB:", "").replace(")", "").trim()
      : "";
    const email = emailArray ? emailArray[0].match(EMAIL_REGEX)![0] : "";
    return { cpf, oab, email };
  }
}

export default Pje1gTjbaParteScrapper;
