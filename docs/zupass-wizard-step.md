Got it. I’ll dive into the full pod.org ecosystem—including the POD spec, GPC (Generic Proof Constraints), Z API, ticket-spec, query syntax, and @parcnet-js libraries—and outline everything your agent needs to build a robust Zupass/POD integration for both end-user and wizard-author views.

I'll return with:

* A comprehensive research summary of how the Zupass identity and proof system works
* A breakdown of the necessary tasks/modules for your app (sign-in, proof creation, proof validation, policy config)
* Clear guidance on how to architect the flow and design for flexibility, security, and future-proofing

I’ll report back shortly with findings and a proposed implementation plan.


# Integrating Zupass Identity & POD-Based ZK Proofs in Next.js

## Overview of Zupass and POD Technology

Zupass (built by 0xPARC) provides users with a private data vault for **Provable Object Data (POD)** – cryptographically signed data objects stored on the user’s device. Each POD is essentially a flat key-value dataset (entries) signed by an issuer’s private key, forming a Merkle tree of entries and a unique signature (attestation). This design allows applications to verify a POD’s authenticity by checking the issuer’s public key and to generate **zero-knowledge proofs** about the POD’s contents without revealing all data. Zupass acts as a user-managed wallet for these credentials, enabling **Zapps** – web apps that integrate with Zupass – to request proofs and share data in a privacy-preserving way.

**General Purpose Circuits (GPC):** Zupass’s ZK toolkit provides pre-built circuits and a high-level interface to prove arbitrary statements about PODs. Developers use a human-readable proof **configuration** to specify constraints on POD fields (e.g. “entry `age` > 18” or “`eventId` equals X”) and which fields to reveal or keep hidden. At runtime, the GPC library selects an appropriate circuit and generates a proof satisfying the configuration. This abstracts away low-level ZK development: no custom circuit programming is needed since a family of circuits can handle many use cases (range proofs, set membership, equality constraints, etc.). Proofs can even span multiple PODs and enforce ownership via the user’s **Semaphore identity**, linking a POD’s data to the prover’s Zupass identity without revealing the identity itself.

In the context of a Next.js app, these capabilities enable two main flows:

1. **End-User Proof Generation:** On a wizard page, a user connects their Zupass, which grants the app controlled access to the user’s POD vault. The app then requests a zero-knowledge proof (for example, “Prove you hold a valid event ticket for Event X, and reveal your ticket’s email field”). Zupass prompts the user with this request, letting them confirm and produce the proof. The app receives the proof and verifies it either on the client or server side, then proceeds accordingly.
2. **Wizard-Author (Admin) Configuration:** On an admin interface, a wizard author defines the **proof policy** for a challenge. They select which POD or credential type is required (e.g. an Event Ticket, a Membership Badge, or an Age verification credential), configure the GPC constraints (issuer’s public key, specific fields like `eventId` or `groupId`, numeric thresholds like birthdate cutoff), choose which fields will be revealed vs. kept hidden in the proof, and set any anti-replay parameters (such as an external nullifier or one-time session token). This policy is saved (versioned) so that end-users can later execute it via Zupass.

Below is a detailed breakdown of the technical components, data flows, module APIs, and recommendations for designing such an integration on Next.js.

## Data Flow Architecture

### End-User Proof Flow

**1. Zupass Connection:** When the user reaches the relevant wizard step, the app prompts them to connect their Zupass. Internally, the front-end uses the Z API’s App Connector to embed Zupass into an `<iframe>` on the page. The app calls `connect(myZapp, element, clientUrl)` – where `element` is a container in the DOM for the Zupass iframe and `clientUrl` is the Zupass client URL (e.g. `https://zupass.org` for production). On first connection, Zupass will prompt the user to grant the specified permissions to the “Zapp” (your application). These permissions are defined in a `Zapp` config object (name and allowed operations), and might include: `REQUEST_PROOF` (permission to ask for proofs from certain collections), `READ_POD`/`INSERT_POD` (to read or add data in specific collections), etc.. For example, an app might request `REQUEST_PROOF` and `READ_PUBLIC_IDENTIFIERS` permissions on the **Tickets** collection if it needs the user’s event tickets for proof generation. Once the user approves, a persistent session is established via the iframe messenger and the `connect()` call resolves to a `z` API object.

**2. Selecting Data & Generating Proof:** With a connection open, the app can request a proof. The admin-defined proof policy (see next section) will be translated into a GPC **proof request** object. This request specifies exactly what needs to be proven about the user’s data. For example, if the challenge is *“prove possession of a ticket for Event **X**”*, the proof request might require a POD in the **Tickets** collection where `eventId = X` and that POD’s issuer (signer) is the known event organizer’s public key. Another example: an *“over 18”* proof might require a POD (say, a government ID credential) where the `birthdate` is before a certain cutoff date and the credential is signed by a trusted authority’s key. These constraints are encoded using a high-level syntax (provided by `@parcnet-js/podspec` for queries and by the GPC schema for proofs). The app will typically call a method like `z.gpc.prove({ request: <proofConfig> })` to initiate proof generation. If the app uses a helper like `ticketProofRequest()` (from `@parcnet-js/ticket-spec`) for common patterns, it first constructs the request and then calls `z.gpc.prove({ request: request.schema })` under the hood.

* **User Confirmation:** Zupass will display a prompt inside the iframe for the user to authorize creating the proof. The user will see which credential is being used and what information will be revealed. (For example: “Prove you have a ticket signed by Organizer *ABC* for Event *X*. The app will see your `attendeeEmail` entry, but other fields stay hidden.”) This transparency helps prevent phishing or unintended data leaks. The user must approve before the proof is generated.

