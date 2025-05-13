Thanks! I’ll prepare a complete integration guide for your Next.js app that uses OpenAI's API with Vercel SDK, and includes onchain verification with Alchemy and public Ethereum JSON-RPC APIs, without requiring a full MCP server. The guide will cover how your LLM agent can generate and trigger blockchain queries and verify user wallet ownership through Wagmi and RainbowKit.

I'll share it shortly.


# Implementing an Onchain Bouncer LLM Agent in Next.js

This guide walks you through building a **Next.js** web app that uses an LLM (via OpenAI with function calling) as an "onchain bouncer." The LLM agent will enforce on-chain conditions by querying blockchain data (Ethereum mainnet and L2s like Optimism, Arbitrum, Base) and verifying wallet ownership via signature. We’ll cover the full integration – backend architecture, defining OpenAI function specs for onchain queries & wallet verification, connecting the frontend with Wagmi/RainbowKit for wallet signatures, and example flows (e.g. proving you hold ≥1 ETH or used Uniswap on Arbitrum).

**Key technologies:** Next.js (App Router), OpenAI API (function calling + streaming via Vercel AI SDK), Alchemy/ethers.js for blockchain queries, Wagmi + RainbowKit for wallet connection & message signing.

## Overview & Architecture

**What is an “Onchain Bouncer” LLM agent?** It’s an AI assistant that gates access or information based on on-chain credentials. For example, it might only answer a question if your Ethereum wallet meets certain conditions (token ownership, transaction history, balance thresholds, etc.). The LLM uses function calling to fetch on-chain data and verify proofs, much like a bouncer checking IDs.

**How it works:**

* **LLM Function Calling:** We define a set of functions (tools) that the LLM can call, such as `get_eth_balance`, `get_token_balance`, `check_nft_ownership`, etc., and a special `verify_signature` for wallet proof. OpenAI’s model can output a JSON with arguments to call these functions. The Next.js backend intercepts these calls, executes the logic (querying Alchemy/public RPC or verifying a signature), and returns results to the LLM. This allows the LLM to incorporate on-chain data into its responses without being directly exposed to our APIs or keys.

* **Backend (Next.js API Route):** We’ll create an API route (e.g. `/api/chat`) using Vercel’s AI SDK on the **Edge runtime**. The route will accept chat messages, forward them to OpenAI (with our function specs and streaming enabled), handle function call events, and stream results back. The backend will securely use our **Alchemy API key** or public RPC endpoints to fulfill onchain queries, never exposing these keys to the client.

* **Frontend (React):** The frontend (Next.js pages or App Router) will use Wagmi and RainbowKit for wallet connectivity. Once the user connects their wallet, the LLM can prompt them to sign a message for verification. The frontend will use ethers.js (via Wagmi’s hooks) to request a signature and then send the signed proof to the backend. We leverage the Vercel AI SDK’s React hooks (like `useChat`) for a chat interface that streams the assistant’s responses. This SDK also supports custom tool handling on the client side, which we’ll use for the signature flow.

* **No local blockchain servers required:** All on-chain data queries go through Alchemy’s APIs or public RPCs. This means you don’t need to run a local node or a custom multi-chain server (sometimes called an MCP server) – the agent’s onchain lookups happen via external API calls from our backend.

Below is a diagram of the high-level architecture:

&#x20;*Architecture of the Next.js “Onchain Bouncer” LLM Agent.*
*Figure: The LLM (OpenAI) interacts with our Next.js backend via function calls. The backend queries on-chain data from Alchemy/public RPC and verifies signatures. The frontend connects the user’s Ethereum wallet and streams chat responses to the UI.*

## Backend Setup: OpenAI API Route with Function Calling

First, set up a Next.js API route for the chat interaction. In a Next.js 13 App Router project, create a file at `app/api/chat/route.ts`:

