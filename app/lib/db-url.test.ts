import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalDatabaseUrl, resolveDatabaseUrl } from "./db-url";








const dirty = {
  PLAYWRIGHT_DATABASE_URL: "postgresql://e2e",
  DATABASE_URL: "postgresql://dev-pooled",
  DATABASE_URL_UNPOOLED: "postgresql://dev-direct",
} as unknown as NodeJS.ProcessEnv;

test("harness override wins in both modes even when other URL variables are set", () => {
  assert.equal(resolveDatabaseUrl("pooled", dirty), "postgresql://e2e");
  assert.equal(resolveDatabaseUrl("direct", dirty), "postgresql://e2e");
});

test("pooled and direct are not interchangeable", () => {
  const { PLAYWRIGHT_DATABASE_URL: _override, ...rest } = dirty;
  assert.equal(resolveDatabaseUrl("pooled", rest), "postgresql://dev-pooled");
  assert.equal(resolveDatabaseUrl("direct", rest), "postgresql://dev-direct");
});

test("empty string throws in both modes", () => {
  
  
  
  
  
  assert.throws(() =>
    resolveDatabaseUrl("pooled", {
      DATABASE_URL: "",
    } as unknown as NodeJS.ProcessEnv),
  );
  assert.throws(() =>
    resolveDatabaseUrl("direct", {
      DATABASE_URL_UNPOOLED: "",
    } as unknown as NodeJS.ProcessEnv),
  );
});

test("direct mode throws when DATABASE_URL_UNPOOLED is absent, naming the variable", () => {
  assert.throws(
    () => resolveDatabaseUrl("direct", {} as unknown as NodeJS.ProcessEnv),
    /DATABASE_URL_UNPOOLED/,
  );
});

test("isLocalDatabaseUrl: loopback and private hosts are local", () => {
  for (const url of [
    "postgresql://postgres:pw@localhost:5432/postgres",
    "postgresql://postgres:pw@127.0.0.1:5432/postgres",
    "postgres://user:pw@127.5.6.7/db",
    "postgresql://user:pw@[::1]:5432/db",
    "postgresql://user:pw@0.0.0.0:5432/db",
    "postgresql://user:pw@10.1.2.3:5432/db",
    "postgresql://user:pw@192.168.1.20:5432/db",
    "postgresql://user:pw@172.16.0.5:5432/db",
    "postgresql://user:pw@172.31.255.255:5432/db",
    "postgresql://postgres:pw@db:5432/postgres", 
    "postgresql://postgres:pw@postgres/postgres",
    "postgresql://user:pw@mymachine.local:5432/db",
  ]) {
    assert.equal(isLocalDatabaseUrl(url), true, url);
  }
});

test("isLocalDatabaseUrl: public / managed hosts are not local", () => {
  for (const url of [
    "postgresql://user:pw@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/db?sslmode=require",
    "postgresql://user:pw@db.abcdefgh.supabase.co:5432/postgres",
    "postgres://user:pw@my-instance.abc123.us-east-1.rds.amazonaws.com:5432/db",
    "postgresql://user:pw@172.15.0.1:5432/db", 
    "postgresql://user:pw@172.32.0.1:5432/db",
    "postgresql://user:pw@11.0.0.1:5432/db",
    "not a url",
    "",
  ]) {
    assert.equal(isLocalDatabaseUrl(url), false, url);
  }
});
