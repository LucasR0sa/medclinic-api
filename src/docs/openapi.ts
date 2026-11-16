/**
 * RA1: especificação OpenAPI 3 da API, servida pelo Swagger UI em GET /v1/docs.
 * Cada rota declara path, query, corpo, respostas (status + corpo) e, quando
 * protegida, o cabeçalho de autenticação Bearer.
 */

type Schema = Record<string, unknown>;

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });

const json = (description: string, schema: Schema) => ({
  description,
  content: { 'application/json': { schema } },
});

const error = (codes: string) => json(`Erro: ${codes}`, ref('Error'));

const pageOf = (item: string): Schema => ({
  type: 'object',
  required: ['data', 'meta'],
  properties: { data: { type: 'array', items: ref(item) }, meta: ref('PageMeta') },
});

const pathId = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 },
});

const query = (name: string, schema: Schema, description: string) => ({
  name,
  in: 'query',
  required: false,
  description,
  schema,
});

const pagination = [
  query('page', { type: 'integer', minimum: 1, default: 1 }, 'Página (começa em 1).'),
  query('pageSize', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Itens por página.'),
];

const body = (schema: Schema) => ({
  required: true,
  content: { 'application/json': { schema } },
});

const secured = [{ bearerAuth: [] }];
const e401 = error('NAO_AUTENTICADO');
const e403 = error('ACESSO_NEGADO');
const e404 = error('RECURSO_NAO_ENCONTRADO');
const e400 = error('DADOS_INVALIDOS');

const isoInstant = { type: 'string', format: 'date-time', example: '2026-10-13T11:00:00.000Z' };
const calendarDate = { type: 'string', format: 'date', example: '2026-10-13' };
const clockTime = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '08:00' };
const role = { type: 'string', enum: ['admin', 'secretary', 'doctor'] };
const status = { type: 'string', enum: ['scheduled', 'in_progress', 'done', 'cancelled'] };

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'MedClinic API',
    version: '1.0.0',
    description:
      'Agendamento de consultas, escala de trabalho e prontuário de uma clínica. ' +
      'Autentique em POST /auth/login e use o accessToken no botão "Authorize".',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Saúde' },
    { name: 'Autenticação' },
    { name: 'Usuários' },
    { name: 'Pacientes' },
    { name: 'Médicos' },
    { name: 'Escala e agenda' },
    { name: 'Agendamentos' },
    { name: 'Prontuário' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['statusCode', 'error', 'message'],
        properties: {
          statusCode: { type: 'integer', example: 409 },
          error: {
            type: 'string',
            enum: [
              'DADOS_INVALIDOS',
              'NAO_AUTENTICADO',
              'CREDENCIAIS_INVALIDAS',
              'ACESSO_NEGADO',
              'RECURSO_NAO_ENCONTRADO',
              'EMAIL_JA_CADASTRADO',
              'CPF_JA_CADASTRADO',
              'CRM_JA_CADASTRADO',
              'HORARIO_INDISPONIVEL',
              'PACIENTE_INDISPONIVEL',
              'HORARIO_FORA_DA_ESCALA',
              'TRANSICAO_INVALIDA',
              'ERRO_INTERNO',
            ],
          },
          message: { type: 'string', example: 'Este horário acabou de ser ocupado.' },
        },
      },
      PageMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 57 },
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@medclinic.com' },
          password: { type: 'string', example: 'SenhaForte@123' },
        },
      },
      LoginOutput: {
        type: 'object',
        properties: { accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2 },
          name: { type: 'string', example: 'Joana Secretária' },
          email: { type: 'string', format: 'email', example: 'joana@medclinic.com' },
          roles: { type: 'array', items: role, example: ['secretary'] },
        },
      },
      CreateUserInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'roles'],
        properties: {
          name: { type: 'string', example: 'Joana Secretária' },
          email: { type: 'string', format: 'email', example: 'joana@medclinic.com' },
          password: { type: 'string', minLength: 8, example: 'SenhaForte@123' },
          roles: { type: 'array', minItems: 1, items: role, example: ['secretary'] },
        },
      },
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          name: { type: 'string', example: 'Carlos Pereira' },
          cpf: { type: 'string', example: '12345678901' },
          createdAt: isoInstant,
        },
      },
      CreatePatientInput: {
        type: 'object',
        required: ['name', 'cpf'],
        properties: {
          name: { type: 'string', example: 'Carlos Pereira' },
          cpf: { type: 'string', pattern: '^\\d{11}$', example: '12345678901' },
        },
      },
      UpdatePatientInput: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', example: 'Carlos Pereira da Silva' } },
      },
      Doctor: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 3 },
          crm: { type: 'string', example: 'CRM-SC-54321' },
          user: ref('User'),
        },
      },
      CreateDoctorInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'crm'],
        properties: {
          name: { type: 'string', example: 'Dra. Helena Souza' },
          email: { type: 'string', format: 'email', example: 'helena@medclinic.com' },
          password: { type: 'string', minLength: 8, example: 'SenhaForte@123' },
          crm: { type: 'string', example: 'CRM-SC-54321' },
        },
      },
      Shift: {
        type: 'object',
        required: ['weekDay', 'startTime', 'endTime', 'slotDurationMinutes'],
        properties: {
          weekDay: { type: 'integer', minimum: 0, maximum: 6, description: '0 = domingo', example: 2 },
          startTime: clockTime,
          endTime: { ...clockTime, example: '12:00' },
          slotDurationMinutes: { type: 'integer', minimum: 1, example: 30 },
        },
      },
      WorkSchedule: {
        type: 'object',
        required: ['shifts'],
        properties: { shifts: { type: 'array', items: ref('Shift') } },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 41 },
          doctorId: { type: 'integer', example: 3 },
          patientId: { type: 'integer', example: 10 },
          startsAt: isoInstant,
          endsAt: { ...isoInstant, example: '2026-10-13T11:30:00.000Z' },
          status,
        },
      },
      CreateAppointmentInput: {
        type: 'object',
        required: ['doctorId', 'patientId', 'startsAt'],
        properties: {
          doctorId: { type: 'integer', example: 3 },
          patientId: { type: 'integer', example: 10 },
          startsAt: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 com fuso explícito. O endsAt é calculado pelo backend.',
            example: '2026-10-13T08:00:00-03:00',
          },
        },
      },
      ChangeStatusInput: {
        type: 'object',
        required: ['status'],
        properties: { status: { ...status, example: 'in_progress' } },
      },
      Calendar: {
        type: 'object',
        properties: {
          workSchedule: ref('WorkSchedule'),
          appointments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                patientId: { type: 'integer' },
                startsAt: isoInstant,
                endsAt: isoInstant,
                status,
              },
            },
          },
        },
      },
      MedicalRecord: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 5 },
          patientId: { type: 'integer', example: 10 },
          doctorId: { type: 'integer', example: 3 },
          text: { type: 'string', example: 'Paciente relata dor lombar há duas semanas.' },
          createdAt: isoInstant,
        },
      },
      CreateMedicalRecordInput: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', example: 'Paciente relata dor lombar há duas semanas.' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Saúde'],
        summary: 'Verifica se a API está no ar (público)',
        responses: {
          200: json('API no ar', { type: 'object', properties: { status: { type: 'string', example: 'ok' } } }),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Autentica e devolve o token de acesso (público)',
        requestBody: body(ref('LoginInput')),
        responses: {
          200: json('Autenticado', ref('LoginOutput')),
          400: e400,
          401: error('CREDENCIAIS_INVALIDAS (mesma resposta para e-mail inexistente e senha errada)'),
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Usuários'],
        summary: 'Dados do usuário autenticado (qualquer perfil)',
        security: secured,
        responses: { 200: json('Usuário', ref('User')), 401: e401 },
      },
    },
    '/users': {
      post: {
        tags: ['Usuários'],
        summary: 'Cria usuário de acesso (perfil admin)',
        security: secured,
        requestBody: body(ref('CreateUserInput')),
        responses: {
          201: json('Criado', ref('User')),
          400: e400,
          401: e401,
          403: e403,
          409: error('EMAIL_JA_CADASTRADO'),
        },
      },
    },
    '/patients': {
      post: {
        tags: ['Pacientes'],
        summary: 'Cadastra paciente (perfis admin, secretary)',
        security: secured,
        requestBody: body(ref('CreatePatientInput')),
        responses: {
          201: json('Criado', ref('Patient')),
          400: e400,
          401: e401,
          403: e403,
          409: error('CPF_JA_CADASTRADO'),
        },
      },
      get: {
        tags: ['Pacientes'],
        summary: 'Lista pacientes, paginado (qualquer perfil)',
        security: secured,
        parameters: [
          ...pagination,
          query('name', { type: 'string' }, 'Busca parcial por nome, sem diferenciar maiúsculas.'),
        ],
        responses: { 200: json('Página de pacientes', pageOf('Patient')), 400: e400, 401: e401 },
      },
    },
    '/patients/{id}': {
      parameters: [pathId('id', 'Id do paciente')],
      get: {
        tags: ['Pacientes'],
        summary: 'Busca paciente por id (qualquer perfil)',
        security: secured,
        responses: { 200: json('Paciente', ref('Patient')), 400: e400, 401: e401, 404: e404 },
      },
      patch: {
        tags: ['Pacientes'],
        summary: 'Altera o nome do paciente (perfis admin, secretary)',
        security: secured,
        requestBody: body(ref('UpdatePatientInput')),
        responses: {
          200: json('Atualizado', ref('Patient')),
          400: e400,
          401: e401,
          403: e403,
          404: e404,
        },
      },
      delete: {
        tags: ['Pacientes'],
        summary: 'Remove o paciente, remoção lógica (perfil admin)',
        security: secured,
        responses: { 204: { description: 'Removido, sem corpo' }, 400: e400, 401: e401, 403: e403, 404: e404 },
      },
    },
    '/doctors': {
      post: {
        tags: ['Médicos'],
        summary: 'Cria médico e usuário doctor na mesma transação (perfil admin)',
        security: secured,
        requestBody: body(ref('CreateDoctorInput')),
        responses: {
          201: json('Criado', ref('Doctor')),
          400: e400,
          401: e401,
          403: e403,
          409: error('EMAIL_JA_CADASTRADO | CRM_JA_CADASTRADO'),
        },
      },
      get: {
        tags: ['Médicos'],
        summary: 'Lista médicos, paginado (qualquer perfil)',
        security: secured,
        parameters: [...pagination, query('name', { type: 'string' }, 'Busca parcial por nome.')],
        responses: { 200: json('Página de médicos', pageOf('Doctor')), 400: e400, 401: e401 },
      },
    },
    '/doctors/{id}': {
      get: {
        tags: ['Médicos'],
        summary: 'Busca médico por id (qualquer perfil)',
        security: secured,
        parameters: [pathId('id', 'Id do médico')],
        responses: { 200: json('Médico', ref('Doctor')), 400: e400, 401: e401, 404: e404 },
      },
    },
    '/doctors/{doctorId}/work-schedule': {
      parameters: [pathId('doctorId', 'Id do médico')],
      put: {
        tags: ['Escala e agenda'],
        summary: 'Substitui a escala inteira do médico (perfil admin). "shifts": [] apaga a escala.',
        security: secured,
        requestBody: body(ref('WorkSchedule')),
        responses: {
          200: json('Escala gravada', ref('WorkSchedule')),
          400: error('DADOS_INVALIDOS (inclui turnos sobrepostos no mesmo dia)'),
          401: e401,
          403: e403,
          404: e404,
        },
      },
      get: {
        tags: ['Escala e agenda'],
        summary: 'Escala do médico (qualquer perfil). Sem escala → "shifts": []',
        security: secured,
        responses: { 200: json('Escala', ref('WorkSchedule')), 400: e400, 401: e401, 404: e404 },
      },
    },
    '/doctors/{doctorId}/calendar': {
      get: {
        tags: ['Escala e agenda'],
        summary: 'Escala + consultas ativas do período, inclusivo e no máximo 31 dias (qualquer perfil)',
        security: secured,
        parameters: [
          pathId('doctorId', 'Id do médico'),
          { name: 'from', in: 'query', required: true, schema: calendarDate },
          { name: 'to', in: 'query', required: true, schema: { ...calendarDate, example: '2026-10-16' } },
        ],
        responses: { 200: json('Agenda', ref('Calendar')), 400: e400, 401: e401, 404: e404 },
      },
    },
    '/appointments': {
      post: {
        tags: ['Agendamentos'],
        summary: 'Agenda consulta (perfis admin, secretary)',
        description:
          'Validações em ordem: existência (404), turno, grade e encaixe (422 HORARIO_FORA_DA_ESCALA), ' +
          'conflito do médico (409 HORARIO_INDISPONIVEL) e do paciente (409 PACIENTE_INDISPONIVEL). ' +
          'Requisições simultâneas para o mesmo horário: exatamente uma vence.',
        security: secured,
        requestBody: body(ref('CreateAppointmentInput')),
        responses: {
          201: json('Agendado', ref('Appointment')),
          400: e400,
          401: e401,
          403: e403,
          404: e404,
          409: error('HORARIO_INDISPONIVEL | PACIENTE_INDISPONIVEL'),
          422: error('HORARIO_FORA_DA_ESCALA'),
        },
      },
      get: {
        tags: ['Agendamentos'],
        summary: 'Lista consultas, paginado. O perfil doctor só vê as próprias.',
        security: secured,
        parameters: [
          ...pagination,
          query('doctorId', { type: 'integer' }, 'Filtra por médico.'),
          query('patientId', { type: 'integer' }, 'Filtra por paciente.'),
          query('status', status, 'Filtra por status.'),
          query('from', calendarDate, 'Início do período (YYYY-MM-DD, inclusivo).'),
          query('to', calendarDate, 'Fim do período (YYYY-MM-DD, inclusivo).'),
        ],
        responses: { 200: json('Página de consultas', pageOf('Appointment')), 400: e400, 401: e401 },
      },
    },
    '/appointments/{id}': {
      get: {
        tags: ['Agendamentos'],
        summary: 'Busca consulta por id (doctor só a própria)',
        security: secured,
        parameters: [pathId('id', 'Id da consulta')],
        responses: { 200: json('Consulta', ref('Appointment')), 400: e400, 401: e401, 403: e403, 404: e404 },
      },
    },
    '/appointments/{id}/status': {
      patch: {
        tags: ['Agendamentos'],
        summary: 'Muda o status conforme a tabela de transições',
        description:
          'scheduled → in_progress (médico da consulta, admin); scheduled → cancelled (admin, secretary, ' +
          'médico da consulta); in_progress → done (médico da consulta, admin); in_progress → cancelled ' +
          '(admin, médico da consulta). done e cancelled são finais.',
        security: secured,
        parameters: [pathId('id', 'Id da consulta')],
        requestBody: body(ref('ChangeStatusInput')),
        responses: {
          200: json('Atualizada', ref('Appointment')),
          400: e400,
          401: e401,
          403: e403,
          404: e404,
          422: error('TRANSICAO_INVALIDA'),
        },
      },
    },
    '/patients/{patientId}/medical-records': {
      parameters: [pathId('patientId', 'Id do paciente')],
      post: {
        tags: ['Prontuário'],
        summary: 'Escreve no prontuário (perfil doctor, com vínculo). O autor vem do token.',
        security: secured,
        requestBody: body(ref('CreateMedicalRecordInput')),
        responses: {
          201: json('Registrado', ref('MedicalRecord')),
          400: e400,
          401: e401,
          403: error('ACESSO_NEGADO (sem vínculo, admin ou secretary)'),
          404: e404,
        },
      },
      get: {
        tags: ['Prontuário'],
        summary: 'Lê o prontuário, do mais novo ao mais antigo (doctor com vínculo, ou admin)',
        security: secured,
        parameters: pagination,
        responses: {
          200: json('Página do prontuário', pageOf('MedicalRecord')),
          400: e400,
          401: e401,
          403: e403,
          404: e404,
        },
      },
    },
  },
};
