import { createServer } from 'node:http';
import { HttpServer } from '@effect/platform';
import { NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { Effect, LogLevel, Logger } from 'effect';
import { AppConfig, layer as configLayer } from './config.ts';
import { Proxy, layer as proxyLayer } from './proxy.ts';

const program = Effect.gen(function* () {
  const config = yield* AppConfig;
  const proxy = yield* Proxy;

  const server = yield* NodeHttpServer.make(createServer, {
    host: config.host,
    port: config.port,
  });

  yield* Effect.logInfo(
    `Proxy running at http://${config.host}:${config.port} -> ${config.upstreamBaseUrl}`,
  );
  if (config.sessionMode === 'project') {
    yield* Effect.logInfo('Session mode: project (derived from first user message)');
  }

  yield* HttpServer.serveEffect()(proxy.handle).pipe(
    Effect.provideService(HttpServer.HttpServer, server),
  );
  // serveEffect only registers the request handler; keep the fiber (and its
  // scope, which owns the listening socket) alive until interrupted.
  yield* Effect.never;
});

const main = Effect.gen(function* () {
  const config = yield* AppConfig;
  const minimum =
    config.logLevel === 'error'
      ? LogLevel.Error
      : config.logLevel === 'warn'
        ? LogLevel.Warning
        : LogLevel.Info;
  yield* program.pipe(Logger.withMinimumLogLevel(minimum));
});

NodeRuntime.runMain(
  main.pipe(
    Effect.scoped,
    Effect.provide(proxyLayer),
    Effect.provide(configLayer),
    Effect.provide(NodeHttpClient.layer),
  ),
);
