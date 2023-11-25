import ScrappedParte from "../src/data-structures/ScrappedParte";
import { PartesReturn } from "../src/scrappers/PartesScrapper";
import ProjudiTjbaPartesScrapper, {
  ContactInfo,
  CpfCnpjInfo,
} from "../src/scrappers/ProjudiTjbaPartesScrapper";
import { tiposParte } from "../src/utils";

export default class TestProjudiTjbaPartesScrapper extends ProjudiTjbaPartesScrapper {
  public poloAtivoWrapperTd: HTMLElement;
  public poloPassivoWrapperTd: HTMLElement;
  public testemunhasWrapperTd: HTMLElement;
  public terceirosWrapperTd: HTMLElement;

  constructor(doc: Document) {
    super(doc);
  }

  public fetchParticipantesInfo(): PartesReturn {
    return super.fetchParticipantesInfo();
  }

  public loadPageCheckpoints(): void {
    return super.loadPageCheckpoints();
  }

  public getPartes(): PartesReturn {
    return super.getPartes();
  }

  public getCompletePolo(
    poloWrapperTd: HTMLElement,
    tipoDeParte: tiposParte
  ): ScrappedParte[] {
    return super.getCompletePolo(poloWrapperTd, tipoDeParte);
  }

  public getParte(
    poloWrapperTd: HTMLElement,
    tr: HTMLElement,
    tipoDeParte: tiposParte
  ): ScrappedParte {
    return super.getParte(poloWrapperTd, tr, tipoDeParte);
  }

  public getCpfCnpjFromString(cpfCnpj: string): CpfCnpjInfo {
    return super.getCpfCnpjFromString(cpfCnpj);
  }

  public getParteContatos(
    poloWrapperTd: HTMLElement,
    parteJudSystemId: string
  ): ContactInfo {
    return super.getParteContatos(poloWrapperTd, parteJudSystemId);
  }

  public parseContactInfo(contactInfo: string): ContactInfo {
    return super.parseContactInfo(contactInfo);
  }

  public getEmail(str: string): string {
    return super.getEmail(str);
  }

  public getPhoneWithTag(str: string): string {
    return super.getPhoneWithTag(str);
  }

  public getParteAdvogados(
    partesWrapperTd: HTMLElement,
    parteJudSystemId: string
  ): ScrappedParte[] {
    return super.getParteAdvogados(partesWrapperTd, parteJudSystemId);
  }
}
