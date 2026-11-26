import { createHash } from 'node:crypto';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Headers from '@effect/platform/Headers';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import * as HttpServerResponse from '@effect/platform/HttpServerResponse';
import { Context, Effect, Layer, Option } from 'effect';
import { AppConfig } from './config.ts';

const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
] as const;

const RESPONSE_HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
] as const;

const strip = (
  headers: Headers.Headers,
  names: readonly string[],
): Headers.Headers => {
  let result = headers;
  for (const name of names) {
    if (name in result) result = Headers.remove(result, name);
  }
  return result;
};

const textOf = (content: unknown): string | undefined => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return undefined;
  const parts: string[] = [];
  for (const part of content) {
    if (typeof part !== 'object' || part === null) continue;
    const record = part as { type?: unknown; text?: unknown };
    if (record.type === 'text' && typeof record.text === 'string') {
      parts.push(record.text);
    }
  }
  return parts.length > 0 ? parts.join('\n') : undefined;
};

/**
 * Derive a stable session from the conversation opener. Open CoDesign resends
 * the full history on every turn, so the first user message stays constant,
 * and the initial design brief is unique per project. If history pruning ever
 * removes it, the hash changes — that is a cache miss, not an API error.
 */
const projectSessionId = (bytes: Uint8Array): string | undefined => {
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof body !== 'object' || body === null) return undefined;
    const messages = (body as { messages?: unknown }).messages;
    if (!Array.isArray(messages)) return undefined;
    for (const message of messages) {
      if (typeof message !== 'object' || message === null) continue;
      const record = message as { role?: unknown; content?: unknown };
      if (record.role !== 'user') continue;
      const text = textOf(record.content);
      if (text === undefined || text.trim().length === 0) continue;
      return `ses_${createHash('sha256').update(text.slice(0, 4096)).digest('hex')}`;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

type Handle = Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  | AppConfig
  | HttpClient.HttpClient
  | HttpServerRequest.HttpServerRequest
>;

export interface ProxyShape {
  readonly handle: Handle;
}

export class Proxy extends Context.Tag('Proxy')<Proxy, ProxyShape>() {}

const handle: Handle = Effect.gen(function* () {
  const started = yield* Effect.sync(() => performance.now());
  const config = yield* AppConfig;
  const client = yield* HttpClient.HttpClient;
  const request = yield* HttpServerRequest.HttpServerRequest;

  const method = request.method;
  const url = request.url;
  const queryIndex = url.indexOf('?');
  const path = (queryIndex >= 0 ? url.slice(0, queryIndex) : url).replace(
    /^\/v1(?=\/|$)/,
    '',
  );
  const query = queryIndex >= 0 ? url.slice(queryIndex) : '';
  const target = `${config.upstreamBaseUrl.replace(/\/+$/, '')}${path}${query}`;

  const bytes = new Uint8Array(yield* request.arrayBuffer);
  const contentType = Option.getOrUndefined(
    Headers.get(request.headers, 'content-type'),
  );

  let headers = strip(Headers.fromInput(request.headers), HOP_BY_HOP);
  const incomingSession = Option.getOrUndefined(
    Headers.get(headers, 'x-opencode-session'),
  )?.trim();
  const session =
    incomingSession ||
    (config.sessionMode === 'project'
      ? projectSessionId(bytes) ?? config.sessionId
      : config.sessionId);
  headers = Headers.set(headers, 'x-opencode-session', session);
  headers = Headers.set(headers, 'user-agent', config.userAgent);

  const response = yield* client.execute(
    HttpClientRequest.make(method)(target).pipe(
      HttpClientRequest.setHeaders(headers),
      HttpClientRequest.bodyUint8Array(bytes, contentType),
    ),
  );

  const responseHeaders = strip(response.headers, RESPONSE_HOP_BY_HOP);
  const result = HttpServerResponse.stream(response.stream, {
    status: response.status,
    headers: responseHeaders,
  });

  yield* Effect.logInfo('proxied', {
    method,
    path,
    status: response.status,
    session,
    ms: Math.round(performance.now() - started),
  });

  return result;
}).pipe(
  Effect.catchAll((cause) =>
    Effect.gen(function* () {
      yield* Effect.logError('upstream failure', { cause: String(cause) });
      return HttpServerResponse.text('Bad Gateway', { status: 502 });
    }),
  ),
);

export const layer: Layer.Layer<Proxy> = Layer.succeed(
  Proxy,
  Proxy.of({ handle }),
);