* **Proof Construction:** Upon approval, Zupass locates the relevant POD(s) in the user’s vault that satisfy the query constraints. If multiple PODs match, the user may select one; if none match, the proof cannot be made (the app should handle this case gracefully by informing the user or allowing an alternate path). Zupass then supplies the chosen data to the GPC circuit. The GPC system verifies the POD’s Merkle proof and signature inside the ZK circuit (ensuring the data is authentic and meets all conditions) and produces a cryptographic proof attesting to the required claims. This is typically a zero-knowledge SNARK proof; Zupass manages the heavy lifting of circuit selection, witness generation, and proving key usage automatically.

* **Proof Result:** The result returned to the app (via the `z.gpc.prove` promise) includes:

  * a `proof` (serialized ZK proof data),
  * a `boundConfig` or proof configuration (the fully bound circuit inputs/config used, which is needed for verification),
  * and `revealedClaims` – the specific pieces of data that the proof reveals. For instance, `revealedClaims` might confirm “email\_address = [alice@example.com](mailto:alice@example.com)” (if that field was set to reveal) and will include any public inputs like lists or ranges used in constraints. In our ticket example, the revealed claims would show the `attendeeEmail` from the user’s ticket and also echo the event’s allowed `(signerPublicKey, eventId)` pair that was proven. Notably, the proof does **not** reveal secret data or unrelated fields – anything not explicitly marked for reveal remains cryptographically hidden.

**3. Proof Validation:** The app must then **verify** the proof to ensure it is valid and satisfies the intended policy. If the logic gating access is entirely on the client (e.g. just guiding UI flow), a client-side verification might suffice. However, **for security it’s recommended to verify on the server** before granting any sensitive reward or access. The proof verification uses the GPC verifying key and the `boundConfig`/public inputs to check that the proof is mathematically correct and corresponds to the expected constraints. The Zupass API does provide the raw pieces to do this manually (and the PCD libraries include a `gpcVerify` function), but in practice you might use the packaged artifacts. For example, the `@pcd/gpc` SDK allows verifying by calling `gpcVerify(proof, boundConfig)` with the appropriate circuit artifacts (which can be downloaded via `@pcd/proto-pod-gpc-artifacts`). On the backend (Next.js API route or serverless function), you would load the verification key (either by referencing a hosted artifact URL or including a small proving bundle) and run this check. Verification confirms: (a) the proof itself is valid (not forged), and (b) the public outputs (the revealed claims, list memberships, etc.) match what was expected by your challenge. If verification passes, the server can then trust the `revealedClaims` data. If the proof is invalid or doesn’t match policy, reject the attempt.

*Client vs Server:* Note that if the proof is generated and used on the same frontend, one might skip verification for convenience, but this is discouraged for important flows. A compromised client or logic bug could otherwise accept a false proof. In most cases, treat the proof like user-provided data: **verify it on a trusted side** (server or secure backend) before proceeding. This is especially true since the proof might be presented to gain access or claim something of value. The Next.js architecture allows using API routes (serverless functions) to receive the proof and run verification in Node.js. The PCD libraries are compatible with Node and even provide polyfills for any needed modules to run in that environment. After verification, the server can respond with success (or additional info gated on the proof).

**4. Using the Proof Outcome:** Once validated, the app can respond accordingly. In a wizard context, this could mean marking that step as complete (the user has proven the necessary condition). If the proof revealed some data needed for further processing (e.g. an email address or a user ID), the app can utilize that directly from `revealedClaims`. The server might also store a record of the proof occurrence – especially if you want to prevent re-use (see Security below). For example, the server could log the `nullifierHash` (a pseudonymous user identifier derived from their Zupass identity) to ensure the same user doesn’t repeat the challenge for another reward. Finally, the UI can show the user a success message and allow them to move to the next step of the wizard.

### Wizard-Author (Admin) Configuration Flow

From the admin’s perspective, the flow involves designing and saving **Proof Policies** that define the Zupass challenges in the wizard. This typically happens in an admin dashboard of the Next.js app:

**1. Selecting POD Type/Collection:** The admin first chooses what kind of credential or data the user must provide. This could map to a known **collection** in Zupass (collections are like folders or categories of PODs) or a specific schema of POD. For example, Zupass by default has a **“Tickets”** collection for event tickets. Other collections might include things like “ID Documents”, “Memberships”, or app-specific ones. If the admin wants to require a Devcon ticket, they’d pick the “Tickets” collection. If it’s a custom credential (say issued by their own app), they might have defined a custom collection name when building the Zapp (collections can be created simply by inserting PODs under a new name). It’s wise to also filter by a **pod\_type** tag if available, to ensure the correct POD schema is used (the `pod_type` entry is a convention to label the schema/purpose of a POD). For instance, a “membership badge” POD might carry `pod_type = "com.example/membership"` internally, which the policy could look for.

**2. Defining GPC Constraints:** Next, the admin specifies what conditions the POD must satisfy. A user-friendly UI might present this as a form:

* **Issuer (Signer Public Key):** If the credential must come from a specific trusted issuer, the admin should provide that issuer’s public key (likely as a Base64 string or QR scan). For example, if all valid tickets are signed by the event organizer’s key, include that. In the proof config, this becomes a constraint on `signerPublicKey`. Zupass’s query syntax allows matching on non-entry fields like the signer key and signature. By constraining the signer, we ensure the POD was issued by a trusted authority, not self-signed by the user. (As the docs note: always verify the public key of the issuer for critical data; a malicious or user-generated POD should be treated like untrusted input).
* **Specific Fields Constraints:** The admin can add one or more field requirements. Common examples:

  * **Equality or Set Membership:** e.g. `eventId` must equal a specific event GUID. Or `groupId` must be one of a list of allowed group IDs. The UI could let the admin type a value or paste a list (for multiple valid options). This translates to an `isMemberOf` constraint on that field in the proof config. In the ticket spec, providing an `eventId` and signer key essentially builds an allowlist tuple of `(signerPublicKey, eventId)` that the proof must match. Only credentials with both values matching will satisfy the proof.
  * **Numeric Ranges:** e.g. `birthdate` before `2005-01-01` to enforce age ≥ 18. The UI might allow choosing an operator like “≤” and a date, which internally is converted to an `inRange` on an integer timestamp or a comparison in the circuit. The POD spec supports `inRange` for integers. If using date entries, those might be stored as ISO strings or as nested `{ date: ISOString }` structures (the example POD format shows dates as objects), so the app may need to convert to an integer timestamp for the proof circuit.
  * **List Inclusion/Exclusion:** For fields that should be one of several values, admins provide the allowed set. For instance, a “membership level” could be Gold/Silver, etc., and you only accept Gold or Silver (excluding Bronze). This again uses `isMemberOf` (or `isNotMemberOf` for exclusion) in the constraint DSL.
  * **Multiple Field Relations:** In advanced cases, an admin might enforce relationships (like two fields must be equal, or a combination of fields matches an allowed tuple as shown in the “virtual entries in tuples” example). The UI could support adding such tuple constraints, but these are more complex and likely pre-templated in known scenarios (e.g., the ticket case is essentially a tuple of `$signerPublicKey` and `eventId`).

