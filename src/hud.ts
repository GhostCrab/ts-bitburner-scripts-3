import { NS } from "@ns";
import { ColorPrint } from "./tables";
import { formatTime } from "./util";

export interface HackStats {
  target: string;
  begin: number;
  start: number;
  end: number;
  gainRate: number;
}

const doc: Document = eval('document');
const hook0 = doc.getElementById('overview-extra-hook-0');
const hook1 = doc.getElementById('overview-extra-hook-1');
const hook2 = doc.getElementById('overview-extra-hook-2');
const hookRootEl = hook0?.parentElement?.parentElement;
const overviewEl = hookRootEl?.parentElement;
const hpRootEl = <HTMLElement>overviewEl?.children[0];
const hackRootEl = <HTMLElement>overviewEl?.children[2];
const hackProgressEl = <HTMLElement>overviewEl?.children[3];
const nextSibling = hookRootEl?.nextSibling;

function addEl(el: HTMLElement) {
  if (nextSibling) {
    hookRootEl?.parentNode?.insertBefore(el, nextSibling);
  }
  else {
    hookRootEl?.parentNode?.appendChild(el);
  }
}

class ProgressElement {
  private rootEl: HTMLElement;
  private subEl1: HTMLElement;
  private subEl2: HTMLElement;

  constructor() {
    this.rootEl = <HTMLElement>hackProgressEl?.cloneNode(true);
    this.subEl1 = <HTMLElement>this.rootEl?.children[0]?.children[0];
    this.subEl2 = <HTMLElement>this.rootEl?.children[0]?.children[0]?.children[0];

    if (!this.rootEl || !this.subEl1 || !this.subEl2) throw "ProgressElement init failed";

    // this.subEl1.setAttribute("aria-valuenow", "100");
    // this.subEl2.setAttribute("style", "transform: translateX(-0%);");

    this.rootEl.classList.add('HUD_el');
    this.subEl1.classList.add('HUD_el');
    this.subEl2.classList.add('HUD_el');

    this.subEl1.style.margin = '4px 0 0 0';
  
    addEl(this.rootEl);
  }

  update(current: number, max = 100, min = 0) {
    const wholeValue = Math.floor(Math.min(Math.max(((current - min) / (max - min)) * 100, 0), 100));
    const transform = 100 - wholeValue;

    this.subEl1.setAttribute("aria-valuenow", `${wholeValue}`);
    this.subEl2.style.transform = `translateX(${-transform.toFixed(3)}%)`;
  }

  color(str1: string) {
    this.subEl2.style.backgroundColor = str1;
  }

  reset() {
    this.subEl1.setAttribute("aria-valuenow", "100");
    this.subEl2.style.transform = "transform: translateX(-0.000%)";
  }
}

class SingleElement {
  private rootEl: HTMLElement;
  private subEl1: HTMLElement;

  constructor() {
    this.rootEl = <HTMLElement>hpRootEl.cloneNode(true);
    this.subEl1 = <HTMLElement>this.rootEl.children[0].children[0];
    const child2 = <HTMLElement>this.rootEl.children[1].children[0];
    const child3 = <HTMLElement>this.rootEl.children[2].children[0];

    if (!this.rootEl || !this.subEl1 || !child2 || !child3) throw "SingleElement init failed";

    this.subEl1.removeAttribute("id");
    this.subEl1.innerText = "";

    this.subEl1.parentElement?.setAttribute('colspan', '2');
  
    child2.removeAttribute("id");
    child2.innerText = "";

    child3.removeAttribute("id");
    child3.innerText = "";

    this.rootEl.classList.add('HUD_el');
    this.subEl1.classList.add('HUD_el');
    child2.classList.add('HUD_rm');
    child3.classList.add('HUD_rm');

    this.color('white');
  
    addEl(this.rootEl);

    doc.querySelectorAll('.HUD_rm').forEach(el => el.remove());
  }

  update(str1: string) {
    this.subEl1.innerText = str1;
  }

  color(str1: string) {
    this.subEl1.style.color = str1;
  }

