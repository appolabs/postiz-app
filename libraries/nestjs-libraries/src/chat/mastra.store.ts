let _pStore: any;

export function getPStore() {
  if (!_pStore) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PostgresStore } = require('@mastra/pg');
    _pStore = new PostgresStore({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return _pStore;
}
