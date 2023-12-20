import { NS } from "@ns";
import { HSUpgradeType } from "lib/hacknet/hs-upgrade-type";
import { ExtendedNodeStats } from "lib/hacknet/extended-node-stats";

export function stFormat(ns: NS, ms: number, showms = false, showfull = false): string {
  let timeLeft = ms;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  timeLeft -= hours * (1000 * 60 * 60);
  const minutes = Math.floor(timeLeft / (1000 * 60));
  timeLeft -= minutes * (1000 * 60);
  const seconds = Math.floor(timeLeft / 1000);
  timeLeft -= seconds * 1000;
  const milliseconds = timeLeft;

  if (showms) {
      if (hours > 0 || showfull) return ns.sprintf("%02d:%02d:%02d.%03d", hours, minutes, seconds, milliseconds);
      if (minutes > 0) return ns.sprintf("%02d:%02d.%03d", minutes, seconds, milliseconds);
      return ns.sprintf("%02d.%03d", seconds, milliseconds);
  } else {
      if (hours > 0 || showfull) return ns.sprintf("%02d:%02d:%02d", hours, minutes, seconds);
      if (minutes > 0) return ns.sprintf("%02d:%02d", minutes, seconds);
      return ns.sprintf("%02d", seconds);
  }
}

export interface HSUpgradeInterface {
    id: number;
    type: HSUpgradeType;
    upgradeCost: number;
    upgradeProductionTotal: number;
    cacheIncrease: number;
    cacheCostPerHash: number;
    upgradeProductionIncrease: number;
    upgradeCashProduction: number;
    upgradePayoffTime: number;
    upgradeValue: number;

	toString(ns: NS, totalProduction: number): string;
    buy(ns: NS): boolean;
}

export class HSUpgrade implements HSUpgradeInterface {
    id: number;
    type: HSUpgradeType;
    upgradeCost = 0;
    upgradeProductionTotal = 0;
    cacheIncrease = 0;
    cacheCostPerHash = 0;
    upgradeProductionIncrease = 0;
    upgradeCashProduction = 0;
    upgradePayoffTime = 0;
    upgradeValue = 0;

    constructor(ns: NS, id: number, type: HSUpgradeType, _stats: ExtendedNodeStats) {
        const hashBuyCost = ns.hacknet.hashCost("Sell for Money");
        const prodMult = ns.getPlayer().mults.hacknet_node_money;
        const coreCostMult = ns.getPlayer().mults.hacknet_node_core_cost;
        const levelCostMult = ns.getPlayer().mults.hacknet_node_level_cost;
        const ramCostMult = ns.getPlayer().mults.hacknet_node_ram_cost;

        let stats;
        if (_stats) stats = _stats;
        else {
            stats = new ExtendedNodeStats(ns.hacknet.getNodeStats(id));
            stats.ramUsed = 0;
            stats.updateProduction(ns);
        }

        this.id = id;
        this.type = type;

        switch (this.type) {
            case HSUpgradeType.LEVEL: {
                this.upgradeCost = ns.formulas.hacknetServers.levelUpgradeCost(stats.level, 1, levelCostMult);
                this.upgradeProductionTotal = ns.formulas.hacknetServers.hashGainRate(
                    stats.level + 1,
                    0,
                    stats.ram,
                    stats.cores,
                    prodMult
                );
                break;
            }
            case HSUpgradeType.RAM: {
                this.upgradeCost = ns.formulas.hacknetServers.ramUpgradeCost(stats.ram, 1, ramCostMult);
                this.upgradeProductionTotal = ns.formulas.hacknetServers.hashGainRate(
                    stats.level,
                    0,
                    stats.ram * 2,
                    stats.cores,
                    prodMult
                );
                break;
            }
            case HSUpgradeType.CORES: {
                this.upgradeCost = ns.formulas.hacknetServers.coreUpgradeCost(stats.cores, 1, coreCostMult);
                this.upgradeProductionTotal = ns.formulas.hacknetServers.hashGainRate(
                    stats.level,
                    0,
                    stats.ram,
                    stats.cores + 1,
                    prodMult
                );
                break;
            }
            case HSUpgradeType.CACHE: {
                this.upgradeCost = ns.formulas.hacknetServers.cacheUpgradeCost(stats.cache);
                this.upgradeProductionTotal = stats.production;
                this.cacheIncrease = stats.cache;
                this.cacheCostPerHash = this.upgradeCost / this.cacheIncrease;
                break;
            }
        }

        this.upgradeProductionIncrease = this.upgradeProductionTotal - stats.production;
        this.upgradeCashProduction = (this.upgradeProductionTotal / hashBuyCost) * 1000000;
        this.upgradePayoffTime = (this.upgradeCost / this.upgradeCashProduction) * 1000;
        this.upgradeValue = this.upgradeProductionIncrease / this.upgradeCost;
    }

    toString(ns: NS, totalProduction: number): string {
        const hashBuyCost = ns.hacknet.hashCost("Sell for Money");
        const totalUpgradeCashProduction = ((totalProduction + this.upgradeProductionIncrease) / hashBuyCost) * 1000000;
        const totalUpgradePayoffTime = (this.upgradeCost / totalUpgradeCashProduction) * 1000;

        return ns.sprintf(
            "%02d => %6s %9s +%s h/s %6s %5.2f h/s/$bn",
            this.id,
            this.type,
            ns.formatNumber(this.upgradeCost, 1, 1000), // cost
            ns.formatNumber(this.upgradeProductionIncrease, 1, 1000), // hash increase
            stFormat(ns, totalUpgradePayoffTime), // upgrade payoff time
            this.upgradeValue * 1000000000
        );
    }

    buy(ns: NS): boolean {
        const hashBuyCost = ns.hacknet.hashCost("Sell for Money");
        const numHashBuys = Math.floor(ns.hacknet.numHashes() / hashBuyCost);
        const effectiveMoneyAvailable = ns.getPlayer().money + numHashBuys * 1000000;

        if (effectiveMoneyAvailable < this.upgradeCost) {
            ns.print("WARNING: Attempted to buy an upgrade you can't afford");
            return false;
        }

        while (ns.getPlayer().money < this.upgradeCost) {
            ns.hacknet.spendHashes("Sell for Money");
        }

        switch (this.type) {
            case HSUpgradeType.LEVEL: {
                return ns.hacknet.upgradeLevel(this.id, 1);
            }
            case HSUpgradeType.RAM: {
                return ns.hacknet.upgradeRam(this.id, 1);
            }
            case HSUpgradeType.CORES: {
                return ns.hacknet.upgradeCore(this.id, 1);
            }
            case HSUpgradeType.CACHE: {
                return ns.hacknet.upgradeCache(this.id, 1);
            }
            case HSUpgradeType.SERVER: {
                return ns.hacknet.purchaseNode() !== -1;
            }
        }
    }
}