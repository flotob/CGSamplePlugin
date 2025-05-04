Great. I’ll research the full Worldcoin / World ID integration process for a Next.js app where users prove humanness via World ID in onboarding wizards. I’ll focus on both the end-user verification flow and the configuration options available to wizard authors, including what identity attributes (like age or location) can be validated.

I’ll get back to you shortly with a structured plan and code guidance for your AI agent.


# Integrating Worldcoin World ID into a Next.js Onboarding Wizard

## 1. Introduction to World ID and Use Case

Worldcoin’s **World ID** is a decentralized, privacy-preserving identity protocol that lets users prove they are real and unique humans (not bots) **without revealing personal information**. In our use case – adding a *“Verify with World ID”* slide to an onboarding wizard – we want users to confirm their humanness by linking a World ID (ideally an **Orb-verified** World ID, obtained via Worldcoin’s iris-scanning Orb device). This integration will ensure each end user is a unique person (one person = one account), leveraging Worldcoin’s proof-of-personhood.

We'll walk through the full integration in a **Next.js** web app (deployed on Railway), including:

* **Frontend flow:** Using Worldcoin’s **IDKit SDK** to embed a World ID verification widget in the wizard slide, allowing users to scan a QR code and prove their identity. We’ll cover the required UI component and security best practices on the client side.
* **Backend flow:** Verifying the cryptographic proof from World ID on our server (as recommended by Worldcoin). We’ll set up a Next.js API route to validate the proof via Worldcoin’s Developer API, ensuring the verification is trusted and unique.
* **User attributes:** Clarifying what data World ID provides – e.g. confirmation of humanness/uniqueness, and what it does *not* provide (age, location, etc.).
* **Wizard configuration:** How a wizard author (in the onboarding builder) can configure this step – for example, requiring Orb verification (strong proof), and any supported options like uniqueness limits or recency.
* **Code examples:** Snippets in both frontend and backend contexts, following Next.js conventions (using API routes, environment variables, etc.), with links to official Worldcoin docs for reference.

By the end, we’ll have a clear plan to implement World ID in a Next.js app’s onboarding flow.

## 2. Frontend – Adding a “Sign in with World ID” Slide

On the frontend, we will use Worldcoin’s **IDKit JavaScript SDK** (available as an NPM package `@worldcoin/idkit`) to embed a verification widget into our Next.js wizard. This widget handles the UI and communication with the user’s World app.

**Setup and Installation:** First, add the World ID SDK to the project:

```bash
npm install @worldcoin/idkit   # or yarn add @worldcoin/idkit
```



**Embedding the IDKit Widget:** In the wizard’s slide component (e.g. `WorldIDStep.jsx` or `.tsx`), import the `IDKitWidget` and related types from the SDK. If you’re using Next.js 13 with the App Router, mark the component as a client component (`"use client"` at the top) because it uses browser-side interactivity. Then render the `<IDKitWidget>` within your slide. For example:

```jsx
"use client";  // Next.js App Router: ensure this component runs on client

import { IDKitWidget, VerificationLevel, ISuccessResult } from "@worldcoin/idkit";

export default function WorldIDStep() {
  // Define the callback when a proof is received
  const handleVerify = async (verificationResult: ISuccessResult) => {
    // Send the proof to backend API for verification
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verificationResult),
    });
    if (!res.ok) {
      // Throwing an error will cause the IDKit widget to display it to the user
      throw new Error("Verification failed.");
    }
    // (If res.ok, the onSuccess callback will fire after modal closes)
  };

  // Define the callback for when the modal closes successfully
  const onSuccess = (result: ISuccessResult) => {
    console.log("World ID verified! Nullifier hash:", result.nullifier_hash);
    // e.g., proceed to next step or redirect the user
    // In a real app, you might store that the user is verified or navigate onward
  };

  return (
    <IDKitWidget
      app_id={process.env.NEXT_PUBLIC_WORLDID_APPID}   // Your App ID from Worldcoin Dev Portal
      action="my_onboarding_action"                    // Action ID or name from Dev Portal
      signal={undefined}         /* optional: if you have a specific signal to include */
      onSuccess={onSuccess}      /* called after user closes the widget (proof successful) */
      handleVerify={handleVerify}/* called immediately when proof is generated, before onSuccess */
      verification_level={VerificationLevel.Orb}       /* require Orb-verified World ID (highest assurance) */
    >
      {({ open }) => (
        // This child function returns the UI that triggers the World ID modal:
        <button onClick={open}>Verify with World ID</button>
      )}
    </IDKitWidget>
  );
}
```

