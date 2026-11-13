'use strict';
// Rule-based desi streamer host (no LLM). Lines are casual Hinglish written in Devanagari so the Hindi voice
// pronounces them naturally. Every category has many variants; a shuffle-bag picker never repeats a line back to back.

const host = () => process.env.HOST_NAME_HI || 'रिया';

// ---------------- names (Devanagari so the voice says them properly) ----------------
const NAMES = {
  rahul: 'राहुल', priya: 'प्रिया', aman: 'अमन', sneha: 'स्नेहा', vikas: 'विकास', neha: 'नेहा', rohit: 'रोहित', amit: 'अमित', ankit: 'अंकित', ankita: 'अंकिता',
  pooja: 'पूजा', puja: 'पूजा', rohan: 'रोहन', rajesh: 'राजेश', suresh: 'सुरेश', ramesh: 'रमेश', mahesh: 'महेश', sachin: 'सचिन', sandeep: 'संदीप', deepak: 'दीपक',
  deepika: 'दीपिका', anjali: 'अंजलि', kavita: 'कविता', sunita: 'सुनीता', ravi: 'रवि', vijay: 'विजय', ajay: 'अजय', sanjay: 'संजय', manoj: 'मनोज', arjun: 'अर्जुन',
  karan: 'करण', kunal: 'कुणाल', nikhil: 'निखिल', mohit: 'मोहित', harsh: 'हर्ष', himanshu: 'हिमांशु', shubham: 'शुभम', shivam: 'शिवम', aditya: 'आदित्य',
  abhishek: 'अभिषेक', ashish: 'आशीष', akash: 'आकाश', aakash: 'आकाश', ayush: 'आयुष', yash: 'यश', tanvi: 'तन्वी', riya: 'रिया', ria: 'रिया', simran: 'सिमरन',
  komal: 'कोमल', divya: 'दिव्या', shruti: 'श्रुति', swati: 'स्वाति', megha: 'मेघा', nisha: 'निशा', payal: 'पायल', pallavi: 'पल्लवी', preeti: 'प्रीति',
  ritu: 'ऋतु', sakshi: 'साक्षी', shweta: 'श्वेता', isha: 'ईशा', aarav: 'आरव', vivek: 'विवेक', varun: 'वरुण', gaurav: 'गौरव', saurabh: 'सौरभ', sumit: 'सुमित',
  tarun: 'तरुण', naveen: 'नवीन', mukesh: 'मुकेश', dinesh: 'दिनेश', ganesh: 'गणेश', lokesh: 'लोकेश', naresh: 'नरेश', jitendra: 'जितेंद्र', ritesh: 'रितेश',
  paras: 'पारस', piyush: 'पीयूष', prashant: 'प्रशांत', pankaj: 'पंकज', om: 'ओम', raj: 'राज', rishabh: 'ऋषभ', rishi: 'ऋषि', krishna: 'कृष्णा', kiran: 'किरण',
  mohan: 'मोहन', imran: 'इमरान', salman: 'सलमान', faizan: 'फ़ैज़ान', arman: 'अरमान', sahil: 'साहिल', sunny: 'सनी', bunty: 'बंटी', golu: 'गोलू', monu: 'मोनू',
  sonu: 'सोनू', raju: 'राजू', bablu: 'बबलू', guddu: 'गुड्डू', anil: 'अनिल', sunil: 'सुनील', vinod: 'विनोद', anita: 'अनीता', sita: 'सीता', geeta: 'गीता',
  ram: 'राम', shyam: 'श्याम', hari: 'हरि', mohd: 'मोहम्मद', mohammad: 'मोहम्मद', ali: 'अली', vishal: 'विशाल', kapil: 'कपिल', tushar: 'तुषार',
  utkarsh: 'उत्कर्ष', anuj: 'अनुज', ishaan: 'ईशान', dev: 'देव', jay: 'जय', veer: 'वीर', harshit: 'हर्षित', nitin: 'नितिन', ramu: 'रामू', pappu: 'पप्पू',
  chotu: 'छोटू', babu: 'बाबू', mitali: 'मिताली', radha: 'राधा', mansi: 'मानसी', khushi: 'खुशी', muskan: 'मुस्कान', zoya: 'ज़ोया', sam: 'सैम', tina: 'टीना',
};

function spokenName(raw) {
  const s = String(raw || '').trim();
  if (/[ऀ-ॿ]/.test(s)) return s;
  const word = (s.match(/[A-Za-z]{2,}/) || [''])[0].toLowerCase();
  if (!word || /^(user|guest|yt|the|xx|pro|gamer|gaming|official)$/.test(word)) return 'दोस्त';
  return NAMES[word] || transliterate(word);
}

// Rough Hinglish -> Devanagari for names not in the list (a Hindi voice cannot read Latin letters properly).
function transliterate(word) {
  const V = { aa: ['आ', 'ा'], ee: ['ई', 'ी'], ii: ['ई', 'ी'], oo: ['ऊ', 'ू'], ai: ['ऐ', 'ै'], au: ['औ', 'ौ'], a: ['अ', ''], i: ['इ', 'ि'], u: ['उ', 'ु'], e: ['ए', 'े'], o: ['ओ', 'ो'] };
  const C = { kh: 'ख', gh: 'घ', ch: 'च', jh: 'झ', th: 'थ', dh: 'ध', ph: 'फ', bh: 'भ', sh: 'श', b: 'ब', c: 'क', d: 'द', f: 'फ', g: 'ग', h: 'ह', j: 'ज', k: 'क', l: 'ल', m: 'म', n: 'न', p: 'प', q: 'क', r: 'र', s: 'स', t: 'ट', v: 'व', w: 'व', x: 'क्स', y: 'य', z: 'ज़' };
  const s = word.toLowerCase();
  let out = '';
  let i = 0;
  let afterCons = false;
  const take = (map) => { for (const k of Object.keys(map).sort((a, b) => b.length - a.length)) if (s.startsWith(k, i)) return k; return null; };
  while (i < s.length) {
    const v = take(V);
    if (v) {
      // word-final "a" after a consonant is long (Priya, Sneha); a middle "a" is the inherent vowel
      out += afterCons ? (v === 'a' && i + 1 === s.length ? 'ा' : V[v][1]) : V[v][0];
      i += v.length;
      afterCons = false;
      continue;
    }
    const c = take(C);
    if (!c) { i += 1; continue; }
    if (afterCons) out += '्';
    out += C[c];
    i += c.length;
    afterCons = true;
  }
  return out || 'दोस्त';
}

// ---------------- shuffle-bag picker: every variant is used once before any repeats, never the same line twice in a row ----------------
const bags = {};
function pick(id, arr) {
  if (!arr.length) return '';
  let b = bags[id];
  if (!b || !b.left.length) {
    const order = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
    if (b && arr.length > 1 && order[0] === b.last) order.push(order.shift());
    b = bags[id] = { left: order, last: b ? b.last : -1 };
  }
  const i = b.left.shift();
  b.last = i;
  return arr[i];
}
// Unknown placeholders are kept, so a line can be filled in two steps ({x} first, then the viewer's {n}).
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k] === null ? '' : o[k]));
const list = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' और ' + a[a.length - 1]);
const w = (words) => new RegExp('(?:^|[^a-z0-9])(?:' + words.join('|') + ')(?:$|[^a-z0-9])', 'i');

