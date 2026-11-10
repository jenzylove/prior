#!/usr/bin/env node
/**
 * Prior MCP server: lets any MCP agent (Claude Code, Codex, Cursor) read a Prior visa file.
 * The file is Seal encrypted on Walrus. This server decrypts it locally with your delegate key,
 * so the agent sees your history and the hosted relayer never needs the plaintext.
 *
 * Env: MEMWAL_KEY (delegate private key, hex), MEMWAL_ACCOUNT_ID, optional PRIOR_FILE (default namespace).
 * Claude Code: claude mcp add prior -e MEMWAL_KEY=... -e MEMWAL_ACCOUNT_ID=... -- node mcp/server.mjs
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MemWal } from '@mysten-incubation/memwal';
import { MemWalManual } from '@mysten-incubation/memwal/manual';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const RELAYER = 'https://relayer.memory.walrus.xyz';
const PKG = '0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5';
const REGISTRY = '0x8bf82c9e09e36b8d1c38298f68b7cb68e7b8762887e7592add9986d5e9cf199f';
const PREFIX = 'PRIOR_FACT v1 ';

const key = process.env.MEMWAL_KEY;
const accountId = process.env.MEMWAL_ACCOUNT_ID;
if (!key || !accountId) { console.error('Set MEMWAL_KEY and MEMWAL_ACCOUNT_ID'); process.exit(1); }

const relay = MemWal.create({ key, accountId, serverUrl: RELAYER, namespace: 'prior' });
const kp = Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(key, 'hex')));
const manual = MemWalManual.create({ key, suiPrivateKey: kp.getSecretKey(), embeddingApiKey: 'relayer', packageId: PKG, registryId: REGISTRY, accountId, serverUrl: RELAYER, namespace: 'prior', suiNetwork: 'mainnet' });
manual.embed = async (t) => (await relay.embed(t)).vector;

const parse = (r) => {
  if (!r.text?.startsWith(PREFIX)) return null;
  try { return { ...JSON.parse(r.text.slice(PREFIX.length)), blobId: r.blob_id, distance: r.distance }; } catch { return null; }
};
const fileArg = z.string().regex(/^file-[a-z0-9]{6,24}$/).describe('Prior file id, e.g. file-ab12cd34ef').optional();
const resolve = (f) => f ?? process.env.PRIOR_FILE ?? (() => { throw new Error('Pass a file id or set PRIOR_FILE'); })();

const server = new McpServer({ name: 'prior', version: '0.1.0' });

server.tool('recall_visa_history', 'Search a Prior visa file by meaning (past applications, refusals and their reasons, trips, jobs, addresses, lessons). Returns decrypted facts with their Walrus blob ids.', { file: fileArg, query: z.string(), limit: z.number().int().min(1).max(30).optional() }, async ({ file, query, limit }) => {
  const res = await manual.recallManual(query, { limit: limit ?? 8, namespace: resolve(file) });
  const facts = res.results.map(parse).filter(Boolean);
  return { content: [{ type: 'text', text: JSON.stringify(facts, null, 2) }] };
});

server.tool('list_visa_file', 'Return every fact in a Prior visa file, decrypted from Walrus, grouped by kind.', { file: fileArg }, async ({ file }) => {
  const res = await manual.recallManual('visa application history travel employment refusal address lesson identity', { limit: 100, namespace: resolve(file) });
  const facts = res.results.map(parse).filter(Boolean);
  const byKind = {};
  for (const f of facts) (byKind[f.kind] ??= []).push({ id: f.id, text: f.text, fields: f.fields, source: f.source, blobId: f.blobId });
  return { content: [{ type: 'text', text: JSON.stringify(byKind, null, 2) }] };
});

await server.connect(new StdioServerTransport());
