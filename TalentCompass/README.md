# Talent Compass

ANCHOR — MASTER BUILD PROMPT

1. PRODUCT OVERVIEW

Build a modern SaaS web application for HR/recruitment teams that helps recruiters and hiring teams manage, analyze, and evaluate candidate resumes throughout the recruitment and interview process.

The core product is a Candidate Resume & Interview Evaluation Workspace.

Users should be able to:

Upload and parse CV/resumes

View the original resume

Extract and display structured candidate information

Organize candidates by recruitment stage/status

Add internal comments and notes

View comments from other recruiters and technical interviewers

Create and manage interview evaluations

Allow multiple interviewers to score candidates

Automatically calculate the candidate's average interview score

Associate candidates with specific open positions

Track the candidate's progress through the hiring process

The application should feel like a serious professional recruitment tool—not a generic AI SaaS dashboard.

Prioritize clarity, speed, information density, and excellent UX.





2. APPLICATION STRUCTURE

Create the following routes:

/

Landing page

/auth

Authentication page containing Login and Signup states.

/app

Main authenticated recruitment dashboard.

The /app experience is the primary product experience and should receive the most attention.





3. AUTHENTICATION

Create a polished authentication UI.

Signup fields

First Name

Last Name

Company Position

Business Email

Business Phone

Login

Provide:

Business Email

Password

Remember me

Forgot password

Login CTA

For the initial UI implementation, authentication can be mocked.

Do not connect Supabase yet.

The authentication architecture should, however, be structured so that Supabase authentication can be connected later without rebuilding the UI.





4. MAIN APP — /app

The main dashboard is a recruitment workspace.

The primary view should allow the user to quickly understand:

How many candidates they have

Which candidates are new

Which candidates are currently interviewing

Which candidates are awaiting feedback

Which candidates are progressing

Which candidates have been rejected

Average candidate scores

Which positions candidates belong to

The main candidate area should be the central focus of the interface.





5. CANDIDATE MANAGEMENT

Each candidate should have a dedicated candidate record.

A candidate should contain at minimum:

Full name

Email

Phone

Position

Resume

Resume parsed information

Current status

Interview history

Interview scores

Average score

Recruiter comments

Technical interviewer comments

Created date

Updated date

Candidate statuses should support a clear recruitment pipeline, for example:

New

Screening

Interview

Technical Interview

Final Interview

Offer

Hired

Rejected

The UI should make changing a candidate's status extremely easy.

Status changes should feel immediate and intuitive.





6. CANDIDATE DETAIL EXPERIENCE

When opening a candidate, create a detailed candidate workspace.

The user should be able to see:

Candidate overview

Candidate name

Current position

Current recruitment status

Overall average score

Contact information

Resume upload information

Resume

Display the candidate's original resume in a clean document viewer.

The user should be able to visually distinguish:

Original resume/document

Parsed candidate information

Interview feedback

Do not replace the original resume with parsed data.

Both should remain accessible.

Parsed resume information

Show structured information extracted from the resume, such as:

Professional summary

Work experience

Education

Skills

Certifications

Languages

Years of experience

For the first UI implementation, use realistic mock data.





7. COMMENTS & INTERNAL NOTES

Users should be able to add internal comments to candidates.

Comments should display:

Author

Author role

Date/time

Comment content

Different team members should be able to leave feedback throughout the recruitment process.

Clearly distinguish comments from different stages of the process.

For example:

Recruiter feedback

HR feedback

Technical interviewer feedback

Final interview feedback

Comments should appear in chronological order.

Include an intuitive comment input and submit action.





8. INTERVIEW EVALUATION

Candidates can have multiple interviews.

Each interview should contain:

Interview type

Interviewer

Date

Status

Score

Comments

Interview criteria

Multiple interviewers can evaluate the same candidate.

Each interviewer should be able to provide a score.

The system should automatically calculate the candidate's average score from all submitted interview scores.

Example:

Interviewer 1 → 8/10
Interviewer 2 → 7/10
Interviewer 3 → 9/10

Average → 8.0/10

The average should update automatically whenever a new score is added or an existing score changes.

Do not hard-code the average.





9. POSITIONS

Create a Positions concept.