Each constraint the admin defines will become part of the GPC proof config. Under the hood, you’ll likely use the `@parcnet-js/podspec` utilities to construct these conditions in code (it provides functions like `p.pod({ entries: { fieldName: { type, value or isMemberOf… }}})` as seen in the Z API docs). For common credential types, specialized helper packages exist – e.g. `@parcnet-js/ticket-spec` allows building a proof request for tickets by simply passing the known parameters.

*Example:* An admin configuring a Devcon ticket proof would select **Tickets**, input the Devcon event’s UUID for `eventId` and the organizer’s public key, then maybe check a box to reveal the email. The resulting proof policy might be serialized as JSON:

```json
{
  "collection": "Tickets",
  "constraints": {
    "signerPublicKey": "<DevconPubKeyBase64>",
    "eventId": "<DevconEventID-UUID>"
  },
  "revealFields": ["attendeeEmail"],
  "externalNullifier": "Devcon2025Proof", 
  "name": "Devcon Ticket 2025",
  "version": 1
}
```

This is a simplified representation – internally the proof config that Zupass uses would be more nested. For instance, `constraints` might be represented as an allowed tuple: `[ {type:"eddsa_pubkey", value: DevconPubKey}, {type:"string", value: EventID} ]` under an allowlist for entries `$signerPublicKey` and `eventId`. But as far as the admin UI, a structure like the above is easier to manage.

**3. Choosing Revealed vs Hidden Fields:** The admin should explicitly mark which fields (if any) will be revealed to the verifier. By default, all fields can remain hidden in the ZK proof (meaning only the fact they satisfy constraints is proven, not their actual values). However, often an application needs some data out of the credential. For example, you might want to actually know the user’s email from their ticket to check against a registration list, or you might want to display the event name on a confirmation screen. The admin interface can present a checklist of available fields in the POD and allow toggling “reveal this field”. Technically, this sets `isRevealed: true` for those entries in the GPC config. In the ticket proof builder, it’s done via a `fieldsToReveal` object map (e.g. `{ attendeeEmail: true, ticketId: true }`). The effect is that those entries appear in the `revealedClaims` of the proof result, visible to the app/verifier, while unrevealed entries remain cryptographically hidden (only their satisfying of constraints is proven). A good UI practice is to show the admin a preview like “This proof will **reveal**: Attendee Email, Ticket ID; and will hide all other fields.” so they understand the privacy impact.

**4. Setting External Nullifier (Anti-replay):** The admin can optionally provide an **external nullifier** string for the proof policy. An external nullifier is a constant value that gets mixed with the user’s Zupass identity to produce a **nullifier hash**. In simpler terms, it’s an application-specific tag that ensures a user’s identity is only consistent within that context and can be used to detect if the *same user* tries to reuse a proof. For instance, if your application (or specific challenge) uses `externalNullifier = "Devcon2025Quest"`, then any proofs generated for this challenge by the same user will output the same `nullifierHash`. Different users will have different hashes, but one user re-attempting will be recognized by the matching hash. The admin should choose a nullifier string unique to the challenge (the default could be some slug of the challenge name). The UI can explain that enabling this allows the system to prevent a proof from being replayed or a user completing the challenge multiple times under different sessions. Under the hood, this value is passed in the proof request (`externalNullifier: {type:"string", value: "…"} `).

*Note:* External nullifier is crucial for **cross-application privacy** as well – it prevents the same user’s nullifier hash from being identical in two different apps. Zupass uses the provided string to scope the nullifier; e.g. using your app’s domain or challenge name ensures that even if the user uses Zupass elsewhere, their nullifier hash there won’t match yours. This design maintains anonymity across platforms.

**5. Versioning and Saving Policy:** Once configured, the admin saves the proof policy (likely into a database or a JSON file under version control). Versioning is important – if you later update the constraints (say you change the age cutoff or add a new allowed eventId), that constitutes a new version. We recommend including a `version` field or using a distinct identifier for each policy revision. The Next.js backend can store these policies and serve the relevant version to the client when the wizard runs. For example, the wizard might reference the policy by an ID (like `policyId = "devcon2025_v1"`) so that the app knows which constraints to enforce for that challenge. It’s wise to **embed the version info into the proof request** too (perhaps as part of the external nullifier or a dedicated revealed field) so that when verifying, you know which policy was used. This could simply be a revealed entry like `"version": "1.0.0"` inside the POD (as seen in the Meerkat example POD) that you also check for. Or the server can trust that it only ever gave out the specific proof config to the client. Either way, keeping policies versioned helps avoid confusion if policies change while some users still carry old proofs.

**6. Wizard UI Integration:** After saving, the admin’s configured challenge can appear as a step in the end-user wizard. The front-end will load the corresponding proof config when it needs to run that step. It might fetch from an API the JSON policy or have it pre-loaded. The user-facing text can also be driven by the policy (e.g. “Connect your Zupass to prove **X**”). For usability, the admin might also set a description for the challenge that is shown to users.

