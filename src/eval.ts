import { NS, Server } from "@ns";
import { formatTime, getAllServers, getSlaves, getTotalThreads, GROW_THREAD_MULT, HACK_PERCENT, HACK_PERCENT_MAX, MAX_BATCHES_PER_CYCLE, MS_BETWEEN_OPERATIONS } from "./util";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";
import { HackStats } from "./hud";

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
  
  server.baseDifficulty = server.baseDifficulty || ns.getServerBaseSecurityLevel(server.hostname);
  server.minDifficulty = server.minDifficulty || ns.getServerMinSecurityLevel(server.hostname);
  server.hackDifficulty = server.hackDifficulty || ns.getServerSecurityLevel(server.hostname);

  server.moneyAvailable = server.moneyAvailable || ns.getServerMoneyAvailable(server.hostname);
  server.moneyMax = server.moneyMax || ns.getServerMaxMoney(server.hostname);

  const baseMSOffset = Math.ceil(ns.formulas.hacking.weakenTime(server, ns.getPlayer()));

  let totalThreads: number;
  let batches: IHackBatch[];
  let targetHackPercent = HACK_PERCENT;
  let actualHackPercent = 0;
  let additionalBatches: number;

  while (true) {
    const workingServer = Object.assign({}, server);
    workingServer.baseDifficulty = server.baseDifficulty || ns.getServerBaseSecurityLevel(server.hostname);
    workingServer.minDifficulty = server.minDifficulty || ns.getServerMinSecurityLevel(server.hostname);
    workingServer.hackDifficulty = server.hackDifficulty || ns.getServerSecurityLevel(server.hostname);
  
    workingServer.moneyAvailable = server.moneyAvailable || ns.getServerMoneyAvailable(server.hostname);
    workingServer.moneyMax = server.moneyMax || ns.getServerMaxMoney(server.hostname);

    totalThreads = getTotalThreads(ns, slaves);
    batches = [];

    // first batch is always GW if the server is not already at min security / max money
    // find out how many threads are required to grow to max
    if (workingServer.hackDifficulty > workingServer.baseDifficulty || workingServer.moneyAvailable < workingServer.moneyMax) {
      const batch = new HackBatch();
      const baseWeaken = workingServer.hackDifficulty - workingServer.minDifficulty;
      batch.growThreads = Math.ceil(ns.formulas.hacking.growThreads(workingServer, ns.getPlayer(), workingServer.moneyMax));

      const moneyAvailable = workingServer.moneyAvailable;
      const hackDifficulty = workingServer.hackDifficulty;

      workingServer.moneyAvailable = Math.min(workingServer.moneyMax, workingServer.moneyAvailable + batch.growThreads);
      workingServer.moneyAvailable = Math.min(workingServer.moneyMax, workingServer.moneyAvailable * ns.formulas.hacking.growPercent(workingServer, batch.growThreads, ns.getPlayer()));
      let growSecIncrease = GROW_SEC * batch.growThreads;
      workingServer.hackDifficulty += growSecIncrease;
      batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);
      workingServer.hackDifficulty = Math.max(workingServer.minDifficulty, workingServer.hackDifficulty - (batch.growWeakenThreads * WEAK_SEC));

      if (batch.growWeakenThreads + batch.growThreads > totalThreads) {
        growSecIncrease = GROW_SEC * totalThreads;
        batch.growWeakenThreads = Math.ceil((growSecIncrease + baseWeaken) / WEAK_SEC);
        batch.growThreads = Math.max(totalThreads - batch.growWeakenThreads, 0);

        workingServer.hackDifficulty = hackDifficulty;
        workingServer.hackDifficulty += GROW_SEC * batch.growThreads;
        workingServer.hackDifficulty -= WEAK_SEC * batch.growWeakenThreads;
        workingServer.hackDifficulty = Math.max(workingServer.hackDifficulty, workingServer.minDifficulty);

        workingServer.moneyAvailable = moneyAvailable;

        if (batch.growThreads > 0) {
          workingServer.moneyAvailable = Math.min(workingServer.moneyMax, workingServer.moneyAvailable + batch.growThreads);
          workingServer.moneyAvailable = Math.min(workingServer.moneyMax, workingServer.moneyAvailable * ns.formulas.hacking.growPercent(workingServer, batch.growThreads, ns.getPlayer()));
        }
      }

      batches.push(batch);
      totalThreads -= batch.totalThreads();
    }

    let missedOnce = false;
    additionalBatches = 0;
    if (totalThreads > 0 ) {
      const batch = new HackBatch();
      const hackPercentPerThread = Math.min(ns.formulas.hacking.hackPercent(workingServer, ns.getPlayer()), 1);

      if (hackPercentPerThread <= 0) batch.hackThreads = 0;
      else batch.hackThreads = Math.ceil(targetHackPercent / hackPercentPerThread);

      while (true) {
        if (batch.hackThreads <= 0) {
          totalThreads = 0;
          break;
        }

        actualHackPercent = hackPercentPerThread * batch.hackThreads;
        const current = workingServer.moneyAvailable;
        const future = current - (current * actualHackPercent);
        workingServer.moneyAvailable = future;
        batch.growThreads = Math.ceil(ns.formulas.hacking.growThreads(workingServer, ns.getPlayer(), workingServer.moneyMax) * GROW_THREAD_MULT);
        workingServer.moneyAvailable = workingServer.moneyMax;
        batch.gain = current - future;
        
        batch.hackWeakenThreads = Math.ceil(ns.hackAnalyzeSecurity(batch.hackThreads, workingServer.hostname) / WEAK_SEC);
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

    if (batches.length + additionalBatches > MAX_BATCHES_PER_CYCLE)
      additionalBatches = MAX_BATCHES_PER_CYCLE - batches.length;

    if ((batches.length + additionalBatches) < MAX_BATCHES_PER_CYCLE || actualHackPercent >= HACK_PERCENT_MAX || actualHackPercent === 0) {
      server.moneyAvailable = workingServer.moneyAvailable;
      server.hackDifficulty = workingServer.hackDifficulty;
      break;
    }

    targetHackPercent += 0.1;
  }

  const cycleTime = baseMSOffset + ((batches.length + additionalBatches) * MS_BETWEEN_OPERATIONS * 4) + (MS_BETWEEN_OPERATIONS * 2);
  const cycleGain = batches.reduce((count, batch) => count + batch.gain, 0) + (additionalBatches * batches[batches.length - 1].gain);

  // if (batches.length > 1)
  //   ns.tprintf(`${server.hostname}: ${server.hackDifficulty} ${ns.formatNumber(server.moneyAvailable, 0, 1000)}/${ns.formatNumber(server.moneyMax, 0, 1000)} ${batches.length + additionalBatches} Batches | H${batches[1].hackThreads}:HW${batches[1].hackWeakenThreads}:G${batches[1].growThreads}:GW${batches[1].growWeakenThreads} | ${ns.formatNumber(cycleGain, 3, 1000, true)} Total ${(actualHackPercent*100).toFixed(2)}%% | ${formatTime(baseMSOffset)}/${formatTime(cycleTime)} | Gain ${ns.formatNumber(cycleGain / (cycleTime / 1000), 3, 1000, true)}/s`);
  // else
  //   ns.tprintf(`${server.hostname}: ${server.hackDifficulty} ${ns.formatNumber(server.moneyAvailable, 0, 1000)}/${ns.formatNumber(server.moneyMax, 0, 1000)} ${batches.length + additionalBatches} Batches | H${batches[0].hackThreads}:HW${batches[0].hackWeakenThreads}:G${batches[0].growThreads}:GW${batches[0].growWeakenThreads} | ${ns.formatNumber(cycleGain, 3, 1000, true)} Total ${(actualHackPercent*100).toFixed(2)}%% | ${formatTime(baseMSOffset)}/${formatTime(cycleTime)} | Gain ${ns.formatNumber(cycleGain / (cycleTime / 1000), 3, 1000, true)}/s`);

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
    
    let targetHackPercent = HACK_PERCENT;
    let batchHackThreads: number;
    let batchCount: number;
    while (true) {
      batchHackThreads = hackPercentPerThread > 0 ? Math.ceil(targetHackPercent / hackPercentPerThread) : 0;
      batchCount = Math.min(batchHackThreads > 0 ? Math.floor(hackThreads / batchHackThreads) : 0, MAX_BATCHES_PER_CYCLE);

      if (batchCount < MAX_BATCHES_PER_CYCLE || targetHackPercent >= HACK_PERCENT_MAX) break;
      targetHackPercent += 0.1;
    }    
    const moneyPerBatch = s.moneyAvailable ? (batchHackThreads * hackPercentPerThread) * s.moneyAvailable : 0;    
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
  //else servers = dirtyCheck(ns, getAllServers(ns)).map(s => ns.getServer(s));
  else servers = getAllServers(ns).map(s => ns.getServer(s)).filter(s => s.moneyMax && s.moneyMax > 0);

  let currentTargetHost = ''
  let currentTargetRate = 0;
  const hackStatPort = ns.getPortHandle(1);
  if (hackStatPort.peek() !== "NULL PORT DATA") {
    const hackStats: HackStats = JSON.parse(hackStatPort.peek().toString());
    currentTargetHost = hackStats.target;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = [];
  for (const s of servers) {
    const finalInfo: ICycleStats = { target: s.hostname, start: 0, time: 0, gain: 0, rate: 0 };
    let firstInfo: ICycleStats = { target: s.hostname, start: 0, time: 0, gain: 0, rate: 0 };
    let lastInfo: ICycleStats = { target: s.hostname, start: 0, time: 0, gain: 0, rate: 0 };
    const growInfo: ICyclesToReady = cyclesToReady(ns, ns.getServer(s.hostname));

    const totalCycleCount = 4;
    for (let i = 0; i < totalCycleCount; i++) {
      const cycleInfo = cycle(ns, s);
      if (i === 0) firstInfo = Object.assign({}, cycleInfo);
      if (i === totalCycleCount - 1) lastInfo = Object.assign({}, cycleInfo);

      finalInfo.gain += cycleInfo.gain;
      finalInfo.time += cycleInfo.time;
    }

    finalInfo.rate = finalInfo.gain / (finalInfo.time / 1000);

    if (s.hostname === currentTargetHost) currentTargetRate = finalInfo.rate;
    
    data.push([
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: ` ${s.hostname}`},
      finalInfo.rate,
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: `${ns.formatNumber(finalInfo.rate, 3, 1000, true)}/s`.padStart(12) },
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: formatTime(firstInfo.start).padStart(10) },
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: formatTime(firstInfo.time).padStart(10) },
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: formatTime(lastInfo.time).padStart(10) },
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: formatTime(finalInfo.time).padStart(10) },
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: `${ns.getServerSecurityLevel(s.hostname).toFixed(0).padStart(2)}/${ns.getServerMinSecurityLevel(s.hostname).toFixed(0).padStart(2)}`.padStart(9) },
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: ns.formatPercent(ns.getServerMoneyAvailable(s.hostname) / ns.getServerMaxMoney(s.hostname)).padStart(8) },
      growInfo.time,
      {color: s.hostname === currentTargetHost ? 'green' : 'white', text: `${formatTime(growInfo.time).padStart(10)}/${growInfo.cycles.toString().padStart(2)}` }
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data = data.filter((a: any[]) => Number(a[1]) >= currentTargetRate);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data = data.sort((a: any[], b: any[]) => Number(b[1]) - Number(a[1]));
  //data = data.sort((a: any[], b: any[]) => Number(a[9]) - Number(b[9]));

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
