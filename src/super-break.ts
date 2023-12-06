import { NS } from "@ns";
import { getAllServers } from "./util";

function isHackable(ns: NS, s: string, pCount: number): boolean {
  if (ns.hasRootAccess(s)) return false;

  const hackReq = ns.getServerRequiredHackingLevel(s);
  const hackLv = ns.getHackingLevel();
  const portsRequired = ns.getServerNumPortsRequired(s);

  if (hackLv >= hackReq && portsRequired <= pCount) return true;

  return false;
}

function crackAndNuke(ns: NS, s: string): void {
  if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(s);
  if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(s);
  if (ns.fileExists("relaySMTP.exe", "home")) ns.relaysmtp(s);
  if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(s);
  if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(s);

  ns.nuke(s);
}

export async function main(ns: NS): Promise<void> {
  const servers = getAllServers(ns);

  ns.singularity.purchaseTor();

  const portCracks = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
  const portCrackCount = portCracks.reduce((count, crack) => {
    ns.singularity.purchaseProgram(crack);
    if (ns.fileExists(crack, "home")) count++;
    return count;
  }, 0);

  for (const s of servers) {
    if (isHackable(ns, s, portCrackCount)) {
      ns.tprintf(`Cracking ${s}`);
      crackAndNuke(ns, s);
    }
  }
}
