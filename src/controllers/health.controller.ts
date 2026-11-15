import type { Request, Response } from 'express';

export class HealthController {
  // Arrow function como propriedade: o método continua sabendo quem é o
  // "this" quando é entregue solto para o router (router.get('/x', controller.check)).
  check = (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok' });
  };
}
