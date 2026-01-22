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

