import { AppState, ClassTemplate, Dua, AdhkarItem } from '../types';

const STORAGE_KEY = 'lifeos_data_v1';

export const ADHKAR_LIST: AdhkarItem[] = [
  { id: 'm1', time: 'morning', count: 1, text: 'Ayatul Kursi' },
  { id: 'm2', time: 'morning', count: 3, text: 'Surah Ikhlas, Falaq, Nas' },
  { id: 'm3', time: 'morning', count: 1, text: 'Allahumma bika asbahna...' },
  { id: 'm4', time: 'morning', count: 100, text: 'SubhanAllah wa bihamdihi' },
  { id: 'e1', time: 'evening', count: 1, text: 'Ayatul Kursi' },
  { id: 'e2', time: 'evening', count: 3, text: 'Surah Ikhlas, Falaq, Nas' },
  { id: 'e3', time: 'evening', count: 1, text: 'Allahumma bika amsayna...' },
  { id: 's1', time: 'sleep', count: 1, text: 'Ayatul Kursi' },
  { id: 's2', time: 'sleep', count: 1, text: 'Surah Al-Mulk' },
  { id: 's3', time: 'sleep', count: 33, text: 'SubhanAllah, Alhamdulillah, Allahu Akbar (34)' },
];

const INITIAL_DUAS: Dua[] = [
    { id: '1', title: 'For Knowledge', translation: 'My Lord, increase me in knowledge.', category: 'Growth', arabic: 'رَّبِّ زِدْنِي عِلْمًا' },
    { id: '2', title: 'For Forgiveness', translation: 'Our Lord, forgive us our sins and the excess [committed] in our affairs.', category: 'Forgiveness', arabic: 'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا' },
    { id: '3', title: 'For Parents', translation: 'My Lord, have mercy upon them as they brought me up [when I was] small.', category: 'Family', arabic: 'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا' },
    { id: '4', title: 'Anxiety & Sorrow', translation: 'O Allah, I take refuge in You from anxiety and sorrow, weakness and laziness.', category: 'Mental Health', arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ' },
    { id: '5', title: 'Good in Both Worlds', translation: 'Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good.', category: 'General', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً' },
    { id: '6', title: 'Steadfastness', translation: 'O Turner of the hearts, keep my heart firm on Your religion.', category: 'Faith', arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ' },
    { id: '7', title: 'Ease', translation: 'O Allah, there is no ease except in that which You have made easy.', category: 'Hardship', arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا' },
    { id: '8', title: 'Guidance', translation: 'O Allah, I ask You for guidance, piety, chastity, and wealth (self-sufficiency).', category: 'General', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى' },
    { id: '9', title: 'Acceptance', translation: 'Our Lord, accept [this] from us. Indeed You are the Hearing, the Knowing.', category: 'Worship', arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ' },
    { id: '10', title: 'Protection from Hell', translation: 'Our Lord, avert from us the punishment of Hell.', category: 'Hereafter', arabic: 'رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ' },
    { id: '11', title: 'For Patience', translation: 'Our Lord, pour upon us patience and plant firmly our feet.', category: 'Hardship', arabic: 'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا' },
    { id: '12', title: 'For Success', translation: 'My Lord, expand for me my breast [with assurance] and ease for me my task.', category: 'Success', arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي' },
    { id: '13', title: 'For Protection', translation: 'In the name of Allah, with whose name nothing on earth or in heaven can cause harm.', category: 'Protection', arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ' },
    { id: '14', title: 'For Healing', translation: 'O Allah, Lord of mankind, remove the suffering. Heal, for You are the Healer.', category: 'Health', arabic: 'اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ اشْفِ أَنْتَ الشَّافِي' },
    { id: '15', title: 'For Gratitude', translation: 'My Lord, enable me to be grateful for Your favor which You have bestowed upon me.', category: 'Gratitude', arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ' },
    { id: '16', title: 'For Provision', translation: 'O Allah, I ask You for beneficial knowledge, goodly provision and acceptable deeds.', category: 'Provision', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا' },
    { id: '17', title: 'For Family', translation: 'Our Lord, grant us from among our wives and offspring comfort to our eyes.', category: 'Family', arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ' },
    { id: '18', title: 'For Forgiveness (Sayyidul Istighfar)', translation: 'O Allah, You are my Lord, none has the right to be worshipped but You.', category: 'Forgiveness', arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ' },
    { id: '19', title: 'For Truth', translation: 'Our Lord, do not let our hearts deviate after You have guided us.', category: 'Faith', arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا' },
    { id: '20', title: 'For Mercy', translation: 'Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance.', category: 'Mercy', arabic: 'رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا' },
    { id: '21', title: 'Morning Protection', translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', category: 'Protection', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ' },
    { id: '22', title: 'For Contentment', translation: 'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad as my Prophet.', category: 'Faith', arabic: 'رَضِيتُ بِاللَّهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا' },
    { id: '23', title: 'For Light', translation: 'O Allah, place light in my heart, light in my tongue, light in my hearing, and light in my sight.', category: 'Guidance', arabic: 'اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا' },
    { id: '24', title: 'For Safety', translation: 'O Allah, I ask You for well-being in this world and the next.', category: 'General', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ' },
    { id: '25', title: 'For the Deceased', translation: 'O Allah, forgive him and have mercy on him and give him strength and pardon him.', category: 'Mercy', arabic: 'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ' },
    { id: '26', title: 'For Decision (Istikhara)', translation: 'O Allah, I consult You through Your knowledge and I seek strength through Your power.', category: 'Guidance', arabic: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ' },
    { id: '27', title: 'For Entering Home', translation: 'In the name of Allah we enter, and in the name of Allah we leave.', category: 'Daily', arabic: 'بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا' },
    { id: '28', title: 'For Leaving Home', translation: 'In the name of Allah, I place my trust in Allah.', category: 'Daily', arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ' },
    { id: '29', title: 'For Entering Mosque', translation: 'O Allah, open for me the gates of Your mercy.', category: 'Worship', arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ' },
    { id: '30', title: 'For Leaving Mosque', translation: 'O Allah, I ask You from Your favor.', category: 'Worship', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ' },
    { id: '31', title: 'For Debt', translation: 'O Allah, suffice me with what is lawful against what is unlawful.', category: 'Finance', arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ' },
    { id: '32', title: 'For Anger', translation: 'I seek refuge in Allah from the accursed Shaytan.', category: 'Mental Health', arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ' },
    { id: '33', title: 'For Rain', translation: 'O Allah, let it be a beneficial rain.', category: 'Nature', arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا' },
    { id: '34', title: 'For Traveling', translation: 'Glory is to Him Who has subjected this to us, and we were not able to do it ourselves.', category: 'Daily', arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا' },
    { id: '35', title: 'For Breaking Fast', translation: 'The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.', category: 'Ramadan', arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ' },
    { id: '36', title: 'For New Clothes', translation: 'O Allah, for You is all praise. You have clothed me with it.', category: 'Daily', arabic: 'اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ' },
    { id: '37', title: 'For Sleeping', translation: 'In Your name, O Allah, I live and I die.', category: 'Daily', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا' },
    { id: '38', title: 'For Waking Up', translation: 'Praise is to Allah Who gave us life after He had caused us to die.', category: 'Daily', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا' },
    { id: '39', title: 'For Entering Toilet', translation: 'O Allah, I seek refuge in You from the male and female devils.', category: 'Daily', arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ' },
    { id: '40', title: 'For Leaving Toilet', translation: 'I ask You for Your forgiveness.', category: 'Daily', arabic: 'غُفْرَانَكَ' },
    { id: '41', title: 'For After Wudu', translation: 'I bear witness that none has the right to be worshipped but Allah alone.', category: 'Worship', arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ' },
    { id: '42', title: 'For Distress', translation: 'None has the right to be worshipped but Allah, the Majestic, the Most Forbearing.', category: 'Hardship', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ' },
    { id: '43', title: 'For Protection of Children', translation: 'I seek refuge for you in the perfect words of Allah from every devil and every poisonous thing.', category: 'Family', arabic: 'أُعِيذُكُمَا بِكَلِمَاتِ اللَّهِ التَّامَّةِ' },
    { id: '44', title: 'For Placing Trust', translation: 'Allah is sufficient for me. There is no deity except Him. In Him I have put my trust.', category: 'Faith', arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ' },
    { id: '45', title: 'For Sincere Repentance', translation: 'O Allah, forgive me, have mercy on me, guide me, and provide for me.', category: 'Forgiveness', arabic: 'اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَارْزُقْنِي' },
    { id: '46', title: 'For Good Character', translation: 'O Allah, as You have made my physical appearance beautiful, make my character beautiful.', category: 'Growth', arabic: 'اللَّهُمَّ كَمَا حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي' },
    { id: '47', title: 'For Ease in Tasks', translation: 'O Allah, make easy for me every difficult thing.', category: 'Hardship', arabic: 'اللَّهُمَّ يَسِّرْ لِي كُلَّ عَسِيرٍ' },
    { id: '48', title: 'For Steadfastness in Prayer', translation: 'My Lord, make me an establisher of prayer, and from my descendants.', category: 'Worship', arabic: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي' },
    { id: '49', title: 'For Protection from Evil Eye', translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', category: 'Protection', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ' },
    { id: '50', title: 'For Laylatul Qadr', translation: 'O Allah, You are Forgiving and You love forgiveness, so forgive me.', category: 'Ramadan', arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي' },
    { id: '51', title: 'For Beneficial Knowledge', translation: 'O Allah, I ask You for knowledge that is of benefit.', category: 'Growth', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا' },
    { id: '52', title: 'For Protection from Laziness', translation: 'O Allah, I seek refuge in You from helplessness and laziness.', category: 'Growth', arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ' }
];

const INITIAL_TEMPLATES: ClassTemplate[] = [
  { id: 't1', title: 'Math Lesson', subject: 'Calculus', color: '#3b82f6', duration: 60 },
  { id: 't2', title: 'English', subject: 'Literature', color: '#ef4444', duration: 60 },
  { id: 't3', title: 'Gym', subject: 'Workout', color: '#22c55e', duration: 45 },
  { id: 't4', title: 'Coding', subject: 'React', color: '#8b5cf6', duration: 90 },
];

const INITIAL_MEALS = {
  'Monday': { lunch: '', dinner: '', suhoor: '', iftar: '' },
  'Tuesday': { lunch: '', dinner: '', suhoor: '', iftar: '' },
  'Wednesday': { lunch: '', dinner: '', suhoor: '', iftar: '' },
  'Thursday': { lunch: '', dinner: '', suhoor: '', iftar: '' },
  'Friday': { lunch: '', dinner: '', suhoor: '', iftar: '' },
  'Saturday': { lunch: '', dinner: '', suhoor: '', iftar: '' },
  'Sunday': { lunch: '', dinner: '', suhoor: '', iftar: '' },
};

const DEFAULT_FEATURE_TOGGLES: AppState['featureToggles'] = {
  views: {
    dashboard: true,
    teacher: true,
    muslim: true,
    lifestyle: true,
    finance: true,
    meals: true,
  },
};

export const normalizeAppState = (loaded?: Partial<AppState> | null): AppState => {
  const { updatedAt: _updatedAt, ...safeLoaded } = (loaded || {}) as Partial<AppState> & { updatedAt?: unknown };
  const meals = Object.fromEntries(
    Object.entries(INITIAL_MEALS).map(([day, meal]) => [day, { ...meal, ...(safeLoaded.meals?.[day] || {}) }])
  ) as AppState['meals'];

  const featureToggles: AppState['featureToggles'] = {
    views: {
      ...DEFAULT_FEATURE_TOGGLES.views,
      ...(safeLoaded.featureToggles?.views || {}),
    },
  };

  return {
    ...defaultState,
    ...safeLoaded,
    featureToggles,
    meals,
    notifications: safeLoaded.notifications || [],
    tasks: safeLoaded.tasks || [],
    classTemplates: safeLoaded.classTemplates || INITIAL_TEMPLATES,
    duas: safeLoaded.duas && safeLoaded.duas.length > 5 ? safeLoaded.duas : INITIAL_DUAS,
    sunnahs: safeLoaded.sunnahs || {},
    adhkarLog: safeLoaded.adhkarLog || {},
    ramadanLog: safeLoaded.ramadanLog || {},
    khatam: safeLoaded.khatam || Array(30).fill(false),
    reading: safeLoaded.reading || defaultState.reading,
    steps: safeLoaded.steps || {},
    badHabits: safeLoaded.badHabits || [],
    goals: safeLoaded.goals || defaultState.goals,
    exercises: safeLoaded.exercises || [],
    muhasabah: safeLoaded.muhasabah || [],
    focusSession: safeLoaded.focusSession,
    financeCategories: safeLoaded.financeCategories || defaultState.financeCategories,
    budgets: safeLoaded.budgets || [],
    fixedItems: safeLoaded.fixedItems || [],
    language: safeLoaded.language || 'en',
    onboardingCompleted: safeLoaded.onboardingCompleted || false,
  };
};

export const defaultState: AppState = {
  theme: 'light',
  featureToggles: DEFAULT_FEATURE_TOGGLES,
  notifications: [],
  tasks: [],
  lessons: [],
  classTemplates: INITIAL_TEMPLATES,
  duas: INITIAL_DUAS,
  transactions: [],
  habits: [
    { id: '1', name: 'Morning Adhkar', streak: 0, completedDates: [] },
    { id: '2', name: 'Read Quran', streak: 0, completedDates: [] },
    { id: '3', name: 'Exercise', streak: 0, completedDates: [] },
  ],
  brainDump: [],
  meals: INITIAL_MEALS,
  quran: {
    lastRead: { surah: 'Al-Fatiha', ayah: 1 },
    memorization: { surah: 'Al-Baqarah', ayah: 1 }
  },
  sunnahs: {},
  adhkarLog: {},
  ramadanMode: false,
  ramadanLog: {},
  khatam: Array(30).fill(false),
  qada: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
  waterIntake: {},
  mood: {},
  steps: {},
  reading: [
      { id: '1', title: 'Atomic Habits', author: 'James Clear', currentPage: 0, totalPages: 300, isCompleted: false }
  ],
  badHabits: [],
  goals: [
      { id: '1', title: 'Memorize Juz 30', category: 'faith', progress: 50, completed: false },
      { id: '2', title: 'Emergency Fund ($5k)', category: 'finance', progress: 25, completed: false }
  ],
  exercises: [],
  scheduleSettings: {
    startHour: 8,
    endHour: 20,
    interval: 60,
    daysToShow: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  muhasabah: [],
  focusSession: undefined,
  financeCategories: ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Education', 'Subscriptions', 'Other'],
  budgets: [],
  fixedItems: [],
  language: 'en',
  onboardingCompleted: false
};

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return defaultState;
    const loaded = JSON.parse(serialized) as Partial<AppState>;
    return normalizeAppState(loaded);
  } catch (e) {
    console.error("Failed to load state", e);
    return defaultState;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};