import { NS } from "@ns";
import { ColorPrint, DefaultStyle, PrintTable } from "./tables";
import { ALL_FACTIONS } from "./util";

function getTotalFactioOnRep(ns: NS, faction: string): number {
  return ns.singularity.getFactionRep(faction) + ns.formulas.reputation.calculateFavorToRep(ns.singularity.getFactionFavor(faction));
}

function getColor(rep: number, target: number) {
  if (rep >= target) return 'green';
  if (rep > 0) return 'Gold1';
  return 'white';
}

export async function main(ns: NS): Promise<void> {
  // const target = 'ECorp';
  const targetRep = ns.formulas.reputation.calculateFavorToRep(150);
  // const currentRep = ns.singularity.getFactionRep(target) + ns.formulas.reputation.calculateFavorToRep(ns.singularity.getFactionFavor(target));
  // const repNeeded = targetRep - currentRep;
  // ns.tprintf(`Total rep needed for 150 fav: ${ns.formatNumber(targetRep, 0, 1000)}`);
  // ns.tprintf(`Total rep accumulated: ${ns.formatNumber(currentRep, 3, 1000)}`);
  // ns.tprintf(`Rep needed this round to get to 150 rep: ${ns.formatNumber(repNeeded, 3, 1000)}`);



  const data = ALL_FACTIONS.sort((a, b) => getTotalFactionRep(ns, b) - getTotalFactionRep(ns, a)).map((f) => {
    const totalRep = getTotalFactionRep(ns, f);
    const repNeeded = Math.max(targetRep - totalRep, 0);
    return [
      { color: getColor(totalRep, targetRep), text: ` ${f}` },
      { color: getColor(totalRep, targetRep), text: ns.formatNumber(totalRep, 1, 1000, true).padStart(8) },
      { color: getColor(totalRep, targetRep), text: ns.formatNumber(repNeeded, 1, 1000, true).padStart(8) }
    ];
  });

  const columns = [
		{ header: ' Faction', width: 30 },
		{ header: '     Rep', width: 9 },
    { header: '  Needed', width: 9 },
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}
