import { NS } from "@ns";
import { HGW_RAM, getSlaves, waitForHGWScripts, doGrowWeaken, getSlaveThreads, doWeaken } from "./util";

async function allRun(ns: NS, slaves: string[], script: string, target: string, ms: number): Promise<void> {
  ns.disableLog('ALL');
  
  for (const s of slaves) {
    const slaveThreads = getSlaveThreads(ns, s);
    ns.exec(script, s, slaveThreads, target, ms);
  }

  await waitForHGWScripts(ns, slaves);
}

export async function main(ns: NS): Promise<void> {
  const slaves = getSlaves(ns);
  for (const s of slaves) {
    if (s === 'home') continue;
    ns.scp(['hack.js', 'grow.js', 'weaken.js'], s);
  }

  //const target = 'n00dles';
  const target = 'foodnstuff';
  while (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target))
    await doWeaken(ns, target);
  
  while(ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target))
    await doGrowWeaken(ns, target);

  while (true)
    await allRun(ns, slaves, 'grow.js', target, 0);
}
