/**
 * The real app, rendered in a simulated browser, talking to the real backend.
 * These check that what is on screen comes from the server, and that clicking a button changes what the server holds.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { api, setToken } from '../api/client';

const open = (path: string) => window.history.pushState({}, '', path);

async function token(email: string) {
  const r = await api.post<{token: string;}>('/api/auth/login', { email, password: 'demo1234' });
  return r.token;
}

/** Start the app already signed in, the way a returning visitor with a saved session would. */
async function openAs(email: string, path: string) {
  setToken(await token(email));
  open(path);
  render(<App />);
}

const statusOf = async (id: string) => (await api.get<{credential: {status: string;};}>(`/api/verify/${id}`)).credential.status;

describe('signing in', () => {
  it('shows an error from the server for a wrong password', async () => {
    open('/login');
    render(<App />);
    await userEvent.type(await screen.findByLabelText('Email'), 'tobi@skillpass.ng');
    await userEvent.type(screen.getByLabelText('Password'), 'not-the-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Incorrect email or password.');
  });

  it('signs a trainer in and lands on a dashboard filled from the API', async () => {
    open('/login');
    render(<App />);
    await userEvent.type(await screen.findByLabelText('Email'), 'babatunde@skillpass.ng');
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Welcome back, Babatunde')).toBeTruthy();
    expect(screen.getByText(/Adeyemi Electricals/)).toBeTruthy();
    expect(window.localStorage.getItem('skillpass.token')).toBeTruthy();
  });

  it('keeps a returning visitor signed in after a page reload', async () => {
    await openAs('babatunde@skillpass.ng', '/trainer');
    expect(await screen.findByText('Welcome back, Babatunde')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('sends a signed-out visitor to the login page', async () => {
    open('/trainer');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('keeps each role on its own pages', async () => {
    await openAs('tobi@skillpass.ng', '/admin/review');
    await waitFor(() => expect(window.location.pathname).toBe('/apprentice')); // bounced to the apprentice home
    expect(screen.queryByText('Review Queue')).toBeNull(); // and never shown the admin queue
  });
});

describe('the public pages, with no login', () => {
  it('verifies a credential from the server, including its signature', async () => {
    open('/verify/SP-2BNC-8QPE');
    render(<App />);
    expect(await screen.findByText('Wire a consumer unit (distribution board)')).toBeTruthy();
    expect(await screen.findByText(/Signature matches the server's record/)).toBeTruthy();
    expect(screen.getByText('88')).toBeTruthy(); // the trainer's trust score, computed by the server
    expect(screen.getByText('Tobi Ogunleye')).toBeTruthy();
  });

  it('says plainly when a credential does not exist', async () => {
    open('/verify/SP-AAAA-BBBB');
    render(<App />);
    expect(await screen.findByText(/No credential found for SP-AAAA-BBBB/)).toBeTruthy();
  });

  it('does not show who flagged a credential', async () => {
    open('/verify/SP-3WLA-9KDS');
    render(<App />);
    expect(await screen.findByText('Flagged — under review')).toBeTruthy();
    expect(screen.queryByText(/Folake/)).toBeNull();
    expect(screen.queryByText(/had to be redone/)).toBeNull();
  });

  it('shows an apprentice\'s passport', async () => {
    open('/passport/a1');
    render(<App />);
    expect(await screen.findByText('Tobi Ogunleye')).toBeTruthy();
    expect(screen.getByText(/skills verified/)).toBeTruthy();
    expect(screen.getByText(/Lekki Homes Facility Management/)).toBeTruthy(); // an employer rating
  });
});

describe('actions change what the server holds', () => {
  it('an apprentice confirming a skill makes it valid', async () => {
    expect(await statusOf('SP-5ZTQ-2WEN')).toBe('pending_apprentice');
    await openAs('tobi@skillpass.ng', '/apprentice/confirm');
    const buttons = await screen.findAllByRole('button', { name: /Yes, I did this/ });
    await userEvent.click(buttons[0]);
    await waitFor(async () => expect(await statusOf('SP-5ZTQ-2WEN')).toBe('valid'));
    expect(await screen.findByText(/Confirmed “/)).toBeTruthy();
  });

  it('an administrator releasing a held credential puts it back in the flow', async () => {
    expect(await statusOf('SP-3PZN-1VKR')).toBe('held_review');
    await openAs('admin@skillpass.ng', '/admin/review');
    await userEvent.click(await screen.findByRole('tab', { name: /Held/ }));
    const release = await screen.findAllByRole('button', { name: 'Release' });
    await userEvent.click(release[0]);
    await waitFor(async () => expect(await statusOf('SP-3PZN-1VKR')).toBe('valid')); // its apprentice had already confirmed it
  });

  it('shows the server\'s message when it refuses an action', async () => {
    await openAs('folake@skillpass.ng', '/verify/SP-3WLA-9KDS'); // already flagged, so it cannot be flagged again
    expect(await screen.findByText('Flagged — under review')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Flag as suspicious/ })).toBeNull();
  });
});

describe('the admin dashboards read live data', () => {
  it('lists every user for the administrator', async () => {
    await openAs('admin@skillpass.ng', '/admin/users');
    expect(await screen.findByText('Babatunde Adeyemi')).toBeTruthy();
    expect(screen.getByText('Kunle Bakare')).toBeTruthy(); // a trainer still waiting for approval
    expect(within(document.body).getAllByText(/skillpass\.ng/).length).toBeGreaterThan(5);
  });
});
