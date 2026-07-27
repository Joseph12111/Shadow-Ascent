import { AlertTriangle, Database, FileCheck, LockKeyhole, Mail, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import { useAuth } from '../hooks/useAuth.js';

const POLICY_META = [
  { label: 'Last Updated', value: 'June 2025' },
  { label: 'Effective Date', value: 'June 2025' },
  { label: 'Website', value: 'shadowascent.app' },
  { label: 'Contact', value: 'privacy@shadowascent.app' },
];

const POLICY_SECTIONS = [
  {
    title: '1. Introduction',
    icon: ShieldCheck,
    paragraphs: [
      'Welcome to Shadow Ascent. Shadow Ascent is a gamified fitness and wellness application available at shadowascent.app that helps users improve their physical and mental health through RPG-inspired mechanics including workout tracking, nutrition planning, habit building, and daily quests.',
      'We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, why we collect it, how we use it, how we protect it, and your rights regarding your data.',
      'By creating an account or using Shadow Ascent, you agree to the terms described in this Privacy Policy. If you do not agree, please do not use our application.',
      'For any questions contact us at privacy@shadowascent.app. We respond to all privacy requests within 30 days.',
    ],
  },
  {
    title: '2. Who We Are',
    icon: Sparkles,
    paragraphs: ['Shadow Ascent is an independently operated fitness RPG application.'],
    facts: [
      ['Application Name', 'Shadow Ascent'],
      ['Website', 'shadowascent.app'],
      ['Privacy Contact', 'privacy@shadowascent.app'],
    ],
  },
  {
    title: '3. Information We Collect',
    icon: Database,
    paragraphs: [
      'We collect information in three ways: information you provide directly, information generated through your use of the app, and information processed through third-party services.',
    ],
    groups: [
      {
        heading: '3.1 Information You Provide Directly',
        body: 'Account information includes username, email address, encrypted password, and character class selection. Optional health and fitness information may include age, height, weight, fitness goals, activity level, dietary preferences, allergies, health conditions, sleep, water intake, meal logs, and workout exercises, sets, reps, and weights.',
        bullets: ['Bad habits you choose to track', 'Daily tasks and goals you create', 'Personal notes and motivation'],
      },
      {
        heading: '3.2 Information Generated Through App Use',
        body: 'Game progress data includes XP, character level, gold, rank progression, RP, character stats, achievements, daily quests, habit streaks, Brain Quest answers and scores, and shop items purchased or equipped.',
        bullets: ['Features accessed within the app', 'AI tool usage counts', 'Session dates and timestamps', 'Workout session durations and history'],
      },
      {
        heading: '3.3 Information Processed Through AI Features',
        body: 'When you use AI-powered features, relevant fitness, nutrition, health, preference, and image data may be sent to OpenAI for processing. Meal images are processed in real time and are not permanently stored on our servers.',
      },
      {
        heading: '3.4 Information We Do Not Collect',
        bullets: [
          'Your real name unless you choose it as your username',
          'Payment card details, which are handled entirely by Stripe',
          'GPS location or precise location data',
          'Phone contacts or social connections',
          'Microphone access',
          'Camera access without your explicit action',
          'Browsing history outside our app',
          'Data from other apps on your device',
        ],
      },
    ],
  },
  {
    title: '4. How We Use Your Information',
    icon: FileCheck,
    paragraphs: ['We use your information only for the purposes needed to operate, improve, and protect Shadow Ascent.'],
    groups: [
      {
        heading: '4.1 To Provide the Service',
        bullets: ['Create and manage your account', 'Save game progress and fitness data', 'Power daily quest and habit tracking systems', 'Enable shop, inventory, and equipment systems', 'Calculate character level, rank, and stats'],
      },
      {
        heading: '4.2 To Power AI Features',
        bullets: ['Generate personalised workout plans', 'Generate personalised meal plans', 'Analyse food images for nutrition information', 'Deliver Brain Quest questions'],
      },
      {
        heading: '4.3 To Improve the Application',
        bullets: ['Understand which features are most valuable', 'Identify and fix technical problems', 'Improve AI recommendation quality over time'],
      },
      {
        heading: '4.4 To Manage Your Subscription',
        bullets: ['Process premium subscription payments via Stripe', 'Track free tier usage limits', 'Notify you about subscription changes'],
      },
      {
        heading: '4.5 To Communicate With You',
        bullets: ['Send important service updates', 'Respond to support and privacy requests', 'Notify you of significant policy changes'],
      },
      {
        heading: 'What We Will Never Do With Your Data',
        bullets: ['Sell your personal data', 'Use your data for advertising on behalf of other companies', 'Share health data with insurance companies', 'Share your data with employers', 'Build advertising profiles about you', 'Use your data to train AI models without consent'],
      },
    ],
  },
  {
    title: '5. How We Store and Protect Your Data',
    icon: LockKeyhole,
    groups: [
      {
        heading: '5.1 Database Security',
        body: 'All user data is stored using Supabase, a secure PostgreSQL cloud database. Every database table uses Row Level Security so users can only access their own data. Communication with the database uses HTTPS/TLS encryption, and passwords are hashed by Supabase Auth.',
      },
      {
        heading: '5.2 Local Device Storage',
        body: 'Shadow Ascent stores a cache of your data in browser localStorage for performance and offline functionality. This cache stays on your device, mirrors secure database data, and is cleared when you log out.',
      },
      {
        heading: '5.3 Security Practices',
        bullets: ['Database admin keys are never used on the client side', 'Admin database keys are never exposed in frontend code', 'All API calls require valid authenticated user sessions', 'Database access policies are reviewed regularly'],
      },
      {
        heading: '5.4 Data Breach Notification',
        body: 'In the unlikely event of a data breach affecting your personal information, we will notify you via your registered email address within 72 hours of becoming aware of the breach.',
      },
    ],
  },
  {
    title: '6. Third-Party Services',
    icon: Scale,
    paragraphs: ['We use third-party services to operate Shadow Ascent. Each service has its own privacy policy.'],
    groups: [
      {
        heading: '6.1 Supabase - Database and Authentication',
        body: 'Supabase securely stores account data, app progress data, and manages authentication. Privacy policy: supabase.com/privacy.',
      },
      {
        heading: '6.2 OpenAI - AI Features',
        body: 'OpenAI processes workout plan, meal plan, and meal image requests when you use AI features. Data sent may include fitness goals, body stats, dietary preferences, health conditions, allergies, and food images. Privacy policy: openai.com/privacy.',
      },
      {
        heading: '6.3 Stripe - Payment Processing',
        body: 'Stripe processes premium subscription payments. We never see, store, or access your card number, CVV, or full payment details. Privacy policy: stripe.com/privacy.',
      },
      {
        heading: 'What We Do Not Use',
        bullets: ['Google Analytics or tracking tools', 'Facebook Pixel or social media tracking', 'Advertising networks', 'Heat mapping or session recording tools'],
      },
    ],
  },
  {
    title: '7. AI Features and Your Data',
    icon: Sparkles,
    groups: [
      {
        heading: '7.1 Workout Generator',
        body: 'We send equipment type, fitness goals, fitness level, workout splits, days per week, session duration, and injury limitations to OpenAI. We do not send your name, email, or account credentials.',
      },
      {
        heading: '7.2 Meal Planner',
        body: 'We send age, weight, height, sex, diet goal, activity level, dietary preferences, health conditions, food allergies, cuisine preferences, and budget level to OpenAI. We do not send your name, email, or account credentials.',
      },
      {
        heading: '7.3 Meal Scanner',
        body: 'We send the food image you photograph or upload. Images are processed in real time for nutrition analysis and are not permanently stored on our servers.',
      },
    ],
    callout: 'Medical disclaimer: AI-generated workouts, meal plans, and nutrition analyses are for general wellness only and do not constitute medical, nutritional, or professional fitness advice. Consult a qualified healthcare professional before significant diet or exercise changes, especially if you have existing health conditions.',
  },
  {
    title: '8. Health and Fitness Data',
    icon: ShieldCheck,
    paragraphs: ['We treat health and fitness data with the highest level of care and sensitivity.'],
    groups: [
      {
        heading: 'How We Protect Health Data',
        bullets: ['Health condition information is stored in our secure database', 'Row Level Security means only you can access your health data', 'Health data is never shared with third parties except OpenAI when you explicitly use AI features', 'Health data is never shared with insurers, employers, medical providers, or advertisers'],
      },
      {
        heading: 'How We Use Health Data',
        bullets: ['Personalise AI-generated workout plans', 'Personalise AI-generated meal plans', 'Tailor daily quest and stat recommendations', 'Calculate appropriate stat point awards'],
      },
    ],
  },
  {
    title: '9. Payment and Billing',
    icon: LockKeyhole,
    groups: [
      {
        heading: '9.1 Free Tier',
        body: 'No payment information is ever collected for free tier accounts.',
        bullets: ['2 free Workout Generator uses', '2 free Meal Planner uses', '1 free Meal Scanner use', 'Full access to all non-AI features permanently'],
      },
      {
        heading: '9.2 Premium Subscription',
        body: 'Premium subscriptions are processed entirely through Stripe. You enter payment details directly on Stripe secure payment forms. We receive only a confirmation token and store subscription status, activation date, renewal date, and Stripe customer reference ID.',
      },
      {
        heading: 'Cancellation',
        body: 'You may cancel your subscription at any time. Access continues until the end of the current billing period, and cancellation takes effect at the next renewal date.',
      },
    ],
  },
  {
    title: '10. Your Rights',
    icon: Scale,
    paragraphs: ['Depending on your location, you may have the following rights regarding your personal data.'],
    groups: [
      { heading: '10.1 Right to Access', body: 'Request a copy of all personal data we hold about you. Email privacy@shadowascent.app with subject "Data Access Request".' },
      { heading: '10.2 Right to Correction', body: 'If your data is inaccurate, you can update it in the app settings or contact us.' },
      { heading: '10.3 Right to Deletion', body: 'You can request deletion of your account and associated data. Data is permanently deleted from our database within 30 days of your deletion request. Email privacy@shadowascent.app with subject "Delete My Data".' },
      { heading: '10.4 Right to Data Portability', body: 'Request an export of your personal data in JSON format. Email privacy@shadowascent.app with subject "Data Export Request".' },
      { heading: '10.5 Right to Object', body: 'You may object to processing of your personal data in certain circumstances by contacting us.' },
      { heading: '10.6 Right to Restrict Processing', body: 'You may request that we limit how we process your data in certain circumstances.' },
      { heading: '10.7 Response Time', body: 'We respond to all valid rights requests within 30 days. We may need to verify your identity before processing certain requests.' },
      { heading: '10.8 Complaints', body: 'If you are unhappy with how we handled your data, you may lodge a complaint with your local data protection authority.' },
    ],
  },
  {
    title: '11. Data Retention',
    icon: Database,
    retention: [
      ['Active account data', 'For as long as your account exists'],
      ['Workout and quest history', 'Indefinitely while account is active'],
      ['Brain Quest question history', 'Reset every 30 days'],
      ['AI-generated plans', 'Until you delete them or your account'],
      ['RP and rank history', 'For the life of your account'],
      ['After account deletion', 'All data deleted within 30 days'],
      ['Database backups', 'Overwritten within 7 days'],
    ],
  },
  {
    title: "12. Children's Privacy",
    icon: AlertTriangle,
    paragraphs: [
      'Shadow Ascent is not intended for children under the age of 13, or under 16 in certain jurisdictions including the European Union.',
      'We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child created an account without consent, contact privacy@shadowascent.app and we will delete the account promptly.',
      'Users aged 13 to 18 should review this Privacy Policy with a parent or guardian before creating an account.',
    ],
  },
  {
    title: '13. Cookies and Local Storage',
    icon: Database,
    groups: [
      {
        heading: 'What We Use',
        bullets: ['Session cookies keep you logged in and are required for the app to function', 'localStorage cache stores progress locally for speed and is cleared on logout'],
      },
      {
        heading: 'What We Do Not Use',
        bullets: ['Advertising cookies', 'Tracking cookies', 'Analytics cookies', 'Social media tracking pixels', 'Third-party marketing cookies'],
      },
      {
        heading: 'Clearing Your Data',
        bullets: ['Log out of your account to clear localStorage', 'Clear browser cookies and site data in browser settings', 'Delete your account to clear server-side data'],
      },
    ],
  },
  {
    title: '14. International Data Transfers',
    icon: Scale,
    paragraphs: [
      'Shadow Ascent uses Supabase and OpenAI, which operate globally with servers in multiple regions. By using Shadow Ascent, you consent to your data being transferred to and processed in countries outside your own, which may have different data protection laws.',
      'We use appropriate safeguards including encrypted connections and contractual data protection agreements with service providers.',
    ],
  },
  {
    title: '15. Changes to This Privacy Policy',
    icon: FileCheck,
    paragraphs: ['We may update this Privacy Policy to reflect changes in our practices, technology, or legal requirements.'],
    bullets: ['The Last Updated date will be revised', 'Significant changes will be notified by email to your registered address', 'Minor changes will be available at shadowascent.app/privacy-policy', 'Continued use after the effective date constitutes acceptance of the updated policy'],
  },
  {
    title: '16. Contact Us',
    icon: Mail,
    paragraphs: ['For privacy-related questions, requests, or concerns, contact privacy@shadowascent.app. We aim to respond to all privacy requests within 30 days. For urgent matters include "URGENT" in your subject line.'],
    bullets: ['Data access requests', 'Data deletion requests', 'Data export requests', 'Questions about this policy', 'Concerns about how your data is handled', 'Reports of potential security issues'],
    facts: [
      ['Email', 'privacy@shadowascent.app'],
      ['Website', 'shadowascent.app'],
      ['Response Time', 'Within 30 days'],
    ],
  },
];

export default function PrivacyPolicy() {
  const { loading, error } = useAuth();
  const empty = !POLICY_SECTIONS?.length;

  return (
    <div className="w-full space-y-6">
      <Card
        empty={empty}
        emptyText="Privacy policy is unavailable."
        error={error}
        loading={loading}
        subtitle="Last Updated: June 2025. Effective Date: June 2025."
        title="Shadow Ascent Privacy Policy"
        icon={ShieldCheck}
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {POLICY_META?.map((item) => (
        <div className="rounded-2xl border border-shadow-gold/20 bg-shadow-gold/10 p-3 sm:p-4" key={item?.label}>
                <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">{item?.label}</p>
                <p className="mt-2 text-sm font-semibold text-shadow-text">{item?.value}</p>
              </div>
            ))}
          </div>

          {POLICY_SECTIONS.map((section) => (
            <PolicySection section={section} key={section?.title} />
          ))}

          <footer className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-5 text-center">
            <p className="font-heading text-lg font-bold text-shadow-gold">2025 Shadow Ascent - shadowascent.app</p>
            <p className="mt-2 text-sm text-shadow-textSecondary">All rights reserved. privacy@shadowascent.app</p>
          </footer>
        </div>
      </Card>
    </div>
  );
}

function PolicySection({ section }) {
  const Icon = section?.icon || FileCheck;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-shadow-purple/30 bg-shadow-purple/10">
          <Icon className="h-5 w-5 text-shadow-purpleLight" aria-hidden="true" />
        </span>
        <h2 className="min-w-0 flex-1 font-heading text-xl font-bold leading-snug text-shadow-gold">{section?.title}</h2>
      </header>

      <div className="min-w-0">
        {section?.paragraphs?.map((paragraph) => (
          <p className="mt-3 text-sm leading-6 text-shadow-textSecondary first:mt-0 sm:leading-7" key={paragraph}>
            {paragraph}
          </p>
        ))}

        {section?.facts?.length ? <FactList facts={section?.facts} /> : null}
        {section?.groups?.length ? <GroupList groups={section?.groups} /> : null}
        {section?.bullets?.length ? <BulletList items={section?.bullets} /> : null}
        {section?.retention?.length ? <RetentionTable rows={section?.retention} /> : null}

        {section?.callout ? (
          <div className="mt-4 rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-4 text-sm leading-6 text-shadow-textSecondary sm:leading-7">
            {section?.callout}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function GroupList({ groups }) {
  return (
    <div className="mt-4 space-y-4">
      {groups?.map((group) => (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4" key={group?.heading}>
          <h3 className="font-heading text-base font-bold text-shadow-gold">{group?.heading}</h3>
          {group?.body ? <p className="mt-2 text-sm leading-6 text-shadow-textSecondary sm:leading-7">{group?.body}</p> : null}
          {group?.bullets?.length ? <BulletList items={group?.bullets} compact /> : null}
        </div>
      ))}
    </div>
  );
}

function BulletList({ items, compact = false }) {
  return (
    <ul className={`space-y-2 ${compact ? 'mt-3' : 'mt-4'}`}>
      {items?.map((item) => (
        <li className="flex gap-2 text-sm leading-6 text-shadow-textSecondary" key={item}>
          <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-shadow-green" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FactList({ facts }) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-3">
      {facts?.map(([label, value]) => (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4" key={label}>
          <dt className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">{label}</dt>
          <dd className="mt-2 text-sm font-semibold text-shadow-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RetentionTable({ rows }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">
          <tr className="border-b border-white/10">
            <th className="px-4 py-3">Data Type</th>
            <th className="px-4 py-3">Retention Period</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map(([type, period]) => (
            <tr className="border-b border-white/10 last:border-b-0" key={type}>
              <td className="px-4 py-3 font-semibold text-shadow-text">{type}</td>
              <td className="px-4 py-3 text-shadow-textSecondary">{period}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
