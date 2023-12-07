import { NS } from "@ns";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";

export async function main(ns: NS): Promise<void> {
  const ramsizes: number[] = [];
  for (let i = 0; i < 21; i++) {
    ramsizes.push(Math.pow(2, i))
  }

  let maxSize = 0;
  const data = ramsizes.map(sz => {
    if (ns.getPurchasedServerCost(sz) <= ns.getServerMoneyAvailable('home') && sz > maxSize)
      maxSize = sz;

    return [
      { color: ns.getPurchasedServerCost(sz) <= ns.getServerMoneyAvailable('home') ? 'green' : 'white', text: ns.formatRam(sz).padStart(9) },
      { color: ns.getPurchasedServerCost(sz) <= ns.getServerMoneyAvailable('home') ? 'green' : 'white', text: ns.formatNumber(ns.getPurchasedServerCost(sz), 3, 1000, true).padStart(11) },
      { color: ns.getPurchasedServerCost(sz) <= ns.getServerMoneyAvailable('home') ? 'green' : 'white', text: Math.log2(sz).toString() },
    ]
  });

	const columns = [
		{ header: '      RAM', width: 10 },
		{ header: '       Cost', width: 12 },
    { header: '       pow', width: 12 }
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

  if (ns.args.length > 1) {
    const purchasedServers = ns.getPurchasedServers().sort((a, b) => {
      const aval = Number(a.split('-')[1]);
      const bval = Number(b.split('-')[1]);
      return aval - bval;
    });

    let newServerNumber = 1;
    if (purchasedServers.length > 0)
      newServerNumber = Number(purchasedServers[purchasedServers.length-1].split('-')[1])+1;

    ns.tprintf(`Purchasing Server PS-${newServerNumber} with ${ns.formatRam(maxSize)} RAM`);
    ns.purchaseServer(`PS-${newServerNumber.toString().padStart(2, '0')}`, maxSize);
  } else if (ns.args.length > 0) {
    while (ns.getPurchasedServerCost(maxSize) <= ns.getServerMoneyAvailable('home') && ns.getPurchasedServers().length < 25 && maxSize === Math.pow(2, 20)) {
      const purchasedServers = ns.getPurchasedServers().sort((a, b) => {
        const aval = Number(a.split('-')[1]);
        const bval = Number(b.split('-')[1]);
        return aval - bval;
      });

      let newServerNumber = 1;
      if (purchasedServers.length > 0)
        newServerNumber = Number(purchasedServers[purchasedServers.length-1].split('-')[1])+1;

      ns.tprintf(`Purchasing Server PS-${newServerNumber} with ${ns.formatRam(maxSize)} RAM`);
      ns.purchaseServer(`PS-${newServerNumber.toString().padStart(2, '0')}`, maxSize);
    }
  }
}