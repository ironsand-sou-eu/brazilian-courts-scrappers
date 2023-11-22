export default class ScrappedAndamento {
  constructor(
    public nomeOriginalSistemaJustica: string,
    public data: Date,
    public id?: string,
    public observacao?: string,
    public agente?: string,
    public cancelado: boolean = false,
    public errorMsgs: string[] = []
  ) {
    this.data = data ? new Date(data.getTime()) : undefined;
  }
}
