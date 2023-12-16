import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  ns.killall();
  await ns.sleep(30);
  ns.singularity.softReset('hud.js');
}
