import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, Mail } from 'lucide-react';

// ====================================================================
// פרטי החברה — RBS Telecom
// ====================================================================
const COMPANY = {
  name: 'רבס טלקום בע״מ',
  number: '514373679', // ח.פ
  address: 'נתניה, לנטוס טום 10',
  phone: '077-2045522',
  email: 'info@rbs-telecom.com',
  a11yCoordinator: 'שרון יעקובי',
  updated: 'יוני 2026',
};

type DocKey = 'privacy' | 'cookies' | 'terms' | 'accessibility';

const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-base font-bold text-[#0c2d57] mt-5 mb-2">{children}</h2>
);
const P: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={className || "text-sm text-gray-700 leading-relaxed mb-2"}>{children}</p>
);
const LI: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="text-sm text-gray-700 leading-relaxed mb-1">{children}</li>
);

const AccessibilityDoc: React.FC = () => (
  <div>
    <H2>מחויבות לנגישות</H2>
    <P>{COMPANY.name} רואה חשיבות רבה במתן שירות שוויוני לכלל הלקוחות ופועלת להנגשת האתר לאנשים עם מוגבלות, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ״ח-1998, ולתקנות הנגישות מכוחו.</P>
    <H2>סטטוס הנגישות באתר</H2>
    <P>נגישות האתר נמצאת בתהליך הטמעה ושיפור מתמשכים. אנו פועלים להתאים את האתר להנחיות התקן הישראלי ת״י 5568 (התואם WCAG 2.0 ברמה AA). חלק מאמצעי הנגישות כבר מיושמים, ואנו ממשיכים לבחון, לשפר ולהשלים את ההתאמות באופן שוטף. הצהרה זו מתארת את מצב הנגישות הנוכחי ואת פעולותינו לשיפורו, ומתעדכנת עם התקדמות התהליך.</P>
    <H2>אמצעי הנגשה באתר</H2>
    <ul className="list-disc pr-5">
      <LI>תפריט נגישות ייעודי: הגדלת טקסט, גופן קריא, הדגשת קישורים ועצירת אנימציות.</LI>
      <LI>מבנה דף סמנטי ותאימות לקוראי מסך.</LI>
      <LI>ניווט מלא באמצעות מקלדת וקישור "דלג לתוכן הראשי".</LI>
      <LI>סימון ברור של אלמנט הפוקוס בעת ניווט מקלדת.</LI>
      <LI>טקסט חלופי (alt) לתמונות.</LI>
      <LI>שמירה על ניגודיות צבעים וכיווניות RTL מותאמת.</LI>
      <LI>תמיכה בהגדלת התצוגה בדפדפן.</LI>
    </ul>
    <H2>תהליך מתמשך</H2>
    <P>אנו בוחנים ומשפרים את נגישות האתר באופן שוטף, באמצעים פנימיים ובבדיקה מתמשכת. מאחר שמדובר בתהליך מתמשך, ייתכן שחלקים מסוימים באתר טרם עומדים במלוא דרישות הנגישות בכל רגע נתון.</P>
    <H2>מגבלות ידועות</H2>
    <P>ייתכנו רכיבים או תכנים של צד שלישי (כגון מסמכים מקושרים או תכנים מוטמעים) שאינם נגישים במלואם. אנו פועלים לתיקון מתמשך.</P>
    <H2>נגישות השירות</H2>
    <P>בנוסף לנגישות האתר, ניתן לפנות לרכז הנגישות בכל בקשה להתאמות נגישות בקבלת השירות, ונשמח לסייע בהתאם לצורך.</P>
    <H2>רכז הנגישות ודרכי פנייה</H2>
    <P>שם: {COMPANY.a11yCoordinator}</P>
    <P>דוא״ל: {COMPANY.email} | טלפון: {COMPANY.phone}</P>
    <P>נתקלתם בקושי או במחסום נגישות כלשהו באתר? נשמח שתפנו לרכז הנגישות בפירוט הבעיה (כתובת הדף והקושי שהתעורר). אנו מתחייבים לבחון כל פנייה ולפעול לתיקון בהקדם האפשרי. פנייתכם מסייעת לנו לשפר את האתר עבור כלל המשתמשים.</P>
    <P className="text-xs text-gray-500">תאריך עדכון ההצהרה: {COMPANY.updated}</P>
  </div>
);

