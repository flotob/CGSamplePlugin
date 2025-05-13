import Onboard from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import luksoModule from '@lukso/web3-onboard-config';

// Initialize the LUKSO wallet module
const lukso = luksoModule();

// Initialize the injected wallets module with LUKSO custom configuration
const injected = injectedModule({ 
  custom: [lukso], // This ensures LUKSO UP Extension is prioritized or specifically handled
});

const chains = [
  {
    id: process.env.NEXT_PUBLIC_LUKSO_MAINNET_CHAIN_ID!,
    token: 'LYX',
    label: 'LUKSO Mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL!,
  },
  {
    id: process.env.NEXT_PUBLIC_LUKSO_TESTNET_CHAIN_ID!,
    token: 'LYXt',
    label: 'LUKSO Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_LUKSO_TESTNET_RPC_URL!,
  },
];

const appMetadata = {
  name: 'CG Sample Plugin', // Replace with your actual app name or use an env variable
  description: 'Connect your Universal Profile to explore exclusive features.',
  recommendedInjectedWallets: [
    { name: 'Universal Profile', url: 'https://docs.lukso.tech/tools/universal-profile/browser-extension/' },
  ]
  // icon: '<svg>Your App Icon SVG</svg>', // Consider adding your app icon
  // logo: '<svg>Your App Logo SVG</svg>', // Consider adding your app logo
};

const onboardInstance = Onboard({
  wallets: [injected],
  chains,
  appMetadata,
  accountCenter: {
    desktop: { 
      enabled: true,
      position: 'topRight',
      minimal: false, 
    },
    mobile: { 
      enabled: true,
      position: 'topRight',
      minimal: false,
    },
  },
});

export default onboardInstance; 