In summary, the admin flow results in a well-defined **proof policy schema** that the app will use to invoke Zupass. The schema encapsulates: target collection/type, required field constraints, allowed issuers, which fields to reveal, and anti-replay parameters (nullifier or one-time watermark as discussed below). This abstraction allows non-technical admins to configure ZK-protected interactions without coding, while ensuring the underlying cryptographic policy is precise.

## Zupass Integration & Helper Modules in Next.js

Implementing the above flows requires using the pod.org Z API and related JavaScript libraries. Here’s an outline of the recommended architecture and modules:

**1. App Connector Setup (`@parcnet-js/app-connector`):** Include this package in your Next.js frontend to handle the Zupass connection iframe. After installing (`npm i @parcnet-js/app-connector`), import the `connect` function and define your Zapp’s metadata. For example:

```ts
import { connect, Zapp } from "@parcnet-js/app-connector";

const myZapp: Zapp = {
  name: "MyWizardApp",
  permissions: {
    READ_PUBLIC_IDENTIFIERS: {},               // to read user’s public key (if needed)
    REQUEST_PROOF: { collections: ["Tickets", "Memberships"] },
    READ_POD: { collections: ["Tickets"] }     // if you need to read any POD content
    /* ...INSERT_POD, SIGN_POD if your app will issue new PODs... */
  }
};
```

This configuration names the app and enumerates what it will do. **Least privilege** is key: request only the permissions and collections needed. In the above, we allow proof requests involving the “Tickets” and “Memberships” collections. If our app wanted to also insert new PODs (e.g. issuing a credential), we’d include `INSERT_POD` on a collection. Zupass will present these to the user on first connect, and the user can approve or deny each scope.

Next, ensure you have a dedicated HTML element to host the Zupass iframe. For example, in a React component you might have:

```jsx
<div id="zupass-connector" style={{ display: 'none' }} />
```

and pass that element to the connect function:

```ts
const element = document.getElementById("zupass-connector");
const z = await connect(myZapp, element, "https://zupass.org");
```

The container can be hidden or offscreen, as it’s just for message passing. (Do not remove or dynamically alter this element during the session, as it will disrupt the connection.) The third parameter is the Zupass client URL – in development you might use a local Zupass instance (like `http://localhost:3000`), but in production it should be the official URL. **Security tip:** Hardcode or carefully control this URL so that attackers cannot swap it out; it ensures you’re embedding the legit Zupass interface and not a phishing iframe.

The `connect` call yields a `z` object that serves as the API bridge. Through this `z`, you can call methods to sign PODs, insert/delete, query, and generate proofs:

* `z.pod.sign(data)`: to sign a new POD with the user’s identity (if permission granted).
* `z.pod.collection("Name").insert(pod)` / `delete(signature)`: to add or remove a POD in a collection.
* `z.pod.collection("Name").query(querySpec)`: to retrieve PODs matching a query spec.
* `z.gpc.prove({ request: proofRequest })`: to prompt the user for a proof as covered earlier.
* (There may also be `z.gpc.verify` on the client, but often you’ll verify externally.)

The app connector abstracts the cross-window communication; when you call these methods, under the hood it posts a message to the Zupass iframe, which performs the action (possibly prompting the user) and returns the result. This means most operations are async and tied to user approval. From a UX perspective, ensure your UI indicates when it’s waiting on Zupass (e.g. “Waiting for Zupass confirmation…”).

**2. POD Data Structures (`@pcd/pod` and `@parcnet-js/podspec`):** If your app only *reads and proves* existing user data, you might not directly use low-level POD libraries. But it’s useful to understand them:

* The `@pcd/pod` package provides classes like `POD` and `PODEntries` to create or parse POD objects. For example, a backend service could use `POD.sign(entries, privateKey)` to issue a new credential and then serialize it for the user. In-browser, you typically rely on `z.pod.sign()` instead, which uses the user’s Zupass key.
* The `@parcnet-js/podspec` (or similarly named in PCD SDK) helps build query objects to filter PODs. We saw examples like:

  ```ts
  import * as p from "@parcnet-js/podspec";
  const query = p.pod({
    entries: { greeting: { type: "string" }, magic_number: { type: "int" } }
  });
  const results = await z.pod.collection("CollectionName").query(query);
  ```

  This would find all PODs in that collection having a string `greeting` and int `magic_number` entry. More complex constraints like membership and ranges are also available in this DSL. The same `podspec` definitions are reused in proof configs. Essentially, you describe what structure/values a POD must have, and that spec is used both for searching and for proving. For proofs, however, the spec is compiled into a circuit input. You might not call `podspec` functions directly if using a higher-level proof builder (like `ticketProofRequest`), but it’s the underlying mechanism.

**3. Ticket and Prebuilt Schemas (`@parcnet-js/ticket-spec` & others):** For common use-cases like event tickets, the tooling provides specialized modules. `@parcnet-js/ticket-spec` is one such module that knows the standard structure of a Ticket POD. Using it, as shown earlier, you can create a proof request in a few lines:

```ts
import { ticketProofRequest } from "@parcnet-js/ticket-spec";
const request = ticketProofRequest({
  classificationTuples: [{ signerPublicKey: "...", eventId: "..." }],
  fieldsToReveal: { attendeeEmail: true },
  externalNullifier: { type: "string", value: "APP_SPECIFIC_NULLIFIER" }
});
const result = await z.gpc.prove({ request: request.schema });
```

