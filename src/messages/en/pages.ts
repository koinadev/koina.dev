import type { InfoPage } from '../types';
import type { pages as trPages } from '../tr/pages';

// English counterparts of src/messages/tr/pages.ts. "Imece" is kept as a word: it is the
// Anatolian tradition of a village working together for free, and each page explains it.

const about: InfoPage = {
  meta: {
    title: 'About us',
    description:
      'Koina is a free software community where experienced developers and people early in their careers build open source projects together, imece style.',
  },
  hero: {
    note: 'hi, we are Koina!',
    title: 'We are a community that writes code together and has each other’s backs.',
    lead: 'Koina is not a course, an agency or a company. It is a completely free community where experienced developers, newcomers and people with ideas meet in the same repo.',
    photo: 'circle',
    photoAlt: 'A group sitting in a circle of chairs on the grass, talking',
  },
  blocks: [
    {
      type: 'prose',
      title: 'What we do',
      body: [
        'We form small teams in six-week seasons. Each team has a mentor, three to five participants and often an idea owner. The team picks a real problem, writes code in the open, every PR gets a review, and at the end of the season they show their v0.1 at Demo Day.',
        'Between seasons the community keeps going: two live streams a week, pairing hours, Friday coffee, and on Discord someone asks something every day and someone answers.',
      ],
      aside: 'all free, always free',
    },
    {
      type: 'cards',
      title: 'Four things that make us who we are',
      columns: 2,
      items: [
        {
          icon: 'GiftIcon',
          title: 'Free',
          text: 'Membership, streams, reviews, workshops: none of it costs money, and it never will. Money is not the door.',
        },
        {
          icon: 'HeartHandshakeIcon',
          title: 'Imece style',
          text: 'Everyone brings what they know and whatever time they can spare. One teaches testing, another tidies the docs.',
        },
        {
          icon: 'SourceCodeIcon',
          title: 'Open',
          text: 'Open code, open reviews, open decisions, open books. Nothing happens behind closed doors.',
        },
        {
          icon: 'SmileIcon',
          title: 'Fun',
          text: 'Learning does not have to be exhausting. We start with tiny steps and keep going while laughing together.',
        },
      ],
    },
    {
      type: 'split',
      title: 'Who is here?',
      body: [
        'Students, bootcamp grads, career changers; mentors who have been coding for a decade; founders with product ideas; designers, writers, video makers. What they share is that they like building things together.',
        'Level does not matter. Nobody is left out for “not knowing enough”; everyone has something to give.',
      ],
      photo: 'selfie',
      photoAlt: 'A smiling group taking a selfie together in a colorful office',
    },
    {
      type: 'rows',
      title: 'Koina in short',
      items: [
        { label: 'Founded', value: '2026, Türkiye' },
        { label: 'Membership', value: 'Free, always' },
        { label: 'Working language', value: 'Turkish; code and docs in English' },
        { label: 'License', value: 'Site AGPL-3.0, content CC BY-SA 4.0' },
        { label: 'Costs', value: 'Covered by sponsors and volunteer support, reported openly' },
      ],
    },
  ],
  cta: {
    title: 'Joining takes two minutes.',
    text: 'Sign up for free, come to Discord, introduce yourself with one emoji. The rest follows.',
    primary: { label: 'Sign up for free', route: 'signup' },
    secondary: { label: 'Why we exist', route: 'why' },
  },
};

