import { NS } from "@ns";

export function getAllServers(ns: NS): string[] {
  const servers: Set<string> = new Set<string>();
  const queue: string[] = ['home'];

  // eslint-disable-next-line no-constant-condition
  while(true) {
    const host = queue.pop();
    if (host === undefined) break;

    servers.add(host);
    const connectedServers = ns.scan(host);
    queue.push(...connectedServers.filter(server => !servers.has(server)));
  }

  return Array.from(servers);
}