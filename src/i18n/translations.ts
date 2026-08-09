export type Language = 'en' | 'hi' | 'pa';
export type SupportedLanguage = Language;

export interface Translations {
  appName: string;
  tagline: string;
  newChat: string;
  searchChats: string;
  noChats: string;
  startChatPrompt: string;
  noMatches: string;
  pinned: string;
  today: string;
  yesterday: string;
  daysAgo: string;
  tasks: string;
  reminders: string;
  notes: string;
  security: string;
  conversations: string;
  settings: string;
  account: string;
  logout: string;
  login: string;
  register: string;
  send: string;
  typeMessagePlaceholder: string;
  listening: string;
  holdToSpeak: string;
  wakeWord: string;
  wakeWordEnabled: string;
  wakeWordDisabled: string;
  stopStreaming: string;
  regenerate: string;
  edit: string;
  delete: string;
  pin: string;
  unpin: string;
  copy: string;
  copied: string;
  exportMd: string;
  exportJson: string;
  exportTxt: string;
  previewCode: string;
  general: string;
  coding: string;
  learning: string;
  research: string;
  productivity: string;
  cybersecurity: string;
  writing: string;
  systemActionWarning: string;
  systemActionBlocked: string;
  systemActionSafe: string;
  proceed: string;
  cancel: string;
  actionLogs: string;
  passwordChecker: string;
  hashVerifier: string;
  phishingDetector: string;
  securityTips: string;
  kanbanBoard: string;
  listView: string;
  calendarView: string;
  addTask: string;
  addReminder: string;
  addNote: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityUrgent: string;
  statusPending: string;
  statusInProgress: string;
  statusCompleted: string;
  dueToday: string;
  upcoming: string;
  overdue: string;
  all: string;
  filter: string;
  theme: string;
  darkTheme: string;
  lightTheme: string;
  systemTheme: string;
  languageLabel: string;
  privacyCenter: string;
  exportAllData: string;
  deleteAllData: string;
  dataEncrypted: string;
  recoveryKeyNotice: string;
  saveRecoveryKey: string;
  tokenLimitWarning: string;
  recoverPassword: string;
  username: string;
  password: string;
  displayName: string;
  assistant: string;
  passwordStrength: string;
  phishingAnalyzer: string;
  privacy: string;
  exportData: string;
  language: string;
  auditLogs: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Nova',
    tagline: 'Your intelligent, private, multilingual desktop companion',
    newChat: 'New Chat',
    searchChats: 'Search chats…',
    noChats: 'No conversations yet.',
    startChatPrompt: 'Start a new chat above!',
    noMatches: 'No matches found.',
    pinned: 'Pinned',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: 'days ago',
    tasks: 'Tasks',
    reminders: 'Reminders',
    notes: 'Notes',
    security: 'Security',
    conversations: 'Conversations',
    settings: 'Settings',
    account: 'Account',
    logout: 'Log Out',
    login: 'Log In',
    register: 'Create Account',
    send: 'Send',
    typeMessagePlaceholder: 'Ask Nova anything (or hold Space to speak)…',
    listening: 'Listening…',
    holdToSpeak: 'Hold Space / Click to speak',
    wakeWord: 'Wake Word',
    wakeWordEnabled: 'Wake word active ("Hey Nova")',
    wakeWordDisabled: 'Wake word disabled',
    stopStreaming: 'Stop',
    regenerate: 'Regenerate',
    edit: 'Edit',
    delete: 'Delete',
    pin: 'Pin',
    unpin: 'Unpin',
    copy: 'Copy',
    copied: 'Copied!',
    exportMd: 'Export Markdown (.md)',
    exportJson: 'Export JSON (.json)',
    exportTxt: 'Export Plain Text (.txt)',
    previewCode: 'Preview Code',
    general: 'General',
    coding: 'Coding',
    learning: 'Learning',
    research: 'Research',
    productivity: 'Productivity',
    cybersecurity: 'Cybersecurity',
    writing: 'Writing',
    systemActionWarning: 'Action Confirmation Required',
    systemActionBlocked: 'Action Blocked for Security',
    systemActionSafe: 'Executing Action',
    proceed: 'Proceed',
    cancel: 'Cancel',
    actionLogs: 'Action Logs',
    passwordChecker: 'Password Strength',
    hashVerifier: 'Hash Verifier',
    phishingDetector: 'Phishing Detector',
    securityTips: 'Security Tips',
    kanbanBoard: 'Kanban Board',
    listView: 'List View',
    calendarView: 'Calendar',
    addTask: 'Add Task',
    addReminder: 'Add Reminder',
    addNote: 'Add Note',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    priorityUrgent: 'Urgent',
    statusPending: 'To Do',
    statusInProgress: 'In Progress',
    statusCompleted: 'Done',
    dueToday: 'Due Today',
    upcoming: 'Upcoming',
    overdue: 'Overdue',
    all: 'All',
    filter: 'Filter',
    theme: 'Theme',
    darkTheme: 'Dark',
    lightTheme: 'Light',
    systemTheme: 'System',
    languageLabel: 'Language',
    privacyCenter: 'Privacy & Data',
    exportAllData: 'Export All Data (JSON)',
    deleteAllData: 'Delete All My Data',
    dataEncrypted: 'Local Storage Encrypted (SQLCipher / AES-256)',
    recoveryKeyNotice: 'Store your 24-word recovery key safely. You will need it if you forget your password.',
    saveRecoveryKey: "I've saved my recovery key safely",
    tokenLimitWarning: 'This conversation has reached 100 messages. Earlier messages have been summarized.',
    recoverPassword: 'Recover Password',
    username: 'Username',
    password: 'Password',
    displayName: 'Display Name',
    assistant: 'Assistant',
    passwordStrength: 'Password Strength',
    phishingAnalyzer: 'Phishing Analyzer',
    privacy: 'Privacy & Security',
    exportData: 'Export Data',
    language: 'Language',
    auditLogs: 'Audit Logs',
  },
  hi: {
    appName: 'नोवा (Nova)',
    tagline: 'आपका बुद्धिमान, निजी, बहुभाषी डेस्कटॉप सहायक',
    newChat: 'नई बातचीत',
    searchChats: 'बातचीत खोजें…',
    noChats: 'अभी कोई बातचीत नहीं है।',
    startChatPrompt: 'ऊपर नया चैट शुरू करें!',
    noMatches: 'कोई परिणाम नहीं मिला।',
    pinned: 'पिन किए गए',
    today: 'आज',
    yesterday: 'कल',
    daysAgo: 'दिन पहले',
    tasks: 'कार्य (Tasks)',
    reminders: 'अनुस्मारक (Reminders)',
    notes: 'नोट्स (Notes)',
    security: 'सुरक्षा (Security)',
    conversations: 'बातचीत',
    settings: 'सेटिंग्स',
    account: 'खाता',
    logout: 'लॉग आउट',
    login: 'लॉग इन',
    register: 'नया खाता बनाएं',
    send: 'भेजें',
    typeMessagePlaceholder: 'नोवा से कुछ भी पूछें (या बोलने के लिए स्पेस दबाएं)…',
    listening: 'सुन रहा हूँ…',
    holdToSpeak: 'बोलने के लिए स्पेस दबाएं / क्लिक करें',
    wakeWord: 'वेक वर्ड',
    wakeWordEnabled: 'वेक वर्ड सक्रिय ("हे नोवा")',
    wakeWordDisabled: 'वेक वर्ड बंद है',
    stopStreaming: 'रोकें',
    regenerate: 'पुनः उत्पन्न करें',
    edit: 'संपादित करें',
    delete: 'हटाएं',
    pin: 'पिन करें',
    unpin: 'अनपिन करें',
    copy: 'कॉपी करें',
    copied: 'कॉपी हो गया!',
    exportMd: 'मार्कडाउन निर्यात (.md)',
    exportJson: 'JSON निर्यात (.json)',
    exportTxt: 'टेक्स्ट निर्यात (.txt)',
    previewCode: 'कोड पूर्वावलोकन',
    general: 'सामान्य',
    coding: 'कोडिंग',
    learning: 'शिक्षा / सीखना',
    research: 'अनुसंधान (Research)',
    productivity: 'उत्पादकता',
    cybersecurity: 'साइबर सुरक्षा',
    writing: 'लेखन सहायक',
    systemActionWarning: 'सिस्टम कार्रवाई पुष्टि आवश्यक',
    systemActionBlocked: 'सुरक्षा कारणों से कार्रवाई अवरुद्ध',
    systemActionSafe: 'कार्रवाई निष्पादित की जा रही है',
    proceed: 'आगे बढ़ें',
    cancel: 'रद्द करें',
    actionLogs: 'सिस्टम ऑडिट लॉग',
    passwordChecker: 'पासवर्ड मजबूती विश्लेषक',
    hashVerifier: 'फ़ाइल हैश सत्यापन',
    phishingDetector: 'फ़िशिंग डिटेक्टर',
    securityTips: 'सुरक्षा सुझाव',
    kanbanBoard: 'कानबान बोर्ड',
    listView: 'सूची दृश्य',
    calendarView: 'कैलेंडर',
    addTask: 'नया कार्य जोड़ें',
    addReminder: 'अनुस्मारक जोड़ें',
    addNote: 'नोट जोड़ें',
    priorityLow: 'निम्न',
    priorityMedium: 'मध्यम',
    priorityHigh: 'उच्च',
    priorityUrgent: 'अति आवश्यक',
    statusPending: 'करने योग्य',
    statusInProgress: 'प्रगति पर',
    statusCompleted: 'पूर्ण',
    dueToday: 'आज का समय',
    upcoming: 'आगामी',
    overdue: 'विलंबित',
    all: 'सभी',
    filter: 'फ़िल्टर',
    theme: 'थीम',
    darkTheme: 'डार्क',
    lightTheme: 'लाइट',
    systemTheme: 'सिस्टम',
    languageLabel: 'भाषा (Language)',
    privacyCenter: 'गोपनीयता और डेटा',
    exportAllData: 'सभी डेटा निर्यात करें (JSON)',
    deleteAllData: 'मेरा सारा डेटा हटाएं',
    dataEncrypted: 'स्थानीय डेटा एन्क्रिप्टेड है (SQLCipher / AES-256)',
    recoveryKeyNotice: 'अपनी 24-शब्दों की रिकवरी कुंजी सुरक्षित रखें। पासवर्ड भूलने पर इसकी आवश्यकता होगी।',
    saveRecoveryKey: 'मैंने अपनी रिकवरी कुंजी सुरक्षित रूप से सहेज ली है',
    tokenLimitWarning: 'इस बातचीत में 100 संदेश हो चुके हैं। संदर्भ बनाए रखने के लिए पुराने संदेशों का सारांश तैयार किया गया है।',
    recoverPassword: 'पासवर्ड पुनर्प्राप्त करें',
    username: 'उपयोगकर्ता नाम',
    password: 'पासवर्ड',
    displayName: 'प्रदर्शित नाम',
    assistant: 'सहायक',
    passwordStrength: 'पासवर्ड मजबूती',
    phishingAnalyzer: 'फ़िशिंग विश्लेषक',
    privacy: 'गोपनीयता और सुरक्षा',
    exportData: 'डेटा निर्यात करें',
    language: 'भाषा',
    auditLogs: 'ऑडिट लॉग',
  },
  pa: {
    appName: 'ਨੋਵਾ (Nova)',
    tagline: 'ਤੁਹਾਡਾ ਬੁੱਧੀਮਾਨ, ਨਿੱਜੀ, ਬਹੁਭਾਸ਼ਾਈ ਡੈਸਕਟਾਪ ਸਹਾਇਕ',
    newChat: 'ਨਵੀਂ ਗੱਲਬਾਤ',
    searchChats: 'ਗੱਲਬਾਤ ਖੋਜੋ…',
    noChats: 'ਅਜੇ ਕੋਈ ਗੱਲਬਾਤ ਨਹੀਂ ਹੈ।',
    startChatPrompt: 'ਉੱਪਰ ਨਵੀਂ ਚੈਟ ਸ਼ੁਰੂ ਕਰੋ!',
    noMatches: 'ਕੋਈ ਨਤੀਜਾ ਨਹੀਂ ਮਿਲਿਆ।',
    pinned: 'ਪਿੰਨ ਕੀਤੇ ਗਏ',
    today: 'ਅੱਜ',
    yesterday: 'ਕੱਲ੍ਹ',
    daysAgo: 'ਦਿਨ ਪਹਿਲਾਂ',
    tasks: 'ਕੰਮ (Tasks)',
    reminders: 'ਯਾਦ-ਦਹਾਨੀਆਂ (Reminders)',
    notes: 'ਨੋਟਸ (Notes)',
    security: 'ਸੁਰੱਖਿਆ (Security)',
    conversations: 'ਗੱਲਬਾਤਾਂ',
    settings: 'ਸੈਟਿੰਗਾਂ',
    account: 'ਖਾਤਾ',
    logout: 'ਲਾਗ ਆਊਟ',
    login: 'ਲਾਗ ਇਨ',
    register: 'ਨਵਾਂ ਖਾਤਾ ਬਣਾਓ',
    send: 'ਭੇਜੋ',
    typeMessagePlaceholder: 'ਨੋਵਾ ਨੂੰ ਕੁਝ ਵੀ ਪੁੱਛੋ (ਜਾਂ ਬੋਲਣ ਲਈ ਸਪੇਸ ਦਬਾਓ)…',
    listening: 'ਸੁਣ ਰਿਹਾ ਹਾਂ…',
    holdToSpeak: 'ਬੋਲਣ ਲਈ ਸਪੇਸ ਦਬਾਓ / ਕਲਿੱਕ ਕਰੋ',
    wakeWord: 'ਵੇਕ ਵਰਡ',
    wakeWordEnabled: 'ਵੇਕ ਵਰਡ ਚਾਲੂ ਹੈ ("ਹੇ ਨੋਵਾ")',
    wakeWordDisabled: 'ਵੇਕ ਵਰਡ ਬੰਦ ਹੈ',
    stopStreaming: 'ਰੋਕੋ',
    regenerate: 'ਦੁਬਾਰਾ ਬਣਾਓ',
    edit: 'ਸੋਧੋ',
    delete: 'ਹਟਾਓ',
    pin: 'ਪਿੰਨ ਕਰੋ',
    unpin: 'ਅਨਪਿੰਨ ਕਰੋ',
    copy: 'ਕਾਪੀ ਕਰੋ',
    copied: 'ਕਾਪੀ ਹੋ ਗਿਆ!',
    exportMd: 'ਮਾਰਕਡਾਊਨ ਨਿਰਯਾਤ (.md)',
    exportJson: 'JSON ਨਿਰਯਾਤ (.json)',
    exportTxt: 'ਟੈਕਸਟ ਨਿਰਯਾਤ (.txt)',
    previewCode: 'ਕੋਡ ਪੂਰਵਦਰਸ਼ਨ',
    general: 'ਆਮ (General)',
    coding: 'ਕੋਡਿੰਗ',
    learning: 'ਸਿੱਖਿਆ / ਪੜ੍ਹਾਈ',
    research: 'ਖੋਜ (Research)',
    productivity: 'ਉਤਪਾਦਕਤਾ',
    cybersecurity: 'ਸਾਈਬਰ ਸੁਰੱਖਿਆ',
    writing: 'ਲਿਖਣ ਸਹਾਇਕ',
    systemActionWarning: 'ਸਿਸਟਮ ਕਾਰਵਾਈ ਲਈ ਪੁਸ਼ਟੀ ਲੋੜੀਂਦੀ ਹੈ',
    systemActionBlocked: 'ਸੁਰੱਖਿਆ ਕਾਰਨਾਂ ਕਰਕੇ ਕਾਰਵਾਈ ਰੋਕੀ ਗਈ',
    systemActionSafe: 'ਕਾਰਵਾਈ ਚਲਾਈ ਜਾ ਰਹੀ ਹੈ',
    proceed: 'ਜਾਰੀ ਰੱਖੋ',
    cancel: 'ਰੱਦ ਕਰੋ',
    actionLogs: 'ਸਿਸਟਮ ਆਡਿਟ ਲੌਗ',
    passwordChecker: 'ਪਾਸਵਰਡ ਤਾਕਤ ਵਿਸ਼ਲੇਸ਼ਕ',
    hashVerifier: 'ਫ਼ਾਈਲ ਹੈਸ਼ ਤਸਦੀਕ',
    phishingDetector: 'ਫਿਸ਼ਿੰਗ ਪਛਾਣਕਰਤਾ',
    securityTips: 'ਸੁਰੱਖਿਆ ਸੁਝਾਅ',
    kanbanBoard: 'ਕਾਨਬਾਨ ਬੋਰਡ',
    listView: 'ਸੂਚੀ ਦ੍ਰਿਸ਼',
    calendarView: 'ਕੈਲੰਡਰ',
    addTask: 'ਨਵਾਂ ਕੰਮ ਜੋੜੋ',
    addReminder: 'ਯਾਦ-ਦਹਾਨੀ ਜੋੜੋ',
    addNote: 'ਨੋਟ ਜੋੜੋ',
    priorityLow: 'ਘੱਟ',
    priorityMedium: 'ਦਰਮਿਆਨਾ',
    priorityHigh: 'ਉੱਚ',
    priorityUrgent: 'ਬਹੁਤ ਜ਼ਰੂਰੀ',
    statusPending: 'ਕਰਨਯੋਗ',
    statusInProgress: 'ਚੱਲ ਰਿਹਾ',
    statusCompleted: 'ਮੁਕੰਮਲ',
    dueToday: 'ਅੱਜ ਦਾ ਸਮਾਂ',
    upcoming: 'ਆਗਾਮੀ',
    overdue: 'ਮਿਆਦ ਪੁੱਗੀ',
    all: 'ਸਾਰੇ',
    filter: 'ਫ਼ਿਲਟਰ',
    theme: 'ਥੀਮ',
    darkTheme: 'ਡਾਰਕ',
    lightTheme: 'ਲਾਈਟ',
    systemTheme: 'ਸਿਸਟਮ',
    languageLabel: 'ਭਾਸ਼ਾ (Language)',
    privacyCenter: 'ਪਰਦੇਦਾਰੀ ਅਤੇ ਡੇਟਾ',
    exportAllData: 'ਸਾਰਾ ਡੇਟਾ ਨਿਰਯਾਤ ਕਰੋ (JSON)',
    deleteAllData: 'ਮੇਰਾ ਸਾਰਾ ਡੇਟਾ ਮਿਟਾਓ',
    dataEncrypted: 'ਸਥਾਨਕ ਡੇਟਾ ਐਨਕ੍ਰਿਪਟਡ ਹੈ (SQLCipher / AES-256)',
    recoveryKeyNotice: 'ਆਪਣੀ 24-ਸ਼ਬਦਾਂ ਦੀ ਰਿਕਵਰੀ ਕੁੰਜੀ ਨੂੰ ਸੰਭਾਲ ਕੇ ਰੱਖੋ। ਪਾਸਵਰਡ ਭੁੱਲਣ ਤੇ ਇਸਦੀ ਲੋੜ ਪਵੇਗੀ।',
    saveRecoveryKey: 'ਮੈਂ ਆਪਣੀ ਰਿਕਵਰੀ ਕੁੰਜੀ ਸੁਰੱਖਿਅਤ ਕਰ ਲਈ ਹੈ',
    tokenLimitWarning: 'ਇਸ ਗੱਲਬਾਤ ਵਿੱਚ 100 ਸੁਨੇਹੇ ਹੋ ਗਏ ਹਨ। ਸੰਦਰਭ ਬਣਾਈ ਰੱਖਣ ਲਈ ਪੁਰਾਣੇ ਸੁਨੇਹਿਆਂ ਦਾ ਸਾਰ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਹੈ।',
    recoverPassword: 'ਪਾਸਵਰਡ ਮੁੜ ਪ੍ਰਾਪਤ ਕਰੋ',
    username: 'ਉਪਭੋਗਤਾ ਨਾਮ',
    password: 'ਪਾਸਵਰਡ',
    displayName: 'ਦਿਖਾਉਣ ਵਾਲਾ ਨਾਮ',
    assistant: 'ਸਹਾਇਕ',
    passwordStrength: 'ਪਾਸਵਰਡ ਤਾਕਤ',
    phishingAnalyzer: 'ਫਿਸ਼ਿੰਗ ਵਿਸ਼ਲੇਸ਼ਕ',
    privacy: 'ਪਰਦੇਦਾਰੀ ਅਤੇ ਸੁਰੱਖਿਆ',
    exportData: 'ਡੇਟਾ ਨਿਰਯਾਤ ਕਰੋ',
    language: 'ਭਾਸ਼ਾ',
    auditLogs: 'ਆਡਿਟ ਲੌਗ',
  },
};