Each position should contain:

Position name

Department

Description

Status

Number of candidates

Created date

Candidates should be associated with a position.

The dashboard should allow users to understand which candidates are being considered for which position.





10. DATABASE ARCHITECTURE

The initial development phase should use mock/local data only.

Do NOT connect Supabase yet.

However, structure the application around these future database entities:

Users

id

firstName

lastName

email

phone

companyPosition

createdAt

Candidates

id

firstName

lastName

email

phone

resumeUrl

parsedResumeData

status

positionId

createdAt

updatedAt

Interviews

id

candidateId

interviewerId

interviewType

score

comments

status

interviewDate

createdAt

Positions

id

name

department

description

status

createdAt

Comments

Although the initial required database entities are Users, Candidates, Interviews and Positions, structure comments as their own logical entity so they can later be persisted independently.

Possible fields:

id

candidateId

authorId

content

stage

createdAt

updatedAt

Design the frontend so replacing mock data with Supabase queries later is straightforward.





11. DESIGN DIRECTION

The product should follow an Apple-like, minimal, premium interface philosophy.

The UI should feel:

Clean

Precise

Professional

Calm

Modern

High quality

Information-focused

Avoid the typical generic "AI SaaS" appearance.

Do NOT use:

Purple gradients

Excessive gradients

Glowing cards

Overly futuristic visuals

Excessive glassmorphism

Huge decorative illustrations

Excessive rounded pills

Generic AI robot imagery

This is a professional recruitment product.

The interface should communicate trust, efficiency, and precision.





12. SCREENSHOT REFERENCE

The provided screenshots are the primary visual reference for the /app page.

Recreate the layout, hierarchy, spacing, component relationships, density, and interaction patterns shown in the screenshots as closely as possible.

Do not blindly copy colors from the screenshots.

The screenshots define the UI structure and visual language.

The separate brand guidelines will define the actual product colors.

If something is not explicitly shown in the screenshots, use the same design language and make the smallest reasonable UX assumption.

Do not introduce unrelated UI patterns.





13. BRAND SYSTEM

The brand identity will be provided separately.

When brand guidelines are supplied, use them as the single source of truth for:

Primary color

Background color

Surface color

Text colors

Accent colors

Typography

Border treatment

Radius

Spacing

Do not invent a new color palette.

Do not use colors from the screenshots if they conflict with the brand system.





14. TYPOGRAPHY

Primary typeface:

Inter

Use Inter consistently throughout the application.

Establish a clear hierarchy between:

Page titles

Section titles

Candidate names

Metadata

Body text

Labels

Statuses

Scores

Buttons

Typography should remain compact and highly readable.





15. COMPONENT DESIGN

Use a consistent component system.

Important components should include:

Sidebar/navigation

Top navigation

Candidate table/list

Candidate card

Candidate status indicator

Search

Filters

Position selector

Candidate detail panel/page

Resume viewer

Comments feed

Comment composer

Interview evaluation card

Interview score indicator

Average score component

Modal/dialog

Dropdown

Tabs

Toast/notification

Empty states

Loading states

Confirmation states

All components should share the same design language.





16. ROUNDED UI

Cards and containers should have tasteful rounded corners.

Avoid making every individual element excessively rounded.

Use rounded corners primarily for:

Cards

Panels

Modals

Inputs

Buttons where appropriate

Resume/document containers

The interface should feel refined rather than playful.





17. LIGHT & DARK MODE

Implement both:

Light theme

Dark theme

Include a visible theme switcher in the application UI.

The design should be intentionally designed for both themes—not simply inverted.

Maintain:

Strong text contrast

Clear hierarchy

Readable resume content

Visible borders/dividers

Appropriate surface separation

Accessible controls

The selected theme should persist during the session.





18. RESPONSIVENESS

The application must be responsive.

Prioritize:

Desktop

Primary experience.

Tablet

Adapt navigation, candidate lists and detail layouts appropriately.

Mobile

Maintain access to candidate information, comments, statuses and scores without creating a cramped desktop layout.

Do not simply shrink the desktop UI.





19. ANIMATION & INTERACTION

The interface should feel alive but restrained.

Use smooth, purposeful animations.

On initial page load:

Fade the entire application in smoothly.

Use subtle animations for:

Page transitions

Sidebar interactions

Dropdowns

Modals

Tabs

Candidate status changes

Adding comments

Updating scores

Loading states

Hover states

Theme switching

Animations should be fast and subtle.

Avoid excessive motion.

The animation style should feel similar to polished Apple interfaces.

Prefer smooth opacity, transform and scale transitions over distracting effects.





20. LOADING & EMPTY STATES

Design proper states for:

Loading candidates

No candidates

No interviews

No comments

No resume

No search results

No positions

Never leave blank areas without explaining what is happening.

Use skeleton loaders where appropriate.





21. MOCK DATA

Before connecting Supabase, populate the application with realistic mock recruitment data.

Create enough data to demonstrate the interface properly.

Include:

Multiple candidates

Multiple positions

Different recruitment statuses

Multiple interviewers

Different interview scores

Different average scores

Recruiter comments

Technical feedback

Candidates with and without resumes

Candidates at different recruitment stages

Do not use repetitive placeholder names such as "John Doe" everywhere.

The UI should look like a real recruitment application when first opened.





22. DEVELOPMENT SEQUENCE

Follow this order strictly.

PHASE 1 — UI

Build the complete frontend experience first.

Implement:

Landing page

Authentication UI

Main dashboard

Candidate list

Candidate detail experience

Resume viewer

Comments

Interview evaluations

Positions

Status management

Score calculations using mock data

Light/dark theme

Responsive layouts

Loading/empty states

Animations

PHASE 2 — DATA ARCHITECTURE

After the UI is complete, prepare the data layer for Supabase.

Keep data access separated from UI components.

Do not scatter database queries throughout the UI.

PHASE 3 — SUPABASE

Only after the UI is stable:

Connect Supabase authentication

Create database tables

Connect Users

Connect Candidates

Connect Interviews

Connect Positions

Connect Comments

Persist candidate statuses

Persist comments

Persist interview scores

Calculate averages from database data

Persist resumes/files

PHASE 4 — POLISH

After functionality works:

Improve loading states

Improve error handling

Improve animations

Improve accessibility

Improve responsive behavior

Optimize performance

Remove unnecessary UI complexity





23. IMPORTANT IMPLEMENTATION RULES

Start with the UI.

Do not connect Supabase during the initial UI phase.

Use realistic mock data.

Keep components modular and reusable.

Keep database logic separate from presentation logic.

Do not hard-code calculated values such as average scores.

Candidate status must be changeable.

Comments must support multiple authors.

Candidates can have multiple interviews.

Candidates can have multiple interviewers.

The average score must be calculated dynamically.

Preserve the original resume.

Keep parsed resume information separate from the original document.

Maintain a clear relationship between candidates and positions.

Design for both light and dark themes.

Make the application responsive.

Use smooth but restrained animations.

Follow the supplied screenshots for layout and interaction patterns.

Follow the supplied brand document for colors and branding.

Do not introduce purple gradients or generic AI SaaS styling.





24. QUALITY BAR

The final result should feel like a production-quality recruitment platform, not a prototype.

Prioritize:

UX > visual polish > unnecessary features

Every screen should have a clear hierarchy.

Every interaction should have a clear purpose.

Every important piece of candidate information should be easy to find.

The application should feel fast, calm, precise and trustworthy.

When making design decisions, always ask:

"Would a professional recruiter want to use this every day?"

If the answer is no, simplify it.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Production

`npm run build` creates a standalone Node server in `.output/`. Run it with `npm start` (Node 22.16+); the start command loads a local `.env` if present. In hosted environments configure the same variables through your host. The server uses port 3000 by default; set `PORT` to override it. Local development uses port 8080.

The build uses Vite, TanStack Start, React, Tailwind and Nitro directly. Supabase manages browser sessions in its standard local storage.

## Optional AI descriptions

Set server-only `OPENAI_API_KEY` to enable direct OpenAI description generation. `OPENAI_MODEL` optionally overrides the existing `gpt-6-astra` model. Without a key, generation continues to use the local description template. See the [Responses API documentation](https://developers.openai.com/api/docs/guides/migrate-to-responses).