const why: InfoPage = {
  meta: {
    title: 'Why we exist',
    description:
      'AI made writing code cheap, but the places where people gain real experience got smaller. Koina was founded to fill that gap with a free, imece-style community.',
  },
  hero: {
    note: 'our short story',
    title: 'AI made code cheap. Not learning together.',
    lead: 'Today a model can produce a working app in a few hours. But someone still needs to ask about the architecture, the tests, the security, and “why is it like this?”',
    photo: 'demo',
    photoAlt: 'Someone presenting in front of a large screen in a dark hall, with an audience',
  },
  blocks: [
    {
      type: 'prose',
      title: 'The problem we saw',
      body: [
        'Junior roles are fewer. The place where first real experience is gained, the moment an experienced person reads your code and says “what if we did it this way?”, keeps shrinking. Newcomers watch videos alone and build projects alone, without feedback.',
        'Meanwhile experienced developers want to share what they know, but there is no good place for it. Mentoring stays invisible, a single line on a CV.',
        'And many people with good ideas never reach a team that could build them.',
      ],
    },
    {
      type: 'quote',
      text: 'When a house was built in the village, everyone brought a stone. We wanted to do the same with code.',
      by: 'Koina founding team',
    },
    {
      type: 'prose',
      title: 'Our answer: imece',
      body: [
        'In Anatolia, imece means getting a job done together, with everyone contributing what they can, for free. A harvest is gathered, a house is built, a road is opened; nobody pays anyone, yet everyone gains.',
        'Koina brings this tradition to open source. Mentors bring time and experience, participants bring effort and curiosity, idea owners bring problems, sponsors bring infrastructure. The code stays open to everyone.',
      ],
      aside: 'so money is never the door',
    },
    {
      type: 'cards',
      title: 'What we want to change',
      columns: 3,
      items: [
        {
          icon: 'Rocket01Icon',
          title: 'First experience',
          text: 'A place where every newcomer can work on a real project and get real reviews.',
        },
        {
          icon: 'MentoringIcon',
          title: 'Visible mentoring',
          text: 'Mentors’ effort recorded, verifiable and appreciated.',
        },
        {
          icon: 'UserGroupIcon',
          title: 'Real connections',
          text: 'Relationships and job opportunities built on code written together, not business cards.',
        },
      ],
    },
  ],
  cta: {
    title: 'Have you read our manifesto?',
    text: 'We wrote down what we believe in ten short points.',
    primary: { label: 'Read the manifesto', route: 'manifesto' },
    secondary: { label: 'Sign up for free', route: 'signup' },
  },
};

const manifesto: InfoPage = {
  meta: {
    title: 'Manifesto',
    description:
      'What the Koina community believes in: free membership, imece-style solidarity, open code and learning while having fun.',
  },
  hero: {
    note: 'what we believe',
    title: 'The Koina manifesto',
    lead: 'Ten short, clear points we reread with every new member.',
  },
  blocks: [
    {
      type: 'steps',
      items: [
        {
          title: 'Money is not the door.',
          text: 'Joining Koina is free and will stay free. Access to knowledge should not depend on anyone’s wallet.',
        },
        {
          title: 'Everyone has something to give.',
          text: 'A line of code, a question, a fix, a “I got stuck too” message. Imece is made of many small contributions, not a few big ones.',
        },
        {
          title: 'Code is written in the open.',
          text: 'Reviews, decisions, mistakes: all public. Openness both teaches and protects.',
        },
        {
          title: 'Asking is fine. Not asking is a loss.',
          text: 'There are no stupid questions here. Whoever asks also helps the ten people too shy to ask.',
        },
        {
          title: 'Small steps beat big leaps.',
          text: 'Nobody expects a feature on day one. Saying hello with an emoji is joining too.',
        },
        {
          title: 'A review is a gift.',
          text: 'We critique code, not people. Every comment is written to move the other person a step forward.',
        },
        {
          title: 'AI is a tool, not an excuse.',
          text: 'We use every tool; understanding and explaining the code we send is still on us.',
        },
        {
          title: 'Effort should be visible.',
          text: 'Mentoring, docs, design, moderation: all of it is contribution and all of it gets recorded.',
        },
        {
          title: 'Fun is serious business.',
          text: 'People stay where they enjoy themselves. We laugh on streams and chat over Friday coffee.',
        },
        {
          title: 'The community belongs to everyone.',
          text: 'Koina is shaped by the people who show up every week, not its founders. Rules and roadmap are discussed in the open.',
        },
      ],
    },
  ],
  cta: {
    title: 'Do these feel close to you?',
    text: 'Then you are already one of us; you just need to sign up.',
    primary: { label: 'Sign up for free', route: 'signup' },
    secondary: { label: 'Code of conduct', route: 'conduct' },
  },
};

