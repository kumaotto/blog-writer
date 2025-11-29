import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useConfig, useErrorHandler } from './hooks';
import { EditorLayout, ConfigModal, MobileUploadLayout, ErrorNotification, ErrorBoundary, NetworkStatusIndicator } from './components';
import { AWSCredentials } from './types';

function App() {
  const { configExists, isLoading, saveConfig, deleteAllData } = useConfig();
  const { errors, dismissError } = useErrorHandler();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);

  // Check if initial setup is needed
  useEffect(() => {
    if (!isLoading && !configExists) {
      setIsInitialSetup(true);
      setShowConfigModal(true);
    }
  }, [isLoading, configExists]);

  const handleSaveConfig = async (credentials: AWSCredentials) => {
    try {
      await saveConfig(credentials);
      setShowConfigModal(false);
      setIsInitialSetup(false);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  };

  const handleDeleteAllData = async () => {
    try {
      await deleteAllData();
      setShowConfigModal(false);
      // Reload to show initial setup again
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete data:', error);
      throw error;
    }
  };

  // Show loading screen while checking config
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Network Status Indicator */}
      <NetworkStatusIndicator />

      {/* Error Notifications */}
      <div className="error-notification-container">
        {errors.map(error => (
          <ErrorNotification
            key={error.id}
            id={error.id}
            message={error.message}
            type={error.type}
            onDismiss={dismissError}
          />
        ))}
      </div>

      <ConfigModal
        isOpen={showConfigModal}
        onSave={handleSaveConfig}
        onClose={() => !isInitialSetup && setShowConfigModal(false)}
        onDeleteAll={handleDeleteAllData}
        isInitialSetup={isInitialSetup}
      />
      
      <Routes>
        {/* PC Editor Route */}
        <Route 
          path="/" 
          element={
            configExists ? (
              <EditorLayout onOpenSettings={() => setShowConfigModal(true)} />
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100vh',
                fontSize: '1.2rem',
                color: '#666'
              }}>
                Please complete the initial setup
              </div>
            )
          } 
        />
        
        {/* Mobile Upload Route */}
        <Route path="/mobile" element={<MobileUploadLayout />} />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
