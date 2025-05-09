Great. I’ll investigate how the Vercel AI SDK (`@ai-sdk/react` v1.x with `ai` v4.3.15) structures messages in the `useChat` hook, specifically for server-side tool results like `markTestPassed`, and how to robustly and type-safely access those results in a Next.js 14+ App Router component.

I'll also provide a detailed explanation of the message structure and a working, linter-compliant TypeScript `useEffect` snippet for `QuizmasterAiDisplay.tsx` that detects a successful tool execution and updates the UI immediately.

I'll get back to you as soon as the research is complete.


# Handling Tool Execution in a Next.js (Vercel AI SDK) Chat Interface

## 1. Message Structure in `useChat` with Tool Calls

In the Vercel AI SDK (AI SDK 4.2+ and `@ai-sdk/react` 1.x), each chat message is a **UIMessage** object containing a `role` and a list of `parts` rather than one big content string. Valid roles for UI messages are **`'system'`, `'user'`, `'assistant'`,** and **`'data'`** – notably, **there is no `'tool'` role in the UI message type**. Instead, when the assistant calls a tool, that tool call and its result are embedded as **“tool invocation” parts** inside an assistant’s message.

In practice, this means the assistant’s message will include a `parts` entry with `type: "tool-invocation"`. This part contains a `toolInvocation` object with details of the tool call: the `toolName`, a unique `toolCallId`, its `args`, a `state`, and (when finished) the `result` of execution. The tool invocation’s `state` will progress from `'call'` (or `'partial-call'` if streaming) to `'result'` once execution completes. At the `'result'` state, the `toolInvocation` object includes a `result` field carrying the tool’s output (which could be a string or any JSON-serializable data).

**In summary:** The tool’s result is **not delivered as a separate message with role `'tool'` in the UI state**. It is integrated into the last assistant message as a part. For example, if the assistant calls `markTestPassed`, the assistant’s message might have parts like: a text part (perhaps empty or a prompt) and then a tool-invocation part for `markTestPassed`. Once the server tool finishes, that same part’s state becomes `'result'` and includes the result data. The UI should render messages by iterating over each message’s `parts`, as shown in Vercel’s example code. This way, tool calls and results appear in-line with the assistant response, rather than as separate chat bubbles.

*(Under the hood, the core AI SDK does create a transient **tool message** with role `'tool'` to hold the result. However, the `useChat` hook (with `streamProtocol: 'data'`, which is default) merges the tool result into the assistant’s message parts for the UI. You should rely on the `parts` structure instead of expecting a standalone `'tool'` message in `useChat` state.)*

## 2. useEffect Snippet to Detect `markTestPassed` Execution

To detect when the `markTestPassed` tool has run and update the UI immediately, you can use a React `useEffect` that watches the `messages` array from `useChat`. The effect can scan for any assistant message containing a tool invocation part for `markTestPassed` in the `'result'` state. Below is a **type-safe** snippet implementing this logic:

```tsx
useEffect(() => {
  if (!quizPassed) {  // only run if we haven’t already marked the quiz as passed
    const toolResultFound = messages.some(message =>
      message.role === 'assistant' &&
      message.parts?.some(part =>
        part.type === 'tool-invocation' &&
        part.toolInvocation.toolName === 'markTestPassed' &&
        part.toolInvocation.state === 'result'
      )
    );
    if (toolResultFound) {
      setQuizPassed(true);
      onComplete?.();  // trigger completion callback if provided
    }
  }
}, [messages, quizPassed, onComplete]);
```

**Explanation:** This effect runs whenever `messages` change. It uses `Array.some` to find an assistant message with a relevant tool invocation part. We check `part.type === 'tool-invocation'` to narrow the union type to a ToolInvocation part, which then safely exposes the `toolInvocation` fields in TypeScript (no `any` needed). We then match the specific tool by name (`toolInvocation.toolName === 'markTestPassed'`) and ensure the tool’s state is `'result'`, meaning the tool has finished executing and returned a value. At that moment, we update component state (`quizPassed` to `true`) and call `onComplete()`.