const imece: InfoPage = {
  meta: {
    title: 'Free and imece style',
    description:
      'Joining Koina is completely free. The community works imece style: everyone shares what they know and their time, and costs are covered openly by sponsors and volunteer support.',
  },
  hero: {
    note: 'yes, really free',
    title: 'Free to join, built on imece-style solidarity.',
    lead: 'At Koina nobody pays anybody. Everyone brings what they can and we all grow together. Here is how that works.',
    photo: 'hands',
    photoAlt: 'A group of people with their hands stacked together in the middle',
  },
  blocks: [
    {
      type: 'cards',
      title: 'Who brings what?',
      intro: 'Imece is not a trade, but everyone has a share. You decide how big yours is.',
      columns: 2,
      items: [
        {
          icon: 'MentoringIcon',
          title: 'Mentors',
          text: 'A few hours a week: a sync and PR reviews. In return, a verifiable mentoring record and great people to meet.',
        },
        {
          icon: 'Idea01Icon',
          title: 'Participants',
          text: 'Curiosity, effort and questions. In return, commit history and reviews on a real project.',
        },
        {
          icon: 'Target02Icon',
          title: 'Idea owners',
          text: 'A clear problem and a weekly product chat. In return, an open source MVP and a team they have worked with.',
        },
        {
          icon: 'HandshakeIcon',
          title: 'Supporters',
          text: 'Servers, streaming gear, event space or donations. In return, visibility and a bond with a talented community.',
        },
      ],
    },
    {
      type: 'rows',
      title: 'Everything that is free',
      items: [
        { label: 'Community membership', value: 'Free' },
        { label: 'Joining a season', value: 'Free', note: 'as participant, mentor or idea owner' },
        { label: 'Live streams and recordings', value: 'Free' },
        { label: 'Workshops and Demo Day', value: 'Free' },
        { label: 'Newsletter', value: 'Free', note: 'unsubscribe any time' },
      ],
    },
    {
      type: 'prose',
      title: 'So how are costs covered?',
      body: [
        'Money for servers, the domain, streaming tools and events comes from sponsors and voluntary individual support. No sponsor can make membership paid or close a project.',
        'At the end of every season we publish income and spending line by line. Anyone can see where every lira went.',
      ],
      aside: 'open books',
    },
    {
      type: 'list',
      title: 'Things we will never do',
      tone: 'dont',
      items: [
        'Charge for membership, certificates or a “premium” tier.',
        'Sell members’ data or share it for advertising.',
        'Turn community projects into closed source.',
        'Give sponsors a say over members.',
      ],
    },
  ],
  cta: {
    title: 'Bring your stone to the imece.',
    text: 'Signing up is free; you decide how much you take part.',
    primary: { label: 'Sign up for free', route: 'signup' },
    secondary: { label: 'Become a supporter', route: 'sponsor' },
  },
};

const howItWorks: InfoPage = {
  meta: {
    title: 'How it works',
    description:
      'Koina seasons, roles, the weekly rhythm and live streams. Free, six-week, imece-style open source projects.',
  },
  hero: {
    note: 'step by step',
    title: 'Six weeks, a small team, a real project.',
    lead: 'Koina runs in seasons. Each season a few projects are picked, teams are formed, and six weeks later every team shows its first release on a live stream. Joining is free.',
    photo: 'hackathon',
    photoAlt: 'People working on laptops at long tables in evening light',
  },
  blocks: [
    {
      type: 'steps',
      title: 'How a season flows',
      items: [
        {
          title: 'Week 0: Matching',
          text: 'Projects are picked by community vote, teams are formed, kickoff stream.',
        },
        {
          title: 'Week 1: Discovery',
          text: 'Problem statement, first architecture decisions and the repo skeleton.',
        },
        { title: 'Week 2: Foundation', text: 'CI, test setup and the first small end-to-end slice.' },
        { title: 'Weeks 3–4: Build', text: 'Features, a mid-season demo stream and lots of review.' },
        { title: 'Week 5: Polish', text: 'Docs, a security check, a release candidate.' },
        { title: 'Week 6: Demo Day', text: 'The v0.1 release, a live demo, a retro and portfolio cards.' },
      ],
    },
    {
      type: 'cards',
      title: 'Roles',
      intro: 'Whatever your role, what you give and get is written down.',
      columns: 3,
      items: [
        {
          icon: 'Plant02Icon',
          title: 'Participant',
          text: 'You are early in your journey and want to work on a real project.',
          link: { label: 'For beginners', route: 'learners' },
        },
        {
          icon: 'MentoringIcon',
          title: 'Mentor',
          text: 'You are experienced and want to share what you know.',
          link: { label: 'For mentors', route: 'mentors' },
        },
        {
          icon: 'Idea01Icon',
          title: 'Idea owner',
          text: 'You have a problem you want solved.',
          link: { label: 'For idea owners', route: 'founders' },
        },
      ],
    },
    {
      type: 'rows',
      title: 'Weekly rhythm',
      intro:
        'Season or not, the same thing happens on the same day every week. Times are Türkiye time (UTC+3).',
      items: [
        { label: 'Monday 09:00', value: 'Koina Weekly newsletter', note: 'email' },
        { label: 'Tuesday 21:00', value: 'Code Meetup: live coding', note: 'YouTube' },
        { label: 'Wednesday 20:00', value: 'Pairing hour', note: 'Discord' },
        { label: 'Thursday 21:00', value: 'Open Review: real PRs, live', note: 'YouTube' },
        { label: 'Friday 18:00', value: 'Friday coffee, camera optional', note: 'Discord' },
      ],
    },
  ],
  cta: {
    title: 'Save your spot for the first season.',
    text: 'Sign up and be the first to know when season applications open. Free.',
    primary: { label: 'Sign up for free', route: 'signup' },
    secondary: { label: 'FAQ', route: 'faq' },
  },
};

