import { NS } from "@ns";
import { formatTime, getSlaves, getSlaveThreads, getTotalThreads, waitForHGWScripts } from "util";

// TODO:
// [x] Use Home RAM, leaving 32GB free for other execution
// [x] Instead of W / GW / HWGW progression, start directly on HWGW and account for increased Grow and Weaken need
// [x] Implement multiple batches in a single cycle when there are surplus threads
// [ ] Re-check hackable servers every round
// [x] Incorporate formulas if available
// [ ] Purchase new servers?

const GROW_SEC = 0.004; // ns.growthAnalyzeSecurity(1, 'omega-net');
const WEAK_SEC = 0.05; // ns.weakenAnalyze(1);
const MS_BETWEEN_OPERATIONS = 100;

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

  // first batch is always GW if the server is not already at min security / max money
  // find out how many threads are required to grow to max
  if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) ||
      ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target))
  {
    const batch = new HackBatch();
    const baseWeaken = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)
    const growMult = ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target);
    batch.growThreads = Math.ceil(ns.growthAnalyze(target, growMult));
    let growSecIncrease = GROW_SEC * batch.growThreads;
    batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);

    if (batch.growWeakenThreads + batch.growThreads > totalThreads) {
      growSecIncrease = GROW_SEC * totalThreads;
      batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);
      batch.growThreads = totalThreads - batch.growWeakenThreads;
    }

    const batchMSOffset = baseMSOffset;
    batch.weakenTime = Math.ceil(ns.getWeakenTime(target));
    batch.growTime = Math.ceil(ns.getGrowTime(target));
    batch.hackTime = Math.ceil(ns.getHackTime(target));
    batch.growMSBuf = batchMSOffset - batch.growTime + MS_BETWEEN_OPERATIONS;
    batch.growWeakenMSBuf = batchMSOffset - batch.weakenTime + (MS_BETWEEN_OPERATIONS * 2);

    batches.push(batch);
    totalThreads -= batch.totalThreads();
  }

  while (totalThreads > 0 ) {
    // if (batches.length > 5) break;
    // from now on assume we are at minimum security, maximum money available
    const mockTarget = ns.getServer(target);
    mockTarget.hackDifficulty = ns.getServerMinSecurityLevel(target);

    const batch = new HackBatch();
    const batchMSOffset = baseMSOffset + (batches.length * MS_BETWEEN_OPERATIONS * 4)
    batch.hackTime = ns.formulas.hacking.hackTime(mockTarget, ns.getPlayer());
    batch.growTime = ns.formulas.hacking.growTime(mockTarget, ns.getPlayer());
    batch.weakenTime = ns.formulas.hacking.weakenTime(mockTarget, ns.getPlayer());
    batch.hackMSBuf =  batchMSOffset - batch.hackTime - MS_BETWEEN_OPERATIONS;
    batch.hackWeakenMsBuf = batchMSOffset - batch.weakenTime;
    batch.growMSBuf = batchMSOffset - batch.growTime + MS_BETWEEN_OPERATIONS;
    batch.growWeakenMSBuf = batchMSOffset - batch.weakenTime + (MS_BETWEEN_OPERATIONS * 2);

    // start with hack 50%
    batch.hackThreads = Math.ceil(.8 / ns.formulas.hacking.hackPercent(mockTarget, ns.getPlayer()));

    while (true) {
      if (batch.hackThreads <= 0) {
        totalThreads = 0;
        break;
      }

      const hackPercent = ns.formulas.hacking.hackPercent(mockTarget, ns.getPlayer()) * batch.hackThreads;
      const current = ns.getServerMaxMoney(target);
      const future = current - (current * hackPercent);
      const growMult = current / future;
      batch.growThreads = Math.ceil(ns.growthAnalyze(target, growMult));
      batch.gain = current - future;
    
      batch.hackWeakenThreads = Math.ceil(ns.hackAnalyzeSecurity(batch.hackThreads, target) / WEAK_SEC);
      batch.growWeakenThreads = Math.ceil(batch.growThreads / (WEAK_SEC / GROW_SEC));

      if (batch.totalThreads() <= totalThreads) {
        totalThreads -= batch.totalThreads();
        batches.push(batch);
        break;
      }

      batch.hackThreads--;
    }
  }

  const cycleThreads = batches.reduce((count, batch) => count + batch.totalThreads(), 0);
  const cycleGain = batches.reduce((count, batch) => count + batch.gain, 0);
  const cycleTime = baseMSOffset + (batches.length * MS_BETWEEN_OPERATIONS * 4) + (MS_BETWEEN_OPERATIONS * 2);
  ns.tprintf(`${target}: ${batches.length} Batches | ${cycleThreads} Threads | ${ns.formatNumber(cycleGain, 3, 1000, true)} Gain | ${formatTime(cycleTime)} | Gain ${ns.formatNumber(cycleGain / (cycleTime / 1000), 3, 1000, true)}/s`);

  for (const batch of batches) {
    if (!Number.isInteger(batch.growThreads) ||
        !Number.isInteger(batch.growWeakenThreads) ||
        !Number.isInteger(batch.hackThreads) ||
        !Number.isInteger(batch.hackWeakenThreads) ) {
      ns.tprintf(`${batch.growThreads} ${batch.growWeakenThreads} ${batch.hackThreads} ${batch.hackWeakenThreads}`);
    }
  }

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

  const slaves = getSlaves(ns);

  // copy hgw scripts to slave machines
  for (const s of slaves) {
    if (s === 'home') continue;
    ns.scp(['hack.js', 'grow.js', 'weaken.js'], s);
  }

  let target = 'nectar-net';
  if (ns.args.length > 0 && typeof ns.args[0] === 'string') target = ns.args[0];

  while (true) {
    await cycle(ns, target);
  }
}