In this code:

* **`app_id`** is the unique ID of your app obtained from Worldcoin’s Developer Portal (we’ll set this up in the portal and typically store it in an env variable). This identifies your application to Worldcoin’s systems.
* **`action`** is a string identifier for the specific action being verified – e.g. `"my_onboarding_action"`. This is configured in the Developer Portal as well (an “Action” defines the context for verification). Each action has settings like a description and how many times it can be verified by the same person (more on that later).
* **`verification_level`** is set to `VerificationLevel.Orb` to **force Orb verification**. This means the user must have been verified by the Orb (iris scan) to succeed – giving a *strong proof of personhood*. (The SDK also supports `VerificationLevel.Device` for a weaker proof using just a device check, but in our use case we want full human verification.)
* **`handleVerify`** is a callback that IDKit calls **as soon as a proof is generated** (before closing the modal). In our implementation, this function immediately forwards the proof data to our backend API (`/api/verify`) for secure verification. We check the response: if the backend returns an error (e.g. proof invalid or already used), we throw an error, which causes the IDKit modal to display the failure to the user. If no error is thrown, IDKit will consider the verification successful.
* **`onSuccess`** is a callback that fires **after the user closes the World ID modal successfully** (i.e. the proof was valid and no errors thrown). Here we can proceed with our app’s next step – for example, alert the user or advance the wizard. Often, you might redirect to a post-onboarding page or simply mark this step complete. (In the code above, we just log the nullifier hash as a placeholder.)

**User Flow (UI/UX):** When the user reaches this wizard slide and clicks the **“Verify with World ID”** button, the IDKit widget opens a modal dialog on top of the app. The modal will prompt the user to verify via their World App:

* **If the user is on a desktop browser:** The modal shows a **QR code**. The user needs to scan this QR with the **World App** on their mobile device (World App is Worldcoin’s mobile application that holds their World ID). Scanning the code connects the app to your application’s verification request.
* **If the user is on a mobile device with World App installed:** The widget can initiate a handoff (via deep link) to open the World App directly, without needing a QR scan. The user will be switched to the World App to verify.
* In the World App, the user will see details of the **Action** they are verifying (as configured in the Developer Portal – e.g. *“Prove humanness for MyApp onboarding”*). They approve this, which uses a cryptographic process (zero-knowledge proof) to attest they are a unique human. Importantly, Worldcoin does **not** reveal any personal info during this – it just returns a proof.
* Once approved, the World App communicates back to the widget (this happens quickly). The IDKit widget receives a **proof object** containing cryptographic proof data (details below) and calls our `handleVerify` callback with it. The modal might show a spinner or progress while our frontend sends this to the server and awaits confirmation.
* If the server verification succeeds, the widget shows a success state (possibly a checkmark or “Verified!” message). The modal then closes and triggers our `onSuccess` callback, so we can move the user forward. If verification fails (e.g. user had already used their World ID for this action or an error occurred), the widget will display an error message to the user (from the exception we threw in `handleVerify`), prompting them that the verification didn’t go through. They could then retry if appropriate.

