/**
 * The terms of use and privacy policy, as seeded content.
 *
 * These are CMS pages so an administrator can correct wording without a deploy, and so
 * `version` can be bumped deliberately when a change is material — which is what re-prompts
 * users for consent (`user_consents` records the version each person accepted).
 *
 * ⚠️ Every factual claim here is drawn from `ops/data-map.md`, which was verified against the
 * schema and the code rather than from memory. If the system changes, the document is wrong
 * until it is updated — a privacy policy that describes behaviour the software does not have is
 * worse than none, because it is a promise nobody kept.
 *
 * ⚠️ The Marathi text is a first translation and has NOT been reviewed by a native speaker. It
 * should be before this reaches real users; the English is authoritative in the meantime.
 */

export const POLICY_VERSION = 1;

type Block = { text: string; bold?: boolean } | { list: string[] };

function doc(blocks: Block[]) {
  return {
    type: 'doc',
    content: blocks.map((b) =>
      'list' in b
        ? {
            type: 'bulletList',
            content: b.list.map((item) => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
            })),
          }
        : {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: b.text,
                ...(b.bold ? { marks: [{ type: 'bold' }] } : {}),
              },
            ],
          },
    ),
  };
}

const ORG = 'Jnana Prabodhini, 510 Sadashiv Peth, Pune, Maharashtra 411030, India';

// ─── Terms of Use ─────────────────────────────────────────────────────────────

const termsEn = doc([
  { text: 'Who runs Veervrat', bold: true },
  {
    text: `Veervrat is operated by ${ORG}, a registered public trust and society. Contact us at the address above or by telephone on 02024207000.`,
  },

  { text: 'You must be 18 or over', bold: true },
  {
    text: 'Veervrat is for adults. You confirm your date of birth when you create an account, and accounts belonging to people under 18 are removed when we become aware of them.',
  },

  { text: 'What Veervrat is for', bold: true },
  {
    text: 'Veervrat supports personal reflection: identifying weaknesses you want to work on, choosing exposures, resolutions and challenges, and recording your experience. A vratmitra may guide you through that work.',
  },
  {
    text: 'It is not a medical, psychological or crisis service. If you need help with your health or safety, please contact a qualified professional or emergency services.',
  },

  { text: 'Your account', bold: true },
  {
    list: [
      'Keep your password to yourself. You are responsible for what happens under your account.',
      'Give accurate information, including your date of birth.',
      'One account per person.',
    ],
  },

  { text: 'What you write', bold: true },
  {
    text: 'You keep ownership of what you write. By posting content that is visible to others — a blog post, a comment, or an experience log you have marked as visible — you allow us to show it to the people you have chosen to show it to.',
  },
  {
    text: 'Do not post content that is unlawful, abusive, hateful, or that discloses someone else’s private information. We may remove content and suspend accounts that do.',
  },

  { text: 'Guidance between people', bold: true },
  {
    text: 'A vratmitra can see the journey content of the vratarthi they are assigned to, and may record private notes about that guidance. This is how mentoring works on Veervrat, and accepting these terms includes accepting that arrangement for any journey you assign a vratmitra to.',
  },

  { text: 'Ending your account', bold: true },
  {
    text: 'You can delete your account from your settings at any time. What that does is described in the privacy policy.',
  },
  {
    text: 'We may suspend or remove an account that breaks these terms, is used to harm someone, or belongs to a person under 18.',
  },

  { text: 'The service may change', bold: true },
  {
    text: 'Veervrat is developed by a nonprofit and is offered free of charge. Features may change or be withdrawn, and the service may be unavailable at times. We give no warranty that it will be uninterrupted or error-free.',
  },

  { text: 'Changes to these terms', bold: true },
  {
    text: 'If we make a material change we will ask you to accept the new version. We keep a record of which version you accepted and when.',
  },

  { text: 'Governing law', bold: true },
  {
    text: 'These terms are governed by the laws of India, and the courts of Pune, Maharashtra have jurisdiction.',
  },
]);

