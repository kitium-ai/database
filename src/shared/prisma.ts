import * as PrismaClientModule from '@prisma/client';

type PrismaClientModuleType = typeof PrismaClientModule;

type FindUniqueArguments = { where: Record<string, unknown> };
type UpsertArguments = {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

type ModelDelegate = {
  findUnique(args: FindUniqueArguments): Promise<Record<string, unknown> | null>;
  upsert(args: UpsertArguments): Promise<Record<string, unknown>>;
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
};

export type PrismaSql = PrismaClientModuleType extends { Prisma: { Sql: infer Sql } }
  ? Sql
  : unknown;

export type PrismaClientInstance = (PrismaClientModuleType extends {
  PrismaClient: new (...args: unknown[]) => infer Client;
}
  ? Client
  : unknown) & {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw<T = unknown>(query: unknown, ...values: unknown[]): Promise<T>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  user: ModelDelegate;
  appConfig: ModelDelegate;
  auditLog: ModelDelegate;
  session: ModelDelegate;
};

export type PrismaClientConstructor = new (
  ...args: unknown[]
) => PrismaClientInstance;

export function getPrismaClientConstructor(): PrismaClientConstructor {
  const module = PrismaClientModule as unknown as {
    PrismaClient?: PrismaClientConstructor;
  };

  if (!module.PrismaClient) {
    throw new Error('Prisma client not generated. Run `pnpm db:generate`.');
  }

  return module.PrismaClient;
}
