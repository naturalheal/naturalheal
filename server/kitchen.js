// ---------------------------------------------------------------------------
// Ghar Ki Rasoi Se Ilaaj (Kitchen Remedy Finder)
// User apne ghar me maujood cheezein chunta hai + ek takleef; hum unhi cheezon
// se nuskha banate hain. Premium + API key ho to AI, warna rule-based.
// ---------------------------------------------------------------------------
const { aiText, aiVision, aiAvailable, langName } = require("./ai");
const KL = require("./kitchen-i18n"); // hin + regional bhashaon ke anuvaad
const { isPremium } = require("./plans");
const { HttpError } = require("./util");

// Rasoi ki aam cheezein (id, emoji, hindi, english) — UI isi se banta hai
const ITEMS = [
  { id: "adrak", emoji: "🫚", hi: "Adrak", en: "Ginger" },
  { id: "haldi", emoji: "🟡", hi: "Haldi", en: "Turmeric" },
  { id: "jeera", emoji: "🌾", hi: "Jeera", en: "Cumin" },
  { id: "ajwain", emoji: "🌿", hi: "Ajwain", en: "Carom seeds" },
  { id: "nimbu", emoji: "🍋", hi: "Nimbu", en: "Lemon" },
  { id: "shahad", emoji: "🍯", hi: "Shahad", en: "Honey" },
  { id: "lahsun", emoji: "🧄", hi: "Lahsun", en: "Garlic" },
  { id: "tulsi", emoji: "🌱", hi: "Tulsi", en: "Holy basil" },
  { id: "saunf", emoji: "🟢", hi: "Saunf", en: "Fennel" },
  { id: "methi", emoji: "🟤", hi: "Methi", en: "Fenugreek" },
  { id: "dalchini", emoji: "🪵", hi: "Dalchini", en: "Cinnamon" },
  { id: "kalimirch", emoji: "⚫", hi: "Kali mirch", en: "Black pepper" },
  { id: "lavang", emoji: "🟫", hi: "Lavang", en: "Clove" },
  { id: "elaichi", emoji: "💚", hi: "Elaichi", en: "Cardamom" },
  { id: "gud", emoji: "🟧", hi: "Gud", en: "Jaggery" },
  { id: "namak", emoji: "🧂", hi: "Namak", en: "Salt" },
  { id: "doodh", emoji: "🥛", hi: "Doodh", en: "Milk" },
  { id: "dahi", emoji: "🍶", hi: "Dahi", en: "Curd" },
  { id: "ghee", emoji: "🧈", hi: "Ghee", en: "Ghee" },
  { id: "pudina", emoji: "🌿", hi: "Pudina", en: "Mint" },
];
const ITEM_MAP = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Takleefein (concerns) — id, hindi, english
const CONCERNS = [
  { id: "acidity", hi: "Acidity / jalan", en: "Acidity / heartburn", fhi: "Pet ki jalan aur khatta-dakaar shaant, pachan behtar.", fen: "Calms burning and acid reflux, improves digestion." },
  { id: "gas", hi: "Gas / pet phoolna", en: "Gas / bloating", fhi: "Gas nikalti hai, pet halka aur aaram.", fen: "Releases gas, eases bloating and heaviness." },
  { id: "sardi", hi: "Sardi-zukaam", en: "Cold", fhi: "Band naak khulti hai, sardi me rahat.", fen: "Clears a blocked nose, relieves a cold." },
  { id: "khaansi", hi: "Khaansi / gala", en: "Cough / throat", fhi: "Gale ki kharaash aur khaansi me aaram.", fen: "Soothes a sore throat and cough." },
  { id: "sirdard", hi: "Sir dard", en: "Headache", fhi: "Sir dard aur tanaav me aaram.", fen: "Eases headache and tension." },
  { id: "neend", hi: "Neend nahi aati", en: "Poor sleep", fhi: "Man shaant, gehri aur achhi neend.", fen: "Calms the mind for deeper, better sleep." },
  { id: "thakaan", hi: "Thakaan / kamzori", en: "Fatigue", fhi: "Energy aur taazgi, kamzori door.", fen: "Boosts energy and freshness, fights weakness." },
  { id: "immunity", hi: "Immunity badhani", en: "Boost immunity", fhi: "Rog-pratirodhak shakti majboot, baar-baar bimari se bachaav.", fen: "Strengthens immunity against frequent illness." },
];

