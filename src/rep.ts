import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  const targetRep = ns.formulas.reputation.calculateFavorToRep(150);
  const currentRep = ns.singularity.getFactionRep('Daedalus') + ns.formulas.reputation.calculateFavorToRep(ns.singularity.getFactionFavor('Daedalus'));
  const repNeeded = targetRep - currentRep;
  ns.tprintf(`Total rep needed for 150 fav: ${ns.formatNumber(targetRep, 0, 1000)}`);
  ns.tprintf(`Total rep accumulated: ${ns.formatNumber(currentRep, 3, 1000)}`);
  ns.tprintf(`Rep needed this round to get to 150 rep: ${ns.formatNumber(repNeeded, 3, 1000)}`);
}
