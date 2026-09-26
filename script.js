'use strict';
const $ = (s) => document.querySelector(s);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const stages = {
 global: ['RECIPE-WIDE INTERVENTION','Tune settings across the layout.','The actor reads the recipe, process manuals, and measured layout feedback before proposing a global parameter edit. The commercial tool evaluates the candidate under fixed quality limits.',['recipe & layout','global edit','physical evaluation'],'Global edits share one ten-trial budget with local rules and diagnostic experiments.'],
 local: ['SPATIALLY SCOPED INTERVENTION','Write a rule for the remaining hotspot.','Layout tools connect a measured EPE hotspot to its design edge and surrounding geometry. The actor proposes a bounded local rule; deterministic checks compile it and the commercial tool measures the result.',['hotspot geometry','matched edge','local rule'],'The agent compares the original focus, the new worst location, and the full scoring region.'],
 memory: ['SELF-EVOLVING SKILL BANK','Turn every trial into a better next decision.','After each evaluation, an LLM reflector analyzes the local and global response. An LLM curator distills evidence-linked judgments, checks counterexamples, and suggests tests. The actor retrieves relevant skills before its next trial.',['trial record','reflect & curate','retrieve skill'],'The recipe and Skill Bank evolve during a run; model weights and harness code remain fixed.']
};
document.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click',()=>{
 document.querySelectorAll('[data-stage]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
 const x=stages[button.dataset.stage];$('#stage-tag').textContent=x[0];$('#stage-title').textContent=x[1];$('#stage-body').textContent=x[2];$('#stage-note').textContent=x[4];$('#stage-code').innerHTML=x[3].map(s=>`<span>${s}</span>`).join('<b>→</b>');
}));
const stack=$('.hero-stack');
if(stack){stack.addEventListener('pointermove',e=>{if(reduced.matches||e.pointerType==='touch')return;const r=stack.getBoundingClientRect();stack.style.setProperty('--rx',`${(e.clientY-r.top-r.height/2)/50}deg`);stack.style.setProperty('--ry',`${(e.clientX-r.left-r.width/2)/45}deg`);});stack.addEventListener('pointerleave',()=>{stack.style.setProperty('--rx','0deg');stack.style.setProperty('--ry','0deg');});}
function groupButtons(selector,button){document.querySelectorAll(selector).forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});}
const fmt=(x,n)=>x===null?'—':Number(x).toFixed(n);
fetch('assets/current/replay-results.json?v=20260925-metal44').then(r=>{if(!r.ok)throw Error('Replay data unavailable');return r.json();}).then(data=>{
 const trace=data.trajectories.find(r=>r.layer==='poly'),pts=trace.points;
 const x=v=>30+v/trace.opc_submitted*440,y=v=>175-v/trace.initial.edge_normal_max_epe_nm*140;
 let path='';pts.forEach((p,i)=>{path+=i?` H${x(p.opc_calls)} V${y(p.retained_metrics.edge_normal_max_epe_nm)}`:`M${x(p.opc_calls)},${y(p.retained_metrics.edge_normal_max_epe_nm)}`;});
 document.querySelectorAll('.trajectory-preview .trace-line,.trajectory-preview .trace-glow').forEach(el=>el.setAttribute('d',path));
 const end=pts[pts.length-1],circle=$('.trajectory-preview circle');if(circle){circle.setAttribute('cx',String(x(end.opc_calls)));circle.setAttribute('cy',String(y(end.retained_metrics.edge_normal_max_epe_nm)));}
}).catch(()=>{});

// Keep the paper's diagrams intact; offer full-resolution inspection on small screens.
(()=>{
 let dialog,opener;
 document.querySelectorAll('[data-paper-zoom]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();opener=link;
  if(!dialog){
   dialog=document.createElement('dialog');dialog.className='paper-dialog';dialog.setAttribute('aria-label','Paper figure enlarged');
   dialog.innerHTML='<div class="paper-dialog-toolbar"><span>Paper figure · full composition</span><div><button data-paper-size aria-pressed="false">Zoom to 100%</button><button data-paper-close aria-label="Close paper figure">Close ×</button></div></div><div class="paper-dialog-viewport"><img alt=""></div>';
   document.body.append(dialog);
   dialog.querySelector('[data-paper-close]').onclick=()=>dialog.close();
   dialog.querySelector('[data-paper-size]').onclick=e=>{const zoom=dialog.classList.toggle('is-zoomed');e.target.textContent=zoom?'Fit to screen':'Zoom to 100%';e.target.setAttribute('aria-pressed',String(zoom));};
   dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
   dialog.addEventListener('close',()=>opener?.focus());
  }
  const source=link.closest('.paper-figure').querySelector('img'),img=dialog.querySelector('img');img.src=source.src;img.alt=source.alt;
  dialog.classList.remove('is-zoomed');const size=dialog.querySelector('[data-paper-size]');size.textContent='Zoom to 100%';size.setAttribute('aria-pressed','false');dialog.showModal();dialog.querySelector('.paper-dialog-viewport').scrollTo(0,0);
 }));
})();