// Rule-based nuskhe: har nuskha kuch items maangta hai. Agar saare maujood ho to suggest.
const RECIPES = [
  { c: "acidity", need: ["jeera"], hi: ["Jeera paani", "1 chhota chammach jeera ek glass paani me 5 min ubaalein, chaan kar halka garm peeyein. Jalan me aaram."], en: ["Cumin water", "Boil 1 tsp cumin in a glass of water for 5 min, strain and sip warm. Eases burning."] },
  { c: "acidity", need: ["saunf"], hi: ["Saunf", "Khaane ke baad aadha chammach saunf chabaayein — pet thanda rehta hai."], en: ["Fennel", "Chew half a tsp of fennel after meals to cool the stomach."] },
  { c: "acidity", need: ["nimbu", "namak"], hi: ["Nimbu-namak paani", "Aadha nimbu + chutki namak thande paani me, khaane se pehle."], en: ["Lemon-salt water", "Half a lemon with a pinch of salt in cool water, before meals."] },
  { c: "gas", need: ["ajwain", "namak"], hi: ["Ajwain-namak", "Aadha chammach ajwain chutki namak ke saath garm paani se lein — gas me turant aaram."], en: ["Carom + salt", "Half a tsp carom seeds with a pinch of salt and warm water — quick relief."] },
  { c: "gas", need: ["ajwain"], hi: ["Ajwain paani", "1 chammach ajwain paani me ubaal kar peeyein."], en: ["Carom water", "Boil 1 tsp carom seeds in water and drink."] },
  { c: "gas", need: ["jeera", "saunf"], hi: ["Jeera-saunf", "Dono barabar bhoon kar peeslein, aadha chammach garm paani se khaane baad."], en: ["Cumin-fennel", "Dry roast equal parts, grind, take half a tsp with warm water after meals."] },
  { c: "sardi", need: ["adrak", "shahad"], hi: ["Adrak-shahad", "Adrak ka ras nikaal kar usme thoda shahad milayein, din me 2 baar."], en: ["Ginger-honey", "Mix a little ginger juice with honey, twice a day."] },
  { c: "sardi", need: ["tulsi", "adrak"], hi: ["Tulsi-adrak kaadha", "5-6 tulsi patte + adrak paani me ubaalein, chaan kar garm peeyein."], en: ["Basil-ginger decoction", "Boil 5-6 basil leaves with ginger, strain and drink warm."] },
  { c: "sardi", need: ["haldi", "doodh"], hi: ["Haldi doodh", "1 glass garm doodh me chutki haldi, raat ko sone se pehle."], en: ["Turmeric milk", "A pinch of turmeric in a glass of warm milk at bedtime."] },
  { c: "khaansi", need: ["shahad", "kalimirch"], hi: ["Shahad-kali mirch", "1 chammach shahad me chutki kali mirch, din me 2 baar chaatein."], en: ["Honey-pepper", "A pinch of black pepper in 1 tsp honey, lick twice a day."] },
  { c: "khaansi", need: ["adrak", "namak"], hi: ["Adrak-namak", "Adrak ke chhote tukde par chutki namak laga kar chooshein."], en: ["Ginger-salt", "Sprinkle a pinch of salt on a small ginger piece and suck on it."] },
  { c: "khaansi", need: ["tulsi", "shahad"], hi: ["Tulsi-shahad", "Tulsi ke ras me shahad mila kar lein."], en: ["Basil-honey", "Mix basil juice with honey and take."] },
  { c: "sirdard", need: ["adrak"], hi: ["Adrak chai", "Adrak wali halki chai se sir dard me aaram."], en: ["Ginger tea", "Light ginger tea eases a headache."] },
  { c: "sirdard", need: ["lavang"], hi: ["Lavang", "2 lavang bhoon kar peeslein, maathe par lep lagayein."], en: ["Clove paste", "Roast 2 cloves, grind, and apply as a paste on the forehead."] },
  { c: "neend", need: ["doodh"], hi: ["Garm doodh", "Sone se pehle 1 glass halka garm doodh."], en: ["Warm milk", "A glass of warm milk before bed."] },
  { c: "neend", need: ["doodh", "elaichi"], hi: ["Elaichi doodh", "Garm doodh me 1 elaichi — gehri neend."], en: ["Cardamom milk", "One cardamom in warm milk for deeper sleep."] },
  { c: "thakaan", need: ["shahad", "nimbu"], hi: ["Shahad-nimbu paani", "Garm paani me nimbu + shahad, subah — din bhar taazgi."], en: ["Honey-lemon water", "Lemon and honey in warm water in the morning for all-day freshness."] },
  { c: "thakaan", need: ["gud"], hi: ["Gud", "Khaane baad thoda gud — turant energy aur iron."], en: ["Jaggery", "A little jaggery after meals for quick energy and iron."] },
  { c: "immunity", need: ["haldi", "doodh"], hi: ["Haldi doodh", "Roz raat 1 glass garm doodh me chutki haldi."], en: ["Turmeric milk", "A pinch of turmeric in warm milk every night."] },
  { c: "immunity", need: ["tulsi", "adrak", "kalimirch"], hi: ["Kaadha", "Tulsi, adrak aur kali mirch paani me ubaalein, hafte me kuch baar."], en: ["Kaadha", "Boil basil, ginger and black pepper in water, a few times a week."] },
  { c: "immunity", need: ["lahsun"], hi: ["Kaccha lahsun", "Subah khaali pet 1 kali kaccha lahsun."], en: ["Raw garlic", "One raw garlic clove on an empty stomach in the morning."] },
];

