import { randomUUID } from 'node:crypto';
import type { ConfigError } from 'effect/ConfigError';
import { Config, Context, Layer } from 'effect';

export interface AppConfigShape {
  readonly host: string;
  readonly port: number;
  readonly upstreamBaseUrl: string;
  readonly userAgent: string;
  readonly sessionMode: 'global' | 'project';
  readonly sessionId: string;
  readonly logLevel: 'info' | 'warn' | 'error';
}

export class AppConfig extends Context.Tag('AppConfig')<
  AppConfig,
  AppConfigShape
>() {}

// Generated once per process so every request shares one stable identity.
const generatedSessionId = `ses_${randomUUID().replaceAll('-', '')}`;

const config = Config.all({
  host: Config.string('HOST').pipe(Config.withDefault('127.0.0.1')),
  port: Config.port('PORT').pipe(Config.withDefault(8787)),
  upstreamBaseUrl: Config.string('UPSTREAM_BASE_URL').pipe(
    Config.withDefault('https://opencode.ai/inference/go/openai/v1'),
  ),
  // OpenCode Go asks clients to identify themselves with their own UA.
  userAgent: Config.string('USER_AGENT').pipe(
    Config.withDefault('codesign-go-bridge/0.1.0'),
  ),
  sessionMode: Config.literal('global', 'project')('SESSION_MODE').pipe(
    Config.withDefault('global'),
  ),
  sessionId: Config.string('CODESIGN_SESSION_ID').pipe(
    Config.withDefault(generatedSessionId),
  ),
  logLevel: Config.literal('info', 'warn', 'error')('LOG_LEVEL').pipe(
    Config.withDefault('info'),
  ),
});

export const layer: Layer.Layer<AppConfig, ConfigError> = Layer.effect(
  AppConfig,
  config,
);
