/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { load } from "https://deno.land/std@0.201.0/dotenv/mod.ts";
import utils from "./utils.json" assert { type: "json" };
const env = await load();
const kv = await Deno.openKv();
if (Deno.env.get("cookie") == undefined && "cookie" in env) {
  Deno.env.set("cookie", env["cookie"]);
  console.log("Update cookies");
}
const getNewVersions = () => {
  console.log("Getting new versions");
  utils.calcs.forEach(async (e) => {
    const rawdata = await fetch(
      `https://my.numworks.com/firmwares/${e}/stable.json`,
      { headers: { Cookie: Deno.env.get("cookie") } },
    );
    const data = await rawdata.json();
    kv.set([e], data.version);
  });
  kv.set(["lastupdate"], Date.now());
  return false;
};
const handler = async (req: Request) => {
  const url = new URL(req.url);
  switch (url.pathname) {
    case "/": {
      const file = await Deno.readTextFile("index.html");
      return new Response(file, { headers: { "content-type": "text/html" } });
    }
    case "/about": {
      const file = await Deno.readTextFile("about.html");
      return new Response(file, { headers: { "content-type": "text/html" } });
    }
    case "/raw-data": {
      const calclst: string[][] = [];
      utils.calcs.forEach((e) => {
        calclst.push([e]);
      });
      calclst.push(['lastupdate'])
      const kv = await Deno.openKv();
      const rawdata = await kv.getMany(calclst);
      const data: any = {};
      let lastupdate:any;
      rawdata.forEach((e) => {
        if (e.key[0].toString() != "lastupdate") {
          data[e.key[0].toString()] = e.value;
        } else {
          lastupdate = e.value
        }
      });
      const sixhours = lastupdate + (6 * 60 * 60 * 1000); //Hours+Minutes+Seconds+Miliseconds
      console.log(new Date().getTime(),sixhours,new Date().getTime() >= sixhours)
      let updating = false
      if (lastupdate == null || new Date().getTime() >= sixhours) {
        getNewVersions()
        updating = true
      }
      return new Response(
        JSON.stringify({ error: false, calcs: data, lastupdate: lastupdate, updating: updating}),
        {
          headers: { "content-type": "application/json; charset=utf-8" },
        },
      );
    }
    default: {
      return new Response(
        JSON.stringify({ error: true, why: "unknown route" }),
        {
          headers: { "content-type": "application/json; charset=utf-8" },
        },
      );
    }
  }
};
//getNewVersions()
serve(handler);
