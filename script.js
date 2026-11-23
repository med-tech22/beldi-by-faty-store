const PHONE='212727294608';
const money=n=>`${Number(n||0).toLocaleString('fr-FR')} DH`;
const $=s=>document.querySelector(s);
const configured=window.BELDI_SUPABASE_URL?.startsWith('https://') && window.BELDI_SUPABASE_ANON_KEY?.length>30 && !window.BELDI_SUPABASE_URL.includes('PASTE_');
const db=configured?window.supabase.createClient(window.BELDI_SUPABASE_URL,window.BELDI_SUPABASE_ANON_KEY):null;
let products=[],cart=[],filter='الكل';
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}
function splitChoices(value){let a=Array.isArray(value)?value:(typeof value==='string'?[value]:[]);a=a.flatMap(x=>String(x||'').split(/[,،;؛\\n]+/)).map(x=>x.trim()).filter(Boolean);if(a.length===1 && /^(أسود|اسود|أزرق|ازرق|أحمر|احمر|بنفسجي|أخضر|اخضر|بيج|أبيض|ابيض)(\s+(أسود|اسود|أزرق|ازرق|أحمر|احمر|بنفسجي|أخضر|اخضر|بيج|أبيض|ابيض))+$/i.test(a[0]))a=a[0].split(/\s+/);return [...new Set(a)]}
function normalize(p){let imgs=p.images||[];if(typeof imgs==='string'){try{imgs=JSON.parse(imgs)}catch(e){imgs=[]}}return {...p,desc:p.description||p.desc||'',colors:splitChoices(p.colors),sizes:splitChoices(p.sizes),images:Array.isArray(imgs)?imgs:[],image:p.image_url||p.image||''}}
async function loadProducts(){
 if(!db){products=[{id:'demo1',name:'قفطان مغربي أنيق',category:'قفطان',price:350,tag:'الأكثر طلباً',desc:'قفطان بلمسة تقليدية راقية، مناسب للمناسبات.',colors:['أسود','أحمر','أزرق','بنفسجي'],sizes:['S','M','L','XL'],image:''},{id:'demo2',name:'جلابة مغربية عصرية',category:'جلابة',price:290,tag:'جديد',desc:'جلابة أنيقة تجمع الراحة والجمال المغربي.',colors:['بيج','أخضر','أسود'],sizes:['M','L','XL','XXL'],image:''}];renderProducts();return}
 const {data,error}=await db.from('products').select('*').eq('active',true).order('created_at',{ascending:false});
 if(error){toast('تعذر تحميل المنتجات. راجعي إعدادات المتجر.');console.error(error);return}
 products=(data||[]).map(normalize);renderProducts();
}

