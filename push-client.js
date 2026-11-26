(() => {
 const VAPID_PUBLIC_KEY='BIpoHzbQ4-OohAi7bqWN_HgHj9_6kcb2iKA7qackbkIL9YO7WlJokIPz96yw4AuFtu7wm4q79KFRCqt2UTzLuvk';
 const card=document.getElementById('beldiPushCard'),enable=document.getElementById('beldiPushEnable'),later=document.getElementById('beldiPushLater');
 if(!card||!enable||!later)return;
 const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 if(!supported||!window.supabase||!window.BELDI_SUPABASE_URL||!window.BELDI_SUPABASE_ANON_KEY||sessionStorage.getItem('beldi-push-dismissed')||Notification.permission==='denied')return;
 window.addEventListener('load',async()=>{try{
  const reg=await navigator.serviceWorker.register('./sw.js');
  if(await reg.pushManager.getSubscription())return;
  card.style.display='block';
  enable.addEventListener('click',async()=>{enable.disabled=true;enable.textContent='جاري التفعيل…';try{
   if(VAPID_PUBLIC_KEY.includes('PASTE_'))throw new Error('خاص إضافة VAPID Public Key قبل التفعيل.');
   const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('ما تمش السماح بالإشعارات من المتصفح.');
   const subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(VAPID_PUBLIC_KEY)});
   const client=window.supabase.createClient(window.BELDI_SUPABASE_URL,window.BELDI_SUPABASE_ANON_KEY),payload=subscription.toJSON();
   const {error}=await client.from('push_subscriptions').insert({endpoint:payload.endpoint,subscription:payload,user_agent:navigator.userAgent.slice(0,300)});
   if(error){await subscription.unsubscribe();throw error;}
   card.innerHTML='<strong>شكراً على الثقة 💛</strong><p>تفعّلات الإشعارات بنجاح.</p>';setTimeout(()=>card.remove(),4500);
  }catch(e){enable.disabled=false;enable.textContent='عاودي المحاولة';const p=card.querySelector('p');if(p)p.textContent=e.message||'تعذر تفعيل الإشعارات.';}});
  later.addEventListener('click',()=>{sessionStorage.setItem('beldi-push-dismissed','1');card.remove();});
 }catch(e){console.warn('BELDI push setup:',e);}});
 function decodeKey(s){const pad='='.repeat((4-s.length%4)%4),raw=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
})();