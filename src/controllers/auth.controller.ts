import type { Request, Response } from 'express';
import { loginSchema } from '../dtos/auth.dto';
import type { AuthService } from '../services/auth.service';
import { parseInput } from '../shared/validation';

/** O atendente do balcão: valida, repassa ao service, devolve. Nenhuma regra aqui (RNF04). */
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const input = parseInput(loginSchema, req.body);
    const result = await this.auth.login(input);
    res.status(200).json(result);
  };
}
