/**
 * Page d'autorisation du connecteur MCP (/oauth/authorize).
 * Même design que LoginModal / SigninModal : panneau violet à gauche, formulaire à droite,
 * connexion e-mail + Google, création de compte, mot de passe oublié, FR / AR (RTL).
 * Le JS de la page n'utilise ni template literal ni antislash, pour pouvoir vivre dans ce gabarit.
 */

export interface AuthorizePageOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Paramètres OAuth validés côté serveur, ou null (retour de Google / e-mail : repris depuis sessionStorage). */
  params: { client_id: string; redirect_uri: string; code_challenge: string; state: string; client_name: string } | null;
}

const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";

const CSS = `
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#0f172a;-webkit-font-smoothing:antialiased}
body[dir=rtl]{font-family:Cairo,Inter,system-ui,sans-serif}
.wrap{min-height:100vh;display:grid;grid-template-columns:1fr}
@media(min-width:1024px){.wrap{grid-template-columns:1fr 1fr}}
.left{display:none;position:relative;flex-direction:column;justify-content:space-between;padding:48px;overflow:hidden;background:linear-gradient(135deg,#3b0764 0%,#581c87 50%,#7e22ce 100%)}
@media(min-width:1024px){.left{display:flex}}
.blob{position:absolute;border-radius:9999px;filter:blur(64px);pointer-events:none}
.brand{position:relative;z-index:1;display:flex;align-items:center;gap:12px}
.logo{width:40px;height:40px;border-radius:12px;background:#fff;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.2)}
.logo img{width:100%;height:100%;object-fit:cover;display:block}
.brand b{color:#fff;font-weight:800;font-size:18px;letter-spacing:-.01em}
.pitch{position:relative;z-index:1;max-width:420px}
.pitch h2{color:#fff;font-size:30px;line-height:1.2;font-weight:800;letter-spacing:-.02em;margin:0 0 28px}
.feat{display:flex;align-items:center;gap:12px;color:#f3e8ff;font-size:14px;font-weight:500;margin-bottom:16px}
.feat i{width:36px;height:36px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-style:normal}
.feat svg{width:16px;height:16px;stroke:#fff}
.sec{position:relative;z-index:1;display:flex;align-items:center;gap:8px;color:#e9d5ff;font-size:12px;font-family:ui-monospace,monospace}
.sec svg{width:14px;height:14px;stroke:#e9d5ff}
.right{position:relative;display:flex;flex-direction:column;justify-content:center;padding:48px 24px}
@media(min-width:640px){.right{padding:48px 48px}}
@media(min-width:1024px){.right{padding:48px 80px}}
.lang{position:absolute;top:20px;inset-inline-end:20px;display:flex;gap:2px;background:#f1f5f9;border-radius:12px;padding:3px}
.lang button{border:0;background:transparent;border-radius:9px;padding:5px 10px;font:600 12px inherit;font-family:inherit;color:#64748b;cursor:pointer}
.lang button.on{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.card{width:100%;max-width:384px;margin:0 auto}
.mlogo{width:48px;height:48px;border-radius:16px;background:#fff;overflow:hidden;border:1px solid #f1f5f9;box-shadow:0 2px 8px rgba(0,0,0,.08);margin:0 auto 16px}
.mlogo img{width:100%;height:100%;object-fit:cover;display:block}
@media(min-width:1024px){.mlogo{display:none}}
h1{font-size:24px;font-weight:800;letter-spacing:-.02em;margin:0 0 8px;text-align:center}
@media(min-width:1024px){h1,.sub{text-align:start}}
.sub{font-size:14px;color:#64748b;margin:0 0 28px;text-align:center}
.err{display:flex;gap:8px;align-items:flex-start;padding:10px 14px;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;color:#be123c;font-size:12px;font-weight:500;margin-bottom:16px}
.ok{padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;color:#166534;font-size:13px;margin-bottom:16px;line-height:1.5}
.gbtn{width:100%;padding:14px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;font:700 14px inherit;font-family:inherit;color:#1e293b;display:flex;align-items:center;justify-content:center;gap:12px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:background .15s}
.gbtn:hover{background:#f8fafc}.gbtn svg{width:20px;height:20px}
.pill{display:flex;align-items:center;gap:8px;margin:14px 0;padding:10px 12px;background:rgba(250,245,255,.7);border:1px solid rgba(233,213,255,.7);border-radius:12px;color:#7e22ce;font-size:11px;font-weight:500}
.pill svg{width:14px;height:14px;stroke:#7e22ce;flex-shrink:0}
.or{display:flex;align-items:center;gap:12px;margin:18px 0}
.or:before,.or:after{content:"";height:1px;flex:1;background:#e2e8f0}
.or span{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
.f{position:relative;margin-bottom:12px}
.f svg.ic{position:absolute;top:50%;transform:translateY(-50%);inset-inline-start:14px;width:16px;height:16px;stroke:#94a3b8;pointer-events:none}
.f input{width:100%;padding:12px 14px;padding-inline-start:40px;border:1px solid #e2e8f0;border-radius:16px;font:400 14px inherit;font-family:inherit;color:#1e293b;outline:0;background:#fff;transition:border-color .15s,box-shadow .15s}
.f input.pw{padding-inline-end:40px}
.f input:focus{border-color:rgba(168,85,247,.6);box-shadow:0 0 0 4px rgba(168,85,247,.1)}
.f input::placeholder{color:#94a3b8}
.eye{position:absolute;top:50%;transform:translateY(-50%);inset-inline-end:12px;border:0;background:none;padding:2px;cursor:pointer;display:flex}
.eye svg{width:16px;height:16px;stroke:#94a3b8}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.row2 .f input{padding-inline-start:14px}
.row2 .f.u input{padding-inline-start:40px}
.forgot{display:flex;justify-content:flex-end;margin:-2px 0 12px}
.lnk{border:0;background:none;padding:0;font:600 12px inherit;font-family:inherit;color:#9333ea;cursor:pointer}
.lnk:hover{color:#7e22ce}
.pbtn{width:100%;padding:14px;border:0;border-radius:16px;background:#9333ea;color:#fff;font:700 14px inherit;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(147,51,234,.25);transition:background .15s}
.pbtn:hover{background:#7e22ce}.pbtn:active{background:#6b21a8}
.pbtn:disabled,.gbtn:disabled{opacity:.55;cursor:not-allowed}
.sbtn{width:100%;padding:13px;margin-top:10px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;color:#475569;font:600 14px inherit;font-family:inherit;cursor:pointer}
.sbtn:hover{background:#f8fafc}
.spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:s .7s linear infinite}
.gbtn .spin{border-color:#cbd5e1;border-top-color:#9333ea}
@keyframes s{to{transform:rotate(360deg)}}
.foot{margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9;text-align:center;font-size:12px;color:#64748b}
.foot .lnk{font-weight:700;text-decoration:underline;font-size:12px}
.ssl{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;font-size:10px;color:#94a3b8;font-family:ui-monospace,monospace}
.ssl svg{width:12px;height:12px;stroke:#9333ea}
.perm{list-style:none;padding:0;margin:0 0 18px}
.perm li{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #f1f5f9;border-radius:14px;background:#faf5ff;margin-bottom:8px;font-size:13px;color:#334155;font-weight:500}
.perm svg{width:16px;height:16px;stroke:#9333ea;flex-shrink:0}
.who{display:flex;align-items:center;gap:10px;justify-content:center;font-size:13px;color:#475569;margin-bottom:18px}
.who b{color:#0f172a}
.cc{width:56px;height:56px;border-radius:18px;background:#faf5ff;border:1px solid #e9d5ff;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.cc svg{width:24px;height:24px;stroke:#9333ea}
.note{font-size:11px;color:#94a3b8;text-align:center;margin-top:14px;line-height:1.5}
`;

