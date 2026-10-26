import type { home as trHome } from '../tr/home';

export const home: typeof trHome = {
  banner: {
    text: 'Joining Koina is free. We grow imece style, by supporting each other.',
    link: { label: 'How?', route: 'imece' },
  },
  badges: [
    { icon: 'GiftIcon', label: 'Free to join' },
    { icon: 'HeartHandshakeIcon', label: 'Imece-style support' },
    { icon: 'SourceCodeIcon', label: 'Open source' },
  ],
  pillars: {
    note: 'this is not a course',
    title: 'This is a community.',
    description:
      'At Koina there are no teachers and students, just people writing code together. Nobody pays; everyone brings what they know and whatever time they can spare.',
    items: [
      {
        icon: 'GiftIcon',
        title: 'Free, always free',
        text: 'Membership, seasons, streams, workshops. Money is not the door.',
      },
      {
        icon: 'HeartHandshakeIcon',
        title: 'Imece style',
        text: 'One reviews, one writes docs, one asks questions. All of it counts.',
      },
      {
        icon: 'SourceCodeIcon',
        title: 'Everything in the open',
        text: 'Code, reviews, decisions and spending are public.',
      },
      {
        icon: 'SmileIcon',
        title: 'Fun',
        text: 'We laugh on streams and chat over Friday coffee. Learning does not have to be exhausting.',
      },
    ],
  },
  tiny: {
    note: 'start small',
    title: 'Got two minutes today? That’s enough.',
    description: 'No big commitments. Pick one of these; the rest follows.',
    items: [
      {
        icon: 'SmileIcon',
        title: 'Come to Discord, introduce yourself with one emoji',
        time: '30 sec',
        link: { label: 'Discord', href: 'https://discord.gg/koinadev' },
      },
      {
        icon: 'Video01Icon',
        title: 'Drop by the Tuesday stream, say “hi” in chat',
        time: '1 min',
        link: { label: 'Streams', route: 'streams' },
      },
      {
        icon: 'BubbleChatQuestionIcon',
        title: 'Answer the question of the week in one sentence',
        time: '2 min',
        link: { label: 'Discord', href: 'https://discord.gg/koinadev' },
      },
      {
        icon: 'ThumbsUpIcon',
        title: 'Vote for an idea you like',
        time: '2 min',
        link: { label: 'Projects', route: 'projects' },
      },
      {
        icon: 'Coffee02Icon',
        title: 'Join Friday coffee, just listen',
        time: '30 min',
        link: { label: 'How it works', route: 'howItWorks' },
      },
      {
        icon: 'GitPullRequestIcon',
        title: 'Pick an issue labeled “first-contribution”',
        time: '1 hour',
        link: { label: 'GitHub', href: 'https://github.com/koinadev' },
      },
    ],
  },
  imece: {
    note: 'an old tradition, a new repo',
    title: 'Imece: everyone brings a stone, the house rises together.',
    paragraphs: [
      'In Anatolia, when a house was to be built, the village gathered and everyone did what they could. Nobody was paid, and everyone came out ahead.',
      'At Koina mentors bring experience, participants bring effort and curiosity, idea owners bring problems, supporters bring infrastructure. The code stays open to everyone.',
    ],
    photoAlt: 'A group of people with their hands stacked together in the middle',
    link: { label: 'How imece works', route: 'imece' },
  },
  sponsors: {
    note: 'those lending a hand',
    title: 'Our supporters',
    description:
      'Our supporters carry the infrastructure that keeps Koina free. We are looking for our first Season 1 supporters.',
    empty: 'Your logo could be here',
    link: { label: 'Sponsorship', route: 'sponsor' },
  },
  explore: {
    note: 'get to know us',
    title: 'Explore Koina',
    items: [
      {
        icon: 'UserGroupIcon',
        title: 'About us',
        text: 'Who we are and what we do.',
        link: { label: 'About us', route: 'about' },
      },
      {
        icon: 'Plant02Icon',
        title: 'Why we exist',
        text: 'The problem we saw and the imece idea.',
        link: { label: 'Why we exist', route: 'why' },
      },
      {
        icon: 'Flag02Icon',
        title: 'Manifesto',
        text: 'What we believe, in ten points.',
        link: { label: 'Manifesto', route: 'manifesto' },
      },
      {
        icon: 'Rocket01Icon',
        title: 'For beginners',
        text: 'Don’t build your first real project alone.',
        link: { label: 'For beginners', route: 'learners' },
      },
      {
        icon: 'MentoringIcon',
        title: 'For mentors',
        text: 'Share what you know, leave your mark.',
        link: { label: 'For mentors', route: 'mentors' },
      },
      {
        icon: 'Idea01Icon',
        title: 'For idea owners',
        text: 'Bring your idea, we’ll build the team together.',
        link: { label: 'For idea owners', route: 'founders' },
      },
    ],
  },
  faqLink: { label: 'See all questions', route: 'faq' },
};
