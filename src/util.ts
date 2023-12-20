import { NS } from "@ns";

export const HGW_RAM = 1.75;
export const GROW_SEC = 0.004; // ns.growthAnalyzeSecurity(1, 'omega-net');
export const WEAK_SEC = 0.05; // ns.weakenAnalyze(1);
export const HOME_RESERVE = 512;

export const MS_BETWEEN_OPERATIONS = 10;
export const HACK_PERCENT = 0.1;
export const HACK_PERCENT_MAX = 0.8;
export const MAX_BATCHES_PER_CYCLE = 2000;
export const GROW_THREAD_MULT = 1.4;

export function getAllServers(ns: NS): string[] {
  const servers: Set<string> = new Set<string>();
  const queue: string[] = ['home'];

  // eslint-disable-next-line no-constant-condition
  while(true) {
    const host = queue.pop();
    if (host === undefined) break;

    servers.add(host);
    const connectedServers = ns.scan(host);
    queue.push(...connectedServers.filter(server => !servers.has(server)));
  }

  return Array.from(servers);
}

// returns growth multiplier when executing grow with the given number of threads
export function invGrowthAnalyze(ns: NS, target: string, threads: number, max?: number, min?: number): number {
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

export function formatTime(time: number, showms = false): string {
  const ms = time % 1000;
  const seconds = Math.floor(time / 1000) % 60;
  const minutes = Math.floor(time / 1000 / 60) % 60;
  const hours = Math.floor(time / 1000 / 60 / 60);

  if (showms)
    return `${(minutes > 0 ? minutes.toFixed(0) + ':' : '')}${seconds.toFixed(0).padStart(2, '0')}.${ms.toFixed(0).padStart(3, '0')}`;
  
  return `${(hours > 0 ? hours.toFixed(0) + ':' : '')}${((minutes > 0 || hours > 0) ? minutes.toFixed(0).padStart(2, '0') + ':' : '')}${seconds.toFixed(0).padStart(2, '0')}`;
}

export function getSlaves(ns: NS) {
  const servers = getAllServers(ns);
  return servers.filter(s => ns.getServerMaxRam(s) > 0 && ns.hasRootAccess(s) && !s.startsWith('hacknet')).sort((a, b) => getSlaveThreads(ns, b) - getSlaveThreads(ns, a));
  //return servers.filter(s => ns.getServerMaxRam(s) > 0 && ns.hasRootAccess(s)).sort((a, b) => getSlaveThreads(ns, b) - getSlaveThreads(ns, a));
}

export function getTotalThreads(ns: NS, slaves: string[], homeReserve = HOME_RESERVE) {
  if (homeReserve > ns.getServerMaxRam('home')) homeReserve = ns.getServerMaxRam('home');
  let totalThreads = slaves.reduce((count, slave) => count + Math.floor(ns.getServerMaxRam(slave) / HGW_RAM), 0);

  if(slaves.includes('home')) {
    totalThreads -= Math.ceil(homeReserve / HGW_RAM);
  }

  return totalThreads;
}

export function getSlaveThreads(ns: NS, slave: string, homeReserve = HOME_RESERVE) {
  if (homeReserve > ns.getServerMaxRam('home')) homeReserve = ns.getServerMaxRam('home');
  let slaveThreads = Math.floor(ns.getServerMaxRam(slave) / HGW_RAM);
  if (slave === 'home') {
    slaveThreads -= Math.ceil(homeReserve / HGW_RAM)
    slaveThreads = Math.max(0, slaveThreads);
  }

  return slaveThreads;
}

export async function doHackWeakenGrowWeaken(ns: NS, target: string): Promise<void> {
  const slaves = getSlaves(ns);
  const totalThreads = getTotalThreads(ns, slaves);

  const weakTime = Math.ceil(ns.getWeakenTime(target));
  const growTime = Math.ceil(ns.getGrowTime(target));
  const hackTime = Math.ceil(ns.getHackTime(target));

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

    const hackWeakenThreads = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target) / WEAK_SEC);
    const gwT = Math.ceil(growThreads / (WEAK_SEC / GROW_SEC));
    const totalHWGWThreads = hackThreads+hackWeakenThreads+growThreads+gwT;
    if (totalHWGWThreads > totalThreads) break;

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

  let hackWeakenThreads = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target) / WEAK_SEC);
  let growWeakenThreads = Math.ceil(growThreads / (WEAK_SEC / GROW_SEC));
  const totalHWGWThreads = hackThreads+hackWeakenThreads+growThreads+growWeakenThreads;

  const curStr = ns.formatNumber(current, 3, 1000, true);
  const futStr = ns.formatNumber(future, 3, 1000, true);
  const resStr = ns.formatNumber(future*growMult, 3, 1000, true);
  const gainStr = ns.formatNumber(gain, 3, 1000, true);

  // hack finish first, then hw, then grow, then gw
  const hackMSBuf = weakTime - hackTime - 200;
  const hackWeakMSBuf = 0;
  const growMSBuf = (weakTime - growTime) + 200;
  const growWeakMSBuf = 400;

  ns.tprintf(`current:${curStr}|future:${futStr}|growMult:${growMult}|result:${resStr}|gain:${gainStr}|tot:${totalHWGWThreads}|${formatTime(weakTime+growWeakMSBuf)}`);
  
  for (const s of slaves) {
    let slaveThreads = getSlaveThreads(ns, s);

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
  }

  await waitForHGWScripts(ns, slaves);
}

