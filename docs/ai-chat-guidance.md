Great, I’ll create a single comprehensive guide that includes validation and feedback on your backend API setup using the Vercel AI SDK v4.x, as well as a full implementation plan and code examples for your `QuizmasterAiDisplay.tsx` component. I’ll review best practices, answer your specific questions, and provide actionable improvements.

I’ll let you know as soon as the report is ready.


# AI Quiz System: Backend & Frontend Best Practices

## Backend: Streaming Chat Route with Tool Calling

Your backend API route should leverage the Vercel AI SDK’s streaming functions for real-time responses. In Next.js App Router, define the handler in **`app/api/onboarding/quizmaster/chat/route.ts`** and mark it for Edge runtime (ensures low latency globally). For example:

```ts
// app/api/onboarding/quizmaster/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText, tool, zodSchema } from 'ai'
import { z } from 'zod'

// Edge runtime for fast global execution
export const runtime = 'edge';

// Define Zod schema for expected request body (messages, etc.)
const RequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system','user','assistant']),
    content: z.string()
  }))
  // ... (include any other fields you expect, e.g. stepId or config if needed)
});

const MarkTestPassedSchema = z.object({
  // Define parameters the tool will accept (if any)
  // e.g. quizId: z.string(), or none if it can infer from auth
});
```

Use your `withAuth` HOC to wrap the handler so only authenticated users call the endpoint. Also apply rate-limiting early (e.g. using an Edge-ready solution like Upstash) before invoking the AI SDK. Within the handler, parse and validate the request JSON using Zod to avoid malformed inputs. For example:

```ts
export const POST = withAuth(async (req: Request) => {
  const body = await req.json();
  const parseResult = RequestSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response("Invalid request", { status: 400 });
  }
  const { messages } = parseResult.data;
  // ... you could retrieve stepId from body or user context here ...
  
  // Configure the streaming AI response with OpenAI model and tools
  const result = streamText({
    model: openai('gpt-4'),                     // Use GPT-4 (chat model)
    messages,                                   // Conversation history from client
    tools: {
      markTestPassed: tool({
        description: "Mark the quiz step as passed in the database",
        parameters: MarkTestPassedSchema,       // Validate tool arguments with Zod
        execute: async (args) => {
          // Perform server-side effect: update PostgreSQL to mark quiz passed
          // (Ensure your DB client is Edge-compatible or uses HTTP API)
          await db.markQuizPassed(/* userId, stepId, etc. */)
          return { status: 'success', passed: true }
        }
      })
    },
    maxSteps: 2  // allow the model to call the tool and then continue its answer
  });
  return result.toDataStreamResponse();
});
```

In this pattern, `streamText` is given the OpenAI model (e.g. GPT-4 Turbo) and the incoming chat `messages`. We include our custom tool in the `tools` map, defined with a **Zod** schema for its parameters and an async `execute` function. The **Edge** runtime can call external APIs or serverless databases (ensure your PostgreSQL client supports Edge, or use a REST/Fetch approach if needed). The `maxSteps: 2` setting is **critical** – it enables multi-step reasoning so that if the model decides to invoke a tool, the SDK will automatically invoke it and then *continue the conversation* in a second step. Without this, a tool call would end the response after execution, preventing the model from finishing its answer.

Finally, we return `result.toDataStreamResponse()` to convert the stream into an HTTP response that Next.js can send to the client. This function handles streaming the text and special events over **Server-Sent Events (SSE)** using the AI SDK’s **data stream protocol**. It will chunk the response so the frontend can render tokens gradually, and will automatically include a final JSON data event with metadata (e.g. usage tokens and finish reason) when the stream ends.

**✅ Key validations:** The above setup follows best practices: using Zod to validate input, using the `tool()` helper to define server-side tools with schema, and using streaming via `streamText` + `toDataStreamResponse` for real-time UX. Make sure **not** to `await` the `streamText` call – return the stream immediately. (In the example above, we call `streamText` and return `toDataStreamResponse` without awaiting; this kicks off streaming properly. If you awaited `streamText` entirely, it would generate the whole response before sending, breaking the streaming behavior.) Also, ensure your `withAuth` and rate-limiter logic doesn’t buffer or block the Response. They should perform quick checks and then allow the SSE response to flow.

## Tool Result Handling and Model Interaction

