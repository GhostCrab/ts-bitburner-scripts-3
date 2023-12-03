import { Multipliers, NS } from "@ns";
import { ColorPrint, DefaultStyle, PrintTable } from "./tables";

const ALL_FACTIONS = [
  "Illuminati",
  "Daedalus",
  "The Covenant",
  "ECorp",
  "MegaCorp",
  "Bachman & Associates",
  "Blade Industries",
  "NWO",
  "Clarke Incorporated",
  "OmniTek Incorporated",
  "Four Sigma",
  "KuaiGong International",
  "Fulcrum Secret Technologies",
  "BitRunners",
  "The Black Hand",
  "NiteSec",
  "Aevum",
  "Chongqing",
  "Ishima",
  "New Tokyo",
  "Sector-12",
  "Volhaven",
  "Speakers for the Dead",
  "The Dark Army",
  "The Syndicate",
  "Silhouette",
  "Tetrads",
  "Slum Snakes",
  "Netburners",
  "Tian Di Hui",
  "CyberSec",
  "Bladeburners",
  "Church of the Machine God",
];

interface IAug {
  name: string;
  faction: string;
  installed: boolean;
  purchased: boolean;
  price: number;
  requiredRep: number;
  purchasable: boolean;
  affordable: boolean;
  preqreqs: string[];
  multipliers: Multipliers;
  isHack: boolean;

  tableData(ns: NS): { color: string; text: string; }[];
  shortTableData(ns: NS): { color: string; text: string; }[];
  canBuy(): boolean;
}

class Aug implements IAug{
  name: string;
  faction: string;
  installed: boolean;
  purchased: boolean;
  price: number;
  requiredRep: number;
  purchasable: boolean;
  affordable: boolean;
  preqreqs: string[];
  multipliers: Multipliers;
  isHack: boolean;

  constructor(ns: NS, name: string, faction: string) {
    this.name = name;
    this.faction = faction;
    this.installed = ns.singularity.getOwnedAugmentations(false).includes(name);
    this.purchased = ns.singularity.getOwnedAugmentations(true).includes(name);
    this.price = ns.singularity.getAugmentationBasePrice(name);
    this.requiredRep = ns.singularity.getAugmentationRepReq(name);
    try {
      this.purchasable = this.requiredRep <= ns.singularity.getFactionRep(ns.getPlayer().factions.filter(f => f === faction)[0]);
    } catch (e) {
      this.purchasable = false;
    }
    this.affordable = this.price <= ns.getServerMoneyAvailable('home');
    this.preqreqs = ns.singularity.getAugmentationPrereq(name);
    this.multipliers = ns.singularity.getAugmentationStats(name);

    // remove already purchased prereqs and sort them in descending price order
    this.preqreqs.filter(a => !ns.singularity.getOwnedAugmentations(true).includes(a)).sort((a, b) => ns.singularity.getAugmentationBasePrice(b) - ns.singularity.getAugmentationBasePrice(a));

    this.isHack = (
      this.multipliers.hacking > 1 ||
      this.multipliers.hacking_exp > 1 ||
      this.multipliers.hacking_chance > 1 ||
      this.multipliers.hacking_speed > 1 ||
      this.multipliers.hacking_money > 1 ||
      this.multipliers.hacking_grow > 1
    );
  }

  canBuy(): boolean {
    if (this.purchased) return false;
    return (this.purchasable && this.affordable);
  }

  augColor() {
    if (this.purchased) return 'green';
    if (this.purchasable && this.affordable) return 'Gold1';
    return 'white';
  }

  tableData(ns: NS): { color: string; text: string; }[] {
    return [
      { color: this.augColor(), text: ` ${this.name}` },
      { color: this.augColor(), text: ` ${this.faction}` },
      { color: this.augColor(), text: `${this.installed?'YES':'NO'}`.padStart(4) },
      { color: this.augColor(), text: `${this.purchased?'YES':'NO'}`.padStart(4) },
      { color: this.augColor(), text: ns.formatNumber(this.price, 1, 1000, true).padStart(8) },
      { color: this.augColor(), text: ns.formatNumber(this.requiredRep, 3, 1000, true).padStart(10) },
      { color: this.augColor(), text: `${this.purchasable?'YES':'NO'}`.padStart(4) },
      { color: this.augColor(), text: `${this.affordable?'YES':'NO'}`.padStart(4) },
      { color: this.augColor(), text: `${this.preqreqs.length}`.padStart(4) }
    ];
  }

