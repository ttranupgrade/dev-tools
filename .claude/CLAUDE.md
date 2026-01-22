# Claude Memory

> **Note**: When I refer to "my claude memory" or ask you to "add this to my claude memory", I mean this `~/.claude/CLAUDE.md` file.

# Git commits

- Keep commit messages concise - only include the headline (e.g., "SI-10340 Brief description of change")
- Do not add detailed body text with bullet points explaining changes
- Never mention Claude Code or add "🤖 Generated with Claude Code" footer
- Never add "Co-Authored-By: Claude" footer
- **Never stage or commit `.claude/settings.local.json`** - this is a personal settings file that should not be tracked in git

**Example of correct commit message:**
```
SI-10340 Add validation for email field
```

**Example of incorrect commit message:**
```
SI-10340 Add validation for email field

Add comprehensive validation:
- Email format validation
- Required field check
- Domain validation

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Pre-commit validation

Always run these checks before committing:
1. `yarn test --watchAll=false` - Validate all unit tests pass
2. `yarn lint --quiet` - Validate no linting errors
3. `yarn i18n:extract` - Validate no missing i18n keys (should show no changes if all strings are wrapped)

# Unit testing

- Try to stay consistent with structure of existing tests
- Avoid snapshots when possible and instead do assertions directly in the unit test
- Should never rely on actual current time. Either not rely on it or mock the current date time in the test itself.

## Mocking Date/Time

When tests need to use dates or times, mock the Date object to ensure consistent results:

```javascript
// Mock current date and time to June 1, 2024
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super('2024-06-01T00:00:00.000Z');
    } else {
      super(...args);
    }
  }

  static now() {
    return new RealDate('2024-06-01T00:00:00.000Z').getTime();
  }
};

// ... test data definitions that use new Date() ...

// Restore in cleanup
afterAll(() => {
  // Restore the original Date
  global.Date = RealDate;
});
```

**Why this approach:**
- ✅ Doesn't interfere with async operations (unlike `jest.useFakeTimers()`)
- ✅ Mocks at module level, affecting test data definitions
- ✅ Provides consistent results regardless of when tests run
- ✅ Simple to understand and maintain

# Internationalization (i18n)

Projects use Lingui for internationalization. Always consider i18n when adding or modifying user-facing text.

## Key Principles

- **Never use explicit IDs** with Trans components - they cause issues with translation providers (Crowdin, Lingui String Exporter)
- **Always wrap entire strings** with `<Trans>` - even if it means including other components as children
- **Prefer `@lingui/react/macro`** over `@lingui/core/macro` - React macros support dynamic locale changes

## In JSX Components

### Basic text with Trans
```javascript
import { Trans } from '@lingui/react/macro';

<h1><Trans>Welcome</Trans></h1>
<p>
  <Trans>
    Hello <a href="/profile">{name}</a>.
  </Trans>
</p>
```

### Pluralization
```javascript
import { Plural } from '@lingui/react/macro';

<Plural
  value={count}
  _0="You have no Upgrade Card"
  one="You have an Upgrade Card"
  other="You have # Upgrade Cards"
/>
```

### JSX Props (alt, title, placeholder, etc.)
```javascript
import { useLingui } from '@lingui/react/macro';

const { t } = useLingui();
<img src={imgSrc} alt={t`Image caption`} />
```

### Enums/Constants
```javascript
import { Trans } from '@lingui/react/macro';

const STATUS_MESSAGE = {
  OPENED: <Trans>Opened</Trans>,
  PENDING: <Trans>Pending</Trans>,
};
```

## Outside React Components

**⚠️ Avoid `@lingui/core/macro` unless necessary** - it uses the global i18n instance and can't react to locale changes.

### For validators or utilities (if unavoidable)
```javascript
import { t, msg } from '@lingui/core/macro';

// Declare at module level using msg
const defaultMessage = msg`This field is required`;

export default (value) => {
  // Use t() with the message at runtime
  return isEmptyValue(value) ? t(defaultMessage) : null;
};
```

## Numbers & Currencies

```javascript
import { useLingui } from '@lingui/react/macro';

const { i18n } = useLingui();

// Numbers
i18n.number(123.45)