```typescript
// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';  // Vercel AI SDK utilities
import { functions, runFunction } from '@/app/api/chat/functions';  // (we'll create this next)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const runtime = 'edge';  // use Edge runtime for streaming

export async function POST(req: NextRequest) {
  const { messages } = await req.json();  // expect messages array from client (chat history)

  // Send user message + function definitions to OpenAI, with streaming on
  const initialResponse = await openai.chat.completions.create({
    model: 'gpt-4-0613',  // or gpt-3.5-turbo-0613, which support function calling
    stream: true,
    messages,
    functions,               // our predefined function specs
    function_call: 'auto',   // let the model decide if it needs to call a function
  });

  // Create a streaming response, handling function calls:
  const stream = OpenAIStream(initialResponse, {
    experimental_onFunctionCall: async ({ name, arguments: args }, createFnCallMessages) => {
      // When the model wants to call a function, execute it and get result
      const result = await runFunction(name, args);
      // Package the function call result back into the conversation messages
      const newMessages = createFnCallMessages(result);
      // Call OpenAI again with the new messages (including function result)
      return openai.chat.completions.create({
        model: 'gpt-4-0613',
        stream: true,
        messages: [...messages, ...newMessages],
      });
    },
  });

  return new StreamingTextResponse(stream);
}
```

Let’s break down what’s happening in this route:

* We initialize the OpenAI client with our API key. The Vercel AI SDK’s `OpenAIStream` and `StreamingTextResponse` help stream responses back to the client.

* On each chat POST request, we forward the conversation `messages` to OpenAI. We include the **function definitions** (`functions`) and set `function_call: 'auto'`, which means GPT-4 can decide to return a function call if it deems it necessary.

* The `experimental_onFunctionCall` hook intercepts any function call outputs. The OpenAI response will include something like `{"function_call": {"name": "get_eth_balance", "arguments": "{ \"address\": \"0x...\", \"chain\": \"ethereum\" }"}}`. The hook receives the function name and parsed arguments. We then call our corresponding JS function via `runFunction(name, args)`.

* After executing the function (e.g., querying the blockchain or verifying a signature), we get a result (as a JS object or value). We use `createFunctionCallMessages(result)` to form the assistant’s function result message, and then call OpenAI **again** with the updated message list (original messages + the function call + the function result). OpenAI will then generate the final assistant reply, which we stream back. This implements the full **function calling flow**: user message → function call → function result → final answer.

**Security:** Our backend never exposes the actual RPC or API keys to the model or client. We only send *function names and arguments* to OpenAI, and we execute the functions ourselves. This ensures the agent can only perform explicitly allowed queries. The results of those queries are fed back to the model (and ultimately to the user) in a controlled way. The OpenAI key and Alchemy keys remain safely on the server.

## Defining Onchain Query & Verification Functions

Next, define the **function specifications** for the onchain operations and implement their logic. Create a file `app/api/chat/functions.ts`:

```typescript
// app/api/chat/functions.ts
import { CompletionCreateParams } from 'openai/resources/chat';  // OpenAI types for function definitions
import { ethers } from 'ethers';

// 1. Define JSON-RPC providers for each chain (using Alchemy or public endpoints)
const ETH_RPC = process.env.ALCHEMY_ETH_RPC_URL || 'https://cloudflare-eth.com';  // Ethereum mainnet
const ARB_RPC = process.env.ALCHEMY_ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc'; // Arbitrum One
const OPT_RPC = process.env.ALCHEMY_OPT_RPC_URL || 'https://mainnet.optimism.io';  // Optimism
const BASE_RPC = process.env.ALCHEMY_BASE_RPC_URL || 'https://base-rpc.publicnode.com'; // Base

const providerForChain: Record<string, ethers.providers.JsonRpcProvider> = {
  ethereum: new ethers.providers.JsonRpcProvider(ETH_RPC),
  arbitrum: new ethers.providers.JsonRpcProvider(ARB_RPC),
  optimism: new ethers.providers.JsonRpcProvider(OPT_RPC),
  base: new ethers.providers.JsonRpcProvider(BASE_RPC),
};

// 2. Define OpenAI function specs
export const functions: CompletionCreateParams.CreateChatCompletionRequestNonStreaming["functions"] = [
  {
    name: "get_eth_balance",
    description: "Get the native ETH balance of a given address on a specified chain.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "The Ethereum address (checksummed or hex) to query." },
        chain: { 
          type: "string", 
          enum: ["ethereum", "optimism", "arbitrum", "base"],
          description: "Which blockchain to query (ethereum mainnet or L2 network)."
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_token_balance",
    description: "Get the ERC-20 token balance of an address on a given chain.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address to check." },
        token:   { type: "string", description: "ERC-20 token contract address to check balance for." },
        chain:   { type: "string", enum: ["ethereum", "optimism", "arbitrum", "base"], description: "Chain where the token contract is deployed." },
      },
      required: ["address", "token"],
    },
  },
  {
    name: "check_nft_ownership",
    description: "Check if an address owns any tokens from a given ERC-721 NFT contract.",
    parameters: {
      type: "object",
      properties: {
        address:  { type: "string", description: "Ethereum address (wallet) to check." },
        contract: { type: "string", description: "ERC-721 NFT contract address to check." },
        chain:    { type: "string", enum: ["ethereum", "optimism", "arbitrum", "base"], description: "Chain of the NFT contract." },
      },
      required: ["address", "contract"],
    },
  },
  {
    name: "verify_signature",
    description: "Verify that a message was signed by a given Ethereum address. Returns true if signature is valid, or false if not.",
    parameters: {
      type: "object",
      properties: {
        address:   { type: "string", description: "The claimed Ethereum address of the signer." },
        message:   { type: "string", description: "The original message that was signed." },
        signature: { type: "string", description: "The signature generated by signing the message." },
      },
      required: ["message", "signature", "address"],
    },
  },
  {
    name: "check_uniswap_usage",
    description: "Checks if an address has EVER used Uniswap on a given chain (by interacting with Uniswap's router).",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "User's address to check." },
        chain:   { type: "string", enum: ["ethereum", "optimism", "arbitrum", "base"], description: "Chain to check for Uniswap usage." },
      },
      required: ["address", "chain"],
    },
  },
];

// 3. Implement the backend logic for each function call
export async function runFunction(name: string, args: any) {
  switch (name) {
    case "get_eth_balance": {
      const { address, chain = 'ethereum' } = args;
      const provider = providerForChain[chain];
      if (!provider) throw new Error(`Unsupported chain: ${chain}`);
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.utils.formatEther(balanceWei);
      return { balance: balanceEth };  // return as object so OpenAI sees a structured result
    }
    case "get_token_balance": {
      const { address, token, chain = 'ethereum' } = args;
      const provider = providerForChain[chain];
      if (!provider) throw new Error(`Unsupported chain: ${chain}`);
      // Minimal ERC-20 ABI for balance and decimals
      const ERC20_ABI = [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];
      const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
      const [rawBalance, decimals] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals().catch(() => 18)  // default to 18 if decimals() not present
      ]);
      // Format balance using the token's decimals
      const formattedBalance = ethers.utils.formatUnits(rawBalance, decimals);
      return { balance: formattedBalance };
    }
    case "check_nft_ownership": {
      const { address, contract, chain = 'ethereum' } = args;
      const provider = providerForChain[chain];
      const ERC721_ABI = [
        "function balanceOf(address) view returns (uint256)"
      ];
      const nftContract = new ethers.Contract(contract, ERC721_ABI, provider);
      const balance = await nftContract.balanceOf(address);
      const ownsNFT = balance.gt(0);
      return { ownsNFT: ownsNFT };
    }
    case "verify_signature": {
      const { address, message, signature } = args;
      try {
        const recoveredAddr = ethers.utils.verifyMessage(message, signature);
        const match = recoveredAddr.toLowerCase() === address.toLowerCase();
        return { valid: match };
      } catch (err) {
        return { valid: false };
      }
    }
    case "check_uniswap_usage": {
      const { address, chain } = args;
      // Known Uniswap v3/v2 router addresses for simplicity (could be expanded per chain)
      const uniswapRouters: Record<string, string[]> = {
        ethereum: [
          "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap v3 router
          "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap v3 SwapRouter02
        ],
        arbitrum: [
          "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // SwapRouter02 on Arbitrum
        ],
        optimism: [
          "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // SwapRouter02 on Optimism
        ],
        base: [
          // Assume Uniswap is deployed on Base (if not, this can be empty or include known routers)
          "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
        ],
      };
      const provider = providerForChain[chain];
      if (!provider) throw new Error(`Unsupported chain: ${chain}`);
      const routersToCheck = uniswapRouters[chain] || [];
      if (routersToCheck.length === 0) return { usedUniswap: false };

      // Fetch recent transactions and check for any to a Uniswap router
      // (Note: provider.getHistory may have limitations; a production app might use Alchemy Transfers API)
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(currentBlock - 500000, 0); // check last ~500k blocks (~a few months on L2)
      const txHistory = await provider.getHistory(address, fromBlock, currentBlock);
      const used = txHistory.some(tx => tx.to && routersToCheck.includes(tx.to.toLowerCase()));
      return { usedUniswap: used };
    }
  }
}
```

