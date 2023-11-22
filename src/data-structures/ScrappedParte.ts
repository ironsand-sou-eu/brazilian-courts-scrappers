import { tiposParte } from "../utils";

export default class ScrappedParte {
  constructor(
    public nome: string,
    public tipoDeParte: tiposParte,
    public dontHaveCpfCnpj?: boolean,
    public noCpfCnpjReason?: string,
    public cpf?: string,
    public cnpj?: string,
    public judSystemId?: string,
    public endereco?: string,
    public email?: string,
    public telefone?: string,
    public oab?: string,
    public advogados?: ScrappedParte[],
    public errorMsgs?: string[]
  ) {}
}