const learners: InfoPage = {
  meta: {
    title: 'For beginners',
    description:
      'Free open source experience for people new to software: work on real projects, get reviews from experienced mentors, build your portfolio together.',
  },
  hero: {
    note: 'if you are just starting',
    title: 'You do not have to build your first real project alone.',
    lead: 'Tired of watching videos and building alone? You are in the right place. At Koina you work with a team and get feedback from someone experienced on every PR. For free.',
    photo: 'table',
    photoAlt: 'Two young women laughing and talking at a wooden table in a café',
  },
  blocks: [
    {
      type: 'tiny',
      title: 'Start small',
      intro: 'Nobody expects a feature from you on day one. Here are ways to start without getting tired:',
      items: [
        { icon: 'SmileIcon', title: 'Introduce yourself on Discord with one emoji', time: '30 sec' },
        { icon: 'Video01Icon', title: 'Watch the Tuesday stream, say “hi” in chat', time: '5 min' },
        {
          icon: 'BubbleChatQuestionIcon',
          title: 'Ask something you are stuck on in #questions',
          time: '2 min',
        },
        { icon: 'ThumbsUpIcon', title: 'Read an issue, leave a 👍', time: '3 min' },
        { icon: 'GitPullRequestIcon', title: 'Pick an issue labeled “first-contribution”', time: '30 min' },
      ],
    },
    {
      type: 'cards',
      title: 'What you get',
      columns: 2,
      items: [
        {
          icon: 'GitBranchIcon',
          title: 'Real commit history',
          text: 'Not a tutorial: commits with your name on a project people actually use.',
        },
        {
          icon: 'CheckmarkCircle02Icon',
          title: 'A review on every PR',
          text: 'A mentor reads your code and explains what could be better and why.',
        },
        {
          icon: 'UserGroupIcon',
          title: 'A team',
          text: 'People you get stuck with, solve things with, and keep talking to after the season.',
        },
        {
          icon: 'Award01Icon',
          title: 'A Demo Day recording',
          text: 'A recording of you showing your project live, plus a portfolio card.',
        },
      ],
    },
    {
      type: 'list',
      title: 'How much do I need to know?',
      intro: 'This is enough:',
      tone: 'do',
      items: [
        'Being able to commit and push with Git (if not, we teach it in the first workshop).',
        'Having written a small program in any language.',
        'Having a few hours a week. You tell us how many.',
      ],
    },
  ],
  cta: {
    title: 'Go on, the first step takes 30 seconds.',
    text: 'Sign up for free, come to Discord, introduce yourself with an emoji.',
    primary: { label: 'Sign up for free', route: 'signup' },
    secondary: { label: 'Our links', route: 'links' },
  },
};