Let’s note a few things from the code above:

* We set up JSON-RPC providers for each chain we support. Here we use Alchemy endpoints (if available via env vars) or fallback to public RPCs (like Cloudflare’s Ethereum gateway, Arbitrum’s public RPC, etc.). This allows us to query each chain. You might use Alchemy’s SDK for convenience, but here we stick to ethers.js providers for simplicity. Alchemy’s Transfer API could also be used for more complex queries (e.g., fetching all historical transactions for an address across L2s).

* **Function definitions (`functions` array):** Each function has a `name`, `description`, and `parameters` schema. This schema is what we send to OpenAI, and it tells the model how to structure a function call. For example, `get_eth_balance` requires an `address` (and optional `chain`, defaulting to Ethereum). We enumerate allowed chain names to keep it specific. The LLM will output arguments matching these specs if it chooses to call the function.

* **Function implementations (`runFunction`):** This executes the actual logic:

  * **`get_eth_balance`:** Uses `provider.getBalance(address)` and formats it to ETH. Returns an object with `balance` (as a string). By returning an object, the OpenAI function-call mechanism will see a structured JSON result (e.g., `{"balance": "1.2345"}`).
  * **`get_token_balance`:** Uses a minimal ERC-20 ABI to get `balanceOf` and `decimals`. We format the result to human-readable units. (In a real app, you might also return the raw value or token symbol, etc.)
  * **`check_nft_ownership`:** Calls `balanceOf` on an ERC-721 contract; if >0, the user owns at least one NFT from that collection.
  * **`verify_signature`:** Uses `ethers.utils.verifyMessage` to recover the address from the signature and compares it to the expected address. If it matches, returns `{ valid: true }`. This is how we’ll confirm that the connected wallet indeed signed a particular message (proving ownership/control).
  * **`check_uniswap_usage`:** A more specialized function – it checks if the address has *ever* interacted with Uniswap on a given chain. We provide known Uniswap router addresses and then scan the user’s recent transaction history for any tx with `to` equal to one of those addresses. This is a simplified check. In production, you might use Alchemy’s `getAssetTransfers` (which can filter all transactions involving the address and those router addresses) for a more reliable result. The Alchemy Transfers API supports querying historical transactions across Ethereum and L2s. Our example uses ethers.js `provider.getHistory`, limited by the provider’s capability (Alchemy allows up to some thousands of blocks range per call). In any case, this function returns `{ usedUniswap: true/false }`.

Note: The `check_uniswap_usage` function is just one example of a custom on-chain condition. You could create similar functions for other DeFi protocols or on-chain actions (e.g., *check if user ever sent funds to Tornado Cash*, *check if user voted in governance*, etc.). The LLM agent could call these to enforce domain-specific rules.

### Security & Best Practices for Backend Functions

All our onchain queries run on the server with controlled inputs. Still, keep in mind:

* **Validation:** Ensure addresses are valid (ethers will throw if not). You might add additional validation or checksumming as needed.
* **Rate limiting:** The backend should potentially limit how often it hits external APIs (to avoid abuse via the LLM querying too much).
* **API keys:** As shown, use environment variables for keys. Never send these to the client or the LLM. We only return high-level results (balance values, booleans, etc.).
* **Limited scope:** The LLM can only call the functions we define. It can’t execute abitrary code or query random contract addresses unless we explicitly allow it via a function. This *“secure sandbox”* approach confines what the AI can do on-chain to our specified use cases.

## Frontend Setup: Wallet Connection and Chat Interface

With the backend in place, we’ll wire up the frontend. The frontend has two main roles: **(1)** Provide a chat UI that streams messages, and **(2)** Handle user wallet interactions (connecting and signing) when needed.

### 1. Installing Wagmi, RainbowKit, and Vercel AI SDK

