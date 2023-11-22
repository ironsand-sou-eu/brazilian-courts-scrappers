export default class ScrappedUnidadeJurisdicional {
  constructor(
    public nomeOriginalSistemaJustica: string,
    public nomeAdaptadoAoCliente?: string,
    public orgaoSuperior?: ScrappedUnidadeJurisdicional
  ) {}
}
