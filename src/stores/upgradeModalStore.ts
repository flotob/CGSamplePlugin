import { atom } from 'jotai';
import type { HttpError } from '@/lib/authFetch'; // Assuming HttpError is exported

export const isUpgradeModalOpenAtom = atom<boolean>(false);
export const upgradeModalErrorBodyAtom = atom<HttpError['body'] | undefined>(undefined);

// Atom to open the modal with specific error details
export const openUpgradeModalAtom = atom(
  null, // write-only atom
  (get, set, errorBody: HttpError['body']) => {
    set(upgradeModalErrorBodyAtom, errorBody);
    set(isUpgradeModalOpenAtom, true);
  }
);

// Atom to close the modal
export const closeUpgradeModalAtom = atom(
  null, // write-only atom
  (get, set) => {
    set(isUpgradeModalOpenAtom, false);
    set(upgradeModalErrorBodyAtom, undefined);
  }
);

// Optional: A read-only atom to get all state if needed elsewhere, though usually individual atoms are preferred.
// export const upgradeModalStateAtom = atom((get) => ({
//   isOpen: get(isUpgradeModalOpenAtom),
//   errorBody: get(upgradeModalErrorBodyAtom),
// })); 