const PrivacyDoc: React.FC = () => (
  <div className="space-y-4">
    <H2>מדיניות פרטיות בשירותים המקוונים</H2>
    <P className="text-xs text-gray-500 font-bold mb-4">תאריך עדכון אחרון: 05/07/2026</P>

    <P>ברוך הבא לאתר האינטרנט של חברת רבס טלקום ("החברה" או "אנחנו"). בטרם השימוש בשירותים המקוונים באתר האינטרנט, עליך לקרוא בעיון רב את מדיניות זו אשר מהווה הסכם משפטי מחייב בין משתמש בשירותים המקוונים באתר האינטרנט (להלן: "אתה" או "המשתמש") לבין החברה.</P>
    
    <P>מדיניות הפרטיות חלה על כל פונקציה או שירות שהשירותים המקוונים מציעים וכל התחברות ו/או גלישה באמצעות השירותים המקוונים, על ידי המשתמשים. כאמור להלן, המדיניות עשויה להשתנות מעת לעת, על פי שיקול דעתה הבלעדי של החברה ובהתאם להוראות כל דין. כניסה ו/או גלישה בשירותים המקוונים מהווה אישור, כי המשתמש קרא ומסכים למדיניות הפרטיות ותנאי השימוש ללא כל הגבלה או הסתייגות.</P>
    
    <P>החברה מכבדת את פרטיות המשתמשים בשירותיה ואת הגולשים בשירותים המקוונים אותם היא מפעילה, ובמסמך זה החברה תשקף את מדיניותה בנושא הגנת המידע והפרטיות ואבטחת המידע.</P>
    
    <P>מטרת מדיניות זו, היא לתאר בקווים כלליים את האופן בו פועלת החברה בקשר עם "מידע", כהגדרתו בחוק הגנת הפרטיות התשמ"א-1981 הנאסף אודותיך, אשר נמסר על ידך או בשמך לצורך קבלת השירותים.</P>
    
    <P>מובהר בזאת, כי השימוש בלשון זכר במדיניות הפרטיות, נעשה מטעמי נוחות בלבד ואין בו כדי לפגוע ו/או ליצור אפליה כלשהי.</P>

    <H2>1. בעל שליטה במאגר המידע, והסכמה לשימוש במידע</H2>
    <div className="pr-2 space-y-2">
      <P><strong>1.1.</strong> מסירת המידע תלויה ברצונך ובהסכמתך. מובהר בזאת, כי לא חלה עליך כל חובה שבדין למסור את המידע, אלא אם צוין אחרת. עם זאת, מסירת חלק מהמידע האמור מהווה תנאי הכרחי לצורך שימוש בשירותים שונים המוצעים באתר האינטרנט, וללא הסכמתך לא ניתן יהיה להעניק לך שרות בהתאם.</P>
      <P><strong>1.2.</strong> מובהר בזאת, כי חברת רבס טלקום בע"מ ח.פ 514373679 הינה בעלת השליטה במאגר המידע.<br/>
      כתובתה ופרטי קשר:<br/>
      רחוב טום לנטוס 10, נתניה ; טל' 054-8312360 ; דוא"ל info@rbs-tecom.com</P>
      <P><strong>1.3.</strong> מאגרי המידע של החברה מנוהלים כדין ומאובטחים בהתאם להוראות חוק הגנת הפרטיות התשמ"א – 1981 ותקנות הגנת הפרטיות (אבטחת מידע) תשע"ז- 2017 (להלן יחד: "החוק").</P>
      <P><strong>1.4.</strong> החברה רואה חשיבות רבה בשמירה על פרטיותך, ולכן עושה את המתחייב על פי חוק על מנת לשמור כיאות על המידע שנמסר לה.</P>
      <P><strong>1.5.</strong> המשמעות היא, בין היתר, כי כל המידע שיועלה על ידך לשירותים המקוונים, נשמר במאגרי המידע של החברה, כפי שיפורט להלן בהמשך המדיניות, ומוגן באמצעים שנועדו לשמור על המידע, על שלמותו, על זמינותו ועל סודיותו של המידע. ההגנה והשמירה על המידע וסודיותו, נחוצים על מנת שנוכל להעניק לך את השירות.</P>
    </div>

    <H2>2. תיאור השירותים המקוונים</H2>
    <div className="pr-2 space-y-2">
      <P><strong>2.1.</strong> באתר האינטרנט של החברה מוצג מידע מקיף אודות פעילות החברה בתחומי יבוא והפצה של ציוד תקשורת, רשתות, מערכות אבטחה, פתרונות בית חכם, מתגים, נקודות גישה (AP), מערכות אל-פסק (UPS), נתבים ואביזרים נלווים. האתר כולל סקירה של תחומי הפעילות, קטלוגים של מוצרים, מידע מקצועי ועדכונים מהחברה.</P>
      <P><strong>2.2.</strong> כמו כן, אתר האינטרנט של רבס טלקום כולל טפסי פנייה מקוונים המאפשרים יצירת קשר ישיר עם נציגי החברה לצורך פניות עסקיות, בקשות להצטרפות כמפיצים או אינטגרטורים, פניות שירות לקוחות, וכן פניות כלליות לקבלת מענה מהחברה.</P>
    </div>

    <H2>3. איסוף פרטים אישיים</H2>
    <div className="pr-2 space-y-2">
      <P><strong>3.1.</strong> חלק מהשירותים שהחברה מעניקה טעונים מסירת פרטים אישיים של המשתמש. במסגרת קבלת השירותים תידרש למסור לחברה, בין היתר, ולפי העניין, שם מלא, שם העסק או החברה שלך, כתובת דוא"ל וטלפון, ככל ומדובר בהגשת קורות חיים תידרש למסור מידע הנוגע להשכלתך וכל מידע נוסף אותו בחרת לכלול בקורות החיים שלך ו/או תבחר לשתף במסגרת פנייתך (להלן: "המידע").</P>
      <P><strong>3.2.</strong> החברה אוספת את המידע על מנת לספק לך את השירותים, לבחון את קורות החיים שלך בהתאם למשרה המבוקשת, להעניק שירות למשתמשים בשירותים המקוונים באתר האינטרנט וכדי לתת לך את המידע והמחירונים אותם אתה מבקש לדעת.</P>
      <P><strong>3.3.</strong> כאשר אתה עושה שימוש בשירותים המקוונים במסגרת אתר האינטרנט, יייתכן וייאסף מידע הנשלח באופן אוטומטי על ידי המחשב, טלפון נייד או מכשיר אחר בו אתה משתמש לצורך גישה לשירותים. המידע כולל, בין היתר: נתונים על הדפים אליהם אתה ניגש, כתובת IP של המכשיר ממנו בוצעה התחברות לשירותים המקוונים, מספר זיהוי או מזהה ייחודי של המכשיר, סוג מכשיר, פרטי מיקום גיאוגרפי, פרטי מחשב וחיבור, פרטי רשת למכשירים ניידים, נתונים סטטיסטיים על צפיות בדפים, תעבורה אל שירותים המקוונים ומהם, כתובת URL להפניה, נתוני פרסומות וכן נתוני יומן אינטרנט ופרטים סטנדרטיים אחרים. באפשרותך להימנע מאיסוף המידע באמצעות הגדרות דפדפן האינטרנט הפרטי שלך.</P>
    </div>

    <H2>4. שימוש בעוגיות (Cookies)</H2>
    <div className="pr-2 space-y-2">
      <P><strong>4.1.</strong> האתר עושה שימוש בעוגיות (Cookies) ובטכנולוגיות דומות לצורך תפעולו התקין, שיפור חוויית המשתמש, ניתוח סטטיסטי של פעילות הגולשים, וכן לצורך התאמה אישית של תוכן ושירותים.</P>
      <div className="pr-4 space-y-2">
        <P><strong>4.1.1.</strong> העוגיות המשמשות באתר כוללות, בין היתר:</P>
        <ul className="list-disc pr-5">
          <LI>עוגיות חיוניות (Essential Cookies): נדרשות לצורך הפעלה תקינה של האתר ואינן ניתנות לנטרול במערכות שלנו.</LI>
          <LI>עוגיות אנליטיות/סטטיסטיות (Analytics Cookies): מאפשרות לנו לנתח את השימוש באתר, כדי לשפר את תכניו ואת חוויית המשתמש.</LI>
          <LI>עוגיות העדפות (Preference Cookies): נועדו לשמור הגדרות שהמשתמש בחר, כגון שפה והעדפות אחרות.</LI>
        </ul>
        <P><strong>4.1.2.</strong> רוב העוגיות הנמצאות באתר אינן אוספות מידע מזהה אישי ישיר, אלא מידע טכני או סטטיסטי. עם זאת, ייתכן שצדדים שלישיים, המפעילים שירותי ניתוח או פרסום, יוכלו לשייך מידע מסוים לפרופיל משתמש אם קיימת אצלם זיקה חיצונית נוספת.</P>
        <P><strong>4.1.3.</strong> משך השמירה של העוגיות משתנה: חלקן נשמרות למשך תקופה קצובה, אחרות עד לשליטת וסגירת הדפדפן (Session Cookies), ויש עוגיות שנשמרות עד למחיקה יזומה על ידי המשתמש או עד לתום תוקף שנקבע על ידי ספק השירות.</P>
        <P><strong>4.1.4.</strong> באפשרות המשתמש לנהל או למחוק את העוגיות בכל עת דרך הגדרות הדפדפן שלו. יובהר כי חסימת עוגיות חיוניות עלולה לפגוע בתפקוד האתר ובהיקף המידע שיוצג באתר.</P>
      </div>
    </div>

    <H2>5. מטרות איסוף המידע</H2>
    <P>השימוש במידע כאמור יעשה בהתאם לדין הישראלי, להסכם תנאי השימוש ולמדיניות פרטיות זו, וזאת למטרות והשימושים המפורטים להלן. יצוין, כי החברה שומרת לעצמה את הזכות לעדכן את מטרות אלה בהתאם לשירותים שונים שהחברה עתידה לספק למשתמשים בשירותים המקוונים. השימושים האמורים כוללים, בין היתר, את המטרות הבאות:</P>
    <ul className="list-disc pr-5">
      <LI>לאפשר שימוש בשירותים המקוונים המוצעים במסגרת אתר האינטרנט, לרבות עיון במידע אודות פעילות החברה, קטלוגים, מחירונים, שירותים ומוצרים, חדשות ופרסומים רשמיים.</LI>
      <LI>לאפשר למשתמשים גישה למידע רלוונטי, לרבות מידע למפיצים, אינטגרטורים, מועמדים למשרות, לקוחות פוטנציאליים או שותפים עסקיים, וכן שימוש בטפסי פנייה מקוונים ליצירת קשר עם החברה.</LI>
      <LI>לשיפור חוויית השימוש בשירותים המקוונים ובשירותי החברה, ובכלל זה אפשרות למדוד את ביצועי השירותים המקוונים, להעריך את מידת שביעות הרצון, ולשפר את התוכן, העיצוב והנגישות של האתר.</LI>
      <LI>לעיבוד מידע סטטיסטי, לרבות איסוף וניתוח מידע אנונימי, סטטיסטי או מצרפי (אגרגטיבי) לצורך קבלת החלטות ושיפור השירותים המקוונים.</LI>
      <LI>לאבטחת השירותים המקוונים, לרבות זיהוי, מניעה וטיפול בסיכוני אבטחת מידע ובבעיות טכניות.</LI>
      <LI>לקבלת פניות מהמשתמשים בשירותים המקוונים (לרבות פניות עסקיות, בקשות לשיתופי פעולה, פניות שירות או מועמדים למשרות) ולטיפול בהן בהתאם לנהלי החברה.</LI>
      <LI>יצירת קשר עם המשתמש ככל שיידרש, לשם השלמת טיפול בפנייה, בירור פרטים או מתן מענה מקצועי בהתאם לדרכים המוצעות בשירותים המקוונים, כגון הגשת קורות חיים, מילוי טופס יצירת קשר או השארת פנייה כללית לחברה.</LI>
      <LI>עמידה בדרישות הדין הישראלי, לרבות מתן סיוע לרשויות מוסמכות ולכל גורם שלפי דין זכאי לקבל את המידע.</LI>
    </ul>

    <H2>6. טיפול נאות במידע ואבטחת המידע</H2>
    <div className="pr-2 space-y-2">
      <P><strong>6.1.</strong> הנתונים שנאספו אודותיך יישמרו במאגרי המידע של החברה ובאחריותה, על-פי החוק והנחיות רשם מאגרי המידע.</P>
      <P><strong>6.2.</strong> החברה משתמשת בטכנולוגיות אבטחת מידע ופועלת ליישם נהלים ושיטות עבודה מוכרות לאבטחת המידע האישי שנמסר על ידך באמצעות השירותים המקוונים המוצעים באתר האינטרנט, ופועלת כדי למנוע גישה, שימוש או חשיפה בלתי מורשים של המידע (ובכלל זה, כדי לשמור על כך שהשירותים המקוונים יהיו מוגנים מפני וירוסים, תוכנות זדוניות וכדומה). עם זאת, מובהר כי אין ביכולת אמצעי האבטחה להבטיח הגנה מוחלטת על המידע.</P>
      <P><strong>6.3.</strong> אחריות המשתמש, היא לנקוט באמצעי אבטחה בסיסיים במכשיר האישי או במחשב שממנו נעשה השימוש בשירותים המקוונים, כגון התקנת תוכנות אנטי-וירוס, חומת אש ושימוש בסיסמה חזקה לשם הגנה על המידע האישי שלך.</P>
    </div>

    <H2>7. העברת מידע לצדדים שלישיים</H2>
    <div className="pr-2 space-y-2">
      <P><strong>7.1.</strong> החברה עשויה להיעזר בשירותים של צדדים שלישיים לצורך הפעלת השירותים המקוונים המוצעים באתר האינטרנט. במסגרת זו, החברה עשויה להעניק גישה למערכות המידע שלה, הכוללות מידע אישי, לספקים, לרבות ספקי תוכנה, לצורך תחזוקה או לצורך תיקון תקלות במערכות הללו. בנוסף, מידע אישי עשוי לעבור לספקים המספקים שירותים בקשר לתפעול אתר האינטרנט ולמתן השירותים המקוונים המוצעים בו. כמו כן, החברה עשויה להעביר מידע אישי לספקי מחשוב ענן, בארץ ובחו"ל, לצורך אחסון או גיבוי, ככל שתחליט לקבל שירותים מסוג זה.</P>
      <P><strong>7.2.</strong> לצורכי שיווק ופרסום – החברה רשאית להעביר את פרטייך האישיים (ביניהם שם, מספר טלפון וכתובת דוא"ל) לחברות פרסום ו/או לרשתות חברתיות ו/או לארגונים בעלי אופי פעילות דומה, אשר יעשו שימוש במידע זה כדי להתאים עבורך ו/או עבור אחרים הצעות שיווקיות ופרסומות ייעודיות, הכל בהתאם למדיניות הפרטיות של אותם צדדים שלישיים והוראות הדין.</P>
      <P><strong>7.3.</strong> החברה רשאית להעביר מידע אישי לרשויות מוסמכות, על פי דרישות חוקיות, צווי בית משפט, או לצורך הגנה על זכויות החברה.</P>
      <P><strong>7.4.</strong> החברה רשאית להעביר מידע אנונימי או אגרגטיבי שאינו מזהה באופן אישי לצדדים שלישיים ללא מגבלה, לצורך שימושים לגיטימיים שונים, לרבות ניתוח נתונים ושיפור השירותים, כל זאת בכפוף לכל דין.</P>
    </div>

    <H2>8. זכויות העיון והתיקון</H2>
    <div className="pr-2 space-y-2">
      <P><strong>8.1.</strong> על פי החוק הנך רשאי לעיין במידע אודותיך השמור בידי החברה ואם המידע שברשות החברה אינו נכון, זכותך לבקש את תיקונו או מחיקתו. החברה דואגת לטפל בפניותיך כדי לממש את תהליכי הפרטיות, וניתן לפנות אליה בכל עניין הקשור להגנת הפרטיות, לרבות: הסרה ממאגר מידע, מימוש זכות העיון, מימוש זכות תיקון המידע כאמור לעיל וכל נושא הנוגע להגנת הפרטיות.</P>
      <P><strong>8.2.</strong> בכל פניה בנושא האמורים, יש לכלול פרטים מלאים ליצירת קשר ומענה. פניות בנושאים הנ"ל יש לבצע ישירות לחברה בכתובת הדוא"ל: info@rbs-tecom.com. מענה יינתן בהתאם להוראות ולמועדים הקבועים בחוק. ייתכן שבקשות מסוימות יהיו כפופות לתשלום אגרה בהתאם להוראות החוק.</P>
    </div>

    <H2>9. דין ומקום השיפוט</H2>
    <P>על השימוש בשירותים המקוונים יחולו אך ורק דיני מדינת ישראל. מקום השיפוט הבלעדי בגין כל דבר ועניין הנובע מתנאי השימוש הנ"ל או מהשירותים המקוונים הוא בבתי המשפט המוסמכים בעיר תל אביב-יפו.</P>

    <H2>10. הפניות לשירותים מקוונים חיצוניים – רשתות חברתיות</H2>
    <div className="pr-2 space-y-2">
      <P><strong>10.1.</strong> השירותים המקוונים המוצעים באתר כוללים הפניות או קישורים לאתרי אינטרנט, שאינם מנוהלים או מופעלים על ידי החברה (להלן: "שירותים המקוונים החיצוניים"). מובהר בזאת, כי החברה אינה נושאת בכל אחריות בנוגע לתוכן, למדיניות הפרטיות, לנוהלי איסוף המידע או לכל פעולה אחרת המתבצעת במסגרת הקישור לשירותים המקוונים החיצוניים.</P>
      <P><strong>10.2.</strong> החברה ממליצה לנהוג במשנה זהירות בעת שימוש בשירותים המקוונים החיצוניים, במיוחד בכל הנוגע למסירת מידע אישי או בעל רגישות מיוחדת. בעת שימוש בקישורים המפנים לשירותים המקוונים החיצוניים, המשתמש נדרש לקרוא ולעיין במדיניות הפרטיות ותנאי השימוש של אותם שירותים המקוונים החיצוניים. מובהר, כי השימוש בשירותים המקוונים החיצוניים הינו באחריות המשתמש בלבד, והחברה אינה אחראית לכל נזק שייגרם למשתמש בשל שימוש בהם או בשל המידע שנמסר בהם.</P>
    </div>

    <H2>11. שינויים במדיניות הפרטיות</H2>
    <P>החברה שומרת על הזכות לשנות או להתאים את מדיניות הפרטיות מעת לעת בהתאם לשיקול דעתה ובהתאם להוראות כל דין. השינויים ייכנסו לתוקף בתאריך העדכון האחרון של המסמך. המשך השימוש בשירותים לאחר תאריך העדכון האחרון יהווה הסכמה של המשתמש לשינויים.</P>

    <H2>12. צור קשר</H2>
    <P>הנך מוזמן ליצור עמנו קשר, בלשונית "צרו קשר" באתר האינטרנט של החברה ואנו נשיב לפנייתך באמצעות אמצעי ההתקשרות שהזנת.</P>
    <P>החברה מינתה ממונה הגנת הפרטיות וניתן ליצור עמו קשר, בכתובת הדוא"ל info@rbs-tecom.com או במספר הטלפון 054-8312360.</P>
  </div>
);

const CookiesDoc: React.FC = () => (
  <div>
    <H2>1. מה הן עוגיות</H2>
    <P>עוגיות (Cookies) הן קבצי טקסט קטנים הנשמרים במכשירך; אחסון מקומי (localStorage / sessionStorage) הוא מנגנון דומה. הם משמשים לתפעול האתר, לאבטחה ולשיפור חוויית המשתמש.</P>
    <H2>2. סוגי העוגיות שבשימוש</H2>
    <P><strong>עוגיות חיוניות</strong> — נדרשות לתפקוד האתר:</P>
    <ul className="list-disc pr-5">
      <LI>הזדהות והתחברות לחשבון (Google Firebase Authentication).</LI>
      <LI>אבטחה והגנה מפני שימוש אוטומטי לרעה (Google reCAPTCHA / App Check).</LI>
      <LI>שמירת ההסכמה לעוגיות.</LI>
    </ul>
    <P><strong>אחסון פונקציונלי</strong> — לשיפור החוויה:</P>
    <ul className="list-disc pr-5">
      <LI>מוצרים מועדפים והעדפות תצוגה.</LI>
      <LI>העדפות נגישות (גודל טקסט, גופן קריא וכד׳).</LI>
      <LI>מצב גלישת אורח (מתקין) וניהול מכסת שימוש ביועץ החכם.</LI>
    </ul>
    <P><strong>עוגיות צד שלישי</strong> — שירותי Google (reCAPTCHA, Firebase) עשויים להציב עוגיות בהתאם למדיניות הפרטיות שלהם.</P>
    <H2>3. ניהול עוגיות</H2>
    <P>באפשרותך לחסום או למחוק עוגיות דרך הגדרות הדפדפן. חסימת עוגיות חיוניות עלולה לפגוע בתפקוד האתר ובאפשרות ההתחברות.</P>
    <H2>4. הסכמה</H2>
    <P>בכניסה הראשונה לאתר מוצג באנר עוגיות. המשך השימוש והאישור מהווים הסכמה לשימוש בעוגיות כמתואר; ניתן לשנות את הגדרות הדפדפן בכל עת.</P>
    <H2>5. שינויים</H2>
    <P>מדיניות זו עשויה להתעדכן מעת לעת, והנוסח המעודכן יפורסם בעמוד זה.</P>
    <P className="text-xs text-gray-500">עודכן לאחרונה: {COMPANY.updated}</P>
  </div>
);

const TermsDoc: React.FC = () => (
  <div>
    <H2>1. כללי</H2>
    <P>תקנון זה ("התקנון") מסדיר את תנאי השימוש באתר של {COMPANY.name} (ח.פ {COMPANY.number}) ("החברה"). השימוש באתר מהווה הסכמה מלאה לתנאים אלה; אנא קרא אותם בעיון.</P>
    <H2>2. אופי השירות</H2>
    <P>האתר הוא קטלוג עסקי (B2B) המיועד ללקוחות, מפיצים ומתקינים מאושרים בלבד. הוא מציג מוצרים, מאפשר בניית הזמנות והצעות מחיר ותקשורת מול נציגי החברה.</P>
    <H2>3. הרשמה וחשבון משתמש</H2>
    <P>הגישה לחלק מהשירותים מותנית בהרשמה ובאישור החברה. עליך למסור פרטים נכונים ולשמור על סודיות פרטי ההתחברות. אתה אחראי לכל פעולה שתבוצע בחשבונך, ועליך להודיע לחברה על כל שימוש לא מורשה.</P>
    <H2>4. הזמנות והצעות מחיר</H2>
    <P>הזמנה או בקשה המבוצעת באתר מהווה הצעה בלבד וכפופה לאישור סופי של נציג החברה. אישור ההזמנה, זמינות המלאי ותנאי האספקה ייקבעו על ידי החברה. אין באמור משום התחייבות למכירה עד לאישור בפועל.</P>
    <H2>5. מחירים ומע״מ</H2>
    <P>המחירים, המבצעים והזמינות עשויים להשתנות מעת לעת וללא הודעה מוקדמת. אלא אם צוין אחרת, המחירים אינם כוללים מע״מ כחוק. בכל מקרה של אי-התאמה, מחיר ההזמנה המאושר על ידי נציג החברה הוא הקובע.</P>
    <H2>6. שימושים אסורים</H2>
    <P>אין לעשות באתר שימוש הפוגע בו או בצדדים שלישיים, לרבות איסוף אוטומטי של מידע (Scraping), ניסיון לחדור למערכות, הפצת תוכנות זדוניות או הפרת זכויות קניין רוחני.</P>
    <H2>7. קניין רוחני</H2>
    <P>כל התכנים, התמונות, הסימנים המסחריים, העיצוב והמידע באתר הם קניינם של {COMPANY.name} או של ספקיה ומוגנים בדין. אין להעתיק, להפיץ או לעשות בהם שימוש מסחרי ללא אישור מראש ובכתב.</P>
    <H2>8. זמינות השירות</H2>
    <P>השירות ניתן כפי שהוא ("AS-IS") וכפי שהוא זמין. החברה אינה מתחייבת לזמינות רציפה או נטולת תקלות, ורשאית לשנות, להשבית או להפסיק חלקים מהשירות לפי שיקול דעתה.</P>
    <H2>9. הגבלת אחריות ושיפוי</H2>
    <P>בכפוף לכל דין, החברה לא תישא באחריות לכל נזק ישיר, עקיף, תוצאתי או מיוחד הנובע מהשימוש או מאי-היכולת להשתמש באתר. אתה מתחייב לשפות את החברה בגין נזק שייגרם לה עקב הפרת התקנון על ידך.</P>
    <H2>10. סיום או השעיית גישה</H2>
    <P>החברה רשאית להשעות או לבטל את גישתך לאתר לפי שיקול דעתה, בין היתר במקרה של הפרת התקנון.</P>
    <H2>11. שינוי התקנון</H2>
    <P>החברה רשאית לעדכן תקנון זה מעת לעת. הנוסח המעודכן יפורסם בעמוד זה ויחייב ממועד פרסומו.</P>
    <H2>12. כוח עליון</H2>
    <P>החברה לא תישא באחריות לעיכוב או לכשל הנובעים מנסיבות שאינן בשליטתה הסבירה.</P>
    <H2>13. שונות</H2>
    <P>אם תיקבע הוראה בתקנון כבלתי תקפה, יוסיפו יתר ההוראות לעמוד בתוקפן. תקנון זה ממצה את ההסכמה בין הצדדים בנוגע לשימוש באתר.</P>
    <H2>14. דין וסמכות שיפוט</H2>
    <P>על תקנון זה יחולו דיני מדינת ישראל בלבד, וסמכות השיפוט הבלעדית תהא נתונה לבתי המשפט המוסמכים במחוז המרכז.</P>
    <H2>15. יצירת קשר</H2>
    <P>{COMPANY.name}, {COMPANY.address} | טלפון: {COMPANY.phone} | דוא״ל: {COMPANY.email}</P>
    <P className="text-xs text-gray-500">עודכן לאחרונה: {COMPANY.updated}</P>
  </div>
);

const DOC_TITLES: Record<DocKey, string> = {
  privacy: 'מדיניות פרטיות',
  cookies: 'מדיניות עוגיות',
  terms: 'תקנון ותנאי שימוש',
  accessibility: 'הצהרת נגישות',
};

// ====================================================================
// תפריט נגישות (Accessibility widget) — כלים בטוחים שאינם שוברים פריסה
// ====================================================================
type A11yState = { readable: boolean; links: boolean; nomotion: boolean; font: number };
const A11Y_DEFAULT: A11yState = { readable: false, links: false, nomotion: false, font: 0 };

const A11yIcon: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18z" />
  </svg>
);

