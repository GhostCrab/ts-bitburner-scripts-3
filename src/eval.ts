import { NS, Server } from "@ns";
import { formatTime, getAllServers, getSlaves, getTotalThreads, HACK_PERCENT, MS_BETWEEN_OPERATIONS } from "./util";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";

const GROW_SEC = 0.004; // ns.growthAnalyzeSecurity(1, 'omega-net');
const WEAK_SEC = 0.05; // ns.weakenAnalyze(1);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export function autocomplete(data: any, args: any): string[] {
  return data.servers; // This script autocompletes the list of servers.
}

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

interface ICycleStats {
  target: string;
  start: number;
  gain: number;
  time: number;
  rate: number;
}

interface ICyclesToReady {
  target: string;
  cycles: number;
  time: number;
}

function cyclesToReady(ns: NS, server: Server): ICyclesToReady {
  const result: ICyclesToReady = {
    target: server.hostname,
    time: 0,
    cycles: 0
  }
  try {
    server.baseDifficulty = server.baseDifficulty || ns.getServerBaseSecurityLevel(server.hostname);
    server.minDifficulty = server.minDifficulty || ns.getServerMinSecurityLevel(server.hostname);
    server.hackDifficulty = server.hackDifficulty || ns.getServerSecurityLevel(server.hostname);

    server.moneyAvailable = server.moneyAvailable || ns.getServerMoneyAvailable(server.hostname);
    server.moneyMax = server.moneyMax || ns.getServerMaxMoney(server.hostname);

    const slaves = getSlaves(ns);
    const totalThreads = getTotalThreads(ns, slaves);

    while (server.moneyAvailable < server.moneyMax || server.hackDifficulty > server.minDifficulty) {
      const baseMSOffset = Math.ceil(ns.formulas.hacking.weakenTime(server, ns.getPlayer()));

      const batch = new HackBatch();
      const baseWeaken = server.hackDifficulty - server.minDifficulty;
      batch.growThreads = Math.ceil(ns.formulas.hacking.growThreads(server, ns.getPlayer(), server.moneyMax));
      let growSecIncrease = GROW_SEC * batch.growThreads;
      batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);

      if (batch.growWeakenThreads + batch.growThreads > totalThreads) {
        growSecIncrease = GROW_SEC * totalThreads;
        batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);
        batch.growThreads = totalThreads - batch.growWeakenThreads;
      }

      server.hackDifficulty += batch.growThreads * GROW_SEC;
      server.hackDifficulty = Math.max(server.minDifficulty, server.hackDifficulty - (batch.growWeakenThreads * WEAK_SEC));

      server.moneyAvailable = Math.min(server.moneyMax, ns.formulas.hacking.growPercent(server, batch.growThreads, ns.getPlayer()) * server.moneyAvailable);

      result.cycles++;
      result.time += baseMSOffset + (MS_BETWEEN_OPERATIONS * 4) + (MS_BETWEEN_OPERATIONS * 2);

      if (result.time > 1000 * 60 * 60 * 24) {
        result.cycles = -1;
        result.time = 1000 * 60 * 60 * 24;
        return result;
      }
    }

    return result;
  } catch(e) {
    return result;
  }
}

