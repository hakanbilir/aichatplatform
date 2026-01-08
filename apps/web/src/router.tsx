import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { RequireAuth } from './auth/RequireAuth';
import { Shell } from './layout/Shell';

// Eagerly loaded auth pages for faster initial interaction
import { LoginPage } from './auth/LoginPage';
import { SignupPage } from './auth/SignupPage';

// Lazy loaded pages to reduce initial bundle size
const KnowledgeBaseRouteWrapper = lazy(() => import('./knowledge/KnowledgeBaseRouteWrapper').then(module => ({ default: module.KnowledgeBaseRouteWrapper })));
const OrgAiPolicyPage = lazy(() => import('./org/OrgAiPolicyPage').then(module => ({ default: module.OrgAiPolicyPage })));
const PresetsGalleryPage = lazy(() => import('./presets/PresetsGalleryPage').then(module => ({ default: module.PresetsGalleryPage })));
const ChatPage = lazy(() => import('./chat/ChatPage').then(module => ({ default: module.ChatPage })));
const ConversationInboxPage = lazy(() => import('./inbox/ConversationInboxPage').then(module => ({ default: module.ConversationInboxPage })));
const WebhooksPage = lazy(() => import('./integrations/WebhooksPage').then(module => ({ default: module.WebhooksPage })));
const AuditLogPage = lazy(() => import('./audit/AuditLogPage').then(module => ({ default: module.AuditLogPage })));
const RetentionSettingsPage = lazy(() => import('./retention/RetentionSettingsPage').then(module => ({ default: module.RetentionSettingsPage })));
const PublicSharedConversationPage = lazy(() => import('./public/PublicSharedConversationPage').then(module => ({ default: module.PublicSharedConversationPage })));
const OrgMembersPage = lazy(() => import('./org/OrgMembersPage').then(module => ({ default: module.OrgMembersPage })));
const OrgApiKeysPage = lazy(() => import('./org/OrgApiKeysPage').then(module => ({ default: module.OrgApiKeysPage })));
const OrgBrandingPage = lazy(() => import('./org/OrgBrandingPage').then(module => ({ default: module.OrgBrandingPage })));
const OrgAnalyticsRouteWrapper = lazy(() => import('./org/OrgAnalyticsRouteWrapper').then(module => ({ default: module.OrgAnalyticsRouteWrapper })));

// Docs 41-50 pages
const OrgSafetySettingsPage = lazy(() => import('./org/OrgSafetySettingsPage').then(module => ({ default: module.OrgSafetySettingsPage })));
const OrgSafetyIncidentsPage = lazy(() => import('./org/OrgSafetyIncidentsPage').then(module => ({ default: module.OrgSafetyIncidentsPage })));
const PromptTemplatesPage = lazy(() => import('./org/PromptTemplatesPage').then(module => ({ default: module.PromptTemplatesPage })));
const ChatProfilesPage = lazy(() => import('./org/ChatProfilesPage').then(module => ({ default: module.ChatProfilesPage })));
const OrgModelsSettingsPage = lazy(() => import('./org/OrgModelsSettingsPage').then(module => ({ default: module.OrgModelsSettingsPage })));
const PlaygroundPage = lazy(() => import('./org/PlaygroundPage').then(module => ({ default: module.PlaygroundPage })));
const ExperimentsPage = lazy(() => import('./org/ExperimentsPage').then(module => ({ default: module.ExperimentsPage })));
const OrgUsageDashboardPage = lazy(() => import('./org/OrgUsageDashboardPage').then(module => ({ default: module.OrgUsageDashboardPage })));
const OrgBillingPage = lazy(() => import('./org/OrgBillingPage').then(module => ({ default: module.OrgBillingPage })));
const OrgSsoSettingsPage = lazy(() => import('./org/OrgSsoSettingsPage').then(module => ({ default: module.OrgSsoSettingsPage })));
const OrgScimSettingsPage = lazy(() => import('./org/OrgScimSettingsPage').then(module => ({ default: module.OrgScimSettingsPage })));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
    <CircularProgress />
  </Box>
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
        element: <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/knowledge',
        element: <Suspense fallback={<PageLoader />}><KnowledgeBaseRouteWrapper /></Suspense>,
      },
      {
        path: 'orgs/:orgId/chat/:conversationId?',
        element: <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/ai-policy',
        element: <Suspense fallback={<PageLoader />}><OrgAiPolicyPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/presets',
        element: <Suspense fallback={<PageLoader />}><PresetsGalleryPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/inbox',
        element: <Suspense fallback={<PageLoader />}><ConversationInboxPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/webhooks',
        element: <Suspense fallback={<PageLoader />}><WebhooksPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/audit-log',
        element: <Suspense fallback={<PageLoader />}><AuditLogPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/retention',
        element: <Suspense fallback={<PageLoader />}><RetentionSettingsPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/members',
        element: <Suspense fallback={<PageLoader />}><OrgMembersPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/api-keys',
        element: <Suspense fallback={<PageLoader />}><OrgApiKeysPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/branding',
        element: <Suspense fallback={<PageLoader />}><OrgBrandingPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/analytics',
        element: <Suspense fallback={<PageLoader />}><OrgAnalyticsRouteWrapper /></Suspense>,
      },
      // Docs 41-50: New feature routes
      {
        path: 'orgs/:orgId/settings/safety',
        element: <Suspense fallback={<PageLoader />}><OrgSafetySettingsPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/safety/incidents',
        element: <Suspense fallback={<PageLoader />}><OrgSafetyIncidentsPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/prompt-templates',
        element: <Suspense fallback={<PageLoader />}><PromptTemplatesPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/chat-profiles',
        element: <Suspense fallback={<PageLoader />}><ChatProfilesPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/models',
        element: <Suspense fallback={<PageLoader />}><OrgModelsSettingsPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/playground',
        element: <Suspense fallback={<PageLoader />}><PlaygroundPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/experiments',
        element: <Suspense fallback={<PageLoader />}><ExperimentsPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/usage',
        element: <Suspense fallback={<PageLoader />}><OrgUsageDashboardPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/billing',
        element: <Suspense fallback={<PageLoader />}><OrgBillingPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/sso',
        element: <Suspense fallback={<PageLoader />}><OrgSsoSettingsPage /></Suspense>,
      },
      {
        path: 'orgs/:orgId/settings/scim',
        element: <Suspense fallback={<PageLoader />}><OrgScimSettingsPage /></Suspense>,
      },
      {
        path: 's/:slug',
        element: <Suspense fallback={<PageLoader />}><PublicSharedConversationPage /></Suspense>,
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