When the model chooses to use a tool (like `markTestPassed`), the Vercel AI SDK handles it seamlessly. You do **not** need to manually forward the tool’s result back into a new model prompt – the SDK will do that for you as long as `maxSteps` is greater than 1. Here’s what happens under the hood:

1. **Tool Invocation:** If the AI decides to call `markTestPassed`, it will produce a special assistant message (function call) instead of normal text. The SDK intercepts this *tool call* in the stream.

2. **Server-side Execution:** Since `markTestPassed` has an `execute` defined, the SDK will run this function on the server (Edge). Your code updates the database and returns a result (e.g. `{ status: 'success', passed: true }`). The SDK validates this against the Zod schema and packages it as the *tool result*. If an error is thrown or the result doesn’t match the schema, the SDK will include an error in the stream.

3. **Automatic Model Resumption:** With multi-step enabled, the SDK will **automatically send the tool result back to the model** as context and request it to continue the conversation. In OpenAI’s terms, it adds an assistant message of role `"function"` with the tool’s name and the JSON result, then calls the model again to get the final answer. You don’t have to write this logic – the SDK’s `streamText` does it when `maxSteps` allows multiple steps. This means the AI can incorporate the outcome (e.g. knowing the quiz is now marked passed) in its final reply.

4. **Streaming to Client:** Throughout this process, the client is receiving events. The initial portion of the assistant’s answer will include a *tool invocation part*. The SDK streams a representation of the tool call, then (once the function completes) a representation of the tool result, and finally the rest of the AI’s answer. All of these are sent as part of one continuous SSE stream in our `toDataStreamResponse` (since we set `maxSteps: 2`, the two internal model calls are merged into one outward response stream).

Importantly, **the AI SDK does forward tool results to both the model and the client automatically**. The “result” your `execute` returns will be embedded in the assistant’s message structure. You can see this on the frontend: the last assistant message will contain a **tool invocation** entry that includes the tool name, arguments, and the returned result. The SDK’s design is such that *all tool calls and results appear in the stream*, so nothing is hidden or lost.

**Handling tool results in responses:** In many cases you might not want the raw JSON of the tool result to be shown verbatim to the user. By default, the AI’s own reply will determine what to say. For example, you might prompt the model with instructions like: *“When the user has answered all questions correctly, call the `markTestPassed` function. After calling it, congratulate the user and let them know the quiz is completed.”* The model can then output a friendly message (and you would not directly display the `{passed: true}` JSON). The tool result is mainly for the model’s state and for any client logic. It’s also accessible if needed for debugging or custom UI. In our case, the tool’s presence is a signal that the quiz was passed (more on using that in the frontend below).

If your tool fails or should return an error (say the DB update fails), make sure to handle that. The AI SDK will catch exceptions in `execute` and include an `error` part in the stream. You can also customize error handling by providing `getErrorMessage` to `toDataStreamResponse` if you want the error forwarded as a message. Generally, ensure your `execute` returns a simple serializable object (or throws a controlled error) – avoid large or complex data, since it will be serialized into the JSON for the model.

**Usage logging:** Since the OpenAI response usage (token counts) is included in the final data event, you can log it in the backend after completion. One approach is to use the `onFinish` callback of `streamText` (if provided) or parse the last `data:` event. For example, the `toDataStreamResponse` can be given a custom `dataStream` writer; you could call `result.value` or listen for the `finish` event to record `result.usage`. The simplest method is often to rely on that final usage event – the front-end can ignore it, while you capture it server-side if needed (e.g. via a middleware that wraps `toDataStreamResponse`). Just ensure your logging doesn’t interfere with streaming; perform it asynchronously or after sending the response.

## Frontend: Implementing `QuizmasterAiDisplay` with `useChat`

On the client side, you’ll create a React component (likely a Client Component, since it manages state and effects) to handle the chat UI and interaction. At the top of **`QuizmasterAiDisplay.tsx`**, add `'use client'` to enable hooks and state. This component will utilize the **Vercel AI SDK’s React hook** `useChat` to interact with your backend route.

Key props for this component are the `step` object (containing `step.config.specific` of type `QuizmasterAiSpecificConfig`, and `step.completed_at`) and an `onComplete` callback (to notify the parent when the quiz step is finished). We need to pass the quiz context to the AI and render the streaming conversation.

A basic setup using `useChat` might look like this:

```tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useChat, type Message } from '@ai-sdk/react'
import { Input, Button, Card, ScrollArea, Badge } from '@/components/ui'  // shadcn/ui components

interface QuizmasterAiDisplayProps {
  step: {
    config: { specific: QuizmasterAiSpecificConfig }, 
    completed_at: string | null
    id: string
  },
  onComplete?: () => void
}

const QuizmasterAiDisplay: React.FC<QuizmasterAiDisplayProps> = ({ step, onComplete }) => {
  const [quizPassed, setQuizPassed] = useState(!!step.completed_at);

  // Prepare a system message from the step's specific config to guide the AI
  const systemMessage = useMemo<Message>(() => {
    const config = step.config.specific as QuizmasterAiSpecificConfig;
    return {
      id: 'system-instructions',
      role: 'system',
      content: `You are a quizmaster AI. ${config.promptIntro ?? ''} 
        Use the provided information to quiz the user. 
        If the user passes all questions correctly, call the "markTestPassed" tool. ${config.otherInstructions ?? ''}`
    };
  }, [step]);

  // Initialize the chat hook
  const {
    messages,    // array of messages (with streaming updates)
    input,       // bound input state for the text field
    handleInputChange,
    handleSubmit,
    isLoading    // (if available: indicates an ongoing request)
  } = useChat({
    id: `quiz-${step.id}`,                   // unique chat session id (so state is isolated per step)
    api: '/api/onboarding/quizmaster/chat',  // our backend route
    initialMessages: [ systemMessage ],      // start conversation with system prompt context
    // We include no user messages initially; conversation starts empty for user input.
    // If step.completed_at already true, we might not even start a chat (could handle that case separately).
    maxSteps: 2  // allow auto multi-step on client if needed (ensures tool calls complete):contentReference[oaicite:12]{index=12}
  });

  // Auto-scroll to bottom when new messages arrive (optional enhancement)
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect: monitor messages for the tool result indicating quiz passed
  useEffect(() => {
    if (!quizPassed) {
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg) {
        // Check if the last assistant message includes a tool invocation for markTestPassed
        for (const part of lastAssistantMsg.parts ?? []) {
          if (part.type === 'tool-invocation' 
              && part.toolInvocation.tool === 'markTestPassed' 
              && part.toolInvocation.state === 'result') {
            // Tool has been called and returned a result
            setQuizPassed(true);
            onComplete?.();  // notify parent that the quiz step is complete
            break;
          }
        }
      }
    }
  }, [messages, quizPassed, onComplete]);

  return (
    <Card className="w-full p-4">
      <Card.Header>
        <Card.Title>Quizmaster AI</Card.Title>
        <Card.Description>
          {quizPassed 
            ? "✅ You've passed this quiz!" 
            : "Answer the questions to complete the quiz."}
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-2">
        <ScrollArea className="h-64 pr-2">
          {messages.map(msg => (
            <div key={msg.id} className="mb-2">
              {/** Style user vs assistant messages differently **/}
              {msg.role === 'user' ? (
                <div className="text-right">
                  <span className="px-3 py-1 bg-blue-500 text-white rounded-lg">
                    {msg.content}
                  </span>
                </div>
              ) : msg.role === 'assistant' ? (
                <div className="text-left">
                  {/* An assistant message may have multiple parts (text, etc.) */}
                  {msg.parts.map((part, idx) => {
                    if (part.type === 'text') {
                      return (
                        <span key={idx} className="px-3 py-1 bg-gray-200 rounded-lg">
                          {part.text}
                        </span>
                      )
                    }
                    // (We skip rendering tool invocation parts or other non-text parts to the user)
                    return null;
                  })}
                </div>
              ) : null}
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* anchor to scroll to */}
        </ScrollArea>

        {/* If quiz passed, optionally show a badge or special UI */}
        {quizPassed && (
          <div className="text-center mt-2">
            <Badge variant="success">Quiz Passed!</Badge>
          </div>
        )}
      </Card.Content>
      {!quizPassed && ( // only show input if quiz not finished
        <Card.Footer>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input 
              value={input} 
              onChange={handleInputChange}
              placeholder="Type your answer..." 
              disabled={isLoading} 
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || input.trim() === ''}>
              Send
            </Button>
          </form>
        </Card.Footer>
      )}
    </Card>
  );
};
```

In the above implementation:

* We call `useChat()` from **`@ai-sdk/react`**, specifying the `api` endpoint (which should match the path of our backend route). We also provide a unique `id` for the chat (so if this component unmounts/remounts or if there are multiple chat interactions, state can persist or remain separate). We pass an initial system message constructed from `step.config.specific` to give the AI context about the quiz. This is a safe way to use the step config – by injecting it into the system role, we **“prompt”** the model with any specific instructions (like quiz content or acceptance criteria). Ensure that `QuizmasterAiSpecificConfig` is serializable to string form for the prompt. (If it contains rich data like correct answers, you might embed those in the prompt so the AI can verify user answers. Be cautious not to expose answers if the user shouldn’t see them – system role content won’t be shown to the user directly.)

* We include `maxSteps: 2` here as well. This setting on the client hook ensures that if the assistant’s message includes a tool call that was **not** fully handled in one go, the hook will automatically send the updated message list back to the server for an additional round. In our case, since we also set `maxSteps` on the server, the first response should already include the final answer after the tool call. However, setting it on the client as well is a safe fallback for complex cases. It means the UI won’t stall with an unfinished tool call – it will continue until the tool result is resolved and the AI has given a complete answer. This is particularly useful if you had a mix of server and client tools or needed user confirmation steps (not the case here, but good to know).

* We render the `messages` array returned by `useChat`. Each message has a role (`'user'` or `'assistant'`) and may be broken into `parts` for different content types (text, tool invocations, etc.). We iterate through `msg.parts` and display text parts. In our UI, user messages are right-aligned (as an example, with a blue background) and assistant messages are left-aligned (gray background). We deliberately skip rendering any `tool-invocation` parts directly; those represent internal function call details. The user doesn’t need to see `"Tool markTestPassed called..."` JSON. Instead, we rely on the assistant’s textual content to communicate with the user. (If you wanted, you could show a loading indicator when a tool is in progress, but since it’s very fast in our case, it’s not necessary.)

* The input form is bound to `useChat`’s `input` state and `handleInputChange`. We call `handleSubmit` on form submit to send the user’s message. The hook takes care of posting the message to our `/api/onboarding/quizmaster/chat` endpoint and streaming back the response. As the data comes in, `messages` will update incrementally. The `isLoading` flag (or you could derive one by checking if there’s any assistant message in progress) is used to disable the form while waiting for a reply. We also disable the **Send** button when input is empty or while loading, to enforce valid submissions.

* We use a **ScrollArea** (from shadcn/ui) to make the messages container scrollable, and an effect to auto-scroll to the latest message. This improves UX for longer conversations. The ScrollArea from shadcn is a styled wrapper around native scrolling.

* When the quiz is completed (`quizPassed === true`), we render a special `<Badge>` as a visual indicator. This is optional, but it meets your goal of a custom UI element (like a badge) when the quiz is passed. In the example, once passed, we also hide the input form (preventing further interaction). You might also replace it with a “Continue” button or some next-step UI by utilizing the `onComplete` callback.

## Tracking Quiz Completion and Calling `onComplete`

Detecting when the user has passed the quiz is crucial for your flow. We have two signals for this: the backend sets `step.completed_at` in the database (via the tool), and the frontend sees the tool invocation in the message stream. Depending on how your application state is managed, you can use either or both.

In the above `QuizmasterAiDisplay` component, we use the message stream to detect completion in real-time. The `useEffect` scans incoming messages; specifically, it looks at the latest assistant message for a tool invocation of `markTestPassed` with state `'result'`. According to the SDK, a *tool invocation* part will transition from a *call* to a *result* once execution is done, and it contains details including the tool name and result payload. By checking for that, we confidently know the quiz-passing function ran. The moment we find it, we set `quizPassed` to true (updating the UI state), and invoke `onComplete()` to notify the parent component. You should call `onComplete` **only once** – the code above sets a state flag to ensure we don’t fire it repeatedly.

Another strategy is to rely on the `step.completed_at` prop. If your parent component refreshes the `step` data after the tool runs (for example, via a React query or by re-fetching the step from the server), then `step.completed_at` will switch from `null` to a timestamp. You could watch that with a `useEffect` and trigger `onComplete` when it becomes non-null. In a Next.js App Router context, you might use a server action or mutate a cache so that the prop is updated. Either approach is fine. The advantage of catching the tool invocation in-stream is that it’s instantaneous and doesn’t require an extra round-trip or state management in the parent. It’s also directly tied to the AI’s action (so even before any revalidation, your UI responds).