// ---------------- chat intents ----------------
const ABUSE = w(['chutiya', 'madarchod', 'behenchod', 'bc', 'mc', 'bsdk', 'gandu', 'randi', 'harami', 'kutta', 'kamina', 'fuck', 'fck', 'bitch', 'bastard', 'asshole', 'mkc', 'lund', 'gaand', 'bhosd\\w*', 'tmkc', 'sex', 'nude', 'porn', 'nangi', 'saali', 'sala']);

const CITIES = {
  delhi: 'दिल्ली', mumbai: 'मुंबई', pune: 'पुणे', kolkata: 'कोलकाता', chennai: 'चेन्नई', bangalore: 'बेंगलुरु', bengaluru: 'बेंगलुरु', hyderabad: 'हैदराबाद',
  jaipur: 'जयपुर', lucknow: 'लखनऊ', kanpur: 'कानपुर', patna: 'पटना', bihar: 'बिहार', up: 'यूपी', mp: 'एमपी', indore: 'इंदौर', bhopal: 'भोपाल', ahmedabad: 'अहमदाबाद',
  surat: 'सूरत', nagpur: 'नागपुर', ranchi: 'रांची', jharkhand: 'झारखंड', assam: 'असम', guwahati: 'गुवाहाटी', odisha: 'ओडिशा', bhubaneswar: 'भुवनेश्वर', chandigarh: 'चंडीगढ़',
  punjab: 'पंजाब', haryana: 'हरियाणा', gurgaon: 'गुड़गाँव', noida: 'नोएडा', ghaziabad: 'गाज़ियाबाद', dehradun: 'देहरादून', uttarakhand: 'उत्तराखंड', rajasthan: 'राजस्थान',
  gujarat: 'गुजरात', maharashtra: 'महाराष्ट्र', kerala: 'केरल', karnataka: 'कर्नाटक', goa: 'गोवा', varanasi: 'बनारस', banaras: 'बनारस', prayagraj: 'प्रयागराज',
  allahabad: 'प्रयागराज', agra: 'आगरा', meerut: 'मेरठ', nepal: 'नेपाल', jodhpur: 'जोधपुर', udaipur: 'उदयपुर', raipur: 'रायपुर', gorakhpur: 'गोरखपुर', ludhiana: 'लुधियाना',
  amritsar: 'अमृतसर', kashmir: 'कश्मीर', jammu: 'जम्मू', shimla: 'शिमला', dubai: 'दुबई', canada: 'कनाडा', usa: 'अमेरिका', america: 'अमेरिका',
};
const FROM_RE = w(['se hu', 'se hoon', 'se hun', 'from', 'me rehta', 'mein rehta', 'me rehti', 'ka hu', 'ki hu', 'wale', 'से हूँ', 'से हूं', 'वाला', 'वाली']);

const HOOKS = [
  'अच्छा बताओ, अगला लेवल पहली बार में निकलेगा?', 'और हाँ, डबल टैप करना मत भूलना!', 'आप कहाँ से देख रहे हो, बताओ?', 'चैट में बने रहना, मज़ा आने वाला है!',
  'आपकी फेवरेट गेंद कौन सी है अब तक?', 'चलो देखते हैं अब क्या होता है!',
];

