# Server Basics

A small teaching website, the fifth in the Packet Lessons family (Frames & Packets, Protocols,
Encryption and Protocols, Packet Forensics). Students click a server role in the left column and get,
in the right column:

1. a plain-English explanation of what the role does,
2. a sequence diagram of the conversation between client and server,
3. **Set it up**: numbered steps with commands and expected output, switchable between
   **Windows Server**, **Ubuntu** and **Alma / Rocky Linux**,
4. **Check it from a client**: commands to prove the server works, with the output to expect, and a
   link to the matching row on the Protocols site to see the real packets,
5. **When it breaks**: the usual failures, what they look like, and what to check first.

Rows: **DHCP**, **DNS**, **Web Server**, **AD DS**. They tell one story: a PC gets its address from DHCP,
resolves `www.lab.local` through a DNS **A record** the student created (the DNS row also covers AAAA,
MX, PTR and TXT), loads the page from a web server the student built, and the whole thing sits inside an
Active Directory domain whose controller is also the DNS server.

No frameworks, no build step: plain HTML, CSS and JavaScript served by nginx in a Docker container.

## Run it

```sh
docker compose up -d --build
```

Then open <http://127.0.0.1:8083>. Stop it with `docker compose down`.

Or run the published image from Docker Hub without cloning anything, in the foreground (Ctrl+C stops
and removes it):

```sh
docker run --rm -it --name server-basics -p 8083:8083 professorcryan/servers
```

Unlike the Protocols site there is no live-network section, so no host networking is needed; a plain
port mapping is enough. Change `listen 8083;` in `nginx.conf` and the port mapping in
`docker-compose.yml` if 8083 is taken. The image name and port shown on the welcome page are
`SITE.image` / `SITE.port` in `site/lessons.js`.

The page works from a plain web server or straight from disk (there is nothing to `fetch()`), but
serving it over HTTP is the normal case.

## Hosting it as a static site (GitHub Pages)

Everything lives in `site/`, so it also works on GitHub Pages or any plain web host. The published copy
is <https://professorcam.github.io/servers/>. `.github/workflows/pages.yml` publishes `site/` to Pages
on every push to `main`; enable it once under Settings > Pages > Source: GitHub Actions.

## Reading level (Simple | Moderate | Engineer)

The buttons at the top right switch every explanation between three depths: **Simple** (a notch above
"explain it like I'm five": the big idea in plain words), **Moderate** (beginner CCNA / Server+ student,
the default) and **Engineer** (full technical detail, kept short). The choice is stored in the browser
under the same key as the other Packet Lessons sites, so it carries across them, and a link such as
`index.html?level=simple` (or `moderate`, `engineer`) opens the site at that level.

The mechanism is `site/level.js`, identical on every Packet Lessons site. In `site/lessons.js` any piece
of prose can be a plain string (same at every level) or an object with `s`, `m` and `e` keys, and arrays
of paragraphs may mix the two. A missing key falls back to Moderate; an empty string leaves that
paragraph (or setup step) out at that level. Rows refer to each other with `{{row:id}}`.

## Light and dark mode

The site is dark by default. The round button beside the level bar switches to light, and the choice is
stored in the browser under the same key the Packet Forensics site uses (`packet-lessons-theme`), so it
carries across the two. A link with `?theme=light` (or `dark`) opens the site in that mode for a visitor
who has not chosen yet. The palette is the set of CSS variables at the top of `site/style.css`; the dark
values are the `:root[data-theme="dark"]` block at the bottom, and `index.html` applies the theme before
the first paint so there is no flash.

## Operating system switcher (Windows Server | Ubuntu | Alma / Rocky)

Inside each row, the **Set it up** section has three buttons. The choice applies to every row, is stored
in the browser (`servers-os`), and `index.html?os=ubuntu` (or `win`, `rhel`) opens the site on that
system. The buttons are defined in `OSES` in `site/lessons.js`; each setup section carries an `os`
object with one block per OS id: `{ intro, steps, after }`, where a step is a string, a level object, or
`{ text, cmd, out }` for a step with a command and the output to expect.

AD DS is the one row where the three systems are not equivalent: Windows Server and Samba on Ubuntu both
act as the domain controller, while Alma / Rocky (whose repositories do not ship the Samba DC role) joins
the domain as a member with realmd and sssd. The page says so.

## Layout

```
Dockerfile           nginx:alpine + the site directory
docker-compose.yml   one service on port 8083
nginx.conf           serves site/
site/
  index.html         page shell: rail, left <aside>, right <main>
  style.css          layout, diagram, command block and OS-switcher styling
  app.js             builds the nav, renders a lesson or the welcome page, OS switcher
  lessons.js         ALL teaching content lives here: SITE, GROUPS, OSES and one object per row
  level.js           the Simple | Moderate | Engineer toggle and the lv() text resolver
```

## Adding a row

1. Append an object to the `LESSONS` array in `site/lessons.js`. The comment at the top of that file
   lists every field. `group` picks the sidebar heading (`GROUPS`), `chip` is the small tag at the right
   of the row, `protocolRow` links to a row on the Protocols site (leave it out if there is none).
2. Give every prose field `s`, `m` and `e` versions, and every `os` block all three systems.
3. Rebuild: `docker compose up -d --build`.

## Checking the content from the command line

`lessons.js` and `level.js` both export under node, so a short script can resolve every piece of prose
at every level and catch a missing OS block or an unresolved `{{row:...}}` before it reaches a browser:

```sh
node -e '
const vm=require("vm"),fs=require("fs");
const ctx={module:{},window:undefined,document:{documentElement:{dataset:{}}},localStorage:undefined,location:{search:""}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("site/lessons.js","utf8")+fs.readFileSync("site/level.js","utf8"),ctx);
for (const L of ["s","m","e"]) { ctx.LEVEL=L; for (const l of ctx.LESSONS) console.log(L, l.id, ctx.lv(l.oneLiner)); }
'
```
