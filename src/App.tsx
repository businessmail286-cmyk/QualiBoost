/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { UpscaleWorkflow } from './components/SimpleFlow/UpscaleWorkflow';
import { FlyerPreservation } from './components/FlyerPreservation';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { Footer } from './components/Footer';
import { ToastContainer, ToastMessage } from './components/Toast';
import { BackendSettingsModal } from './components/BackendSettingsModal';

export default function App() {
  const [externalUploadTrigger, setExternalUploadTrigger] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isBackendSettingsOpen, setIsBackendSettingsOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [workflowKey, setWorkflowKey] = useState(0);

  const addToast = useCallback((text: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHeaderUpload = () => {
    scrollToSection('workflow');
    setExternalUploadTrigger((prev) => prev + 1);
  };

  const handleBackendUrlSaved = (newUrl: string) => {
    setWorkflowKey((prev) => prev + 1);
    addToast(
      newUrl ? `Endpoint configured: ${newUrl}` : 'Endpoint reset to dev proxy default.',
      'info'
    );
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans selection:bg-[#292929] selection:text-white">
      {/* Application Top Bar Header */}
      <Header
        onUploadClick={handleHeaderUpload}
        onOpenBackendSettings={() => setIsBackendSettingsOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Page Flow: Simplified 3-Stage Image Upscaling Experience */}
      <main className="flex-1">
        {/* Core Upscaling Workflow:
            Stage A: Upload Your Image
            Stage B: One Upscale Button
            Stage C: Animated Upscaling Experience on photograph
            Stage D: Real Result (Comparison & Download) / Error handling */}
        <UpscaleWorkflow
          key={workflowKey}
          onToast={addToast}
          externalUploadTrigger={externalUploadTrigger}
          onOpenBackendSettings={() => setIsBackendSettingsOpen(true)}
          onHealthChange={setIsBackendConnected}
        />

        {/* Flyer & Poster Preservation Priority Standard */}
        <FlyerPreservation />

        {/* Features Specification */}
        <Features />

        {/* How It Works - 3 Step Workstation Process */}
        <HowItWorks />
      </main>

      {/* Footer */}
      <Footer onNavigate={scrollToSection} />

      {/* Backend Settings Dialog */}
      <BackendSettingsModal
        isOpen={isBackendSettingsOpen}
        onClose={() => setIsBackendSettingsOpen(false)}
        onSaved={handleBackendUrlSaved}
      />

      {/* Client Feedback Toast System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