const INTENTS = [
  { id: 'ram', re: w(['ram ram', 'jai shree ram', 'jai shri ram', 'जय श्री राम', 'राम राम', 'jai siya ram']), tail: false, replies: ['जय श्री राम {n}! आ जाओ आ जाओ, स्वागत है।', 'राम राम {n}! आपको भी राम राम, बैठो आराम से।', '{n}, जय श्री राम! आज की स्ट्रीम एकदम धमाकेदार होगी।'] },
  { id: 'radhe', re: w(['radhe radhe', 'राधे राधे', 'jai shri krishna', 'जय श्री कृष्ण', 'hare krishna']), tail: false, replies: ['राधे राधे {n}! आपका दिन एकदम मस्त जाए।', '{n}, राधे राधे! स्वागत है जी।'] },
  { id: 'pray', re: w(['jai mata di', 'जय माता दी', 'har har mahadev', 'हर हर महादेव', 'jai bholenath', 'sat sri akal', 'सत श्री अकाल', 'waheguru', 'jai hanuman', 'जय हनुमान']), tail: false, replies: ['जय हो {n}! आपको भी प्रणाम, स्वागत है।', '{n}, आपको भी! भगवान सबको खुश रखे।'] },
  { id: 'salam', re: w(['salam', 'assalam\\w*', 'salaam', 'सलाम']), tail: false, replies: ['वालेकुम अस्सलाम {n}! आ जाओ, स्वागत है।', '{n}, वालेकुम अस्सलाम! कैसे हो?'] },
  { id: 'morning', re: w(['good morning', 'gm', 'suprabhat', 'सुप्रभात', 'गुड मॉर्निंग']), replies: ['गुड मॉर्निंग {n}! चाय पी के आए हो या सीधा स्ट्रीम पे?', '{n}, गुड मॉर्निंग! सुबह सुबह गेम, वाह, क्या बात है।', 'मॉर्निंग मॉर्निंग {n}! आज का दिन एकदम झक्कास जाएगा।'] },
  { id: 'night', re: w(['good night', 'gn', 'shubh ratri', 'शुभ रात्रि', 'गुड नाइट']), tail: false, replies: ['गुड नाइट {n}! स्वीट ड्रीम्स, कल फिर आना।', '{n}, सो जाओ अब, आराम करो! कल मिलते हैं।', 'अरे {n} जा रहे हो? चलो गुड नाइट, ध्यान रखना!'] },
  { id: 'how', re: w(['kaise ho', 'kaisi ho', 'kese ho', 'kaise hain', 'how are you', 'hru', 'kya haal', 'kaisa hai', 'wassup', 'sup', 'कैसे हो', 'कैसी हो', 'क्या हाल']), replies: ['एकदम बढ़िया {n}! आप सुनाओ, क्या चल रहा है?', 'मस्त हूँ {n}, और आपके आने से तो और मस्त! आप कैसे हो?', 'मैं तो फुल चार्ज्ड हूँ {n}! आपका दिन कैसा गया?', 'सब बढ़िया {n}, पूछने के लिए थैंक यू! आप बताओ?'] },
  { id: 'gamename', re: w(['game name', 'game ka naam', 'kaun sa game', 'konsa game', 'kon sa game', 'which game', 'name of game', 'what game', 'गेम का नाम', 'कौन सा गेम']), replies: ['{n}, ये स्टैक बॉल वाला गेम है! गेंद प्लेटें तोड़ती है, बस काली वाली से बचना है।', 'गेम का नाम? स्टैक बॉल जैसा है {n}! दिखने में आसान, पर काली पट्टी सब बिगाड़ देती है।', '{n}, स्टैक बॉल! सिंपल गेम है, पर देखने में इतना सैटिस्फाइंग है ना!'] },
  { id: 'asklevel', re: w(['kitna level', 'kitne level', 'kitne tak', 'kitna jayega', 'kitna aage', 'kitna door', 'how far', 'which level', 'कितने लेवल', 'कितना लेवल', 'कितना आगे']), replies: ['{n}, अभी हम लेवल {lv} पे हैं, और रिकॉर्ड {best} का है। आपका अंदाज़ा क्या है?', 'हम्म {n}, अभी लेवल {lv} चल रहा है! कितना जाएगा ये तो गेंद ही जाने, आप बोलो?', '{n}, ये तो आप बताओ! लेवल {lv} चल रहा है, और अब तक सबसे आगे {best} तक गए हैं।'] },
  { id: 'name', re: w(['tumhara naam', 'aapka naam', 'your name', 'naam kya', 'kaun ho', 'who are you', 'ur name', 'तुम्हारा नाम', 'आपका नाम', 'कौन हो']), replies: ['मैं {host} हूँ {n}! इस लाइव की होस्ट, आपके कमेंट पढ़ने वाली।', '{n}, नाम है {host}! और बातें दिल से करती हूँ।'] },
  { id: 'real', re: w(['are you real', 'are you ai', 'are you a bot', 'are u real', 'is this ai', 'is she real', 'real hai', 'real ho', 'ai hai', 'ai ho', 'bot ho', 'bot hai kya', 'robot ho', 'asli ho', 'asli hai', 'fake hai', 'insan ho', 'real girl', 'ai voice', 'असली हो', 'असली है', 'एआई हो', 'एआई है', 'रोबोट हो']), replies: ['सच बताऊँ {n}? हाँ, आवाज़ एआई वाली है, गेम ऑटो चलता है। पर चैट और मस्ती सौ प्रतिशत असली है!', '{n}, कुछ नहीं छुपाऊँगी, आवाज़ एआई की है। पर आपके कमेंट मैं सच में पढ़ रही हूँ!'] },
  { id: 'support', re: w(['donate', 'donation', 'support', 'qr', 'scan', 'paytm', 'gpay', 'phonepe', 'upi', 'tip', 'paise', 'contribute', 'kaise de', 'सपोर्ट', 'पैसे', 'स्कैन']), replies: ['{n}, साइड में जो क्यूआर है ना, किसी भी यूपीआई ऐप से स्कैन कर लो। दस बीस रुपये भी बहुत हैं!', '{n}, क्यूआर स्कैन करो, या चैट में जो यूपीआई आईडी लिखी है, उसपे भेज दो। थैंक यू पूछने के लिए!', 'अरे {n}, आपने पूछा, यही बहुत है! क्यूआर साइड में है, दस रुपये से भी सपोर्ट हो जाता है।'] },
  { id: 'boundary', re: w(['i love you', 'love you', 'luv u', 'shaadi', 'shadi', 'marry', 'number do', 'number dedo', 'insta id', 'whatsapp', 'gf', 'bf', 'dating', 'date', 'शादी', 'नंबर दो', 'आई लव यू']), tail: false, replies: ['अरे अरे {n}, कंट्रोल! गेम पे ध्यान दो, गेंद मेहनत कर रही है।', '{n}, हाहा, मैं तो बस होस्ट हूँ यार! चलो गेम देखो।', 'ना ना {n}, ये सब नहीं! यहाँ सिर्फ़ गेम और मस्ती होगी।'] },
  { id: 'link', re: w(['link', 'download', 'play store', 'apk', 'kahan milega', 'kaha milega', 'लिंक', 'डाउनलोड']), replies: ['{n}, गेम हमने खुद बनाया है, अभी डाउनलोड के लिए नहीं है। पर यहाँ फ्री में देखो, पूरा मज़ा!', 'डाउनलोड लिंक अभी नहीं है {n}, सॉरी! स्ट्रीम पे बने रहो, यहीं सब दिखेगा।'] },
  { id: 'roast', re: w(['noob', 'bekar', 'bakwas', 'slow', 'boring', 'ganda', 'faltu', 'weak', 'bad', 'बेकार', 'बकवास', 'नूब', 'फालतू']), replies: ['{n} बोल रहे हैं नूब है! अरे धीरे बोलो, गेंद सुन लेगी तो रो देगी। देखो अभी कैसे कमाल होता है!', 'हाहा {n}, अब तो इज़्ज़त का सवाल है! चलो देखते हैं अगला लेवल कैसे जाता है।', '{n}, ठीक है ठीक है, आज साबित करना पड़ेगा! चैलेंज एक्सेप्टेड।'] },
  { id: 'boss', re: w(['boss', 'hard', 'tough', 'mushkil', 'black', 'kala', 'बॉस', 'मुश्किल', 'काला', 'काली']), replies: ['सही पकड़ा {n}! बॉस लेवल में तो मेरी भी धड़कन बढ़ जाती है।', '{n}, वो काली पट्टियाँ ही तो असली विलेन हैं इस गेम की!', 'हाँ यार {n}, मुश्किल तो है, पर ये गेंद भी कम ज़िद्दी नहीं है!'] },
  { id: 'fail', re: w(['fail hoga', 'fail ho', 'haar jayega', 'haar jaega', 'mar jayega', 'mar jaega', 'marega', 'nahi hoga', 'nahi jayega', 'फेल होगा', 'हार जाएगा', 'मर जाएगा']), replies: ['{n} को भरोसा ही नहीं है! हाहा, चलो देखते हैं कौन सही है।', 'ओए {n}, नज़र मत लगाओ यार! गेंद घबरा जाएगी।', '{n}, अगर बच गया तो चैट में सॉरी बोलना पड़ेगा, डील?'] },
  { id: 'pass', re: w(['pass hoga', 'pass karega', 'pass kar dega', 'jeet jayega', 'jitega', 'clear hoga', 'clear karega', 'ho jayega', 'पास होगा', 'पास करेगा', 'जीत जाएगा']), replies: ['ये हुई ना बात {n}! पॉज़िटिव वाइब्स, गेंद तक पहुँच गई।', '{n} का भरोसा देखो! अब तो ये लेवल पास होना ही पड़ेगा।', 'वाह {n}, आपकी दुआ लग गई तो समझो हो गया!'] },
  { id: 'voice', re: w(['awaz', 'avaz', 'aawaz', 'voice', 'sweet voice', 'आवाज़', 'आवाज']), replies: ['अरे थैंक यू {n}! आवाज़ पसंद आई, दिन बन गया मेरा।', '{n}, सच में? शर्मा गई मैं तो, थैंक यू!'] },
  { id: 'looks', re: w(['beautiful', 'cute', 'pretty', 'sundar', 'pyari', 'gorgeous', 'hot', 'khoobsurat', 'सुंदर', 'प्यारी', 'खूबसूरत']), tail: false, replies: ['थैंक यू {n}! पर असली हीरो तो ये गेंद है, उसे देखो!', 'अरे {n}, तारीफ़ के लिए थैंक यू! चलो चलो, गेम पे ध्यान।'] },
  { id: 'praise', re: w(['pro', 'best', 'superb', 'mast', 'badhiya', 'zabardast', 'awesome', 'op', 'gg', 'nice', 'great', 'amazing', 'kamal', 'lajawab', 'wow', 'good', 'sahi', 'cool', 'satisfying', 'बढ़िया', 'ज़बरदस्त', 'जबरदस्त', 'शानदार', 'मस्त', 'कमाल', 'सही']), replies: ['एकदम सही बोले {n}! आज गेंद पूरे फॉर्म में है।', 'थैंक यू {n}! सैटिस्फाइंग है ना? मैं तो देखती ही रह जाती हूँ।', '{n} को पसंद आया, मतलब स्ट्रीम सफल! हाहा।', 'ओ हो {n}! आपके कमेंट से तो गेंद में भी जोश आ गया।', '{n}, बस ऐसे ही चैट में आग लगाते रहो!'] },
  { id: 'laugh', re: w(['haha\\w*', 'hehe\\w*', 'lol', 'lmao', 'rofl', 'हा हा\\w*', 'हाहा\\w*']), replies: ['हाहा {n}, आप भी ना! मुझे भी हँसी आ गई।', '{n} हँस रहे हैं, मतलब मज़ा आ रहा है! बढ़िया।', 'अरे {n}, इतना मत हँसो, गेंद शर्मा जाएगी!'] },
  { id: 'thanks', re: w(['thanks', 'thank you', 'thnx', 'tysm', 'shukriya', 'dhanyavad', 'धन्यवाद', 'शुक्रिया']), tail: false, replies: ['अरे {n}, थैंक यू तो आपको! आप आए, यही बहुत है।', '{n}, आपका भी शुक्रिया, बने रहना!'] },
  { id: 'bye', re: w(['bye', 'tata', 'chalta hu', 'chalti hu', 'jaa raha', 'jaa rahi', 'going', 'see you', 'फिर मिलेंगे', 'चलता हूँ', 'चलती हूँ', 'टाटा']), tail: false, replies: ['अरे {n}, इतनी जल्दी? चलो बाय बाय, कल पक्का आना!', 'टाटा {n}! जाते जाते एक लाइक, बस!', 'बाय {n}! आपकी कमी खलेगी चैट में।'] },
  { id: 'food', re: w(['chai', 'coffee', 'khana', 'lunch', 'dinner', 'breakfast', 'nashta', 'चाय', 'खाना', 'नाश्ता']), replies: ['{n}, चाय और स्टैक बॉल, इससे बढ़िया कॉम्बो कोई नहीं!', 'अरे {n}, खाना खा रहे हो? मुझे भी भूख लगा दी यार!'] },
  { id: 'music', re: w(['music', 'song', 'gana', 'gaana', 'beat', 'म्यूज़िक', 'गाना']), replies: ['म्यूज़िक पसंद आया {n}? ये धुन गेम के साथ ही बनती रहती है!', '{n}, म्यूज़िक और प्लेटों की आवाज़, दोनों मिलकर वाइब बना देते हैं ना?'] },
];

