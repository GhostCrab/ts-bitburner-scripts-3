import { NS } from "@ns";

function getConnectedPaths(ns: NS, current: string = 'home', path: string[] = [], paths: Record<string, string[]> = {}) {
  paths[current] = [...path, current];
  
  let parent = '';
  if (path.length > 0) parent = path[path.length - 1];
  
  for (const connected of ns.scan(current)) {
    if (connected === parent) continue;
    getConnectedPaths(ns, connected, paths[current], paths);
  }

  return paths;
}

export async function main(ns: NS): Promise<void> {
  // ns.tprintf(`${getConnectedPaths(ns)['The-Cave']}`);
  for (const s of getConnectedPaths(ns)['The-Cave']) {
    ns.singularity.connect(s);
  }

  ns.singularity.connect('home');
}