// Hinglish (hi) + English (en) messages; baaki bhashayein kitchen-i18n.js me
const MSG = {
  hi: {
    pickProblem: "Takleef chunein", pickItem: "Kam se kam ek cheez chunein", pickProblemFirst: "Pehle takleef chunein",
    needPhoto: "Apne saman ki photo khinchein ya upload karein", photoBig: "Photo bahut badi hai — chhoti photo lein",
    scanNeedsAI: "Photo scan ke liye AI chahiye. Abhi ke liye neeche se apni cheezein tap karein aur 'Nuskha dhoondo' dabayein.",
    scanPremium: "Photo scan Premium feature hai. Free me neeche se cheezein tap karein.",
    noItemSeen: "Photo me koi kaam ki cheez nahi dikhi. Saaf photo lein, ya neeche se cheezein tap karein.",
    caution: "Ye sirf gharelu nuskha hai, dawai nahi. 2-3 din me aaram na ho ya badhe to doctor ko dikhayein.",
    warmWater: "garm paani", wwTitle: "Garm paani + {nm}", wwHow: "{nm} ko ek glass garm paani ke saath lein. Aaram karein aur paani peete rahein.",
  },
  en: {
    pickProblem: "Pick a problem", pickItem: "Pick at least one kitchen item", pickProblemFirst: "Pick a problem first",
    needPhoto: "Take or upload a photo of your items", photoBig: "Photo too big — try a smaller one",
    scanNeedsAI: "Photo scan needs AI. For now, tap the items you have below and tap Find remedy.",
    scanPremium: "Photo scan is a Premium feature. Free: tap the items you have below.",
    noItemSeen: "Couldn't spot a useful item in the photo. Try a clearer photo, or tap your items below.",
    caution: "Home remedy only, not a medicine. See a doctor if it doesn't improve in 2-3 days or gets worse.",
    warmWater: "warm water", wwTitle: "Warm water + {nm}", wwHow: "Take {nm} with a glass of warm water. Rest and stay hydrated.",
  },
};
// App ki bhasha code (hin/en/hi/bn/...) — anjaan ho to Hinglish
function kLang(l) { return l === "en" || l === "hi" || KL[l] ? l : "hi"; }
function msg(lang, k) { return (KL[lang] && KL[lang].msg[k]) || MSG[lang === "en" ? "en" : "hi"][k]; }
function itemName(id, lang) {
  const it = ITEM_MAP[id]; if (!it) return id;
  if (KL[lang]) return KL[lang].items[id] || it.hi;
  return lang === "en" ? it.en : it.hi;
}
function concernText(c, lang) { // [label, benefit]
  if (KL[lang] && KL[lang].concerns[c.id]) return KL[lang].concerns[c.id];
  return lang === "en" ? [c.en, c.fen] : [c.hi, c.fhi];
}
function recipeText(r, lang) { // [title, how]
  const i = RECIPES.indexOf(r);
  if (KL[lang] && KL[lang].recipes[i]) return KL[lang].recipes[i];
  return lang === "en" ? r.en : r.hi;
}
for (const k in KL) if (KL[k].recipes.length !== RECIPES.length) console.warn("kitchen-i18n:", k, "recipes ki ginti RECIPES se alag hai");

