export type Prisma = {
  Sql: unknown;
};

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

export class PrismaClient {
  user: ModelDelegate;
  appConfig: ModelDelegate;
  auditLog: ModelDelegate;
  session: ModelDelegate;

  constructor(_options?: Record<string, unknown>) {
    const unsupported: ModelDelegate = {
      findUnique() {
        return Promise.resolve(null);
      },
      upsert() {
        return Promise.resolve({});
      },
      deleteMany() {
        return Promise.resolve({ count: 0 });
      },
    };

    this.user = unsupported;
    this.appConfig = unsupported;
    this.auditLog = unsupported;
    this.session = unsupported;
  }

  $connect(): Promise<void> {
    return Promise.resolve();
  }

  $disconnect(): Promise<void> {
    return Promise.resolve();
  }

  $queryRaw<T = unknown>(_query: unknown, ..._values: unknown[]): Promise<T> {
    return Promise.resolve([] as unknown as T);
  }

  $queryRawUnsafe<T = unknown>(_query: string, ..._values: unknown[]): Promise<T> {
    return Promise.resolve([] as unknown as T);
  }
}