**Security (Frontend considerations):** From a security standpoint, the frontend’s job is simply to collect the proof and pass it to the backend – **all critical verification happens server-side**. Never trust the proof purely on the client, since a malicious user could try to spoof responses. By using `handleVerify` to require a backend check, we ensure the proof is validated in a trusted environment. Additionally:

* The `app_id` and `action` IDs are not secret (they can be exposed in the frontend code) – they just identify your app’s verification context. However, any **API keys or secrets** (if required by Worldcoin’s API) should be kept on the server. In our case, the `verifyCloudProof` function (discussed next) will handle auth with Worldcoin’s backend via your app’s identifiers, without exposing any secret on the client.
* The IDKit widget is a self-contained iframe/modal that ensures the QR linking and proof generation process is secure and originates from Worldcoin’s official flow. You do not see or handle raw biometric data – only the resulting proof.
* The proof data (nullifier, etc.) in JS memory should be treated as sensitive until verified; our implementation sends it immediately to the server and doesn’t store it long-term in the browser. Once verified, the only thing we might keep is the `nullifier_hash` (which is an anonymous user identifier – safe to store).

## 3. Backend – Verifying the World ID Proof (Next.js API Route)

On the backend, we will verify the proof using Worldcoin’s **Developer Portal API**. Worldcoin provides a helper in the `@worldcoin/idkit` package to simplify this. We’ll create a Next.js API route (e.g. `/api/verify`) to handle the POST request from the frontend.

**Setup (Env Variables):** In the Worldcoin **Developer Portal**, register your application and create an **Action** for this verification (e.g. “Onboarding Wizard Verification”). The portal will provide you an **App ID** (often prefixed with `app_...`) and you’ll define an **Action ID** or slug (like `"my_onboarding_action"`). These should be stored as environment variables in your Railway project (for example, `APP_ID` and `ACTION_ID`), so they can be used server-side. If the Developer Portal provides an API key or secret, keep that secure as well (the latest World ID API may not require a separate secret for verification, as the proofs themselves are cryptographically tied to your app).

**Implementing the Verify API Route:** Below is a sample Next.js API route (`pages/api/verify.ts`) to handle the proof verification using the IDKit library’s backend function:

```ts
// pages/api/verify.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyCloudProof, IVerifyResponse } from '@worldcoin/idkit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const proofPayload = req.body;  // this is the object our frontend sent (ISuccessResult)

  const appId = process.env.APP_ID!;
  const actionId = process.env.ACTION_ID!;

  try {
    // Call Worldcoin's verification API via the SDK helper:
    const verification = (await verifyCloudProof(proofPayload, appId, actionId)) as IVerifyResponse;
    if (verification.success) {
      // ✅ Proof is valid: the user is a verified human for this action
      // Here we can update our database or session to mark the user as verified.
      // e.g., attach the user's World ID (nullifier) to their account, preventing duplicates.
      console.log("World ID proof verified on backend:", verification);
      res.status(200).json({ success: true });
    } else {
      // ❌ Proof invalid or already used (user might have verified before)
      console.warn("World ID verification failed:", verification);
      res.status(400).json({ success: false, error: verification });
    }
  } catch (err) {
    console.error("Error during World ID verification:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
```

Let’s break down what happens here:

* We import `verifyCloudProof` from `@worldcoin/idkit`. This function knows how to contact Worldcoin’s **cloud verification API** (Developer Portal service) to check the proof’s validity. (It effectively wraps an HTTPS request to Worldcoin’s endpoint, so you don’t have to craft one manually.)
* We retrieve our `APP_ID` and `ACTION_ID` from environment variables. These must match the same values used on the frontend widget (and the ones configured in the portal). This ensures the proof we validate is exactly for our app and action.
* We call `verifyCloudProof(proofPayload, appId, actionId)`. The `proofPayload` is the JSON our frontend sent – which includes the fields returned by the widget (it contains the proof, nullifier, etc.). The SDK sends this to Worldcoin’s verification API, along with your app and action identifiers. Worldcoin’s service then:

  * Checks that the proof is valid cryptographically (i.e., the user’s World ID was indeed part of the Orb-verified identity list represented by the `merkle_root`, and the proof wasn’t tampered with).
  * Checks that the `nullifier_hash` has not been **used before for this action** beyond the allowed limit. (If your action is one-time use per person, the first verification will mark it used; a second attempt by the same person would be flagged as already verified.)
  * Verifies the proof hasn’t expired. **Note:** World ID proofs for cloud verification expire after **7 days**. This means if a user somehow generated a proof and didn’t submit it immediately, it becomes invalid after a week. In practice, our flow submits it right away, so this is only a concern if there’s a long delay.