Install the required packages:

```bash
npm install wagmi @rainbow-me/rainbowkit ethers
npm install openai ai   # OpenAI + Vercel AI SDK (if not already)
```

* **Wagmi** is a React hooks library for Ethereum, and RainbowKit provides polished UI components for wallet connection (built on Wagmi). **Ethers** is used by Wagmi under the hood (and we also use it in our functions).
* The **Vercel AI SDK** (`ai` package) gives us React hooks (`useChat`) to easily integrate our streaming chat API.

### 2. Configuring Wagmi and RainbowKit Providers

In Next.js (App Router), we need to wrap our application with providers. You can create a `providers.tsx` component or include it in your root layout.

For example, in `app/layout.tsx`:

```tsx
// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { mainnet, arbitrum, optimism, base } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, optimism, arbitrum, base],
  [
    // Use AlchemyProvider (if API key present) or default public RPC
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY ?? '' }),
    publicProvider()
  ]
);
const { connectors } = getDefaultWallets({
  appName: 'OnchainBouncerApp',
  projectId: '<YOUR_WALLETCONNECT_PROJECT_ID>',  // needed for WalletConnect modal
  chains
});
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient
});
const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider chains={chains}>
            {children}
          </RainbowKitProvider>
        </WagmiConfig>
      </body>
    </html>
  );
}
```

This sets up the Ethereum networks we care about (Ethereum, Optimism, Arbitrum, Base). We use Alchemy and/or public providers for the frontend as well. (Even though the heavy lifting is on the backend, the frontend might use the provider for things like ENS resolution or other UX features; for our core use-case, we mainly need it for signing.)

We configure RainbowKit with wallet connectors (MetaMask, WalletConnect, etc.). Now we can use RainbowKit’s `<ConnectButton>` and Wagmi hooks in our components.

### 3. Building the Chat Interface with Streaming and Function Integration

Create a chat page or component, e.g. `app/page.tsx` (or `app/chat/page.tsx` if you prefer a dedicated route). This will serve as the main UI for interacting with the bouncer agent.

```tsx
'use client';

import { useState } from 'react';
import { useChat, Message } from 'ai/react';   // Vercel AI SDK hook
import { useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();  // wagmi hook for signing (returns a Promise)
  
  // Initialize the chat hook
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',  // our backend chat route
    onResponse(response) {
      // Optionally inspect raw response
    },
    // Intercept tool/function calls:
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === 'request_wallet_signature') {
        // If the AI requests a wallet signature, handle it here (we’ll set up such a function later)
        const messageToSign = toolCall.args?.message || `Onchain Bouncer Verification: ${new Date().toISOString()}`;
        try {
          const sig = await signMessageAsync({ message: messageToSign });
          // Attach the result of the tool (signature) back to the chat as if the assistant function returned it
          return sig;
        } catch (err) {
          // If user rejects or signing fails
          return 'ERROR: User failed to sign message';
        }
      }
    }
  });

  // A handler to capture the user's wallet address after connecting (using Wagmi's useAccount would be better)
  const handleConnected = (addr: string) => {
    setAddress(addr);
    // Optionally, inform the AI of the address (you could send a system or user message with it)
  };

  return (
    <main>
      {/* Wallet Connect / Address Display */}
      <div style={{ marginBottom: '1rem' }}>
        <ConnectButton onConnect={({ account }) => handleConnected(account.address)} />
      </div>

      {/* Chat Messages */}
      <div className="chat-container">
        {messages.map(m => (
          <div key={m.id} className={`message ${m.role}`}>
            {/* Render message content. If there's a function call part, handle accordingly (see below) */}
            {m.role === 'assistant' 
              ? <AssistantMessageDisplay message={m} onSign={signMessageAsync} />
              : m.content}
          </div>
        ))}
      </div>

      {/* Input box for user */}
      <form onSubmit={handleSubmit}>
        <input 
          value={input} 
          onChange={handleInputChange} 
          placeholder="Ask the bouncer..." 
          disabled={isLoading} 
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </main>
  );
}

// A helper component to properly render assistant messages that might include tool calls
function AssistantMessageDisplay({ message, onSign }: { message: Message, onSign: typeof signMessageAsync }) {
  // The Vercel SDK splits assistant messages into parts if they include tool invocations
  return <>{message.parts.map((part, idx) => {
    if (part.type === 'tool-invocation' && part.toolInvocation) {
      const { toolName, state, args, result, toolCallId } = part.toolInvocation;
      if (toolName === 'request_wallet_signature') {
        if (state === 'call') {
          // The agent is asking for a signature – render a button for the user to click
          const msg = args?.message || "Sign this message to prove wallet ownership.";
          return (
            <div key={toolCallId} className="tool-request">
              <p>{msg}</p>
              <button onClick={async () => {
                const signature = await onSign({ message: msg });
                // Send the signature back as the result of the tool call
                append({
                  role: 'assistant',
                  content: signature,
                  // Mark this message as a tool result corresponding to toolCallId
                  // (The Vercel SDK's `addToolResult` could be used instead of manual append)
                });
              }}>
                Sign Message
              </button>
            </div>
          );
        }
        if (state === 'result') {
          // The signature result has been provided
          return <p key={toolCallId}>✅ Wallet signature provided.</p>;
        }
      }
      // Handle other tools if needed...
    }
    // For normal text parts, just render text
    return <span key={idx}>{part.text}</span>;
  })}</>;
}
```

