import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { RequireAuth } from './auth/RequireAuth';
import { Shell } from './layout/Shell';

// Lazy load page components to enable code splitting
const LoginPage = React.lazy(() => import('./auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('./auth/SignupPage').then(m => ({ default: m.SignupPage })));
const KnowledgeBaseRouteWrapper = React.lazy(() => import('./knowledge/KnowledgeBaseRouteWrapper').then(m => ({ default: m.KnowledgeBaseRouteWrapper })));
const OrgAiPolicyPage = React.lazy(() => import('./org/OrgAiPolicyPage').then(m => ({ default: m.OrgAiPolicyPage })));
const PresetsGalleryPage = React.lazy(() => import('./presets/PresetsGalleryPage').then(m => ({ default: m.PresetsGalleryPage })));
const ChatPage = React.lazy(() => import('./chat/ChatPage').then(m => ({ default: m.ChatPage })));
const ConversationInboxPage = React.lazy(() => import('./inbox/ConversationInboxPage').then(m => ({ default: m.ConversationInboxPage })));
const WebhooksPage = React.lazy(() => import('./integrations/WebhooksPage').then(m => ({ default: m.WebhooksPage })));
const AuditLogPage = React.lazy(() => import('./audit/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const RetentionSettingsPage = React.lazy(() => import('./retention/RetentionSettingsPage').then(m => ({ default: m.RetentionSettingsPage })));
const PublicSharedConversationPage = React.lazy(() => import('./public/PublicSharedConversationPage').then(m => ({ default: m.PublicSharedConversationPage })));
const OrgMembersPage = React.lazy(() => import('./org/OrgMembersPage').then(m => ({ default: m.OrgMembersPage })));
const OrgApiKeysPage = React.lazy(() => import('./org/OrgApiKeysPage').then(m => ({ default: m.OrgApiKeysPage })));
const OrgBrandingPage = React.lazy(() => import('./org/OrgBrandingPage').then(m => ({ default: m.OrgBrandingPage })));
const OrgAnalyticsRouteWrapper = React.lazy(() => import('./org/OrgAnalyticsRouteWrapper').then(m => ({ default: m.OrgAnalyticsRouteWrapper })));
const OrgSafetySettingsPage = React.lazy(() => import('./org/OrgSafetySettingsPage').then(m => ({ default: m.OrgSafetySettingsPage })));
const OrgSafetyIncidentsPage = React.lazy(() => import('./org/OrgSafetyIncidentsPage').then(m => ({ default: m.OrgSafetyIncidentsPage })));
const PromptTemplatesPage = React.lazy(() => import('./org/PromptTemplatesPage').then(m => ({ default: m.PromptTemplatesPage })));
const ChatProfilesPage = React.lazy(() => import('./org/ChatProfilesPage').then(m => ({ default: m.ChatProfilesPage })));
const OrgModelsSettingsPage = React.lazy(() => import('./org/OrgModelsSettingsPage').then(m => ({ default: m.OrgModelsSettingsPage })));
const PlaygroundPage = React.lazy(() => import('./org/PlaygroundPage').then(m => ({ default: m.PlaygroundPage })));
const ExperimentsPage = React.lazy(() => import('./org/ExperimentsPage').then(m => ({ default: m.ExperimentsPage })));
const OrgUsageDashboardPage = React.lazy(() => import('./org/OrgUsageDashboardPage').then(m => ({ default: m.OrgUsageDashboardPage })));
const OrgBillingPage = React.lazy(() => import('./org/OrgBillingPage').then(m => ({ default: m.OrgBillingPage })));
const OrgSsoSettingsPage = React.lazy(() => import('./org/OrgSsoSettingsPage').then(m => ({ default: m.OrgSsoSettingsPage })));
const OrgScimSettingsPage = React.lazy(() => import('./org/OrgScimSettingsPage').then(m => ({ default: m.OrgScimSettingsPage })));

// Loading component
const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
    <CircularProgress />
  </Box>
);

const Loadable = (Component: React.ComponentType<any> | React.LazyExoticComponent<any>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: Loadable(LoginPage),
  },
  {
    path: '/auth/signup',
    element: Loadable(SignupPage),
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
        element: Loadable(ChatPage),
      },
      {
        path: 'orgs/:orgId/knowledge',
        element: Loadable(KnowledgeBaseRouteWrapper),
      },
      {
        path: 'orgs/:orgId/chat/:conversationId?',
        element: Loadable(ChatPage),
      },
      {
        path: 'orgs/:orgId/settings/ai-policy',
        element: Loadable(OrgAiPolicyPage),
      },
      {
        path: 'orgs/:orgId/presets',
        element: Loadable(PresetsGalleryPage),
      },
      {
        path: 'orgs/:orgId/inbox',
        element: Loadable(ConversationInboxPage),
      },
      {
        path: 'orgs/:orgId/settings/webhooks',
        element: Loadable(WebhooksPage),
      },
      {
        path: 'orgs/:orgId/audit-log',
        element: Loadable(AuditLogPage),
      },
      {
        path: 'orgs/:orgId/settings/retention',
        element: Loadable(RetentionSettingsPage),
      },
      {
        path: 'orgs/:orgId/settings/members',
        element: Loadable(OrgMembersPage),
      },
      {
        path: 'orgs/:orgId/settings/api-keys',
        element: Loadable(OrgApiKeysPage),
      },
      {
        path: 'orgs/:orgId/settings/branding',
        element: Loadable(OrgBrandingPage),
      },
      {
        path: 'orgs/:orgId/analytics',
        element: Loadable(OrgAnalyticsRouteWrapper),
      },
      {
        path: 'orgs/:orgId/settings/safety',
        element: Loadable(OrgSafetySettingsPage),
      },
      {
        path: 'orgs/:orgId/settings/safety/incidents',
        element: Loadable(OrgSafetyIncidentsPage),
      },
      {
        path: 'orgs/:orgId/prompt-templates',
        element: Loadable(PromptTemplatesPage),
      },
      {
        path: 'orgs/:orgId/chat-profiles',
        element: Loadable(ChatProfilesPage),
      },
      {
        path: 'orgs/:orgId/settings/models',
        element: Loadable(OrgModelsSettingsPage),
      },
      {
        path: 'orgs/:orgId/playground',
        element: Loadable(PlaygroundPage),
      },
      {
        path: 'orgs/:orgId/experiments',
        element: Loadable(ExperimentsPage),
      },
      {
        path: 'orgs/:orgId/usage',
        element: Loadable(OrgUsageDashboardPage),
      },
      {
        path: 'orgs/:orgId/billing',
        element: Loadable(OrgBillingPage),
      },
      {
        path: 'orgs/:orgId/settings/sso',
        element: Loadable(OrgSsoSettingsPage),
      },
      {
        path: 'orgs/:orgId/settings/scim',
        element: Loadable(OrgScimSettingsPage),
      },
      {
        path: 's/:slug',
        element: Loadable(PublicSharedConversationPage),
      },
    ],
  },
  {
    path: '*',
    element: Loadable(LoginPage),
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