export async function doGrowWeaken(ns: NS, target: string): Promise<void> {
  const slaves = getSlaves(ns);
  const totalThreads = getTotalThreads(ns, slaves);

  const weakTime = Math.ceil(ns.getWeakenTime(target));
  const growTime = Math.ceil(ns.getGrowTime(target));
  const growMSBuf = weakTime - growTime;

  // run 1 weaken thread for every 12.5 grow threads;
  let weakenThreads = Math.ceil(totalThreads / (WEAK_SEC / GROW_SEC));
  let growThreads = totalThreads - weakenThreads;

  const availableMoney = ns.getServerMoneyAvailable(target);
  const maxMoney = ns.getServerMaxMoney(target);
  const growResult = invGrowthAnalyze(ns, target, growThreads) * availableMoney;

  ns.tprintf(`Growing ${target} sec:${ns.getServerSecurityLevel(target)}|wt:${weakenThreads}|gt:${growThreads} ${ns.formatNumber(availableMoney, 3, 1000, true)} => ${ns.formatNumber(growResult, 3, 1000, true)} / ${ns.formatNumber(maxMoney, 3, 1000, true)} ${formatTime(weakTime+200)}`);

  for (const s of slaves) {
    let slaveThreads = getSlaveThreads(ns, s);

    const slaveWeakenThreads = Math.min(slaveThreads, weakenThreads);
    slaveThreads -= slaveWeakenThreads;
    weakenThreads -= slaveWeakenThreads;
    const slaveGrowThreads = Math.min(slaveThreads, growThreads);
    slaveThreads -= slaveGrowThreads;
    growThreads -= slaveGrowThreads;

    if (slaveWeakenThreads > 0) ns.exec('weaken.js', s, slaveWeakenThreads, target, 200);
    if (slaveGrowThreads > 0) ns.exec('grow.js', s, slaveGrowThreads, target, growMSBuf);
  }

  if (weakenThreads > 0) ns.tprint(`WARNING [doGrowWeaken]: ${weakenThreads} Weaken Threads unaccounted`);
  if (growThreads > 0) ns.tprint(`WARNING [doGrowWeaken]: ${growThreads} Grow Threads unaccounted`);

  await waitForHGWScripts(ns, slaves);
}

export async function doWeaken(ns: NS, target: string): Promise<void> {
  const slaves = getSlaves(ns);
  const totalThreads = getTotalThreads(ns, slaves);
  const weakenPerRound = totalThreads * 0.05;

  const weakTime = Math.ceil(ns.getWeakenTime(target));

  const currentSec = ns.getServerSecurityLevel(target);
  const targetSec = Math.max(currentSec - weakenPerRound, ns.getServerMinSecurityLevel(target));
  ns.tprintf(`Weakening ${target} ${currentSec.toFixed(2)} => ${targetSec} / ${ns.getServerMinSecurityLevel(target)} ${formatTime(weakTime+200)}`);

  let weakenThreads = Math.min(Math.ceil((currentSec - targetSec) / WEAK_SEC), totalThreads);

  for (const s of slaves) {
    let slaveThreads = getSlaveThreads(ns, s);

    const slaveWeakenThreads = Math.min(slaveThreads, weakenThreads);
    slaveThreads -= slaveWeakenThreads;
    weakenThreads -= slaveWeakenThreads;

    if (slaveWeakenThreads > 0) ns.exec('weaken.js', s, slaveWeakenThreads, target, 200);
  }

  await waitForHGWScripts(ns, slaves);
}

export async function waitForHGWScripts(ns: NS, slaves: string[]): Promise<void> {
  while (slaves.some(s => ns.ps(s).some(script => script.filename === 'hack.js' || script.filename === 'grow.js' || script.filename === 'weaken.js')))
    await ns.sleep(20);
}

export const ALL_FACTIONS = [
  "Illuminati",
  "Daedalus",
  "The Covenant",
  "ECorp",
  "MegaCorp",
  "Bachman & Associates",
  "Blade Industries",
  "NWO",
  "Clarke Incorporated",
  "OmniTek Incorporated",
  "Four Sigma",
  "KuaiGong International",
  "Fulcrum Secret Technologies",
  "BitRunners",
  "The Black Hand",
  "NiteSec",
  "Aevum",
  "Chongqing",
  "Ishima",
  "New Tokyo",
  "Sector-12",
  "Volhaven",
  "Speakers for the Dead",
  "The Dark Army",
  "The Syndicate",
  "Silhouette",
  "Tetrads",
  "Slum Snakes",
  "Netburners",
  "Tian Di Hui",
  "CyberSec",
  "Bladeburners",
  "Church of the Machine God",
  "Shadows of Anarchy",
];

export function isRootable(ns: NS, s: string, pCount: number): boolean {
  if (ns.hasRootAccess(s)) return false;

  if (ns.getServerNumPortsRequired(s) <= pCount) return true;

  return false;
}

export function isHackable(ns: NS, s: string, pCount: number): boolean {
  if (ns.hasRootAccess(s)) return false;

  const hackReq = ns.getServerRequiredHackingLevel(s);
  const hackLv = ns.getHackingLevel();
  const portsRequired = ns.getServerNumPortsRequired(s);

  if (hackLv >= hackReq && portsRequired <= pCount) return true;

  return false;
}