const termsMr = doc([
  { text: 'वीरव्रत कोण चालवते', bold: true },
  {
    text: 'वीरव्रत ज्ञान प्रबोधिनी, ५१० सदाशिव पेठ, पुणे, महाराष्ट्र ४११०३० येथून चालवले जाते. ही नोंदणीकृत सार्वजनिक न्यास व संस्था आहे. संपर्क: वरील पत्ता किंवा दूरध्वनी ०२०२४२०७०००.',
  },

  { text: 'तुमचे वय १८ किंवा अधिक असावे', bold: true },
  {
    text: 'वीरव्रत प्रौढांसाठी आहे. खाते तयार करताना तुम्ही तुमची जन्मतारीख नोंदवता. १८ वर्षांखालील व्यक्तींची खाती लक्षात आल्यावर काढून टाकली जातात.',
  },

  { text: 'वीरव्रत कशासाठी आहे', bold: true },
  {
    text: 'वीरव्रत आत्मपरीक्षणासाठी आहे — तुम्हाला ज्यावर काम करायचे आहे अशा उणिवा ओळखणे, त्यासाठी अनावरण, संकल्प व आव्हाने निवडणे आणि तुमचा अनुभव नोंदवणे. या कामात वीरमित्र तुम्हाला मार्गदर्शन करू शकतो.',
  },
  {
    text: 'ही वैद्यकीय, मानसोपचार किंवा तातडीची सेवा नाही. आरोग्य किंवा सुरक्षिततेसाठी मदत हवी असल्यास कृपया पात्र व्यावसायिक किंवा आपत्कालीन सेवांशी संपर्क साधा.',
  },

  { text: 'तुमचे खाते', bold: true },
  {
    list: [
      'तुमचा पासवर्ड स्वतःपुरता ठेवा. तुमच्या खात्यावर जे घडते त्याची जबाबदारी तुमची आहे.',
      'जन्मतारखेसह अचूक माहिती द्या.',
      'प्रत्येक व्यक्तीसाठी एकच खाते.',
    ],
  },

  { text: 'तुम्ही जे लिहिता', bold: true },
  {
    text: 'तुम्ही जे लिहिता त्याची मालकी तुमचीच राहते. इतरांना दिसणारा मजकूर — ब्लॉग, प्रतिक्रिया, किंवा तुम्ही दृश्य म्हणून चिन्हांकित केलेला अनुभव — प्रसिद्ध करून तुम्ही तो ज्यांना दाखवायचे ठरवले आहे त्यांना दाखवण्याची परवानगी देता.',
  },
  {
    text: 'बेकायदेशीर, अपमानास्पद, द्वेषपूर्ण किंवा दुसऱ्याची खाजगी माहिती उघड करणारा मजकूर टाकू नका. असा मजकूर काढून टाकला जाऊ शकतो आणि खाते स्थगित केले जाऊ शकते.',
  },

  { text: 'व्यक्तींमधील मार्गदर्शन', bold: true },
  {
    text: 'नेमून दिलेल्या व्रतार्थीचा प्रवासातील मजकूर वीरमित्राला दिसतो, आणि त्या मार्गदर्शनाबद्दल तो खाजगी टिपणे नोंदवू शकतो. वीरव्रतवर मार्गदर्शन असेच चालते; या अटी स्वीकारणे म्हणजे तुम्ही ज्या प्रवासाला वीरमित्र नेमता त्यासाठी ही व्यवस्था स्वीकारणे.',
  },

  { text: 'खाते बंद करणे', bold: true },
  {
    text: 'तुम्ही सेटिंग्जमधून कधीही तुमचे खाते हटवू शकता. त्याने नेमके काय होते हे गोपनीयता धोरणात दिले आहे.',
  },
  {
    text: 'या अटींचा भंग करणारे, दुसऱ्याला हानी पोहोचवण्यासाठी वापरलेले, किंवा १८ वर्षांखालील व्यक्तीचे खाते आम्ही स्थगित किंवा बंद करू शकतो.',
  },

  { text: 'सेवा बदलू शकते', bold: true },
  {
    text: 'वीरव्रत एका ना-नफा संस्थेकडून विकसित केले जाते आणि विनामूल्य दिले जाते. वैशिष्ट्ये बदलू शकतात किंवा काढून घेतली जाऊ शकतात, आणि सेवा कधीकधी उपलब्ध नसू शकते. ती अखंड किंवा त्रुटिरहित असेल अशी हमी आम्ही देत नाही.',
  },

  { text: 'या अटींमधील बदल', bold: true },
  {
    text: 'महत्त्वाचा बदल केल्यास आम्ही तुम्हाला नवीन आवृत्ती स्वीकारण्यास सांगू. तुम्ही कोणती आवृत्ती व कधी स्वीकारली याची नोंद आम्ही ठेवतो.',
  },

  { text: 'लागू कायदा', bold: true },
  {
    text: 'या अटींना भारताचे कायदे लागू होतात आणि पुणे, महाराष्ट्र येथील न्यायालयांचे अधिकारक्षेत्र राहील.',
  },
]);

