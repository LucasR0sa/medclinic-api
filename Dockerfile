# ---------- Etapa 1: build ----------
# Imagem completa, só existe durante a construção. TypeScript e
# dependências de desenvolvimento vivem e morrem aqui.
FROM node:22-alpine AS builder

WORKDIR /app

# Copia só os arquivos de dependência primeiro (não o código ainda).
# Isso é cache do Docker: se você mudar uma linha do src/ mas não tocar
# no package.json, o Docker reaproveita o "npm ci" já rodado antes,
# em vez de reinstalar tudo de novo.
COPY package.json package-lock.json ./
RUN npm ci

# Só agora copia o resto: configs de TS e o código-fonte.
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

# Gera o dist/ (JavaScript puro, sem tipos).
RUN npm run build

# ---------- Etapa 2: runtime ----------
# Começa de uma imagem nova e limpa. Nada da etapa 1 existe aqui,
# a não ser o que for copiado explicitamente com --from=builder.
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# De novo: package.json + lock, mas agora só pra instalar produção.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Traz só o resultado compilado da etapa 1. Sem src/, sem TypeScript,
# sem Vitest — nada disso existe nesta imagem final.
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