const mentors: InfoPage = {
  meta: {
    title: 'For mentors',
    description:
      'Volunteer mentoring for experienced developers: lead a team on open source projects with a few hours a week and earn a verifiable mentoring record.',
  },
  hero: {
    note: 'if you are experienced',
    title: 'Share what you know, leave your mark.',
    lead: 'The experience you have built over the years can help someone land their first job. As a Koina mentor you take a small team to Demo Day with a few hours a week. Voluntary and imece style.',
    photo: 'pairing',
    photoAlt: 'Two people working on code together at a monitor',
  },
  blocks: [
    {
      type: 'rows',
      title: 'How much time?',
      intro: 'For six weeks, roughly 2–3 hours a week:',
      items: [
        { label: '45 minutes', value: 'Weekly team sync' },
        { label: '3+ PRs', value: 'Weekly reviews' },
        { label: 'Once', value: 'Guest on a live stream', note: 'optional' },
      ],
    },
    {
      type: 'cards',
      title: 'What you get',
      columns: 2,
      items: [
        {
          icon: 'Medal01Icon',
          title: 'Verifiable mentoring',
          text: 'Your reviews and team history are public; “I mentored” finally has a link.',
        },
        {
          icon: 'Megaphone01Icon',
          title: 'Visibility',
          text: 'You are featured with your team on streams, in the newsletter and on social media.',
        },
        {
          icon: 'UserGroupIcon',
          title: 'Meet talent early',
          text: 'You really get to know the people you work with; hiring happens through code, not business cards.',
        },
        {
          icon: 'Coffee02Icon',
          title: 'Mentors’ room',
          text: 'A relaxed space to share experience with other mentors.',
        },
      ],
    },
    {
      type: 'list',
      title: 'What we ask of you',
      tone: 'do',
      items: [
        'Review patiently, without belittling anyone.',
        'Let us know ahead of a week you cannot make; a backup mentor is always ready.',
        'Follow the code of conduct and protect your team too.',
      ],
    },
  ],
  cta: {
    title: 'Join as a mentor.',
    text: 'Pick “teaching and reviewing” on the signup form and we will get to know you.',
    primary: { label: 'Sign up for free', route: 'signup' },
    secondary: { label: 'How it works', route: 'howItWorks' },
  },
};

const founders: InfoPage = {
  meta: {
    title: 'For idea owners',
    description:
      'Have a problem in mind? The Koina community turns your idea into an open source MVP in six weeks. Free and imece style.',
  },
  hero: {
    note: 'if you have an idea',
    title: 'Bring your idea, we will build the team together.',
    lead: 'Have a problem you want solved but no team to write the code? At Koina you pitch your idea, the community votes, and if it is picked a mentor and participants build an open source MVP in six weeks.',
    photo: 'cowork',
    photoAlt: 'A group working together on laptops at a long table',
  },
  blocks: [
    {
      type: 'steps',
      title: 'From idea to demo',
      items: [
        {
          title: 'Write your idea',
          text: 'Describe the problem, who it is for and what success looks like in the idea form on GitHub.',
        },
        {
          title: 'Let the community vote',
          text: 'Ideas stay open for two weeks; members leave votes and questions.',
        },
        { title: 'Pick your license', text: 'Permissive, copyleft or SaaS-protected: one of three options.' },
        { title: 'Work with the team', text: 'Have a weekly product chat and set priorities together.' },
      ],
    },
    {
      type: 'cards',
      title: 'Your license options',
      columns: 3,
      items: [
        {
          icon: 'GiftIcon',
          title: 'Permissive',
          text: 'MIT or Apache-2.0. Anyone can use it for any purpose.',
        },
        {
          icon: 'HeartHandshakeIcon',
          title: 'Copyleft',
          text: 'AGPL-3.0. Anyone offering it as SaaS must publish their changes.',
        },
        {
          icon: 'Shield01Icon',
          title: 'SaaS-protected',
          text: 'FSL-1.1. No competing SaaS for two years, then it becomes Apache. Source-available, not open source.',
        },
      ],
    },
  ],
  cta: {
    title: 'Ready to pitch your idea?',
    text: 'Sign up first; the idea form link is in the welcome email.',
    primary: { label: 'Sign up for free', route: 'signup' },
    secondary: { label: 'License policy', route: 'licensing' },
  },
};