  public static tableCols() {
    return [
      { header: ' Augmentations', width: 56 },
      { header: ' Faction', width: 29 },
      { header: ' INS', width: 5 },
      { header: ' HAS', width: 5 },
      { header: '   Price', width: 9 },
      { header: '       Rep', width: 11 },
      { header: ' PUR', width: 5 },
      { header: ' AFF', width: 5 },
      { header: ' PRE', width: 5 },
    ];
  }

  shortTableData(ns: NS): { color: string; text: string; }[] {
    return [
      { color: this.augColor(), text: ` ${this.name}` },
      { color: this.augColor(), text: ` ${this.faction}` },
      { color: this.augColor(), text: ns.formatNumber(this.price, 1, 1000, true).padStart(8) },
      { color: this.augColor(), text: ns.formatNumber(this.requiredRep, 3, 1000, true).padStart(10) },
      { color: this.augColor(), text: `${this.preqreqs.length}`.padStart(4) }
    ];
  }

  public static shortTableCols() {
    return [
      { header: ' Augmentations', width: 56 },
      { header: ' Faction', width: 29 },
      { header: '   Price', width: 9 },
      { header: '       Rep', width: 11 },
      { header: ' PRE', width: 5 },
    ];
  }
}


export async function main(ns: NS): Promise<void> {
  const player = ns.getPlayer();
  // const lvl11SrcFileCheck = ns.singularity.getOwnedSourceFiles().filter(s => s.n === 11);
  // const lvl11SrcFileLevel = lvl11SrcFileCheck.length > 0 ? lvl11SrcFileCheck[0].lvl : 0;
  // const augPriceMultiplier = 1.9 * [1, 0.96, 0.94, 0.93][lvl11SrcFileLevel];

  const augPriceMultiplier = 1.9;
  const nfgPriceMultiplier = 1.14;
  let augs: IAug[] = [];
  for (const faction of ALL_FACTIONS.sort((a, b) => ns.singularity.getFactionRep(b) - ns.singularity.getFactionRep(a))) {
    const factionAugs = ns.singularity.getAugmentationsFromFaction(faction);
    for (const aug of factionAugs) {
      //if (!augs.some(a => a.name === aug))
        augs.push(new Aug(ns, aug, faction));
    }
  }

  //augs = augs.filter(a => a.canBuy()).sort((a, b) => b.price - a.price);
  augs = augs.sort((a, b) => b.price - a.price);

  augs = augs.filter(a => a.isHack);
  augs = augs.filter(a => a.name !== "NeuroFlux Governor");

  // shift prereqs higher in the list if they're in the list. If they're not in the list, remove the aug with prereqs
  for (let i = 0; i < augs.length; ++i) {
    const aug = augs[i];
    if (aug.preqreqs.length > 0) {
      let foundPrereq = false;
      let movedPrereq = false;
      for (let j = 0; j < aug.preqreqs.length; ++j) {
        const prereq = aug.preqreqs[j];
        const prereqIndex = augs.findIndex(a => a.name === prereq);

        if (prereqIndex === -1) break;
        foundPrereq = true;

        if (prereqIndex < i) continue;

        augs.splice(i, 0, augs.splice(prereqIndex, 1)[0]);
        movedPrereq = true;
        break;
      }

      if(!foundPrereq) {
        augs.splice(i, 1);
        --i;
        continue;
      }

      if(movedPrereq) {
        --i;
        continue;
      }
    }
  }

  PrintTable(ns, augs.map(a => a.shortTableData(ns)), Aug.shortTableCols(), DefaultStyle(), ColorPrint);
  
  const mult = augs.find(a => a.name === "HemoRecirculator")?.multipliers;
  if (mult) {
    ns.tprintf(`${JSON.stringify(mult)}`);
  }

  // buy in order from most to least expensive, buying prereqs first
  let cash = ns.getServerMoneyAvailable('home');
  while (augs.length > 0) {
    const aug = augs.shift();
    
    if (aug)
      ns.singularity.purchaseAugmentation(aug.faction, aug.name);
  }

  while (ns.singularity.purchaseAugmentation(ALL_FACTIONS.sort((a, b) => ns.singularity.getFactionRep(b) - ns.singularity.getFactionRep(a))[0], "NeuroFlux Governor"));
}