In our component, we also visually indicate completion by showing a success message and badge, and disabling the input. This gives immediate feedback to the user that they have passed the quiz. You could further enhance this by playing a small animation or confetti, etc., but that’s beyond our scope. The main point is to ensure no further answers are submitted once the quiz is done (unless you want to allow the user to continue chatting with the AI, but typically for a quiz you’d stop).

## Additional Tips and Gotchas

* **Ensure the model knows about the tool**: Simply providing the tool via the SDK is usually enough – OpenAI’s function calling will inform the model that a function `markTestPassed` exists with the given description and parameters. However, it can be helpful to also mention the tool in the system prompt or initial instructions. For example, “You have a tool called `markTestPassed` which you should call (with no arguments or with appropriate args) when the user has successfully completed the quiz. Do not reveal this tool to the user.” This steers the AI to actually use the function at the right time. The tool’s `description` is also given to the model, so include hints there as well (your code likely already does this). Good prompt design will make the AI’s behavior more reliable.

* **Type safety and config access**: We accessed `step.config.specific` by asserting it as `QuizmasterAiSpecificConfig`. If your data types come from a TypeScript schema or Zod, make sure the prop is correctly typed when passed in. Using `as QuizmasterAiSpecificConfig` is okay if you’re certain of the shape, or better, have the parent pass the config already typed. Always guard against missing fields – e.g., if `step.config` or `step.config.specific` could ever be undefined, add a check. In the UI, it’s wise to handle that gracefully (perhaps show an error message if config is missing, rather than crashing).

* **Edge runtime caveats**: Running on the Edge is great for performance, but note that some Node.js libraries (like the default `pg` PostgreSQL client) won’t work in that environment. Use edge-compatible solutions: for example, use **Neon** or **Supabase** which offer HTTP-based connections for Postgres, or an ORM like Drizzle with a fetch adapter. In our tool `execute`, if `db.markQuizPassed` is using Prisma or a Node driver, it might not run on Edge. Ensure your DB call is adapted (or consider moving the DB update to a Serverless Function if needed). Since you included it in the Edge route, presumably you have this handled (just something to double-check).

* **Rate limiting**: If you use a rate limiter, ensure it doesn’t block the streaming response. Ideally, perform the check at the start of the request (count the usage for the user, compare to quota). If the user is over limit, return an error response **before** calling `streamText`. If under the limit, proceed with streaming. You might also log usage after streaming and increment counts accordingly. This can be done by catching the final usage tokens. The AI SDK’s final `data` event includes `usage` (e.g. token counts), which you can parse either on the client or server. Logging on the server side is safer (the user could close the connection early on client). One approach: use an `AbortSignal` – the SDK forwards abort signals to tools as well, so you could abort the DB update if the client disconnects (advanced usage).

* **Testing and iterations**: Test the full flow in development. Look at the network response in your browser devtools – you should see the SSE stream with events like `text` chunks and potentially a `data: {...}` at the end. This will help verify that the streaming and tool call are working. If something isn’t showing up in the UI, check if the `messages` array contains what you expect. Logging `messages` (as the GitHub issue did) can reveal the structure of the tool invocation parts. According to the maintainers, full support for tool call messages in `useChat` was solidified around SDK v4 – ensure you are on the latest 4.x version so that `maxSteps` and tool streaming work correctly.

* **UI/UX considerations**: Using shadcn/UI components is a good choice for consistent styling. We used `Card`, `Input`, `Button`, etc., for a clean layout. Feel free to adjust styling (e.g., adding icons, or using a `Textarea` if you want multi-line input). Keep the conversation UI simple and readable – short messages, distinct styling for AI vs user. Also consider mobile responsiveness (the flex and max-width classes from the example help in that regard).

By following these practices, your AI-powered quiz system will have a robust backend that correctly streams AI responses and tool actions, and a responsive frontend that gives a smooth, live chat experience. You’ve validated that the backend pattern (Edge runtime, `streamText` with tools, `toDataStreamResponse`) is correct and efficient, and that tool results are automatically handled by the SDK without extra glue code on your part. On the frontend, using `useChat` greatly simplifies streaming logic, and with the provided structure, you can confidently detect quiz completion and update the UI (and parent state) accordingly. Enjoy building your quiz system, and good luck with your AI quizmaster! 🎉

**Sources:**

* Vercel AI SDK documentation on streaming and tool usage
* Vercel AI SDK React hook usage (for integrating `useChat` in Next.js App Router)
* Official examples and discussions on multi-step tool calls in AI SDK (confirming automatic tool result handling)