* The result of `verifyCloudProof` is an object (type `IVerifyResponse`) indicating success or failure. For example, `verification.success === true` means the proof is valid and the user is verified. If false, `verification` may contain an error code or message (like “already verified” if the same user tried to re-verify a one-time action).
* If verification is successful, you can safely treat the user as **verified human**. This is the place to perform any backend actions that you require for a verified user – for instance:

  * Mark the user’s account in your database as “World ID verified = true”.
  * Store the **`nullifier_hash`** in the user’s record, if you want to enforce one account per World ID. (The `nullifier_hash` is a unique hash tied to the user’s World ID and your action; more on this in the next section.)
  * You might also start a login session or JWT token for the user if this verification is part of a sign-in process. In our wizard scenario, probably the user is in the middle of onboarding, so we might just move to next step rather than log them in again.
* If verification fails, respond with an error. Our frontend will catch a non-OK response and let the widget display a message. Common failure reasons are:

  * The proof was invalid (possibly if an attacker modified something, or an out-of-date proof).
  * The user **already verified this action** previously, and our action is one-time only – in which case the Worldcoin API returns a failure to prevent double-use (sybil attack). In this case, you might inform the user they’ve already verified (perhaps they are trying to create a second account, which you may not allow).
  * Missing/incorrect app or action ID – ensure those are correct and correspond to the front-end.
* We wrap the verification call in a try/catch to handle any network errors or unexpected issues, returning a 500 if something goes wrong server-side.

Because we are using a Next.js API route, this code will run on the server (Node.js) in the Railway-hosted environment. Remember to add the required env vars (`APP_ID`, `ACTION_ID`, and any API key if provided by Worldcoin) in Railway’s configuration. These can be set in Railway’s dashboard so that at build/runtime, `process.env.APP_ID` is available. (If using Next.js 13 App Router with environment variables, ensure to prefix any variables needed on client side with `NEXT_PUBLIC_` – but in our case, `APP_ID` and `ACTION_ID` are only needed on the server for verification and possibly can be included in the widget props as literal strings. Including them as env on the client is okay since they’re not secrets, but you can also embed them directly.)

One more note: Worldcoin’s Developer Portal might require that you **register your backend’s origin or have an API key** to use the verify API. The `verifyCloudProof` helper likely handles authentication internally. (As of the latest docs, it appears you just need the correct app/action, and the Developer Portal recognizes your app’s context; no separate API key was shown in the examples.) Always double-check the official docs for any updated requirements on authentication for the verification endpoint.

## 4. Data and User Attributes from World ID

After a successful verification, what **user data** do we obtain from Worldcoin? World ID is designed with privacy in mind, so it deliberately limits the personal information shared. Here’s what you have access to and what you **don’t**:

* **Proof-of-Personhood Confirmation:** The primary “attribute” you get is a *yes/no proof* that the user is a unique human. A successful verification means:

  * The user’s World ID was verified by the Orb (assuming we required Orb level) – i.e., they are a real person and have not already created another World ID (Worldcoin enforces 1 person = 1 ID via biometric deduplication).
  * The user has not exceeded the allowed verifications for this action. In other words, if this action is meant to be one-time per person, a success means this World ID is being used for the **first time** on this action (no sybil attack).
