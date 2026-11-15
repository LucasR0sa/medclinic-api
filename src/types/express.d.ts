// Acrescenta campos nossos aos tipos do Express (declaration merging).
export {};

declare global {
  namespace Express {
    interface Request {
      /** Identificador único gerado no início da requisição (RA2). */
      requestId: string;
    }

    interface Locals {
      /** Marcado pelo handler de rota inexistente: esse 404 não vai para o log (RA2). */
      skipLog?: boolean;
      /** Código do envelope de erro enviado, para o log registrar a resposta. */
      errorCode?: string;
    }
  }
}
