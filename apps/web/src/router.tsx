import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { SignupPage } from './auth/SignupPage';
import { RequireAuth } from './auth/RequireAuth';
import { Shell } from './layout/Shell';
import { KnowledgeBaseRouteWrapper } from './knowledge/KnowledgeBaseRouteWrapper';
import { OrgAiPolicyPage } from './org/OrgAiPolicyPage';
import { PresetsGalleryPage } from './presets/PresetsGalleryPage';
// Lazy load ChatPage
// import { ChatPage } from './chat/ChatPage';
import { ConversationInboxPage } from './inbox/ConversationInboxPage';
import { WebhooksPage } from './integrations/WebhooksPage';
import { AuditLogPage } from './audit/AuditLogPage';
import { RetentionSettingsPage } from './retention/RetentionSettingsPage';
import { PublicSharedConversationPage } from './public/PublicSharedConversationPage';
import { OrgMembersPage } from './org/OrgMembersPage';
import { OrgApiKeysPage } from './org/OrgApiKeysPage';
import { OrgBrandingPage } from './org/OrgBrandingPage';
// Lazy load OrgAnalyticsRouteWrapper
// import { OrgAnalyticsRouteWrapper } from './org/OrgAnalyticsRouteWrapper';
import { OrgSafetySettingsPage } from './org/OrgSafetySettingsPage';
import { OrgSafetyIncidentsPage } from './org/OrgSafetyIncidentsPage';
import { PromptTemplatesPage } from './org/PromptTemplatesPage';
import { ChatProfilesPage } from './org/ChatProfilesPage';
import { OrgModelsSettingsPage } from './org/OrgModelsSettingsPage';
import { PlaygroundPage } from './org/PlaygroundPage';
import { ExperimentsPage } from './org/ExperimentsPage';
import { OrgUsageDashboardPage } from './org/OrgUsageDashboardPage';
import { OrgBillingPage } from './org/OrgBillingPage';
import { OrgSsoSettingsPage } from './org/OrgSsoSettingsPage';
import { OrgScimSettingsPage } from './org/OrgScimSettingsPage';

const ChatPage = React.lazy(() => import('./chat/ChatPage').then(module => ({ default: module.ChatPage })));
const OrgAnalyticsRouteWrapper = React.lazy(() => import('./org/OrgAnalyticsRouteWrapper').then(module => ({ default: module.OrgAnalyticsRouteWrapper })));

const LoadingFallback = () => (
  <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
    Loading...
  </div>
);

const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/signup',
    element: <SignupPage />,
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <Shell />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ChatPage />
          </Suspense>
        ),
      },
      {
        path: 'orgs/:orgId/knowledge',
        element: <KnowledgeBaseRouteWrapper />,
      },
      {
        path: 'orgs/:orgId/chat/:conversationId?',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ChatPage />
          </Suspense>
        ),
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
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <OrgAnalyticsRouteWrapper />
          </Suspense>
        ),
      },
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
      {
        path: 's/:slug',
        element: <PublicSharedConversationPage />,
      },
    ],
  },
  {
    path: '*',
    element: <LoginPage />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