* **`nullifier_hash` (Unique ID):** The proof object includes a `nullifier_hash` string. This is essentially an **anonymous unique identifier for the user**, specific to your app & action. You can treat it as a pseudonymous user ID. For example, if you want to track that user in your database without knowing their real identity, use the nullifier hash. Important aspects of the nullifier:

  * It’s the same every time the *same user* verifies the *same action* in your app. So if the user returns later (or tries to verify again), they will produce the same nullifier (assuming they haven’t reset their World ID). This consistency allows you to recognize repeat verifications by the same person for that action.
  * It’s **different for different actions or different apps**. If you create another action, the same person’s World ID would yield a different nullifier for that context. This prevents cross-application tracking. Only within the scope of the same app & action can the nullifier be used as the user’s stable identifier.
  * If our goal is one account per person, typically you’d use a single World ID action for all sign-ups. Then each person has one nullifier. Storing that nullifier with the user’s account lets you enforce uniqueness (no two accounts with the same nullifier).
* **`merkle_root`:** The proof payload also contains a `merkle_root` value, which is a hash of the latest World ID registry Merkle tree. It essentially attests **which batch of World IDs** the proof is valid for. This is used in verification to ensure the user’s World ID was indeed included in the registry at the time. Generally, you **don’t need to use `merkle_root` manually** – it’s there for verification. It’s not an attribute of the user per se, just part of the cryptographic proof.
* **`verification_level`:** The result tells you the level of verification used: `"orb"` or `"device"`. This indicates the assurance of humanness:

  * `"orb"` means the user was verified by an **Orb (biometric iris scan)** – a **strong proof** of uniqueness and liveness. In practice, Orb verification also implies the person is **at least 18 years old** (Worldcoin currently requires Orb users to be 18+). So indirectly, orb verification is a signal of adulthood, though Worldcoin doesn’t provide the exact age.
  * `"device"` means the user verified using a **device-based method** (no orb). Worldcoin’s docs mention a “unique mobile device check” as a medium assurance proof. Device-level might involve phone verification or simply that the user has a unique Worldcoin account on that device. It’s weaker because one person could potentially have multiple devices/accounts. In our use case, we likely won’t accept device-level if we explicitly want orb-verified humans. But if `verification_level` came back as “device” and we required “orb”, we’d treat that as not meeting the requirement (the verify API should fail in that case or our app can decide not to grant full trust).
* **No Personal Identifiers (Name, Email, etc.):** World ID is **not a KYC** system and does **not reveal personal details** about the user. The verification process is anonymous. You do **not** get the user’s name, email, phone number, physical address, or even a persistent global user ID. The nullifier is the closest thing to an ID, and it’s scoped to your app’s action. This is by design, to protect user privacy and ensure that proving humanness doesn’t mean giving up one’s identity.
* **Age:** You **cannot retrieve the user’s age** from Worldcoin. The Orb does check that users are 18+ (by policy) and may even perform an age estimation to enforce that, but as an integrator you are not provided any age data. If your wizard needs to ensure the user is adult, simply requiring Orb verification is effectively how you do that (since Worldcoin ensures only adults get Orb-verified World IDs). For stricter age or if you needed “21+” for example, World ID alone cannot guarantee that – you’d need a separate age verification process outside of Worldcoin.
* **Location:** You do not get any information about where the user is from or where they verified. The World ID proof carries no location metadata. (Even though the Orb is a physical device, Worldcoin does not share which Orb or where it was used to create the ID.) If your application needs location-based rules, you’d have to implement those separately (e.g., ask the user for permission to get their location or use IP-based geolocation – but that’s unrelated to World ID).
* **Worldcoin Account Info:** Worldcoin’s platform (World App) does have user accounts (likely tied to phone numbers or emails, plus a crypto wallet). However, in the **verification flow we used (IDKit + Developer Portal)**, none of that is shared with us. The user might have a profile in World App, but we do not see it. There is an alternate **OIDC (OpenID Connect) “Sign in with Worldcoin”** flow, where users could authorize and you’d get an `id_token` or basic profile info. That could provide an *opaque user identifier* and possibly let you fetch a **`/userinfo`** with some data, but as of now, the typical usage is to just rely on the proof. In our scenario, we only care about proof of humanness, so the OIDC route isn’t necessary. (OIDC might be useful if you wanted Worldcoin to act as a login provider – but here we are linking an existing user to World ID, not using Worldcoin for full authentication, unless we combine the concepts.)