// Currencies
i18n.number(amount, { style: 'currency', currency: 'USD' })
```

## Dates

Use existing formatters (they handle locale via moment.locale()):
```javascript
import formatDate from '@upgrade/ui-utils/formatters/date-local';

<span>{formatDate(date)}</span>
```

## Common Mistake to Avoid

❌ **Bad** - Splits strings into multiple translations:
```javascript
<Trans>Upgrade is a </Trans>
<a href="/legal">
  <Trans>financial technology company</Trans>
</a>
```

✅ **Good** - Wraps entire string with nested components:
```javascript
<Trans>
  Upgrade is a{' '}
  <a href="/legal">financial technology company</a>
</Trans>
```

## Code Review Best Practices (from PR #6783)

Based on review feedback from @gbedardsiceupgrade, follow these patterns:

### 1. **Prefer `<Trans>` over `t` for JSX Content**
When rendering text content in JSX, use the `<Trans>` component instead of the `t` function.

❌ **Don't do this:**
```javascript
<Button>{t`Load More`}</Button>
```

✅ **Do this instead:**
```javascript
<Button>
  <Trans>Load More</Trans>
</Button>
```

### 2. **Use `t` Only for String Props**
Use the `t` tagged template literal for props that require string values (not JSX).

✅ **Correct usage:**
```javascript
const { t } = useLingui();

<FormSection
  label={t`Document Name`}  // String prop - use t
  editLinkProps={{ label: t`Edit payment source` }}
/>
```

### 3. **Wrap Entire Contexts Together for Translators**
Don't split related text into multiple translation keys. Give translators the full context.

❌ **Don't split context:**
```javascript
<Text>We've sent a confirmation to</Text>
<Text bold>{email}</Text>
```

✅ **Provide full context:**
```javascript
<Trans>
  <Text>We've sent a confirmation to</Text>
  <Text bold>{email}</Text>
</Trans>
```

**Why?** This gives translators the complete sentence structure, allowing them to properly handle word order variations across languages.

### 4. **Correct Import Patterns**

```javascript
// For React components and hooks
import { Trans, useLingui } from '@lingui/react/macro';

// For string values (non-JSX contexts)
import { t } from '@lingui/core/macro';
```

### 5. **Components Can Be Children of `<Trans>`**
```javascript
<Trans>
  For any questions, call us at{' '}
  <SupportPhoneNumber department={ACCOUNT_SERVICING} />,{' '}
  <SupportHours inline department={ACCOUNT_SERVICING} />.
