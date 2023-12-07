import { NS } from "@ns";
import { getAllServers, formatTime, doWeaken, doGrowWeaken, doHackWeakenGrowWeaken, getSlaves, getTotalThreads } from "util";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";

// function calcGainPerMS(ns: NS, target: string): number {
//   const servers = getAllServers(ns);
//   const slaves = servers.filter(s => s !== 'home').filter(s => ns.getServerMaxRam(s) > 0 && ns.hasRootAccess(s));
//   const totalThreads = slaves.reduce((count, slave) => count + Math.floor(ns.getServerMaxRam(slave) / HGW_RAM), 0);

//   const weakTime = Math.ceil(ns.getWeakenTime(target));

//   const growSec = 0.004; // ns.growthAnalyzeSecurity(5, 'omega-net');
//   const weakSec = 0.05; // ns.weakenAnalyze(1);

//   const current = ns.getServerMoneyAvailable(target);
//   let hackThreads = 1;
//   let maxGain = 0;
//   while (true) {
//     const hackPercent = ns.hackAnalyze(target) * hackThreads;
//     if (hackPercent > .9) break;
//     const future = current - (current * hackPercent);
//     const growMult = current / future;
//     // ns.tprintf(`${hackPercent} ${growMult}`);
//     const growThreads = Math.ceil(ns.growthAnalyze(target, growMult));
//     const gain = current - future;

//     const hwT = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target) / weakSec);
//     const gwT = Math.ceil(growThreads / (weakSec / growSec));
//     const totalHWGWThreads = hackThreads+hwT+growThreads+gwT;
//     if (totalHWGWThreads > totalThreads) break;

//     if (gain > maxGain) {
//       maxGain = gain;
//     }
    
//     hackThreads++;
//   }

//   return maxGain / weakTime;
// }

export async function main(ns: NS): Promise<void> {
  const servers = getAllServers(ns);
  const slaves = getSlaves(ns);
  const totalThreads = getTotalThreads(ns, slaves);

  ns.tprintf(`  Total Threads: ${totalThreads}`);

  const weakenPerRound = totalThreads * 0.05;

  const targets = servers.filter(s => ns.getServerMaxMoney(s) > 0).filter(s => {
    const weakenTime = ns.getWeakenTime(s);
    const securityLevel = ns.getServerSecurityLevel(s);
    const minSecurityLevel = ns.getServerMinSecurityLevel(s);
    const weakenRounds = Math.ceil((securityLevel - minSecurityLevel) / weakenPerRound);
    const fullWeakenTime = weakenTime * weakenRounds;

    return fullWeakenTime < 1000 * 60 * 60 * 2;
  }).sort((a, b) => ns.getServerMaxMoney(a) - ns.getServerMaxMoney(b));

  const data = targets.map(s => {
    const weakenTime = ns.getWeakenTime(s);
    const securityLevel = ns.getServerSecurityLevel(s);
    const minSecurityLevel = ns.getServerMinSecurityLevel(s);
    const weakenRounds = Math.ceil((securityLevel - minSecurityLevel) / weakenPerRound);
    const fullWeakenTime = weakenTime * weakenRounds;

    return [
      ` ${s}`,
      ns.getServerBaseSecurityLevel(s).toString().padStart(9),
      minSecurityLevel.toString().padStart(9),
      securityLevel.toString().padStart(9),
      formatTime(weakenTime).padStart(12),
      // weakenRounds.toString().padStart(7),
      formatTime(fullWeakenTime).padStart(12),
      //weakenTime.toString(),
      ns.formatNumber(ns.getServerMoneyAvailable(s), 3, 1000, true).padStart(10),
      ns.formatNumber(ns.getServerMaxMoney(s), 3, 1000, true).padStart(10),
      // ns.formatNumber(calcGainPerMS(ns, s), 3, 1000, true).padStart(10),
    ]
  });

	const columns = [
		{ header: ' Servers', width: 20 },
		{ header: ' Base Sec', width: 10 },
    { header: '  Min Sec', width: 10 },
    { header: '      Sec', width: 10 },
    { header: ' Weaken Time', width: 13 },
    // { header: ' Rounds', width: 8 },
    { header: ' Full Weaken', width: 13 },
    { header: '     Money', width: 11 },
		{ header: ' Max Money', width: 11 },
    // { header: '   Gain/ms', width: 11 },
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

  if (ns.args.length > 0 && ns.args[0] === 'PEEK') {
    return;
  }

  // Weaken always reduces security by 0.05 per thread

  // copy hgw scripts to slave machines
  for (const s of slaves) {
    if (s === 'home') continue;
    ns.scp(['hack.js', 'grow.js', 'weaken.js'], s);
  }

  let target = 'phantasy';
  if (ns.args.length > 0 && typeof ns.args[0] === 'string') target = ns.args[0];

  // fully weaken the target
  while (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)) {
    await doWeaken(ns, target);
  }

  ns.tprintf(`${target} fully weakened`);

  while(ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target))
    await doGrowWeaken(ns, target);

  ns.tprintf(`${target} fully grown`);

  while (true) {
    await doHackWeakenGrowWeaken(ns, target);
  }
}
