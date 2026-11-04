import type { signup as trSignup } from '../tr/signup';

export const signup: typeof trSignup = {
  meta: {
    title: 'Sign up',
    description:
      'Create your Koina account: type your email, enter the code. No password, no long form. Join an imece-style community that supports open source.',
  },
  note: 'one minute, promise!',
  title: 'Join us',
  lead: 'Joining means creating a Koina account: type your email and enter the 6-digit code we send. No password, CV or test. Every new account brings the next feature one step closer.',
  next: {
    title: 'What happens next?',
    items: [
      { icon: 'Mail01Icon', title: 'Sign in with a code', text: 'A 6-digit code lands in your inbox; your account opens on first sign-in.' },
      { icon: 'SmileIcon', title: 'Your profile', text: 'Add your name, interests and GitHub. Or leave it empty.' },
      {
        icon: 'Calendar03Icon',
        title: 'Your first stream',
        text: 'Code Meetup on Saturday at 20:00 (UTC+3). Just watch if you like.',
      },
      { icon: 'PartyIcon', title: 'New steps', text: 'Tick the news box when signing in and we email you when a new step opens.' },
    ],
  },
  account: 'Create your Koina account',
  free: 'You don’t pay to join the community; our main goal is supporting open source. Your data is never sold or shared for advertising.',
};