</Trans>
```

### 6. **Use Lingui-Compatible Formatters**

❌ **Don't use:**
```javascript
import formatPrice from '@upgrade/ui-utils/formatters/price';
```

✅ **Do use:**
```javascript
import formatPrice from '@upgrade/ui-utils/formatters/lingui/price';
```

### 7. **Quick Decision Tree**

**Is it JSX content being rendered to the user?**
- ✅ Yes → Use `<Trans>`

**Is it a prop that needs a string value?**
- ✅ Yes → Use `t` tagged template

**Do multiple elements form one logical sentence?**
- ✅ Yes → Wrap them all in one `<Trans>` tag

**Is it purely for developers (data-auto, className)?**
- ✅ Yes → Don't translate

# Pull request template

Use this template and instructions when submitting pull requests:

- Git branch name should be named after the JIRA ticket number. For example: "SI-10340"
- Git branch should always be pushed in ttran remote. Never use origin remote to push branches.
- Pull request title should follow format: "SI-10340 Brief title of changes"
- Pull request description should follow this template:
```
[SI-10340](https://credify.atlassian.net/browse/SI-10340)

### Description

Brief description of the overall changes

**Summary of changes:**
(Very concise list of changes. Don't mention code line numbers. Don't mention adding unit tests. Don't mention adding data-auto attributes. Don't mention i18n/internationalization changes.)

### Test plan

Concise list of scenarios to test for QA. Just mention the scenario - QA will determine the step-by-step process. Do not provide detailed steps.

**Important:** Never add a step in test plan to run unit tests. Unit tests passing is a given and not part of QA testing.

### Screenshots

N/A
```
- Pull request should be submitted in draft

## Simplified template for small changes

For small, straightforward changes (e.g., fixing a unit test, updating documentation, minor refactoring), use a simplified template without "Summary of changes" and "Test plan" sections:

```
### Description

Brief description of the change

### Screenshots

N/A
```

**Examples of small changes that don't need full template:**
- Fixing unit tests
- Updating comments or documentation
- Removing unused code
- Minor refactoring without behavior changes
- Fixing linting issues

# Consuming changes from UI libraries

For UI libraries, you can test PR changes before they're merged by updating package.json to point to the PR number:

```bash
yarn add @upgrade/library-name@PR-123
```

**Example:**
```bash
yarn add @upgrade/bank-account-ui@PR-116
```

This installs a version like `0.0.0-PR-116-20260107203607` that contains the PR changes.

## UI Libraries
The following are UI libraries that support PR-based installation:
- `@upgrade/bank-account-ui`
- `@upgrade/react-components`
- `@upgrade/deposit-components-ui`
- `@upgrade/home-improvement-components-ui`
- `@upgrade/cash-advance-ui`
- `@upgrade/atm-search-ui`
- `@upgrade/charts-ui`
- `@upgrade/direct-deposit-components-ui`
- `@upgrade/memberization-components-ui`
- `@upgrade/subscription-components-ui`
- `@upgrade/user-settings-components-ui`
# Sierra AI Agent SDK

The sierra-agents repository is built on top of Sierra AI's Agent SDK platform.

## Overview

Sierra Agent SDK enables building conversational AI agents using a **declarative approach** with TypeScript and JSX (React-like syntax). Instead of prompt engineering or imperative programming, you define goals and guardrails declaratively.

### Key Benefits
- **Non-linear execution**: Agents don't need to execute linearly, enabling flexible conversations
- **Model-independent**: Goals/guardrails are independent of underlying AI models
- **Composable**: Capabilities built with Agent SDK are easily composable
- **Continuous improvements**: Benefits from model enhancements without manual upgrades

## Journey Types

### Goal-Based Journeys (Recommended Default)
Give flexibility to the agent to achieve specific goals through flexible conversation paths.

**Best for:**
- Complex problem-solving (e.g., technical support)
- Dynamic conversation paths (e.g., product recommendations)
- Natural conversation handling (customer asking questions mid-journey)

**Key components:** `Goal`, `LookupTool`, `ActionTool`, `Rule`, `Policy`

### Flow-Based Journeys
Define stricter conversational flows that agents must follow.

**Best for:**
- Strictly adhering to conversational scripts
- Workflows requiring rigid patterns

**Key components:** `Choose`, `Triage`, `Respond`

**Note:** Flow-based can feel more robotic and perform less well when customers respond unexpectedly.

## Core Skills (Building Blocks)

### Goal-Based Skills
- **`Goal`**: Define high-level objectives for flexible conversation paths
- **`LookupTool`**: Retrieve information from external systems
- **`ActionTool`**: Perform actions (API calls, database updates, etc.)
- **`Rule`**: Specific directives to guide agent behavior
- **`Policy`**: Business policies to enforce
- **`Outcome`**: Define possible outcomes of a goal

### Flow-Based Skills
- **`Choose`**: Decision branching
- **`Triage`**: Route to different flows
- **`Respond`**: Generate responses with specific modes (e.g., `mode="paraphrase"`)

### Agent Wrappers
- **`GoalAgent`**: Wrapper for goal-based agents
- Standard `Agent`: Default export function

## Tools and System Integration

### Defining Tools

**Inline with JSX:**
```typescript
<LookupTool
  name="FindOrder"
  description="Find customer's order using their email"
  params={{ email: toolParam.string("Customer's email address") }}
  func={({ email }) => {
    const { result, status } = json(`https://api.example.com/orders?email=${email}`, {
      method: "GET"
    });
    return status === 200 ? { status: "success" } : { status: "error" };
  }}
/>
```

**Using `registerTool` (available in both Agent SDK and Agent Studio):**
```typescript
const FindOrderTool = tools.registerTool({
  type: "lookup",
  name: "findOrder",
  noCodeId: "findOrderFromAgentSDK",
  params: { email: { type: "string", description: "Customer's email" } },
  func: (ctx, params, controls) => {
    const response = fetch.jsonSync(`https://api.example.com/orders?email=${params.email}`);
    ctx.store.update(prev => ({ ...prev, order_id: response.body?.order_id }));
    return controls.result({ data: order_id });
  }
});
```

### API Integration Patterns

**React-like hooks:**
```typescript
import { jsx, useEffect, useState, json, secret } from "@sierra/agent";

const [data, setData] = useState("");
const accessToken = secret("ACCESS_TOKEN");

useEffect(() => {
  const { result, status } = json("https://api.example.com/endpoint", {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (status === 200) setData(result);
}, [accessToken]);
```

**Integrations:** Bundle related API methods together with shared config (API keys, base URLs)

### Transferring to Human Agent

```typescript
import { useOutput } from "@sierra/agent";

const output = useOutput();

<ActionTool
  name="TransferToLiveAgent"
  description="Transfer customer to a live agent"
  func={({ email }) => {
    output.send({ type: "transfer", isSync: true, data: {} });
    return { status: "success" };
  }}
/>
```

## Agent SDK + Agent Studio Integration

**Agent Studio** (for non-technical teams):
- Build customer journeys
- Define rules, policies, glossaries
- Update agent behavior without engineering involvement

**Agent SDK** (for engineering teams):
- Define tools using `registerTool` (available in both SDK and Studio)
- Handle capabilities not yet in Agent Studio (client events, transfers)
- Implement complex system integrations

**Key principle:** Journeys and blocks defined in Agent Studio are imported into Agent SDK behavior.

## Code Structure

### Basic Agent Example
```typescript
import { jsx, Respond } from "@sierra/agent";

export function Agent() {
  return <Respond mode="paraphrase">Hello, World!</Respond>;
}
```

### Goal-Based Agent Example
```typescript
import { jsx, Goal, GoalAgent, Outcome } from "@sierra/agent";

export function Agent() {
  return (
    <GoalAgent>
      <Goal description="Understand why customer is contacting support">
        <Outcome description="Customer wants to return an order">
          <OrderReturn />
        </Outcome>
      </Goal>
    </GoalAgent>
  );
}
```

## Publishing and Deployment

Agents can be published to:
- **Web SDK**: Website integration
- **iOS SDK**: Native iOS apps
- **Android SDK**: Native Android apps
- **Headless API**: Programmatic access
- **Voice**: Phone call support

## Development Workflow

1. **Build**: Use `Goal`, `LookupTool`, `ActionTool` for capabilities
2. **Test**: Run simulations across scenarios
3. **Monitor**: Use tags, experiments, surveys, hooks
4. **Deploy**: Progressively test through staging and production environments

## Key Imports
```typescript
import {
  jsx,
  Goal,
  GoalAgent,
  Outcome,
  LookupTool,
  ActionTool,
  Rule,
  Policy,
  Choose,
  Triage,
  Respond,
  toolParam,
  useState,
  useEffect,
  useOutput,
  json,
  secret
} from "@sierra/agent";
```


---

# Sierra AI Agent SDK - Quick Start Guide

## Development Overview

### Sierra Object Structure

Sierra agents are organized in a hierarchical structure:

- **Organization**: The subdomain where you interact with Sierra (e.g., `upgrade-dev` at https://upgrade-dev.sierra.ai/)
- **Agent**: A single project within an organization (you can have multiple agents)
- **Workspace**: A single build of your agent code used for development (remote builds of local code)
- **Release**: An immutable workspace persisted indefinitely in Sierra; one release is live at a time for end users

### Development Command

Use `pnpm sierra watch` to build and upload local agent code to a workspace. This command:
- Automatically detects changes in your local filesystem
- Uploads changes to Sierra servers instantly
- Provides a private sandbox for experimentation

**Important**: Workspaces are private sandboxes - you can experiment freely without affecting others.

## Setup and Installation

### Required Dependencies

- **Node.js** v20 or later
- **pnpm** v10 or later
- **git** v2.45 or later

### Installation Steps

1. **Generate authentication token** via Agent Studio
2. Add authentication to `.npmrc` in home directory
3. Navigate to agent root directory (may be in `/agents/base` folder)
4. Run `pnpm install`
5. Run `pnpm sierra watch` to connect local code to workspace

## Building Your Agent with createAgent

### Basic Structure

The main agent file is `main.tsx` in the agent directory. Use the `createAgent` method to define your agent:

```typescript
import { createAgent } from "@sierra/agent/base";
import { Condition, Glossary, Goal, jsx, ResponsePhrasing, Rule, tools, when } from "@sierra/agent";

export default createAgent({
  // Configuration goes here
});
```

### Brand Configuration

Add branding to customize your agent's identity:

```typescript
export default createAgent({
  brand: {
    agentName: "Floyd",
    organizationName: "Granite Peak Airlines",
    customerServiceTeamName: "Floyd's Flight Crew",
    customerNoun: "flyer",
  },
});
```

## Components and Extensions

### useAdditionalGoalAgentChildren

This property allows you to inject custom behavior into the BaseAgent:

```typescript
export default createAgent({
  useAdditionalGoalAgentChildren: () => {
    return (
      <>
        {/* Components go here */}
      </>
    );
  },
});
```

### Glossary Component

Define custom knowledge using the `<Glossary>` component:

```typescript
<Glossary content={`
  - Peak Explorers: The name of Granite Peak's frequent flyers program
  - Eagle Crew: The term for Granite Peak's flight attendants
`} />
```

### ResponsePhrasing Component

Control your agent's tone and style:

```typescript
<ResponsePhrasing content={[
  "You should be fun and breezy! Add some humor and a spirit of adventure!"
]} />
```

**Important Note**: Instructions are additive. To change behavior mid-conversation, explicitly tell the agent to ignore previous instructions:

```typescript
<Condition when={when.observation("The user is discussing a delayed or canceled flight")}>
  <ResponsePhrasing content={[
    "Don't be fun or humorous. Take a more serious and empathetic tone."
  ]} />
</Condition>
```

## Tools

### Registering Tools with registerTool

**Recommended approach** for creating tools that work in both code and Agent Studio:

```typescript
const FlightLookupTool = tools.registerTool({
  type: "lookup",
  name: "flightStatusLookup",
  description: "Lookup the status of a flight by flight number",
  noCodeId: "flightStatusLookup",
  params: {
    flightNumber: {
      type: "string",
      description: "The flight number to lookup",
    },
  },
  func: (_, params, controls) => {
    const fakeData = {
      flightNumber: params.flightNumber,
      startAirport: "LAX",
      endAirport: "SFO",
      status: "On time",
      // ... more data
    };
    return controls.result({ data: JSON.stringify(fakeData) });
  },
});
```

**Key points:**
- Use `registerTool` instead of `<LookupTool>` or `<ActionTool>` components when possible
- Tools can be referenced both in code and Agent Studio
- Include readable names and accurate descriptions
- Tool returns should be easy to understand

### Agent Intelligence with Tool Parameters

**Automatic parameter collection**: The agent automatically knows what parameters are needed to call tools by reading their descriptions. You don't need to explicitly instruct the agent to ask for missing parameters.

## Conditions and Goals

### Goal-Based Journeys

Use `<Condition>` to control when tools and goals are revealed to the agent:

```typescript
<Condition when={when.observation("The user is asking about the status of a flight")}>
  <Goal description="Lookup the status of a flight by flight number and report it back to the user">
    <FlightLookupTool />
  </Goal>
</Condition>
```

**Benefits:**
- Only provides relevant tools for the current context
- Reduces cognitive load on the agent
- Same concept as creating journeys in Agent Studio

## Event Handling

### onClientEvent Handler

React to events triggered by the chat client:

```typescript
export default createAgent({
  config: {
    textConfig: {
      enabledEvents: ["inactivity"],
      inactivityTimeoutSeconds: 60,
    },
  },
  onClientEvent: (props, next) => {
    const { event, conversation } = props;
    switch (event.type) {
      case "inactivity":
        conversation.output.send({
          type: "message",
          message: {
            role: "assistant",
            content: "Are you still there? I'm ready to help!"
          }
        });
        next(props); // Optional: defer to normal agent behavior
        break;
      default:
        next(props); // Handle all other events normally
        break;
    }
  },
});
```

**Common events:**
- `inactivity`: User hasn't replied after a timeout
- Agent startup
- User leaving chat
- User sending a message

**Testing events in Dev Chat:**
- Click the three-dot menu above send button
- Select "Send inactivity event" to manually trigger

## Complete Agent Example

```typescript
import { createAgent } from "@sierra/agent/base";
import integrationsRegistry from "./integrations-registry";
import { Condition, Glossary, Goal, jsx, ResponsePhrasing, Rule, tools, when } from "@sierra/agent";

const FlightLookupTool = tools.registerTool({
  type: "lookup",
  name: "flightStatusLookup",
  description: "Lookup the status of a flight by flight number",
  noCodeId: "flightStatusLookup",
  params: {
    flightNumber: {
      type: "string",
      description: "The flight number to lookup",
    },
  },
  func: (_, params, controls) => {
    const fakeData = {
      flightNumber: params.flightNumber,
      startAirport: "LAX",
      endAirport: "SFO",
      status: "On time",
      departureTime: "10:00 AM",
      arrivalTime: "12:00 PM",
      duration: "2 hours",
      aircraft: "Boeing 747",
      departureGate: "10",
      departureTerminal: "1",
      arrivalGate: "Unknown",
    };
    return controls.result({ data: fakeData });
  },
});

export default createAgent({
  config: {
    textConfig: {
      enabledEvents: ["inactivity"],
      inactivityTimeoutSeconds: 60,
    },
  },
  brand: {
    agentName: "Floyd",
    organizationName: "Granite Peak Airlines",
    customerServiceTeamName: "Floyd's Flight Crew",
    customerNoun: "flyer",
  },
  useAdditionalGoalAgentChildren: () => {
    return (
      <>
        <ResponsePhrasing content={[
          "You should be fun and breezy! Add some humor and a spirit of adventure!"
        ]} />
        
        <Glossary content={`
          - Peak Explorers: The name of Granite Peak's frequent flyers program
          - Eagle Crew: The term for Granite Peak's flight attendants
        `} />
        
        <Condition when={when.observation("The user is asking about the status of a flight")}>
          <Goal description="Lookup the status of a flight by flight number and report it back to the user">
            <FlightLookupTool />
          </Goal>
        </Condition>
        
        <Condition when={when.observation("The user is discussing a delayed or canceled flight")}>
          <ResponsePhrasing content={[
            "Don't be fun or humorous. Take a more serious and empathetic tone."
          ]} />
        </Condition>
      </>
    );
  },
  onClientEvent: (props, next) => {
    const { event, conversation } = props;
    switch (event.type) {
      case "inactivity":
        conversation.output.send({
          type: "message",
          message: {
            role: "assistant",
            content: "Are you still there? I'm ready to help!"
          }
        });
        next(props);
        break;
      default:
        next(props);
        break;
    }
  },
  integrationsRegistry,
});
```

## Testing Your Agent

1. Visit Agent Studio at https://upgrade-dev.sierra.ai/
2. Navigate to **Dev Chat**
3. Test conversations with your agent
4. Use three-dot menu to manually trigger events (e.g., inactivity)

## Best Practices

1. **Provide context, not instructions**: Give agents tools and information they need without overloading them
2. **Use Conditions wisely**: Only reveal relevant tools/goals for the current conversation context
3. **Clear descriptions**: Tool names, descriptions, and parameters should be readable and accurate
4. **Additive instructions**: Remember that instructions stack; explicitly override when needed
5. **Private sandboxing**: Workspaces are private - experiment freely before merging to releases


---

# Sierra AI - Agent Quality Guide

## Overview

Quality is fundamental to building production-ready agents. The quality framework serves as both a development guide and release checklist across five interconnected categories:

| Category | Description |
|----------|-------------|
| **Behavior** | How the agent behaves, interacts with APIs, and follows rules |
| **Humanness** | The agent's latency, audio synthesis, and flexibility that make it feel natural |
| **Brand** | Representation of your organization's brand, tone, and visual identity |
| **Observability** | Strong monitoring, alerting, and documentation for production reliability |
| **Maintainability** | Configuration-driven design and comprehensive testing for long-term success |

---

## 1. Behavior

Behavior encompasses how your agent acts, interacts with external systems, and follows defined rules. Well-designed behavior ensures agents handle complex conversations while maintaining accuracy and reliability.

### Start with Goal Agents

**Goal agents** are the most flexible, conversational agents and provide the foundation for building sophisticated, autonomous agents.

**Requirements:**
- Start with the standard agent template configuration
- Include `NoCodeJourneysTyped` in your goal agent to enable no-code tools (part of standard template)

### Build Abstracted, Asynchronous APIs

Object models give granular control over expected fields and how they're used within an agent. They define clear interfaces across fragmented APIs.

**API Design Best Practices:**

1. **Design for usage, not plumbing**: Define an interface that matches how you want to use them in journeys, rather than mirroring underlying API calls

2. **Provide a mock API**: Implement a lightweight mock version requiring no network access

3. **Implement a production API**: Ensure the production version aligns with the same interface

4. **Support multiple environments**: Allow the API to switch between staging and production endpoints based on configuration

5. **Inject via context**: Provide the API through context so all dependent components can access it consistently

6. **Toggle with memory variables**: Use a memory variable to control when the mock API is active

7. **Add resilience**: Set timeouts and implement error handling or fallback logic for predictable API errors

8. **Prefer futures (async) over sync calls**: This helps keep agents responsive

9. **Return structured results**: Always return a response or `APIError` object to make error handling predictable and consistent

**Example of well-structured API implementation:**

```typescript
export class ProductionAPI implements API {
  function getUser(userId: user): Future<User | APIError> {
    const responseFuture = fetch.json("https://userapi.com").map(
      response => {
        if (isError(response)) {
          return response;
        }
        return response.access_token;
      });
  }
}
```

### Encode Goal Best Practices

Follow Sierra's detailed best practices guidance for structuring goals, defining conditions, and applying tools effectively.

**Goal Implementation Best Practices:**

1. **Design tools as fully encapsulated capabilities**: Frame each tool around the full outcome it should achieve (e.g., "process a return"), rather than a partial step (e.g., "collect return reason")

2. **Anticipate and document conflicts**: Identify situations where goals, tools, or context may overlap or compete, and make those tradeoffs explicit

---

## 2. Humanness

Humanness makes your agent feel natural, responsive, and easy to interact with. This includes optimizing response times, improving audio quality, and ensuring conversational flexibility.

### Optimize Latency in Voice Agents

Latency is a **key metric** for evaluating voice agents and critical for creating human-like interactions.

**Latency Optimization Strategies:**

- **Combine related tool calls** into a single call where possible (multiple tool calls run sequentially, increasing latency)
- **Tune knowledge responses** by adjusting parameters such as maximum article count or sufficiency thresholds
- **Remove unnecessary layers** like extra Tool facades or redundant parameter validations
- **Gate additional rules and context** using `Conditions` or `when` statements
- **Eliminate over-used Conditions** (e.g., if a Condition is unlocked in ~95% of conversations, remove it)
- **Use `useAgentMonitors`** instead of Condition/Outcome skills for intent detection
- **Pass transfer summaries as parameters** on transfer tool props rather than generating them separately

### Refine Audio Synthesis

- Verify pronunciation of key terms and add synthesis rewrites where needed
- Define `synthesisRewriteRules` in the `main.tsx` `define` function
- Leverage synthesis caching if pronunciation issues persist, ensuring verbatim responses are rendered consistently

### Ensure Natural Language

Your agent's phrasing should feel conversational and approachable, avoiding robotic or overly formal patterns.

**Natural Language Best Practices:**

- **Incorporate context into prompts** (e.g., "You mentioned an issue with your order—could you share more about what happened?")
- **Be prescriptive in word choice and guidance:**
  - Instruct the agent on **what to say** rather than what **not** to say
  - Use clear instructions and few-shot examples
  - Omit redundant intros ("To fix the issue...") and endings ("...Let me know if I can answer more questions!")
- **Update additional configurations** for progress indicators and individual Tools
- **Adapt guidance to modality** (chat, voice, email, etc.)
- **Continuously monitor naturalness** with simulation tests and agent monitors

### Enable Agent Flexibility

Flexible agents adapt dynamically throughout a conversation, unlocking behaviors and transitioning between intents when appropriate.

**Flexibility Best Practices:**

- **Start broad**: Use a top-level goal such as "Determine the reason the customer contacted support"
- **Avoid unnecessary exits**: Keep the customer within the goal agent whenever possible, except for explicit transfers
- **Smartly partition intents** to avoid overloading the agent with context

---

## 3. Brand

Brand encompasses how your agent represents your organization's identity, tone, and visual presentation. Consistent brand application ensures your agent feels like a natural extension of your customer experience.

### Apply Tone

Agent tone should be applied consistently across all modalities and validated through testing.

**Tone Best Practices:**

- Define tone guidance in configuration whenever possible
- **Validate tone with tests** (e.g., "Agent is empathetic when the customer is frustrated")
- **Apply specific guidance** rather than relying on generic phrases like "Be concise and friendly"
- **Reference your brand's marketing style guide**
- **Distill to fundamental principles** into 5–6 bullets for tone and voice guidance

### UI Design

Your agent's user interface should align with your brand and incorporate required legal and compliance elements.

**UI Requirements:**

- Display required disclaimers (e.g., "This chat may be recorded for quality assurance")
- Match UI colors to the surrounding site or application
- Render the agent greeting in releases where "start" events are enabled

---

## 4. Observability

Observability ensures your agent can be monitored, debugged, and maintained effectively in production. Strong observability practices help identify issues quickly and maintain reliability.

### Create Reports for Top Metrics

Metrics should be easy to access and track key performance indicators.

**Recommended Metrics:**

- Create a single top-level category that includes:
  - Total conversations
  - Resolution rate
  - CSAT (if available)

### Alert Configuration

**Required Alerts:**

- Trigger alerts for unusual increases in `^unrecoverable-error` tags
- Trigger alerts for unusual increases in `^sierra-fetch-error` tags
- Add alerts on failing transfers

---

## 5. Maintainability

Maintainability ensures agents can be updated, debugged, and extended over time. This requires good code organization, comprehensive testing, and clear documentation.

### Code Organization

Agent code should be properly organized and accessible by the right team members.

**Organization Best Practices:**

- Include a `tags.ts` file if you define tags in code to ensure proper tag tracking
- Use developer (`^[tag]`) tags liberally for automation
- Use post-conversation hooks to emit tag matches on message content
- Define all environment variables as string enums in an `env.ts` file

### Prefer Configuration Over Code

Configuration makes business logic more visible, maintainable, and accessible to non-technical stakeholders, reducing reliance on code changes.

### Write Extensive Tests

Comprehensive simulation tests ensure intended behavior and prevent regressions.

**Testing Best Practices:**

- Write simulation tests for **every permutation** of your flow
- Ensure each test has automated success and failure criteria using tags
- **Always use the mock API in tests** to guarantee idempotency and reproducibility
- Mark at least one test as **release-blocking (critical)** for every core flow

Learn more in the **Simulations guide**.

### Write Agent-Specific Documentation

Well-documented agents make onboarding easier and ensure long-term maintainability.

**Documentation Requirements:**

- Describe core agent capabilities and supported journeys
- Document key APIs the agent interacts with

---

## Next Steps

After completing this quality guide:

1. **Run your quality assessment** - Review the agent live and run automated evaluation prompts
2. **Prioritize improvements** - Address the most impactful gaps first
3. **Implement incrementally** - Make changes in manageable, testable batches
4. **Monitor in production** - Apply observability practices to track performance
5. **Iterate and improve** - Revisit these standards as your agent grows in complexity and usage

**Remember**: Quality is not a one-time milestone — it's an ongoing process. Regular reviews and improvements will help you maintain high standards as your agent evolves.

---

## Quality Checklist Summary

### ✅ Behavior
- [ ] Using goal agent foundation with standard template
- [ ] Included `NoCodeJourneysTyped` for no-code tools
- [ ] Built abstracted, asynchronous APIs with proper error handling
- [ ] Tools designed as fully encapsulated capabilities
- [ ] Documented conflicts and tradeoffs

### ✅ Humanness
- [ ] Optimized latency (combined tool calls, removed unnecessary layers)
- [ ] Refined audio synthesis with `synthesisRewriteRules`
- [ ] Ensured natural, conversational language
- [ ] Enabled agent flexibility with broad top-level goals

### ✅ Brand
- [ ] Applied consistent tone across all modalities
- [ ] Validated tone with tests
- [ ] UI design matches brand and includes required disclaimers
- [ ] Referenced brand's marketing style guide

### ✅ Observability
- [ ] Created reports for top metrics (conversations, resolution rate, CSAT)
- [ ] Configured alerts for error tags and failing transfers

### ✅ Maintainability
- [ ] Organized code with `tags.ts` and `env.ts` files
- [ ] Preferred configuration over code
- [ ] Written extensive simulation tests with mock APIs
- [ ] Documented agent capabilities and APIs

