import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  const targetFavor = ns.formulas.reputation.calculateFavorToRep(150);
  const currentRep = 142;
  const currentFavor = ns.formulas.reputation.calculateFavorToRep(currentRep);
  const favorNeeded = targetFavor - currentFavor;
  ns.tprintf(`Total favor needed for 150 rep: ${ns.formatNumber(targetFavor, 0, 1000)}`);
  ns.tprintf(`Total favor accumulated: ${ns.formatNumber(currentFavor, 3, 1000)} (based on ${currentRep} rep)`);
  ns.tprintf(`Favor needed this round to get to 150 rep: ${ns.formatNumber(favorNeeded, 3, 1000)}`);
}
