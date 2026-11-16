import type { Request, Response } from 'express';
import { createUserSchema } from '../dtos/user.dto';
import { requireUser } from '../middlewares/auth.middleware';
import type { UserService } from '../services/user.service';
import { parseInput } from '../shared/validation';

export class UserController {
  constructor(private readonly users: UserService) {}

  /** GET /users/me: quem eu sou, segundo o crachá. */
  me = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireUser(req);
    res.status(200).json(await this.users.getById(userId));
  };

  /** POST /users: cadastra usuário de acesso (só admin, garantido na rota). */
  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseInput(createUserSchema, req.body);
    res.status(201).json(await this.users.create(input));
  };
}
