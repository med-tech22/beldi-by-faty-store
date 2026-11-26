const PHONE='212727294608';
const money=n=>`${Number(n||0).toLocaleString('fr-FR')} DH`;
function salePrice(p){const regular=Number(p?.price)||0,discount=Number(p?.discount_price)||0;return discount>0&&discount<regular?discount:regular}
function discountPercent(p){const regular=Number(p?.price)||0,now=salePrice(p);return now<regular?Math.round((regular-now)/regular*100):0}
function priceMarkup(p){const now=salePrice(p),off=discountPercent(p);return off?`<div class="price sale-price"><span class="sale-current">${money(now)}</span><del>${money(p.price)}</del></div>`:`<div class="price">${money(p.price)} <small>الدفع عند الاستلام</small></div>`}
const $=s=>document.querySelector(s);
const configured=window.BELDI_SUPABASE_URL?.startsWith('https://') && window.BELDI_SUPABASE_ANON_KEY?.length>30 && !window.BELDI_SUPABASE_URL.includes('PASTE_');
const db=configured&&window.supabase?.createClient?window.supabase.createClient(window.BELDI_SUPABASE_URL,window.BELDI_SUPABASE_ANON_KEY):null;
let variantStock=[],cart=(()=>{try{return JSON.parse(localStorage.getItem('beldi_cart')||'[]')}catch(_){return []}})(),filter='الكل';
let currentCustomer=null,customerProfile=null,accountMode='login',customerNotifications=[],notificationChannel=null;
let wishlistIds=[];
let showWishlistOnly=false;
function saveWishlist(){/* المفضلة محفوظة في Supabase حسب حساب الزبونة فقط */}
function updateWishlistButton(){const b=document.getElementById('wishlistToggle'),n=document.getElementById('wishlistCount');if(n)n.textContent=wishlistIds.length;if(b){b.classList.toggle('active',showWishlistOnly);b.setAttribute('aria-pressed',String(showWishlistOnly));b.title=showWishlistOnly?'عرض جميع المنتجات':'عرض المفضلة';}}
function clearCustomerFavorites(){wishlistIds=[];showWishlistOnly=false;updateWishlistButton();renderProducts();}
async function toggleFavorite(id){
 id=String(id);
 if(!db||!currentCustomer){toast('سجلي الدخول أولاً لحفظ المفضلة ❤️');openAccount();return;}
 const removing=wishlistIds.includes(id);
 const result=removing
  ? await db.from('customer_favorites').delete().eq('user_id',currentCustomer.id).eq('product_id',id)
  : await db.from('customer_favorites').upsert({user_id:currentCustomer.id,product_id:id},{onConflict:'user_id,product_id'});
 if(result.error){console.warn('favorite save',result.error.message);toast('تعذر حفظ المفضلة، حاولي مرة أخرى');return;}
 wishlistIds=removing?wishlistIds.filter(x=>x!==id):[...new Set([...wishlistIds,id])];
 toast(removing?'تحيد المنتج من المفضلة':'تزاد المنتج للمفضلة ❤️');
 updateWishlistButton();renderProducts();
}
async function requestRestockAlert(id){
 id=String(id);if(!db){toast('الخدمة غير متاحة حالياً.');return;}
 if(!currentCustomer){toast('سجلي الدخول باش نعلموك ملي يرجع المنتج ❤️');openAccount();return;}
 const {error}=await db.from('product_restock_alerts').upsert({user_id:currentCustomer.id,product_id:id},{onConflict:'user_id,product_id'});
 if(error){console.warn('restock alert',error.message);toast('تعذر تسجيل التنبيه. حاولي مرة أخرى.');return;}
 toast('تسجل طلب التنبيه! غادي نعلموك ملي يرجع المنتج ❤️');
}
function renderWishlistPanel(){
 const panel=document.getElementById('wishlistPanel'),grid=document.getElementById('wishlistProducts');
 if(!panel||!grid)return;
 panel.hidden=!showWishlistOnly;
 if(!showWishlistOnly)return;
 if(!currentCustomer){grid.innerHTML='<p class="wishlist-empty">سجلي الدخول باش تشوفي المنتجات المفضلة ديالكِ.</p>';return;}
 const saved=products.filter(p=>wishlistIds.includes(String(p.id)));
 grid.innerHTML=saved.map(productCard).join('')||'<div class="wishlist-empty"><span>♡</span><b>مازال ما ضفتي حتى منتج للمفضلة</b><p>تصفحي القفاطين واضغطي على القلب باش تحفظي اللي عجبكِ.</p><button type="button" class="btn outline" onclick="toggleWishlistView(false)">اكتشفي القفاطين</button></div>';
}
function toggleWishlistView(force){
 if(!currentCustomer){toast('سجلي الدخول أولاً لعرض المفضلة');openAccount();return;}
 showWishlistOnly=typeof force==='boolean'?force:!showWishlistOnly;
 updateWishlistButton();renderWishlistPanel();
 if(showWishlistOnly)document.getElementById('wishlistPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
 else document.getElementById('shop')?.scrollIntoView({behavior:'smooth',block:'start'});
}
let accountCloseTimer=null;
function openAccount(){
 const m=$('#accountModal');if(!m)return;
 if(accountCloseTimer){clearTimeout(accountCloseTimer);accountCloseTimer=null;}
 m.classList.remove('is-closing');m.classList.add('show');
 m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';if(currentCustomer)loadCustomerLoyalty();
}
function closeAccount(){
 const m=$('#accountModal');if(!m)return;
 m.classList.add('is-closing');m.setAttribute('aria-hidden','true');document.body.style.overflow='';
 if(accountCloseTimer)clearTimeout(accountCloseTimer);
 accountCloseTimer=setTimeout(()=>{m.classList.remove('show','is-closing');accountCloseTimer=null;},300);
}
function setAccountMode(mode){accountMode=mode;$('#accountLoginTab')?.classList.toggle('active',mode==='login');$('#accountSignupTab')?.classList.toggle('active',mode==='signup');$('#accountNameField').hidden=mode!=='signup';$('#accountSubmit').textContent=mode==='signup'?'إنشاء حساب':'دخول';$('#accountMessage').textContent='';}
function showAccountSection(section){
 const profile=section==='profile',orders=section==='orders',notifications=section==='notifications';
 $('#accountProfileSection').hidden=!profile;$('#accountOrdersSection').hidden=!orders;$('#accountNotificationsSection').hidden=!notifications;
 $('#accountProfileTab').classList.toggle('active',profile);$('#accountOrdersTab').classList.toggle('active',orders);$('#accountNotificationsTab').classList.toggle('active',notifications);
 if(orders)loadCustomerOrders();if(notifications)loadCustomerNotifications();
}
function openCustomerNotifications(){openAccount();if(currentCustomer)showAccountSection('notifications');else $('#accountMessage').textContent='سجلي الدخول أولاً باش تشوفي الإشعارات ديالك.';}
function updateNotificationBadge(){
 const count=customerNotifications.filter(n=>!n.is_read).length;
 const badge=$('#notificationCount'),tab=$('#accountNotificationCount');
 if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=count===0;}
 if(tab)tab.textContent=count?`(${count})`:'';
}
async function loadCustomerNotifications(){
 const box=$('#accountNotificationsList');if(!box)return;
 if(!db||!currentCustomer){box.innerHTML='<div class="notification-empty">سجلي الدخول باش تشوفي الإشعارات ديالكِ.</div>';return;}
 box.textContent='جاري تحميل الإشعارات…';
 const {data,error}=await db.from('customer_notifications').select('id,title,body,is_read,created_at').eq('user_id',currentCustomer.id).order('created_at',{ascending:false}).limit(50);
 if(error){console.error('notifications load',error);box.innerHTML='<div class="notification-empty">تعذر تحميل الإشعارات. تأكدي من إعداد جدول الإشعارات في Supabase.</div>';return;}
 customerNotifications=data||[];updateNotificationBadge();
 box.innerHTML=customerNotifications.map(n=>`<article class="customer-notice ${n.is_read?'':'unread'}"><span class="customer-notice-icon">🔔</span><div class="customer-notice-main"><b>${esc(n.title||'إشعار من BELDI BY FATY')}</b><p>${esc(n.body||'')}</p><small>${n.created_at?new Date(n.created_at).toLocaleString('ar-MA'):''}</small></div>${n.is_read?'':'<button class="customer-notice-read" type="button" onclick="markCustomerNotificationRead(\''+esc(n.id)+'\')">تمت القراءة</button>'}</article>`).join('')||'<div class="notification-empty">🌸 ما عندك حتى إشعار دابا. أي جديد على طلباتكِ غادي يبان هنا.</div>';
}
async function markCustomerNotificationRead(id){
 if(!db||!currentCustomer)return;
 const {error}=await db.from('customer_notifications').update({is_read:true}).eq('id',id).eq('user_id',currentCustomer.id);
 if(error){toast('تعذر تحديث الإشعار');return;}
 const item=customerNotifications.find(n=>String(n.id)===String(id));if(item)item.is_read=true;updateNotificationBadge();loadCustomerNotifications();
}
async function markAllCustomerNotificationsRead(){
 if(!db||!currentCustomer)return;
 const {error}=await db.from('customer_notifications').update({is_read:true}).eq('user_id',currentCustomer.id).eq('is_read',false);
 if(error){toast('تعذر تحديث الإشعارات');return;}
 customerNotifications=customerNotifications.map(n=>({...n,is_read:true}));updateNotificationBadge();loadCustomerNotifications();
}
function subscribeCustomerNotifications(){
 if(!db||!currentCustomer)return;
 if(notificationChannel){db.removeChannel(notificationChannel);notificationChannel=null;}
 notificationChannel=db.channel('customer-notifications-'+currentCustomer.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_notifications',filter:'user_id=eq.'+currentCustomer.id},payload=>{
  const n=payload.new;if(!n)return;customerNotifications=[n,...customerNotifications.filter(x=>x.id!==n.id)].slice(0,50);updateNotificationBadge();if(!$('#accountNotificationsSection')?.hidden)loadCustomerNotifications();toast('🔔 عندك إشعار جديد من BELDI BY FATY');
 }).subscribe();
}
function showAccountState(){const signed=!!currentCustomer;$('#accountGuest').hidden=signed;$('#accountMember').hidden=!signed;const accountLabel=$('#accountOpen')?.querySelector('.drawer-account-label');if(accountLabel)accountLabel.textContent='حسابي';if(signed){$('#accountWelcome').textContent=`مرحباً ${customerProfile?.fullname||currentCustomer.email||'بكِ'} 🌸`;const f=$('#accountProfileForm');['fullname','phone','address','city'].forEach(k=>f.elements[k].value=customerProfile?.[k]||'');}}
async function loadCustomerProfile(){if(!db||!currentCustomer)return;const {data,error}=await db.from('customer_profiles').select('fullname,phone,address,city').eq('user_id',currentCustomer.id).maybeSingle();if(error){console.warn('profile load',error.message);return;}customerProfile=data||{};showAccountState();}
async function syncCustomerFavorites(){
 if(!db||!currentCustomer){clearCustomerFavorites();return;}
 const {data,error}=await db.from('customer_favorites').select('product_id').eq('user_id',currentCustomer.id);
 if(error){console.warn('favorites sync',error.message);toast('تعذر تحميل المفضلة حالياً');return;}
 wishlistIds=(data||[]).map(x=>String(x.product_id));
 updateWishlistButton();renderProducts();
}
async function loadCustomerOrders(){const box=$('#accountOrdersList');if(!box||!db||!currentCustomer)return;box.textContent='جاري تحميل الطلبات…';const {data,error}=await db.from('orders').select('id,created_at,status,total,customer_name,city').eq('customer_id',currentCustomer.id).order('created_at',{ascending:false}).limit(30);if(error){box.textContent='تعذر تحميل الطلبات. تأكدي من تنفيذ تحديث قاعدة البيانات.';return;}box.innerHTML=(data||[]).map(o=>`<article style="padding:12px;border:1px solid #eadcc5;border-radius:12px;margin:8px 0"><b>طلب #${esc(String(o.id).slice(0,8))}</b><div>${esc(o.status||'جديد')} · ${esc(o.city||'')}</div><div>${money(o.total)} · ${o.created_at?new Date(o.created_at).toLocaleDateString('ar-MA'):''}</div></article>`).join('')||'مازال ما عندك حتى طلب محفوظ في الحساب.';}
async function loadCustomerLoyalty(){const pointsEl=$('#customerLoyaltyPoints'),hint=$('#customerLoyaltyHint');if(!pointsEl)return;if(!db||!currentCustomer){pointsEl.textContent='0';return;}pointsEl.textContent='…';const {data,error}=await db.from('customer_loyalty_points').select('points').eq('user_id',currentCustomer.id);if(error){console.warn('loyalty load',error.message);pointsEl.textContent='—';if(hint)hint.textContent='تعذر تحميل نقاطكِ حالياً. حاولي تحديث الصفحة.';return;}const total=(data||[]).reduce((sum,row)=>sum+(Number(row.points)||0),0);pointsEl.textContent=total.toLocaleString('ar-MA');if(hint)hint.textContent='كل 10 DH من ثمن المنتجات = نقطة واحدة. كتزاد النقاط غير من بعد تسليم الطلبية.';}