const CATEGORY_META={'قفطان':['👑','أناقة القفطان المغربي'],'تكشيطة':['✨','تفاصيل المناسبات الفاخرة'],'جلابة':['🌿','راحة وأناقة يومية'],'جبادور':['🧵','لمسة تقليدية راقية'],'قندورة':['🌸','إطلالة بسيطة وأنيقة'],'ملحفة':['🪡','جمال الزي المغربي'],'لباس تقليدي آخر':['💛','اختيارات مغربية متنوعة']};
function productCard(p){const id=String(p.id).replace(/'/g,"&#39;");return `<article class="product"><div class="photo" onclick="openDetail('${id}')">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`:`<div class="placeholder">BELDI<br>BY FATY</div>`}<span class="tag">${esc(p.tag||p.category)}</span></div><div class="pbody"><h3 onclick="openDetail('${id}')">${esc(p.name)}</h3><div class="desc" onclick="openDetail('${id}')">${esc(p.desc||'أناقة مغربية بلمسة عصرية')}</div><div class="price">${money(p.price)} <small>الدفع عند الاستلام</small></div><div class="pactions"><button class="btn dark" onclick="openDetail('${id}')">اختاري التفاصيل</button><button class="btn outline" onclick="quickBuy('${id}')">اطلبي الآن</button></div></div></article>`}
function renderProducts(){
 renderCategoryFilters();
 const list=products.filter(p=>filter==='الكل'||(filter==='جديد'?p.tag==='جديد':p.category===filter));
 const main=$('#products'), grouped=$('#categoryCollections');
 if(filter==='الكل'){
  main.style.display='none';
  const cats=[...new Set(products.map(p=>String(p.category||'لباس تقليدي آخر').trim()).filter(Boolean))];
  grouped.innerHTML=cats.map(cat=>{const items=products.filter(p=>(p.category||'لباس تقليدي آخر')===cat);const meta=CATEGORY_META[cat]||['🧵','تشكيلة مختارة بعناية'];return `<section class="collection-block" id="collection-${encodeURIComponent(cat)}"><div class="collection-title"><div><h3>${meta[0]} ${esc(cat)}</h3><span>${esc(meta[1])}</span></div><button class="btn outline" onclick="setFilter('${esc(cat)}')">شاهدي الكل ←</button></div><div class="grid">${items.slice(0,4).map(productCard).join('')}</div></section>`}).join('')||'<p style="text-align:center;color:#786f64">قريباً سنضيف تشكيلتنا الجديدة.</p>';
 }else{main.style.display='grid';grouped.innerHTML='';main.innerHTML=list.map(productCard).join('')||'<p style="grid-column:1/-1;text-align:center;color:#877">لا توجد منتجات في هذا القسم حالياً.</p>';}
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
function colorImage(p,color){const idx=(p.colors||[]).findIndex(c=>c===color);const imgs=productImages(p);return idx>=0&&imgs[idx]?imgs[idx]:(imgs[0]||'assets/logo.png')}
function openDetail(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;detailProduct=p;detailColor=p.colors?.[0]||'غير محدد';detailSize=p.sizes?.[0]||'غير محدد';detailImageIndex=0;const imgs=productImages(p);$('#detailName').textContent=p.name;$('#detailPrice').textContent=money(p.price);$('#detailDesc').textContent=p.desc||'أناقة مغربية بلمسة عصرية، اختاري اللون والمقاس المناسب لكِ.';if($('#detailLongDesc'))$('#detailLongDesc').textContent=p.desc||'تصميم مغربي أنيق بتفاصيل مختارة بعناية.';$('#detailQty').value=1;$('#detailMain').src=colorImage(p,detailColor);$('#detailMain').alt=p.name;$('#detailThumbs').innerHTML=imgs.map((u,i)=>`<button class="${i===0?'active':''}" onclick="selectDetailImage(${i})"><img src="${esc(u)}" alt="${esc(p.name)}"></button>`).join('');$('#detailThumbs').style.display=imgs.length>1?'flex':'none';renderDetailChoices();loadProductReviews(p.id);$('#detailModal').classList.add('show');$('#detailModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function selectDetailImage(i){const imgs=productImages(detailProduct);if(!imgs[i])return;detailImageIndex=i;$('#detailMain').src=imgs[i];document.querySelectorAll('#detailThumbs button').forEach((b,n)=>b.classList.toggle('active',n===i));}
function colorHex(v){const x=String(v).toLowerCase();if(x.includes('أسود')||x.includes('اسود'))return '#211e1b';if(x.includes('أزرق')||x.includes('ازرق'))return '#24558f';if(x.includes('أحمر')||x.includes('احمر')||x.includes('عنابي'))return '#8d1e32';if(x.includes('بنفسجي'))return '#75416f';if(x.includes('أخضر')||x.includes('اخضر'))return '#54734a';if(x.includes('بيج'))return '#c9b99a';if(x.includes('أبيض')||x.includes('ابيض'))return '#f4f0e8';return '#b69a68'}
function renderDetailChoices(){const colors=detailProduct.colors?.length?detailProduct.colors:['غير محدد'];const sizes=detailProduct.sizes?.length?detailProduct.sizes:['غير محدد'];$('#detailColors').innerHTML=colors.map(v=>`<button class="colorchip ${v===detailColor?'selected':''}" onclick="detailColor='${esc(v).replace(/'/g,"&#39;")}';$('#detailMain').src=colorImage(detailProduct,detailColor);renderDetailChoices()"><span class="swatch" style="--swatch:${colorHex(v)}"></span>${esc(v)}</button>`).join('');$('#detailSizes').innerHTML=sizes.map(v=>`<button class="${v===detailSize?'selected':''}" onclick="detailSize='${esc(v).replace(/'/g,"&#39;")}';renderDetailChoices()">${esc(v)}</button>`).join('');}
function closeDetail(){$('#detailModal').classList.remove('show');$('#detailModal').setAttribute('aria-hidden','true');document.body.style.overflow='';}
function detailAddToCart(buy){if(!detailProduct)return;const qty=Math.max(1,Math.min(20,Number($('#detailQty').value)||1));const existing=cart.find(x=>String(x.id)===String(detailProduct.id)&&x.color===detailColor&&x.size===detailSize);if(existing)existing.qty+=qty;else cart.push({id:detailProduct.id,qty,color:detailColor,size:detailSize});updateCount();closeDetail();toast('تضاف المنتج للسلة بنجاح');if(buy)openCart();}

function addToCart(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;const old=cart.find(x=>String(x.id)===String(id));if(old)old.qty++;else cart.push({id:p.id,qty:1,color:p.colors?.[0]||'غير محدد',size:p.sizes?.[0]||'غير محدد'});updateCount();toast('تضاف المنتج للسلة بنجاح')}
function quickBuy(id){cart=[];addToCart(id);openCart()}
function updateCount(){$('#cartCount').textContent=cart.reduce((a,x)=>a+x.qty,0)}
function openCart(){if(!cart.length){toast('السلة فارغة، اختاري منتجاً أولاً');return}renderCart();$('#cartModal').classList.add('show')}
function closeCart(){$('#cartModal').classList.remove('show')}
function renderCart(){let total=0;$('#cartContents').innerHTML=cart.map((c,i)=>{let p=products.find(x=>String(x.id)===String(c.id));if(!p)return '';total+=p.price*c.qty;return `<div class="order-summary"><b>${esc(p.name)}</b> — ${money(p.price)}<div class="formgrid"><div class="field"><label>اللون</label><select onchange="cart[${i}].color=this.value">${(p.colors?.length?p.colors:['غير محدد']).map(v=>`<option ${v===c.color?'selected':''}>${esc(v)}</option>`).join('')}</select></div><div class="field"><label>المقاس</label><select onchange="cart[${i}].size=this.value">${(p.sizes?.length?p.sizes:['غير محدد']).map(v=>`<option ${v===c.size?'selected':''}>${esc(v)}</option>`).join('')}</select></div><div class="field"><label>الكمية</label><input type="number" min="1" max="20" value="${c.qty}" onchange="cart[${i}].qty=Math.max(1,Math.min(20,+this.value||1));renderCart();updateCount()"></div><div class="field" style="justify-content:end"><button type="button" class="btn outline" onclick="cart.splice(${i},1);updateCount();renderCart()">حذف</button></div></div></div>`}).join('')+`<div class="order-summary"><b>المجموع: ${money(total)}</b><br><span class="muted">ثمن التوصيل يتم تأكيده معكِ هاتفياً.</span></div>`}
$('#orderForm').addEventListener('submit',async e=>{e.preventDefault();if(!cart.length)return toast('السلة فارغة');const f=new FormData(e.target);const items=cart.map(c=>{const p=products.find(x=>String(x.id)===String(c.id));return {product_id:String(c.id),product_name:p.name,unit_price:p.price,color:c.color,size:c.size,quantity:c.qty,line_total:p.price*c.qty}});const total=items.reduce((n,x)=>n+x.line_total,0);const order={customer_name:f.get('fullname'),phone:f.get('phone'),address:f.get('address'),city:f.get('city'),note:f.get('note')||'',items,total,payment_method:'الدفع عند الاستلام',status:'جديد'};
 let saved=false;if(db){const {error}=await db.from('orders').insert(order);if(error){console.error(error);toast('لم يتم حفظ الطلب في النظام. سنفتح واتساب لإرساله مباشرة.')}else saved=true}else toast('تنبيه: المتجر في وضع المعاينة ولم تُفعّل قاعدة البيانات بعد.');
 const lines=items.map(x=>`${x.product_name} | اللون: ${x.color} | المقاس: ${x.size} | الكمية: ${x.quantity} | ${money(x.line_total)}`).join('\n');const msg=`طلب جديد من BELDI BY FATY\nالاسم: ${order.customer_name}\nالهاتف: ${order.phone}\nالعنوان: ${order.address}\nالمدينة: ${order.city}\nالمنتجات:\n${lines}\nالمجموع: ${money(total)}\nالدفع: عند الاستلام\nملاحظة: ${order.note||'لا توجد'}`;
 window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`,'_blank','noopener');if(saved){fetch('https://formsubmit.co/ajax/med20011022@gmail.com',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({name:order.customer_name,phone:order.phone,address:order.address,city:order.city,products:items.map(x=>`${x.product_name} - ${x.color} - ${x.size} x${x.quantity}`).join(' | '),total:money(total),payment:'الدفع عند الاستلام',note:order.note,_subject:'طلب جديد من BELDI BY FATY'})}).catch(()=>{});toast('تسجل الطلب في لوحة الإدارة. أرسليه عبر واتساب لتأكيده.')}closeCart();cart=[];updateCount();e.target.reset();});
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

if(!configured)toast('نسخة تجريبية: اربطي قاعدة البيانات لتفعيل الإدارة والطلبات');loadProducts();
