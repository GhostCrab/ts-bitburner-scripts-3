import { NS } from "@ns";
import { getAllServers } from "util";

export async function main(ns: NS): Promise<void> {
  ns.disableLog('ALL');
  const servers = getAllServers(ns);

  const hackPIDs: number[] = [];
  const growPIDs: number[] = [];
  const weakenPIDs: number[] = [];

  for(const s of servers) {
    const scripts = ns.ps(s);

    for (const script of scripts) {
      if (script.filename === 'simple-hack.js' || script.filename === 'super-hack.js') {
        ns.kill(script.pid);
        ns.tprintf(`Killed Hack Controller`);
      }

      if (script.filename === 'hack.js')
        hackPIDs.push(script.pid);

      if (script.filename === 'grow.js')
        growPIDs.push(script.pid);
      
      if (script.filename === 'weaken.js')
        weakenPIDs.push(script.pid);
    }
  }
  
  hackPIDs.map(pid => ns.kill(pid));
  ns.tprintf(`Killed ${hackPIDs.length} Hack Scripts`);
  await ns.sleep(100);

  growPIDs.map(pid => ns.kill(pid));
  ns.tprintf(`Killed ${growPIDs.length} Grow Scripts`);
  await ns.sleep(100);

  weakenPIDs.map(pid => ns.kill(pid));
  ns.tprintf(`Killed ${weakenPIDs.length} Weaken Scripts`);
}