async function accountSignOut(){if(!db)return;if(notificationChannel){db.removeChannel(notificationChannel);notificationChannel=null;}const {error}=await db.auth.signOut();if(error){toast('تعذر تسجيل الخروج');return;}currentCustomer=null;customerProfile=null;clearCustomerFavorites();showAccountState();closeAccount();toast('تم تسجيل الخروج');}
$('#accountForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!db){$('#accountMessage').textContent='الحسابات تحتاج ربط Supabase.';return;}const f=new FormData(e.currentTarget),email=String(f.get('email')||'').trim(),password=String(f.get('password')||''),name=String(f.get('fullname')||'').trim();$('#accountSubmit').disabled=true;$('#accountMessage').textContent='جاري المعالجة…';try{let result;if(accountMode==='signup'){result=await db.auth.signUp({email,password,options:{data:{fullname:name}}});}else result=await db.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(result.data.user){currentCustomer=result.data.user;if(accountMode==='signup'&&!result.data.session){$('#accountMessage').textContent='تم إنشاء الحساب. افتحي بريدك الإلكتروني لتأكيد الحساب ثم سجلي الدخول.';return;}if(name)customerProfile={...(customerProfile||{}),fullname:name};await loadCustomerProfile();if(name&&!customerProfile?.fullname){customerProfile={...(customerProfile||{}),fullname:name};}await syncCustomerFavorites();showAccountState();$('#accountMessage').textContent='';toast(accountMode==='signup'?'مرحبا بكِ في BELDI BY FATY':'تم تسجيل الدخول بنجاح');} }catch(err){$('#accountMessage').textContent=err.message||'تعذر إتمام العملية.';}finally{$('#accountSubmit').disabled=false;}});
$('#accountProfileForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!db||!currentCustomer)return;const f=new FormData(e.currentTarget),row={user_id:currentCustomer.id,fullname:String(f.get('fullname')||'').trim(),phone:String(f.get('phone')||'').trim(),address:String(f.get('address')||'').trim(),city:String(f.get('city')||'').trim(),updated_at:new Date().toISOString()};const {error}=await db.from('customer_profiles').upsert(row,{onConflict:'user_id'});if(error){toast('تعذر حفظ المعلومات: '+error.message);return;}customerProfile=row;showAccountState();toast('تحفظات معلوماتك بنجاح');});
async function initCustomerAccount(){
 if(!db)return;
 const {data}=await db.auth.getSession();currentCustomer=data?.session?.user||null;
 if(currentCustomer){await loadCustomerProfile();await syncCustomerFavorites();await loadCustomerNotifications();await loadCustomerLoyalty();subscribeCustomerNotifications();}
 showAccountState();
 db.auth.onAuthStateChange((_event,session)=>{
  currentCustomer=session?.user||null;
  if(currentCustomer){setTimeout(async()=>{await loadCustomerProfile();await syncCustomerFavorites();await loadCustomerNotifications();await loadCustomerLoyalty();subscribeCustomerNotifications();showAccountState();},0);}
  else{customerProfile=null;customerNotifications=[];clearCustomerFavorites();const pointsEl=$('#customerLoyaltyPoints');if(pointsEl)pointsEl.textContent='0';if(notificationChannel){db.removeChannel(notificationChannel);notificationChannel=null;}updateNotificationBadge();showAccountState();}
 });
}

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}
const DEFAULT_SHIPPING_RATES={
 'الناظور':20,'تاويمة':20,'العروي':20,'بني أنصار':20,'سلوان':20,'فركانة':20,'رأس الماء':35,'زايو':30,'بركان':30,'الدريوش':25,'وجدة':30,'جرسيف':40,'تاوريرت':40,'فاس':42,'مكناس':42,'الرباط':35,'سلا':45,'الدار البيضاء':45,'المحمدية':43,'القنيطرة':40,'طنجة':45,'تطوان':45,'شفشاون':45,'الحسيمة':39,'مراكش':39,'أكادير':40,'الجديدة':45,'آسفي':45,'بني ملال':40,'خريبكة':40,'سطات':45,'العيون':50,'الداخلة':45,'ورزازات':45,'الرشيدية':45,'أزغنغان':20,'إعزانن':20,'إحدادن':20,'إكسن':20,'بني بويفرور':25,'بوعرك':25,'بويافر':30,'دار الكبداني':30,'ميدار':25,'تمسمان':30,'تافرسيت':30,'تيزطوطين':20,'حاسي بركان':20,'أولاد ستوت':20
};
let shippingRates={...DEFAULT_SHIPPING_RATES};
let cityNames=Object.keys(DEFAULT_SHIPPING_RATES);
function shippingFee(city){return Number(shippingRates[city]??35)}
function fillCitySelects(){const opts='<option value="">اختاري مدينتكِ</option>'+cityNames.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');const order=$('#orderCity');if(order){const old=order.value;order.innerHTML=opts;if(cityNames.includes(old))order.value=old;}const service=$('#serviceCity');if(service){const old=service.value;service.innerHTML=opts;if(cityNames.includes(old))service.value=old;}}
let storeMessages={announcement:'✨ توصيل لجميع مدن المغرب • الدفع عند الاستلام • مرحباً بكِ في عالم الأناقة المغربية',thankyou:'شكراً على ثقتكِ في BELDI BY FATY 💛 توصلنا بطلبكِ، وسنتواصل معكِ هاتفياً لتأكيده.'};
async function loadStoreMessages(){if(!db)return;try{const {data,error}=await db.from('site_settings').select('key,value').in('key',['store_announcement','order_thankyou']);if(error)throw error;for(const row of data||[]){if(row.key==='store_announcement'&&typeof row.value==='string'&&row.value.trim())storeMessages.announcement=row.value.trim();if(row.key==='order_thankyou'&&typeof row.value==='string'&&row.value.trim())storeMessages.thankyou=row.value.trim();}const top=document.getElementById('storeAnnouncement'),clone=document.getElementById('storeAnnouncementClone');if(top)top.textContent=storeMessages.announcement;if(clone)clone.textContent=storeMessages.announcement;}catch(e){console.warn('Store messages unavailable:',e.message)}}
async function loadShippingRates(){if(db){try{const {data,error}=await db.from('site_settings').select('value').eq('key','shipping_rates').maybeSingle();if(!error&&data?.value&&typeof data.value==='object'){shippingRates={...DEFAULT_SHIPPING_RATES,...data.value};cityNames=Object.keys(shippingRates);}}catch(e){console.warn('Shipping settings unavailable',e)}}fillCitySelects();}
function openService(kind){const modal=$('#serviceModal'),title=$('#serviceTitle'),body=$('#serviceBody');if(!modal||!body)return;
 if(kind==='shipping'){title.textContent='التوصيل لجميع المدن';body.innerHTML=`<p class="service-copy">اختاري المدينة باش تشوفي ثمن التوصيل التقديري. كنأكدو المصاريف ومدة الوصول معاكِ قبل إرسال الطلب.</p><div class="service-form"><label for="serviceCity">المدينة</label><select id="serviceCity" onchange="showShippingRate()"></select></div><div id="shippingResult" class="shipping-result">اختاري المدينة لعرض ثمن التوصيل.</div><div class="service-note">الأثمنة حسب لائحة ELMEXPRESS المنشورة، وقد تختلف حسب شروط التعاقد والوزن والخدمات الإضافية. أكدي الثمن النهائي قبل الشحن.</div>`;fillCitySelects();}
 else if(kind==='cod'){title.textContent='الدفع عند الاستلام';body.innerHTML=`<div class="service-copy"><p>الدفع عند الاستلام يعني أنكِ كتطلبي القفطان دابا، وكتخلصي ملي يوصلكِ الطلب.</p><div class="service-rate"><span>ثمن المنتجات</span><b>حسب طلبكِ</b></div><div class="service-rate"><span>مصاريف التوصيل</span><b>حسب المدينة</b></div><div class="service-rate"><span>طريقة الأداء</span><b>نقداً عند التسليم</b></div><p>ما محتاجاش تدخلي معلومات البطاقة البنكية. قبل إرسال الطلب، كنراجعو معاكِ اللون والمقاس والعنوان والمبلغ الإجمالي.</p></div><div class="service-note">التوصيل والطلب كيتأكدو هاتفياً. إذا كان عندك سؤال حول الطلب، تواصلي معنا عبر خدمة الزبونات.</div>`;}
 else {title.textContent='خدمة الزبونات';body.innerHTML=`<p class="service-copy">عندك سؤال على منتج، التوصيل، الطلب أو الإرجاع؟ عمّري الاستمارة وغادي نتوصلو برسالتكِ.</p><form class="service-form" id="supportForm"><div><label>الاسم الكامل *</label><input name="customer_name" required maxlength="100" placeholder="الاسم والنسب"></div><div><label>رقم الهاتف *</label><input name="phone" required inputmode="tel" pattern="[0-9+ ]{9,15}" placeholder="06XXXXXXXX"></div><div><label>البريد الإلكتروني (اختياري)</label><input name="email" type="email" placeholder="name@example.com"></div><div><label>موضوع الرسالة *</label><select name="subject" required><option value="">اختاري الموضوع</option><option>استفسار عن منتج</option><option>تتبع طلب</option><option>التوصيل</option><option>الإرجاع أو الاستبدال</option><option>شكوى أو ملاحظة</option><option>موضوع آخر</option></select></div><div><label>الرسالة *</label><textarea name="message" required minlength="8" maxlength="2000" placeholder="كتبي لينا كيفاش نعاونوك..."></textarea></div><button class="btn gold" type="submit">إرسال الرسالة</button><div class="service-result" id="supportResult" aria-live="polite"></div></form><div class="service-note">رسالتكِ كتتحفظ في نظام المتجر لتتمكن الإدارة من متابعتها. للجواب السريع يمكنك استعمال زر واتساب.</div>`;$('#supportForm').addEventListener('submit',submitSupportMessage);}
 modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function closeService(){const m=$('#serviceModal');m?.classList.remove('show');m?.setAttribute('aria-hidden','true');document.body.style.overflow='';}
function showShippingRate(){const city=$('#serviceCity')?.value,out=$('#shippingResult');if(!out)return;if(!city){out.textContent='اختاري المدينة لعرض ثمن التوصيل.';return}out.innerHTML=`<div class="service-rate"><span>التوصيل إلى ${esc(city)}</span><b>${money(shippingFee(city))}</b></div><small>المدة المتوقعة كتتأكد مع شركة التوصيل عند تأكيد الطلب.</small>`;}
async function submitSupportMessage(e){e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button[type="submit"]'),result=$('#supportResult');if(!db){result.textContent='خاص ربط قاعدة البيانات باش نستقبلو الرسالة. يمكنك التواصل عبر واتساب حالياً.';return}const f=new FormData(form),payload={customer_name:String(f.get('customer_name')).trim(),phone:String(f.get('phone')).trim(),email:String(f.get('email')||'').trim()||null,subject:String(f.get('subject')),message:String(f.get('message')).trim(),status:'جديد'};btn.disabled=true;btn.textContent='جارٍ إرسال الرسالة…';try{const {error}=await db.from('support_messages').insert(payload);if(error)throw error;result.textContent='وصلاتنا رسالتكِ بنجاح. شكراً على تواصلكِ، غادي نراجعوها ونتاصلو بكِ.';form.reset();}catch(err){console.error(err);result.textContent='ما قدرناش نسجلو الرسالة دابا. تواصلي معنا عبر واتساب.';}finally{btn.disabled=false;btn.textContent='إرسال الرسالة';}}

function splitChoices(value){let a=Array.isArray(value)?value:(typeof value==='string'?[value]:[]);a=a.flatMap(x=>String(x||'').split(/[,،;؛\\n]+/)).map(x=>x.trim()).filter(Boolean);if(a.length===1 && /^(أسود|اسود|أزرق|ازرق|أحمر|احمر|بنفسجي|أخضر|اخضر|بيج|أبيض|ابيض)(\s+(أسود|اسود|أزرق|ازرق|أحمر|احمر|بنفسجي|أخضر|اخضر|بيج|أبيض|ابيض))+$/i.test(a[0]))a=a[0].split(/\s+/);return [...new Set(a)]}
function normalize(p){let imgs=p.images||[];if(typeof imgs==='string'){try{imgs=JSON.parse(imgs)}catch(e){imgs=[]}}return {...p,desc:p.description||p.desc||'',colors:splitChoices(p.colors),sizes:splitChoices(p.sizes),images:Array.isArray(imgs)?imgs:[],image:p.image_url||p.image||''}}
const PRODUCT_CACHE_KEY='beldi_products_v2';
const PRODUCT_CACHE_TTL=5*60*1000;
function readProductCache(){
 try{const raw=localStorage.getItem(PRODUCT_CACHE_KEY);if(!raw)return null;const item=JSON.parse(raw);return Array.isArray(item.data)?item:null}catch(_){return null}
}
function writeProductCache(data){
 try{localStorage.setItem(PRODUCT_CACHE_KEY,JSON.stringify({at:Date.now(),data}))}catch(_){}
}
async function fetchProductsFromDatabase(){
 const fields='id,name,price,discount_price,category,tag,description,colors,sizes,images,image_url,active,created_at,stock_quantity,is_sold_out';
 const all=[],pageSize=200,maxProducts=1000;
 for(let from=0;from<maxProducts;from+=pageSize){
  const {data,error}=await db.from('products').select(fields).eq('active',true).order('created_at',{ascending:false}).range(from,from+pageSize-1);
  if(error)throw error;
  const page=data||[];all.push(...page);
  if(page.length<pageSize)break;
 }
 return all.map(normalize);
}
async function loadProducts(){
 if(!db){
  products=[{id:'demo1',name:'قفطان مغربي أنيق',category:'قفطان',price:350,tag:'الأكثر طلباً',desc:'قفطان بلمسة تقليدية راقية، مناسب للمناسبات.',colors:['أسود','أحمر','أزرق','بنفسجي'],sizes:['S','M','L','XL'],image:''},{id:'demo2',name:'جلابة مغربية عصرية',category:'جلابة',price:290,tag:'جديد',desc:'جلابة أنيقة تجمع الراحة والجمال المغربي.',colors:['بيج','أخضر','أسود'],sizes:['M','L','XL','XXL'],image:''}];
  renderProducts();return;
 }
 const cached=readProductCache();
 if(cached?.data?.length){products=cached.data.map(normalize);renderProducts();}
 try{
  const fresh=await fetchProductsFromDatabase();
  products=fresh;
  try{const stockResult=await db.from('product_variant_stock').select('product_id,color,size,quantity');variantStock=stockResult.error?[]:(stockResult.data||[]);}catch(_){variantStock=[]}
  writeProductCache(fresh);renderProducts();
 }catch(error){
  console.error('Product loading failed:',error);
  if(!cached)toast('تعذر تحميل المنتجات. تحققي من الاتصال بالإنترنت.');
  else toast('نعرض آخر نسخة محفوظة من المنتجات مؤقتاً.');
 }
}

const CATEGORY_META={'قفطان':['👑','أناقة القفطان المغربي'],'تكشيطة':['✨','تفاصيل المناسبات الفاخرة'],'جلابة':['🌿','راحة وأناقة يومية'],'جبادور':['🧵','لمسة تقليدية راقية'],'قندورة':['🌸','إطلالة بسيطة وأنيقة'],'ملحفة':['🪡','جمال الزي المغربي'],'لباس تقليدي آخر':['💛','اختيارات مغربية متنوعة']};
function productCard(p){const rawId=String(p.id),id=rawId.replace(/'/g,"&#39;"),off=discountPercent(p),tracked=p.stock_quantity!==null&&p.stock_quantity!==undefined,qty=Number(p.stock_quantity),soldOut=p.is_sold_out===true||(tracked&&qty<=0),liked=wishlistIds.includes(rawId);return `<article class="product"><div class="photo" onclick="openDetail('${id}')">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async" fetchpriority="low" width="600" height="750">`:`<div class="placeholder">BELDI<br>BY FATY</div>`}<span class="tag">${esc(p.tag||p.category)}</span>${off?`<span class="sale-badge">-${off}% تخفيض</span>`:''}${soldOut?'<span class="sale-badge" style="background:#555">نفد المخزون</span>':''}</div><div class="pbody"><h3 onclick="openDetail('${id}')">${esc(p.name)}</h3><div class="desc" onclick="openDetail('${id}')">${esc(p.desc||'أناقة مغربية بلمسة عصرية')}</div>${tracked&&!soldOut&&qty<=3?`<small style="color:#9a6428">باقي ${qty} فقط</small>`:''}${priceMarkup(p)}<div class="pactions"><button class="btn dark" onclick="openDetail('${id}')">اختاري التفاصيل</button><button class="btn outline" ${soldOut?'disabled':''} onclick="quickBuy('${id}')">${soldOut?'غير متوفر':'اطلبي الآن'}</button></div>${soldOut?`<button class="beldi-restock-btn" type="button" onclick="event.stopPropagation();requestRestockAlert('${id}')">🔔 نبّهيني ملي يرجع</button>`:''}<div class="beldi-favorite-row"><button class="beldi-heart ${liked?'is-liked':''}" type="button" aria-label="${liked?'إزالة من المفضلة':'إضافة للمفضلة'}" aria-pressed="${liked}" onclick="event.stopPropagation();toggleFavorite('${id}')" title="المفضلة">${liked?'♥':'♡'} <span>${liked?'في المفضلة':'أضيفي للمفضلة'}</span></button></div></div></article>`}
function renderProducts(){
 renderCategoryFilters();
 const source=showWishlistOnly?products.filter(p=>wishlistIds.includes(String(p.id))):products;
 const list=source.filter(p=>filter==='الكل'||(filter==='جديد'?p.tag==='جديد':p.category===filter));
 const main=$('#products'), grouped=$('#categoryCollections');
 if(filter==='الكل'&&!showWishlistOnly){
  main.style.display='none';
  const cats=[...new Set(source.map(p=>String(p.category||'لباس تقليدي آخر').trim()).filter(Boolean))];
  grouped.innerHTML=cats.map(cat=>{const items=products.filter(p=>(p.category||'لباس تقليدي آخر')===cat);const meta=CATEGORY_META[cat]||['🧵','تشكيلة مختارة بعناية'];return `<section class="collection-block" id="collection-${encodeURIComponent(cat)}"><div class="collection-title"><div><h3>${meta[0]} ${esc(cat)}</h3><span>${esc(meta[1])}</span></div><button class="btn outline" onclick="setFilter('${esc(cat)}')">شاهدي الكل ←</button></div><div class="grid">${items.slice(0,4).map(productCard).join('')}</div></section>`}).join('')||'<p style="text-align:center;color:#786f64">قريباً سنضيف تشكيلتنا الجديدة.</p>';
 }else{main.style.display='grid';grouped.innerHTML='';main.innerHTML=list.map(productCard).join('')||'<p style="grid-column:1/-1;text-align:center;color:#877">لا توجد منتجات في هذا القسم حالياً.</p>';}
 renderWishlistPanel();
}
function renderCategoryFilters(){
 const box=$('#categoryFilters');if(!box)return;
 const cats=[...new Set(products.map(p=>String(p.category||'لباس تقليدي آخر').trim()).filter(Boolean))];
 const choices=[['الكل','كل المجموعات'],...cats.map(c=>[c,c]),['جديد','وصل حديثاً']];
 box.innerHTML=choices.map(([v,label])=>`<button class="filter ${filter===v?'active':''}" onclick="setFilter('${esc(v)}',this)">${esc(label)}</button>`).join('');
 const tiles=$('#categoryTiles');
 if(tiles)tiles.innerHTML=cats.map(cat=>{const meta=CATEGORY_META[cat]||['🧵','تشكيلة مختارة'];const count=products.filter(p=>(p.category||'لباس تقليدي آخر')===cat).length;return `<a class="categorytile" href="#shop" onclick="setFilter('${esc(cat)}')"><span class="caticon">${meta[0]}</span><b>${esc(cat)}</b><small>${count} منتجات · اكتشفي المجموعة</small></a>`}).join('')||Object.entries(CATEGORY_META).map(([cat,m])=>`<a class="categorytile" href="#shop" onclick="setFilter('${esc(cat)}')"><span class="caticon">${m[0]}</span><b>${esc(cat)}</b><small>قريباً</small></a>`).join('');
}
function setFilter(v,b){filter=v;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x.textContent.trim()===(v==='الكل'?'كل المجموعات':v==='جديد'?'وصل حديثاً':v)));renderProducts();}

let detailProduct=null,detailColor='',detailSize='',detailImageIndex=0;
function productImages(p){let arr=Array.isArray(p.images)?p.images:(typeof p.images==='string'?(()=>{try{return JSON.parse(p.images)}catch(e){return []}})():[]);arr=arr.map(x=>typeof x==='string'?x:(x?.url||x?.image_url||'' )).filter(Boolean);if(p.image&&!arr.includes(p.image))arr.unshift(p.image);return arr;}
function colorImage(p,color){const idx=(p.colors||[]).findIndex(c=>c===color);const imgs=productImages(p);return idx>=0&&imgs[idx]?imgs[idx]:(imgs[0]||'assets/logo.webp')}
function openDetail(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;detailProduct=p;detailColor=p.colors?.[0]||'غير محدد';detailSize=p.sizes?.[0]||'غير محدد';detailImageIndex=0;const imgs=productImages(p);$('#detailName').textContent=p.name;$('#detailPrice').innerHTML=discountPercent(p)?`<div class="detail-sale"><strong>${money(salePrice(p))}</strong><del>${money(p.price)}</del><span class="sale-badge" style="position:static">-${discountPercent(p)}% تخفيض</span></div>`:money(p.price);$('#detailDesc').textContent=p.desc||'أناقة مغربية بلمسة عصرية، اختاري اللون والمقاس المناسب لكِ.';if($('#detailLongDesc'))$('#detailLongDesc').textContent=p.desc||'تصميم مغربي أنيق بتفاصيل مختارة بعناية.';$('#detailQty').value=1;$('#detailMain').src=colorImage(p,detailColor);$('#detailMain').alt=p.name;$('#detailThumbs').innerHTML=imgs.map((u,i)=>`<button class="${i===0?'active':''}" onclick="selectDetailImage(${i})"><img src="${esc(u)}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="90" height="110"></button>`).join('');$('#detailThumbs').style.display=imgs.length>1?'flex':'none';renderDetailChoices();const restockBox=$('#detailRestockAlert');if(restockBox){const out=p.is_sold_out===true||(p.stock_quantity!==null&&p.stock_quantity!==undefined&&Number(p.stock_quantity)<=0);restockBox.hidden=!out;restockBox.innerHTML='';if(out){const alertButton=document.createElement('button');alertButton.type='button';alertButton.className='beldi-restock-btn';alertButton.textContent='🔔 نبّهيني ملي يرجع المنتج';alertButton.addEventListener('click',()=>requestRestockAlert(p.id));restockBox.appendChild(alertButton);}}loadProductReviews(p.id);$('#detailModal').classList.add('show');$('#detailModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function selectDetailImage(i){const imgs=productImages(detailProduct);if(!imgs[i])return;detailImageIndex=i;$('#detailMain').src=imgs[i];document.querySelectorAll('#detailThumbs button').forEach((b,n)=>b.classList.toggle('active',n===i));}
function colorHex(v){const x=String(v).toLowerCase();if(x.includes('أسود')||x.includes('اسود'))return '#211e1b';if(x.includes('أزرق')||x.includes('ازرق')||x.includes('كحلي'))return '#24558f';if(x.includes('أحمر')||x.includes('احمر')||x.includes('عنابي'))return '#8d1e32';if(x.includes('بنفسجي')||x.includes('ليلكي'))return '#75416f';if(x.includes('أخضر')||x.includes('اخضر')||x.includes('زيتي'))return '#54734a';if(x.includes('بيج')||x.includes('كريمي'))return '#c9b99a';if(x.includes('أبيض')||x.includes('ابيض'))return '#f4f0e8';if(x.includes('وردي')||x.includes('زهري'))return '#e78ca5';if(x.includes('ذهبي'))return '#c6a04a';if(x.includes('فضي')||x.includes('رمادي'))return '#b9bec5';if(x.includes('بني'))return '#79513b';if(x.includes('تركواز'))return '#36aaa5';if(x.includes('برتقالي'))return '#e98732';if(x.includes('أصفر')||x.includes('اصفر'))return '#f1d34f';return '#b69a68'}
function selectedVariantStock(){return variantStock.find(x=>String(x.product_id)===String(detailProduct?.id)&&x.color===detailColor&&x.size===detailSize)}
function renderDetailChoices(){const colors=detailProduct.colors?.length?detailProduct.colors:['غير محدد'];const sizes=detailProduct.sizes?.length?detailProduct.sizes:['غير محدد'];const hasTracked=variantStock.some(x=>String(x.product_id)===String(detailProduct.id));$('#detailColors').innerHTML=colors.map(v=>`<button class="colorchip ${v===detailColor?'selected':''}" onclick="detailColor='${esc(v).replace(/'/g,"&#39;")}';$('#detailMain').src=colorImage(detailProduct,detailColor);renderDetailChoices()"><span class="swatch" style="--swatch:${colorHex(v)}"></span>${esc(v)}</button>`).join('');$('#detailSizes').innerHTML=sizes.map(v=>{const row=variantStock.find(x=>String(x.product_id)===String(detailProduct.id)&&x.color===detailColor&&x.size===v);const unavailable=hasTracked&&(!row||Number(row.quantity)<=0);return `<button class="${v===detailSize?'selected':''}" ${unavailable?'disabled':''} onclick="detailSize='${esc(v).replace(/'/g,"&#39;")}';renderDetailChoices()">${esc(v)}${hasTracked?` · ${row?Number(row.quantity):0}`:''}</button>`}).join('');const row=selectedVariantStock(),hint=$('#variantStockHint');if(hint){hint.textContent=hasTracked?(row&&Number(row.quantity)>0?`متوفر: باقي ${row.quantity} قطعة من ${detailColor} / ${detailSize}`:`نفد هذا اللون أو المقاس`):'';hint.style.color=row&&Number(row.quantity)>0?'#39734b':'#9b3030';}}
function closeDetail(){$('#detailModal').classList.remove('show');$('#detailModal').setAttribute('aria-hidden','true');document.body.style.overflow='';}
function detailAddToCart(buy){if(!detailProduct)return;if(detailProduct.is_sold_out===true){toast('سمحي لينا، هاد المنتج نفد حالياً.');return}const hasVariantTracking=variantStock.some(x=>String(x.product_id)===String(detailProduct.id));if(hasVariantTracking){const row=selectedVariantStock();if(!row||Number(row.quantity)<=0){toast('سمحي لينا، هاد اللون أو المقاس سالا من المخزون.');return}const wanted=Math.max(1,Number($('#detailQty').value)||1);if(wanted>Number(row.quantity)){toast(`المتوفر غير ${row.quantity} قطعة من هاد الاختيار.`);return}}if(detailProduct.stock_quantity!==null&&detailProduct.stock_quantity!==undefined&&Number(detailProduct.stock_quantity)<=0){toast('سمحي لينا، هاد المنتج سالا من المخزون.');return}const qty=Math.max(1,Math.min(20,Number($('#detailQty').value)||1));if(detailProduct.stock_quantity!==null&&detailProduct.stock_quantity!==undefined&&qty>Number(detailProduct.stock_quantity)){toast(`المتوفر غير ${Number(detailProduct.stock_quantity)} قطعة.`);return}const existing=cart.find(x=>String(x.id)===String(detailProduct.id)&&x.color===detailColor&&x.size===detailSize);if(existing)existing.qty+=qty;else cart.push({id:detailProduct.id,qty,color:detailColor,size:detailSize});updateCount();closeDetail();toast('تضاف المنتج للسلة بنجاح');if(buy)openCart();}

function addToCart(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;const old=cart.find(x=>String(x.id)===String(id));if(old)old.qty++;else cart.push({id:p.id,qty:1,color:p.colors?.[0]||'غير محدد',size:p.sizes?.[0]||'غير محدد'});updateCount();toast('تضاف المنتج للسلة بنجاح')}
function quickBuy(id){cart=[];addToCart(id);openCart()}
function updateCount(){$('#cartCount').textContent=cart.reduce((a,x)=>a+x.qty,0);try{localStorage.setItem('beldi_cart',JSON.stringify(cart))}catch(_){}}
function openCart(){if(!cart.length){toast('السلة فارغة، اختاري منتجاً أولاً');return}fillCitySelects();renderCart();$('#cartModal').classList.add('show')}
function closeCart(){$('#cartModal').classList.remove('show')}
function changeCartQty(index,delta){
 const item=cart[index];if(!item)return;
 item.qty=Math.max(1,Math.min(20,(Number(item.qty)||1)+delta));
 updateCount();renderCart();
}
function removeCartItem(index){
 cart.splice(index,1);updateCount();
 if(!cart.length){closeCart();toast('تحيدات جميع المنتجات من السلة');return;}
 renderCart();
}
function renderCart(){
 let total=0;
 const rows=cart.map((c,i)=>{
  const p=products.find(x=>String(x.id)===String(c.id));if(!p)return '';
  const line=salePrice(p),regular=Number(p.price)||0;total+=line*c.qty;
  const img=p.image||productImages(p)[0]||'assets/logo.webp';
  return `<article class="cart-item">
    <div class="cart-item-image"><img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" decoding="async"></div>
    <div class="cart-item-info">
      <div class="cart-item-top"><h4>${esc(p.name)}</h4><button type="button" class="cart-remove" aria-label="حذف ${esc(p.name)}" onclick="removeCartItem(${i})">حذف</button></div>
      <strong class="cart-item-price">${money(line)} ${line<regular?`<del>${money(regular)}</del>`:''}</strong>${line<regular?`<div class="cart-saving">وفرتِ ${money((regular-line)*c.qty)} (${discountPercent(p)}%)</div>`:''}
      <div class="cart-options">
       <label>اللون<select onchange="cart[${i}].color=this.value">${(p.colors?.length?p.colors:['غير محدد']).map(v=>`<option value="${esc(v)}" ${v===c.color?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
       <label>المقاس<select onchange="cart[${i}].size=this.value">${(p.sizes?.length?p.sizes:['غير محدد']).map(v=>`<option value="${esc(v)}" ${v===c.size?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
      </div>
      <div class="cart-item-bottom"><div class="cart-qty"><button type="button" aria-label="إنقاص الكمية" onclick="changeCartQty(${i},-1)">−</button><span>${c.qty}</span><button type="button" aria-label="زيادة الكمية" onclick="changeCartQty(${i},1)">+</button></div><b class="cart-line-total">${money(line*c.qty)}</b></div>
    </div>
  </article>`;
 }).join('');
 $('#cartContents').innerHTML=`<div class="cart-items">${rows}</div>
 <section class="cart-total-card"><div><span>عدد القطع</span><b>${cart.reduce((n,x)=>n+x.qty,0)}</b></div><label style="display:block;margin-top:10px;font-size:12px;font-weight:700">مدينة التوصيل<select class="cart-shipping-select" id="cartCity" onchange="updateOrderTotals()"><option value="">اختاري المدينة في استمارة الطلب</option>${cityNames.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label><div class="cart-total-main"><span>مجموع المنتجات</span><strong>${money(total)}</strong></div><div class="cart-total-main"><span>التوصيل</span><strong id="cartShipping">يحدد حسب المدينة</strong></div><div class="cart-total-main"><span>المجموع مع التوصيل</span><strong id="cartGrandTotal">${money(total)}</strong></div><small>التوصيل تقديري ويُؤكد هاتفياً قبل الشحن.</small></section>`;
 const orderCity=$('#orderCity')?.value||'';if($('#cartCity'))$('#cartCity').value=orderCity;updateOrderTotals();
}
function updateOrderTotals(){const city=$('#orderCity')?.value||$('#cartCity')?.value||'';const subtotal=cart.reduce((n,c)=>{const p=products.find(x=>String(x.id)===String(c.id));return n+(p?salePrice(p)*c.qty:0)},0);const fee=city?shippingFee(city):0;if($('#cartShipping'))$('#cartShipping').textContent=city?money(fee):'يحدد حسب المدينة';if($('#cartGrandTotal'))$('#cartGrandTotal').textContent=money(subtotal+fee);if($('#orderTotals'))$('#orderTotals').innerHTML=`🔒 الدفع عند الاستلام<br><b>مجموع المنتجات: ${money(subtotal)}</b><br><b>التوصيل: ${city?money(fee):'اختاري المدينة'}</b><br><b>المجموع النهائي: ${money(subtotal+fee)}</b><br><span class="muted">المصاريف تقديرية وتُؤكد قبل الشحن.</span>`;}
function syncCartCity(){const city=$('#cartCity')?.value||'';if($('#orderCity'))$('#orderCity').value=city;updateOrderTotals()}
$('#orderCity')?.addEventListener('change',()=>{const cc=$('#cartCity');if(cc)cc.value=$('#orderCity').value;updateOrderTotals()});
let orderSubmitting=false;
$('#orderForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(orderSubmitting)return;
 if(!cart.length)return toast('السلة فارغة');
 const form=e.currentTarget,submitBtn=form.querySelector('button[type="submit"]');
 const f=new FormData(form);
 const items=cart.map(c=>{const p=products.find(x=>String(x.id)===String(c.id));if(!p)return null;const unit=salePrice(p);return {product_id:String(c.id),product_name:p.name,unit_price:unit,original_price:Number(p.price)||unit,discount_amount:Math.max(0,(Number(p.price)||unit)-unit),color:c.color,size:c.size,quantity:c.qty,line_total:unit*c.qty}}).filter(Boolean);
 if(!items.length)return toast('تعذر العثور على المنتجات في السلة. حدّثي الصفحة.');
 const subtotal=items.reduce((n,x)=>n+x.line_total,0);const city=String(f.get('city')||'').trim();if(!city){toast('اختاري المدينة قبل تأكيد الطلب');return}const deliveryFee=shippingFee(city);const total=subtotal+deliveryFee;
 const order={...(currentCustomer?{customer_id:currentCustomer.id}:{}),shipping_fee:deliveryFee,customer_name:String(f.get('fullname')||'').trim(),phone:String(f.get('phone')||'').trim(),address:String(f.get('address')||'').trim(),city:String(f.get('city')||'').trim(),note:String(f.get('note')||'').trim(),items,total,payment_method:'الدفع عند الاستلام',status:'جديد'};
 orderSubmitting=true;if(submitBtn){submitBtn.disabled=true;submitBtn.dataset.originalText=submitBtn.textContent;submitBtn.textContent='جارٍ تجهيز الطلب…'}
 const wa=window.open('about:blank','_blank');
 try{
  let saved=false;
  if(db){
   const {error}=await db.from('orders').insert(order);
   if(error){console.error(error);toast('تعذر حفظ الطلب في النظام. يمكنك إرساله عبر واتساب.')}
   else saved=true;
  }else toast('تنبيه: المتجر في وضع المعاينة ولم تُفعّل قاعدة البيانات بعد.');
  const lines=items.map(x=>`${x.product_name} | اللون: ${x.color} | المقاس: ${x.size} | الكمية: ${x.quantity} | ${money(x.line_total)}`).join('\n');
  const msg=`طلب جديد من BELDI BY FATY\nالاسم: ${order.customer_name}\nالهاتف: ${order.phone}\nالعنوان: ${order.address}\nالمدينة: ${order.city}\nالمنتجات:\n${lines}\nمجموع المنتجات: ${money(subtotal)}\nالتوصيل: ${money(deliveryFee)}\nالمجموع مع التوصيل: ${money(total)}\nالدفع: عند الاستلام\nملاحظة: ${order.note||'لا توجد'}`;
  const waUrl=`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
  if(wa&&!wa.closed)wa.location.href=waUrl;else window.location.href=waUrl;
  toast(storeMessages.thankyou);
  closeCart();cart=[];updateCount();form.reset();
 }catch(error){
  console.error('Order submission failed:',error);
  if(wa&&!wa.closed)wa.close();
  toast('وقع مشكل مؤقت أثناء إرسال الطلب. حاولي مرة أخرى.');
 }finally{
  orderSubmitting=false;if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=submitBtn.dataset.originalText||'تأكيد الطلب عبر واتساب'}
 }
});
let activeReviewProductId=null;
async function loadProductReviews(productId){
 activeReviewProductId=productId;
 const list=$('#reviewList'),summary=$('#reviewSummary');
 if(!list)return;
 list.innerHTML='<div class="reviewempty">جاري تحميل التعليقات…</div>';
 if(!db||typeof productId!=='string'||! /^[0-9a-f-]{36}$/i.test(productId)){
  list.innerHTML='<div class="reviewempty">التعليقات متاحة بعد ربط قاعدة البيانات وفتح منتوج حقيقي من المتجر.</div>';summary.textContent='';return;
 }
 const {data,error}=await db.from('product_reviews').select('customer_name,rating,comment,created_at').eq('product_id',productId).order('created_at',{ascending:false}).limit(50);
 if(error){console.error(error);list.innerHTML='<div class="reviewempty">تعذر تحميل التعليقات حالياً.</div>';return;}
 const rows=data||[];
 summary.textContent=rows.length?`${rows.length} تعليق(ات) من الزبونات`:'كوني أول من يشارك رأيه حول هذا المنتوج';
 list.innerHTML=rows.length?rows.map(r=>`<article class="reviewitem"><div class="reviewmeta"><b>${esc(r.customer_name)}</b><span class="reviewstars" aria-label="${Number(r.rating)} من 5">${'★'.repeat(Number(r.rating)||0)}${'☆'.repeat(5-(Number(r.rating)||0))}</span></div><p>${esc(r.comment)}</p><div class="muted">${r.created_at?new Date(r.created_at).toLocaleDateString('ar-MA'):''}</div></article>`).join(''):'<div class="reviewempty">لا توجد تعليقات بعد. اتركي أول تعليق!</div>';
}
$('#reviewForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!db){toast('التعليقات تحتاج إلى ربط قاعدة البيانات');return;}
 if(!activeReviewProductId||typeof activeReviewProductId!=='string'||! /^[0-9a-f-]{36}$/i.test(activeReviewProductId)){toast('افتحي منتوجاً منشوراً أولاً');return;}
 const name=$('#reviewName').value.trim(),comment=$('#reviewText').value.trim(),rating=Number($('#reviewRating').value);
 if(name.length<2||comment.length<3){toast('أدخلي الاسم والتعليق بشكل صحيح');return;}
 const btn=e.submitter;if(btn){btn.disabled=true;btn.textContent='جارٍ إرسال التعليق…';}
 const {error}=await db.from('product_reviews').insert({product_id:activeReviewProductId,customer_name:name,rating,comment});
 if(btn){btn.disabled=false;btn.textContent='إرسال التعليق';}
 if(error){console.error(error);toast('تعذر إرسال التعليق. تأكدي من تشغيل تحديث التعليقات في Supabase.');return;}
 $('#reviewText').value='';toast('شكراً لكِ! تم إرسال تعليقكِ');await loadProductReviews(activeReviewProductId);
});

if(!configured)toast('نسخة تجريبية: اربطي قاعدة البيانات لتفعيل الإدارة والطلبات');loadStoreMessages();loadProducts();initCustomerAccount();updateCount();

loadShippingRates();
$('#serviceModal')?.addEventListener('click',e=>{if(e.target.id==='serviceModal')closeService()});