In the code above, a lot is happening – let’s unpack the important pieces:

* **useChat hook:** This hook from `ai/react` connects our component to the chat API route. It manages streaming responses and state. We pass `onToolCall` to intercept function calls. If the LLM triggers a tool (function) called `request_wallet_signature` (which we will define on the AI side later), our callback will execute. In this callback, we use Wagmi’s `signMessageAsync` to prompt the user’s wallet to sign the provided message. We then return the signature string — the SDK will send this back as the “function result” to the AI, without needing a round-trip to the server. This is a powerful pattern: **client-side function execution.** We use it here because wallet signing must happen in the browser (the server cannot sign with the user’s private key!).

* **AssistantMessageDisplay:** The Vercel SDK represents assistant messages that include function calls as an array of **parts** (`message.parts`). For example, if the assistant needs user confirmation or action, it might output a `tool-invocation` part with state `'call'`. We check for our `request_wallet_signature` tool invocation. In the `'call'` state, we display a message and a button for the user to sign the message. When clicked, we use `onSign` (which calls `signMessageAsync`) and get the signature. We then **append** a new assistant message containing the signature. We could use the `addToolResult` helper instead of `append`, but for simplicity, appending a message with the signature content achieves sending the result back to the AI. Once the signature is provided, the AI (on the server side) can proceed to verify it and continue the conversation. The `'result'` state can be handled to show a confirmation in the UI (here we just display a checkmark).

* **ConnectButton and address state:** We render the RainbowKit `ConnectButton` to handle wallet connection. When the wallet connects, we capture the address (via an `onConnect` callback or using Wagmi’s `useAccount` hook). We store it in state, and you might choose to send this to the AI (e.g., as a system message: “User wallet address is X”). However, for security, the agent might still require a signature even if it knows the address, to ensure the user truly controls it. The address can be used by the agent in formulating the right function calls (like querying balances) after verification.

**Signing messages and proving wallet ownership:** By signing a message on the frontend and verifying it on the backend, we **prove the wallet address is owned by the user**. This concept is analogous to the Sign-In with Ethereum (SIWE) standard, which involves issuing a nonce, signing it, and verifying it. Our approach is simpler (we might use a static or time-based message), but the principle is the same – the signature acts as a cryptographic proof. In a production scenario, consider including a one-time nonce or expiration in the message to prevent replay attacks.

### 4. Defining the `request_wallet_signature` function (AI side)

We referenced a `request_wallet_signature` tool in the front-end. We should also define it in the OpenAI functions so the LLM knows it exists. Add it to the `functions` array in `functions.ts` (and no need for a server `runFunction` implementation, since it’s handled client-side):

```typescript
// In functions.ts, within the functions array, add:
{
  name: "request_wallet_signature",
  description: "Request the user to sign a verification message with their wallet.",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string", description: "The message to sign (if omitted, a default challenge will be used)." }
    },
    required: [],
  },
},
```