// ─── Privacy Policy ───────────────────────────────────────────────────────────

const privacyEn = doc([
  { text: 'Who is responsible for your data', bold: true },
  {
    text: `${ORG} decides how and why your personal data is used. You can reach us at the address above or on 02024207000 with any question about your data, including a request to see or correct it.`,
  },

  { text: 'What we collect', bold: true },
  {
    list: [
      'Your name, username, email address and date of birth, and your gender if you choose to give one.',
      'Your password, stored only in an irreversible hashed form — we cannot read it. If you sign in with Google, we store the connection to your Google account instead.',
      'What you do on Veervrat: weakness assessments and their answers, journeys, exposures, resolutions, challenges, experience logs, blog posts, comments, and messages you send to a vratmitra.',
      'Notes a vratmitra records about guiding you. These are not shown to you.',
      'Technical information needed to run the service: your IP address, browser type, and the times you signed in.',
    ],
  },

  { text: 'Why we use it', bold: true },
  {
    list: [
      'To give you the service — your account, your journeys, and guidance from a vratmitra.',
      'To send you necessary email: verifying your address, resetting your password, and notifications you have not turned off.',
      'To keep the service secure — detecting misuse, applying rate limits, and recording administrative actions.',
      'To confirm you are old enough to use Veervrat.',
    ],
  },
  {
    text: 'We do not sell your data. We do not use it for advertising. We do not profile you.',
  },

  { text: 'Who can see what', bold: true },
  {
    list: [
      'Your reflections and journey content are private to you by default.',
      'A vratmitra assigned to a journey can see that journey’s content, and can record private notes about it.',
      'Content you deliberately publish — a blog post, a comment, or an experience log marked visible — is seen by the audience you chose.',
      'Administrators can see account information and take administrative actions. Those actions are recorded.',
    ],
  },

  { text: 'Where your data is kept', bold: true },
  {
    text: 'Your data is stored in India, on Microsoft Azure’s Central India region. Email is sent through Jnana Prabodhini’s own mail servers. If you sign in with Google, Google knows you did so.',
  },

  { text: 'How long we keep it', bold: true },
  {
    list: [
      'Your account and its content: until you delete your account.',
      'Sign-in sessions: for the life of the session.',
      'Records of administrative actions: retained as a security record.',
      'Backups: up to 35 days, after which they are overwritten.',
    ],
  },

  { text: 'Deleting your account', bold: true },
  {
    text: 'You can delete your account from your settings. When you do, we remove your name, username, email address and profile picture, end all your sessions, and stop your account appearing in search.',
  },
  {
    text: 'What you wrote stays, under an anonymous label. Journeys, assessments, experience logs and messages remain so that a vratmitra’s record of their guidance is not left with holes. Records of administrative actions are also kept.',
  },
  {
    text: 'If you want something removed beyond this, contact us and we will tell you what is possible.',
  },

  { text: 'Your rights', bold: true },
  {
    text: 'You can ask what data we hold about you, ask us to correct it, or ask us to delete your account. Write to us at the address above.',
  },

  { text: 'Keeping data safe', bold: true },
  {
    text: 'Connections are encrypted, passwords are stored hashed, access to systems is limited to the people who need it, and administrative actions are recorded. No service can promise perfect security, and we do not.',
  },

  { text: 'Changes to this policy', bold: true },
  {
    text: 'If we make a material change we will ask you to accept the new version, and we keep a record of which version you accepted and when.',
  },
]);

