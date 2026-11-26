const cfg=window.BELDI_SUPABASE_URL?.startsWith('https://')&&window.BELDI_SUPABASE_ANON_KEY?.length>30&&!window.BELDI_SUPABASE_URL.includes('PASTE_');const sb=cfg&&window.supabase?.createClient?window.supabase.createClient(window.BELDI_SUPABASE_URL,window.BELDI_SUPABASE_ANON_KEY):null;const $=s=>document.querySelector(s);let products=[];

const COLOR_OPTIONS=[['أسود','#211e1b'],['أبيض','#f5f1e8'],['أحمر','#c62838'],['عنابي','#7b1834'],['وردي','#e78ca5'],['زهري فاتح','#f4c6d5'],['أزرق ملكي','#244b9b'],['أزرق سماوي','#79bde8'],['كحلي','#172b50'],['تركواز','#36aaa5'],['أخضر','#47764c'],['أخضر زمردي','#08785b'],['زيتي','#777b43'],['بنفسجي','#754477'],['ليلكي','#b69acb'],['بيج','#c9b99a'],['ذهبي','#c6a04a'],['فضي','#b9bec5'],['بني','#79513b'],['برتقالي','#e98732'],['أصفر','#f1d34f'],['رمادي','#888888'],['كريمي','#eee1c9'],['نحاسي','#ad7045']];
const SIZE_OPTIONS=['XS','S','M','L','XL','XXL','3XL','مقاس موحد'];
function selectedValues(name){return ($('#productForm').elements[name].value||'').split(/[,،;؛\n]+/).map(x=>x.trim()).filter(Boolean)}
function setSelectedValues(name,values){$('#productForm').elements[name].value=[...new Set(values)].join('، ');renderAdminPickers()}
function renderAdminPickers(){const colors=selectedValues('colors'),sizes=selectedValues('sizes'),cp=$('#adminColorPicker'),sp=$('#adminSizePicker');if(cp)cp.innerHTML=COLOR_OPTIONS.map(([n,h])=>`<button type="button" class="admin-color-option ${colors.includes(n)?'selected':''}" data-color="${esc(n)}"><span class="dot" style="background:${h}"></span>${n}</button>`).join('')+colors.filter(c=>!COLOR_OPTIONS.some(x=>x[0]===c)).map(n=>`<button type="button" class="admin-color-option selected" data-color="${esc(n)}"><span class="dot" style="background:#b58a43"></span>${esc(n)}</button>`).join('');if(sp)sp.innerHTML=SIZE_OPTIONS.map(n=>`<button type="button" class="admin-size-option ${sizes.includes(n)?'selected':''}" data-size="${n}">${n}</button>`).join('')+sizes.filter(n=>!SIZE_OPTIONS.includes(n)).map(n=>`<button type="button" class="admin-size-option selected" data-size="${esc(n)}">${esc(n)}</button>`).join('')}
$('#adminColorPicker')?.addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;const n=b.dataset.color,v=selectedValues('colors');setSelectedValues('colors',v.includes(n)?v.filter(x=>x!==n):[...v,n])});
$('#adminSizePicker')?.addEventListener('click',e=>{const b=e.target.closest('[data-size]');if(!b)return;const n=b.dataset.size,v=selectedValues('sizes');setSelectedValues('sizes',v.includes(n)?v.filter(x=>x!==n):[...v,n])});
$('#addCustomColor')?.addEventListener('click',()=>{const name=$('#customColorName').value.trim();if(!name)return msg('كتبي اسم اللون المخصص أولاً.');const v=selectedValues('colors');if(!v.includes(name))v.push(name);$('#customColorName').value='';setSelectedValues('colors',v);msg('تمت إضافة اللون.')});