function labelItems(ids, lang) {
  return ids.map((id) => itemName(id, lang));
}

function ruleRemedy(concern, have, lang) {
  const haveSet = new Set(have);
  // Nuskhe jinke saare items maujood hain
  let matched = RECIPES.filter((r) => r.c === concern && r.need.every((n) => haveSet.has(n)));
  // Agar is concern ke liye kuch nahi mila, jin nuskhon me kam se kam 1 item ho
  if (!matched.length) matched = RECIPES.filter((r) => r.c === concern && r.need.some((n) => haveSet.has(n)));
  const steps = matched.slice(0, 3).map((r) => { const [title, how] = recipeText(r, lang); return { title, how, uses: labelItems(r.need, lang) }; });
  if (!steps.length) {
    const first = have[0];
    const nm = first ? labelItems([first], lang)[0] : msg(lang, "warmWater");
    steps.push({
      title: msg(lang, "wwTitle").replace("{nm}", nm),
      how: msg(lang, "wwHow").replace("{nm}", nm),
      uses: first ? labelItems([first], lang) : [],
    });
  }
  return steps;
}

async function kitchenRemedy(ctx) {
  const b = ctx.body || {};
  const lang = kLang(b.language);
  const concern = String(b.concern || "").trim();
  const have = (Array.isArray(b.items) ? b.items : []).filter((id) => ITEM_MAP[id]).slice(0, 20);
  if (!concern) throw new HttpError(400, msg(lang, "pickProblem"));
  if (!have.length) throw new HttpError(400, msg(lang, "pickItem"));

  const concObj = CONCERNS.find((c) => c.id === concern);
  const [concernLabel, benefit] = concObj ? concernText(concObj, lang) : [concern, ""];
  const caution = msg(lang, "caution");

  // Premium + API key -> AI se behtar nuskha (unhi items se)
  if (isPremium(ctx.user)) {
    const haveNames = labelItems(have, lang).join(", ");
    const prompt = `You are a careful Indian home-remedy (dadi-nani ke nuskhe) helper. The user has ONLY these kitchen items available: ${haveNames}. Their problem: "${concernLabel}". Suggest 1-2 safe home remedies USING ONLY those items (do not use anything they didn't list). For EACH remedy give a short title and simple how-to. Write in ${langName(lang)}, very simple words a non-reader could follow if read aloud. No medicines, no doses, no diagnosis. Reply as ONLY a JSON array like [{"title":"...","how":"...","uses":["item"]}]. No text outside JSON.`;
    const txt = await aiText(prompt, 400, "kitchen");
    const parsed = safeArr(txt);
    if (parsed && parsed.length) {
      return { concern: concernLabel, benefit, items: labelItems(have, lang), steps: parsed.slice(0, 3), caution, source: "ai" };
    }
  }
  return { concern: concernLabel, benefit, items: labelItems(have, lang), steps: ruleRemedy(concern, have, lang), caution, source: "rule" };
}

