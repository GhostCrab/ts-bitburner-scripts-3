import { NS } from "@ns";
import { formatTime, getSlaves, getSlaveThreads, getTotalThreads, waitForHGWScripts } from "util";
import { ColorPrint } from "./tables";

const GROW_SEC = 0.004; // ns.growthAnalyzeSecurity(1, 'omega-net');
const WEAK_SEC = 0.05; // ns.weakenAnalyze(1);
const MS_BETWEEN_OPERATIONS = 10;

interface IHackBatch {
  growThreads: number;
  growWeakenThreads: number;
  hackThreads: number;
  hackWeakenThreads: number;

  hackTime: number;
  growTime: number;
  weakenTime: number;

  growMSBuf: number;
  growWeakenMSBuf: number;
  hackMSBuf: number;
  hackWeakenMsBuf: number;

  gain: number;

  totalThreads(): number;
}

class HackBatch implements IHackBatch {
  growThreads = 0;
  growWeakenThreads = 0;
  hackThreads = 0;
  hackWeakenThreads = 0;

  hackTime = 0;
  growTime = 0;
  weakenTime = 0;

  growMSBuf = 0;
  growWeakenMSBuf = 0;
  hackMSBuf = 0;
  hackWeakenMsBuf = 0;

  gain = 0;

  totalThreads(): number {
    return this.growThreads + this.growWeakenThreads + this.hackThreads + this.hackWeakenThreads;
  }
}

interface IScriptCall {
  script: string;
  threads: number;
  offset: number;
}

function getScriptCalls(batches: IHackBatch[]): IScriptCall[] {
  const scripts: IScriptCall[] = [];
  for (const batch of batches) {
    if (batch.growThreads > 0) {
      scripts.push({
        script: "grow.js",
        threads: batch.growThreads,
        offset: batch.growMSBuf
      })
    }

    if (batch.growWeakenThreads) {
      scripts.push({
        script: "weaken.js",
        threads: batch.growWeakenThreads,
        offset: batch.growWeakenMSBuf
      })
    }

    if (batch.hackThreads) {
      scripts.push({
        script: "hack.js",
        threads: batch.hackThreads,
        offset: batch.hackMSBuf
      })
    }

    if (batch.hackWeakenThreads) {
      scripts.push({
        script: "weaken.js",
        threads: batch.hackWeakenThreads,
        offset: batch.hackWeakenMsBuf
      })
    }
  }

  return scripts.sort((a, b) => b.threads - a.threads);
}

async function cycle(ns: NS, target: string): Promise<void> {
  const slaves = getSlaves(ns);
  let totalThreads = getTotalThreads(ns, slaves);

  const batches: IHackBatch[] = [];

  const baseMSOffset = Math.ceil(ns.getWeakenTime(target));
  const weakenTime = Math.ceil(ns.getWeakenTime(target));
  const growTime = Math.ceil(ns.getGrowTime(target));
  const hackTime = Math.ceil(ns.getHackTime(target));

  // first batch is always GW if the server is not already at min security / max money
  // find out how many threads are required to grow to max
  if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) ||
      ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target))
  {
    const batch = new HackBatch();
    const baseWeaken = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)
    const growMult = Math.max(ns.getServerMaxMoney(target) / (ns.getServerMoneyAvailable(target) + 1), 1);
    batch.growThreads = Math.ceil(ns.growthAnalyze(target, growMult));
    let growSecIncrease = GROW_SEC * batch.growThreads;
    batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);

    if (batch.growWeakenThreads + batch.growThreads > totalThreads) {
      growSecIncrease = GROW_SEC * totalThreads;
      batch.growWeakenThreads = Math.min(Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC), totalThreads);
      batch.growThreads = totalThreads - batch.growWeakenThreads;
    }

    const batchMSOffset = baseMSOffset;
    batch.weakenTime = weakenTime;
    batch.growTime = growTime;
    batch.hackTime = hackTime;
    batch.growMSBuf = batchMSOffset - batch.growTime + MS_BETWEEN_OPERATIONS;
    batch.growWeakenMSBuf = batchMSOffset - batch.weakenTime + (MS_BETWEEN_OPERATIONS * 2);

    batches.push(batch);
    totalThreads -= batch.totalThreads();
  }

  const maxBatch = new HackBatch();
  const batchMSOffset = baseMSOffset + (batches.length * MS_BETWEEN_OPERATIONS * 4);
  maxBatch.growTime = growTime;
  maxBatch.growMSBuf = batchMSOffset - maxBatch.growTime;
  maxBatch.growThreads = totalThreads;
  batches.push(maxBatch);

  const cycleThreads = batches.reduce((count, batch) => count + batch.totalThreads(), 0);
  const cycleGain = batches.reduce((count, batch) => count + batch.gain, 0);
  const cycleTime = baseMSOffset + (batches.length * MS_BETWEEN_OPERATIONS * 4) + (MS_BETWEEN_OPERATIONS * 2);
  ns.tprintf(`${target}: ${batches.length} Batches | ${cycleThreads} Threads | ${ns.formatNumber(cycleGain, 3, 1000, true)} Gain | ${formatTime(baseMSOffset)}/${formatTime(cycleTime)} | Gain ${ns.formatNumber(cycleGain / (cycleTime / 1000), 3, 1000, true)}/s`);

  const scripts = getScriptCalls(batches);
  let script = scripts.shift();
  for (const s of slaves) {
    if (script === undefined) break;

    let slaveThreads = getSlaveThreads(ns, s);
    while (slaveThreads > 0) {
      if (script === undefined) break;

      const scriptThreads = Math.min(slaveThreads, script.threads);
      ns.exec(script.script, s, {temporary: true, threads: scriptThreads}, target, script.offset);
      slaveThreads -= scriptThreads;
      script.threads -= scriptThreads;

      if (script.threads === 0)
        script = scripts.shift();
    }
  }

  await waitForHGWScripts(ns, slaves);  
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog('ALL');

  let target = 'foodnstuff';
  if (ns.args.length > 0 && typeof ns.args[0] === 'string') target = ns.args[0];

  if (!ns.hasRootAccess(target)) {
    ColorPrint(ns, ['Red1', `SUPER HACK ERROR: Unable to hack ${target} without root access`]);
    return;
  }

  while (true) {
    const slaves = getSlaves(ns);

    // copy hgw scripts to slave machines
    for (const s of slaves) {
      if (s === 'home') continue;
      ns.scp(['hack.js', 'grow.js', 'weaken.js'], s);
    }

    await cycle(ns, target);
  }
}