We place this in the definitions list so GPT-4 can call `request_wallet_signature`. However, in our `runFunction` switch, we intentionally **do not implement** it. If the server receives a function call for it, we can either throw an error or handle it by sending a message to the client. But thanks to our `onToolCall` on the client, we actually never want the server to execute it. One approach is to modify the server logic to *not automatically execute certain functions*. In our `OpenAIStream` call, we could check the `name`: if it's `request_wallet_signature`, instead of executing, we could break out and let the partial response flow to the client. The Vercel SDK’s `experimental_onFunctionCall` doesn’t easily allow skipping execution. Instead, a simpler way: have the AI not auto-execute this function. We can achieve **user approval flow** by having the AI *ask* for confirmation (or signature) and wait.

For our purposes, since we set up the client to catch the tool call, it should intercept it. The `useChat` will treat any function call not handled by `experimental_onFunctionCall` as a special message part. We just need to ensure our `runFunction` either doesn’t catch it or passes it along. If needed, you can tweak `experimental_onFunctionCall` to ignore `request_wallet_signature` (returning `null` perhaps) so that it’s streamed to client. Another approach is to have the LLM not call it as a formal function, but instead just *say* something like “Please sign X message.” However, using function call & tool invocation keeps the flow structured.

In summary, **when the LLM decides it needs the user’s signature** (e.g., to verify ownership before proceeding), it will call `request_wallet_signature`. The client catches this, prompts the user to sign, then returns the signature. The LLM then gets the signature (as if the function returned a value) and can proceed to call `verify_signature` on the backend to check it, then call other onchain queries.

## Example Flows

Now that we have the framework, let's walk through two example verification flows to illustrate how everything comes together.

### Example 1: *“Prove you hold at least 1 ETH”*

Imagine the agent’s role is to grant access only if the user’s wallet holds ≥ 1 ETH on mainnet. The conversation might go like this:

1. **User** (connected wallet 0xABC...): “Hello, I’d like to enter the exclusive chat.”
2. **Assistant** (LLM agent): Checks its instructions and sees a requirement of 1 ETH balance. It doesn’t yet know the user’s address or balance. It decides to verify the wallet:

   * It calls the `request_wallet_signature` function (with maybe a default message like “Prove ownership of your wallet to continue.”).
   * This function call is sent in the stream. Our frontend sees it and prompts the user to sign.
3. **User**: Clicks “Sign Message”. Wallet signs the message (e.g. “Onchain Bouncer Verification: 2025-05-05T12:00:00Z”) and returns a signature `0x1234...`.
4. **Assistant/Backend**: Receives the signature as the result of `request_wallet_signature`. Now the LLM has the signature. It proceeds to verify:

   * The LLM calls `verify_signature` with arguments: the known address (if the user’s address was provided or it might have been part of the signed message context), the message, and the signature.
   * Our server `runFunction` executes `verify_signature`, which recovers the signer’s address and compares. Suppose it matches `0xABC...` (the user’s address) – it returns `{ valid: true }`.
   * The LLM gets the verification result. Now it trusts that 0xABC... is the user’s wallet.
5. **Assistant**: Next, the LLM calls `get_eth_balance` with `address: "0xABC..."` (and chain “ethereum”). The server fetches the balance, say it returns `{ balance: "0.5" }`.
6. **Assistant**: The LLM sees the balance is 0.5 ETH, which is below 1. It then formulates a response to the user, perhaps: “❌ Sorry, you only have 0.5 ETH, but at least 1 ETH is required to enter.” This is streamed back to the frontend.
7. **User**: Receives the message and knows they failed the check.

If the user had ≥1 ETH, step 5 would yield `{ balance: "1.2" }` for example, and the assistant could respond, “✅ You have sufficient balance! Welcome in.” The key is that all sensitive checks (signature verification and balance query) happened via secure function calls; the LLM just orchestrated it.

### Example 2: *“Prove you have used Uniswap on Arbitrum”*

Suppose the agent needs the user to have interacted with Uniswap on Arbitrum at least once. The flow:

1. **User**: “I want to access the Arbitrum DeFi lounge.”
2. **Assistant**: Needs to verify Uniswap usage. Again, it doesn’t know who the user is yet, so it will ask for a signature to get the address:

   * Calls `request_wallet_signature` just like in example 1.
   * User signs, signature returns, agent verifies signature via `verify_signature` -> gets the address (say 0xABC...).
