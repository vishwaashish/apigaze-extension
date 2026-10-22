import { createRequestStore } from "./requestStore.ts";
import {
  parseRequestBody,
  parseResponseText,
  shouldSkipGetContent,
} from "../shared/bodies.ts";
import { MAX_BODY_BYTES } from "../shared/constants.ts";
import { matchesFilters, sortTransactions } from "../shared/filters.ts";
import {
  formatBodyPiece,
  formatCurl,
  formatEntireApi,
  formatFetch,
  formatUrl,
  toCleanTransaction,
} from "../shared/formatters.ts";
import { formatReplayFetch } from "../shared/replay.ts";
import { formatBytes, queryFromHar, toApiTransaction } from "../shared/har.ts";
import { maskHeaders } from "../shared/mask.ts";
import type { ApiTransaction } from "../shared/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sample: ApiTransaction = {
  id: "1",
  path: "/users",
  host: "api.example.com",
  resourceType: "fetch",
  request: {
    url: "https://api.example.com/users?page=1",
    method: "GET",
    headers: {},
  },
  response: { status: 200, headers: {} },
  timing: { startedAt: 1, duration: 120 },
};

const store = createRequestStore(2);
store.add(sample);
store.add({ ...sample, id: "2" });
store.add({ ...sample, id: "3" });
assert(store.getSnapshot().items.map((item) => item.id).join(",") === "2,3", "store should drop the oldest item");
store.setPaused(true);
store.add({ ...sample, id: "4" });
assert(store.getSnapshot().items.length === 2, "paused store should ignore new items");
assert(store.getSnapshot().paused === true, "paused flag should be set");
store.setPaused(false);
store.clear();
assert(store.getSnapshot().items.length === 0, "clear should empty the store");

const ignored = toApiTransaction(
  {
    _resourceType: "script",
    request: { method: "GET", url: "https://example.com/app.js" },
    response: { status: 200 },
  },
  "x",
);
assert(ignored?.resourceType === "script", "script entries should be captured");

const captured = toApiTransaction(
  {
    _resourceType: "xhr",
    startedDateTime: "2026-01-01T00:00:00.000Z",
    time: 230.4,
    request: {
      method: "POST",
      url: "https://api.example.com/users?page=1&page=2",
      headers: [
        { name: "Accept", value: "application/json" },
        { name: "Content-Type", value: "application/json" },
      ],
      queryString: [
        { name: "page", value: "1" },
        { name: "page", value: "2" },
      ],
      postData: { mimeType: "application/json", text: '{"name":"Ashish"}' },
    },
    response: {
      status: 401,
      statusText: "Unauthorized",
      headers: [{ name: "content-type", value: "application/json" }],
    },
  },
  "9",
);

assert(captured?.path === "/users", "path should come from the URL");
assert(captured?.host === "api.example.com", "host should come from the URL");
assert(captured?.request.headers.Accept === "application/json", "request headers should map");
assert(captured?.request.body && JSON.stringify(captured.request.body) === '{"name":"Ashish"}', "JSON request body should parse");
assert(captured?.response.statusText === "Unauthorized", "status text should map");
assert(
  JSON.stringify(captured?.request.query) === JSON.stringify({ page: ["1", "2"] }),
  "duplicate query keys should become arrays",
);
assert(
  JSON.stringify(queryFromHar([{ name: "q", value: "a" }])) === JSON.stringify({ q: "a" }),
  "single query keys should stay strings",
);

const form = parseRequestBody(
  { mimeType: "application/x-www-form-urlencoded", text: "name=Ashish&age=25" },
  {},
);
assert(
  JSON.stringify(form.body) === JSON.stringify({ name: "Ashish", age: "25" }),
  "form bodies should become objects",
);

const multipart = parseRequestBody(
  {
    mimeType: "multipart/form-data",
    params: [
      { name: "name", value: "Ashish" },
      { name: "file", fileName: "a.png", contentType: "image/png" },
    ],
  },
  {},
);
assert((multipart.body as { name: string }).name === "Ashish", "multipart fields should be kept");

