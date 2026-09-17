/* ===========================================================================
   verses.js — what is shown alongside each prayer.

   ARABIC
     Qur'an: the Uthmani text, fetched verse by verse from the Quran.com API,
             so it is exact rather than transcribed.
     Hadith: the classical text as given on sunnah.com, with the collection
             and number cited.

   TRANSLATIONS
     Every translation here is an original plain-language rendering of the
     meaning, written for this app in eight languages.

     They are deliberately NOT taken from Saheeh International, Dr. Mustafa
     Khattab's The Clear Quran, Pickthall, or any other published translation.
     Those are copyrighted works and this app is redistributed freely, so
     shipping them would mean redistributing someone else's licensed text.

     They aim for plain modern language a reader will actually understand,
     rather than archaic phrasing.

   Each prayer's entries rotate in a loop, so the same one is not shown twice
   running. The 'src' field records provenance and is not displayed.
   =========================================================================== */

window.VERSE_LANGUAGES = [
  { code: 'en', label: 'English',  native: 'English' },
  { code: 'bn', label: 'Bangla',   native: 'বাংলা' },
  { code: 'ur', label: 'Urdu',     native: 'اردو' },
  { code: 'hi', label: 'Hindi',    native: 'हिन्दी' },
  { code: 'es', label: 'Spanish',  native: 'Español' },
  { code: 'fr', label: 'French',   native: 'Français' },
  { code: 'ru', label: 'Russian',  native: 'Русский' },
  { code: 'zh', label: 'Chinese',  native: '中文' }
];

/** Languages written right to left. */
window.RTL_LANGUAGES = ['ur'];