const QUESTION_RE = w(['kya', 'kab', 'kaise', 'kyun', 'kyu', 'kaun', 'kitna', 'kitne', 'kahan', 'how', 'what', 'why', 'when', 'where', 'who', 'क्या', 'कब', 'कैसे', 'क्यों', 'कौन', 'कितना', 'कितने', 'कहाँ']);
const QUESTION = ['अच्छा सवाल {n}! सच बोलूँ तो पक्का नहीं पता, पर देखते रहो, शायद गेम ही जवाब दे दे।', 'हम्म {n}, ये तो सोचने वाली बात है! चैट वालो, आपको पता है तो बताओ।', '{n}, ये सवाल मुझे भी कन्फ्यूज़ कर गया, हाहा! चैट, मदद करो।'];
const GREET_RE = w(['hi+', 'hello+', 'hey+', 'hlo', 'hlw', 'helo', 'namaste', 'namaskar', 'pranam', 'hola', 'नमस्ते', 'नमस्कार', 'हाय', 'हैलो', 'हेलो', 'प्रणाम']);
const GREET = ['अरे {n}! वेलकम वेलकम, आ जाओ आ जाओ!', '{n} आ गए! अब मज़ा आएगा, बैठो आराम से।', 'हेलो {n}! कैसे हो? सही टाइम पे आए हो, गेम गरम है।', 'ओहो, {n}! नमस्ते जी, स्ट्रीम पे स्वागत है।', 'हाय {n}! एकदम सही टाइम पे एंट्री मारी है!', '{n}, वेलकम यार! बताओ कहाँ से देख रहे हो?', 'अरे {n}, नमस्ते नमस्ते! चैट में बने रहना, आज धमाल होगा।', '{n} जी, आइए आइए! आज गेंद फुल फॉर्म में है।'];
const GREET_AGAIN = ['अरे {n}, फिर से हाय? हाहा, मैं यहीं हूँ, कहीं नहीं गई!', '{n}, हाँ हाँ, देख लिया आपको! पक्के दोस्त हो आप तो।'];
const REGULAR = ['{n} तो आज पूरी स्ट्रीम साथ हैं, असली दोस्त! ', 'हमारे रेगुलर {n} फिर से! ', '{n}, आप तो चैट की जान हो! '];
const EMOJI = ['{n} ने इमोजी भेजा! चलो, समझ गई मैं, फीलिंग्स पहुँच गईं।', 'वाह {n}, इमोजी की बारिश! और भेजो और भेजो!', '{n} के इमोजी देख के मज़ा आ गया!'];
const LOCATION = ['{x} से {n}! वाह, {x} वालो, हाथ ऊपर करो, चैट में बताओ और कौन है?', 'अरे {x}! {n}, वहाँ का मौसम कैसा है आज?', '{n}, {x} से देख रहे हो? क्या बात है, {x} की तो बात ही अलग है!', 'वेलकम {x} वाले {n}! दूर दूर से लोग आ रहे हैं आज।'];
const GUESS_LOW = ['{n}, {x}? अरे वो तो हम पार कर चुके! थोड़ा बड़ा सोचो यार।', 'हाहा {n}, {x} तो बहुत कम है, गेंद नाराज़ हो जाएगी!'];
const GUESS_NEAR = ['{n} बोल रहे हैं {x}! हम्म, हो सकता है, नोट कर लिया मैंने।', 'ठीक है {n}, {x} लेवल, याद रखना, सही निकला तो नाम लूँगी!', '{x}? {n}, ये तो बिल्कुल पॉसिबल है, देखते हैं!'];
const GUESS_HIGH = ['{x} लेवल! {n}, आपको तो पूरा भरोसा है!', 'ओ हो {n}, सीधा {x}! बड़ा सपना है, कोशिश पूरी होगी।', '{n} ने {x} बोल दिया! अब तो प्रेशर आ गया, हाहा।'];
const QUOTE = ['{n} लिखते हैं... "{q}"... हाहा, सही बात!', 'चलो {n} का कमेंट पढ़ती हूँ... "{q}"... मज़ा आ गया!', '{n} बोल रहे हैं... "{q}". बिल्कुल, मैं भी यही सोच रही थी!', '"{q}"... ये {n} ने लिखा है, क्या बात है!'];
const GENERIC_NEW = ['{n}, पहली बार चैट में? वेलकम वेलकम! बने रहना।', 'वेलकम {n}! आपका कमेंट मिल गया, बैठो मज़े लो।'];
const GENERIC = ['{n}, कमेंट पढ़ लिया मैंने! ऐसे ही लिखते रहो।', 'सही है {n}! आप जैसे लोगों से ही चैट ज़िंदा है।', '{n}, बिल्कुल! चैट वालो, आप भी कुछ बोलो।', 'हाहा {n}, मस्त! और बताओ, क्या चल रहा है?'];

