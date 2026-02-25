import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { RequireAuth } from './auth/RequireAuth';
import { LoadingState } from './components/dashboard/LoadingState';

// Lazy load components
const LoginPage = lazy(() => import('./auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./auth/SignupPage').then(m => ({ default: m.SignupPage })));
const Shell = lazy(() => import('./layout/Shell').then(m => ({ default: m.Shell })));
const DashboardPage = lazy(() => import('./dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const KnowledgeBaseRouteWrapper = lazy(() => import('./knowledge/KnowledgeBaseRouteWrapper').then(m => ({ default: m.KnowledgeBaseRouteWrapper })));
const OrgAiPolicyPage = lazy(() => import('./org/OrgAiPolicyPage').then(m => ({ default: m.OrgAiPolicyPage })));
const PresetsGalleryPage = lazy(() => import('./presets/PresetsGalleryPage').then(m => ({ default: m.PresetsGalleryPage })));
const ChatPage = lazy(() => import('./chat/ChatPage').then(m => ({ default: m.ChatPage })));
const ConversationInboxPage = lazy(() => import('./inbox/ConversationInboxPage').then(m => ({ default: m.ConversationInboxPage })));
const WebhooksPage = lazy(() => import('./integrations/WebhooksPage').then(m => ({ default: m.WebhooksPage })));
const AuditLogPage = lazy(() => import('./audit/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const RetentionSettingsPage = lazy(() => import('./retention/RetentionSettingsPage').then(m => ({ default: m.RetentionSettingsPage })));
const PublicSharedConversationPage = lazy(() => import('./public/PublicSharedConversationPage').then(m => ({ default: m.PublicSharedConversationPage })));
const OrgMembersPage = lazy(() => import('./org/OrgMembersPage').then(m => ({ default: m.OrgMembersPage })));
const OrgApiKeysPage = lazy(() => import('./org/OrgApiKeysPage').then(m => ({ default: m.OrgApiKeysPage })));
const OrgBrandingPage = lazy(() => import('./org/OrgBrandingPage').then(m => ({ default: m.OrgBrandingPage })));
const OrgAnalyticsRouteWrapper = lazy(() => import('./org/OrgAnalyticsRouteWrapper').then(m => ({ default: m.OrgAnalyticsRouteWrapper })));
// Docs 41-50 pages
const OrgSafetySettingsPage = lazy(() => import('./org/OrgSafetySettingsPage').then(m => ({ default: m.OrgSafetySettingsPage })));
const OrgSafetyIncidentsPage = lazy(() => import('./org/OrgSafetyIncidentsPage').then(m => ({ default: m.OrgSafetyIncidentsPage })));
const PromptTemplatesPage = lazy(() => import('./org/PromptTemplatesPage').then(m => ({ default: m.PromptTemplatesPage })));
const ChatProfilesPage = lazy(() => import('./org/ChatProfilesPage').then(m => ({ default: m.ChatProfilesPage })));
const OrgModelsSettingsPage = lazy(() => import('./org/OrgModelsSettingsPage').then(m => ({ default: m.OrgModelsSettingsPage })));
const PlaygroundPage = lazy(() => import('./org/PlaygroundPage').then(m => ({ default: m.PlaygroundPage })));
const ExperimentsPage = lazy(() => import('./org/ExperimentsPage').then(m => ({ default: m.ExperimentsPage })));
const OrgUsageDashboardPage = lazy(() => import('./org/OrgUsageDashboardPage').then(m => ({ default: m.OrgUsageDashboardPage })));
const OrgBillingPage = lazy(() => import('./org/OrgBillingPage').then(m => ({ default: m.OrgBillingPage })));
const OrgSsoSettingsPage = lazy(() => import('./org/OrgSsoSettingsPage').then(m => ({ default: m.OrgSsoSettingsPage })));
const OrgScimSettingsPage = lazy(() => import('./org/OrgScimSettingsPage').then(m => ({ default: m.OrgScimSettingsPage })));

const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: (
      <Suspense fallback={<LoadingState fullWidth />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/auth/signup',
    element: (
      <Suspense fallback={<LoadingState fullWidth />}>
        <SignupPage />
      </Suspense>
    ),
  },
  {
    path: '/s/:slug',
    element: (
      <Suspense fallback={<LoadingState fullWidth />}>
        <PublicSharedConversationPage />
      </Suspense>
    ),
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <Suspense fallback={<LoadingState fullWidth />}>
          <Shell />
        </Suspense>
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'chat/:conversationId',
        element: <ChatPage />,
      },
      {
        path: 'orgs/:orgId',
        element: <DashboardPage />,
      },
      {
        path: 'orgs/:orgId/knowledge',
        element: <KnowledgeBaseRouteWrapper />,
      },
      {
        path: 'orgs/:orgId/chat',
        element: <ChatPage />,
      },
      {
        path: 'orgs/:orgId/chat/:conversationId',
        element: <ChatPage />,
      },
      {
        path: 'orgs/:orgId/settings/ai-policy',
        element: <OrgAiPolicyPage />,
      },
      {
        path: 'orgs/:orgId/presets',
        element: <PresetsGalleryPage />,
      },
      {
        path: 'orgs/:orgId/inbox',
        element: <ConversationInboxPage />,
      },
      {
        path: 'orgs/:orgId/settings/webhooks',
        element: <WebhooksPage />,
      },
      {
        path: 'orgs/:orgId/audit-log',
        element: <AuditLogPage />,
      },
      {
        path: 'orgs/:orgId/settings/retention',
        element: <RetentionSettingsPage />,
      },
      {
        path: 'orgs/:orgId/settings/members',
        element: <OrgMembersPage />,
      },
      {
        path: 'orgs/:orgId/settings/api-keys',
        element: <OrgApiKeysPage />,
      },
      {
        path: 'orgs/:orgId/settings/branding',
        element: <OrgBrandingPage />,
      },
      {
        path: 'orgs/:orgId/analytics',
        element: <OrgAnalyticsRouteWrapper />,
      },
      // Docs 41-50: New feature routes
      {
        path: 'orgs/:orgId/settings/safety',
        element: <OrgSafetySettingsPage />,
      },
      {
        path: 'orgs/:orgId/settings/safety/incidents',
        element: <OrgSafetyIncidentsPage />,
      },
      {
        path: 'orgs/:orgId/prompt-templates',
        element: <PromptTemplatesPage />,
      },
      {
        path: 'orgs/:orgId/chat-profiles',
        element: <ChatProfilesPage />,
      },
      {
        path: 'orgs/:orgId/settings/models',
        element: <OrgModelsSettingsPage />,
      },
      {
        path: 'orgs/:orgId/playground',
        element: <PlaygroundPage />,
      },
      {
        path: 'orgs/:orgId/experiments',
        element: <ExperimentsPage />,
      },
      {
        path: 'orgs/:orgId/usage',
        element: <OrgUsageDashboardPage />,
      },
      {
        path: 'orgs/:orgId/billing',
        element: <OrgBillingPage />,
      },
      {
        path: 'orgs/:orgId/settings/sso',
        element: <OrgSsoSettingsPage />,
      },
      {
        path: 'orgs/:orgId/settings/scim',
        element: <OrgScimSettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingState fullWidth />}>
        <LoginPage />
      </Suspense>
    ),
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
