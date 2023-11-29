import { NS } from "@ns";
import { getAllServers } from "util";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";

const HGW_RAM = 1.75;

// returns growth multiplier when executing grow with the given number of threads
function invGrowthAnalyze(ns: NS, target: string, threads: number, max?: number, min?: number): number {
  if (ns.getServerMaxMoney(target) === ns.getServerMoneyAvailable(target)) return 1;
  // if (min !== undefined && min <= 1) return 1;

  max = max || ns.getServerMaxMoney(target) / (ns.getServerMoneyAvailable(target) + 1);
  min = min || 1.000001;
  
  if(Math.round(min*100000) >= Math.round(max*100000)) return min;
  
  const mid = min + ((max - min) / 2);

  // ns.tprintf(`min:${min}|mid:${mid}|max:${max}`);
  
  const ga = Math.floor(ns.growthAnalyze(target, mid));
  
  // ns.tprintf(`ga:${ga}`);

  if (ga === threads) return mid;

  if (ga > threads) return invGrowthAnalyze(ns, target, threads, mid, min);

  return invGrowthAnalyze(ns, target, threads, max, mid);
}

function formatTime(time: number, showms = false): string {
  const ms = time % 1000;
  const seconds = Math.floor(time / 1000) % 60;
  const minutes = Math.floor(time / 1000 / 60) % 60;
  const hours = Math.floor(time / 1000 / 60 / 60);

  if (showms)
    return `${(minutes > 0 ? minutes.toFixed(0) + ':' : '')}${seconds.toFixed(0).padStart(2, '0')}.${ms.toFixed(0).padStart(3, '0')}`;
  
  return `${(hours > 0 ? hours.toFixed(0) + ':' : '')}${((minutes > 0 || hours > 0) ? minutes.toFixed(0).padStart(2, '0') + ':' : '')}${seconds.toFixed(0).padStart(2, '0')}`;
}

function allRun(ns: NS, slaves: string[], script: string, target: string, ms: number): void {
  for (const s of slaves) {
    const threads = Math.floor(ns.getServerMaxRam(s) / HGW_RAM);
    ns.exec(script, s, threads, target, ms);
  }
}

function calcGainPerMS(ns: NS, target: string): number {
  const servers = getAllServers(ns);
  const slaves = servers.filter(s => s !== 'home').filter(s => ns.getServerMaxRam(s) > 0 && ns.hasRootAccess(s));
  const totalThreads = slaves.reduce((count, slave) => count + Math.floor(ns.getServerMaxRam(slave) / HGW_RAM), 0);

  const weakTime = Math.ceil(ns.getWeakenTime(target));
  const growTime = Math.ceil(ns.getGrowTime(target));
  const growMSBuf = weakTime - growTime;
  const hackTime = Math.ceil(ns.getHackTime(target));
  const hackMSBuf = weakTime - hackTime;

  const growSec = 0.004; // ns.growthAnalyzeSecurity(5, 'omega-net');
  const weakSec = 0.05; // ns.weakenAnalyze(1);

  // const availableMoney = ns.getServerMoneyAvailable(target);
  // const growResult = ((invGrowthAnalyze(ns, target, 2) * availableMoney) - availableMoney) / availableMoney;

  // ns.tprintf(`${ns.hackAnalyze(target)} * ${ns.formatNumber(availableMoney, 3, 1000, true)} = ${ns.formatNumber(availableMoney*ns.hackAnalyze(target), 3, 1000, true)}`);
  // ns.tprintf(`growResult:${growResult}`)

  /*
    hack removes 25%
    find multiplier that restores 25%

    current - (current * hack%) = future

    future * mult = goal (current)

    mult = goal / future
  */

  const current = ns.getServerMoneyAvailable(target);
  let hackThreads = 1;
  let maxGain = 0;
  let finalHackThreads = 0;
  while (true) {
    const hackPercent = ns.hackAnalyze(target) * hackThreads;
    if (hackPercent > .9) break;
    const future = current - (current * hackPercent);
    const growMult = current / future;
    // ns.tprintf(`${hackPercent} ${growMult}`);
    const growThreads = Math.ceil(ns.growthAnalyze(target, growMult));
    const gain = current - future;

    const hwT = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target) / weakSec);
    const gwT = Math.ceil(growThreads / (weakSec / growSec));
    const totalHWGWThreads = hackThreads+hwT+growThreads+gwT;
    if (totalHWGWThreads > totalThreads) break;

    const curStr = ns.formatNumber(current, 3, 1000, true);
    const futStr = ns.formatNumber(future, 3, 1000, true);
    const resStr = ns.formatNumber(future*growMult, 3, 1000, true);
    const gainStr = ns.formatNumber(gain, 3, 1000, true);

    // ns.tprintf(`current:${curStr}|future:${futStr}|growMult:${growMult}|result:${resStr}|gain:${gainStr}`);
    // ns.tprintf(`ht:${hackThreads}|hwt:${hwT}|gt:${growThreads}|gwt:${gwT}|tot:${hackThreads+hwT+growThreads+gwT}`);

    if (gain > maxGain) {
      maxGain = gain;
      finalHackThreads = hackThreads;
    }
    
    hackThreads++;
  }

  return maxGain / weakTime;
}

