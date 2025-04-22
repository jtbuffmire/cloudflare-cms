import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const token = writable<string>(
  browser ? localStorage.getItem('token') || '' : ''
);

token.subscribe((value) => {
  if (browser) {
    localStorage.setItem('token', value);
  }
});

export function logout() {
  token.set('');
}