const projects: InfoPage = {
  meta: {
    title: 'Projects',
    description:
      'Open source projects of the Koina community and ideas being voted on for Season 1. Anyone can contribute, joining is free.',
  },
  hero: {
    note: 'voting is on',
    title: 'What we are building together',
    lead: 'Every project lives openly in Koina’s GitHub organization. Below are some of the ideas the community is voting on for Season 1; you can vote or add your own.',
    photo: 'hackathon',
    photoAlt: 'People working on laptops at long tables in evening light',
  },
  blocks: [
    {
      type: 'cards',
      title: 'Season 1 candidates',
      columns: 3,
      items: [
        {
          icon: 'Search01Icon',
          title: 'Job post parser',
          text: 'A service and open dataset that extracts skills, salary ranges and remote info from Turkish job posts. Python, NLP.',
        },
        {
          icon: 'GitPullRequestIcon',
          title: 'PR review assistant',
          text: 'A GitHub Action that pre-reviews a PR against team rules. TypeScript, LLM.',
        },
        {
          icon: 'Calendar03Icon',
          title: 'Event calendar',
          text: 'An open directory of software events in Türkiye with ICS and RSS feeds. Astro.',
        },
      ],
    },
    {
      type: 'list',
      title: 'Every Koina project has',
      tone: 'do',
      items: [
        'Open code that lives in the Koina organization.',
        'A clear license label in the README: open source or source-available.',
        'Beginner-friendly issues labeled “first-contribution”.',
        'At least one review on every PR.',
      ],
    },
  ],
  cta: {
    title: 'Make your first contribution.',
    text: 'Browse issues labeled “first-contribution” on GitHub or add your own idea.',
    primary: { label: 'See on GitHub', href: 'https://github.com/koinadev' },
    secondary: { label: 'For idea owners', route: 'founders' },
  },
};

const streams: InfoPage = {
  meta: {
    title: 'Live streams',
    description:
      'Koina live streams: Tuesday Code Meetup, Thursday Open Review, monthly workshops and Demo Day. Watch for free, join the chat.',
  },
  hero: {
    note: 'Tuesdays and Thursdays 21:00',
    title: 'Watch, ask, learn together.',
    lead: 'At Koina the work happens in the open. On streams you see real projects, real PRs and real bugs. You do not even need to sign up to watch.',
    photo: 'stream',
    photoAlt: 'Two people with headphones recording at microphones',
  },
  blocks: [
    {
      type: 'cards',
      title: 'Stream formats',
      columns: 2,
      items: [
        {
          icon: 'SourceCodeIcon',
          title: 'Code Meetup (Tuesday, 90 min)',
          text: 'A team closes an issue live with their mentor. Questions from chat are part of the show.',
        },
        {
          icon: 'GitPullRequestIcon',
          title: 'Open Review (Thursday, 60 min)',
          text: 'A mentor reviews real PRs from community projects, live.',
        },
        {
          icon: 'TeacherIcon',
          title: 'Koina Workshop (monthly, 120 min)',
          text: 'A themed session: writing tests, safe code with AI, CI/CD.',
        },
        {
          icon: 'Mic01Icon',
          title: 'Mentor AMA (monthly, 45 min)',
          text: 'Open Q&A with someone from the industry on careers and experience.',
        },
        {
          icon: 'PartyIcon',
          title: 'Demo Day (end of season)',
          text: 'Every team shows its v0.1 live. Applause welcome.',
        },
        {
          icon: 'Coffee02Icon',
          title: 'Friday Coffee (Discord)',
          text: 'Not a stream, a chat. Camera off is fine, just listening is fine.',
        },
      ],
    },
  ],
  cta: {
    title: 'Get notified when we go live.',
    text: 'Subscribe on YouTube or turn on the #announcements channel on Discord.',
    primary: { label: 'YouTube channel', href: 'https://www.youtube.com/@koinadev' },
    secondary: { label: 'All links', route: 'links' },
  },
};

const sponsor: InfoPage = {
  meta: {
    title: 'Sponsorship',
    description:
      'Support Koina: help cover server, streaming and event costs of a free, imece-style software community. Our supporters and ways to sponsor.',
  },
  hero: {
    note: 'a hand for the imece',
    title: 'The people and companies who keep Koina free.',
    lead: 'Membership is free for everyone, but servers, streaming tools and events have to be covered somehow. Our supporters carry the infrastructure of this imece.',
    photo: 'talk',
    photoAlt: 'Someone giving a talk in a brick-walled room to a crowd',
  },
  blocks: [
    {
      type: 'sponsors',
      title: 'Our supporters',
      intro: 'We are looking for our Season 1 supporters.',
      items: [],
      empty:
        'This space is waiting for our first supporters. Your logo here, and membership stays free for everyone.',
      emptyAction: { label: 'Be the first supporter', route: 'contact' },
    },
    {
      type: 'tiers',
      title: 'Ways to support',
      intro: 'Packages are flexible; let us find what fits you. No package ever makes membership paid.',
      items: [
        {
          name: 'Friend',
          who: 'Individuals and small teams',
          perks: ['Thanks on the site and in the newsletter', 'Supporter badge on Discord'],
        },
        {
          name: 'Season supporter',
          who: 'Companies',
          featured: true,
          perks: [
            'Logo on the site and streams',
            'Thank-you speech at Demo Day',
            'A volunteer mentoring path for your engineers',
            'A place in the season report',
          ],
        },
        {
          name: 'In-kind support',
          who: 'Infrastructure and venues',
          perks: [
            'Servers, tool licenses, event space',
            'Visibility on the relevant page',
            'Joint announcements at events',
          ],
        },
      ],
    },
    {
      type: 'list',
      title: 'What we ask of supporters',
      tone: 'do',
      items: [
        'Do not interfere with the license or direction of community projects.',
        'Do not ask for members’ contact details; hiring happens openly and with members’ consent.',
        'Accept our code of conduct.',
      ],
    },
    {
      type: 'prose',
      title: 'Transparency',
      body: [
        'At the end of every season we publish the support received and the spending, line by line. Both supporters and members can see where the money went.',
      ],
    },
  ],
  cta: {
    title: 'Let’s talk.',
    text: 'Write to us about sponsorship; we reply within two business days.',
    primary: { label: 'Write to us', route: 'contact' },
    secondary: { label: 'How imece works', route: 'imece' },
  },
};