function safeArr(text) {
  if (!text) return null;
  try { const v = JSON.parse(text); return Array.isArray(v) ? v : null; } catch (_) {}
  const m = text.match(/\[[\s\S]*\]/);
  if (m) { try { const v = JSON.parse(m[0]); return Array.isArray(v) ? v : null; } catch (_) {} }
  return null;
}
function safeObj(text) {
  if (!text) return null;
  try { const v = JSON.parse(text); return v && typeof v === "object" ? v : null; } catch (_) {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { const v = JSON.parse(m[0]); return v && typeof v === "object" ? v : null; } catch (_) {} }
  return null;
}

// ---- ADVANCE: phone se fridge/saman ki photo scan -> AI kaam ki cheezein pehchaane + ilaaj ----
async function kitchenScan(ctx) {
  const b = ctx.body || {};
  const lang = kLang(b.language);
  const concern = String(b.concern || "").trim();
  if (!concern) throw new HttpError(400, msg(lang, "pickProblemFirst"));
  const img = b.image;
  if (!img || !img.data || !/^image\//.test(img.media_type || "")) {
    throw new HttpError(400, msg(lang, "needPhoto"));
  }
  if (typeof img.data === "string" && img.data.length > 8000000) {
    throw new HttpError(413, msg(lang, "photoBig"));
  }
  // Scan ke liye vision AI chahiye (API key). Key/premium na ho to seedha samjha dein.
  if (!aiAvailable()) {
    throw new HttpError(402, msg(lang, "scanNeedsAI"));
  }
  if (!isPremium(ctx.user)) {
    throw new HttpError(402, msg(lang, "scanPremium"));
  }

  const concObj = CONCERNS.find((c) => c.id === concern);
  const [concernLabel, benefit] = concObj ? concernText(concObj, lang) : [concern, ""];
  const known = ITEMS.map((i) => `${i.id} (${i.en})`).join(", ");
  const prompt = `You are a careful Indian home-remedy helper looking at a photo of a user's kitchen/fridge/groceries.
Known useful items (id and English name): ${known}.
The user's problem is: "${concernLabel}".
TASK:
1) Look at the photo and list ONLY the known item ids that you can actually SEE in it AND that are useful for this problem.
2) Suggest 1-2 safe home remedies using ONLY those visible items. Short title + simple how-to a non-reader could follow if read aloud. No medicines, no doses, no diagnosis.
Reply as ONLY this JSON (no text outside): {"detected":["id","id"],"steps":[{"title":"...","how":"...","uses":["English item name"]}]}
If no useful item is visible, return {"detected":[],"steps":[]}.
Write titles/how in ${langName(lang)}.`;

  const txt = await aiVision(prompt, { media_type: img.media_type, data: img.data }, 600, "kitchen-scan");
  const parsed = safeObj(txt) || {};
  const detectedIds = (Array.isArray(parsed.detected) ? parsed.detected : []).filter((id) => ITEM_MAP[id]);
  let steps = Array.isArray(parsed.steps) ? parsed.steps.filter((s) => s && s.title && s.how).slice(0, 3) : [];
  // AI ne steps na diye par cheezein mili -> rule-based se bana do
  if (!steps.length && detectedIds.length) steps = ruleRemedy(concern, detectedIds, lang);

  const caution = msg(lang, "caution");

  if (!detectedIds.length) {
    return {
      concern: concernLabel, benefit, detected: [], items: [], steps: [], caution,
      source: "ai-scan",
      msg: msg(lang, "noItemSeen"),
    };
  }
  return {
    concern: concernLabel, benefit,
    detected: labelItems(detectedIds, lang),
    detectedIds,
    items: labelItems(detectedIds, lang),
    steps, caution, source: "ai-scan",
  };
}

// UI ke liye options (items + concerns)
// l = har bhasha ka label (hin/bn/...), taaki UI chuni hui bhasha me dikhe
function kitchenOptions() {
  const langs = Object.keys(KL);
  const items = ITEMS.map((i) => ({ ...i, l: Object.fromEntries(langs.map((k) => [k, KL[k].items[i.id]])) }));
  const concerns = CONCERNS.map((c) => ({ ...c, l: Object.fromEntries(langs.map((k) => [k, (KL[k].concerns[c.id] || [])[0]])) }));
  return { items, concerns, scanEnabled: aiAvailable() };
}

module.exports = { kitchenRemedy, kitchenScan, kitchenOptions };
