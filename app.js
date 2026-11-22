'use strict';
const $=id=>document.getElementById(id);
let native=typeof SigmaNative!=='undefined',config={enabled:false,allowed:[],rules:[],aiEnabled:false,aiProvider:'openai',cloudRevision:0},data={};
const norm=s=>s.normalize('NFKC').trim().toLocaleLowerCase('ar');
function notify(s){$('notice').textContent=s;}
function load(){try{if(native){data=JSON.parse(SigmaNative.read());config={enabled:false,allowed:[],rules:[],aiEnabled:false,aiProvider:'openai',cloudRevision:0,...data.config};}else{config={...config,...JSON.parse(localStorage.getItem('sigma-config')||'{}'),enabled:false,aiEnabled:false};}}catch{config={enabled:false,allowed:[],rules:[],aiEnabled:false,aiProvider:'openai',cloudRevision:0};notify('تعذر قراءة الإعدادات. الردود متوقفة.');}render();}
window.refreshNative=load;
function save(){if(native){if(SigmaNative.save(JSON.stringify(config))!=='ok'){notify('الإعدادات غير صالحة. تأكد من الإذن والمحادثات والربط.');load();return false;}}else{try{localStorage.setItem('sigma-config',JSON.stringify({...config,enabled:false,aiEnabled:false}));}catch{notify('التخزين غير متاح في المتصفح.');return false;}}render();return true;}
function render(){
 $('state').textContent=config.enabled&&native?'مفعّل على الجهاز':'متوقف';$('toggle').textContent=config.enabled?'إيقاف الردود':'تشغيل الردود';
 $('connection').textContent=native?(data.access?'إذن الإشعارات متاح. اختَر المحادثات وأضف القواعد أو فعّل الذكاء قبل التشغيل.':'التطبيق متصل، لكن إذن الإشعارات لسه غير مفعّل.'):'أنت في الموقع المستقل. تقدر تجهز وتختبر قواعد، لكن قراءة واتساب والرد عليه من داخل تطبيق أندرويد فقط.';
 $('permission').disabled=!native;
 document.body.dataset.runtime=native?'android':'web';
 $('last').textContent=native?(data.status||'لم يتم إرسال ردود'):'لا يوجد إرسال من الموقع';
 $('diagnostic-panel').hidden=!native;$('listener-state').textContent=data.listenerConnected?'خدمة الإشعارات متصلة':'اتصال الخدمة غير مؤكد';$('diagnostics').replaceChildren();for(const entry of (data.diagnostics||[])){const li=document.createElement('li');li.textContent=new Date(entry.time).toLocaleTimeString('ar-EG')+' · '+entry.reason;$('diagnostics').append(li);}if(!$('diagnostics').children.length)$('diagnostics').textContent='لم تصل أحداث بعد.';
 $('count').textContent=config.rules.length.toLocaleString('ar-EG')+' قواعد';
 $('rules').replaceChildren();config.rules.forEach((r,i)=>{const row=document.createElement('div');row.className='rule';const body=document.createElement('div'),small=document.createElement('small'),p=document.createElement('p'),answer=document.createElement('p'),del=document.createElement('button');small.textContent=r.mode==='exact'?'تطابق بالضبط':'تحتوي على';p.textContent=r.match;answer.textContent='↳ '+r.reply;body.append(small,p,answer);del.textContent='حذف';del.setAttribute('aria-label','حذف القاعدة '+(i+1));del.onclick=()=>{config.enabled=false;config.rules.splice(i,1);save();};row.append(body,del);$('rules').append(row);});
 $('chats').replaceChildren();const chats=data.chats||{};if(!Object.keys(chats).length){$('chats').textContent=native?'بعد منح الإذن، اطلب رسالة جديدة وافتح هذه القائمة.':'المحادثات بتظهر داخل تطبيق أندرويد فقط.';}else{for(const [id,name]of Object.entries(chats)){const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span');label.className='chat';box.type='checkbox';box.checked=config.allowed.includes(id);box.onchange=()=>{config.enabled=false;config.allowed=box.checked?[...new Set([...config.allowed,id])]:config.allowed.filter(x=>x!==id);save();};text.textContent=name;label.append(box,text);$('chats').append(label);}}
 renderAi();renderReports();
}
function renderAi(){
 const card=$('ai-device');
 if(!native){card.querySelector('p').textContent='إعدادات الذكاء الفعلية تتحكم من داخل تطبيق أندرويد. الموقع لا يفعّل ردود الذكاء.';}
 $('ai-provider').value=config.aiProvider||'openai';
 $('ai-enabled').value=config.aiEnabled?'on':'off';
 $('ai-state').textContent=config.aiEnabled&&native?'مفعّل':'متوقف';
 $('ai-provider').disabled=!native;$('ai-enabled').disabled=!native;$('ai-save').disabled=!native;
 if(native&&!data.cloudPaired)$('ai-note').textContent='اربط الخادم من قسم الربط بالأسفل قبل تفعيل الذكاء.';
 else if(native&&data.aiError)$('ai-note').textContent='آخر خطأ من الخادم: '+data.aiError;
}
function renderReports(){
 const card=$('reports-card');card.hidden=!native;if(!native)return;
 const reports=data.reports||[],names=data.chats||{},counts=data.counts||{};
 $('reports-count').textContent=reports.length.toLocaleString('ar-EG');
 $('reports').replaceChildren();
 if(!reports.length){$('reports').textContent='لا توجد ملخصات بانتظار مراجعتك.';}
 for(const r of reports){const row=document.createElement('div');row.className='rule';const body=document.createElement('div'),small=document.createElement('small'),p=document.createElement('p'),done=document.createElement('button');
  small.textContent=(r.name||names[r.chat]||'محادثة')+' · '+new Date(r.time).toLocaleString('ar-EG');p.textContent=r.summary;body.append(small,p);
  done.textContent='تمت المراجعة';done.onclick=()=>{if(SigmaNative.reviewReport(r.chat)==='ok'){load();notify('تمت المراجعة وأعيد تفعيل الذكاء لهذه المحادثة.');}};
  row.append(body,done);$('reports').append(row);}
 $('counts').replaceChildren();
 const entries=Object.entries(counts);if(entries.length){const list=document.createElement('ul');
  for(const [id,c]of entries){if(!c||!c.day)continue;const li=document.createElement('li');li.textContent=(names[id]||'محادثة')+' — اليوم: وصل '+(c.recv||0)+' · اتبعت '+(c.sent||0)+' · ذكاء '+(c.ai||0);list.append(li);}
  const h=document.createElement('p');h.className='sub';h.textContent='نشاط اليوم المحلي:';$('counts').append(h,list);}
}
$('permission').onclick=()=>{if(native)SigmaNative.permission();};$('refresh').onclick=load;
$('toggle').onclick=()=>{if(!native){notify('الموقع لا يشغّل الردود. شغّلها من داخل تطبيق أندرويد.');return;}if(!config.enabled){if(!data.access||!config.allowed.length||(!config.rules.length&&!config.aiEnabled)){notify('فعّل الإذن، وحدد محادثة على الأقل، وأضف قاعدة أو فعّل الذكاء أولًا.');return;}if(!confirm('تشغيل الردود للمحادثات المختارة فقط؟ قد تظهر للطرف الآخر كرسائل منك.'))return;}config.enabled=!config.enabled;if(save()){load();notify(config.enabled?'الردود مفعّلة للمحادثات المختارة. اختبر برسالة جديدة من شخص موافق.':'تم إيقاف الردود.');}};
$('ai-save').onclick=()=>{if(!native)return;const want=$('ai-enabled').value==='on';
 if(want&&!data.cloudPaired){notify('اربط الخادم أولًا قبل تفعيل الذكاء.');return;}
 if(want&&!config.allowed.length){notify('حدد محادثة واحدة على الأقل قبل تفعيل الذكاء.');return;}
 if(want&&!confirm('تفعيل الذكاء يرسل نص رسائل المحادثات المختارة إلى خادمك ثم إلى مزوّد الذكاء لتوليد ردود تُرسل كأنها منك. المزوّد المجاني قد لا يناسب بيانات شخصية. متأكد؟'))return;
 config.aiProvider=$('ai-provider').value;config.aiEnabled=want;
 if(save())notify(want?'الذكاء مفعّل للمحادثات المختارة. الردود تتبع مفتاح التشغيل الرئيسي.':'تم إيقاف الذكاء.');};
$('rule-form').onsubmit=e=>{e.preventDefault();if(config.rules.length>=30){notify('الحد الحالي ٣٠ قاعدة.');return;}const match=$('match').value.trim(),reply=$('reply').value.trim();if(!match||!reply)return;config.enabled=false;config.rules.push({mode:$('mode').value,match,reply});if(save()){e.target.reset();notify('اتحفظت القاعدة. الردود متوقفة لحد ما تشغّلها بنفسك.');}};
$('test').onclick=()=>{const text=norm($('sample').value);const r=config.rules.find(r=>r.mode==='exact'?text===norm(r.match):text.includes(norm(r.match)));$('result').textContent=r?r.reply:'مفيش قاعدة مطابقة. '+(config.aiEnabled?'سيحاول مساعد الذكاء الرد.':'لن يُرسل رد.');};
$('clear').onclick=()=>{if(!confirm('إيقاف الردود ومسح القواعد والمحادثات والسياق والإعدادات المحلية؟'))return;if(native)SigmaNative.clear();else localStorage.removeItem('sigma-config');config={enabled:false,allowed:[],rules:[],aiEnabled:false,aiProvider:'openai',cloudRevision:0};load();notify('تم المسح وإيقاف الردود. يمكنك سحب إذن الإشعارات من إعدادات أندرويد.');};
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}};
if(!native&&'serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>notify('تعذر تجهيز وضع عدم الاتصال.'));
load();
if(native)document.querySelector('.download').hidden=true;
$('diagnostic-refresh').onclick=load;
$('reconnect').onclick=()=>{if(!native||typeof SigmaNative.reconnect!=='function')return;const r=SigmaNative.reconnect();load();notify(r==='requested'?'تم طلب إعادة الاتصال. الردود متوقفة. انتظر قليلًا ثم حدّث التشخيص.':r==='already-connected'?'الخدمة متصلة بالفعل. الردود متوقفة.':r==='permission-missing'?'إذن الإشعارات غير متاح. راجع الإذن قبل إعادة الاتصال.':'تعذر طلب الاتصال. الردود متوقفة.');};
function renderCloud(){
 $('cloud-state').textContent=native&&data.cloudPaired?'مربوط بهذا الجهاز':'غير مربوط';
 $('cloud-pair').disabled=!native;$('cloud-pull').disabled=!native||!data.cloudPaired;$('cloud-forget').disabled=!native||!data.cloudPaired;
}
window.sigmaCloudResult=result=>{const messages={paired:'تم الربط. اسحب القواعد يدويًا عندما تكون جاهزًا.',synced:'تم سحب القواعد. الردود متوقفة، راجعها ثم شغّلها بنفسك.',unknown_chat:'الخادم يشير لمحادثة غير معروفة على هذا الجهاز. لم تتغير الإعدادات.',invalid:'بيانات الربط أو القواعد غير صالحة. لم تتغير الإعدادات.',failed:'تعذر الاتصال. تحقق من العنوان والرمز، أو أن الربط لم يتم إلغاؤه.'};load();renderCloud();$('cloud-pair').disabled=!native;$('cloud-result').textContent=messages[result]||'تعذر إتمام العملية.';};
$('cloud-form').onsubmit=e=>{e.preventDefault();if(!native)return;if(!confirm('ربط التطبيق بخادمك لمزامنة القواعد يدويًا؟ لا تُرفع رسائل واتساب بهذه الخطوة.'))return;const endpoint=$('cloud-endpoint').value.trim(),code=$('cloud-code').value.trim();$('cloud-code').value='';$('cloud-pair').disabled=true;$('cloud-result').textContent='جارٍ الربط…';SigmaNative.cloudPair(endpoint,code);};
$('cloud-pull').onclick=()=>{if(!native||!confirm('استبدال القواعد المحلية بقواعد الخادم وإيقاف الردود؟'))return;$('cloud-result').textContent='جارٍ سحب القواعد…';SigmaNative.cloudPull();};
$('cloud-forget').onclick=()=>{if(!native||!confirm('مسح رمز هذا الجهاز محليًا؟ لإلغاء وصوله للخادم نهائيًا استخدم لوحة المالك.'))return;SigmaNative.cloudForget();load();renderCloud();};
renderCloud();
