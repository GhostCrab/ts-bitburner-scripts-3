import { NS } from "@ns";
import { getAllServers } from "util";

export async function main(ns: NS): Promise<void> {
  const servers = getAllServers(ns);

  for(const s of servers) {
    const scripts = ns.ps(s);

    for (const script of scripts) {
      // ns.tprintf(`killing ${s}:${script.filename}`)
      if (script.filename !== 'ka.js')
        ns.kill(script.pid);
    }
  }
}