This snippet is **ESLint-compliant and type-safe**:

* We avoided any casts by leveraging TypeScript’s discriminated union on `part.type`. Once we check `part.type === 'tool-invocation'`, TS knows `part.toolInvocation` exists with the full `ToolInvocation` type (including `toolName`, `state`, and `result`). If needed, you could further refine by checking `toolInvocation.state === 'result'` before accessing the `result` field (TS can infer that `result` is defined when state is `'result'`). In our case, we only need to detect the existence of the result, not read its value, so this check suffices.
* We guard with `if (!quizPassed)` to prevent duplicate triggers in case the effect runs on every render. You might also track in state that `onComplete` has been called if needed.
* Note: `.some(...)` is used for brevity. You could use nested `for` loops or `.find` similarly – the key is that the iteration is contained and type-checked, without broad `any` usage.

## 3. Alternative Ways to Detect Tool Completion

The approach above (scanning message parts) is one straightforward way to detect a server-side tool’s execution on the client. The Vercel AI SDK also provides a couple of hooks and options that can help in handling tool calls/results:

* **`onToolCall` callback:** The `useChat` hook accepts an `onToolCall` option, which fires on *each tool call event* received by the client. This is mainly intended for **automatically executing client-side tools** (e.g. if the AI requests a browser action, you can intercept it here). However, it will also trigger for server-side tool calls when they happen (because *all* tool calls are forwarded to the client before execution). You can leverage this to detect the `markTestPassed` call the moment the model requests it. For example:

  ```tsx
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === 'markTestPassed') {
        setQuizPassed(true);
        onComplete?.();
      }
      // Return nothing to allow server execution to proceed
    },
    maxSteps: 1  // ensure the conversation doesn’t loop unintentionally
  });
  ```

  This will call your callback as soon as the tool invocation is received. In the case of a server-side tool with an `execute` function, you typically **do not return a result** in `onToolCall` (returning something here would override the server result). By not returning a value, the SDK knows to let the server handle it. Using `onToolCall` in this way gives you an immediate hook to update UI state. Keep in mind that the server will still execute the tool and stream back its result (which will populate the message parts). If your UI doesn’t display anything for `markTestPassed`’s result, this duplication isn’t an issue. If you do display it, consider whether the `onToolCall` update might race with any final assistant message text. In many cases, though, a server tool like `markTestPassed` might not produce user-visible text, making `onToolCall` ideal for side effects like setting flags.

* **`streamProtocol` and data events:** The Vercel SDK’s default streaming mode (`streamProtocol: 'data'`) already handles rich content like tool calls. In older versions of the SDK, there was an `experimental_StreamData` mechanism to attach custom data to SSE events, but in AI SDK 4.x this is superseded by the built-in data stream and message parts system. You do not need to manually parse custom SSE events – the `useChat` hook already gives you structured messages (with tools, reasoning, sources, etc. in `parts`). If you wanted to attach completely custom non-chat data from the server, one could include it as a special message (role `'data'`) in the stream, but that’s usually not necessary for tool results. In short, **the recommended approach is to use `onToolCall` or inspect `message.parts`**, rather than a lower-level SSE handler.

* **`experimental_streamData` flag:** This was a pre-4.0 feature for streaming arbitrary JSON data alongside text. It’s no longer needed when using `toDataStreamResponse()` on the server (which you are using) and the default `streamProtocol: 'data'` on the client. Your messages already include the tool call/result data in the structured format. Thus, there isn’t a more “built-in” signal for tool completion beyond what we’ve discussed. The `messages` state (and `onToolCall`) are the correct places to detect these events.