In summary, after integration, the main *attribute* our app can utilize is **“Is Human Verified (World ID)?”** which we can store as a boolean or a verification date, plus the **nullifier hash** as the user’s unique World ID tag in our system. We know the user is real and unique, but **we won’t know who they are** – which is exactly the point of a privacy-first identity protocol.

## 5. Wizard Configuration Options (World ID Settings)

From the perspective of someone configuring this onboarding wizard (a “wizard author”), what options do we have to tweak the World ID verification step? Worldcoin’s system offers a few important settings either in the Developer Portal or via the widget configuration:

* **Requiring Orb Verification vs. Device:** As discussed, you can choose the acceptable **verification level**. In code, this is the `verification_level` prop on the IDKit widget.

  * If you require `Orb` (as we do), the user **must have an Orb-verified World ID**. This ensures strong uniqueness and implicitly an age minimum (18+). In the wizard’s context, this could be presented as “This step requires you to be World ID verified (Orb scan completed).” If a user hasn’t done an Orb scan yet, they won’t be able to pass this – they’d have to go get verified with Worldcoin’s Orb first.
  * If you allowed `Device` level, the barrier to entry is lower (anyone with the World app can verify, even without an Orb). That might increase user conversion (no need to find an Orb), but it sacrifices some uniqueness guarantees. A wizard author might choose device-level if the goal is more “prove you’re likely human (one phone = one user)” rather than strict uniqueness. It’s a trade-off between security and accessibility.
  * **Orb+ (Advanced, if available):** Worldcoin documentation also mentions an “Orb+” level (Orb verification **plus additional authentication**). This would ensure not only that the World ID is Orb-verified, but also that the person using it is the legitimate owner (perhaps requiring a fresh biometric check or a secure login to the World App). If Orb+ becomes available to developers via the SDK, a wizard could require it for even higher security. Currently, the SDK’s `VerificationLevel` covers Device and Orb; Orb+ might be automatically handled or a future option. For now, Orb is usually sufficient for “verified human” use cases.

* **Action Configuration – Max Verifications:** When setting up the Action in the Worldcoin Developer Portal, you define **how many times a single user can perform that action**. This setting has direct impact on sybil-resistance:

  * **One-Time Verification (Unique User Enforcement):** If you set **Max Verifications = 1**, it means each World ID can only succeed **once** for this action. This is perfect for something like account creation – each person can only create one account on your platform (with their World ID) because after they’ve used their ID, any attempt to reuse it will fail verification. In our wizard scenario, if linking World ID is meant to be one-time (which makes sense for initial onboarding), we would use this. It prevents someone from creating multiple accounts with the same World ID (or effectively, one person making multiple accounts). The Worldcoin backend will automatically reject a second proof from the same ID for that action.
  * **Multiple/Unlimited Verifications:** If you set **Max Verifications = 0 (unlimited)**, the action can be verified repeatedly by the same user. This might be used for recurring actions – for instance, a daily voting mechanism where the user must prove humanness each time, but you allow the same person to do it every day. In an onboarding wizard context, unlimited isn’t typical (since you usually only onboard once), but it could apply if, say, the wizard is used every time the user logs in (not common). For sign-in flows, Worldcoin actually suggests a different approach (like OIDC) rather than re-verifying each time. Generally, you’ll choose **0 (unlimited)** if you just want to check “human” every time without uniqueness, or **1** if you want one-and-done uniqueness per user.
  * **Exactly N times:** You can also set Max Verifications to some number >1 (e.g., 5). That would mean a user can use that verification up to 5 times. This is less common, but could be relevant for rate-limiting some action to a few times per person. Wizard authors likely won’t need this nuance unless designing a flow like “user can do X up to N times overall”.

