import { NS } from "@ns";
import { ColorPrint } from "./tables";

const doc: Document = eval('document');
const hook0 = doc.getElementById('overview-extra-hook-0');
const hook1 = doc.getElementById('overview-extra-hook-1');
const hook2 = doc.getElementById('overview-extra-hook-2');
const hookRootEl = hook0?.parentElement?.parentElement;
const overviewEl = hookRootEl?.parentElement;
const hackRootEl = <HTMLElement>overviewEl?.children[2];
const hackProgressEl = <HTMLElement>overviewEl?.children[3];

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

    console.log(this.rootEl.outerHTML);
    console.log(this.subEl1.outerHTML);
    console.log(this.subEl2.outerHTML);
  
    hook2?.insertAdjacentHTML('beforebegin', this.rootEl.outerHTML);
  }

  update(ns: NS, current: number, max = 100, min = 0) {
    const nvalue = (current / max) * 100;
    let transform = 100 - nvalue;
    let wholeValue = Math.floor(nvalue);

    if (wholeValue > 100) {
      transform = 0;
      wholeValue = 100;
    }

    ns.tprintf(`ProgressElement Update: ${current.toFixed(2)}/${max}`)

    this.subEl1.setAttribute("aria-valuenow", `${wholeValue}`);
    this.subEl2.setAttribute("style", `transform: translateX(${-transform.toFixed(3)}%);`);
  }

  reset() {
    this.subEl1.setAttribute("aria-valuenow", "100");
    this.subEl2.setAttribute("style", "transform: translateX(-0%);");
  }
}

class SingleElement {
  private rootEl: HTMLElement;
  private subEl1: HTMLElement;

  constructor() {
    this.rootEl = <HTMLElement>hackRootEl?.cloneNode(true);
    this.subEl1 = <HTMLElement>this.rootEl?.children[0]?.firstChild;

    if (!this.rootEl || !this.subEl1) throw "SingleElement init failed";

    if (this.rootEl?.childNodes[1]) this.rootEl.removeChild(this.rootEl.childNodes[1]);

    this.subEl1.removeAttribute("id");
    this.subEl1.innerText = "";
    
    this.rootEl.classList.add('HUD_el');
    this.subEl1.classList.add('HUD_el');
    
  
    hook2?.insertAdjacentHTML('beforebegin', this.rootEl.outerHTML);
  }

  update(str1: string) {
    this.subEl1.innerText = str1;
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
    this.rootEl = <HTMLElement>hackRootEl.cloneNode(true);
    this.subEl1 = <HTMLElement>this.rootEl.children[0].children[0];
    this.subEl2 = <HTMLElement>this.rootEl.children[1].children[0];
    const child3 = <HTMLElement>this.rootEl.children[1].children[0];

    if (!this.rootEl || !this.subEl1 || !this.subEl2) throw "DoubleElement init failed";

    this.subEl1.removeAttribute("id");
    this.subEl1.innerText = "";
  
    this.subEl2.removeAttribute("id");
    this.subEl2.innerText = "";

    child3.removeAttribute("id");
    child3.innerText = "";

    this.rootEl.classList.add('HUD_el');
    this.subEl1.classList.add('HUD_el');
    this.subEl2.classList.add('HUD_el');
    child3.classList.add('HUD_el');

    console.log(this.rootEl.outerHTML);
  
    hook2?.insertAdjacentHTML('beforebegin', this.rootEl.outerHTML);
  }

  update(str1?: string, str2?: string) {
    if (str1 !== undefined) {
      this.subEl1.innerText = str1;
    }

    if (str2 !== undefined) {
      this.subEl2.innerText = str2;
    }
  }

  reset() {
    this.subEl1.innerText = "";
    this.subEl2.innerText = ""; 
  }
}

class DividerElement {
  private rootEl: HTMLElement;

  constructor () {
    this.rootEl = <HTMLElement>hookRootEl?.cloneNode(true);
    const child1 = <HTMLElement>this.rootEl.children[0].children[0];
    const child2 = <HTMLElement>this.rootEl.children[0].children[0];

    if (!this.rootEl || !child1 || !child2) throw "DividerElement init failed";

    
    child1.innerText = "";
    
    child2.innerText = "";
    child2.removeAttribute("id");

    this.rootEl.classList.add('HUD_el');
    child1.classList.add('HUD_el');
    child2.classList.add('HUD_el');
  
    hook2?.insertAdjacentHTML('beforebegin', this.rootEl.outerHTML);
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

  const removeByClassName = (sel: string) => doc.querySelectorAll(sel).forEach(el => el.remove());
  const colorByClassName = (sel: string, col: string) => doc.querySelectorAll(sel).forEach(el => {
    (el as HTMLElement).style.color = col; 
    (el as HTMLElement).style.fontSize = '0.75rem'
  });

  
  const clockKarmaEl = new DoubleElement();
  // const progressTest = new ProgressElement();
  // const divider1 = new DividerElement();

  while (true) {
    const date = new Date();

    clockKarmaEl.update(date.toLocaleTimeString("it-IT"), `k: ${ns.heart.break().toFixed(0)}`);
    // progressTest.update(ns, (date.getTime()/100) % 100);
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