let tailCount = 0;
const finish = (text, tail) => (tail !== false && ++tailCount % 3 === 0 && text.length < 110 ? text + ' ' + pick('hook', HOOKS) : text);

// ctx: { first, count, game:{level,bestLevel} }. Returns the line to speak, or null to stay silent (abuse).
function chatReply(m, ctx) {
  const raw = String(m.text || '');
  const t = raw.toLowerCase().normalize('NFKC');
  if (ABUSE.test(t)) return null;
  const g = (ctx && ctx.game) || {};
  const base = { n: spokenName(m.author), host: host(), lv: g.level || 1, best: g.bestLevel || 1 };
  const regular = ctx && ctx.count >= 3 && ctx.count % 3 === 0 ? fill(pick('reg', REGULAR), base) : '';
  const say = (text, tail) => regular + finish(fill(text, base), tail);

  for (const it of INTENTS) if (it.re.test(t)) return say(pick(it.id, it.replies), it.tail);

  const city = Object.keys(CITIES).find((c) => w([c]).test(t));
  if (city && (FROM_RE.test(t) || t.length < 30)) return say(fill(pick('loc', LOCATION), { x: CITIES[city] }));

  const num = t.match(/(?:^|[^0-9])(\d{1,3})(?:$|[^0-9])/);
  if (num && !/\b(rs|rupee|rupay|inr)\b|₹/.test(t) && (/level|lvl|jayega|jaega|pahunch|tak|guess|लेवल|तक|पहुँच/.test(t) || /^\s*\d{1,3}\s*$/.test(t))) {
    const x = Number(num[1]);
    const pool = x <= (g.level || 1) ? ['gl', GUESS_LOW] : x <= (g.bestLevel || 1) + 3 ? ['gn', GUESS_NEAR] : ['gh', GUESS_HIGH];
    return say(fill(pick(pool[0], pool[1]), { x }));
  }
  if (GREET_RE.test(t) && t.length <= 40) return say(pick(ctx && ctx.count > 1 ? 'greet2' : 'greet', ctx && ctx.count > 1 ? GREET_AGAIN : GREET), ctx && ctx.count > 1 ? false : true);
  if (!/[\p{L}\p{N}]/u.test(raw.replace(/[\p{Extended_Pictographic}\s]/gu, ''))) return say(pick('emoji', EMOJI), false);
  if (raw.includes('?') || QUESTION_RE.test(t)) return say(pick('q', QUESTION));
  // read interesting comments aloud (short, no links)
  // read the comment aloud only when it is written in Hindi script; English letters would come out garbled
  if (raw.length >= 6 && raw.length <= 70 && /[ऀ-ॿ]/.test(raw) && !/[A-Za-z]{3,}/.test(raw)) return say(fill(pick('quote', QUOTE), { q: raw.trim() }));
  return say(pick(ctx && ctx.first ? 'genn' : 'gen', ctx && ctx.first ? GENERIC_NEW : GENERIC));
}

// ---------------- game moments (short, excited, not every event) ----------------
const GAME = {
  level_start: ['चलो चलो, लेवल {n}! अब असली खेल शुरू।', 'लेवल {n} आ गया गाइज़! सीट बेल्ट बाँध लो।', 'ओके ओके, लेवल {n}... देखते हैं इस बार क्या होता है!'],
  level_ball: ['अरे देखो! इस लेवल में गेंद बन गई {ball}! हाहा, क्यूट है ना?', 'नई गेंद, नया जोश! अब हमारी गेंद है {ball}!', 'गाइज़, गेंद बदल गई! अब {ball} वाली गेंद, कैसी लगी?'],
  boss: ['ओ बाप रे! बॉस लेवल! गाइज़, सब दुआ करो, काली पट्टियाँ बहुत हैं।', 'रुको रुको... ये बॉस लेवल है! धड़कन तेज़ हो गई मेरी।', 'बॉस लेवल आ गया गाइज़! चैट में बताओ, पहली बार में निकलेगा?'],
  clear_first: ['ये हुई ना बात! लेवल {n} पहली बार में क्लियर!', 'ओ हो हो, फर्स्ट ट्राई में! आज तो गेंद आग है!', 'क्या बात है! लेवल {n} एकदम झक्कास तरीके से पार!'],
  clear: ['आख़िरकार! लेवल {n} पार हो गया, उफ़्फ़!', 'हो गया हो गया! लेवल {n} क्लियर, तालियाँ गाइज़!', 'पसीने छूट गए पर निकल गया! लेवल {n} डन।'],
  died: ['ओह नो! काली पट्टी ने फिर पकड़ लिया।', 'अरे यार! बस थोड़ा सा... चलो कोई ना, फिर से।', 'उफ़्फ़! इतना पास आके... दिल टूट गया।', 'नहीं नहीं नहीं! चलो, अगली बार पक्का।', 'हाहा, गया! चैट वालो, किसने नज़र लगाई?'],
  fireball: ['फायरबॉल! अब कोई नहीं रोक सकता!', 'आग लग गई आग! देखो कैसे सब तोड़ रहा है!', 'ओ हो, फायर मोड ऑन! ये सीन देखो गाइज़!'],
  combo: ['{n} का कॉम्बो! क्या चल रहा है ये!', 'बिना रुके {n} प्लेटें! गेंद तो उड़ रही है आज!', 'ओ माय गॉड, {n} कॉम्बो! चैट में आग वाले इमोजी चाहिए!'],
  score_mark: ['स्कोर {mark} पार! चलो चलो!', '{mark} पॉइंट्स! आज तो रिकॉर्ड बनेगा लगता है।', 'गाइज़, {mark} हो गए! तालियाँ!'],
};
let starts = 0;
function gameLine(ev) {
  const o = { n: ev.level, a: ev.attempt, mark: ev.mark, ball: ev.ball };
  switch (ev.type) {
    case 'level_start':
      if (ev.boss) return fill(pick('boss', GAME.boss), o);
      if (ev.quick) return null;
      starts += 1;
      if (starts % 3 === 2) return null; // not every level: avoid over-announcing
      return fill(ev.ball && starts % 2 === 0 ? pick('lb', GAME.level_ball) : pick('ls', GAME.level_start), o);
    case 'level_clear': return fill(ev.first ? pick('cf', GAME.clear_first) : pick('c', GAME.clear), o);
    case 'died': return fill(pick('d', GAME.died), o);
    case 'fireball': return pick('f', GAME.fireball);
    case 'combo': return ev.n >= 20 ? fill(pick('cb', GAME.combo), { n: ev.n }) : null;
    case 'score_mark': return fill(pick('sm', GAME.score_mark), o);
    default: return null;
  }
}

