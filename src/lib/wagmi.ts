import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  console.warn(
    'Warning: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in environment variables. WalletConnect functionality will be limited. Get a project ID at https://cloud.walletconnect.com'
  );
  // getDefaultConfig requires a projectId, even if it's just a placeholder
  // Use a placeholder or throw an error if it's absolutely required for your app flow.
  // Using an empty string might cause issues, ensure it's handled or provide a valid default if possible.
  // For development, using a dummy string might be acceptable temporarily.
}

export const config = getDefaultConfig({
  appName: 'CG Sample Plugin',
  projectId: walletConnectProjectId || 'YOUR_PROJECT_ID', // Fallback added
  chains: [mainnet, sepolia],
  ssr: true, // Required for App Router
  // Optional: Define custom transports if needed, otherwise defaults are used.
  // transports: {
  //   [mainnet.id]: http(),
  //   [sepolia.id]: http(),
  // },
}); 