  reset() {
    this.subEl1.innerText = "";
  }
}

class DoubleElement {
  private rootEl: HTMLElement;
  private subEl1: HTMLElement;
  private subEl2: HTMLElement;

  constructor() {
    this.rootEl = <HTMLElement>hpRootEl.cloneNode(true);
    this.subEl1 = <HTMLElement>this.rootEl.children[0].children[0];
    this.subEl2 = <HTMLElement>this.rootEl.children[1].children[0];
    const child3 = <HTMLElement>this.rootEl.children[2].children[0];

    if (!this.rootEl || !this.subEl1 || !this.subEl2 || !child3) throw "DoubleElement init failed";

    this.subEl1.removeAttribute("id");
    this.subEl1.innerText = "";
  
    this.subEl2.removeAttribute("id");
    this.subEl2.innerText = "";

    child3.removeAttribute("id");
    child3.innerText = "";

    this.rootEl.classList.add('HUD_el');
    this.subEl1.classList.add('HUD_el');
    this.subEl2.classList.add('HUD_el');
    child3.classList.add('HUD_rm');

    this.subEl1.style.margin = '2px 4px 0 0';
    this.subEl2.style.margin = '2px 0 0 4px';

    this.color('white', 'white');
  
    addEl(this.rootEl);

    doc.querySelectorAll('.HUD_rm').forEach(el => el.remove());
  }

  update(str1?: string, str2?: string) {
    if (str1 !== undefined) {
      this.subEl1.innerText = str1;
    }

    if (str2 !== undefined) {
      this.subEl2.innerText = str2;
    }
  }

  color(str1?: string, str2?: string) {
    if (str1 !== undefined) {
      this.subEl1.style.color = str1;
    }

    if (str2 !== undefined) {
      this.subEl2.style.color = str2;
    }
  }

  reset() {
    this.subEl1.innerText = "----";
    this.subEl2.innerText = "----"; 
  }
}

class DividerElement {
  private rootEl: HTMLElement;

  constructor () {
    this.rootEl = <HTMLElement>hackRootEl.cloneNode(true);
    const child1 = <HTMLElement>this.rootEl.children[0].children[0];
    const child2 = <HTMLElement>this.rootEl.children[1].children[0];
    const child3 = <HTMLElement>this.rootEl.children[2].children[0];

    if (!this.rootEl || !child1 || !child2 || !child3) throw "DividerElement init failed";

    child1.removeAttribute("id");
    child1.innerText = "";
  
    child2.removeAttribute("id");
    child2.innerText = "";

    child3.removeAttribute("id");
    child3.innerText = "";

    this.rootEl.classList.add('HUD_el');
    child1.classList.add('HUD_rm');
    child2.classList.add('HUD_rm');
    child3.classList.add('HUD_rm');

    addEl(this.rootEl);

    doc.querySelectorAll('.HUD_rm').forEach(el => el.remove());
  }
}

function hudErr(ns: NS, test: boolean, error: string): boolean {
  if (test) {
    ColorPrint(ns, ['Red1', `HUD ERROR: ${error}`]);
    return true;
  }

  return false;
}

