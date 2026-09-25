import { describe, it, expect, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import path from "path";

describe("MCP Server Dual-Stack Connectivity & Endpoints", () => {
  const TEST_PORT = 8789;
  let serverProcess: ChildProcess | null = null;

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it("spawns mcp.js and responds to dual-stack IPv4/IPv6 and flexible endpoints", async () => {
    const mcpPath = path.resolve(__dirname, "../../mcp.js");

    serverProcess = spawn("node", [mcpPath, "--port", String(TEST_PORT)], {
      stdio: ["ignore", "ignore", "pipe"],
    });

    // Wait for server to boot
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 1. IPv4 health check
    const resIpv4 = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    expect(resIpv4.ok).toBe(true);
    const dataIpv4 = await resIpv4.json();
    expect(dataIpv4.name).toBe("motion-studio");
    expect(dataIpv4.status).toBe("running");
    expect(dataIpv4.port).toBe(TEST_PORT);

    // 2. Dual-stack IPv6 / localhost check
    const resLocalhost = await fetch(`http://localhost:${TEST_PORT}/health`);
    expect(resLocalhost.ok).toBe(true);
    const dataLocalhost = await resLocalhost.json();
    expect(dataLocalhost.name).toBe("motion-studio");

    // 3. POST JSON-RPC to /mcp
    const rpcResMcp = await fetch(`http://localhost:${TEST_PORT}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });
    expect(rpcResMcp.ok).toBe(true);
    const rpcDataMcp = await rpcResMcp.json();
    expect(rpcDataMcp.result?.tools?.length).toBeGreaterThan(30);

    // 4. POST JSON-RPC to /sse (supported by streamable MCP clients)
    const rpcResSse = await fetch(`http://localhost:${TEST_PORT}/sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });
    expect(rpcResSse.ok).toBe(true);
    const rpcDataSse = await rpcResSse.json();
    expect(rpcDataSse.result?.tools?.length).toBeGreaterThan(30);
  });
});