async function doHackWeakenGrowWeaken(ns: NS, target: string): Promise<void> {
  const servers = getAllServers(ns);
  const slaves = servers.filter(s => s !== 'home').filter(s => ns.getServerMaxRam(s) > 0 && ns.hasRootAccess(s));
  const totalThreads = slaves.reduce((count, slave) => count + Math.floor(ns.getServerMaxRam(slave) / HGW_RAM), 0);

  const weakTime = Math.ceil(ns.getWeakenTime(target));
  const growTime = Math.ceil(ns.getGrowTime(target));
  const hackTime = Math.ceil(ns.getHackTime(target));

  const growSec = 0.004; // ns.growthAnalyzeSecurity(5, 'omega-net');
  const weakSec = 0.05; // ns.weakenAnalyze(1);

  // const availableMoney = ns.getServerMoneyAvailable(target);
  // const growResult = ((invGrowthAnalyze(ns, target, 2) * availableMoney) - availableMoney) / availableMoney;

  // ns.tprintf(`${ns.hackAnalyze(target)} * ${ns.formatNumber(availableMoney, 3, 1000, true)} = ${ns.formatNumber(availableMoney*ns.hackAnalyze(target), 3, 1000, true)}`);
  // ns.tprintf(`growResult:${growResult}`)

  /*
    hack removes 25%
    find multiplier that restores 25%

    current - (current * hack%) = future

    future * mult = goal (current)

    mult = goal / future
  */

  const current = ns.getServerMoneyAvailable(target);
  let hackThreads = 1;
  let maxGain = 0;
  let finalHackThreads = 0;
  while (true) {
    const hackPercent = ns.hackAnalyze(target) * hackThreads;
    if (hackPercent > .9) break;

    const future = current - (current * hackPercent);
    const growMult = current / future;
    const growThreads = Math.ceil(ns.growthAnalyze(target, growMult));
    const gain = current - future;

    const hackWeakenThreads = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target) / weakSec);
    const gwT = Math.ceil(growThreads / (weakSec / growSec));
    const totalHWGWThreads = hackThreads+hackWeakenThreads+growThreads+gwT;
    if (totalHWGWThreads > totalThreads) break;

    const curStr = ns.formatNumber(current, 3, 1000, true);
    const futStr = ns.formatNumber(future, 3, 1000, true);
    const resStr = ns.formatNumber(future*growMult, 3, 1000, true);
    const gainStr = ns.formatNumber(gain, 3, 1000, true);

    // ns.tprintf(`current:${curStr}|future:${futStr}|growMult:${growMult}|result:${resStr}|gain:${gainStr}`);
    // ns.tprintf(`ht:${hackThreads}|hackWeakenThreads:${hackWeakenThreads}|gt:${growThreads}|gwt:${gwT}|tot:${hackThreads+hackWeakenThreads+growThreads+gwT}`);

    if (gain > maxGain) {
      maxGain = gain;
      finalHackThreads = hackThreads;
    }
    
    hackThreads++;
  }

  hackThreads = finalHackThreads;
  const hackPercent = ns.hackAnalyze(target) * hackThreads;
  const future = current - (current * hackPercent);
  const growMult = current / future;
  let growThreads = Math.ceil(ns.growthAnalyze(target, growMult));
  const gain = current - future;

  let hackWeakenThreads = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target) / weakSec);
  let growWeakenThreads = Math.ceil(growThreads / (weakSec / growSec));
  const totalHWGWThreads = hackThreads+hackWeakenThreads+growThreads+growWeakenThreads;

  const curStr = ns.formatNumber(current, 3, 1000, true);
  const futStr = ns.formatNumber(future, 3, 1000, true);
  const resStr = ns.formatNumber(future*growMult, 3, 1000, true);
  const gainStr = ns.formatNumber(gain, 3, 1000, true);

  ns.tprintf(`current:${curStr}|future:${futStr}|growMult:${growMult}|result:${resStr}|gain:${gainStr}`);
  ns.tprintf(`ht:${hackThreads}|hwt:${hackWeakenThreads}|gt:${growThreads}|gwt:${growWeakenThreads}|tot:${hackThreads+hackWeakenThreads+growThreads+growWeakenThreads}`);

  // hack finish first, then hw, then grow, then gw
  const hackMSBuf = weakTime - hackTime - 200;
  const hackWeakMSBuf = 0;
  const growMSBuf = (weakTime - growTime) + 200;
  const growWeakMSBuf = 400;

  for (const s of slaves) {
    let slaveThreads = Math.floor(ns.getServerMaxRam(s) / HGW_RAM);

    const slaveHackThreads = Math.min(slaveThreads, hackThreads);
    slaveThreads -= slaveHackThreads;
    hackThreads -= slaveHackThreads;

    const slaveHackWeakenThreads = Math.min(slaveThreads, hackWeakenThreads);
    slaveThreads -= slaveHackWeakenThreads;
    hackWeakenThreads -= slaveHackWeakenThreads;

    const slaveGrowThreads = Math.min(slaveThreads, growThreads);
    slaveThreads -= slaveGrowThreads;
    growThreads -= slaveGrowThreads;

    const slaveWeakenGrowThreads = Math.min(slaveThreads, growWeakenThreads);
    slaveThreads -= slaveWeakenGrowThreads;
    growWeakenThreads -= slaveWeakenGrowThreads;

    if (slaveHackThreads > 0) ns.exec('hack.js', s, slaveHackThreads, target, hackMSBuf);
    if (slaveHackWeakenThreads > 0) ns.exec('weaken.js', s, slaveHackWeakenThreads, target, hackWeakMSBuf);
    if (slaveGrowThreads > 0) ns.exec('grow.js', s, slaveGrowThreads, target, growMSBuf);
    if (slaveWeakenGrowThreads > 0) ns.exec('weaken.js', s, slaveWeakenGrowThreads, target, growWeakMSBuf);

    // if (slaveThreads > 0) ns.tprint(`WARNING [doHackWeakenGrowWeaken]: ${s} has ${slaveThreads} unused threads`);
  }

  if (hackThreads > 0) ns.tprint(`WARNING [doHackWeakenGrowWeaken]: ${hackThreads} Hack Threads unaccounted`);
  if (hackWeakenThreads > 0) ns.tprint(`WARNING [doHackWeakenGrowWeaken]: ${hackWeakenThreads} HackWeaken Threads unaccounted`);
  if (growThreads > 0) ns.tprint(`WARNING [doHackWeakenGrowWeaken]: ${growThreads} Grow Threads unaccounted`);
  if (growWeakenThreads > 0) ns.tprint(`WARNING [doHackWeakenGrowWeaken]: ${growWeakenThreads} GrowWeaken Threads unaccounted`);

  while (slaves.some( s => ns.ps(s).length > 0))
    await ns.sleep(20);
}