const JS = `
(function(){
var CFG=window.__CFG;
var sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey);
var KEY='sawtify_oauth_params',LK='sawtify_oauth_lang';
var I={
mail:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
lock:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
user:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
eye:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
eyeoff:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
shield:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
mic:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
zap:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
clock:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
coin:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/></svg>',
link:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
spark:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.94 14.06 8 20l-1.94-5.94L0 12l6.06-2.06L8 4l1.94 5.94L16 12z" transform="translate(4 0)"/></svg>',
alert:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#be123c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
google:'<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'
};
var T={
fr:{
side:'Connecte Sawtify à ton assistant IA',f1:'Ton IA écrit le script et génère la voix',f2:'Voix naturelles en Darja et Arabe classique',f3:'Tes points et ton historique restent dans ton compte',secure:'Connexion sécurisée & chiffrée',
lt:'Connexion à Sawtify',ls:'Avec Google, ou avec ton e-mail et ton mot de passe',gl:'Continuer avec Google',gs:"S'inscrire avec Google",inst:'Connexion instantanée, sans mot de passe ni formulaire',or:'ou',
em:'E-mail',pw:'Mot de passe',pw2:'Confirmer le mot de passe',fn:'Prénom',ln:'Nom',forgot:'Mot de passe oublié ?',login:'Se connecter',logging:'Connexion en cours...',
no:'Pas encore de compte ?',create:'Créer un compte',have:'Déjà un compte ?',signin:'Se connecter',
st:'Créer ton compte Sawtify',ss:'Reçois 50 points offerts à ton inscription',signup:'Créer mon compte',signing:'Création en cours...',
rt:'Réinitialiser le mot de passe',rs:"Entre ton e-mail : on t'envoie un lien de réinitialisation.",rsend:'Envoyer le lien',back:'Retour',
rdone:'Lien envoyé. Vérifie ta boîte mail, change ton mot de passe, puis relance la connexion depuis {c}.',
ct:'Autoriser {c} ?',cs:'Connecté en tant que',p1:'Générer des voix off avec les points de ton compte',p2:'Consulter ton solde de points',p3:"Voir l'historique de tes générations",allow:'Autoriser',deny:'Refuser',switchacc:'Changer de compte',
note:'{c} pourra utiliser ton compte Sawtify. Tu peux révoquer cet accès à tout moment en supprimant le connecteur.',
chk:'Compte créé. Confirme ton e-mail avec le lien reçu, puis relance la connexion depuis {c}.',
bad:"Identifiants incorrects. Vérifie ton e-mail et ton mot de passe.",mism:'Les mots de passe ne correspondent pas.',short:'Mot de passe : 6 caractères minimum.',gen:'Une erreur est survenue. Réessaie dans un instant.',goog:'Connexion Google impossible. Réessaie dans un instant.',
exists:'Un compte existe déjà avec cet e-mail. Connecte-toi.',
np:'Lien de connexion invalide ou expiré. Relance l\\u2019ajout du connecteur depuis ton assistant IA.',
npok:'Connexion réussie. Retourne dans ton assistant IA et relance la connexion du connecteur Sawtify.',
generic:'ton assistant IA'
},
ar:{
side:'اربط صوتيفي بمساعدك الذكي',f1:'ذكاؤك الاصطناعي يكتب السيناريو ويولّد الصوت',f2:'أصوات طبيعية بالدارجة الجزائرية والعربية الفصحى',f3:'نقاطك وسجلّك يبقيان في حسابك',secure:'اتصال مشفر وآمن',
lt:'تسجيل الدخول إلى صوتيفي',ls:'عبر Google أو بالبريد الإلكتروني وكلمة المرور',gl:'المتابعة عبر Google',gs:'إنشاء حساب عبر Google',inst:'الدخول السريع بدون كلمة مرور ولا نموذج للتعبئة',or:'أو',
em:'البريد الإلكتروني',pw:'كلمة المرور',pw2:'تأكيد كلمة المرور',fn:'الاسم',ln:'اللقب',forgot:'نسيت كلمة المرور؟',login:'تسجيل الدخول',logging:'جاري الاتصال...',
no:'ليس لديك حساب؟',create:'إنشاء حساب جديد',have:'لديك حساب؟',signin:'تسجيل الدخول',
st:'أنشئ حسابك في صوتيفي',ss:'احصل على 50 نقطة مجانية عند التسجيل',signup:'إنشاء حسابي',signing:'جاري إنشاء الحساب...',
rt:'إعادة تعيين كلمة المرور',rs:'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.',rsend:'إرسال الرابط',back:'رجوع',
rdone:'تم إرسال الرابط. تحقق من بريدك، غيّر كلمة المرور ثم أعد ربط الموصّل من {c}.',
ct:'السماح لـ {c}؟',cs:'متصل بحساب',p1:'توليد أصوات باستعمال نقاط حسابك',p2:'الاطلاع على رصيد نقاطك',p3:'عرض سجلّ توليداتك',allow:'السماح',deny:'رفض',switchacc:'تغيير الحساب',
note:'سيتمكن {c} من استعمال حسابك في Sawtify. يمكنك إلغاء هذا الوصول في أي وقت بحذف الموصّل.',
chk:'تم إنشاء الحساب. أكّد بريدك الإلكتروني عبر الرابط المرسل ثم أعد الاتصال من {c}.',
bad:'بيانات الدخول غير صحيحة. تحقق من بريدك وكلمة المرور.',mism:'كلمتا المرور غير متطابقتين.',short:'كلمة المرور: 6 أحرف على الأقل.',gen:'حدث خطأ. حاول مجدداً بعد لحظات.',goog:'تعذر الاتصال عبر Google. حاول مجدداً.',
exists:'يوجد حساب بهذا البريد بالفعل. سجّل الدخول.',
np:'رابط الاتصال غير صالح أو منتهي. أعد إضافة الموصّل من مساعدك الذكي.',
npok:'تم تسجيل الدخول. ارجع إلى مساعدك الذكي وأعد ربط موصّل Sawtify.',
generic:'مساعدك الذكي'
}};
var lang=localStorage.getItem(LK)||((navigator.language||'fr').slice(0,2)==='ar'?'ar':'fr');
function tr(k){return (T[lang][k]||T.fr[k]||'').split('{c}').join(clientName());}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var P=null;
if(CFG.params){P=CFG.params;try{sessionStorage.setItem(KEY,JSON.stringify(P));}catch(e){}}
else{try{P=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch(e){P=null;}}
function clientName(){return P&&P.client_name?P.client_name:T[lang].generic;}
var view='login',err='',info='',busy=false,showPw=false,session=null,vals={fn:'',ln:'',em:'',pw:'',pw2:''};
var app=document.getElementById('app');

function field(id,type,icon,ph,extra){
 var pwd=type==='password';
 return '<div class="f'+(icon==='user'?' u':'')+'">'+I[icon]+'<input id="'+id+'" class="'+(pwd?'pw':'')+'" type="'+(pwd&&showPw?'text':type)+'" placeholder="'+esc(ph)+'" value="'+esc(vals[id]||'')+'" autocomplete="'+(extra||'off')+'" />'+
 (pwd&&id==='pw'?'<button type="button" class="eye" id="eye">'+(showPw?I.eyeoff:I.eye)+'</button>':'')+'</div>';
}
function side(){
 return '<div class="left"><div class="blob" style="top:-96px;right:-96px;width:384px;height:384px;background:rgba(232,121,249,.2)"></div><div class="blob" style="bottom:0;left:0;width:320px;height:320px;background:rgba(192,132,252,.2)"></div>'+
 '<div class="brand"><div class="logo"><img src="'+CFG.logo+'" alt="Sawtify"/></div><b>SAWTIFY</b></div>'+
 '<div class="pitch"><h2>'+esc(tr('side'))+'</h2>'+
 '<div class="feat"><i>'+I.link+'</i><span>'+esc(tr('f1'))+'</span></div>'+
 '<div class="feat"><i>'+I.mic+'</i><span>'+esc(tr('f2'))+'</span></div>'+
 '<div class="feat"><i>'+I.coin+'</i><span>'+esc(tr('f3'))+'</span></div></div>'+
 '<div class="sec">'+I.shield+'<span>'+esc(tr('secure'))+'</span></div></div>';
}
function msgs(){
 return (err?'<div class="err">'+I.alert+'<span>'+esc(err)+'</span></div>':'')+(info?'<div class="ok">'+esc(info)+'</div>':'');
}
function head(title,sub){return '<div class="mlogo"><img src="'+CFG.logo+'" alt="Sawtify"/></div><h1>'+esc(title)+'</h1><p class="sub">'+esc(sub)+'</p>';}
function googleBtn(label){return '<button class="gbtn" id="google"'+(busy?' disabled':'')+'>'+(busy?'<span class="spin"></span>':I.google+'<span>'+esc(label)+'</span>')+'</button>';}
function ssl(){return '<div class="ssl">'+I.shield+'<span>'+esc(lang==='ar'?'اتصال مشفر وآمن 256-bit':'Connexion sécurisée SSL 256-bit')+'</span></div>';}
function pbtn(id,label,loading){return '<button class="pbtn" id="'+id+'" type="submit"'+(busy?' disabled':'')+'>'+(busy?'<span class="spin"></span><span>'+esc(loading)+'</span>':'<span>'+esc(label)+'</span>')+'</button>';}

function body(){
 if(view==='np'){return head(tr('np'),'')+'<button class="pbtn" id="gohome">sawtify.space</button>';}
 if(view==='done'){return '<div class="cc">'+I.shield+'</div><h1>'+esc(tr('npok'))+'</h1>';}
 if(view==='consent'){
  var em=session&&session.user&&session.user.email?session.user.email:'';
  return '<div class="cc">'+I.link+'</div>'+head(tr('ct'),'')+msgs()+
   '<div class="who"><span>'+esc(tr('cs'))+'</span><b>'+esc(em)+'</b></div>'+
   '<ul class="perm"><li>'+I.mic+esc(tr('p1'))+'</li><li>'+I.coin+esc(tr('p2'))+'</li><li>'+I.clock+esc(tr('p3'))+'</li></ul>'+
   '<button class="pbtn" id="allow"'+(busy?' disabled':'')+'>'+(busy?'<span class="spin"></span>':'<span>'+esc(tr('allow'))+'</span>')+'</button>'+
   '<button class="sbtn" id="deny">'+esc(tr('deny'))+'</button>'+
   '<div class="foot"><button class="lnk" id="switch">'+esc(tr('switchacc'))+'</button></div>'+
   '<p class="note">'+esc(tr('note'))+'</p>'+ssl();
 }
 if(view==='reset'){
  return head(tr('rt'),tr('rs'))+msgs()+
   (info?'':'<form id="rform">'+field('em','email','mail',tr('em'),'email')+pbtn('rgo',tr('rsend'),tr('rsend'))+'</form>')+
   '<button class="sbtn" id="rback">'+esc(tr('back'))+'</button>'+ssl();
 }
 if(view==='signup'){
  return head(tr('st'),tr('ss'))+msgs()+googleBtn(tr('gs'))+
   '<div class="or"><span>'+esc(tr('or'))+'</span></div>'+
   '<form id="sform"><div class="row2">'+field('fn','text','user',tr('fn'),'given-name')+field('ln','text','user',tr('ln'),'family-name')+'</div>'+
   field('em','email','mail',tr('em'),'email')+field('pw','password','lock',tr('pw'),'new-password')+field('pw2','password','lock',tr('pw2'),'new-password')+
   pbtn('sgo',tr('signup'),tr('signing'))+'</form>'+
   '<div class="foot"><span>'+esc(tr('have'))+'</span> <button class="lnk" id="tologin">'+esc(tr('signin'))+'</button></div>'+ssl();
 }
 return head(tr('lt'),tr('ls'))+msgs()+googleBtn(tr('gl'))+
  '<div class="pill">'+I.spark+'<span>'+esc(tr('inst'))+'</span></div>'+
  '<div class="or" style="margin-top:6px"><span>'+esc(tr('or'))+'</span></div>'+
  '<form id="lform">'+field('em','email','mail',tr('em'),'email')+field('pw','password','lock',tr('pw'),'current-password')+
  '<div class="forgot"><button type="button" class="lnk" id="toreset">'+esc(tr('forgot'))+'</button></div>'+
  pbtn('lgo',tr('login'),tr('logging'))+'</form>'+
  '<div class="foot"><span>'+esc(tr('no'))+'</span> <button class="lnk" id="tosignup">'+esc(tr('create'))+'</button></div>'+ssl();
}

function render(){
 document.documentElement.lang=lang;document.body.dir=lang==='ar'?'rtl':'ltr';
 document.title='Sawtify';
 app.innerHTML='<div class="wrap">'+side()+'<div class="right"><div class="lang"><button id="l-fr" class="'+(lang==='fr'?'on':'')+'">FR</button><button id="l-ar" class="'+(lang==='ar'?'on':'')+'">عربي</button></div><div class="card">'+body()+'</div></div></div>';
 bind();
}
function $(id){return document.getElementById(id);}
function keep(){['fn','ln','em','pw','pw2'].forEach(function(k){var e=$(k);if(e)vals[k]=e.value;});}
function go(v){keep();view=v;err='';info='';busy=false;render();}
function on(id,ev,fn){var e=$(id);if(e)e.addEventListener(ev,fn);}

function bind(){
 on('l-fr','click',function(){keep();lang='fr';localStorage.setItem(LK,lang);render();});
 on('l-ar','click',function(){keep();lang='ar';localStorage.setItem(LK,lang);render();});
 on('eye','click',function(){keep();showPw=!showPw;render();});
 on('tosignup','click',function(){go('signup');});
 on('tologin','click',function(){go('login');});
 on('toreset','click',function(){go('reset');});
 on('rback','click',function(){go('login');});
 on('gohome','click',function(){location.href=location.origin;});
 on('google','click',google);
 on('lform','submit',function(e){e.preventDefault();login();});
 on('sform','submit',function(e){e.preventDefault();signup();});
 on('rform','submit',function(e){e.preventDefault();reset();});
 on('allow','click',approve);
 on('deny','click',deny);
 on('switch','click',function(){sb.auth.signOut().then(function(){session=null;go('login');});});
}
function back(){return location.origin+'/oauth/authorize';}
function google(){
 keep();busy=true;err='';render();
 sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:back(),queryParams:{prompt:'select_account'}}}).then(function(r){
  if(r&&r.error){busy=false;err=tr('goog');render();}
 });
}
function login(){
 keep();if(!vals.em||!vals.pw)return;busy=true;err='';render();
 sb.auth.signInWithPassword({email:vals.em.trim(),password:vals.pw}).then(function(r){
  if(r.error){busy=false;err=tr('bad');render();return;}
  session=r.data.session;afterAuth();
 }).catch(function(){busy=false;err=tr('gen');render();});
}
function signup(){
 keep();
 if(vals.pw.length<6){err=tr('short');render();return;}
 if(vals.pw!==vals.pw2){err=tr('mism');render();return;}
 if(!vals.em)return;
 busy=true;err='';render();
 var full=[vals.fn.trim(),vals.ln.trim()].filter(Boolean).join(' ');
 sb.auth.signUp({email:vals.em.trim(),password:vals.pw,options:{emailRedirectTo:back(),data:{full_name:full,first_name:vals.fn.trim(),last_name:vals.ln.trim(),password_set_at:new Date().toISOString()}}}).then(function(r){
  if(r.error){busy=false;err=/registered|exists/i.test(r.error.message||'')?tr('exists'):(r.error.message||tr('gen'));render();return;}
  if(r.data&&r.data.user&&r.data.user.identities&&r.data.user.identities.length===0){busy=false;err=tr('exists');render();return;}
  if(r.data&&r.data.session){session=r.data.session;afterAuth();}
  else{busy=false;view='login';info=tr('chk');render();}
 }).catch(function(){busy=false;err=tr('gen');render();});
}
function reset(){
 keep();if(!vals.em)return;busy=true;err='';render();
 sb.auth.resetPasswordForEmail(vals.em.trim(),{redirectTo:location.origin}).then(function(r){
  busy=false;if(r.error){err=tr('gen');}else{info=tr('rdone');}render();
 });
}
/* Compte tout juste créé : même contrôle anti-abus du bonus de bienvenue que sur la plateforme. */
function claimBonus(s){
 try{
  var u=s.user,f='sawtify_bonus_claimed_'+u.id;
  if(localStorage.getItem(f))return;
  if(Date.now()-Date.parse(u.created_at)>5*60*1000)return;
  localStorage.setItem(f,'1');
  fetch('/api/auth/claim-welcome-bonus',{method:'POST',headers:{Authorization:'Bearer '+s.access_token}}).catch(function(){});
 }catch(e){}
}
function afterAuth(){
 busy=false;err='';info='';
 if(session)claimBonus(session);
 view=P?'consent':'done';render();
}
function approve(){
 if(!session||!P)return;busy=true;err='';render();
 sb.auth.getSession().then(function(r){
  var s=r.data&&r.data.session;if(!s){busy=false;go('login');return;}
  return fetch('/oauth/approve',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},
   body:JSON.stringify({client_id:P.client_id,redirect_uri:P.redirect_uri,code_challenge:P.code_challenge,state:P.state})})
  .then(function(x){return x.json();}).then(function(j){
   if(j.redirect){try{sessionStorage.removeItem(KEY);}catch(e){}location.href=j.redirect;}
   else{busy=false;err=j.error||tr('gen');render();}
  });
 }).catch(function(){busy=false;err=tr('gen');render();});
}
function deny(){
 if(!P)return;try{sessionStorage.removeItem(KEY);}catch(e){}
 var u=P.redirect_uri+(P.redirect_uri.indexOf('?')>-1?'&':'?')+'error=access_denied'+(P.state?'&state='+encodeURIComponent(P.state):'');
 location.href=u;
}
render();
sb.auth.getSession().then(function(r){
 session=r.data&&r.data.session;
 if(!CFG.params&&location.hash&&location.hash.indexOf('access_token')>-1){try{history.replaceState(null,'',location.pathname);}catch(e){}}
 if(!P&&!session){view='np';render();return;}
 if(session){afterAuth();}else{render();}
});
})();
`;

export function renderAuthorizePage(o: AuthorizePageOptions): string {
  const cfg = JSON.stringify({ supabaseUrl: o.supabaseUrl, supabaseAnonKey: o.supabaseAnonKey, params: o.params, logo: LOGO }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Sawtify</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div id="app"></div>
<script>window.__CFG=${cfg};</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>${JS}</script>
</body></html>`;
}