const faq: InfoPage = {
  meta: {
    title: 'FAQ',
    description:
      'Common questions about Koina: is it paid, who can join, how much time it takes, what license the projects use.',
  },
  hero: {
    note: 'good questions',
    title: 'Frequently asked questions',
    lead: 'If you cannot find your answer, ask in the #questions channel on Discord or send us an email.',
  },
  blocks: [
    {
      type: 'faq',
      title: 'General',
      items: [
        {
          question: 'Does Koina cost anything?',
          answer:
            'No. Membership, seasons, streams and workshops are completely free and will stay that way. Koina works imece style: everyone shares what they know and their time, and costs are covered openly by sponsors and volunteer support.',
        },
        {
          question: 'What does imece style mean?',
          answer:
            'Getting something done together, with everyone contributing what they can, for free. At Koina mentors bring experience, participants effort, idea owners problems, supporters infrastructure; the code stays open to everyone.',
        },
        {
          question: 'Who can join?',
          answer:
            'Everyone. Students, career changers, experienced developers, designers, writers, people with product ideas. No level requirement.',
        },
        {
          question: 'What happens after I sign up?',
          answer:
            'You get a welcome email and a Discord invite. Your first task is introducing yourself with an emoji. When season applications open, you hear first.',
        },
        {
          question: 'What if I just want to watch?',
          answer:
            'Great! Watching streams, hanging out on Discord and reading the newsletter are all ways to take part. Nobody pushes you to code.',
        },
      ],
    },
    {
      type: 'faq',
      title: 'Seasons and roles',
      items: [
        {
          question: 'How much do I need to know to be a participant?',
          answer:
            'If you can use Git and write a small program in some language, that is enough. Projects have issues for every level, and there is a pairing hour on Wednesday evenings.',
        },
        {
          question: 'How much time should I set aside?',
          answer:
            '5–8 hours a week is suggested for participants, 2–3 for mentors. Outside seasons, how much you take part is entirely up to you.',
        },
        {
          question: 'Can I use AI tools?',
          answer: 'Yes. One rule: mention it in the PR description and be able to explain the code you send.',
        },
        {
          question: 'Can I join from outside Türkiye?',
          answer:
            'Yes. The working language is Turkish; code and docs are in English. Syncs are in the evening, Türkiye time.',
        },
      ],
    },
    {
      type: 'faq',
      title: 'Projects and licensing',
      items: [
        {
          question: 'Who owns the projects?',
          answer:
            'The code stays public and the repo lives in the Koina organization; the idea owner cannot close it. Your commit history and demo are always in your portfolio.',
        },
        {
          question: 'Can someone copy a project and sell it as SaaS?',
          answer:
            'It depends on the license. With MIT/Apache, yes; with AGPL, only by publishing their changes; with FSL, not for two years. Details on the license policy page.',
        },
      ],
    },
  ],
  cta: {
    title: 'Still have a question?',
    text: 'Write to us or come to Discord; someone will answer.',
    primary: { label: 'Write to us', route: 'contact' },
    secondary: { label: 'Our links', route: 'links' },
  },
};