function cycle(ns: NS, server: Server): ICycleStats {
  const slaves = getSlaves(ns);
  let totalThreads = getTotalThreads(ns, slaves);

  server.baseDifficulty = server.baseDifficulty || ns.getServerBaseSecurityLevel(server.hostname);
  server.minDifficulty = server.minDifficulty || ns.getServerMinSecurityLevel(server.hostname);
  server.hackDifficulty = server.hackDifficulty || ns.getServerSecurityLevel(server.hostname);

  server.moneyAvailable = server.moneyAvailable || ns.getServerMoneyAvailable(server.hostname);
  server.moneyMax = server.moneyMax || ns.getServerMaxMoney(server.hostname);

  const batches: IHackBatch[] = [];
  const baseMSOffset = Math.ceil(ns.formulas.hacking.weakenTime(server, ns.getPlayer()));

  // first batch is always GW if the server is not already at min security / max money
  // find out how many threads are required to grow to max
  if (server.hackDifficulty > server.baseDifficulty || server.moneyAvailable < server.moneyMax) {
    const batch = new HackBatch();
    const baseWeaken = server.hackDifficulty - server.minDifficulty;
    batch.growThreads = Math.ceil(ns.formulas.hacking.growThreads(server, ns.getPlayer(), server.moneyMax));
    server.moneyAvailable = Math.min(server.moneyMax, server.moneyAvailable + batch.growThreads);
    server.moneyAvailable = Math.min(server.moneyMax, server.moneyAvailable * ns.formulas.hacking.growPercent(server, batch.growThreads, ns.getPlayer()));
    let growSecIncrease = GROW_SEC * batch.growThreads;
    server.hackDifficulty += growSecIncrease;
    batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);
    server.hackDifficulty = Math.max(server.minDifficulty, server.hackDifficulty - (batch.growWeakenThreads * WEAK_SEC));

    if (batch.growWeakenThreads + batch.growThreads > totalThreads) {
      growSecIncrease = GROW_SEC * totalThreads;
      batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);
      batch.growThreads = totalThreads - batch.growWeakenThreads;
    }

    batches.push(batch);
    totalThreads -= batch.totalThreads();
  }

  let missedOnce = false;
  let additionalBatches = 0;
  if (totalThreads > 0 ) {
    const batch = new HackBatch();
    const hackPercentPerThread = Math.min(ns.formulas.hacking.hackPercent(server, ns.getPlayer()), 1);

    if (hackPercentPerThread <= 0) batch.hackThreads = 0;
    else batch.hackThreads = Math.ceil(HACK_PERCENT / hackPercentPerThread);

    while (true) {
      if (batch.hackThreads <= 0) {
        totalThreads = 0;
        break;
      }

      const hackPercent = hackPercentPerThread * batch.hackThreads;
      const current = server.moneyAvailable;
      const future = current - (current * hackPercent);
      server.moneyAvailable = future;
      batch.growThreads = Math.ceil(ns.formulas.hacking.growThreads(server, ns.getPlayer(), server.moneyMax) * 1.2);
      server.moneyAvailable = server.moneyMax;
      batch.gain = current - future;
      
      batch.hackWeakenThreads = Math.ceil(ns.hackAnalyzeSecurity(batch.hackThreads, server.hostname) / WEAK_SEC);
      batch.growWeakenThreads = Math.ceil(batch.growThreads / (WEAK_SEC / GROW_SEC));

      if (batch.totalThreads() <= totalThreads) {
        totalThreads -= batch.totalThreads();
        batches.push(batch);

        if (missedOnce) totalThreads = 0;
        break;
      }

      batch.hackThreads = Math.floor(batch.hackThreads * 0.75);
      missedOnce = true;
    }

    // duplicate batch until there is no space left
    const batchThreads = batch.totalThreads();
    if (batchThreads > 0)
      additionalBatches = Math.floor(totalThreads / batchThreads);
  }

  if (batches.length === 0)
    return { target: server.hostname, start: 0, time: 0, gain: 0, rate: 0 };

  if (batches.length + additionalBatches > 2000)
    additionalBatches = 2000 - batches.length;

  const cycleTime = baseMSOffset + ((batches.length + additionalBatches) * MS_BETWEEN_OPERATIONS * 4) + (MS_BETWEEN_OPERATIONS * 2);
  const cycleGain = batches.reduce((count, batch) => count + batch.gain, 0) + (additionalBatches * batches[batches.length - 1].gain);

  return {
    target: server.hostname,
    start: baseMSOffset,
    time: cycleTime,
    gain: cycleGain,
    rate: cycleGain / (cycleTime / 1000)
  }
}