const ToggleRow: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${active ? 'bg-[#004387] text-white border-[#004387]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
  >
    <span>{label}</span>
    <span className={`text-xs ${active ? 'text-white' : 'text-gray-400'}`}>{active ? 'פעיל' : 'כבוי'}</span>
  </button>
);

const LegalAndCookies: React.FC = () => {
  const [openDoc, setOpenDoc] = useState<DocKey | null>(null);
  const [consent, setConsent] = useState<boolean>(true);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [a11y, setA11y] = useState<A11yState>(A11Y_DEFAULT);

  useEffect(() => {
    try {
      setConsent(localStorage.getItem('rbs_cookie_consent') === '1');
    } catch {
      setConsent(true);
    }
    try {
      const saved = JSON.parse(localStorage.getItem('rbs_a11y') || 'null');
      if (saved && typeof saved === 'object') setA11y({ ...A11Y_DEFAULT, ...saved });
    } catch {}
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle('rbs-a11y-readable', a11y.readable);
    el.classList.toggle('rbs-a11y-links', a11y.links);
    el.classList.toggle('rbs-a11y-nomotion', a11y.nomotion);
    el.style.fontSize = a11y.font ? `${100 + a11y.font * 10}%` : '';
    try { localStorage.setItem('rbs_a11y', JSON.stringify(a11y)); } catch {}
  }, [a11y]);

  const acceptCookies = () => {
    try { localStorage.setItem('rbs_cookie_consent', '1'); } catch {}
    setConsent(true);
  };

  const setFont = (delta: number) => setA11y((p) => ({ ...p, font: Math.max(0, Math.min(4, p.font + delta)) }));
  const resetA11y = () => setA11y(A11Y_DEFAULT);

  const renderDoc = (k: DocKey) => {
    if (k === 'privacy') return <PrivacyDoc />;
    if (k === 'cookies') return <CookiesDoc />;
    if (k === 'terms') return <TermsDoc />;
    return <AccessibilityDoc />;
  };

  return (
    <>
      {/* CSS for accessibility adjustments (layout-safe, no filters) */}
      <style>{`
        .rbs-a11y-readable, .rbs-a11y-readable * { font-family: Arial, "Assistant", sans-serif !important; line-height: 1.7 !important; letter-spacing: .03em !important; }
        .rbs-a11y-links a { text-decoration: underline !important; outline: 1px dashed currentColor !important; outline-offset: 2px; }
        .rbs-a11y-nomotion *, .rbs-a11y-nomotion *::before, .rbs-a11y-nomotion *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
      `}</style>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#0c2d57] to-[#08203f] text-white/90 mt-auto" dir="rtl">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <img src="https://rbs-telecom.com/wp-content/uploads/2021/01/LOGO-RBS_FINAL.png" alt="רבס טלקום" className="h-12 bg-white rounded-lg p-2 mb-3 inline-block" />
              <p className="text-sm text-white/70 leading-relaxed mb-3">יבואן ומפיץ מורשה של פתרונות אבטחה, תקשורת ומיגון — שירות מקצועי ללקוחות ולמתקינים.</p>
              <div className="flex flex-col gap-2.5 mt-4">
                <div className="flex flex-wrap gap-2.5 items-center">
                  <img src="https://lh3.googleusercontent.com/d/15xOfJxJs-moC7gTES3_wNOAeajsOaR2F" alt="HIKVISION" referrerPolicy="no-referrer" className="h-8 bg-white rounded px-1.5 py-0.5 object-contain shadow-sm" />
                  <img src="https://lh3.googleusercontent.com/d/16OipS6V2WxnB6iU41A6AUlnqkkm0K8kh" alt="EZVIZ" referrerPolicy="no-referrer" className="h-8 bg-white rounded px-1.5 py-0.5 object-contain shadow-sm" />
                  <img src="https://lh3.googleusercontent.com/d/1NH5lbx4PYgUAwlwrIv6bC4bvnEA_3Xci" alt="POLMAN" referrerPolicy="no-referrer" className="h-8 bg-white rounded px-1.5 py-0.5 object-contain shadow-sm" />
                  <img src="https://lh3.googleusercontent.com/d/1yUKeGG1pZ5zx0KBQsUxDwnMBAXcumk5w" alt="ROBUSTEL" referrerPolicy="no-referrer" className="h-6 bg-white rounded px-2 py-1 object-contain shadow-sm" />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <img src="https://lh3.googleusercontent.com/d/17j_07DGwqHdwtOvE_YkwKBAY17hbWvJO" alt="Boost Link" referrerPolicy="no-referrer" className="h-6 bg-white rounded px-1 py-0.5 object-contain shadow-sm" />
                  <img src="https://lh3.googleusercontent.com/d/1oNXffciQFDX9ULUlB02wZRdG7qkNdDmC" alt="Boost Secure" referrerPolicy="no-referrer" className="h-6 bg-white rounded px-1 py-0.5 object-contain shadow-sm" />
                  <img src="https://lh3.googleusercontent.com/d/1Ec6QmrHTeGihW5NZOVaji9tZrSsIZCnW" alt="Boost" referrerPolicy="no-referrer" className="h-6 bg-white rounded px-1 py-0.5 object-contain shadow-sm" />
                  <img src="https://lh3.googleusercontent.com/d/1rjBiZSRWAFQfCYDiECpt3DaCOn0VqB54" alt="Inginium" referrerPolicy="no-referrer" className="h-6 bg-white rounded px-1 py-0.5 object-contain shadow-sm" />
                  <img src="https://lh3.googleusercontent.com/d/1mCwVsuv0qfBBO0Hrd3ewS3ZWNp43c8U-" alt="Boost" referrerPolicy="no-referrer" className="h-6 bg-white rounded px-1 py-0.5 object-contain shadow-sm" />
                  <img src="https://lh3.googleusercontent.com/d/1WrLAN7EJMtMv20xcJFDhAjYnPqrIwDhZ" alt="Boost" referrerPolicy="no-referrer" className="h-6 bg-white rounded px-1 py-0.5 object-contain shadow-sm" />
                </div>
              </div>
            </div>

            {/* Contact & Legal side-by-side on mobile, and columns on sm+ */}
            <div className="grid grid-cols-2 gap-4 sm:col-span-2 sm:grid-cols-2">
              {/* Contact */}
              <div>
                <h3 className="text-[#f7941d] font-bold mb-3 text-sm">יצירת קשר</h3>
                <ul className="space-y-2.5 text-sm text-white/80">
                  <li className="flex items-start gap-2"><MapPin size={15} className="text-[#f7941d] mt-0.5 flex-shrink-0" /> <span>{COMPANY.address}</span></li>
                  <li className="flex items-center gap-2"><Phone size={15} className="text-[#f7941d] flex-shrink-0" /> <a href={`tel:${COMPANY.phone}`} className="hover:text-white" dir="ltr">{COMPANY.phone}</a></li>
                  <li className="flex items-center gap-2"><Mail size={15} className="text-[#f7941d] flex-shrink-0" /> <a href={`mailto:${COMPANY.email}`} className="hover:text-white break-all">{COMPANY.email}</a></li>
                </ul>
                <p className="text-xs text-white/45 mt-3">ח.פ {COMPANY.number}</p>
              </div>

              {/* Legal */}
              <div>
                <h3 className="text-[#f7941d] font-bold mb-3 text-sm">מידע ומסמכים</h3>
                <nav className="flex flex-col items-start gap-2.5 text-sm" aria-label="מידע משפטי">
                  <button onClick={() => setOpenDoc('accessibility')} className="text-white/80 hover:text-white transition-colors text-right">הצהרת נגישות</button>
                  <button onClick={() => setOpenDoc('privacy')} className="text-white/80 hover:text-white transition-colors text-right">מדיניות פרטיות</button>
                  <button onClick={() => setOpenDoc('cookies')} className="text-white/80 hover:text-white transition-colors text-right">מדיניות עוגיות</button>
                  <button onClick={() => setOpenDoc('terms')} className="text-white/80 hover:text-white transition-colors text-right">תקנון ותנאי שימוש</button>
                </nav>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-4 text-xs text-white/50 text-center">
            © {new Date().getFullYear()} {COMPANY.name}. כל הזכויות שמורות.
          </div>
        </div>
      </footer>

      {/* Accessibility floating button */}
      <button
        onClick={() => setA11yOpen((v) => !v)}
        aria-label="תפריט נגישות"
        aria-expanded={a11yOpen}
        className="fixed bottom-4 left-4 z-[80] w-12 h-12 rounded-full bg-[#004387] text-white shadow-lg flex items-center justify-center hover:bg-[#0c2d57] transition-colors"
      >
        <A11yIcon />
      </button>

      {/* Accessibility menu */}
      {a11yOpen && (
        <div className="fixed inset-0 z-[81]" onClick={() => setA11yOpen(false)}>
          <div
            className="fixed bottom-20 left-4 w-[280px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            role="dialog"
            aria-label="תפריט נגישות"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#004387] text-white">
              <span className="font-bold flex items-center gap-2"><A11yIcon size={18} /> נגישות</span>
              <button onClick={() => setA11yOpen(false)} aria-label="סגור" className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-700">גודל טקסט</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFont(-1)} aria-label="הקטן טקסט" className="w-8 h-8 rounded-md bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100">A-</button>
                  <span className="text-xs text-gray-500 w-8 text-center">{100 + a11y.font * 10}%</span>
                  <button onClick={() => setFont(1)} aria-label="הגדל טקסט" className="w-8 h-8 rounded-md bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100">A+</button>
                </div>
              </div>
              <ToggleRow label="גופן קריא" active={a11y.readable} onClick={() => setA11y((p) => ({ ...p, readable: !p.readable }))} />
              <ToggleRow label="הדגשת קישורים" active={a11y.links} onClick={() => setA11y((p) => ({ ...p, links: !p.links }))} />
              <ToggleRow label="עצירת אנימציות" active={a11y.nomotion} onClick={() => setA11y((p) => ({ ...p, nomotion: !p.nomotion }))} />
              <button onClick={resetA11y} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">איפוס הגדרות</button>
              <button onClick={() => { setA11yOpen(false); setOpenDoc('accessibility'); }} className="w-full px-3 py-2.5 rounded-lg bg-[#f7941d] text-white text-sm font-bold hover:opacity-90">הצהרת נגישות</button>
            </div>
          </div>
        </div>
      )}

      {/* Legal modal */}
      {openDoc && (
        <div className="fixed inset-0 z-[85] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpenDoc(null)}>
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#004387] text-white flex-shrink-0">
              <span className="font-bold">{DOC_TITLES[openDoc]}</span>
              <button onClick={() => setOpenDoc(null)} aria-label="סגור" className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {renderDoc(openDoc)}
            </div>
          </div>
        </div>
      )}

      {/* Cookie consent banner */}
      {!consent && (
        <div className="fixed bottom-0 inset-x-0 z-[75] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]" dir="rtl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs sm:text-sm text-gray-700 flex-grow leading-relaxed">
              אתר זה עושה שימוש בעוגיות לצורך תפעול, אבטחה ושיפור חוויית המשתמש.{' '}
              <button onClick={() => setOpenDoc('cookies')} className="text-[#004387] underline font-medium">למידע נוסף</button>
            </p>
            <button onClick={acceptCookies} className="bg-[#004387] hover:bg-[#0c2d57] text-white text-sm font-bold px-5 py-2 rounded-lg whitespace-nowrap transition-colors flex-shrink-0">
              אני מסכים/ה
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LegalAndCookies;
