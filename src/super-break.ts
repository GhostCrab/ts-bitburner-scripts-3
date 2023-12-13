import { NS } from "@ns";
import { getAllServers, isRootable } from "./util";

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
    if (isRootable(ns, s, portCrackCount)) {
      ns.tprintf(`Cracking ${s}`);
      crackAndNuke(ns, s);
    }
  }
}
