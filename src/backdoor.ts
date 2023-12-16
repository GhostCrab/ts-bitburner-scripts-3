import { NS, CityName } from "@ns";
import { isRootable } from "./util";

function crackAndNuke(ns: NS, s: string): void {
  if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(s);
  if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(s);
  if (ns.fileExists("relaySMTP.exe", "home")) ns.relaysmtp(s);
  if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(s);
  if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(s);

  ns.nuke(s);
}

function getConnectedPaths(ns: NS, current = 'home', path: string[] = [], paths: Record<string, string[]> = {}) {
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
  const portCracks = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
  const portCrackCount = portCracks.reduce((count, crack) => {
    if (ns.fileExists(crack, "home")) count++;
    return count;
  }, 0);

  //for (const target of ['CSEC', 'avmnite-02h', 'I.I.I.I', 'run4theh111z', 'The-Cave', 'w0r1d_d43m0n', 'ecorp', 'fulcrumassets', 'fulcrumtech']) {
  for (const target of ['CSEC', 'avmnite-02h', 'I.I.I.I', 'run4theh111z', 'The-Cave', 'w0r1d_d43m0n']) {
    try {
      if (ns.getServer(target).backdoorInstalled) continue;

      if (ns.getHackingLevel() < ns.getServerRequiredHackingLevel(target)) continue;

      if (!ns.hasRootAccess(target) && isRootable(ns, target, portCrackCount)) {
        crackAndNuke(ns, target);
      }

      if (ns.hasRootAccess(target)) {
        for (const s of getConnectedPaths(ns)[target]) {
          ns.singularity.connect(s);
        }
        ns.tprintf(`Installing backdoor on ${target}`);
        await ns.singularity.installBackdoor();
      }
    } catch(e) {
      // do nothing
    }
  }

  if (ns.getServerMoneyAvailable('home') > 10500000) {
    const curCity = ns.getPlayer().city;
    const cities = ['Sector-12', 'Volhaven', 'Aevum', 'Ishima', 'Chongqing', 'New Tokyo'];
    for (const city of cities) {
      //ns.tprintf(`${city}`);
      ns.singularity.travelToCity(<CityName>city);
      ns.singularity.checkFactionInvitations();
    }

    ns.singularity.travelToCity(curCity);    
  }

  ns.singularity.connect('home');
}