const privacyMr = doc([
  { text: 'तुमच्या माहितीसाठी कोण जबाबदार आहे', bold: true },
  {
    text: 'ज्ञान प्रबोधिनी, ५१० सदाशिव पेठ, पुणे, महाराष्ट्र ४११०३० ही तुमची वैयक्तिक माहिती कशी व का वापरली जाते हे ठरवते. तुमच्या माहितीबाबत कोणताही प्रश्न — ती पाहण्याची किंवा दुरुस्त करण्याची विनंती धरून — वरील पत्त्यावर किंवा ०२०२४२०७००० वर विचारता येईल.',
  },

  { text: 'आम्ही काय गोळा करतो', bold: true },
  {
    list: [
      'तुमचे नाव, वापरकर्तानाव, ईमेल पत्ता आणि जन्मतारीख; तसेच तुम्ही दिल्यास तुमचे लिंग.',
      'तुमचा पासवर्ड, केवळ अपरिवर्तनीय स्वरूपात साठवलेला — तो आम्हाला वाचता येत नाही. Google ने साइन इन केल्यास त्याऐवजी तुमच्या Google खात्याशी जोडणी साठवली जाते.',
      'वीरव्रतवरील तुमची कृती: उणीव चाचण्या व त्यांची उत्तरे, प्रवास, अनावरणे, संकल्प, आव्हाने, अनुभव नोंदी, ब्लॉग, प्रतिक्रिया आणि वीरमित्राला पाठवलेले संदेश.',
      'तुम्हाला मार्गदर्शन करताना वीरमित्राने नोंदवलेली टिपणे. ही तुम्हाला दाखवली जात नाहीत.',
      'सेवा चालवण्यासाठी आवश्यक तांत्रिक माहिती: तुमचा IP पत्ता, ब्राउझरचा प्रकार आणि साइन इनच्या वेळा.',
    ],
  },

  { text: 'ती का वापरतो', bold: true },
  {
    list: [
      'तुम्हाला सेवा देण्यासाठी — तुमचे खाते, तुमचे प्रवास आणि वीरमित्राचे मार्गदर्शन.',
      'आवश्यक ईमेल पाठवण्यासाठी: पत्ता पडताळणी, पासवर्ड पुन्हा सेट करणे, आणि तुम्ही बंद न केलेल्या सूचना.',
      'सेवा सुरक्षित ठेवण्यासाठी — गैरवापर ओळखणे, मर्यादा लावणे आणि प्रशासकीय कृतींची नोंद ठेवणे.',
      'तुमचे वय पुरेसे आहे याची खात्री करण्यासाठी.',
    ],
  },
  { text: 'आम्ही तुमची माहिती विकत नाही. जाहिरातींसाठी वापरत नाही. तुमची प्रोफाइलिंग करत नाही.' },

  { text: 'कोणाला काय दिसते', bold: true },
  {
    list: [
      'तुमचे चिंतन आणि प्रवासातील मजकूर मूलतः तुमच्यापुरताच खाजगी असतो.',
      'प्रवासाला नेमलेल्या वीरमित्राला त्या प्रवासाचा मजकूर दिसतो आणि त्याबद्दल तो खाजगी टिपणे नोंदवू शकतो.',
      'तुम्ही जाणीवपूर्वक प्रसिद्ध केलेला मजकूर — ब्लॉग, प्रतिक्रिया, किंवा दृश्य म्हणून चिन्हांकित अनुभव — तुम्ही निवडलेल्या वाचकांना दिसतो.',
      'प्रशासक खात्याची माहिती पाहू शकतात व प्रशासकीय कृती करू शकतात. त्या कृतींची नोंद ठेवली जाते.',
    ],
  },

  { text: 'तुमची माहिती कुठे ठेवली जाते', bold: true },
  {
    text: 'तुमची माहिती भारतात, Microsoft Azure च्या मध्य भारत विभागात साठवली जाते. ईमेल ज्ञान प्रबोधिनीच्या स्वतःच्या मेल सर्व्हरमधून पाठवला जातो. Google ने साइन इन केल्यास तुम्ही तसे केले हे Google ला कळते.',
  },

  { text: 'किती काळ ठेवतो', bold: true },
  {
    list: [
      'तुमचे खाते व त्यातील मजकूर: तुम्ही खाते हटवेपर्यंत.',
      'साइन-इन सत्रे: सत्र संपेपर्यंत.',
      'प्रशासकीय कृतींच्या नोंदी: सुरक्षा नोंद म्हणून ठेवल्या जातात.',
      'बॅकअप: ३५ दिवसांपर्यंत, त्यानंतर ते पुन्हा लिहिले जातात.',
    ],
  },

  { text: 'खाते हटवणे', bold: true },
  {
    text: 'तुम्ही सेटिंग्जमधून खाते हटवू शकता. तसे केल्यावर तुमचे नाव, वापरकर्तानाव, ईमेल पत्ता व प्रोफाइल चित्र काढून टाकले जाते, सर्व सत्रे संपवली जातात आणि तुमचे खाते शोधात दिसणे थांबते.',
  },
  {
    text: 'तुम्ही लिहिलेला मजकूर निनावी नावाखाली राहतो. प्रवास, चाचण्या, अनुभव नोंदी व संदेश राहतात, जेणेकरून वीरमित्राच्या मार्गदर्शनाच्या नोंदीत खंड पडू नये. प्रशासकीय कृतींच्या नोंदीही ठेवल्या जातात.',
  },
  {
    text: 'याहून अधिक काही काढून टाकायचे असल्यास आमच्याशी संपर्क साधा; काय शक्य आहे ते आम्ही सांगू.',
  },

  { text: 'तुमचे हक्क', bold: true },
  {
    text: 'आमच्याकडे तुमची कोणती माहिती आहे हे विचारू शकता, ती दुरुस्त करण्यास सांगू शकता, किंवा खाते हटवण्यास सांगू शकता. वरील पत्त्यावर लिहा.',
  },

  { text: 'माहिती सुरक्षित ठेवणे', bold: true },
  {
    text: 'जोडण्या एन्क्रिप्टेड आहेत, पासवर्ड हॅश स्वरूपात साठवले जातात, प्रणालींपर्यंतचा प्रवेश गरजेपुरत्या व्यक्तींपुरता मर्यादित आहे, आणि प्रशासकीय कृतींची नोंद ठेवली जाते. कोणतीही सेवा परिपूर्ण सुरक्षिततेची हमी देऊ शकत नाही, आणि आम्हीही देत नाही.',
  },

  { text: 'या धोरणातील बदल', bold: true },
  {
    text: 'महत्त्वाचा बदल केल्यास आम्ही तुम्हाला नवीन आवृत्ती स्वीकारण्यास सांगू, आणि तुम्ही कोणती आवृत्ती व कधी स्वीकारली याची नोंद ठेवू.',
  },
]);

export const POLICY_DOCUMENTS = [
  {
    key: 'terms',
    version: POLICY_VERSION,
    titleEn: 'Terms of Use',
    titleMr: 'वापराच्या अटी',
    bodyEn: termsEn,
    bodyMr: termsMr,
  },
  {
    key: 'privacy',
    version: POLICY_VERSION,
    titleEn: 'Privacy Policy',
    titleMr: 'गोपनीयता धोरण',
    bodyEn: privacyEn,
    bodyMr: privacyMr,
  },
];
