# CareerOS Foundation

# CAREEROS — LOVABLE PROMPT 1

## FOUNDATION + PUBLIC WEBSITE + AUTHENTICATION

You are extending an EXISTING CareerOS React application.

I am providing the following documents along with this prompt:

• Product Requirements Document (PRD)

• Standard Operating Procedure (SOP)

• Technology Stack Document (TSD)

• UI/UX Specification

• Existing CareerOS source code (GitHub Repository / ZIP)

These documents are the SINGLE SOURCE OF TRUTH.

────────────────────────────────────────────────────────

CRITICAL INSTRUCTIONS

────────────────────────────────────────────────────────

DO NOT create a new project.

DO NOT restart the application.

DO NOT redesign CareerOS from scratch.

DO NOT replace the current architecture.

DO NOT delete existing files unless absolutely necessary.

DO NOT duplicate components that already exist.

DO NOT modify architecture in a way that breaks future development.

Extend the existing project only.

Everything built in this prompt MUST be reusable by all future prompts.

The project must remain production-ready and scalable.

The frontend built now will later connect to:

• Supabase Authentication

• PostgreSQL

• Supabase Storage

• Groq AI

• Notifications

• Billing

• Analytics

through the existing service/repository architecture.

Never tightly couple UI to mock data.

Respect the current architecture.

────────────────────────────────────────────────────────

OBJECTIVE OF PROMPT 1

────────────────────────────────────────────────────────

This prompt establishes the COMPLETE FOUNDATION.

DO NOT build Candidate modules.

DO NOT build Recruiter modules.

DO NOT build AI modules.

DO NOT build Job Marketplace.

DO NOT build Resume Analyzer.

DO NOT build Analytics.

Those will be added in future prompts.

Instead build the reusable system that every future module plugs into.

────────────────────────────────────────────────────────

1. DESIGN SYSTEM

────────────────────────────────────────────────────────

Create a premium SaaS design system.

Design language:

• Modern

• Professional

• Clean

• Minimal

• AI-first

• White primary surfaces

• Blue accent

• Rounded cards

• Soft shadows

• Beautiful spacing

• Excellent typography

• Smooth animations

Create reusable components including:

• Button

• Icon Button

• Card

• Statistic Card

• Input

• Textarea

• Password Input

• Select

• Combobox

• Checkbox

• Radio

• Switch

• Modal

• Dialog

• Drawer

• Sheet

• Dropdown

• Popover

• Tooltip

• Accordion

• Tabs

• Breadcrumb

• Badge

• Premium Badge

• Alert

• Toast

• Avatar

• Skeleton Loader

• Empty State

• Error State

• Success State

• Loading Spinner

• Confirmation Dialog

• Feature Locked Card

• Upgrade Card

• Search Bar

• Pagination

• Table Components

• Section Header

• Page Container

Everything must be reusable.

────────────────────────────────────────────────────────

2. APPLICATION LAYOUTS

────────────────────────────────────────────────────────

Create reusable layouts.

Public Layout

Contains:

• Navbar

• Main Content

• Footer

Dashboard Layout

Contains:

• Sidebar

• Top Navigation

• Breadcrumb

• Notification Button

• Profile Menu

• Content Area

Do NOT create dashboard pages.

Only layouts.

────────────────────────────────────────────────────────

3. ROUTING ARCHITECTURE

────────────────────────────────────────────────────────

Create scalable routing.

Public Routes

/

/features

/pricing

/faq

/login

/signup

/forgot-password

/reset-password

/role-selection

Protected Routes

