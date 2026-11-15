/** Catálogo de códigos de erro do contrato (Seção 4.9.1). */
export type ErrorCode =
  | 'DADOS_INVALIDOS'
  | 'NAO_AUTENTICADO'
  | 'CREDENCIAIS_INVALIDAS'
  | 'ACESSO_NEGADO'
  | 'RECURSO_NAO_ENCONTRADO'
  | 'EMAIL_JA_CADASTRADO'
  | 'CPF_JA_CADASTRADO'
  | 'CRM_JA_CADASTRADO'
  | 'HORARIO_INDISPONIVEL'
  | 'PACIENTE_INDISPONIVEL'
  | 'HORARIO_FORA_DA_ESCALA'
  | 'TRANSICAO_INVALIDA';

/**
 * Erro de domínio: diz O QUE deu errado em termos de negócio
 * (ex.: HORARIO_INDISPONIVEL). Não sabe nada de HTTP: quem traduz o código
 * para um status (409, 422...) é o error handler, num ponto só (RP03).
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
