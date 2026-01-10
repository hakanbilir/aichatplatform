import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { RequireAuth } from './auth/RequireAuth';
import { Shell } from './layout/Shell';

// Eagerly loaded auth pages to ensure fast initial render for unauthenticated users
import { LoginPage } from './auth/LoginPage';
import { SignupPage } from './auth/SignupPage';

// Lazy loaded components
const KnowledgeBaseRouteWrapper = React.lazy(() => import('./knowledge/KnowledgeBaseRouteWrapper').then(module => ({ default: module.KnowledgeBaseRouteWrapper })));
const OrgAiPolicyPage = React.lazy(() => import('./org/OrgAiPolicyPage').then(module => ({ default: module.OrgAiPolicyPage })));
const PresetsGalleryPage = React.lazy(() => import('./presets/PresetsGalleryPage').then(module => ({ default: module.PresetsGalleryPage })));
const ChatPage = React.lazy(() => import('./chat/ChatPage').then(module => ({ default: module.ChatPage })));
const ConversationInboxPage = React.lazy(() => import('./inbox/ConversationInboxPage').then(module => ({ default: module.ConversationInboxPage })));
const WebhooksPage = React.lazy(() => import('./integrations/WebhooksPage').then(module => ({ default: module.WebhooksPage })));
const AuditLogPage = React.lazy(() => import('./audit/AuditLogPage').then(module => ({ default: module.AuditLogPage })));
const RetentionSettingsPage = React.lazy(() => import('./retention/RetentionSettingsPage').then(module => ({ default: module.RetentionSettingsPage })));
const PublicSharedConversationPage = React.lazy(() => import('./public/PublicSharedConversationPage').then(module => ({ default: module.PublicSharedConversationPage })));
const OrgMembersPage = React.lazy(() => import('./org/OrgMembersPage').then(module => ({ default: module.OrgMembersPage })));
const OrgApiKeysPage = React.lazy(() => import('./org/OrgApiKeysPage').then(module => ({ default: module.OrgApiKeysPage })));
const OrgBrandingPage = React.lazy(() => import('./org/OrgBrandingPage').then(module => ({ default: module.OrgBrandingPage })));
const OrgAnalyticsRouteWrapper = React.lazy(() => import('./org/OrgAnalyticsRouteWrapper').then(module => ({ default: module.OrgAnalyticsRouteWrapper })));
const OrgSafetySettingsPage = React.lazy(() => import('./org/OrgSafetySettingsPage').then(module => ({ default: module.OrgSafetySettingsPage })));
const OrgSafetyIncidentsPage = React.lazy(() => import('./org/OrgSafetyIncidentsPage').then(module => ({ default: module.OrgSafetyIncidentsPage })));
const PromptTemplatesPage = React.lazy(() => import('./org/PromptTemplatesPage').then(module => ({ default: module.PromptTemplatesPage })));
const ChatProfilesPage = React.lazy(() => import('./org/ChatProfilesPage').then(module => ({ default: module.ChatProfilesPage })));
const OrgModelsSettingsPage = React.lazy(() => import('./org/OrgModelsSettingsPage').then(module => ({ default: module.OrgModelsSettingsPage })));
const PlaygroundPage = React.lazy(() => import('./org/PlaygroundPage').then(module => ({ default: module.PlaygroundPage })));
const ExperimentsPage = React.lazy(() => import('./org/ExperimentsPage').then(module => ({ default: module.ExperimentsPage })));
const OrgUsageDashboardPage = React.lazy(() => import('./org/OrgUsageDashboardPage').then(module => ({ default: module.OrgUsageDashboardPage })));
const OrgBillingPage = React.lazy(() => import('./org/OrgBillingPage').then(module => ({ default: module.OrgBillingPage })));
const OrgSsoSettingsPage = React.lazy(() => import('./org/OrgSsoSettingsPage').then(module => ({ default: module.OrgSsoSettingsPage })));
const OrgScimSettingsPage = React.lazy(() => import('./org/OrgScimSettingsPage').then(module => ({ default: module.OrgScimSettingsPage })));

// Loading component
const PageLoader = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    flex={1}
    width="100%"
    height="100%"
    minHeight="50vh"
  >
    <CircularProgress size={40} />
  </Box>
);

// Helper to wrap lazy components
const Loadable = (Component: React.ComponentType<any>) => (props: any) => (
  <Suspense fallback={<PageLoader />}>
    <Component {...props} />
  </Suspense>
);