const salePrice=p=>{const r=Number(p?.price)||0,d=Number(p?.discount_price)||0;return d>0&&d<r?d:r};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const money=n=>`${Number(n||0).toLocaleString('fr-FR')} DH`;const msg=(s)=>$('#productMsg').textContent=s;
async function sendCustomerPush(title,body){if(!sb)return;try{const {data,error}=await sb.functions.invoke('send-customer-push',{body:{title,body,url:'/'}});if(error)console.warn('Customer push not sent:',error.message);else console.info('Customer push result:',data)}catch(e){console.warn('Customer push not sent:',e)}}
async function compressProductImage(file){
 if(!file||!file.type.startsWith('image/'))throw new Error('الملف المختار ليس صورة.');
 if(!('createImageBitmap' in window))return file;
 let bitmap;
 try{bitmap=await createImageBitmap(file);const max=1600,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));return blob&&blob.size<file.size?blob:file}
 finally{bitmap?.close?.()}
}
if(!cfg){$('#loginMsg').textContent='قاعدة البيانات غير مربوطة بعد. اتبعي دليل SETUP-AR داخل المجلد.';$('#loginForm').querySelector('button').disabled=true;}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!sb)return;const f=new FormData(e.target);$('#loginMsg').textContent='جارٍ تسجيل الدخول...';const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error){$('#loginMsg').textContent='تعذر الدخول: '+error.message;return}await boot()});
$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
async function boot(){const {data:{session}}=await sb.auth.getSession();if(!session){$('#login').classList.remove('hidden');return}$('#login').classList.add('hidden');$('#setup').classList.add('hidden');$('#dashboard').classList.remove('hidden');$('#logout').classList.remove('hidden');await refresh()}
async function refresh(){await loadProducts();await Promise.all([loadOrders(),loadReviews(),loadShippingSettings(),loadSupportMessages(),loadStoreMessagesAdmin()])}

async function loadStoreMessagesAdmin(){const ann=$('#announcementText'),thanks=$('#thankYouText');if(!ann||!thanks)return;const {data,error}=await sb.from('site_settings').select('key,value').in('key',['store_announcement','order_thankyou']);if(error){$('#storeMessagesMsg').textContent='تعذر تحميل الرسائل: '+error.message;return}for(const row of data||[]){if(row.key==='store_announcement')ann.value=row.value||'';if(row.key==='order_thankyou')thanks.value=row.value||''}}
$('#saveStoreMessages')?.addEventListener('click',async()=>{const out=$('#storeMessagesMsg'),announcement=$('#announcementText').value.trim(),thankyou=$('#thankYouText').value.trim();if(!announcement||!thankyou){out.textContent='عمّري جوج الرسائل قبل الحفظ.';return}const rows=[{key:'store_announcement',value:announcement,updated_at:new Date().toISOString()},{key:'order_thankyou',value:thankyou,updated_at:new Date().toISOString()}];const {error}=await sb.from('site_settings').upsert(rows,{onConflict:'key'});out.textContent=error?'تعذر الحفظ: '+error.message:'تم الحفظ والنشر بنجاح. حدّثي المتجر لمشاهدة التغيير.'});