// ---------------- talk when things are calm ----------------
const IDLE = {
  quiet: ['अरे गाइज़, आज चैट इतनी शांत क्यों है भाई? कुछ तो बोलो!', 'चैट वालो, सो गए क्या? एक हाय ही लिख दो, मैं पढ़ूँगी!', 'इतनी शांति? लगता है सब गेम में खो गए। कमेंट में बताओ, कैसा लग रहा है?', 'हेलो हेलो, कोई है? हाहा, चैट में अपनी हाज़िरी लगाओ!'],
  predict: ['गाइज़, नेक्स्ट लेवल में क्या होने वाला है? कमेंट करो!', 'चैट में बताओ, कितने लोगों को लगता है ये लेवल कंप्लीट हो पाएगा? हाँ या ना!', 'चलो प्रेडिक्शन! ये लेवल पहली कोशिश में निकलेगा या नहीं? कमेंट करो, सही वाले का नाम लूँगी।', 'बॉस लेवल तक पहुँचने में कितनी कोशिशें लगेंगी? अपना नंबर बोलो!'],
  challenge: ['छोटा सा चैलेंज! बताओ अगली गेंद कौन सी होगी, स्ट्रॉबेरी, घंटी या कुछ और? सही वाले का नाम पक्का लूँगी!', 'डील करते हैं! अगर ये लेवल बिना मरे निकल गया, तो चैट में आग वाले इमोजी की बारिश होनी चाहिए!', 'एक से दस में नंबर दो, आज का गेम कितना सैटिस्फाइंग है?', 'सच बताना, आप खेलते तो काली पट्टी से बच पाते? कमेंट करो!'],
  like: ['जो नए आए हैं, स्क्रीन पे डबल टैप कर दो! लाइक का टारगेट {goal} है, पूरा करते हैं।', 'चलो चलो, {likes} लाइक हो गए, बस {left} और चाहिए! डबल टैप गाइज़!'],
  likeAny: ['जो नए आए हैं, एक बार स्क्रीन पे डबल टैप कर दो, लाइक से बहुत हिम्मत मिलती है!', 'डबल टैप करना मत भूलना गाइज़, लाइक फ्री है!'],
  subscribe: ['सब्सक्राइब नहीं किया अभी तक? ऊपर लाल बटन है, दबा दो, फ्री है भाई!', 'नए लोग चैनल सब्सक्राइब कर लो, ऐसी स्ट्रीम रोज़ आएगी!'],
  vibe: ['उफ़्फ़, ये प्लेटें टूटने की आवाज़... कितनी सैटिस्फाइंग है ना!', 'मैं तो हर बार सोचती हूँ अब गया, अब गया... और ये बच जाता है! हाहा।', 'आज की वाइब ही अलग है गाइज़, एकदम चिल!'],
  fact: ['पता है? हर लेवल में गेंद बदल जाती है! कभी फल, कभी घंटी, कभी बटन।', 'हर पाँचवाँ लेवल बॉस लेवल होता है, और वहाँ काली पट्टियाँ डबल!', 'लगातार प्लेटें तोड़ो तो फायरबॉल बन जाती है, फिर काली पट्टी भी कुछ नहीं कर पाती!'],
};
const IDLE_ORDER = ['predict', 'vibe', 'like', 'challenge', 'fact', 'subscribe', 'predict', 'vibe', 'challenge', 'like', 'subscribe'];
let idleIdx = 0;

// ctx: { quiet (no new chat for a while), likes (-1 unknown), goal }
function nextIdle(ctx) {
  if (ctx.quiet && idleIdx % 2 === 0) { idleIdx += 1; return { kind: 'quiet', text: pick('quiet', IDLE.quiet) }; }
  let kind = IDLE_ORDER[idleIdx++ % IDLE_ORDER.length];
  if (kind === 'like') kind = ctx.likes >= 0 && ctx.goal ? 'like' : 'likeAny';
  return { kind, text: fill(pick('i-' + kind, IDLE[kind]), { goal: ctx.goal, likes: ctx.likes, left: Math.max(1, (ctx.goal || 0) - (ctx.likes || 0)) }) };
}

// ---------------- gentle support asks (scheduled every 10-20 min by the server) ----------------
const PROMO = [
  'गाइज़, अगर लाइव अच्छी लग रही है, तो साइड वाला क्यूआर स्कैन करके दस बीस रुपये सपोर्ट कर दो। बिल्कुल आपकी मर्ज़ी, कोई प्रेशर नहीं!',
  'भाई लोग, इतनी देर से साथ हो, सच में अच्छा लग रहा है। थोड़ा सपोर्ट कर दो ना, दस रुपये भी चलेंगे। क्यूआर साइड में है।',
  'इतनी देर से मैं आपके साथ हूँ, बोल बोल के गला सूख गया, हाहा! दस रुपये का सपोर्ट तो बनता है ना? क्यूआर साइड में है।',
  'गाइज़, मज़ा आ रहा हो तो एक छोटा सा सपोर्ट कर दो। किसी भी यूपीआई ऐप से क्यूआर स्कैन करो, दस बीस रुपये, जितना दिल करे।',
  'एक बात बोलूँ? सपोर्ट करना ज़रूरी नहीं, आपका यहाँ होना ही काफ़ी है। पर अगर मन करे, तो दस रुपये भी बहुत बड़ी बात है। क्यूआर साइड में है!',
  'जो पूछ रहे थे सपोर्ट कैसे करें, साइड वाला क्यूआर स्कैन करो, या चैट में यूपीआई आईडी लिखी है। बस इतना ही!',
  'दोस्तों, ये लाइव रोज़ चलाने में मेहनत लगती है। मज़ा आ रहा हो तो दस बीस रुपये का सपोर्ट कर देना। नहीं भी करो तो कोई बात नहीं, बस चैट में बने रहो!',
  'जिन्होंने अब तक सपोर्ट किया है, उनका दिल से थैंक यू! और कोई जुड़ना चाहे, तो क्यूआर साइड में है।',
  'मोबाइल पे देख रहे हो? चैट में यूपीआई आईडी लिखी है, उसे कॉपी करके किसी भी यूपीआई ऐप से भेज दो। दस रुपये भी चलेगा!',
  'गाइज़, दस रुपये, बीस रुपये, जो भी दिल करे, या कुछ भी नहीं, सब चलेगा! इतनी देर से साथ हो, थोड़ा सा सपोर्ट तो बनता है ना?',
];
const promoLine = () => pick('promo', PROMO);

const intro = () => pick('intro', [
  `हेलो हेलो गाइज़! मैं हूँ ${host()}! आज फिर से प्लेटें तोड़ेंगे और मैं आपके कमेंट पढ़ूँगी। चैट में हाय बोलो, सबको नाम लेके बुलाऊँगी!`,
  `नमस्ते दोस्तों! ${host()} हाज़िर है! गेंद तैयार है, हम सब मज़े लेंगे। चलो चलो, चैट में अपना नाम और शहर लिखो!`,
]);
const goalReached = (goal) => fill(pick('goal', ['ये हुई ना बात! {goal} लाइक पूरे! आप सब कमाल हो गाइज़!', 'टारगेट पूरा! {goal} लाइक! अब अगला टारगेट, चलो चलो!', 'वाह वाह, {goal} लाइक हो गए! थैंक यू सबको!']), { goal });

