/* Lightweight Aceternity-inspired interactions; no React/Tailwind dependency. */
(()=>{
 const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const hero=document.querySelector('.hero');
 if(hero&&!document.querySelector('.bf-trustbar')){
  const bar=document.createElement('div');bar.className='bf-trustbar';bar.innerHTML='<div class="bf-trustinner"><div class="bf-trustitem"><span class="bf-trusticon">✦</span><span>أناقة مغربية مختارة</span></div><div class="bf-trustitem"><span class="bf-trusticon">✓</span><span>الدفع عند الاستلام</span></div><div class="bf-trustitem"><span class="bf-trusticon">🚚</span><span>توصيل لجميع المدن</span></div><div class="bf-trustitem"><span class="bf-carrier"><b>ELMEXPRESS</b><span>شريك التوصيل</span></span></div></div>';
  hero.insertAdjacentElement('afterend',bar);
 }
 const progress=document.createElement('div');progress.className='bf-progress';progress.setAttribute('aria-hidden','true');progress.innerHTML='<span></span>';document.body.appendChild(progress);
 const fill=progress.firstElementChild;let ticking=false;
 const update=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;fill.style.transform=`scaleX(${max>0?window.scrollY/max:0})`;ticking=false};
 window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(update);ticking=true}},{passive:true});update();
 if(reduce)return;
 const revealTargets=()=>document.querySelectorAll('.sectionhead,.about,.features,.category-showcase,.product,.feature-card,.categorytiles>*').forEach(el=>{if(!el.classList.contains('bf-reveal')){el.classList.add('bf-reveal');observer.observe(el)}});
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('bf-visible');observer.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});
 revealTargets();new MutationObserver(revealTargets).observe(document.body,{childList:true,subtree:true});
 const pointer=e=>{const card=e.target.closest('.product,.feature-card');if(!card)return;const r=card.getBoundingClientRect();card.style.setProperty('--bf-x',`${e.clientX-r.left}px`);card.style.setProperty('--bf-y',`${e.clientY-r.top}px`)};
 document.addEventListener('pointermove',pointer,{passive:true});
 document.querySelectorAll('.heroBtns .btn').forEach(btn=>{btn.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=btn.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)*.07;const y=(e.clientY-r.top-r.height/2)*.07;btn.style.transform=`translate(${x}px,${y}px)`});btn.addEventListener('pointerleave',()=>btn.style.transform='')});
})();