const conduct: InfoPage = {
  meta: {
    title: 'Code of conduct',
    description:
      'The Koina community code of conduct: respect, openness and a safe space for everyone. How to report and how we enforce.',
  },
  hero: {
    note: 'safe for everyone',
    title: 'Code of conduct',
    lead: 'Koina should be a place where everyone can ask questions, make mistakes and learn comfortably. These rules apply everywhere: Discord, GitHub, streams and events.',
  },
  blocks: [
    {
      type: 'list',
      title: 'What we expect',
      tone: 'do',
      items: [
        'Critique the code, not the person; be constructive and kind.',
        'Answer questions patiently. Everyone started somewhere.',
        'Respect different views, experiences and backgrounds.',
        'Make effort visible: thank those who help, do not claim others’ work.',
        'When you make a mistake, apologize and fix it.',
      ],
    },
    {
      type: 'list',
      title: 'What we do not accept',
      tone: 'dont',
      items: [
        'Harassment, insults, discriminatory or sexual language.',
        'Sharing someone’s personal information without consent.',
        'Mocking newcomers, the “you don’t know this?” attitude.',
        'Persistent unwanted contact, spam or advertising.',
      ],
    },
    {
      type: 'steps',
      title: 'If something happens',
      items: [
        {
          title: 'Report',
          text: 'Message the moderators on Discord or write to conduct@koina.dev. Reports are kept confidential.',
        },
        {
          title: 'Review',
          text: 'The moderation team replies within 48 hours and hears both sides when needed.',
        },
        {
          title: 'Outcome',
          text: 'A proportionate decision is made, from a warning to a permanent ban, and the reporter is informed.',
        },
      ],
    },
  ],
  cta: {
    title: 'Short rules, clear intent.',
    text: 'If we are good to each other, the rest is easy.',
    primary: { label: 'Sign up for free', route: 'signup' },
    secondary: { label: 'Manifesto', route: 'manifesto' },
  },
};

const licensing: InfoPage = {
  meta: {
    title: 'License policy',
    description:
      'License options for Koina projects: MIT/Apache (permissive), AGPL (copyleft) and FSL (SaaS-protected, source-available). The difference between open source and source-available.',
  },
  hero: {
    note: 'open, but fair',
    title: 'Every project is open, every license clearly labeled.',
    lead: 'The code of every Koina project is public. Idea owners pick one of three license groups; some of them prevent the code from being copied and sold as SaaS.',
  },
  blocks: [
    {
      type: 'prose',
      title: 'Open source vs. source-available',
      body: [
        'The open source definition forbids restricting how software is used, so no open source license can say “you may not sell this as SaaS”. Licenses like the AGPL can at most say “if you offer it as SaaS, publish your changes too”.',
        'Licenses that actually forbid SaaS use (such as FSL or BUSL) are source-available licenses. Koina accepts both, but always labels which one a project uses.',
      ],
    },
    {
      type: 'rows',
      title: 'Three options',
      items: [
        {
          label: 'Permissive',
          value: 'MIT or Apache-2.0',
          note: 'open source; anyone can use it for any purpose',
        },
        {
          label: 'Copyleft',
          value: 'AGPL-3.0',
          note: 'open source; SaaS providers must publish their changes',
        },
        {
          label: 'SaaS-protected',
          value: 'FSL-1.1',
          note: 'source-available; no competing SaaS for two years, then Apache-2.0',
        },
      ],
    },
    {
      type: 'list',
      title: 'Whatever the license',
      tone: 'do',
      items: [
        'Commit history is permanent and the repo is public.',
        'Participants can show their work in their portfolio.',
        'The repo lives in the Koina organization; the idea owner cannot close it later.',
        'A license cannot be made more restrictive once the season starts.',
      ],
    },
    {
      type: 'prose',
      title: 'Koina’s own code',
      body: [
        'This site’s code is licensed AGPL-3.0 and its content CC BY-SA 4.0. The Koina name and logo are protected as trademarks. The source is on GitHub.',
      ],
    },
  ],
  cta: {
    title: 'Choosing a license for your idea?',
    text: 'Compare the options on the idea owners page.',
    primary: { label: 'For idea owners', route: 'founders' },
    secondary: { label: 'Source code', href: 'https://github.com/koinadev/koina.dev' },
  },
};

export const pages: typeof trPages = {
  about,
  why,
  manifesto,
  imece,
  howItWorks,
  learners,
  mentors,
  founders,
  projects,
  streams,
  sponsor,
  faq,
  conduct,
  licensing,
};
