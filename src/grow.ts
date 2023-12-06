import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  ns.disableLog('ALL');
  let target = "n00dles";
  if (ns.args.length > 0 && typeof ns.args[0] === "string")
    target = ns.args[0];

  let ms = 0;
  if (ns.args.length > 1 && typeof ns.args[1] === "number") ms = ns.args[1];

  await ns.grow(target, { additionalMsec: ms });
}
