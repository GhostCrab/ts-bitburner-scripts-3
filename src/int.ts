import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
	ns.disableLog('ALL');

  const startingInt = ns.getPlayer().exp.intelligence;

	for (; ;) {
		for (let i = 0; i < 10000; i++) {
			ns.singularity.travelToCity('Chongqing');
			ns.singularity.travelToCity('New Tokyo');
			ns.singularity.travelToCity('Ishima');
		}
		await ns.sleep(0);

    if (ns.getServerMoneyAvailable('home') < 1000000) break;
	}

  const endingInt = ns.getPlayer().exp.intelligence;

  ns.tprintf(`Completed Travel - Gained ${endingInt - startingInt} Intelligence EXP`);
}