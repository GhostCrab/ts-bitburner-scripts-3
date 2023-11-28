import { NS } from "@ns";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";


function getAllServers(ns: NS): string[] {
  let servers: Set<string> = new Set<string>();
  let queue: string[] = ['home'];

  while(true) {
    const host = queue.pop();
    if (host === undefined) break;

    servers.add(host);
    const connectedServers = ns.scan(host);
    queue.push(...connectedServers.filter(server => !servers.has(server)));
  }

  return Array.from(servers);
}

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

function isHackable(ns: NS, s: string): boolean {
  const hackReq = ns.getServerRequiredHackingLevel(s);
  const hackLv = ns.getHackingLevel();

  if (hackLv >= hackReq || ns.hasRootAccess(s)) return true;

  return false;
}

export async function main(ns: NS): Promise<void> {
  //showConnected(ns, '', 'home', '');

  ns.ui.clearTerminal();

  // for (const server of getAllServers(ns)) {
  //   ns.tprintf(`${server}`);
  // }

  // ns.tprintf(`${ns.ui.windowSize()}`)
  const sortedServers = getAllServers(ns).sort((a, b) => ns.getServerRequiredHackingLevel(a) - ns.getServerRequiredHackingLevel(b));
  const filteredServers = sortedServers.filter(s => ns.getServerMaxMoney(s) > 0);
  const hackableServerCount = filteredServers.filter(s => isHackable(ns, s)).length;
  const truncatedServers = filteredServers//.slice(0, hackableServerCount + 5);
  
  let data = truncatedServers.map(s => {
    const hackLevelStr = ns.getServerRequiredHackingLevel(s).toString();
    return [
      { color: serverHackedStatusColor(ns, s), text: s },
      hackLevelStr.padStart(5),
      ns.getServerBaseSecurityLevel(s).toString().padStart(9),
      ns.formatRam(ns.getServerMaxRam(s), 0).padStart(6),
      ns.formatNumber(ns.getServerMaxMoney(s),3, 1000, true).padStart(9)
    ]
  });

	const columns = [
		{ header: 'Servers', width: 19 },
		{ header: 'Level', width: 6, pad: 1 },
		{ header: 'Base Sec.', width: 10, pad: 1 },
		{ header: '   Ram', width: 7, pad: 1 },
		{ header: '    Money', width: 10 }
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}