In summary, **`onToolCall`** is the cleanest alternative for immediate reaction on the client. It avoids scanning the messages after the fact and is specifically designed for tool call handling. The trade-off is that it triggers at call time (before the result is known). For a tool like `markTestPassed` that always succeeds and mainly signals a state change, this is fine. If you needed the tool’s returned data to decide something, you’d use the message-part method. Other than that, the high-level SDK doesn’t yet provide a dedicated “onToolResult” callback, so listening to the messages (as we did in the effect) or using `onToolCall` are the go-to solutions.

## 4. TypeScript and `'tool'` Role Errors

You noticed TypeScript complaining that `'tool'` is not assignable to the message role type. This is because of the distinction between **core SDK messages vs. UI messages**. In the **core AI SDK** (the lower-level library), a tool result is represented as a message with `role: 'tool'` (holding a `tool-result` content). But the **React `useChat` hook** uses the **UIMessage** type which, as noted, only includes `'system' | 'user' | 'assistant' | 'data'` as valid roles. The UIMessage structure expects that tool outputs have been merged into assistant messages (hence counted as an assistant’s content parts, not a standalone message). In other words, `message.role === 'tool'` is not supposed to appear in the final `messages` array given by `useChat` – and if it does, the TypeScript types don’t account for it (hence the error).

There are a few reasons you might be encountering a `'tool'` role message despite the above:

* **SDK Version or Setup Mismatch:** Ensure that your versions of the `ai` core and `@ai-sdk/react` are in sync with the message-part system. With `ai@4.3.15` and `@ai-sdk/react@1.x`, you should be getting messages with `parts`. If a `'tool'` message still appears in `messages`, it could be a sign of a slight version discrepancy or a bug that hasn’t merged the tool result into the assistant message. Double-check that you have `maxSteps > 1` if you expect multi-step tool handling to auto-continue, and that your server route returns `result.toDataStreamResponse()` (which you are doing) so that the structured events are used.

* **Known SDK Quirk (Empty Assistant + Tool Message):** The maintainers have noted an issue where an *empty assistant message* and a separate `'tool'` message can appear in the stream when a tool is called. This is exactly what you saw: an assistant message with empty content (or just a tool call part) followed by a tool result message. The recommendation *for now* is to **filter out or merge these messages on the client**. In practice, you can simply ignore messages with `message.content` empty or `message.role === 'tool'` when rendering, since their info is duplicated in the assistant’s parts. (Our code in part 2 does this inherently by looking only at assistant messages.) This workaround eliminates the TypeScript issue because you won’t be explicitly handling a `'tool'` role. Future updates to the SDK may handle this merging for you automatically.

* **Extending Types (if needed):** If for some reason you need to treat `'tool'` messages explicitly (not usually necessary in the UI), you could cast the message to a looser type or augment the type definition. For example, you might do `(message as any).role === 'tool'` or adjust your TypeScript config to be less strict about the union. However, **the better solution is to avoid relying on `'tool'` messages altogether**, since the UI paradigm is to use the assistant’s `tool-invocation` parts. By following the pattern in section 2, you stay within the safe bounds of the SDK’s types. Another approach is converting UI messages to core messages via `convertToCoreMessages` if you want to persist or inspect the raw conversation including tool messages – but that’s more for sending back to the AI or storage, not needed just to detect the event.

In short, TS doesn’t recognize `'tool'` as a valid role because the **library intends those messages not to surface as separate entries in the chat state**. The fix is to use the recommended message structure (parts in assistant messages) or handle the `'tool'` entry in a way that satisfies the compiler (e.g. filtering it out or using a type assertion). The maintainers are aware of the inconsistency and are working on improvements to the message merging behavior. Keeping your SDK up to date and using the message `parts` API will ensure type safety and future compatibility.

**Sources:** The Vercel AI SDK documentation on tool usage and message parts was referenced for the above explanations. Key references include the official guide on Chatbot Tool Usage, the `useChat` reference for message structure, and community discussions confirming the handling of tool call/result messages. These illustrate how tool results are integrated into assistant messages and why the `'tool'` role is not part of the UI message type.