This will construct the appropriate GPC config under the hood – including a tuple constraint for the signer/event, marking `attendeeEmail` as revealed, and incorporating the external nullifier. We get back the proof result as usual. The advantage of such a helper is that it ensures you use the correct field names and formats that the ticket circuit expects (e.g., a Devcon ticket POD likely has entries named `eventId`, `attendeeEmail`, etc., so the spec uses those exact names). If you have other structured credentials (like perhaps an ID with `birthdate`), you may have similar spec modules or you can create your own builder to simplify admin-defined policies. For custom schemas, writing a small helper that takes your policy JSON and produces a `proofRequest` object (using `podspec` and GPC types) will reduce boilerplate.

**4. Proof Verification Modules:** On the server side, you’ll likely use the PCD packages to verify proofs. The core is `@pcd/gpc`. This library includes:

* Types like `GPCProofConfig` and `GPCBoundConfig` which represent the proof structure and the bound instance.
* Functions `gpcProve()` and `gpcVerify()` for generating and checking proofs outside of Zupass. In the Zupass context, you won’t call `gpcProve()` manually (Zupass does that), but you could call `gpcVerify` on your backend.
* A utility `gpcArtifactDownloadURL(circuitId, artifactType)` which helps locate the proving and verification keys, and wasm, needed for a given circuit size. The circuits are parameterized by the number of PODs and constraints; the library will choose one, and the `boundConfig` likely includes an identifier for which circuit was used. Using that, you can fetch the matching verification key (vk) file. The artifacts are large, so they’re not bundled by default; you either use this downloader at runtime or pre-fetch and cache the ones you need. In a serverless function, you might fetch the vk on cold start and then reuse it for multiple verifications.

In practice, the verification code might look like:

```ts
import { gpcVerify } from "@pcd/gpc";
// Suppose we have proof, boundConfig JSON from client
const verified = await gpcVerify(proof, boundConfig);
if (!verified) throw new Error("Proof verification failed");
```

The `boundConfig` contains all public inputs including any lists (membership lists), revealed entries, nullifier, etc., so the verify function knows what was proven. You may compare some of those values to your expected policy as an extra safety (e.g. ensure the `signerPublicKey` in the revealed claims matches the one you intended, in case you allow dynamic policies).

If you prefer not to use the PCD JS verification (or if performance is a concern), an alternative is to perform verification in a different environment. Since the circuits are Groth16 or similar, you could use a known verifier in Rust or wasm with the verifying key. But given that `@pcd/gpc` is meant to be used in Node and browser with minimal fuss, it’s usually easiest to stick with it.

**5. Handling POD Content (Optional):** Sometimes you might want to read or display some POD data to the user before proof. For instance, your app might want to show “You have 3 tickets in your Zupass. Select one to use for this proof.” This can be done by querying the vault via `z.pod.collection("Tickets").query(...)` and then filtering by your criteria (or constructing an identical query as your proof and seeing what comes back). The query result gives actual `POD` objects, from which you can extract entry values. Each `POD` has methods like `.content.asEntries()` to get the entries as a JS object and `.signature` for its signature ID. This way, you could present a list of ticket names or events to the user. However, be cautious: reading PODs reveals all their content to your app, so only do this for non-sensitive fields or with user consent. In many cases, it’s not needed because Zupass’s proof request flow already lets the user pick which credential to use. So you might opt to directly call `prove()` and let Zupass handle selection, keeping your app oblivious to the other data.

**6. Identity Data:** The `READ_PUBLIC_IDENTIFIERS` permission, if granted, allows your app to know the user’s identity commitments (Semaphore public signals) and public key. This can be useful if you need to record the user’s identity (e.g., to associate multiple proofs from the same user or to prevent Sybil attacks by limiting one identity per something). Typically, though, using the nullifier hash is sufficient for pseudonymous tracking. If needed, `z.identity.getCommitments()` might provide the user’s identity commitment (v3 or v4). Most often, you don’t need to manually use this; the proof’s nullifier and any owner proof (see below) cover the identity linkage in a privacy-preserving way.

In summary, Next.js can accommodate all these via its React frontend (for connecting to Zupass and initiating proofs) and API routes (for verifying proofs or issuing credentials). The provided SDKs are TypeScript-friendly and can be integrated as modules in your app. Make sure to follow the latest docs on `pod.org` and `docs.pcd.team` for any updates, as the ecosystem is still evolving (beta). For example, if there are changes in circuit versions, you’d update the artifact package accordingly.

## Proof Policy Schema Design

Internally, you will need a **schema** or data model to represent the proof policies configured by the admin. This schema bridges the admin UI and the proof generation code. Here’s a recommended approach for a **generic proof policy structure**:

```ts
type ProofPolicy = {
  id: string,                     // unique identifier (could encode version too)
  name: string,                   // human-readable name (for admin/UI)
  collection: string,             // name of the POD collection (e.g. "Tickets")
  podType?: string,               // optional expected pod_type tag for extra safety
  constraints: FieldConstraints,  // see below
  allowSigners?: string[],        // list of allowed issuer public keys (base64 strings)
  revealFields: string[],         // list of entry names to reveal in proof
  enforceOwner?: boolean,         // whether to enforce user is owner of credential
  externalNullifier?: string,     // external nullifier string for nullifier hash
  watermark?: boolean,            // whether to use a one-time watermark per proof
  version: number                 // version number of this policy
};

type FieldConstraints = { [fieldName: string]: Constraint };
type Constraint = 
  | { eq: string | number | boolean }          // equals a value
  | { in: Array<string | number> }             // is one of the values
  | { range: { min?: number; max?: number } }  // lies in an inclusive range
  | { exists: boolean }                       // whether the field must exist (true) or not (false)
  // etc., can be extended for more complex relations or tuples as needed
```

This is a conceptual schema for how you store it in a database or config file. An admin’s inputs populate this structure. For example, the earlier Devcon ticket policy might instantiate as:

```json
{
  "id": "ticket_devcon2025",
  "name": "Devcon 2025 Ticket Holder",
  "collection": "Tickets",
  "constraints": {
    "eventId": { "eq": "5074edf5-f079-4099-b036-22223c0c6995" }
  },
  "allowSigners": ["YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs"], 
  "revealFields": ["attendeeEmail"],
  "enforceOwner": true,
  "externalNullifier": "Devcon2025Quest",
  "watermark": true,
  "version": 1
}
```

Here:

* `constraints.eventId.eq` is a specific UUID the ticket must have.
* `allowSigners` contains one public key (say, the Devcon ticket issuer’s key) that the POD’s signer must match.
* `enforceOwner: true` means we expect the POD to have an `owner` entry that matches the user’s identity (we’ll require that in the GPC config).
* `externalNullifier` and `watermark` are set (more on watermark below).
* `revealFields` lists that we will reveal the attendee’s email.

When it’s time to generate a proof request from this policy, the app’s code will translate this into the format the GPC library expects:

* It will construct a `podspec` query for the entries: e.g. `eventId` must equal that UUID. If multiple constraints in `constraints`, include them all under `entries` in the spec.
* It will add a signer filter. If `allowSigners` is provided, and only one key is allowed, it could put a direct `signerPublicKey: { isMemberOf: [thatKey] }` in the spec. If multiple signers allowed, list them. In the ticket example, it might instead use the tuple form: a tuple of \[`$signerPublicKey`, `eventId`] in an allowlist. The `ticketProofRequest` essentially did that by `classificationTuples`.
* If `enforceOwner` is true, add an identity binding. Typically, this means the POD is expected to have an entry (say `owner` or `attendeeId`) of type eddsa\_pubkey that equals the user’s public key. There’s a special `isOwnerID: true` flag in the GPC config that can enforce this without revealing the actual key. Under the hood, that uses the user’s Semaphore identity secret to prove knowledge of that pubkey. So your builder will mark the appropriate entry with `isOwnerID: true` in the GPCProofConfig if you want to ensure the prover actually owns the credential. (If your credential uses a different field name for owner, you’d specify that name).
* Set the `isRevealed` flag for each field in `revealFields`. This corresponds to adding those to `fieldsToReveal` in something like `ticketProofRequest` or setting each entry’s config `{ isRevealed: true }`.
* Attach the `externalNullifier` string if present. And if `watermark` is true, generate a random session-specific watermark (discussed below) and include it.

The output of this transformation is the JSON that you pass to `z.gpc.prove`. You don’t need to store the full expanded proof config for each policy in the DB – just store the abstract policy and compile it at runtime. This ensures that improvements to how constraints are encoded can be updated in code without changing the stored schema.

By designing the schema in a generic way, you can support future extensions (e.g., maybe allow specifying that one field should equal another field’s value, etc.). The UI can be built to populate this schema, and it serves as documentation of what each challenge is enforcing.

## Wizard Authoring UI Design

For the admin user interface, aim to make configuring a Zupass challenge as intuitive as filling out a form. Here are suggested UI components and workflow:

* **Credential Type Selection:** Provide a dropdown or set of buttons for common credential types (e.g., “Event Ticket”, “Membership Badge”, “Government ID”, “Custom POD”). Choosing one can preload some field options. For instance, “Event Ticket” could automatically select the **Tickets** collection and surface fields like Event ID, Ticket ID, Attendee Name/Email, etc., because those are standard for tickets. (These could be derived from a known schema or simply documented conventions that your app is aware of.)

* **Issuer Specification:** If applicable, have a field for “Required Issuer Public Key”. This can be a text box expecting a base64 public key string (with validation of length/format) or even integrated with a registry of known issuers (if your app has that). For usability, allow an alias or name if you maintain a list (e.g. if the admin can select “Devcon Organizer Key” and your system knows the actual key string).

* **Field Constraints Builder:** List the fields that can be constrained. This list might come from a template (for a known type) or be dynamic (for custom, let them add any field name). For each field:

  * Let the admin choose a **type of constraint**: e.g. “equals”, “one of”, “numeric range”, “exists/required”.
  * Provide input controls accordingly:

    * For equals: a single text field (or date picker if expecting date, etc.).
    * For one-of: a multi-value input (they can add multiple allowed values).
    * For range: two number pickers or date pickers for min and max.
    * For boolean fields: maybe just a toggle (True or False required).
    * If no specific constraint, they leave it blank (or use an “exists” toggle to indicate the field just must exist without caring value).
  * If the field is not relevant, they can omit it entirely.
  * Example: For “Age verification”, you might have a field `birthdate` with a “before \[date]” constraint (which you implement as `max` of that date’s timestamp).
  * The UI should prevent conflicting constraints (e.g. they shouldn’t input both an equals and a range on the same field).

* **Reveal Fields Selection:** Show a checklist of all available fields (again from the template or ones they’ve added). The admin ticks the ones that should be revealed to the verifier. Provide guidance here: e.g. “Only select fields that you absolutely need to see. Unchecked fields will remain secret (only proven).” For a ticket, they might check “Attendee Email” and “Ticket ID” if they need those to fulfill business logic, but leave things like “seat number” or “other personal info” unchecked.

* **Ownership Enforcement:** If the credential type naturally includes an owner’s identity (like many will have an `owner` or similar entry), include a checkbox like “Require proof of ownership (user must be the owner of this credential)”. If checked, the system will add the `isOwnerID` constraint on that field. This is important for non-transferable use-cases. For example, an event ticket might be transferable, so an admin might leave this **unchecked** if they are okay with any holder of the ticket using it. But for a personal ID or membership, they’d check it to prevent someone else’s credential being used. (Behind the scenes, if checked, ensure the field name in the POD that holds the user’s pubkey is known – e.g., if it’s a government ID credential, it might be `holderPublicKey`; you may need templates or config to map “enforceOwner” to a specific field name per credential type.)

