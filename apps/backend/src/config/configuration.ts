/**
 * Typed application configuration, loaded once from environment variables.
 * No secrets are ever hardcoded — every value originates from process.env.
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendOrigin: string;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
  };
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshSecret: string;
    refreshTtl: string;
  };
  ai: {
    provider: 'anthropic' | 'gemini';
    apiKey: string;
    model: string;
    geminiKey: string;
    geminiModel: string;
    maxTokens: number;
    enabled: boolean;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.BACKEND_PORT ?? '3000', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  db: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER ?? 'freshroute',
    password: process.env.POSTGRES_PASSWORD ?? 'freshroute_pw',
    database: process.env.POSTGRES_DB ?? 'freshroute',
    ssl: process.env.POSTGRES_SSL === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  ai: (() => {
    const provider = (process.env.AI_PROVIDER ?? 'anthropic') as 'anthropic' | 'gemini';
    const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    const geminiKey = process.env.GEMINI_API_KEY ?? '';
    const on = (process.env.AI_ENABLED ?? 'true') === 'true';
    // "enabled" = explicitly on AND the selected provider has a key.
    const hasKey = provider === 'gemini' ? !!geminiKey : !!apiKey;
    return {
      provider,
      apiKey,
      model: process.env.AI_MODEL ?? 'claude-opus-4-8',
      geminiKey,
      geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS ?? '1024', 10),
      enabled: on && hasKey,
    };
  })(),
});