async function doGrowWeaken(ns: NS, target: string): Promise<void> {
  const servers = getAllServers(ns);
  const slaves = servers.filter(s => s !== 'home').filter(s => ns.getServerMaxRam(s) > 0 && ns.hasRootAccess(s));
  const totalThreads = slaves.reduce((count, slave) => count + Math.floor(ns.getServerMaxRam(slave) / HGW_RAM), 0);

  const weakTime = Math.ceil(ns.getWeakenTime(target));
  const growTime = Math.ceil(ns.getGrowTime(target));
  const growMSBuf = weakTime - growTime;

  const growSec = 0.004; // ns.growthAnalyzeSecurity(5, 'omega-net');
  const weakSec = 0.05; // ns.weakenAnalyze(1);

  // run 1 weaken thread for every 12.5 grow threads;
  let weakenThreads = Math.ceil(totalThreads / (weakSec / growSec));
  let growThreads = totalThreads - weakenThreads;

  const availableMoney = ns.getServerMoneyAvailable(target);
  const maxMoney = ns.getServerMaxMoney(target);
  const growResult = invGrowthAnalyze(ns, target, growThreads) * availableMoney;

  ns.tprintf(`Growing ${target} sec:${ns.getServerSecurityLevel(target)}|wt:${weakenThreads}|gt:${growThreads} ${ns.formatNumber(availableMoney, 3, 1000, true)} => ${ns.formatNumber(growResult, 3, 1000, true)} / ${ns.formatNumber(maxMoney, 3, 1000, true)} ${formatTime(weakTime+200)}`);

  for (const s of slaves) {
    let slaveThreads = Math.floor(ns.getServerMaxRam(s) / HGW_RAM);
    const slaveWeakenThreads = Math.min(slaveThreads, weakenThreads);
    slaveThreads -= slaveWeakenThreads;
    weakenThreads -= slaveWeakenThreads;
    const slaveGrowThreads = Math.min(slaveThreads, growThreads);
    slaveThreads -= slaveGrowThreads;
    growThreads -= slaveGrowThreads;

    if (slaveWeakenThreads > 0) ns.exec('weaken.js', s, slaveWeakenThreads, target, 200);
    if (slaveGrowThreads > 0) ns.exec('grow.js', s, slaveGrowThreads, target, growMSBuf);

    if (slaveThreads > 0) ns.tprint(`WARNING [doGrowWeaken]: ${s} has ${slaveThreads} unused threads`);
  }

  if (weakenThreads > 0) ns.tprint(`WARNING [doGrowWeaken]: ${weakenThreads} Weaken Threads unaccounted`);
  if (growThreads > 0) ns.tprint(`WARNING [doGrowWeaken]: ${growThreads} Grow Threads unaccounted`);

  while (slaves.some( s => ns.ps(s).length > 0))
    await ns.sleep(20);
}