// ---------------- donations ----------------
const tierOf = (amt) => (amt >= 500 ? 4 : amt >= 200 ? 3 : amt >= 50 ? 2 : 1);
const DON = {
  1: ['ओए होए! {name} ने {amt} रुपये का सपोर्ट भेजा! थैंक यू सो मच, दिल खुश कर दिया!', '{name}, {amt} रुपये! ये छोटा नहीं है यार, बहुत बड़ी बात है। थैंक यू!', 'अरे वाह {name}! {amt} रुपये आए हैं, थैंक यू थैंक यू!'],
  2: ['रुको रुको! {name} ने {amt} रुपये भेजे हैं! थैंक यू {name}, आप तो छा गए!', 'ओ हो {name}! {amt} रुपये! चैट वालो, {name} के लिए तालियाँ!', '{name}, {amt} रुपये का सपोर्ट! सच में दिल से थैंक यू, आप जैसे लोग ही ये स्ट्रीम चलाते हो।'],
  3: ['अरे ये क्या! {name} ने {amt} रुपये भेज दिए! गाइज़, खड़े होके तालियाँ, ज़ोर से!', 'ओ माय गॉड {name}! {amt} रुपये! मैं तो हिल गई, थैंक यू थैंक यू थैंक यू!', '{name}! {amt} रुपये! आज के सुपरस्टार आप हो, सच में!'],
  4: ['रुको, ये सच में हुआ? {name} ने पूरे {amt} रुपये भेजे हैं! गाइज़, चैट में {name} के लिए आग लगा दो!', '{name}! {amt} रुपये! मेरे पास शब्द नहीं हैं यार, आज की स्ट्रीम आपके नाम! दिल से थैंक यू!', 'ओ हो हो हो! {name} ने {amt} रुपये का सपोर्ट किया! आप तो लेजेंड हो, सबसे बड़ा थैंक यू!'],
};
const DON_AGAIN = ['{name} फिर से! यार आप तो परमानेंट सपोर्टर हो, {amt} रुपये के लिए दिल से थैंक यू!', 'अरे {name} दोबारा! {amt} रुपये, आपका प्यार देखो गाइज़!'];
const DON_MSG = ['और उन्होंने लिखा है... "{msg}"!', 'साथ में मैसेज भी है... "{msg}"!'];

// Soft, warm thank-yous (the host speaks gently, never shouts).
const DON_SOFT = {
  1: ['अरे... {name}, आपने {amt} रुपये भेजे। सच में थैंक यू... बहुत प्यारा लगा।', '{name}... {amt} रुपये। थैंक यू सो मच, आपने मेरा दिन बना दिया।', 'ओह, {name} की तरफ़ से {amt} रुपये... थैंक यू, सच में।'],
  2: ['{name}, {amt} रुपये... वाह। थैंक यू, आप बहुत स्वीट हो।', 'अरे {name}... {amt} रुपये भेजे हैं आपने। दिल से थैंक यू।', 'हम्म... {name}, {amt} रुपये। इतना प्यार? थैंक यू यार।'],
  3: ['{name}... {amt} रुपये? सच में? थैंक यू... समझ नहीं आ रहा क्या बोलूँ।', 'वाह {name}, {amt} रुपये। आप तो कमाल हो... बहुत बहुत शुक्रिया।', '{name}... {amt} रुपये। चैट, {name} को थोड़ा प्यार भेजो।'],
  4: ['ओह... {name}, {amt} रुपये। मैं सच में हैरान हूँ... थैंक यू, आपने ये स्ट्रीम ख़ास बना दी।', '{name}... {amt} रुपये भेजे हैं। मेरे पास शब्द नहीं हैं... दिल से थैंक यू।', 'अरे... {name}, {amt} रुपये? ये तो बहुत ज़्यादा है... थैंक यू, सच में।'],
};
const DON_SOFT_AGAIN = ['{name} फिर से... आप तो सच में अपने वाले हो। {amt} रुपये के लिए थैंक यू।', 'अरे, {name} दोबारा... {amt} रुपये। आपका साथ बहुत अच्छा लगता है।'];

function donationLine({ name, amount, message, returning, tier }) {
  const o = { name, amt: amount };
  let line = fill(returning && tier < 3 ? pick('donA', DON_SOFT_AGAIN) : pick('don' + tier, DON_SOFT[tier]), o);
  if (message) line += ' ' + fill(pick('donM', DON_MSG), { msg: message });
  return line;
}

// ---------------- continuous play-by-play (soft, curious, a little sleepy) ----------------
const PLAY = {
  early: ['अभी तो शुरुआत है... {left} प्लेटें बाकी हैं। आराम से चलते हैं।', 'लेवल {level}... देखते हैं ये कितनी जल्दी निकलता है।', 'हम्म, शुरुआत तो अच्छी है। गेंद आराम से नीचे जा रही है।', 'चलो... धीरे धीरे। अभी बहुत रास्ता बाकी है।', 'नया लेवल, नई प्लेटें... मुझे ये पल बड़ा अच्छा लगता है।'],
  mid: ['आधा रास्ता लगभग हो गया... {left} प्लेटें और।', 'अच्छा जा रहा है ना? मुझे ये प्लेटें टूटने की आवाज़ बहुत पसंद है।', 'स्कोर {score} हो गया... चुपचाप बढ़ता जा रहा है।', 'हम्म... ये काली वाली पट्टियाँ, बस इनसे बचके रहना है।', 'देखो कैसे घूम रहा है टावर... आँखें घूम जाएँ।'],
  late: ['बस थोड़ा सा और... {left} प्लेटें बचीं।', 'अब ध्यान से... ये आख़िरी हिस्सा है।', 'उफ़्फ़... दिल धक धक कर रहा है। बस पहुँचने वाले हैं।', 'आख़िरी कुछ प्लेटें... सब लोग साँस रोक लो।'],
  fire: ['ये देखो... आग वाली गेंद। अब कुछ नहीं रोक सकता।', 'फायरबॉल... कितना अच्छा लगता है ना, सब कुछ टूटता हुआ।', 'आग लगी है... और काली पट्टी भी कुछ नहीं कर पा रही।'],
  combo: ['{combo} प्लेटें लगातार... वाह, बड़ा स्मूद चल रहा है।', 'रुक ही नहीं रहा... {combo} का कॉम्बो हो गया।', 'हम्म... {combo} प्लेटें बिना रुके। मज़ा आ गया।'],
  retry: ['ये {attempt} नंबर की कोशिश है... इस बार हो जाएगा, मुझे लग रहा है।', 'कोई बात नहीं... गलती सबसे होती है। फिर से कोशिश।', 'बार बार वहीं अटक रहा है... पर हार नहीं मानेंगे।'],
  ball: ['इस बार गेंद {ball} है... सच में बड़ी क्यूट लग रही है।', '{ball} वाली गेंद... हाहा, अजीब है पर मज़ेदार।', 'आपको ये {ball} वाली गेंद कैसी लगी? मुझे तो पसंद आई।'],
  thought: ['रात हो गई है... और हम यहाँ प्लेटें तोड़ रहे हैं। मुझे तो मज़ा आ रहा है।', 'उम्म... आप लोग सो तो नहीं गए? चैट में एक हाय बोलो।', 'पता है, ये गेम देखते देखते बड़ा सुकून मिलता है।', 'चाय पी रहे हो या कॉफ़ी? मैं तो चाय वाली हूँ।', 'आज का दिन कैसा गया आपका? चैट में बताओ, मैं पढ़ूँगी।', 'मुझे थोड़ी नींद आ रही है... पर ये गेम छोड़ने का मन नहीं।', 'ये म्यूज़िक और ये आवाज़ें... एकदम चिल वाइब है ना?', 'कभी कभी लगता है ये गेंद मुझसे ज़्यादा जल्दी में है... हाहा, सच में।'],
  ask: ['आपको क्या लगता है... ये लेवल पहली बार में निकलेगा?', 'अगली गेंद कौन सी होगी? कोई अंदाज़ा?', 'आप खेल रहे होते तो कहाँ रुकते... बताओ?', 'चैट में बताओ, आप कहाँ से देख रहे हो।'],
};
let playN = 0;
// g: { state, level, attempt, score, progress (0..1), left, combo, fire, ball }
function commentary(g) {
  playN += 1;
  let pool;
  if (g.fire) pool = 'fire';
  else if (g.combo >= 10) pool = 'combo';
  else if (g.attempt >= 2 && playN % 3 === 0) pool = 'retry';
  else if (g.ball && playN % 5 === 0) pool = 'ball';
  else if (playN % 4 === 0) pool = 'thought';
  else if (playN % 7 === 0) pool = 'ask';
  else pool = g.progress > 0.75 ? 'late' : g.progress > 0.3 ? 'mid' : 'early';
  const o = { level: g.level, left: g.left, score: g.score, attempt: g.attempt, combo: g.combo, ball: g.ball };
  for (const k of Object.keys(o)) if (o[k] === undefined) o[k] = null;
  return fill(pick('c-' + pool, PLAY[pool]), o);
}