window.VERSES = {

  fajr: [
    {
      type: 'quran',
      ar: 'أَقِمِ ٱلصَّلَوٰةَ لِدُلُوكِ ٱلشَّمْسِ إِلَىٰ غَسَقِ ٱلَّيْلِ وَقُرْءَانَ ٱلْفَجْرِ ۖ إِنَّ قُرْءَانَ ٱلْفَجْرِ كَانَ مَشْهُودًا',
      ref: 'Qur’an 17:78',
      src: 'quran.com',
      tr: {
        en: "Establish the prayer from the sun's decline until the darkness of night, and the recitation at dawn — for the recitation at dawn is witnessed.",
        bn: "সূর্য ঢলে পড়া থেকে রাতের অন্ধকার পর্যন্ত নামায কায়েম করো, আর ফজরের কুরআন পাঠ — নিশ্চয়ই ফজরের কুরআন পাঠ সাক্ষ্যপ্রাপ্ত।",
        ur: "سورج ڈھلنے سے رات کے اندھیرے تک نماز قائم کرو، اور فجر کی قرأت — بے شک فجر کی قرأت مشہود ہے۔",
        hi: "सूरज ढलने से रात के अँधेरे तक नमाज़ क़ायम करो, और फ़ज्र की तिलावत — निस्संदेह फ़ज्र की तिलावत देखी जाती है।",
        es: "Establece la oración desde el declinar del sol hasta la oscuridad de la noche, y la recitación del alba — pues la recitación del alba es atestiguada.",
        fr: "Accomplis la prière du déclin du soleil jusqu'à l'obscurité de la nuit, et la récitation de l'aube — car la récitation de l'aube est attestée.",
        ru: "Совершай молитву от склонения солнца до ночной темноты, и чтение на рассвете — ведь чтение на рассвете засвидетельствовано.",
        zh: "自日偏西至夜暗，你当谨守拜功，并谨守黎明的诵读；黎明的诵读确是被见证的。"
      }
    },
    {
      type: 'quran',
      ar: 'وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ ٱلشَّمْسِ وَقَبْلَ غُرُوبِهَا',
      ref: 'Qur’an 20:130',
      src: 'quran.com',
      tr: {
        en: "And glorify your Lord with praise before the rising of the sun, and before its setting.",
        bn: "আর সূর্য ওঠার আগে ও অস্ত যাওয়ার আগে তোমার প্রতিপালকের প্রশংসাসহ তাসবীহ পাঠ করো।",
        ur: "اور اپنے رب کی حمد کے ساتھ تسبیح کرو، سورج نکلنے سے پہلے اور اس کے غروب سے پہلے۔",
        hi: "और अपने रब की प्रशंसा के साथ महिमा करो, सूरज निकलने से पहले और उसके डूबने से पहले।",
        es: "Y glorifica a tu Señor con alabanza antes de la salida del sol y antes de su puesta.",
        fr: "Et glorifie ton Seigneur par la louange avant le lever du soleil et avant son coucher.",
        ru: "И прославляй Господа твоего хвалой до восхода солнца и до его заката.",
        zh: "你当在日出前和日落前，赞颂你的主。"
      }
    },
    {
      type: 'hadith',
      ar: 'مَنْ صَلَّى الصُّبْحَ فَهُوَ فِي ذِمَّةِ اللَّهِ',
      ref: 'Sahih Muslim 657a',
      src: 'sunnah.com',
      tr: {
        en: "Whoever prays the dawn prayer is under the protection of Allah.",
        bn: "যে ব্যক্তি ফজরের নামায পড়ে, সে আল্লাহর নিরাপত্তায় থাকে।",
        ur: "جس نے فجر کی نماز پڑھی، وہ اللہ کی امان میں ہے۔",
        hi: "जिसने फ़ज्र की नमाज़ पढ़ी, वह अल्लाह की सुरक्षा में है।",
        es: "Quien reza la oración del alba está bajo la protección de Allah.",
        fr: "Celui qui accomplit la prière de l'aube est sous la protection d'Allah.",
        ru: "Кто совершил рассветную молитву, тот под защитой Аллаха.",
        zh: "谁礼了晨礼，谁就在安拉的保护之中。"
      }
    }
  ],

  dhuhr: [
    {
      type: 'quran',
      ar: 'وَلَهُ ٱلْحَمْدُ فِى ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ وَعَشِيًّا وَحِينَ تُظْهِرُونَ',
      ref: 'Qur’an 30:18',
      src: 'quran.com',
      tr: {
        en: "All praise is His in the heavens and the earth — in the late afternoon, and at midday.",
        bn: "আসমান ও যমীনে সমস্ত প্রশংসা তাঁরই — বিকেলে এবং দুপুরে।",
        ur: "آسمانوں اور زمین میں سب تعریف اسی کی ہے — سہ پہر کو اور دوپہر کو۔",
        hi: "आकाशों और धरती में सारी प्रशंसा उसी की है — तीसरे पहर और दोपहर में।",
        es: "Suya es toda alabanza en los cielos y en la tierra — al caer la tarde y al mediodía.",
        fr: "À Lui la louange dans les cieux et sur la terre — en fin d'après-midi et à midi.",
        ru: "Ему хвала на небесах и на земле — и под вечер, и в полдень.",
        zh: "天地间一切赞颂都归于他 —— 在傍晚，也在正午。"
      }
    },
    {
      type: 'quran',
      ar: 'إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَـٰبًا مَّوْقُوتًا',
      ref: 'Qur’an 4:103',
      src: 'quran.com',
      tr: {
        en: "The prayer is prescribed for the believers at appointed times.",
        bn: "নিশ্চয়ই নামায মুমিনদের উপর নির্ধারিত সময়ে ফরয করা হয়েছে।",
        ur: "بے شک نماز مومنوں پر مقررہ وقتوں میں فرض کی گئی ہے۔",
        hi: "निस्संदेह नमाज़ ईमान वालों पर नियत समयों पर अनिवार्य की गई है।",
        es: "La oración ha sido prescrita a los creyentes en tiempos determinados.",
        fr: "La prière est prescrite aux croyants à des heures déterminées.",
        ru: "Молитва предписана верующим в установленное время.",
        zh: "拜功对信士确是定时的义务。"
      }
    },
    {
      type: 'hadith',
      ar: 'فَذَلِكَ مِثْلُ الصَّلَوَاتِ الْخَمْسِ، يَمْحُو اللَّهُ بِهَا الْخَطَايَا',
      ref: 'Sahih al-Bukhari 528',
      src: 'sunnah.com',
      tr: {
        en: "The five prayers are like a river at your door that you bathe in five times a day — by them Allah washes away your wrongs.",
        bn: "পাঁচ ওয়াক্ত নামায তোমার দরজার সামনের নদীর মতো, যাতে তুমি দিনে পাঁচবার গোসল করো — এর দ্বারা আল্লাহ তোমার গুনাহ ধুয়ে দেন।",
        ur: "پانچ نمازیں تمہارے دروازے پر بہتی نہر کی مانند ہیں جس میں تم دن میں پانچ بار نہاتے ہو — ان سے اللہ گناہ دھو دیتا ہے۔",
        hi: "पाँच नमाज़ें तुम्हारे दरवाज़े पर बहती नदी जैसी हैं जिसमें तुम दिन में पाँच बार नहाते हो — इनसे अल्लाह गुनाह धो देता है।",
        es: "Las cinco oraciones son como un río a tu puerta en el que te bañas cinco veces al día — con ellas Allah borra las faltas.",
        fr: "Les cinq prières sont comme une rivière à ta porte où tu te laves cinq fois par jour — par elles Allah efface les fautes.",
        ru: "Пять молитв подобны реке у твоих дверей, в которой ты омываешься пять раз в день — ими Аллах смывает прегрешения.",
        zh: "五番拜功犹如你门前的河流，你每日在其中洗濯五次 —— 安拉借此洗去你的过失。"
      }
    }
  ],

  asr: [
    {
      type: 'quran',
      ar: 'حَـٰفِظُوا۟ عَلَى ٱلصَّلَوَٰتِ وَٱلصَّلَوٰةِ ٱلْوُسْطَىٰ وَقُومُوا۟ لِلَّهِ قَـٰنِتِينَ',
      ref: 'Qur’an 2:238',
      src: 'quran.com',
      tr: {
        en: "Guard the prayers, and the middle prayer, and stand before Allah in devotion.",
        bn: "নামাযসমূহের হেফাযত করো, বিশেষ করে মধ্যবর্তী নামাযের, আর আল্লাহর সামনে বিনীত হয়ে দাঁড়াও।",
        ur: "نمازوں کی حفاظت کرو، اور خاص طور پر درمیانی نماز کی، اور اللہ کے سامنے عاجزی سے کھڑے ہو۔",
        hi: "नमाज़ों की रक्षा करो, और विशेष रूप से मध्य की नमाज़ की, और अल्लाह के सामने विनम्र होकर खड़े हो।",
        es: "Guardad las oraciones, y la oración intermedia, y presentaos ante Allah con devoción.",
        fr: "Gardez les prières, et la prière du milieu, et tenez-vous devant Allah avec dévotion.",
        ru: "Оберегайте молитвы, и особенно среднюю молитву, и стойте перед Аллахом смиренно.",
        zh: "你们当谨守拜功，尤其是中间的拜功，并当恭敬地站在安拉面前。"
      }
    },
    {
      type: 'quran',
      ar: 'وَٱلَّذِينَ هُمْ عَلَىٰ صَلَوَٰتِهِمْ يُحَافِظُونَ',
      ref: 'Qur’an 23:9',
      src: 'quran.com',
      tr: {
        en: "And those who guard their prayers.",
        bn: "আর যারা নিজেদের নামাযের হেফাযত করে।",
        ur: "اور جو اپنی نمازوں کی حفاظت کرتے ہیں۔",
        hi: "और जो अपनी नमाज़ों की रक्षा करते हैं।",
        es: "Y aquellos que guardan sus oraciones.",
        fr: "Et ceux qui veillent sur leurs prières.",
        ru: "И те, которые оберегают свои молитвы.",
        zh: "以及那些谨守自己拜功的人。"
      }
    },
    {
      type: 'hadith',
      ar: 'الَّذِي تَفُوتُهُ صَلاَةُ الْعَصْرِ كَأَنَّمَا وُتِرَ أَهْلَهُ وَمَالَهُ',
      ref: 'Sahih al-Bukhari 552',
      src: 'sunnah.com',
      tr: {
        en: "The one who misses the Asr prayer is as though he had lost his family and his wealth.",
        bn: "যার আসরের নামায ছুটে গেল, সে যেন তার পরিবার ও সম্পদ হারাল।",
        ur: "جس کی عصر کی نماز چھوٹ گئی، گویا اس کے گھر والے اور مال لٹ گئے۔",
        hi: "जिसकी अस्र की नमाज़ छूट गई, मानो उसका परिवार और धन चला गया।",
        es: "Quien pierde la oración de la tarde es como si hubiera perdido a su familia y sus bienes.",
        fr: "Celui qui manque la prière de l'après-midi est comme s'il avait perdu sa famille et ses biens.",
        ru: "Тот, кто пропустил послеполуденную молитву, словно потерял семью и имущество.",
        zh: "错过晡礼的人，就像失去了家人和财产一样。"
      }
    }
  ],

  maghrib: [
    {
      type: 'quran',
      ar: 'فَسُبْحَـٰنَ ٱللَّهِ حِينَ تُمْسُونَ وَحِينَ تُصْبِحُونَ',
      ref: 'Qur’an 30:17',
      src: 'quran.com',
      tr: {
        en: "So glorify Allah when you reach the evening, and when you reach the morning.",
        bn: "সুতরাং আল্লাহর পবিত্রতা ঘোষণা করো যখন তোমরা সন্ধ্যায় উপনীত হও এবং যখন সকালে উপনীত হও।",
        ur: "پس اللہ کی پاکی بیان کرو جب تم شام کرو اور جب تم صبح کرو۔",
        hi: "तो अल्लाह की महिमा करो जब तुम संध्या में पहुँचो और जब तुम प्रातः में पहुँचो।",
        es: "Glorificad, pues, a Allah cuando entráis en la tarde y cuando entráis en la mañana.",
        fr: "Glorifiez donc Allah quand vous entrez dans le soir et quand vous entrez dans le matin.",
        ru: "Славьте же Аллаха, когда наступает у вас вечер и когда наступает утро.",
        zh: "你们在傍晚和早晨，都当赞颂安拉超绝。"
      }
    },
    {
      type: 'quran',
      ar: 'وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ ٱلشَّمْسِ وَقَبْلَ ٱلْغُرُوبِ',
      ref: 'Qur’an 50:39',
      src: 'quran.com',
      tr: {
        en: "And glorify your Lord with praise before sunrise, and before sunset.",
        bn: "আর সূর্যোদয়ের আগে ও সূর্যাস্তের আগে তোমার প্রতিপালকের প্রশংসাসহ তাসবীহ পাঠ করো।",
        ur: "اور اپنے رب کی حمد کے ساتھ تسبیح کرو، طلوعِ آفتاب سے پہلے اور غروب سے پہلے۔",
        hi: "और अपने रब की प्रशंसा के साथ महिमा करो, सूर्योदय से पहले और सूर्यास्त से पहले।",
        es: "Y glorifica a tu Señor con alabanza antes de la salida y antes de la puesta del sol.",
        fr: "Et glorifie ton Seigneur par la louange avant le lever et avant le coucher du soleil.",
        ru: "И прославляй Господа твоего хвалой до восхода и до заката.",
        zh: "你当在日出前和日落前，赞颂你的主。"
      }
    },
    {
      type: 'hadith',
      ar: 'الصَّلاَةُ عَلَى وَقْتِهَا',
      ref: 'Sahih al-Bukhari 527',
      src: 'sunnah.com',
      tr: {
        en: "The Prophet صلى الله عليه وسلم was asked which deed is most beloved to Allah. He said: the prayer at its proper time.",
        bn: "নবী ﷺ-কে জিজ্ঞাসা করা হলো কোন আমল আল্লাহর কাছে সবচেয়ে প্রিয়। তিনি বললেন: সময়মতো নামায পড়া।",
        ur: "نبی ﷺ سے پوچھا گیا کہ اللہ کو کون سا عمل سب سے زیادہ محبوب ہے۔ آپ نے فرمایا: وقت پر نماز پڑھنا۔",
        hi: "नबी ﷺ से पूछा गया कि अल्लाह को कौन सा कर्म सबसे प्रिय है। आपने कहा: समय पर नमाज़ पढ़ना।",
        es: "Se preguntó al Profeta ﷺ qué obra es más amada por Allah. Dijo: la oración en su tiempo.",
        fr: "On demanda au Prophète ﷺ quelle œuvre est la plus aimée d'Allah. Il dit : la prière à son heure.",
        ru: "Пророка ﷺ спросили, какое дело более всего любимо Аллахом. Он сказал: молитва в своё время.",
        zh: "有人问先知 ﷺ：什么功修最为安拉所喜爱？他说：按时礼拜。"
      }
    }
  ],

  isha: [
    {
      type: 'quran',
      ar: 'وَمِنَ ٱلَّيْلِ فَتَهَجَّدْ بِهِۦ نَافِلَةً لَّكَ عَسَىٰٓ أَن يَبْعَثَكَ رَبُّكَ مَقَامًا مَّحْمُودًا',
      ref: 'Qur’an 17:79',
      src: 'quran.com',
      tr: {
        en: "And in part of the night, rise to pray — an extra offering for you. It may be that your Lord will raise you to a praised station.",
        bn: "আর রাতের কিছু অংশে তাহাজ্জুদ পড়ো — এটি তোমার জন্য অতিরিক্ত। হয়তো তোমার প্রতিপালক তোমাকে প্রশংসিত স্থানে পৌঁছে দেবেন।",
        ur: "اور رات کے کچھ حصے میں تہجد پڑھو — یہ تمہارے لیے زائد ہے۔ امید ہے تمہارا رب تمہیں مقامِ محمود عطا فرمائے۔",
        hi: "और रात के कुछ भाग में तहज्जुद पढ़ो — यह तुम्हारे लिए अतिरिक्त है। संभव है तुम्हारा रब तुम्हें प्रशंसित स्थान पर पहुँचाए।",
        es: "Y en parte de la noche, levántate a orar — una ofrenda añadida para ti. Quizá tu Señor te eleve a una estación digna de alabanza.",
        fr: "Et durant une partie de la nuit, lève-toi pour prier — une offrande surérogatoire pour toi. Il se peut que ton Seigneur t'élève à une station louée.",
        ru: "И часть ночи проводи в молитве — это дополнительное для тебя. Быть может, Господь твой возведёт тебя на достохвальное место.",
        zh: "你当在夜间的一部分起来礼拜，这是你的额外功修；或许你的主会把你提升到受赞颂的地位。"
      }
    },
    {
      type: 'quran',
      ar: 'إِنَّ ٱلصَّلَوٰةَ تَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ ۗ وَلَذِكْرُ ٱللَّهِ أَكْبَرُ',
      ref: 'Qur’an 29:45',
      src: 'quran.com',
      tr: {
        en: "The prayer restrains from indecency and wrongdoing; and the remembrance of Allah is greater still.",
        bn: "নিশ্চয়ই নামায অশ্লীলতা ও মন্দ কাজ থেকে বিরত রাখে; আর আল্লাহর স্মরণ সর্বশ্রেষ্ঠ।",
        ur: "بے شک نماز بے حیائی اور برائی سے روکتی ہے؛ اور اللہ کا ذکر سب سے بڑا ہے۔",
        hi: "निस्संदेह नमाज़ अश्लीलता और बुराई से रोकती है; और अल्लाह का स्मरण सबसे बड़ा है।",
        es: "La oración preserva de la indecencia y del mal; y el recuerdo de Allah es aún mayor.",
        fr: "La prière préserve de l'indécence et du mal ; et le rappel d'Allah est plus grand encore.",
        ru: "Молитва удерживает от мерзости и предосудительного; а поминание Аллаха — выше.",
        zh: "拜功确能防止丑事和罪恶；而记念安拉尤为伟大。"
      }
    },
    {
      type: 'hadith',
      ar: 'مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ فَكَأَنَّمَا قَامَ نِصْفَ اللَّيْلِ',
      ref: 'Sahih Muslim 656a',
      src: 'sunnah.com',
      tr: {
        en: "Whoever prays Isha in congregation, it is as though he had stood half the night in prayer.",
        bn: "যে ব্যক্তি জামাতে ইশার নামায পড়ল, সে যেন অর্ধেক রাত ইবাদতে দাঁড়াল।",
        ur: "جس نے عشاء کی نماز جماعت سے پڑھی، گویا اس نے آدھی رات قیام کیا۔",
        hi: "जिसने इशा की नमाज़ जमाअत के साथ पढ़ी, मानो उसने आधी रात इबादत में खड़े रहकर बिताई।",
        es: "Quien reza el Isha en congregación es como si hubiera pasado media noche en oración.",
        fr: "Celui qui prie l'Isha en groupe, c'est comme s'il avait veillé la moitié de la nuit.",
        ru: "Кто совершил ночную молитву вместе с общиной, тот словно простоял половину ночи.",
        zh: "谁与大众一同礼了宵礼，就像守候了半夜一样。"
      }
    }
  ]
};

/** Rotates through a prayer's entries without repeating until the list is done. */
window.verseCycler = function (prayerKey) {
  const list = (window.VERSES[prayerKey] || window.VERSES.fajr).slice();
  let i = Math.floor(Math.random() * list.length);
  return function next() {
    const v = list[i % list.length];
    i++;
    return v;
  };
};

/** The translation for a language, falling back to English. */
window.verseText = function (entry, lang) {
  if (!entry || !entry.tr) return '';
  return entry.tr[lang] || entry.tr.en || '';
};