export async function main(ns: NS): Promise<void> {
  // if (ns.args.length > 0) {
  //   await doHackGrowWeaken(ns, 'foodnstuff');
  //   return;
  // }

  // find out how many threads we have available for HGW

  const servers = getAllServers(ns);
  const slaves = servers.filter(s => s !== 'home').filter(s => ns.getServerMaxRam(s) > 0 && ns.hasRootAccess(s));

  const totalThreads = slaves.reduce((count, slave) => count + Math.floor(ns.getServerMaxRam(slave) / HGW_RAM), 0);

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
      ns.formatNumber(calcGainPerMS(ns, s), 3, 1000, true).padStart(10),
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
    { header: '   Gain/ms', width: 11 },
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

  // Weaken always reduces security by 0.05 per thread

  // copy hgw scripts to slave machines
  for (const s of slaves)
    ns.scp(['hack.js', 'grow.js', 'weaken.js'], s);

  const target = 'foodnstuff';

  // fully weaken the target
  while (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)) {
    if (ns.ps(slaves[0]).length > 0) {
      await ns.sleep(200);
      continue;
    }

    const targetSec = Math.max(ns.getServerSecurityLevel(target) - weakenPerRound, ns.getServerMinSecurityLevel(target));
    ns.tprintf(`Weakening ${target} ${ns.getServerSecurityLevel(target).toFixed(2)} => ${targetSec} / ${ns.getServerMinSecurityLevel(target)} ${formatTime(ns.getWeakenTime(target))}`);
    allRun(ns, slaves, 'weaken.js', target, 0);
  }

  ns.tprintf(`${target} fully weakened`);

  while(ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target))
    await doGrowWeaken(ns, target);

  ns.tprintf(`${target} fully grown`);

  while (true) {
    await doHackWeakenGrowWeaken(ns, target);
  }
}