* **Action Description (User Prompt):** In the Developer Portal when creating the action, you provide an **Action Name and Description**. The **Name** might be a short identifier (which could be the same as the “action” prop we use in code), and the **Description** is shown to the user in their World App when they approve the verification. It’s important this clearly describes what they are doing. For example, if the wizard is for an app called FooBar, the description might be “**Link your World ID to FooBar account (prove you’re human)**”. This way, when the World App pops up during verification, the user sees that message and can make an informed decision. While the wizard author (or developer) doesn’t dynamically set this in code (it’s set in the portal), it’s a configurable aspect of the integration. Make sure to choose a description that matches the wizard’s purpose.

* **Recent Verification / Freshness:** There isn’t a direct configuration like “user must have verified within X days”. Once a user has their World ID, it remains valid. However, **World ID proofs must be generated in real-time** for the verification – you can’t reuse an old proof. The World ID widget ensures the proof is freshly created when the user takes the action, and as noted, that proof expires after 7 days if not used. From the wizard author’s perspective, every time a user goes through the verification step, they will be doing a new live verification. So “recentness” is inherently guaranteed (they literally just did it at that moment). If the wizard wanted to ensure the user’s Orb visit was recent, that’s not something Worldcoin exposes – but arguably not needed. If someone got verified by Orb a year ago, their World ID is still valid today. There is currently no need (or mechanism) to force users to re-scan their iris periodically via World ID.

* **Additional Conditions (unsupported):** Attributes like **specific age ranges** or **geolocation** or **specific Orb venue** are *not configurable in World ID*. The protocol focuses purely on unique human verification. So a wizard author cannot, for example, say “user must be World ID verified *and* from Europe” using Worldcoin’s system alone. Any such additional criteria would have to be enforced separately in your app logic (e.g., you ask user for their country in another step). The Worldcoin proof will only tell you the user is human; it’s up to you to combine that with other data if needed.

* **Wizard Implementation Consideration:** In your onboarding builder, when a creator adds a “World ID Verification” slide, you might allow them to choose options like:

  * *“Require Orb verification (strongest)”* vs *“Allow device verification”*. This toggle in the UI would correspond to setting the appropriate verification\_level in the code.
  * *“Unique human only (one per person)”* vs *“just human (no uniqueness limit)”*. This could correspond to using a different action: one configured with max 1 vs another with max 0. Since max verifications is set in the portal, you might have to create two actions (e.g., `onboard_unique` and `onboard_any`) and use one or the other based on the wizard author’s choice. However, a simpler approach is to always enforce uniqueness (most use cases for onboarding want one account per person).
  * In most cases, the developer will decide these in advance (especially the action config). It might not be something an end-user (wizard author) toggles frequently, unless your platform explicitly wants to offer both modes.

* **UI Customization:** The IDKit widget currently provides a standard modal interface. There aren’t many knobs to customize its appearance (aside from maybe light/dark mode which often follows your site’s theme). The widget does allow you to style the trigger button as you like (since you provide the button). You might also internationalize the text “Verify with World ID” on the button if needed. If your wizard supports multiple languages, ensure the button text and any messaging around it fits the context. The modal content (scan QR code, etc.) is provided by Worldcoin and currently appears to be in English (or possibly localized by the World App). This is worth noting to authors if multi-language support is a concern – but as of now, the process is fairly intuitive (scan QR) with minimal text.