* **External Nullifier and Replay Settings:** Most of the time, the admin doesn’t need to worry about external nullifier – you as the developer can set a sensible default (like use the app or challenge ID). However, if you want to expose it, label it “Application scope (nullifier)” with explanation like “This ensures users can’t complete this challenge more than once. Change this value if you want to isolate this challenge’s proofs from others.” It could be prefilled with a default (e.g. your app name or challenge name). Probably simpler is to always set it behind the scenes to the policy `id` or a constant and not burden the admin with it.

  * For one-time proofs, a more concrete feature is **Watermark (one-time code)**. This you might not expose in the static policy at all, because it’s something generated per proof request. Instead, design the system to automatically use a watermark when verifying (discussed below in security). The admin could have an option “Disallow proof replays” which if checked, means your verification will require a server-generated nonce. Usually you’d always want that for a secure workflow, so it might not need to be optional. It’s more of a developer concern to implement.

* **Policy Summary and Save:** At the bottom, show a summary: e.g. *“Users must present a **Ticket** from **Tickets** collection, signed by **Key XYZ** with **eventId = 1234**. The proof will reveal **attendeeEmail**. The user’s identity must match the ticket’s owner. Replays are prevented.”* This helps the admin verify everything. Then they can **Save** (creating a new policy version or new entry). If editing an existing policy, saving might create a new version or update if you allow editing (careful with active challenges if edited).

* **Listing and Versioning:** On the admin dashboard, list existing policies with their version and perhaps allow cloning/updating. If a policy is updated, you might automatically increment version. Ensure the wizard for end-users references the correct version (for instance, store a reference to the policy version in any content or page that invokes it).

* **Testing Mode:** It can be very useful to have a test function where an admin can simulate the proof request (maybe in a safe environment or with their own Zupass) to ensure it works as intended. This could be a “Test Proof” button that uses the config to attempt a proof and logs the outcome (without needing to integrate into a full user flow). It might simply call the same `z.gpc.prove` but perhaps in a development mode.

**UI Technology Considerations:** Since Next.js uses React, you can manage form state for the policy easily and perhaps use a state management (like Redux or useContext) if the config is complex. Make sure to validate inputs (e.g. valid dates, numeric ranges make sense like min ≤ max, public keys of correct length). Also consider accessibility – label fields clearly (“Event ID (UUID)”), provide help tooltips for concepts like external nullifier or owner enforcement, etc. This is a specialized interface, so documentation or inline explanations will help non-technical admins.

In summary, the admin UI should abstract cryptographic jargon into business terms: “Which credential do you need? From whom? What specifics? What should we show from it?” The underlying system will then generate the appropriate proof constraints. By making this flexible, your platform could support many kinds of challenges using the same UI framework, simply with different field names and parameters.

## Security and Edge Case Checklist

Integrating identity and ZK proofs requires careful handling of security details. Below is a checklist of important considerations and how to address them:

* **Trusted Issuers:** Always ensure that any credential your app relies on comes from a **trusted signer**. Use GPC constraints on `signerPublicKey` to accept only known public keys. This prevents a user from presenting a self-signed POD with fake data. If your use-case intentionally allows user-generated data (less common in proofs), treat it as untrusted input and validate its contents carefully. In most cases, limiting by signer is the first line of defense for data integrity.

* **Proof of Ownership:** If the real-world scenario requires that the user proving is the rightful owner of a credential (non-transferability), enforce it in the proof. Either require the credential to include an owner entry (public key of user) and use `isOwnerID` in the circuit, or ensure the user’s identity is somehow tied. Without this, a user could potentially use someone else’s credential if they obtained the signed POD (the ZK proof itself doesn’t automatically link to who is proving, unless you add constraints or use the identity’s nullifier as described below). The **owner field approach** is recommended for personal credentials: e.g., an ID card credential might embed the user’s pubkey as an entry, so only that user can prove it (they supply the secret to show knowledge of that pubkey). The Meerkat Devcon example shows an `owner` entry with an eddsa\_pubkey inside the POD – the proof can require that matches the prover’s identity. If using `ticketProofRequest`, note that it doesn’t automatically enforce ownership (since tickets are often transferable), so decide based on your needs.

* **Nullifier Usage (Preventing Multiple Use):** The **nullifier hash** is a powerful feature for preventing Sybil attacks and double-claims. It provides a consistent pseudonymous ID for the user per application or context. **Use a fixed external nullifier for each challenge/policy** (e.g., the policy ID or app name) so that the same user will always produce the same nullifier hash when completing that challenge. On your server, keep a record of seen nullifier hashes for one-time events. For example, if nullifier `N` has completed challenge X and the reward is meant to be once per user, you can refuse another proof with the same `N`. This stops a user from doing the proof multiple times under different sessions or devices. Also, because the nullifier is blinded by the external string, the user’s identity remains hidden (you just see a random hash like the one in the earlier example). Do not reuse the same external nullifier across completely unrelated applications – that would make the nullifier hash a cross-app identifier, harming privacy. In our case, keeping it to your app or specific challenge is fine.

* **Watermark (Replay Protection):** Even with nullifiers, there’s a nuance: a malicious user could record a proof and try to replay it later or share it with someone. Nullifier alone only helps identify the user; if your process doesn’t store used nullifiers (or if a different user tries using the same proof file, which would have a different nullifier so that wouldn’t match anyway), you need another layer. The **watermark** is essentially a one-time nonce that you generate server-side and include in the proof request. Think of it like a challenge token. The recommended workflow is:

  1. User initiates the proof challenge, your server generates a random token (e.g. UUID or large random number) and stores it (maybe in the user’s session or DB).
  2. Include this token in the proof request as the `watermark` field.
  3. After proof, when you verify on the server, check that the `watermark` in the `revealedClaims` or bound config matches the one you issued and that it’s still valid (and then mark it as used). This ensures the proof was freshly made for this request and not a replay of an old proof.

  * The watermark technique is explicitly suggested in pod.org docs for unique session IDs. It guards against a scenario where, say, someone intercepts a proof and tries to reuse it, or a user tries to submit an old proof to skip a step.
  * Implementing this in Next.js could mean your API route for starting the proof returns a `watermark` token which the front-end passes into the proof request. The verify API then checks it. Use secure random generation and perhaps expiration for these tokens.