async function loadProducts(){const {data,error}=await sb.from('products').select('*').order('created_at',{ascending:false});if(error){msg('خطأ تحميل المنتجات: '+error.message);return}products=data||[];$('#totalProducts').textContent=products.length;const tracked=products.filter(p=>p.stock_quantity!==null&&p.stock_quantity!==undefined);const low=tracked.filter(p=>Number(p.stock_quantity)<=Number(p.low_stock_threshold??3));$('#lowStockCount').textContent=low.length;const alertBox=$('#stockAlerts');if(low.length){alertBox.classList.remove('hidden','stock-ok');alertBox.innerHTML='<b>⚠️ تنبيه المخزون المنخفض</b><ul>'+low.map(p=>`<li><b>${esc(p.name)}</b>: ${Number(p.stock_quantity)===0?'نفد المخزون':`باقي ${Number(p.stock_quantity)} قطعة فقط`} (حد التنبيه ${Number(p.low_stock_threshold??3)})</li>`).join('')+'</ul>'}else{alertBox.classList.remove('hidden');alertBox.classList.add('stock-ok');alertBox.innerHTML='✓ المخزون مزيان حالياً، ما كاين حتى منتج وصل لحد التنبيه.'}$('#productsRows').innerHTML=products.map(p=>{const q=p.stock_quantity;const lowFlag=q!==null&&q!==undefined&&Number(q)<=Number(p.low_stock_threshold??3);return `<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${Number(p.discount_price)>0&&Number(p.discount_price)<Number(p.price)?`<b style="color:#8f2634">${money(p.discount_price)}</b><br><del>${money(p.price)}</del>`:money(p.price)}</td><td>${q===null||q===undefined?'غير محدد':`<span class="pill" style="${lowFlag?'background:#fbe3df;color:#8d2920':''}">${Number(q)} قطعة${lowFlag?' ⚠️':''}</span>`}</td><td><span class="pill">${p.active?'ظاهر':'مخفي'}</span></td><td><div class="actions"><button class="btn light" onclick="editProduct('${p.id}')">تعديل</button><button class="btn gold" onclick="manageVariantStock('${p.id}')">مخزون اللون/المقاس</button><button class="btn ${p.is_sold_out?'light':'red'}" onclick="toggleSoldOut('${p.id}')">${p.is_sold_out?'إلغاء نفد المنتج':'نفد المنتج'}</button><button class="btn red" onclick="deleteProduct('${p.id}')">حذف</button></div></td></tr>`}).join('')||'<tr><td colspan="6">لا توجد منتجات بعد.</td></tr>'}
function renderIntelligence(rows){const valid=(rows||[]).filter(o=>['تم التأكيد','قيد التجهيز','تم الشحن','تم التسليم'].includes(o.status));let revenue=0,cost=0;for(const o of valid){revenue+=Math.max(0,Number(o.total)||0)-Math.max(0,Number(o.shipping_fee)||0);for(const it of (o.items||[])){cost+=(Number(it.purchase_cost)||0)*(Number(it.quantity)||1)}}const put=(id,val)=>{const el=$('#'+id);if(el)el.textContent=val};put('intelRevenue',money(revenue));put('intelCost',money(cost));put('intelProfit',money(revenue-cost));put('intelCancelled',(rows||[]).filter(o=>o.status==='ملغي').length)}
async function loadOrders(){const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(300);if(error){console.error(error);return}const rows=data||[];renderIntelligence(rows);$('#totalOrders').textContent=rows.length;$('#newOrders').textContent=rows.filter(o=>o.status==='جديد').length;$('#ordersRows').innerHTML=rows.map(o=>`<tr><td>${new Date(o.created_at).toLocaleString('ar-MA')}</td><td>${esc(o.customer_name)}</td><td><a href="https://wa.me/${String(o.phone).replace(/\D/g,'').replace(/^0/,'212')}" target="_blank">${esc(o.phone)}</a></td><td>${esc(o.city)} — ${esc(o.address)}</td><td class="orderitems">${(o.items||[]).map(i=>`${esc(i.product_name)} (${esc(i.color)}/${esc(i.size)}) ×${i.quantity}`).join('<br>')}</td><td>${money(o.total)}${Number(o.shipping_fee)>0?`<br><small>التوصيل: ${money(o.shipping_fee)}</small>`:''}</td><td><select class="status" onchange="changeStatus('${o.id}',this.value)">${['جديد','تم التأكيد','قيد التجهيز','تم الشحن','تم التسليم','ملغي'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')||'<tr><td colspan="7">لا توجد طلبات بعد.</td></tr>'}
window.changeStatus=async(id,status)=>{const {error}=await sb.from('orders').update({status}).eq('id',id);if(error)alert('تعذر تحديث الحالة: '+error.message);else await loadOrders()};
window.editProduct=id=>{const p=products.find(x=>x.id===id),f=$('#productForm');['id','name','purchase_cost','price','discount_price','category','tag','description'].forEach(k=>f.elements[k].value=p[k]??'');f.elements.stock_quantity.value=p.stock_quantity??'';f.elements.low_stock_threshold.value=p.low_stock_threshold??3;f.elements.colors.value=(p.colors||[]).join('، ');f.elements.sizes.value=(p.sizes||[]).join('، ');renderAdminPickers();$('#formTitle').textContent='تعديل المنتج';window.scrollTo({top:0,behavior:'smooth'})};
window.toggleSoldOut=async id=>{
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const next=!p.is_sold_out;
 const {error:updateError}=await sb.from('products').update({is_sold_out:next}).eq('id',id);
 if(updateError){alert('تعذر تحديث حالة المنتج: '+updateError.message);return;}
 let noticeMessage='';
 let noticeTone='success';
 if(!next){
  const {data:requests,error:reqError}=await sb.from('product_restock_alerts').select('user_id').eq('product_id',String(id));
  if(reqError){
   console.error('Restock requests lookup failed:',reqError);
   noticeMessage='تم إرجاع المنتج، ولكن تعذر جلب طلبات التنبيه. لم يتم إرسال الإشعارات.';
   noticeTone='warning';
  }else{
   const userIds=[...new Set((requests||[]).map(x=>x.user_id).filter(Boolean))];
   if(userIds.length){
    const rows=userIds.map(user_id=>({user_id,title:'رجع المنتج للمخزون 🎉',body:`المنتج ${p.name} ولى متوفر من جديد. سارعِي باكتشافه في BELDI BY FATY.`,is_read:false}));
    const {error:insertError}=await sb.from('customer_notifications').insert(rows);
    if(insertError){
     console.error('Restock notifications insert failed:',insertError);
     noticeMessage='تم إرجاع المنتج، ولكن فشل إرسال إشعارات الزبونات. طلبات التنبيه بقات محفوظة لإعادة المحاولة.';
     noticeTone='warning';
    }else{
     const {error:deleteError}=await sb.from('product_restock_alerts').delete().eq('product_id',String(id));
     if(deleteError){
      console.error('Restock alerts cleanup failed:',deleteError);
      noticeMessage=`تم إرجاع المنتج وإرسال ${userIds.length} إشعاراً، لكن تعذر حذف طلبات التنبيه القديمة.`;
      noticeTone='warning';
     }else{
      noticeMessage=`تم إرجاع المنتج وإرسال ${userIds.length} إشعاراً للزبونات.`;
     }
    }
   }else{
    noticeMessage='تم إرجاع المنتج. ما كاين حتى طلب تنبيه مسجل لهذا المنتج.';
   }
  }
 }else{
  noticeMessage='تم وضع علامة «نفد المنتج».';
 }
 if(noticeTone==='warning')alert(noticeMessage);
 else msg(noticeMessage);
 await loadProducts();
};
window.manageVariantStock=async id=>{const p=products.find(x=>String(x.id)===String(id));if(!p)return;const colors=p.colors?.length?p.colors:['غير محدد'],sizes=p.sizes?.length?p.sizes:['غير محدد'];for(const color of colors){for(const size of sizes){const {data}=await sb.from('product_variant_stock').select('quantity').eq('product_id',String(id)).eq('color',color).eq('size',size).maybeSingle();const raw=prompt(`المخزون المتوفر
${p.name}
اللون: ${color}
المقاس: ${size}`,String(data?.quantity??0));if(raw===null)return;const quantity=Number(raw);if(!Number.isInteger(quantity)||quantity<0){alert('أدخلي كمية صحيحة (0 أو أكثر).');return}const {error}=await sb.from('product_variant_stock').upsert({product_id:String(id),color,size,quantity,updated_at:new Date().toISOString()},{onConflict:'product_id,color,size'});if(error){alert('تعذر حفظ المخزون: '+error.message);return}}}alert('تم حفظ مخزون الألوان والمقاسات.');};
window.deleteProduct=async id=>{if(!confirm('هل تريدين حذف المنتج نهائياً؟'))return;const {error}=await sb.from('products').delete().eq('id',id);if(error)msg('تعذر الحذف: '+error.message);else{msg('تم حذف المنتج');await loadProducts()}};
$('#clearProduct').onclick=()=>{$('#productForm').reset();$('#productForm').elements.id.value='';$('#productForm').elements.stock_quantity.value=0;$('#productForm').elements.low_stock_threshold.value=3;$('#formTitle').textContent='إضافة منتج جديد';renderAdminPickers();msg('')};
$('#productForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,id=f.elements.id.value,oldProduct=id?products.find(p=>String(p.id)===String(id)):null;const regular=Number(f.elements.price.value),discountRaw=String(f.elements.discount_price.value||'').trim(),discount=discountRaw===''?null:Number(discountRaw);if(discount!==null&&(!Number.isFinite(discount)||discount<=0||discount>=regular))return msg('ثمن التخفيض خاصو يكون أكبر من 0 وأقل من الثمن الأصلي.');const data={name:f.elements.name.value.trim(),purchase_cost:Math.max(0,Number(f.elements.purchase_cost.value)||0),price:regular,discount_price:discount,category:f.elements.category.value,tag:f.elements.tag.value,description:f.elements.description.value.trim(),stock_quantity:Math.max(0,parseInt(f.elements.stock_quantity.value||'0',10)),low_stock_threshold:Math.max(0,parseInt(f.elements.low_stock_threshold.value||'3',10)),colors:(()=>{const v=f.elements.colors.value.split(/[,،;؛\\n]+/).map(x=>x.trim()).filter(Boolean);return v.length===1&&/^(أسود|اسود|أزرق|ازرق|أحمر|احمر|بنفسجي|أخضر|اخضر|بيج|أبيض|ابيض)(\\s+(أسود|اسود|أزرق|ازرق|أحمر|احمر|بنفسجي|أخضر|اخضر|بيج|أبيض|ابيض))+$/i.test(v[0])?v[0].split(/\\s+/):v})(),sizes:f.elements.sizes.value.split(/[,،]/).map(x=>x.trim()).filter(Boolean),active:true,is_sold_out:oldProduct?.is_sold_out===true};const files=Array.from(f.elements.images.files||[]);if(files.length&&data.colors.length>1&&files.length!==data.colors.length)return msg('ارفعي صورة واحدة لكل لون وبنفس الترتيب.');if(files.length){if(files.some(file=>file.size>15*1024*1024))return msg('كل صورة يجب أن تكون 15MB أو أقل');if(files.some(file=>!file.type.startsWith('image/')))return msg('اختاري ملفات صور فقط.');const urls=[];for(const file of files){let optimized;try{optimized=await compressProductImage(file)}catch(err){msg('تعذر تجهيز إحدى الصور: '+err.message);return}const isWebp=optimized.type==='image/webp';const ext=isWebp?'webp':((file.name.split('.').pop()||'jpg').toLowerCase());const path=`${crypto.randomUUID()}.${ext}`;const up=await sb.storage.from('product-images').upload(path,optimized,{upsert:false,contentType:optimized.type||file.type,cacheControl:'31536000'});if(up.error)return msg('تعذر رفع الصورة: '+up.error.message);urls.push(sb.storage.from('product-images').getPublicUrl(path).data.publicUrl)}data.images=urls;data.image_url=urls[0]}
const result=id?await sb.from('products').update(data).eq('id',id):await sb.from('products').insert(data);if(result.error){msg('تعذر حفظ المنتج: '+result.error.message);return}msg(id?'تم تحديث المنتج بنجاح':'تمت إضافة المنتج بنجاح');if(!id){sendCustomerPush('منتج جديد في BELDI BY FATY',`وصل موديل جديد: ${data.name} ✨`)}else if(discount!==null&&discount<Number(oldProduct?.price||0)&&(!(Number(oldProduct?.discount_price)>0&&Number(oldProduct?.discount_price)<Number(oldProduct?.price))||discount<Number(oldProduct?.discount_price))){sendCustomerPush('تخفيضات جديدة في BELDI BY FATY',`تخفيض جديد على ${data.name} 🔥`)}f.reset();f.elements.id.value='';f.elements.stock_quantity.value=0;f.elements.low_stock_threshold.value=3;$('#formTitle').textContent='إضافة منتج جديد';renderAdminPickers();await loadProducts()});
renderAdminPickers();sb?.auth.getSession().then(({data})=>{if(data.session)boot()});

async function loadReviews(){const body=$('#reviewsRows');if(!body)return;body.innerHTML='<tr><td colspan="6">جاري تحميل التعليقات…</td></tr>';const {data,error}=await sb.from('product_reviews').select('id,product_id,customer_name,rating,comment,created_at').order('created_at',{ascending:false}).limit(500);if(error){body.innerHTML='<tr><td colspan="6">تعذر تحميل التعليقات: '+esc(error.message)+'</td></tr>';return}const rows=data||[];const names=new Map(products.map(p=>[String(p.id),p.name]));body.innerHTML=rows.map(r=>`<tr><td>${r.created_at?new Date(r.created_at).toLocaleString('ar-MA'):'—'}</td><td>${esc(names.get(String(r.product_id))||'منتج محذوف')}</td><td>${esc(r.customer_name)}</td><td><span class="reviewstars">${'★'.repeat(Number(r.rating)||0)}${'☆'.repeat(5-(Number(r.rating)||0))}</span></td><td style="white-space:normal;min-width:220px">${esc(r.comment)}</td><td><button class="btn red" onclick="deleteReview('${r.id}')">حذف</button></td></tr>`).join('')||'<tr><td colspan="6">لا توجد تعليقات حالياً.</td></tr>';$('#reviewAdminMsg').textContent=`المجموع: ${rows.length} تعليق(ات)`}
window.deleteReview=async id=>{if(!confirm('هل تريد حذف هذا التعليق نهائياً؟ لا يمكن التراجع عن الحذف.'))return;const {error}=await sb.from('product_reviews').delete().eq('id',id);if(error){$('#reviewAdminMsg').textContent='تعذر حذف التعليق: '+error.message;return}$('#reviewAdminMsg').textContent='تم حذف التعليق.';await loadReviews()};


// V5 services administration
const DEFAULT_RATE_TEXT=`الناظور | 20
تاويمة | 20
العروي | 20
بني أنصار | 20
سلوان | 20
فركانة | 20
زايو | 30
الدريوش | 25
وجدة | 30
بركان | 30
جرسيف | 40
تاوريرت | 40
فاس | 42
مكناس | 42
الرباط | 35
سلا | 45
الدار البيضاء | 45
المحمدية | 43
القنيطرة | 40
طنجة | 45
تطوان | 45
شفشاون | 45
الحسيمة | 39
مراكش | 39
أكادير | 40
الجديدة | 45
آسفي | 45
بني ملال | 40
خريبكة | 40
سطات | 45
العيون | 50
الداخلة | 45
ورزازات | 45
الرشيدية | 45
رأس الماء | 35
أزغنغان | 20
إعزانن | 20
إحدادن | 20
إكسن | 20
بني بويفرور | 25
بوعرك | 25
بويافر | 30
دار الكبداني | 30
ميدار | 25
تمسمان | 30
تافرسيت | 30
تيزطوطين | 20
حاسي بركان | 20
أولاد ستوت | 20`;
async function loadShippingSettings(){const box=$('#shippingRatesText');if(!box)return;const {data,error}=await sb.from('site_settings').select('value').eq('key','shipping_rates').maybeSingle();if(error){$('#shippingSettingsMsg').textContent='تعذر تحميل الإعدادات: '+error.message;box.value=DEFAULT_RATE_TEXT;return}const rates=data?.value&&typeof data.value==='object'?data.value:null;box.value=rates?Object.entries(rates).map(([city,fee])=>`${city} | ${fee}`).join('\n'):DEFAULT_RATE_TEXT;}
$('#saveShippingRates')?.addEventListener('click',async()=>{const box=$('#shippingRatesText'),out=$('#shippingSettingsMsg');const rates={};for(const line of box.value.split(/\r?\n/)){if(!line.trim())continue;const parts=line.split('|');const city=(parts[0]||'').trim(),fee=Number((parts[1]||'').trim());if(!city||!Number.isFinite(fee)||fee<0||fee>500){out.textContent=`السطر غير صحيح: ${line}. استعملي: المدينة | الثمن`;return}rates[city]=fee}if(!Object.keys(rates).length){out.textContent='أضيفي مدينة واحدة على الأقل.';return}const {error}=await sb.from('site_settings').upsert({key:'shipping_rates',value:rates,updated_at:new Date().toISOString()},{onConflict:'key'});out.textContent=error?'تعذر الحفظ: '+error.message:'تم حفظ أثمنة التوصيل بنجاح. ستظهر للزبونات بعد تحديث الموقع.';});
async function loadSupportMessages(){const body=$('#supportRows');if(!body)return;const {data,error}=await sb.from('support_messages').select('*').order('created_at',{ascending:false}).limit(300);if(error){body.innerHTML=`<tr><td colspan="7">تعذر تحميل الرسائل: ${esc(error.message)}</td></tr>`;return}const rows=data||[];body.innerHTML=rows.map(r=>`<tr><td>${r.created_at?new Date(r.created_at).toLocaleString('ar-MA'):'—'}</td><td>${esc(r.customer_name)}</td><td><a href="https://wa.me/${String(r.phone).replace(/\D/g,'').replace(/^0/,'212')}" target="_blank">${esc(r.phone)}</a></td><td>${esc(r.email||'—')}</td><td style="white-space:normal;min-width:220px"><b>${esc(r.subject)}</b><br>${esc(r.message)}</td><td><select class="status" onchange="updateSupportStatus('${r.id}',this.value)">${['جديد','قيد المعالجة','تم الرد'].map(v=>`<option ${r.status===v?'selected':''}>${v}</option>`).join('')}</select></td><td><a class="btn light" style="display:inline-block;text-decoration:none" target="_blank" href="https://wa.me/${String(r.phone).replace(/\D/g,'').replace(/^0/,'212')}?text=${encodeURIComponent('السلام عليكم '+r.customer_name+'، معكِ BELDI BY FATY بخصوص رسالتك: '+r.subject)}">رد واتساب</a></td></tr>`).join('')||'<tr><td colspan="7">لا توجد رسائل حالياً.</td></tr>';$('#supportAdminMsg').textContent=`عدد الرسائل: ${rows.length}`;}
window.updateSupportStatus=async(id,status)=>{const {error}=await sb.from('support_messages').update({status}).eq('id',id);if(error)$('#supportAdminMsg').textContent='تعذر تحديث الحالة: '+error.message;else await loadSupportMessages()};