* **Testing Mode:** For development or demo purposes, Worldcoin provides a way to test without a real Orb scan (for example, a simulated verification in dev). In the docs, there’s likely a **Testing** section that explains how to use a test identity or switch the widget to a test environment. Typically, you might be given a test World ID (or you can use the World App in sandbox mode) to simulate a verification. Ensure to use this when developing on localhost or staging, so you don’t have to physically go scan your eye each time! When deploying to production on Railway, switch to your production app/action IDs.

## 6. Implementation Summary and References

Integrating World ID in a Next.js app involves both client and server coordination. To summarize the steps a developer (or a coding AI agent) would take:

1. **Register on Worldcoin Developer Portal:** Create an app and an action. Obtain your `app_id` and define your action’s parameters (name, description, max verifications, etc.). For our scenario, likely set max verifications = 1 to enforce one-time use. Make note of the `app_id` and the action identifier.
2. **Configure Next.js Environment:** Store the `APP_ID` and `ACTION_ID` in your environment (e.g., `.env` file for local, and in Railway’s environment config for production). Also, install the `@worldcoin/idkit` SDK in your Next.js project.
3. **Frontend Integration:** Insert the `IDKitWidget` in the appropriate place in your onboarding wizard component. Use the props as shown (app\_id, action, onSuccess, handleVerify, verification\_level). Implement the `handleVerify` function to call your backend API route, and `onSuccess` to continue the UX flow. Add a button or UI element to trigger the widget (the SDK uses a render prop pattern where you call `open` to launch the modal).
4. **Backend Integration:** Create an API endpoint (e.g., Next.js API route `/api/verify`) to receive the proof. Use Worldcoin’s API (via the SDK’s `verifyCloudProof` or via direct REST calls) to validate the proof data. Check the response and mark the user accordingly (success or failure). Handle any errors. This isolates trust verification on the server.
5. **End-to-End Testing:** Run through the flow in a dev environment. Use any provided test mode to simulate a user. Ensure that when a *new* user goes through, the verification succeeds, and if the *same* user tries again (and you set uniqueness), the second attempt is correctly rejected. Also test scenarios like canceling the flow, etc. Worldcoin’s docs have a “Common Pitfalls” section – for example, one common pitfall is not handling the case when a user tries to verify twice (your app should handle the 400 response gracefully, which our code does by showing an error).
6. **Deployment:** Deploy the updated Next.js app to Railway. Because we’re using environment variables, ensure Railway has `APP_ID` and `ACTION_ID` set to the production values from Worldcoin. After deployment, do a live test with a real World ID (Orb-verified account) to confirm everything works in production.

Throughout this integration, we referenced Worldcoin’s official documentation and SDK resources for accuracy:

* *World ID Developer Docs – Cloud (REST) Verification Flow:* This covers setting up actions, using IDKit, and verifying proofs on the backend. It’s the primary reference for how the front-end and back-end communicate in a Next.js context.
* *Worldcoin IDKit SDK on GitHub:* The GitHub repo `worldcoin/idkit-js` contains the source and README for the JavaScript toolkit. It’s useful for deeper understanding or troubleshooting issues (and to see if there are updates or open issues relevant to integration).
* *World ID Core Concepts:* Worldcoin’s docs on the philosophy and terminology behind World ID (e.g., explanation of proof of personhood, verification levels, nullifiers). This helps in understanding what exactly we’re verifying and storing.
* *Worldcoin Support Articles:* For general questions like age requirements or device compatibility (e.g., confirming that World ID requires 18+ for Orb).

By following this guide, a developer or AI coding assistant should be able to implement the World ID integration step-by-step. The end result will be an onboarding wizard slide that robustly verifies users as real unique humans using Worldcoin’s World ID – enhancing the trust and security of your platform’s user base.

**Sources:** Official Worldcoin World ID Documentation and SDK references were used in compiling this integration plan, including code examples and best practices from Worldcoin’s developer guides.
