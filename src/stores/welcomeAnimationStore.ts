import { atomWithStorage, createJSONStorage } from 'jotai/utils';

// Setup localStorage with safety checks
const storage = createJSONStorage<boolean>(() => {
  return {
    getItem: (key) => {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : false;
      } catch (e) {
        console.error('Error reading from localStorage', e);
        return false;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Error writing to localStorage', e);
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Error removing from localStorage', e);
      }
    },
  };
});

// Atom to track if user has seen welcome animation
export const hasSeenWelcomeAnimationAtom = atomWithStorage<boolean>(
  'has-seen-welcome-animation',
  false, // Default to false (haven't seen it)
  storage
); 