function dirtyCheck(ns: NS, targets: string[]) {
  const slaves = getSlaves(ns);
  const totalThreads = getTotalThreads(ns, slaves);
  const hackThreads = totalThreads * .5;
  const player = ns.getPlayer();

  const data: (string | number)[][] = []
  for (const s of targets.map(t => ns.getServer(t))) {
    s.hackDifficulty = s.minDifficulty;
    s.moneyAvailable = s.moneyMax;

    const baseTime = Math.ceil(ns.formulas.hacking.weakenTime(s, player));
    const hackPercentPerThread = Math.min(ns.formulas.hacking.hackPercent(s, player), 1);
    const batchHackThreads = hackPercentPerThread > 0 ? Math.ceil(.25 / hackPercentPerThread) : 0;
    const moneyPerBatch = s.moneyAvailable ? (batchHackThreads * hackPercentPerThread) * s.moneyAvailable : 0;
    const batchCount = batchHackThreads > 0 ? Math.floor(hackThreads / batchHackThreads) : 0;
    const moneyPerCycle = batchCount * moneyPerBatch;
    const cycleTime = baseTime + (batchCount * MS_BETWEEN_OPERATIONS * 4) + (MS_BETWEEN_OPERATIONS * 2);
    const gainPerSecond = moneyPerCycle / (cycleTime / 1000);

    if (gainPerSecond > 0) data.push([s.hostname, gainPerSecond]);

    //ns.tprintf(`${s.hostname}: ${formatTime(cycleTime)}|${formatTime(baseTime)}|${ns.formatNumber(moneyPerCycle, 3, 1000, true)}|${ns.formatNumber(gainPerSecond, 3, 1000, true)}/s`)
  }

  return data.sort((a, b) => Number(b[1]) - Number(a[1])).map(a => a[0].toString());
}

export async function main(ns: NS): Promise<void> {
  let servers: Server[] = []

  if (ns.args.length > 0 && typeof ns.args[0] === 'string') servers = [ns.getServer(ns.args[0])];
  else servers = dirtyCheck(ns, getAllServers(ns)).map(s => ns.getServer(s));

  servers = servers.slice(0, 8);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = [];
  for (const s of servers) {
    const finalInfo: ICycleStats = { target: s.hostname, start: 0, time: 0, gain: 0, rate: 0 };
    let firstInfo: ICycleStats = { target: s.hostname, start: 0, time: 0, gain: 0, rate: 0 };
    let lastInfo: ICycleStats = { target: s.hostname, start: 0, time: 0, gain: 0, rate: 0 };
    const growInfo: ICyclesToReady = cyclesToReady(ns, ns.getServer(s.hostname));

    const totalCycleCount = 5;
    for (let i = 0; i < totalCycleCount; i++) {
      const cycleInfo = cycle(ns, s);
      if (i === 0) firstInfo = Object.assign({}, cycleInfo);
      if (i === totalCycleCount - 1) lastInfo = Object.assign({}, cycleInfo);

      finalInfo.gain += cycleInfo.gain;
      finalInfo.time += cycleInfo.time;
    }

    finalInfo.rate = finalInfo.gain / (finalInfo.time / 1000);
    
    data.push([
      ` ${s.hostname}`,
      finalInfo.rate,
      `${ns.formatNumber(finalInfo.rate, 3, 1000, true)}/s`.padStart(12),
      formatTime(firstInfo.start).padStart(10),
      formatTime(firstInfo.time).padStart(10),
      formatTime(lastInfo.time).padStart(10),
      formatTime(finalInfo.time).padStart(10),
      `${ns.getServerSecurityLevel(s.hostname).toFixed(0).padStart(2)}/${ns.getServerMinSecurityLevel(s.hostname).toFixed(0).padStart(2)}`.padStart(9),
      ns.formatPercent(ns.getServerMoneyAvailable(s.hostname) / ns.getServerMaxMoney(s.hostname)).padStart(8),
      growInfo.time,
      `${formatTime(growInfo.time).padStart(10)}/${growInfo.cycles.toString().padStart(2)}`
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data = data.sort((a: any[], b: any[]) => Number(b[1]) - Number(a[1]));

	const columns = [
		{ header: ' Servers', width: 20 },
		{ header: '    Rate', width: 9, hide: true },
		{ header: '        Rate', width: 13 },
    { header: '  Start Tm', width: 11 },
    { header: ' First Cyc', width: 11 },
    { header: '  Next Cyc', width: 11 },
    { header: '  Tot Time', width: 11 },
    { header: ' Security', width: 10 },
    { header: '   Money', width: 9 },
    { header: '   Grow Time', width: 13, hide: true },
    { header: ' Grow Time', width: 14 },
    // { header: 'LOG Money', width: 10 },
    // { header: '    Value', width: 10 },
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}
