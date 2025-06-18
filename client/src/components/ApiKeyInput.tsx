import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Eye, EyeOff, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { openaiClient } from '../lib/openaiClient';

interface ApiKeyInputProps {
  onApiKeySet: (hasKey: boolean) => void;
}

export function ApiKeyInput({ onApiKeySet }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const hasKey = openaiClient.hasApiKey();
    setHasStoredKey(hasKey);
    onApiKeySet(hasKey);
  }, [onApiKeySet]);

  const handleSetApiKey = async () => {
    if (!apiKey.trim()) return;

    setIsValidating(true);
    
    try {
      // Test the API key with a simple request
      openaiClient.setApiKey(apiKey.trim());
      
      // Make a minimal test request to validate the key
      await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
      }).then(response => {
        if (!response.ok) {
          throw new Error('Invalid API key');
        }
        return response.json();
      });

      setHasStoredKey(true);
      setApiKey('');
      onApiKeySet(true);
    } catch (error) {
      alert('Invalid API key. Please check your key and try again.');
      openaiClient.clearApiKey();
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearApiKey = () => {
    openaiClient.clearApiKey();
    setHasStoredKey(false);
    setApiKey('');
    onApiKeySet(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSetApiKey();
    }
  };

  if (hasStoredKey) {
    return (
      <Card className="w-full max-w-2xl mx-auto mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">API Key Set</CardTitle>
          </div>
          <CardDescription>
            Your OpenAI API key is securely stored for this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleClearApiKey}
            variant="outline"
            className="w-full"
          >
            Clear API Key
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-600" />
          <CardTitle>Enter Your OpenAI API Key</CardTitle>
        </div>
        <CardDescription>
          Your API key is stored securely in your browser session only and is never sent to our servers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Privacy First:</strong> Your API key is only stored in your browser's session storage and is cleared when you close the browser.
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-12"
              disabled={isValidating}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={isValidating}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button 
            onClick={handleSetApiKey}
            disabled={!apiKey.trim() || isValidating}
            className="w-full"
          >
            {isValidating ? 'Validating...' : 'Set API Key'}
          </Button>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>Don't have an API key? <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Get one from OpenAI</a></p>
          <p>Your key is used to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Analyze job descriptions</li>
            <li>Score resume alignment</li>
            <li>Generate optimization recommendations</li>
            <li>Create optimized resume content</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}