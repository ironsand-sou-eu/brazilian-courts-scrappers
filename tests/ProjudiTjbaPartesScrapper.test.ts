import ScrappedParte from "../src/data-structures/ScrappedParte";
import TestProjudiTjbaPartesScrapper from "./TestProjudiTjbaPartesScrapper";
import { getTestDocument } from "./test-utils";
import path from "path";

describe("ProjudiTjbaPartesScrapper", () => {
  const filename = path.resolve(
    "tests/mock-pages",
    "projudi-mock-page-innerhtml.txt"
  );
  const doc = getTestDocument(filename);
  const testScrapper = new TestProjudiTjbaPartesScrapper(doc);

  beforeEach(() => {
    testScrapper.loadPageCheckpoints();
  });

  it("should load 4 partes TD containers into the respective properties", () => {
    expect(testScrapper.poloAtivoWrapperTd).toMatchSnapshot();
    expect(testScrapper.poloPassivoWrapperTd).toMatchSnapshot();
    expect(testScrapper.terceirosWrapperTd).toMatchSnapshot();
    expect(testScrapper.testemunhasWrapperTd).toMatchSnapshot();
  });

  it("should return a PartesReturn object with respective info", () => {
    const partesReturn = testScrapper.getPartes();
    expect(partesReturn).toHaveProperty("poloAtivo");
    expect(partesReturn).toHaveProperty("poloPassivo");
    expect(partesReturn).toHaveProperty("outros");
    expect(partesReturn.poloAtivo?.length).toBeGreaterThan(0);
    expect(partesReturn.poloPassivo?.length).toBeGreaterThan(0);
    partesReturn.poloAtivo?.forEach(parteInfo => {
      expect(parteInfo).toBeInstanceOf(ScrappedParte);
      expect(parteInfo.nome).toBeTruthy();
    });
    partesReturn.poloPassivo?.forEach(parteInfo => {
      expect(parteInfo).toBeInstanceOf(ScrappedParte);
      expect(parteInfo.nome).toBeTruthy();
    });
  });

  it("should return all partes from the provided polo processual container", () => {
    const poloPartes = testScrapper.getCompletePolo(
      testScrapper.poloAtivoWrapperTd,
      "autor"
    );
    expect(testScrapper.poloAtivoWrapperTd).toMatchSnapshot();
    expect(poloPartes.length).toBeGreaterThan(0);
    poloPartes.forEach(parteInfo => {
      expect(parteInfo).toBeInstanceOf(ScrappedParte);
      expect(parteInfo.nome).toBeTruthy();
      expect(parteInfo.cpf).toBeTruthy();
    });
  });

  it("should return the parte from the provided row container", () => {
    const tr = doc.querySelector(
      "table.tabelaLista tbody > tr[id]:not([id^=trAdv])"
    ) as HTMLElement;
    const parteInfo = testScrapper.getParte(
      testScrapper.poloAtivoWrapperTd,
      tr,
      "autor"
    );
    expect(parteInfo).toBeInstanceOf(ScrappedParte);
    expect(parteInfo.nome).toBeTruthy();
    expect(parteInfo.cpf).toBeTruthy();
  });

  it("should adapt information from a CPF/CNPJ Projudi string to the specified type", () => {
    const testStr = "    053.995.967-76\n    ";
    const cpfCnpjInfo = testScrapper.getCpfCnpjFromString(testStr);
    expect(cpfCnpjInfo.dontHaveCpfCnpj).toBe(false);
    expect(cpfCnpjInfo.noCpfCnpjReason).toBe("");
    expect(cpfCnpjInfo.cpf).toBe("053.995.967-76");
    expect(cpfCnpjInfo.cnpj).toBe("");
  });

  it("should retrieve contact information from the provided parte ID", () => {
    const contactInfo = testScrapper.getParteContatos(
      testScrapper.poloAtivoWrapperTd,
      "10912777"
    );
    expect(contactInfo.address).not.toBeFalsy();
    expect(contactInfo.email).not.toBeFalsy();
    expect(contactInfo.phone).not.toBeFalsy();
  });

  it("should adapt contact information from the provided string", () => {
    const testStr =
      "Endereço RODOVIA BA 522 VIA COPEC , 12 , SANTO ANTONIO , CAMAÇARI - BA - BRASIL , 42805830 martinsaut_@hotmail.com , (Contato: 11 996496392)";
    const contactInfo = testScrapper.parseContactInfo(testStr);
    expect(contactInfo.address).not.toBeFalsy();
    expect(contactInfo.email).not.toBeFalsy();
    expect(contactInfo.phone).not.toBeFalsy();
  });

  it("should return email contained in a Projudi-formatted string", () => {
    const testStr =
      "Endereço RODOVIA BA 522 VIA COPEC , 12 , SANTO ANTONIO , CAMAÇARI - BA - BRASIL , 42805830 martinsaut_@hotmail.com , (Contato: 11 996496392)";
    expect(testScrapper.getEmail(testStr)).toBe("martinsaut_@hotmail.com");
  });

  it("should return phone number contained in a Projudi-formatted string", () => {
    const testStr =
      "Endereço RODOVIA BA 522 VIA COPEC , 12 , SANTO ANTONIO , CAMAÇARI - BA - BRASIL , 42805830  , (Contato: 11 996496392)";
    expect(testScrapper.getPhoneWithTag(testStr)).toBe(
      "(Contato: 11 996496392)"
    );
  });

  it("should return the lawyers of a provided parte ID", () => {
    const advs = testScrapper.getParteAdvogados(
      testScrapper.poloAtivoWrapperTd,
      "10912777"
    );
    expect(advs[0]).toBeInstanceOf(ScrappedParte);
    expect(advs[0].nome).toBeTruthy();
    expect(advs[0].cpf).toBeTruthy();
    expect(advs[0].oab).toBeTruthy();
  });
});
