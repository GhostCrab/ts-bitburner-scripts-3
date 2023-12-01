/** @param {NS} ns **/
export async function main(ns) {
  /*
      Original script by: u/I_hate_you_wasTaken, (https://www.reddit.com/r/Bitburner/comments/10urhbn/custom_overview_stats_but_better/)
      
      UPDATE 2/25/2023: 

      After the v2.2.2 release was released on 2/21/2023, the findPlayer() method used in the original script for 'globalThis.webpackJsonp.push()' and payload_id, stopped working.
      
      I refactored the script to use ns.getPlayer() and ns.gang.getGangInformation() as well as other methods to build out the previous and some new data fot the HUD. 
      
      The HUD now also shows the following:    
          • City
          • Location
          • Faction
          • Gang Respect
          • Gang Income
          • Scripts Income $/sec
          • Script Experience XP/sec
          • Karma
          • Kills

      This hs been tested on v2.2.2 (d3f9554a), and it is working/stable.    
      - u/DukeNukemDad    
  */

  ns.disableLog("ALL");
  // ns.clearLog();
  // ns.tail();

  const args = ns.flags([["help", false]]);
  if (args.help) {
      ns.tprint("This script will enhance your HUD (Heads up Display) with custom statistics.");
      ns.tprint(`Usage: run ${ns.getScriptName()}`);
      ns.tprint("Example:");
      ns.tprint(`> run ${ns.getScriptName()}`);
      return;
  }

  const doc = eval('document');
  const removeByClassName = (sel) => doc.querySelectorAll(sel).forEach(el => el.remove());
  const colorByClassName = (sel, col) => doc.querySelectorAll(sel).forEach(el => {el.style.color = col; el.style.fontSize = '0.75rem'});
  const hook0 = doc.getElementById('overview-extra-hook-0');
  const hook1 = doc.getElementById('overview-extra-hook-1');

  var theme = ns.ui.getTheme()

  while (true) {
      try {
          let player = ns.getPlayer();

          var playerCity = player.city; // city
          var playerLocation = player.location; // location
          var playerKills = player.numPeopleKilled; // numPeopleKilled
          var playerKarma = ns.heart.break();

          let purchased_servers = ns.getPurchasedServers(); // get every bought server if exists, else just create our blank array and add home to it.
          purchased_servers.push("home"); // add home to the array.

          // End paramaters, begin CSS: 

          removeByClassName('.HUD_el');
          theme = ns.ui.getTheme();
          removeByClassName('.HUD_sep');

          hook0.insertAdjacentHTML('beforebegin', `<hr class="HUD_sep HUD_el">`);
          hook1.insertAdjacentHTML('beforebegin', `<hr class="HUD_sep HUD_el">`);

          // playerCity
          hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_C HUD_el" title="The name of the City you are currently in.">City </element><br class="HUD_el">`)
          colorByClassName(".HUD_GN_C", theme['cha'])
          hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN_C HUD_el">${playerCity + '<br class="HUD_el">'}</element>`)
          colorByClassName(".HUD_GN_C", theme['cha'])

          // playerLocation
          hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_L HUD_el" title="Your current location inside the city.">Location </element><br class="HUD_el">`)
          colorByClassName(".HUD_GN_L", theme['cha'])
          hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN_L HUD_el">${playerLocation + '<br class="HUD_el">'}</element>`)
          colorByClassName(".HUD_GN_L", theme['cha'])

          // playerKarma
          hook0.insertAdjacentHTML('beforeend', `<element class="HUD_Karma_H HUD_el" title="Your karma."><br>Karma &nbsp;&nbsp;&nbsp;</element>`)
          colorByClassName(".HUD_Karma_H", theme['hp'])
          hook1.insertAdjacentHTML('beforeend', `<element class="HUD_Karma HUD_el"><br>${playerKarma}</element>`)
          colorByClassName(".HUD_Karma", theme['hp'])

          removeByClassName('.HUD_Kills_H')

          // playerKills
          hook0.insertAdjacentHTML('beforeend', `<element class="HUD_Kills_H HUD_el" title="Your kill count, increases every successful homicide."><br>Kills &nbsp;&nbsp;&nbsp;</element>`)
          colorByClassName(".HUD_Kills_H", theme['hp'])
          removeByClassName('.HUD_Kills')
          hook1.insertAdjacentHTML('beforeend', `<element class="HUD_Kills HUD_el"><br>${playerKills}</element>`)
          colorByClassName(".HUD_Kills", theme['hp'])
      } catch (err) {
          ns.print("ERROR: Update Skipped: " + String(err));
      }

      ns.atExit(function () { removeByClassName('.HUD_el'); })
      await ns.sleep(200);
  }
}