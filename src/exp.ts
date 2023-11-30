import { NS } from "@ns";
import { HGW_RAM, getSlaves, waitForHGWScripts } from "./util";

async function allRun(ns: NS, slaves: string[], script: string, target: string, ms: number): Promise<void> {
  for (const s of slaves) {
    const threads = Math.floor(ns.getServerMaxRam(s) / HGW_RAM);
    ns.exec(script, s, threads, target, ms);
  }

  await waitForHGWScripts(ns, slaves);
}

export async function main(ns: NS): Promise<void> {
  const slaves = getSlaves(ns);

  for (const s of slaves) {
    if (s === 'home') continue;
    ns.scp(['hack.js', 'grow.js', 'weaken.js'], s);
  }

  while (true)
    await allRun(ns, slaves, 'grow.js', 'n00dles', 0);
}
