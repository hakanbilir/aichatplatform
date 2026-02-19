'use client';

import React from 'react';

import { loadClientConfig } from '../src/config/client';
import { BentoGrid } from '../src/components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../src/components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../src/components/ui/kinetic/KineticTypography';

export default function HomePage() {
  const { apiBaseUrl } = loadClientConfig();

  return (
    <main style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <KineticTypography component="h1" style={{ fontSize: '3.5rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
          AI Chat Platform
        </KineticTypography>
        <KineticTypography component="h2" style={{ fontSize: '1.5rem', opacity: 0.7, fontWeight: 300, marginTop: '0.5rem' }}>
          Kinetic Refraction System
        </KineticTypography>
      </header>

      <BentoGrid style={{ flex: 1 }}>
        {/* Priority Card: Welcome / Main Action - Spans 2 columns */}
        <GlassPanel
          style={{ gridColumn: 'span 2', minHeight: '350px', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          refractive
          specular
        >
          <KineticTypography component="h2" style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 600 }}>
            Welcome Back
          </KineticTypography>
          <p style={{ fontSize: '1.2rem', lineHeight: 1.6, opacity: 0.9, maxWidth: '600px', marginBottom: '2rem' }}>
            Experience the next generation of AI interaction.
            The interface adapts to your presence with kinetic typography and refractive glass surfaces.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
                className="specular-button"
                style={{
                    padding: '14px 28px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500,
                    backdropFilter: 'blur(10px)'
                }}
            >
                Launch Dashboard
            </button>
            <button
                className="specular-button"
                style={{
                    padding: '14px 28px',
                    borderRadius: '16px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                Documentation
            </button>
          </div>
        </GlassPanel>

        {/* Utility Card: Status */}
        <GlassPanel style={{ minHeight: '350px', padding: '2rem' }}>
          <KineticTypography component="h3" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 500 }}>
            System Status
          </KineticTypography>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ opacity: 0.8 }}>API Gateway</span>
              <span style={{ color: '#4caf50', fontWeight: 600 }}>Online</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ opacity: 0.8 }}>Workers</span>
              <span style={{ color: '#4caf50', fontWeight: 600 }}>Active</span>
            </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ opacity: 0.8 }}>Refraction</span>
              <span style={{ color: '#2196f3', fontWeight: 600 }}>Enabled</span>
            </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.8 }}>Backend</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>{apiBaseUrl}</span>
            </div>
          </div>
        </GlassPanel>

        {/* Feature Tiles - Utility Functions */}
        <GlassPanel style={{ minHeight: '220px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
             <KineticTypography component="h3" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            Agentic AI
          </KineticTypography>
          <p style={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: 1.5 }}>
            Context-aware middleware provides real-time intent analysis.
          </p>
        </GlassPanel>

        <GlassPanel style={{ minHeight: '220px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
             <KineticTypography component="h3" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            Eco Mode
          </KineticTypography>
          <p style={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: 1.5 }}>
            Automatically reduces visual effects to save battery.
          </p>
        </GlassPanel>

        <GlassPanel style={{ minHeight: '220px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
             <KineticTypography component="h3" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            Secure
          </KineticTypography>
          <p style={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: 1.5 }}>
            Enterprise-grade security with role-based access control.
          </p>
        </GlassPanel>

      </BentoGrid>
    </main>
  );
}
