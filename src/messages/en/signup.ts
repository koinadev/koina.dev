import type { signup as trSignup } from '../tr/signup';

export const signup: typeof trSignup = {
  meta: {
    title: 'Sign up for free',
    description:
      'Sign up for Koina for free: two minutes, a few clicks. Join an imece-style open source community and hear about the first season.',
  },
  note: 'two minutes, promise!',
  title: 'Join us',
  lead: 'Signing up is free and short. No long forms, CVs or tests. You decide how much you take part.',
  form: {
    name: 'Your name or nickname',
    email: 'Email',
    github: 'Your GitHub username',
    githubHint: 'optional',
    interestsLabel: 'What would you most like to do here?',
    interestsHint: 'Pick as many as you like, you can change later.',
    interests: [
      { value: 'izlemek', icon: 'Video01Icon', label: 'Hang out and watch' },
      { value: 'kod', icon: 'SourceCodeIcon', label: 'Write code' },
      { value: 'ogretmek', icon: 'MentoringIcon', label: 'Teach and review' },
      { value: 'fikir', icon: 'Idea01Icon', label: 'Pitch my idea' },
      { value: 'tasarim', icon: 'PaintBrush01Icon', label: 'Design, writing, video' },
      { value: 'destek', icon: 'HandshakeIcon', label: 'Become a supporter' },
    ],
    levelLabel: 'Where are you with software?',
    levels: ['Just starting', 'Some experience', 'Been at it for years', 'Not a developer'],
    season: 'Let me know when Season 1 applications open',
    consent: 'I agree to receive emails about Koina. I can unsubscribe any time.',
    privacy: 'Privacy',
    submit: 'Join us',
    sending: 'Sending...',
    success: 'Welcome! A Discord invite will land in your inbox in a few minutes.',
    error: 'Signup could not be sent. Check your connection and try again, or write to merhaba@koina.dev.',
  },
  next: {
    title: 'What happens next?',
    items: [
      { icon: 'Mail01Icon', title: 'Welcome email', text: 'A Discord invite and a short guide.' },
      {
        icon: 'SmileIcon',
        title: 'A tiny first task',
        text: 'Introduce yourself in #introductions with an emoji. That’s it.',
      },
      {
        icon: 'Calendar03Icon',
        title: 'Your first stream',
        text: 'Code Meetup on Tuesday at 21:00 (UTC+3). Just watch if you like.',
      },
      { icon: 'PartyIcon', title: 'Season news', text: 'You hear first when Season 1 applications open.' },
    ],
  },
  free: 'Koina is completely free and works imece style. Your data is never sold or shared for advertising.',
};
