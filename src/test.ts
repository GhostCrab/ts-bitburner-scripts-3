import { NS } from "@ns";

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

function getConnectedPaths(ns: NS, current: string = 'home', path: string[] = [], paths: Record<string, string[]> = {}) {
  paths[current] = [...path, current];
  
  let parent = '';
  if (path.length > 0) parent = path[path.length - 1];
  
  for (const connected of ns.scan(current)) {
    if (connected === parent) continue;
    getConnectedPaths(ns, connected, paths[current], paths);
  }

  return paths;
}

export async function main(ns: NS): Promise<void> {
  // ns.tprintf(`${getConnectedPaths(ns)['The-Cave']}`);
  const paths = getConnectedPaths(ns);

  const portCracks = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
  const portCrackCount = portCracks.reduce((count, crack) => {
    if (ns.fileExists(crack, "home")) count++;
    return count;
  }, 0);

  for (const target of ['CSEC', 'avmnite-02h', 'I.I.I.I', 'run4theh111z', 'The-Cave', 'w0r1d_d43m0n', 'ecorp']) {
    try {
      if (ns.getServer(target).backdoorInstalled) continue;

      ns.tprintf(`Installing backdoor on ${target}`);

      if (!ns.hasRootAccess(target) && isHackable(ns, target, portCrackCount)) {
        crackAndNuke(ns, target);
      }

      if (ns.hasRootAccess(target)) {
        for (const s of getConnectedPaths(ns)[target]) {
          ns.singularity.connect(s);
        }
        await ns.singularity.installBackdoor();
      }
    } catch(e) {
      // do nothing
    }
  }

  ns.singularity.connect('home');
}