* **Phishing and UI Security:** Because the user is dealing with connecting an identity vault, you should mitigate phishing risks:

  * Always embed the official Zupass URL (or your own trusted Zupass instance). Do not load third-party URLs into the app connector. The user should see the familiar Zupass interface. Any time they are prompted for a proof or to sign a POD, it will be within that iframe which is presumably trusted. Educate users (via UI text) to only approve requests that they initiated and to be cautious if something looks suspicious.
  * Your app should clearly indicate the actions. For example, label the connect button “Connect Zupass” with the Zupass logo perhaps, so users know it’s legit. This reduces the chance they think it’s some random popup.
  * If your app or any integration ever needs the user’s public key directly, use the API rather than asking the user to copy-paste it, to avoid social engineering.
  * On the admin side, validate any public keys they input for signers against expected formats (to avoid trivial typos which could result in accepting the wrong signer’s data).

* **Data Privacy (Reveal Minimization):** Follow the principle of **least revelation**. Only reveal fields that are necessary for functionality. For instance, if verifying age, you likely don’t need to reveal the exact birthdate – you can just prove the age condition with no reveal, or at most reveal a boolean “over18: true” claim. In the proof config, keep `isRevealed: false` on everything possible. This minimizes exposure if any logs or outputs leak. Also, instruct admins during configuration about this trade-off.

* **Signature Verification:** Normally, the ZK circuit ensures the POD’s internal signature is valid (so one cannot forge a POD and make a proof on it – the proof generation would fail if the signature didn’t check out for the claimed public key). However, if you ever directly accept a POD (like via a read API) outside of proofs, make sure to verify its signature with the purported signer’s public key. The PCD SDK’s `POD.verify()` can be used in those cases. Within the ZK proofs, trusting the proof is sufficient because it implicitly confirmed the signature (assuming the circuits indeed include that logic for allowed signers).

* **Error Handling & UX:** Be prepared for edge cases such as:

  * *User doesn’t have required credential:* Zupass may return an error or simply not produce a proof (the `success` field will be false). Handle this by informing the user (“No valid credential found. You may need to obtain XYZ credential to continue.”) rather than just failing silently.
  * *User cancels the proof request:* If the user denies the request in Zupass, your `z.gpc.prove` call will likely throw an error or return `success:false`. Treat this gracefully (they might just be hesitant; perhaps allow them to try again or cancel the wizard).
  * *Multiple matches:* If the user has multiple PODs that satisfy the query, the Zupass UI should let them choose one. But ensure your challenge still works if they pick any. If for some reason your use-case expects only one, you might want to add constraints to narrow it or instruct the user to ensure only one applicable credential is in their vault.
  * *Performance:* Proof generation can be heavy (some seconds, depending on circuit complexity and user device). Use loading spinners and avoid blocking UI. Similarly, verification on the server can take time (\~100ms to 1s). Design timeouts and user messaging accordingly. You can offload heavy verification to a background job if needed, but for most cases it’s fast enough to do inline.

* **Upgradability:** As noted in docs, the POD/GPC system is in beta and proofs might not be forward-compatible. Keep an eye on library updates. If circuit versions change, you might need to update verifying keys and possibly require users to regenerate proofs. To handle this, include versioning in your policy and possibly in the proof (so you know which circuit was used). It may be prudent to have a way to invalidate old proofs if the underlying crypto is found to have issues (though this is a broader ecosystem concern).

* **Server-Side Trust:** Only trust proofs that you have verified. Don’t accept a mere claim from the frontend like “user is over 18” without the actual proof or a server-side check. Also, protect the endpoint that accepts proofs – use proper authentication or tie it to the user’s session so that an attacker can’t spam fake proofs to your server (they likely can’t forge a valid proof, but still, you don’t want to process garbage unnecessarily).

* **Logging and Privacy:** Avoid logging sensitive info. The proof data (`proof` blob and `boundConfig`) is cryptographically sensitive but not directly user-readable. However, `revealedClaims` might contain personal data (like emails, etc.). Treat it as PII – only store if needed and protect accordingly. The nullifier hash is pseudonymous; logging it is generally okay, but remember it represents a unique user identity in your app – so it’s like a user ID. Don’t inadvertently expose a mapping of nullifier to actual identity (which you likely don’t even have, since Zupass doesn’t reveal the real identity unless you ask).

By following this checklist, you can ensure that your Next.js integration with Zupass is robust against common attacks (replays, forgeries, unauthorized data use) and preserves the privacy promises of the system. The combination of **nullifiers, watermarks, signer checks, and owner proofs** provides a comprehensive security model:

* The signer check ensures the data’s authenticity source.
* The owner check ensures the prover is entitled to use that data.
* The nullifier ensures one identity = one go (and links multiple actions by same user if needed).
* The watermark ensures the proof itself can’t be replayed out of context.

With these in place, your app can confidently leverage zero-knowledge proofs for user data without sacrificing either security or user experience. **Finally, always keep usability in mind:** if a step is too confusing or fails often, users and admins might try to work around it in insecure ways. Provide clear instructions, and test the flows thoroughly with real users if possible. This is cutting-edge tech, but with a good UX and careful policy design, it will feel seamless in your Next.js wizard.

**Sources:**

* Official pod.org Documentation – POD spec, GPC, and Z API
* Zupass SDK Getting Started – usage of app connector and queries
* Ticket Proofs Guide – example of event ticket proof with nullifier and reveal fields
* PCD SDK References – GPCProofConfig and verification details
* POD Names & Schemas – best practices for pod\_type and ownership tagging
* ZK Proof Workflows – discussion on nullifier hash and watermark usage
