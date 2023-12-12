import { NS, Server } from "@ns";
import { formatTime, getAllServers, getSlaves, getTotalThreads } from "./util";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";

const GROW_SEC = 0.004; // ns.growthAnalyzeSecurity(1, 'omega-net');
const WEAK_SEC = 0.05; // ns.weakenAnalyze(1);
const MS_BETWEEN_OPERATIONS = 100;

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
  try {
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
      let growSecIncrease = GROW_SEC * batch.growThreads;
      batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);

      if (batch.growWeakenThreads + batch.growThreads > totalThreads) {
        growSecIncrease = GROW_SEC * totalThreads;
        batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);
        batch.growThreads = totalThreads - batch.growWeakenThreads;
      }

      batches.push(batch);
      totalThreads -= batch.totalThreads();
    }

    let missedOnce = false;
    while (totalThreads > 0 ) {
      // from now on assume we are at minimum security, maximum money available
      server.hackDifficulty = server.minDifficulty;
      server.moneyAvailable = server.moneyMax;

      const batch = new HackBatch();
      batch.hackThreads = Math.ceil(.25 / ns.formulas.hacking.hackPercent(server, ns.getPlayer()));

      while (true) {
        if (batch.hackThreads <= 0) {
          totalThreads = 0;
          break;
        }

        const hackPercent = ns.formulas.hacking.hackPercent(server, ns.getPlayer()) * batch.hackThreads;
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
      const additionalBatches = Math.floor(totalThreads / batchThreads);
      for (let i = 0; i < additionalBatches; ++i) {
        const newBatch = new HackBatch;
        Object.assign(newBatch, batch);
        batches.push(newBatch);
        totalThreads -= newBatch.totalThreads();
      }
    }

    const cycleTime = baseMSOffset + (batches.length * MS_BETWEEN_OPERATIONS * 4) + (MS_BETWEEN_OPERATIONS * 2);
    const cycleGain = batches.reduce((count, batch) => count + batch.gain, 0);

    return {
      target: server.hostname,
      start: baseMSOffset,
      time: cycleTime,
      gain: cycleGain,
      rate: cycleGain / (cycleTime / 1000)
    }
  } catch(e) {
    return {
      target: server.hostname,
      start: 1,
      time: 1,
      gain: 0,
      rate: 0
    }
  }
}

export async function main(ns: NS): Promise<void> {
  let servers = getAllServers(ns).map(s => ns.getServer(s)).filter(s => ns.getServerMaxMoney(s.hostname) > 0 && ns.getServerMoneyAvailable(s.hostname) > 0 && s.hostname !== 'home' && !s.purchasedByPlayer && s.hasAdminRights);

  if (ns.args.length > 0 && typeof ns.args[0] === 'string') servers = servers.filter(s => s.hostname === ns.args[0]);

  const data = servers.map(s => {
    const firstCycle = cycle(ns, s);
    const nextCycle = cycle(ns, s);
    const finalInfo: ICycleStats = Object.assign({}, firstCycle);
    const growInfo: ICyclesToReady = cyclesToReady(ns, ns.getServer(s.hostname));

    const totalCycleCount = 5;
    for (let i = 1; i < totalCycleCount; i++) {
      finalInfo.gain += nextCycle.gain;
      finalInfo.time += nextCycle.time;
    }

    finalInfo.rate = finalInfo.gain / (finalInfo.time / 1000);

    return [
      ` ${s.hostname}`,
      finalInfo.rate,
      `${ns.formatNumber(finalInfo.rate, 3, 1000, true)}/s`.padStart(12),
      formatTime(firstCycle.start).padStart(10),
      formatTime(firstCycle.time).padStart(10),
      formatTime(nextCycle.time).padStart(10),
      formatTime(finalInfo.time).padStart(10),
      `${ns.getServerSecurityLevel(s.hostname).toFixed(0).padStart(2)}/${ns.getServerMinSecurityLevel(s.hostname).toFixed(0).padStart(2)}`.padStart(9),
      ns.formatPercent(ns.getServerMoneyAvailable(s.hostname) / ns.getServerMaxMoney(s.hostname)).padStart(8),
      growInfo.time,
      `${formatTime(growInfo.time).padStart(10)}/${growInfo.cycles.toString().padStart(2)}`
    ]
    }).sort((a, b) => Number(b[1]) - Number(a[1]));

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
