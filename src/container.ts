import type { DataSource } from 'typeorm';
import { env } from './config/env';
import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';
import { UserController } from './controllers/user.controller';
import { User } from './entities/user.entity';
import { TypeOrmUserRepository } from './repositories/typeorm-user.repository';
import { BcryptPasswordHasher } from './security/bcrypt-password-hasher';
import { JwtTokenService } from './security/jwt-token-service';
import { authenticate } from './middlewares/auth.middleware';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';

/**
 * Composition root: o ÚNICO lugar que dá `new` nas peças e as encaixa (RP02).
 * Lê-se de baixo para cima na cadeia: repository → service → controller.
 * É aqui (e só aqui) que a implementação real entra no lugar de cada porta.
 */
export function buildContainer(dataSource: DataSource) {
  // Infraestrutura (implementações das portas)
  const userRepository = new TypeOrmUserRepository(dataSource.getRepository(User));
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN);

  // Regras de negócio
  const authService = new AuthService(userRepository, passwordHasher, tokenService);
  const userService = new UserService(userRepository, passwordHasher);

  return {
    authenticate: authenticate(tokenService),
    healthController: new HealthController(),
    authController: new AuthController(authService),
    userController: new UserController(userService),
  };
}

export type Container = ReturnType<typeof buildContainer>;