// Wrapped components
const LazyKnowledgeBaseRouteWrapper = Loadable(KnowledgeBaseRouteWrapper);
const LazyOrgAiPolicyPage = Loadable(OrgAiPolicyPage);
const LazyPresetsGalleryPage = Loadable(PresetsGalleryPage);
const LazyChatPage = Loadable(ChatPage);
const LazyConversationInboxPage = Loadable(ConversationInboxPage);
const LazyWebhooksPage = Loadable(WebhooksPage);
const LazyAuditLogPage = Loadable(AuditLogPage);
const LazyRetentionSettingsPage = Loadable(RetentionSettingsPage);
const LazyPublicSharedConversationPage = Loadable(PublicSharedConversationPage);
const LazyOrgMembersPage = Loadable(OrgMembersPage);
const LazyOrgApiKeysPage = Loadable(OrgApiKeysPage);
const LazyOrgBrandingPage = Loadable(OrgBrandingPage);
const LazyOrgAnalyticsRouteWrapper = Loadable(OrgAnalyticsRouteWrapper);
const LazyOrgSafetySettingsPage = Loadable(OrgSafetySettingsPage);
const LazyOrgSafetyIncidentsPage = Loadable(OrgSafetyIncidentsPage);
const LazyPromptTemplatesPage = Loadable(PromptTemplatesPage);
const LazyChatProfilesPage = Loadable(ChatProfilesPage);
const LazyOrgModelsSettingsPage = Loadable(OrgModelsSettingsPage);
const LazyPlaygroundPage = Loadable(PlaygroundPage);
const LazyExperimentsPage = Loadable(ExperimentsPage);
const LazyOrgUsageDashboardPage = Loadable(OrgUsageDashboardPage);
const LazyOrgBillingPage = Loadable(OrgBillingPage);
const LazyOrgSsoSettingsPage = Loadable(OrgSsoSettingsPage);
const LazyOrgScimSettingsPage = Loadable(OrgScimSettingsPage);

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
        element: <LazyChatPage />,
      },
      {
        path: 'orgs/:orgId/knowledge',
        element: <LazyKnowledgeBaseRouteWrapper />,
      },
      {
        path: 'orgs/:orgId/chat/:conversationId?',
        element: <LazyChatPage />,
      },
      {
        path: 'orgs/:orgId/settings/ai-policy',
        element: <LazyOrgAiPolicyPage />,
      },
      {
        path: 'orgs/:orgId/presets',
        element: <LazyPresetsGalleryPage />,
      },
      {
        path: 'orgs/:orgId/inbox',
        element: <LazyConversationInboxPage />,
      },
      {
        path: 'orgs/:orgId/settings/webhooks',
        element: <LazyWebhooksPage />,
      },
      {
        path: 'orgs/:orgId/audit-log',
        element: <LazyAuditLogPage />,
      },
      {
        path: 'orgs/:orgId/settings/retention',
        element: <LazyRetentionSettingsPage />,
      },
      {
        path: 'orgs/:orgId/settings/members',
        element: <LazyOrgMembersPage />,
      },
      {
        path: 'orgs/:orgId/settings/api-keys',
        element: <LazyOrgApiKeysPage />,
      },
      {
        path: 'orgs/:orgId/settings/branding',
        element: <LazyOrgBrandingPage />,
      },
      {
        path: 'orgs/:orgId/analytics',
        element: <LazyOrgAnalyticsRouteWrapper />,
      },
      // Docs 41-50: New feature routes
      {
        path: 'orgs/:orgId/settings/safety',
        element: <LazyOrgSafetySettingsPage />,
      },
      {
        path: 'orgs/:orgId/settings/safety/incidents',
        element: <LazyOrgSafetyIncidentsPage />,
      },
      {
        path: 'orgs/:orgId/prompt-templates',
        element: <LazyPromptTemplatesPage />,
      },
      {
        path: 'orgs/:orgId/chat-profiles',
        element: <LazyChatProfilesPage />,
      },
      {
        path: 'orgs/:orgId/settings/models',
        element: <LazyOrgModelsSettingsPage />,
      },
      {
        path: 'orgs/:orgId/playground',
        element: <LazyPlaygroundPage />,
      },
      {
        path: 'orgs/:orgId/experiments',
        element: <LazyExperimentsPage />,
      },
      {
        path: 'orgs/:orgId/usage',
        element: <LazyOrgUsageDashboardPage />,
      },
      {
        path: 'orgs/:orgId/billing',
        element: <LazyOrgBillingPage />,
      },
      {
        path: 'orgs/:orgId/settings/sso',
        element: <LazyOrgSsoSettingsPage />,
      },
      {
        path: 'orgs/:orgId/settings/scim',
        element: <LazyOrgScimSettingsPage />,
      },
      {
        path: 's/:slug',
        element: <LazyPublicSharedConversationPage />,
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
