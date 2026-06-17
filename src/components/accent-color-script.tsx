// Inlined at build time — no import, runs synchronously before first paint
const ACCENT_CSS: Record<string, [string, string, string, string]> = {
  blue:   ["oklch(0.488 0.243 264.4)", "oklch(0.985 0 0)", "oklch(0.623 0.214 259.8)", "oklch(0.985 0 0)"],
  violet: ["oklch(0.541 0.281 293.0)", "oklch(0.985 0 0)", "oklch(0.702 0.183 293.0)", "oklch(0.985 0 0)"],
  rose:   ["oklch(0.563 0.226 13.0)",  "oklch(0.985 0 0)", "oklch(0.704 0.191 22.2)",  "oklch(0.985 0 0)"],
  orange: ["oklch(0.646 0.222 41.8)",  "oklch(0.985 0 0)", "oklch(0.769 0.188 70.1)",  "oklch(0.145 0 0)"],
  green:  ["oklch(0.527 0.154 150.1)", "oklch(0.985 0 0)", "oklch(0.696 0.17 162.4)",  "oklch(0.145 0 0)"],
  teal:   ["oklch(0.511 0.14 194.8)",  "oklch(0.985 0 0)", "oklch(0.682 0.144 196.5)", "oklch(0.145 0 0)"],
  pink:   ["oklch(0.592 0.249 351.0)", "oklch(0.985 0 0)", "oklch(0.718 0.202 349.8)", "oklch(0.985 0 0)"],
}

function buildScript() {
  const colors = JSON.stringify(ACCENT_CSS)
  return `(function(){try{
var k=localStorage.getItem('accent-color');
if(!k||k==='default')return;
var C=${colors};
var c=C[k];if(!c)return;
var v=function(p,pf){return '--primary:'+p+';--primary-foreground:'+pf+';--ring:'+p+';--sidebar-primary:'+p+';--sidebar-primary-foreground:'+pf};
var s=document.createElement('style');
s.id='cms-accent-style';
s.textContent=':root{'+v(c[0],c[1])+'}.dark{'+v(c[2],c[3])+'}';
document.head.appendChild(s);
}catch(e){}})();`
}

export function AccentColorScript() {
  return (
    <script dangerouslySetInnerHTML={{ __html: buildScript() }} />
  )
}
