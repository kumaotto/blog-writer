import React, { useState } from 'react';
import { AWSCredentials } from '../types';
import './ConfigModal.css';

interface ConfigModalProps {
  isOpen: boolean;
  onSave: (credentials: AWSCredentials) => Promise<void>;
  onClose: () => void;
  onDeleteAll?: () => Promise<void>;
  isInitialSetup?: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onSave,
  onClose,
  onDeleteAll,
  isInitialSetup = false,
}) => {
  const [credentials, setCredentials] = useState<AWSCredentials>({
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    bucketName: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AWSCredentials, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const validateField = (field: keyof AWSCredentials, value: string): string | null => {
    if (!value.trim()) {
      return `${field} is required`;
    }

    switch (field) {
      case 'accessKeyId':
        if (value.length < 16) {
          return 'Access Key ID must be at least 16 characters';
        }
        break;
      case 'secretAccessKey':
        if (value.length < 40) {
          return 'Secret Access Key must be at least 40 characters';
        }
        break;
      case 'region':
        if (!/^[a-z]{2}-[a-z]+-\d+$/.test(value)) {
          return 'Invalid region format (e.g., us-east-1)';
        }
        break;
      case 'bucketName':
        if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(value) || value.length < 3) {
          return 'Invalid bucket name format';
        }
        break;
    }

    return null;
  };

  const handleChange = (field: keyof AWSCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Clear test result when credentials change
    setTestResult(null);
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof AWSCredentials, string>> = {};
    let isValid = true;

    (Object.keys(credentials) as Array<keyof AWSCredentials>).forEach(field => {
      const error = validateField(field, credentials[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleTestConnection = async () => {
    if (!validateAll()) {
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // First save the credentials
      const saveResponse = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save credentials');
      }

      // Then test the connection
      const testResponse = await fetch('/api/config/test');
      const data = await testResponse.json();

      if (testResponse.ok && data.success) {
        setTestResult({ success: true, message: 'S3 connection successful!' });
      } else {
        setTestResult({ 
          success: false, 
          message: data.error || 'S3 connection failed. Please check your credentials.' 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateAll()) {
      return;
    }

    setIsLoading(true);

    try {
      await onSave(credentials);
      
      // Reset form
      setCredentials({
        accessKeyId: '',
        secretAccessKey: '',
        region: '',
        bucketName: '',
      });
      setErrors({});
      setTestResult(null);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!onDeleteAll) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete all AWS credentials? This action cannot be undone.'
    );

    if (!confirmed) return;

    setIsLoading(true);

    try {
      await onDeleteAll();
      alert('All data deleted successfully');
      onClose();
    } catch (error) {
      console.error('Failed to delete data:', error);
      alert('Failed to delete data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="config-modal-overlay">
      <div className="config-modal">
        <div className="config-modal-header">
          <h2>{isInitialSetup ? 'Initial Setup - AWS Configuration' : 'AWS Configuration'}</h2>
          {!isInitialSetup && (
            <button 
              className="close-button" 
              onClick={onClose}
              disabled={isLoading}
            >
              ×
            </button>
          )}
        </div>

        <div className="config-modal-body">
          {isInitialSetup && (
            <p className="setup-message">
              Welcome! Please configure your AWS credentials to get started.
            </p>
          )}

          <div className="form-group">
            <label htmlFor="accessKeyId">
              AWS Access Key ID <span className="required">*</span>
            </label>
            <input
              id="accessKeyId"
              type="text"
              value={credentials.accessKeyId}
              onChange={(e) => handleChange('accessKeyId', e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              disabled={isLoading || isTesting}
              className={errors.accessKeyId ? 'error' : ''}
            />
            {errors.accessKeyId && (
              <span className="error-message">{errors.accessKeyId}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="secretAccessKey">
              AWS Secret Access Key <span className="required">*</span>
            </label>
            <input
              id="secretAccessKey"
              type="password"
              value={credentials.secretAccessKey}
              onChange={(e) => handleChange('secretAccessKey', e.target.value)}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              disabled={isLoading || isTesting}
              className={errors.secretAccessKey ? 'error' : ''}
            />
            {errors.secretAccessKey && (
              <span className="error-message">{errors.secretAccessKey}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="region">
              AWS Region <span className="required">*</span>
            </label>
            <input
              id="region"
              type="text"
              value={credentials.region}
              onChange={(e) => handleChange('region', e.target.value)}
              placeholder="us-east-1"
              disabled={isLoading || isTesting}
              className={errors.region ? 'error' : ''}
            />
            {errors.region && (
              <span className="error-message">{errors.region}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="bucketName">
              S3 Bucket Name <span className="required">*</span>
            </label>
            <input
              id="bucketName"
              type="text"
              value={credentials.bucketName}
              onChange={(e) => handleChange('bucketName', e.target.value)}
              placeholder="my-blog-images"
              disabled={isLoading || isTesting}
              className={errors.bucketName ? 'error' : ''}
            />
            {errors.bucketName && (
              <span className="error-message">{errors.bucketName}</span>
            )}
          </div>

          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? '✓' : '✗'} {testResult.message}
            </div>
          )}
        </div>

        <div className="config-modal-footer">
          <div className="footer-left">
            {onDeleteAll && !isInitialSetup && (
              <button
                className="btn-danger"
                onClick={handleDeleteAll}
                disabled={isLoading || isTesting}
              >
                Delete All Data
              </button>
            )}
          </div>
          <div className="footer-right">
            <button
              className="btn-secondary"
              onClick={handleTestConnection}
              disabled={isLoading || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={isLoading || isTesting || (testResult && !testResult.success)}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            {!isInitialSetup && (
              <button
                className="btn-secondary"
                onClick={onClose}
                disabled={isLoading || isTesting}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
