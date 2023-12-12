import { NS } from "@ns";
import { ColorPrint } from "./tables";

const doc: Document = eval('document');
const hook0 = doc.getElementById('overview-extra-hook-0');
const hook1 = doc.getElementById('overview-extra-hook-1');
const hookRootEl = hook0?.parentElement?.parentElement;
const overviewEl = hookRootEl?.parentElement;
const hackRootEl = <HTMLElement>overviewEl?.children[2];
const hackProgressEl = <HTMLElement>overviewEl?.children[3];

function hudErr(ns: NS, test: boolean, error: string): boolean {
  if (test) {
    ColorPrint(ns, ['Red1', `HUD ERROR: ${error}`]);
    return true;
  }

  return false;
}

export async function main(ns: NS) {
  ns.disableLog("ALL");

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
  if (hudErr(ns, hookRootEl === null, 'Unable to find hookRootEl')) return;
  if (hudErr(ns, overviewEl === null, 'Unable to find overviewEl')) return;
  if (hudErr(ns, hackRootEl === null, 'Unable to find hackRootEl')) return;
  if (hudErr(ns, hackProgressEl === null, 'Unable to find hackProgressEl')) return;

  const removeByClassName = (sel: string) => doc.querySelectorAll(sel).forEach(el => el.remove());
  const colorByClassName = (sel: string, col: string) => doc.querySelectorAll(sel).forEach(el => {
    (el as HTMLElement).style.color = col; 
    (el as HTMLElement).style.fontSize = '0.75rem'
  });
  
  // const newRootEl = <HTMLElement>hackProgressEl?.cloneNode(true);
  // const newSub1 = <HTMLElement>newRootEl?.children[0]?.children[0];
  // const newSub2 = <HTMLElement>newRootEl?.children[0]?.children[0]?.children[0];

  // if (!newRootEl || !newSub1 || !newSub2) throw "addProgress init failed";

  // newRootEl.classList.add('HUD_el');
  // newSub1.classList.add('HUD_el');
  // newSub2.classList.add('HUD_el');
  
  // if (hook0 === null || hook1 === null) return;

  // const theme = ns.ui.getTheme();
  // ns.tprintf(theme['cha']);

  // hook0.insertAdjacentHTML('beforebegin', newRootEl.outerHTML);

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

  //     hook0.insertAdjacentHTML('beforebegin', `<hr class="HUD_sep HUD_el">`);
  //     hook1.insertAdjacentHTML('beforebegin', `<hr class="HUD_sep HUD_el">`);

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