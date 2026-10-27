// Dry run of the shared-cookie naming, with no browser and no Firebase.
// Two apps on different Firebase projects share one parent domain. Shows why
// the cookie name carries the project ID instead of one shared name plus a
// projectId check inside the value.
//
//   node scripts/dryrun-cookies.mjs

const PROJECT = { app: 'project-a', blog: 'project-b' };
const UID = { 'project-a': 'uid-A', 'project-b': 'uid-B' };

function run(label, cookieName, readCookie) {
  const jar = new Map();
  const log = [];
  const login = (site) => {
    const projectId = PROJECT[site];
    jar.set(cookieName(projectId), JSON.stringify({ uid: UID[projectId], projectId }));
    log.push(`${site.padEnd(5)} login   jar = ${[...jar.keys()].join(', ')}`);
  };
  const focus = (site) => {
    const data = readCookie(jar, PROJECT[site], cookieName);
    log.push(`${site.padEnd(5)} focus   ${data ? `sees ${data.uid}` : 'no usable cookie'}`);
  };

  login('app');
  focus('app');
  login('blog');
  focus('app');
  focus('blog');

  console.log(`\n== ${label}`);
  for (const line of log) console.log('  ' + line);
}

run('A. one shared name, no check (1.x)',
  () => 'cheesso_sso_user',
  (jar, p, name) => (jar.has(name(p)) ? JSON.parse(jar.get(name(p))) : null));

run('B. one shared name + projectId check inside the value',
  () => 'cheesso_sso_user',
  (jar, p, name) => {
    const raw = jar.get(name(p));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d.projectId === p ? d : null;
  });

run('C. cookie name per project (2.x)',
  (p) => `cheesso_sso_user_${p}`,
  (jar, p, name) => (jar.has(name(p)) ? JSON.parse(jar.get(name(p))) : null));

console.log(`
A: blog's login overwrites app's cookie; app then shows blog's user.
B: same overwrite; app now sees "no usable cookie", which 1.x treated as a logout.
C: each project keeps its own cookie; nothing is overwritten.`);
