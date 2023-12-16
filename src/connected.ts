import { NS } from "@ns";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";
import { getAllServers, isRootable } from "util";

function showConnected(ns: NS, parent: string, host: string, pre: string): void {
  const connectedServers = ns.scan(host);

  ns.tprintf(`${pre}${host}`);

  for (const serverName of connectedServers) {
    if (serverName === parent) continue;

    showConnected(ns, host, serverName, `-${pre}`);
  }
}

function serverHackedStatusColor(ns: NS, s: string): string {
  if (ns.hasRootAccess(s)) return 'green';

  const hackReq = ns.getServerRequiredHackingLevel(s);
  const hackLv = ns.getHackingLevel();

  if (hackLv >= hackReq) return 'Gold1';

  return 'IndianRed';
}

export async function main(ns: NS): Promise<void> {
  //ns.ui.clearTerminal();
  showConnected(ns, '', 'home', '');

  // for (const server of getAllServers(ns)) {
  //   ns.tprintf(`${server}`);
  // }

  const portCracks = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
  const portCrackCount = portCracks.reduce((count, crack) => {
    if (ns.fileExists(crack, "home")) count++;
    return count;
  }, 0);

  // ns.tprintf(`${ns.ui.windowSize()}`)
  const sortedServers = getAllServers(ns).sort((a, b) => ns.getServerRequiredHackingLevel(a) - ns.getServerRequiredHackingLevel(b));
  const filteredServers = sortedServers//.filter(s => ns.getServerMaxMoney(s) > 0);
  const hackableServerCount = filteredServers.filter(s => isRootable(ns, s, portCrackCount)).length;
  const truncatedServers = filteredServers.slice(0, hackableServerCount + 5);
  
  const data = sortedServers.map(s => {
    return [
      { color: serverHackedStatusColor(ns, s), text: ` ${s}` },
      ns.getServerRequiredHackingLevel(s).toString().padStart(6),
      ns.getServerNumPortsRequired(s).toString().padStart(6),
      ns.getServerBaseSecurityLevel(s).toString().padStart(9),
      ns.formatRam(ns.getServerMaxRam(s), 0).padStart(7),
      ns.formatNumber(ns.getServerMoneyAvailable(s),3, 1000, true).padStart(10),
      ns.formatNumber(ns.getServerMaxMoney(s),3, 1000, true).padStart(10)
    ]
  });

	const columns = [
		{ header: ' Servers', width: 20 },
		{ header: ' Level', width: 7 },
    { header: ' Ports', width: 7 },
		{ header: ' Base Sec', width: 10 },
		{ header: '    Ram', width: 8 },
		{ header: '     Money', width: 11 }
    { header: ' Max Money', width: 11 }
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}
