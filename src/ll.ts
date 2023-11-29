import { NS } from "@ns";
import { PrintTable, DefaultStyle, ColorPrint } from "tables";

export async function main(ns: NS): Promise<void> {
  const files = ns.ls(ns.getHostname());

  // const exes = files.filter(f => f.includes('.exe'));
  // ns.tprintf("============ EXECUTABLES =============");
  // for (const f of exes)
  //   ns.tprintf(`${f}`);

  // const scripts = files.filter(f => f.includes('.js'));
  // ns.tprintf('');
  // ns.tprintf("============== SCRIPTS ===============");
  // for (const f of scripts)
  //   ns.tprintf(`${f}`);

  // const misc = files.filter(f => !(f.includes('.exe') || f.includes('.js')));
  // ns.tprintf('');
  // ns.tprintf("=============== MISC =================");
  // for (const f of misc)
  //   ns.tprintf(`${f}`);

  const scripts = files.filter(f => f.includes('.js'));

  const data = scripts.map(f => {
    return [
      ` ${f}`,
      ns.formatRam(ns.getScriptRam(f)).padStart(9),
    ]
  });

  const columns = [
    { header: ' Script', width: 20 },
    { header: '      RAM', width: 10 },
  ];

  PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}
