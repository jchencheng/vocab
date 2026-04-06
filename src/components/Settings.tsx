import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../lib/indexedDB';

interface PlatformConfig {
  name: string;
  endpoint: string;
  model: string;
  apiKeyPlaceholder: string;
  instructions: string;
}

interface APIConfig {
  id: string;
  name: string;
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  isDefault?: boolean;
}

const platforms: PlatformConfig[] = [
  {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    apiKeyPlaceholder: 'sk-...',
    instructions: 'Get your API key from https://platform.openai.com/api-keys'
  },
  {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview',
    model: 'gemini-3.1-flash-lite-preview',
    apiKeyPlaceholder: 'AIzaSy...',
    instructions: 'Get your API key from https://console.cloud.google.com/apis/credentials'
  },
  {
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-sonnet-20240229',
    apiKeyPlaceholder: 'sk-ant-api03-...',
    instructions: 'Get your API key from https://console.anthropic.com/account/keys'
  },
  {
    name: 'Custom',
    endpoint: '',
    model: '',
    apiKeyPlaceholder: 'Your API key',
    instructions: 'Enter your custom API endpoint and key'
  }
];

export function Settings() {
  const { settings, saveSettings, words } = useApp();
  const [apis, setApis] = useState<APIConfig[]>(settings.apis || []);
  const [currentApiId, setCurrentApiId] = useState(settings.currentApiId || '');
  const [maxDailyReviews, setMaxDailyReviews] = useState(settings.maxDailyReviews || 50);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // 当前API配置
  const currentApi = apis.find(api => api.id === currentApiId) || apis[0];
  const [apiName, setApiName] = useState(currentApi?.name || 'New API');
  const [apiKey, setApiKey] = useState(currentApi?.apiKey || '');
  const [apiEndpoint, setApiEndpoint] = useState(currentApi?.apiEndpoint || 'https://api.openai.com/v1/chat/completions');
  const [model, setModel] = useState(currentApi?.model || 'gpt-3.5-turbo');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('OpenAI');

  // 根据选择的平台自动填充 API 端点和模型
  useEffect(() => {
    const platform = platforms.find(p => p.name === selectedPlatform);
    if (platform) {
      setApiEndpoint(platform.endpoint);
      setModel(platform.model);
    }
  }, [selectedPlatform]);

  async function handleSave() {
    setIsSaving(true);
    try {
      // 更新当前API配置
      const updatedApis = apis.map(api => {
        if (api.id === currentApiId) {
          return {
            ...api,
            name: apiName,
            apiKey: apiKey || undefined,
            apiEndpoint: apiEndpoint || undefined,
            model: model || undefined
          };
        }
        return api;
      });
      
      await saveSettings({
        apis: updatedApis,
        currentApiId: currentApiId,
        maxDailyReviews: maxDailyReviews || undefined,
      });
      setApis(updatedApis);
      setSaveSuccess(true);
      // Reset saveSuccess after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleExport() {
    const data = JSON.stringify(words, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedWords = JSON.parse(e.target?.result as string);
        for (const word of importedWords) {
          await db.addWord(word);
        }
        window.location.reload();
      } catch (err) {
        alert('Failed to import file. Please check the JSON format.');
      }
    };
    reader.readAsText(file);
  }

  // 获取当前平台的配置
  const currentPlatformConfig = platforms.find(p => p.name === selectedPlatform) || platforms[0];

  // 添加新API
  function addNewApi() {
    const newApi: APIConfig = {
      id: crypto.randomUUID(),
      name: `API ${apis.length + 1}`,
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo'
    };
    const updatedApis = [...apis, newApi];
    setApis(updatedApis);
    setCurrentApiId(newApi.id);
    setApiName(newApi.name);
    setApiKey('');
    setApiEndpoint(newApi.apiEndpoint);
    setModel(newApi.model);
  }

  // 删除API
  function deleteApi(apiId: string) {
    if (apis.length <= 1) return; // 至少保留一个API
    const updatedApis = apis.filter(api => api.id !== apiId);
    setApis(updatedApis);
    if (currentApiId === apiId) {
      setCurrentApiId(updatedApis[0].id);
      const newCurrentApi = updatedApis[0];
      setApiName(newCurrentApi.name);
      setApiKey(newCurrentApi.apiKey || '');
      setApiEndpoint(newCurrentApi.apiEndpoint || '');
      setModel(newCurrentApi.model || '');
    }
  }

  // 切换API
  function switchApi(apiId: string) {
    setCurrentApiId(apiId);
    const api = apis.find(a => a.id === apiId);
    if (api) {
      setApiName(api.name);
      setApiKey(api.apiKey || '');
      setApiEndpoint(api.apiEndpoint || '');
      setModel(api.model || '');
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Configure your preferences and manage data</p>
        </div>

        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">AI API Settings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure your LLM API to use the AI memory assistant feature.
          </p>

          <div className="space-y-4">
            {/* API Management */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Configuration
              </label>
              <div className="flex flex-col space-y-2">
                {/* API List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {apis.map(api => (
                    <div
                      key={api.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors relative ${
                        api.id === currentApiId
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => switchApi(api.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{api.name}</span>
                        <div className="flex items-center gap-2">
                          {api.id === currentApiId && (
                            <div className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                              Current
                            </div>
                          )}
                          {apis.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteApi(api.id);
                              }}
                              className="text-red-600 dark:text-red-400 text-sm hover:text-red-800 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {api.model || 'No model set'}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addNewApi}
                    className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
                  >
                    + Add API
                  </button>
                </div>
              </div>
            </div>

            {/* API Details */}
            {currentApiId && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-800 dark:text-white mb-3">Edit API: {apiName}</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Name
                    </label>
                    <input
                      type="text"
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Platform
                    </label>
                    <select
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {platforms.map(platform => (
                        <option key={platform.name} value={platform.name}>
                          {platform.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Endpoint
                    </label>
                    <input
                      type="text"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder={currentPlatformConfig.endpoint || 'Enter API endpoint'}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {currentPlatformConfig.endpoint && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Example: {currentPlatformConfig.endpoint}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={currentPlatformConfig.apiKeyPlaceholder}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {currentPlatformConfig.instructions}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={currentPlatformConfig.model || 'Enter model name'}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {currentPlatformConfig.model && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Example: {currentPlatformConfig.model}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">API Configuration Tips</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• For OpenAI: Use API keys from https://platform.openai.com/api-keys</li>
                <li>• For Google Gemini: Enable the Generative Language API first</li>
                <li>• For Anthropic: Use API keys from https://console.anthropic.com/account/keys</li>
                <li>• Keep your API key secure and never share it publicly</li>
                <li>• Check your API provider's documentation for rate limits</li>
              </ul>
            </div>

            {saveSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 animate-fade-in">
                ✅ Settings saved successfully!
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Review Settings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure your review preferences.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Daily Reviews
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxDailyReviews}
                onChange={(e) => setMaxDailyReviews(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Set the maximum number of words to review per day (1-100)
              </p>
            </div>

            {saveSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 animate-fade-in">
                ✅ Settings saved successfully!
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Data Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Export or import your vocabulary data.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleExport}
              disabled={words.length === 0}
              className="px-6 py-4 border-2 border-blue-500 text-blue-600 rounded-xl font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="text-2xl mb-1">📤</div>
              <div>Export Data</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{words.length} words</div>
            </button>

            <label className="px-6 py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors text-center">
              <div className="text-2xl mb-1">📥</div>
              <div>Import Data</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">JSON file</div>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">About</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>📖 VocabMaster - Your Personal Vocabulary Book</p>
            <p>All data is stored locally in your browser using IndexedDB.</p>
            <p>No data is sent to any server except for the dictionary API and your configured AI API.</p>
          </div>
        </div>
      </div>
  );
}