const missing = parseRequestBody(undefined, {}, 128);
assert(missing.bodyUnavailable === true, "missing postData with a body size should be unavailable");

const huge = "x".repeat(MAX_BODY_BYTES + 1);
assert(parseRequestBody({ text: huge }, {}).bodyTruncated === true, "huge request bodies should truncate");
assert(shouldSkipGetContent(MAX_BODY_BYTES + 1) === true, "huge responses should skip getContent");

const jsonResponse = parseResponseText('{"ok":true}', "", "application/json");
assert(JSON.stringify(jsonResponse.body) === '{"ok":true}', "JSON responses should parse");

const binary = parseResponseText("////", "base64", "image/png");
assert(binary.bodyBinary === true, "base64 or binary responses should not be parsed");

const unavailable = parseResponseText("", "", "application/json", 40);
assert(unavailable.bodyUnavailable === true, "empty content with a reported size should be unavailable");

assert(maskHeaders({ Authorization: "Bearer secret", Accept: "json" }, true).Authorization === "****", "sensitive headers should mask");
assert(
  !JSON.stringify(toCleanTransaction(sample)).includes('"id"'),
  "copied JSON should drop internal ids",
);
assert(
  matchesFilters(sample, "users", "fetch", ["2xx"], ["GET"]) === true,
  "search and filters should match the sample",
);
assert(
  matchesFilters(sample, "orders", "all", [], []) === false,
  "search should reject unrelated paths",
);
assert(
  matchesFilters(sample, "", "all", ["4xx"], []) === false,
  "status multi-select should exclude other classes",
);
assert(
  matchesFilters(sample, "", "all", [], ["POST"]) === false,
  "method multi-select should exclude other methods",
);
assert(
  matchesFilters(sample, "", "all", ["2xx", "4xx"], ["GET", "POST"]) === true,
  "multi-select should keep matching values",
);
assert(
  matchesFilters(sample, "", "js", [], []) === false,
  "type filter should exclude other resource types",
);
assert(
  matchesFilters(sample, "", "xhr", [], []) === false,
  "xhr filter should exclude fetch",
);
assert(
  matchesFilters(sample, "", "fetch/xhr", [], []) === true,
  "fetch/xhr filter should keep fetch",
);
assert(
  matchesFilters(sample, "", "all", [], [], "other.com") === false,
  "domain filter should exclude other hosts",
);
assert(
  matchesFilters(sample, "", "all", [], [], "api.example.com") === true,
  "domain filter should keep matching hosts",
);
assert(
  matchesFilters(
    { ...sample, request: { ...sample.request, body: { email: "hidden-token" } } },
    "hidden-token",
    "all",
    [],
    [],
  ) === true,
  "search should match request body text",
);
assert(
  matchesFilters(sample, "", "all", [], [], "", true) === false,
  "errors-only should hide 2xx",
);
assert(
  matchesFilters({ ...sample, response: { status: 500, headers: {} } }, "", "all", [], [], "", true) === true,
  "errors-only should keep 5xx",
);
assert(formatUrl(sample) === sample.request.url, "URL copy should be the request URL");
assert(
  formatBodyPiece({ ...sample, request: { ...sample.request, body: { ok: true } } }, "request") ===
    '{\n  "ok": true\n}',
  "body copy should pretty-print JSON",
);
assert(formatReplayFetch(sample).startsWith("fetch("), "replay should be a fetch() call");
assert(
  sortTransactions(
    [
      { ...sample, id: "a", response: { ...sample.response, status: 500 } },
      { ...sample, id: "b", response: { ...sample.response, status: 200 } },
    ],
    "status",
    "desc",
  )
    .map((item) => item.id)
    .join(",") === "a,b",
  "status desc should put 500 before 200",
);
assert(formatEntireApi(sample).includes('"method": "GET"'), "entire API copy should include the request");
assert(formatCurl(sample).startsWith("curl -X GET"), "cURL should start with the method");
assert(formatFetch(sample).startsWith("fetch("), "fetch copy should be a fetch() call");
assert(formatBytes(2048) === "2.0 kB" || formatBytes(2048).endsWith("kB"), "byte formatting should use kB");

console.log("self-check ok");