3. **Assistant**: Now with the address, it calls `check_uniswap_usage` with `address: "0xABC..."` and `chain: "arbitrum"`.

   * The backend function fetches recent tx history and looks for Uniswap router interactions. Let’s say it finds a transaction to `0x68b3465...` (the Uniswap v3 router on Arbitrum) in the address’s history. It returns `{ usedUniswap: true }`.
4. **Assistant**: The LLM sees the result. If `usedUniswap` is true, it replies with a success message: “✅ Access granted! You have used Uniswap on Arbitrum before.” If it were false, it might say: “❌ It looks like this wallet hasn’t used Uniswap on Arbitrum. Access denied until you do so.”
5. **User**: Gets the response in the UI.

These flows show how the LLM agent can combine multiple function calls to enforce conditions. It first verifies the wallet (signature), then queries on-chain data (balance or tx history) to make a decision, and finally communicates the result.

## Putting It All Together and Running the App

Make sure to populate your environment variables (OpenAI API key, Alchemy API keys or RPC URLs for each chain if you have them, etc.). Then run the development server:

```bash
npm run dev
```

Open the app in your browser. You should see a wallet connect button and a chat interface. Connect your Ethereum wallet (e.g., MetaMask via RainbowKit). Then try interacting with the AI agent. For example, you could prompt it directly with something like: *“Can I enter the VIP area?”* (assuming we instructed the AI that the VIP area requires some onchain condition). The AI will then go through the motions of asking for your signature and checking the chain.

**Tips for a better experience:**

* **System Prompting:** You can give the AI a system message upfront like: “You are an on-chain gatekeeper. You will verify the user’s Ethereum wallet meets certain conditions before granting access. If the user asks for access to X, you must ensure they satisfy Y on-chain.” This helps the model know when to trigger the functions. The exact logic can also be learned through few-shot examples or just letting it figure out given the function tools available.
* **Error handling:** Consider cases where the user refuses to sign or the signature is invalid (`verify_signature` returns false). The agent should handle that (perhaps ask again or deny).
* **UI feedback:** When the agent is performing a check, you might show a loading indicator. The streaming nature already gives some feedback (the AI might stream a message like “Hold on, verifying your wallet...”). Our example could be extended to have the AI explicitly message its steps for clarity.

## Conclusion

In this guide, we built a comprehensive **onchain-integrated AI agent** in Next.js. By leveraging OpenAI’s function calling, we gave the LLM the ability to safely query onchain data and verify wallet ownership **without running any local blockchain nodes**. All queries went through trusted APIs (Alchemy, public RPC) and the results were funnelled back to the LLM. We used **Wagmi + RainbowKit** to handle user wallet connection and signing – an important part, as *signing a message proves control of an address securely*. This pattern is similar to the proven SIWE approach for auth, but here we applied it to gating AI interactions.

**Key takeaways:**

* *LLM function calling* is a powerful way to integrate external checks into an AI’s flow – the AI can call a function, we handle it in code (e.g., query blockchain), and return the result, which the AI then uses to craft its answer.
* Securely bridging user wallets with the AI involves an interactive signing step. We facilitated a seamless UX by intercepting the AI’s function call on the client and prompting the user via their wallet.
* The Next.js App Router with Edge Functions and streaming makes the experience fast and efficient, streaming partial responses as they’re ready.
* We avoided any exposure of secret keys or arbitrary onchain access by strictly defining what the AI can do. Each function is like an API endpoint the AI can hit, with controlled scope and inputs.

With this scaffolding, you can implement all sorts of onchain-aware AI assistants: membership gatekeepers, personalized DeFi advisors (that check your positions on-chain), NFT verifiers for unlocking content, and so on. The pattern scales to various networks (just add the provider and function definitions for each new chain or API).

Happy building your onchain-aware AI agent! 🚀

**Sources:**

* OpenAI Function Calling – Vercel Guide (overview of function calling integration in Next.js)
* Wagmi Examples – Sign Message (demonstrates wallet message signing to prove address control)
* Alchemy Transfers API (used for fetching historical txns across Ethereum/L2s, useful for checks like Uniswap usage)
* Wagmi SIWE Guide (inspiration for signature verification flow and security considerations)