/candidate/*

/recruiter/*

Create placeholder route containers only.

Protected routes must support:

• Loading

• Unauthorized

• Redirect

• Authenticated

Backend authentication comes later.

────────────────────────────────────────────────────────

4. PUBLIC LANDING WEBSITE

────────────────────────────────────────────────────────

Build a premium SaaS landing website.

Sections:

• Hero

• Features

• How CareerOS Works

• Candidate Benefits

• Recruiter Benefits

• AI Capabilities

• Product Preview

• Social Proof

• Pricing Preview

• FAQ

• CTA

• Footer

The website should communicate:

CareerOS is an AI-powered Career Operating System.

NOT a traditional job board.

Use beautiful animations and micro-interactions.

────────────────────────────────────────────────────────

5. NAVBAR

────────────────────────────────────────────────────────

Responsive.

Desktop.

Tablet.

Mobile.

Sticky.

Transparent over Hero.

Solid after scrolling.

Navigation:

• Logo

• Features

• Pricing

• FAQ

• Login

• Get Started

────────────────────────────────────────────────────────

6. FOOTER

────────────────────────────────────────────────────────

Professional SaaS footer.

Include:

• Navigation

• Product

• Resources

• Company

• Legal

• Social Links

• Newsletter UI

────────────────────────────────────────────────────────

7. AUTHENTICATION

────────────────────────────────────────────────────────

Frontend only.

Pages:

• Login

• Signup

• Forgot Password

• Reset Password

• Role Selection

Role Selection options:

Candidate

Recruiter

Support:

• Validation

• Disabled State

• Loading State

• Error State

• Success State

Backend will be connected later.

────────────────────────────────────────────────────────

8. AUTH COMPONENTS

────────────────────────────────────────────────────────

Create reusable authentication components.

Include:

• Login Form

• Signup Form

• Password Input

• Forgot Password Form

• Reset Password Form

• Role Cards

• Email Verification Placeholder

• Authentication Skeletons

• Success Components

────────────────────────────────────────────────────────

9. SHARED COMPONENTS

────────────────────────────────────────────────────────

Create reusable components used throughout the platform.

Include:

• Search Bar

• Notification Bell

• User Avatar

• Dropdown

• Pagination

• Empty State

• Error State

• Loading State

• Confirmation Dialog

• Premium Badge

• Feature Locked Card

• Upgrade Card

No business logic.

UI only.

────────────────────────────────────────────────────────

10. THEME

────────────────────────────────────────────────────────

Support:

• Light Theme

• Dark Theme

Persist user preference.

────────────────────────────────────────────────────────

11. RESPONSIVENESS

────────────────────────────────────────────────────────

Support:

• 320px

• 375px

• Tablet

• Laptop

• Desktop

• Large Desktop

No horizontal scrolling.

Responsive navigation.

Responsive typography.

Responsive cards.

────────────────────────────────────────────────────────

12. ACCESSIBILITY

────────────────────────────────────────────────────────

Support:

• Keyboard navigation

• Semantic HTML

• Proper labels

• ARIA attributes

• Focus rings

• Good contrast

────────────────────────────────────────────────────────

13. CODE QUALITY

────────────────────────────────────────────────────────

Use:

• React 19

• TypeScript

• Vite

• Tailwind CSS v4

• shadcn/ui

• Radix UI

• Motion

• React Router v7

• React Hook Form

• Zod

Requirements:

• No duplicate components

• No dead code

• No TypeScript errors

• No console errors

• Clean architecture

────────────────────────────────────────────────────────

14. DATA ARCHITECTURE

────────────────────────────────────────────────────────

DO NOT place business logic inside pages.

Respect the existing architecture.

Architecture must remain:

UI

↓

Hooks

↓

Services

↓

Repository

↓

Data Source

The repository will later be replaced by Supabase.

Do not scatter data across components.

────────────────────────────────────────────────────────

15. FUTURE COMPATIBILITY

────────────────────────────────────────────────────────

Everything built now must be reusable for:

• Candidate Portal

• Recruiter Portal

• Resume Analyzer

• AI Career Copilot

• AI Match Score

• Job Marketplace

• Notifications

• Analytics

• Pricing

• Subscription

• Settings

• Interview Module

• Hiring Pipeline

without requiring architecture changes.

────────────────────────────────────────────────────────

16. FINAL EXPECTED OUTPUT

────────────────────────────────────────────────────────

At the end of this prompt the project should contain:

✅ Premium Landing Website

✅ Complete Authentication UI

✅ Shared Design System

✅ Shared Layouts

✅ Shared Navigation

✅ Protected Route Architecture

✅ Theme Support

✅ Responsive Foundation

✅ Accessibility Support

✅ Reusable UI Components

✅ Clean Folder Structure

✅ Production-ready Frontend Foundation

The next prompts will build Candidate, Recruiter, AI, Analytics, Notifications, Settings, Pricing, and Backend integration on top of this foundation.

IMPORTANT:

Build this as if you are creating the foundation for a large production SaaS application.

Optimize for maintainability, reusability, scalability, consistency, and future integration.

DO NOT implement placeholder pages with disconnected UI.

Everything should feel cohesive and ready for future expansion.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/731f9aae-0712-495c-991f-ec5e573b5301).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
