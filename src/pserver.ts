import { NS } from "@ns";
import { PrintTable, ColorPrint, DefaultStyle } from "tables";

export async function main(ns: NS): Promise<void> {
  const ramsizes: number[] = [];
  for (let i = 0; i < 21; i++) {
    ramsizes.push(Math.pow(2, i))
  }
  for (const sz of ramsizes) {
    ns.tprintf(`${ns.formatRam(sz)} ${ns.formatNumber(ns.getPurchasedServerCost(sz), 3, 1000, true)}`);
  }

  const data = ramsizes.map(sz => {
    return [
      ns.formatRam(sz).padStart(9),
      ns.formatNumber(ns.getPurchasedServerCost(sz), 3, 1000, true).padStart(11),
      ns.formatNumber(ns.getPurchasedServerCost(sz)/sz, 3, 1000, true).padStart(11),
    ]
  });

	const columns = [
		{ header: '      RAM', width: 10 },
		{ header: '       Cost', width: 12 },
    { header: '     Cost/B', width: 12 },
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

  // ns.purchaseServer('PS-0', Math.pow(2, 13));
}