// Every spoken line passes through here: calm delivery (no shouting), an occasional "hmm..." for a natural start.
const FILLERS = ['हम्म... ', 'अच्छा... ', 'उम्म... '];
// English words written in Devanagari sound wrong in a Hindi voice: speak everyday Hindi instead.
// (YouTube words everyone uses, like लाइक, सब्सक्राइब, कमेंट, लेवल, क्यूआर, यूपीआई, stay as they are.)
const HINDI = [
  ['थैंक यू सो मच', 'बहुत बहुत शुक्रिया'], ['थैंक यू थैंक यू थैंक यू', 'शुक्रिया, सच में शुक्रिया'], ['थैंक यू', 'शुक्रिया'], ['थैंक्स', 'शुक्रिया'],
  ['गाइज़', 'दोस्तों'], ['टॉप सपोर्टर्स', 'सबसे बड़े साथी'], ['सपोर्टर्स', 'साथी'], ['सपोर्टर', 'साथी'],
  ['स्क्रीन पे', 'परदे पर'], ['स्क्रीन पर', 'परदे पर'], ['स्ट्रीम', 'लाइव'], ['एकदम चिल वाइब', 'एकदम सुकून भरा माहौल'], ['चिल वाइब', 'सुकून भरा माहौल'],
  ['वाइब्स', 'माहौल'], ['वाइब', 'माहौल'], ['चिल', 'आराम'], ['सैटिस्फाइंग', 'सुकून देने वाला'], ['एंटरटेनमेंट', 'मनोरंजन'],
  ['ऑप्शनल', 'आपकी मर्ज़ी पर'], ['प्रेशर', 'दबाव'], ['कॉन्ट्रिब्यूशन', 'योगदान'], ['अप्रीशिएट होता है', 'बहुत मायने रखता है'],
  ['परमानेंट', 'पक्के'], ['सुपरस्टार', 'सितारे'], ['लेजेंड', 'कमाल के इंसान'], ['फुल फॉर्म', 'पूरे रंग'], ['फुल चार्ज्ड', 'पूरे जोश'],
  ['प्रेडिक्शन', 'अंदाज़ा'], ['चैलेंज एक्सेप्टेड', 'चुनौती मंज़ूर'], ['चैलेंज', 'चुनौती'], ['टारगेट', 'लक्ष्य'], ['प्रॉमिस', 'वादा'],
  ['डील?', 'पक्का?'], ['फेवरेट', 'पसंदीदा'], ['पॉज़िटिव', 'अच्छी'], ['सीट बेल्ट बाँध लो', 'कमर कस लो'], ['नेक्स्ट', 'अगले'],
  ['फ्री है', 'मुफ़्त है'], ['क्यूट', 'प्यारी'], ['स्वीट', 'प्यारे'], ['स्मूद', 'आराम से'], ['एंट्री मारी', 'आए'], ['कन्फ्यूज़', 'उलझन में'],
  ['वेलकम वेलकम', 'आइए आइए, स्वागत है'], ['वेलकम', 'स्वागत है'], ['ओके ओके', 'अच्छा अच्छा'], ['सिंपल', 'आसान'], ['फायरबॉल', 'आग वाली गेंद'],
  ['फायर मोड ऑन', 'आग वाला खेल शुरू'], ['रेगुलर', 'पुराने साथी'], ['एक्टिव', 'जोशीले'], ['बेस्ट', 'सबसे अच्छा'], ['सॉरी', 'माफ़ी'], ['परसेंट', 'प्रतिशत'],
];
function hindify(text) {
  let t = text;
  for (const [en, hi] of HINDI) t = t.split(en).join(hi);
  return t;
}

function soft(text) {
  let t = hindify(String(text))
    .replace(/ओ माय गॉड[,!]?\s*/g, 'ओह... ')
    .replace(/रुको रुको[!,]?\s*/g, 'अरे रुको... ')
    .replace(/!+/g, '.')
    .trim();
  if (!t) return t;
  // filler chosen from the text itself (not a counter), so the same line always sounds the same and can be pre-recorded
  let h = 7;
  for (const ch of t) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  if (h % 5 === 0 && !/^(हम्म|अच्छा|उम्म|अरे|ओह)/.test(t)) t = FILLERS[(h >>> 3) % FILLERS.length] + t;
  return t;
}

// Every line that has no name/number in it, exactly as it will be spoken: pre-recorded into the voice pack.
function staticLines() {
  const pools = [].concat(...Object.values(PLAY), ...Object.values(IDLE), PROMO, ...Object.values(GAME));
  return [...new Set(pools.filter((s) => !/\{\w+\}/.test(s)).map(soft))];
}

const recapSupporters = (names) => `गाइज़, आज के टॉप सपोर्टर्स हैं... ${list(names)}! आप सबका दिल से थैंक यू!`;
const recapChatters = (names) => `और आज चैट के सबसे एक्टिव लोग... ${list(names)}! आप लोग ही असली जान हो।`;

function clean(t) {
  if (!t) return '';
  return String(t).replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/[*_`#>"“”]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

module.exports = { chatReply, gameLine, nextIdle, commentary, soft, staticLines, promoLine, intro, goalReached, donationLine, tierOf, recapSupporters, recapChatters, spokenName, clean };