export async function main(ns: NS) {
  ns.disableLog("ALL");

  const theme = ns.ui.getTheme();

  const removeByClassName = (sel: string) => doc.querySelectorAll(sel).forEach(el => el.remove());
  ns.atExit(function () { removeByClassName('.HUD_el'); })

  const args = ns.flags([["help", false]]);
  if (args.help) {
      ns.tprint("This script will enhance your HUD (Heads up Display) with custom statistics.");
      ns.tprint(`Usage: run ${ns.getScriptName()}`);
      ns.tprint("Example:");
      ns.tprint(`> run ${ns.getScriptName()}`);
      return;
  }

  if (hudErr(ns, hook0 === null, 'Unable to find hook0')) return;
  if (hudErr(ns, hook1 === null, 'Unable to find hook1')) return;
  if (hudErr(ns, hook2 === null, 'Unable to find hook2')) return;
  if (hudErr(ns, hookRootEl === null, 'Unable to find hookRootEl')) return;
  if (hudErr(ns, overviewEl === null, 'Unable to find overviewEl')) return;
  if (hudErr(ns, hackRootEl === null, 'Unable to find hackRootEl')) return;
  if (hudErr(ns, hackProgressEl === null, 'Unable to find hackProgressEl')) return;

  const clockKarmaEl = new DoubleElement();
  //new DividerElement();
  const hackStatsTargetGainEl = new DoubleElement();
  const hackStatsTimeEl = new DoubleElement();
  const hackStatsProgressEl = new ProgressElement();
  //new DividerElement();
  const repStatsEl = new DoubleElement();
  const repProgressEl = new ProgressElement();
  new DividerElement();

  let hackStats: HackStats = {
    target: "",
    begin: 0,
    start: 0,
    end: 0,
    gainRate: 0
  };

  const hackStatPort = ns.getPortHandle(1);
  
  while (true) {
    const date = new Date();

    clockKarmaEl.update(date.toLocaleTimeString("it-IT"), `k: ${ns.heart.break().toFixed(0)}`);

    if (hackStatPort.peek() !== "NULL PORT DATA")
      hackStats = JSON.parse(hackStatPort.peek().toString());
    
    if (hackStats.target !== "" && (date.getTime() - 5000) > hackStats.end)
      hackStats.target = "";

    if (hackStats.target !== "") {
      hackStatsTargetGainEl.color(theme['hack'], theme['hack']);
      hackStatsTimeEl.color(theme['hack'], theme['hack']);
      hackStatsProgressEl.color(theme['hack']);

      hackStatsTargetGainEl.update(hackStats.target, `$${ns.formatNumber(hackStats.gainRate / ((hackStats.end - hackStats.start) / 1000), 0, 1000)}/s`);
      
      if (date.getTime() > hackStats.begin) {
        hackStatsProgressEl.color(theme['cha']);
        hackStatsTimeEl.color(theme['cha'], theme['cha']);

        const executeTime = hackStats.end - hackStats.begin;
        hackStatsTimeEl.update(formatTime(executeTime), formatTime(executeTime - (date.getTime() - hackStats.begin)));
        hackStatsProgressEl.update(date.getTime(), hackStats.end, hackStats.begin);
        
      } else {
        const executeTime = hackStats.begin - hackStats.start;
        hackStatsTimeEl.update(formatTime(executeTime), formatTime(executeTime - (date.getTime() - hackStats.start)));
        hackStatsProgressEl.update(date.getTime(), hackStats.begin, hackStats.start);
      }
    } else {
      hackStatsTargetGainEl.color(theme['hack'], theme['hack']);
      hackStatsTimeEl.color(theme['hack'], theme['hack']);
      hackStatsProgressEl.color(theme['hack']);

      hackStatsTargetGainEl.update("NO TARGET", "$0/s");
      hackStatsProgressEl.update(0);
    }


    const work = ns.singularity.getCurrentWork();
    console.log(work);
    if (work?.type === "FACTION") {
      repStatsEl.color(theme['rep'], theme['rep']);
      repProgressEl.color(theme['rep']);
      
      const workStats = ns.formulas.work.factionGains(ns.getPlayer(), work.factionWorkType, ns.singularity.getFactionFavor(work.factionName));
      let targetRep = ns.formulas.reputation.calculateFavorToRep(150);
      if (work.factionName === "Tian Di Hui") targetRep = 6250;
      if (work.factionName === "CyberSec") targetRep = 10000;
      if (work.factionName === "NiteSec") targetRep = 45000;
      if (work.factionName === "The Black Hand") targetRep = 100000;
      const totalRep = ns.singularity.getFactionRep(work.factionName) + ns.formulas.reputation.calculateFavorToRep(ns.singularity.getFactionFavor(work.factionName));
      const repNeeded = Math.max(targetRep - totalRep, 0);
      const isFocused = ns.singularity.isFocused();// || ns.singularity.getOwnedAugmentations().includes('Neuroreceptor Management Implant');
      const repGain = workStats.reputation * 5 * (isFocused ? 1 : 0.8);
      repStatsEl.update(`${ns.formatNumber(totalRep, 0, 1000).padStart(4)}/${ns.formatNumber(targetRep, 0, 1000, true)}`, formatTime((repNeeded/repGain) * 1000));
      repProgressEl.update(totalRep, repNeeded);
    } else if (work?.type === "CREATE_PROGRAM") {
      repStatsEl.color(theme['int'], theme['int']);
      repProgressEl.color(theme['int']);
      repStatsEl.update(work.programName, work.cyclesWorked);
      repProgressEl.update(0);
    } else {
      repStatsEl.color(theme['int'], theme['int']);
      repProgressEl.color(theme['int']);
      repStatsEl.reset();
      repProgressEl.update(100);
    }
    

    await ns.sleep(500);
  }  
 
  // if (hook0 === null || hook1 === null) return;

  // const theme = ns.ui.getTheme();
  // ns.tprintf(theme['cha']);

  // hook0.insertadjacenthtml('beforeend', newrootel.outerhtml);

  // await ns.sleep(2000);
  // removeByClassName('.HUD_el');
  // while (true) {
  //   try {
  //     const player = ns.getPlayer();

  //     const playerCity = player.city; // city
  //     const playerLocation = player.location; // location
  //     const playerKills = player.numPeopleKilled; // numPeopleKilled
  //     const playerKarma = ns.heart.break();

  //     const purchased_servers = ns.getPurchasedServers(); // get every bought server if exists, else just create our blank array and add home to it.
  //     purchased_servers.push("home"); // add home to the array.

  //     // End paramaters, begin CSS: 

  //     removeByClassName('.HUD_el');
  //     theme = ns.ui.getTheme();
  //     removeByClassName('.HUD_sep');

  //     hook0.insertAdjacentHTML('beforeend', `<hr class="HUD_sep HUD_el">`);
  //     hook1.insertAdjacentHTML('beforeend', `<hr class="HUD_sep HUD_el">`);

  //     // playerCity
  //     hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_C HUD_el" title="The name of the City you are currently in.">City </element><br class="HUD_el">`)
  //     colorByClassName(".HUD_GN_C", theme['cha'])
  //     hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN_C HUD_el">${playerCity + '<br class="HUD_el">'}</element>`)
  //     colorByClassName(".HUD_GN_C", theme['cha'])

  //     // playerLocation
  //     hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_L HUD_el" title="Your current location inside the city.">Location </element><br class="HUD_el">`)
  //     colorByClassName(".HUD_GN_L", theme['cha'])
  //     hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN_L HUD_el">${playerLocation + '<br class="HUD_el">'}</element>`)
  //     colorByClassName(".HUD_GN_L", theme['cha'])

  //     // playerKarma
  //     hook0.insertAdjacentHTML('beforeend', `<element class="HUD_Karma_H HUD_el" title="Your karma."><br>Karma &nbsp;&nbsp;&nbsp;</element>`)
  //     colorByClassName(".HUD_Karma_H", theme['hp'])
  //     hook1.insertAdjacentHTML('beforeend', `<element class="HUD_Karma HUD_el"><br>${playerKarma}</element>`)
  //     colorByClassName(".HUD_Karma", theme['hp'])

  //     removeByClassName('.HUD_Kills_H')

  //     // playerKills
  //     hook0.insertAdjacentHTML('beforeend', `<element class="HUD_Kills_H HUD_el" title="Your kill count, increases every successful homicide."><br>Kills &nbsp;&nbsp;&nbsp;</element>`)
  //     colorByClassName(".HUD_Kills_H", theme['hp'])
  //     removeByClassName('.HUD_Kills')
  //     hook1.insertAdjacentHTML('beforeend', `<element class="HUD_Kills HUD_el"><br>${playerKills}</element>`)
  //     colorByClassName(".HUD_Kills", theme['hp'])
  //   } catch (err) {
  //     ns.print("ERROR: Update Skipped: " + String(err));
  //   }

  //   ns.atExit(function () { removeByClassName('.HUD_el'); })
  //   await ns.sleep(200);
  // }
}

