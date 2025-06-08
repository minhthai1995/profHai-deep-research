import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from "framer-motion";
import { ChatBoxSettings } from "@/types/data";
import { getHost } from "@/helpers/getHost";
import axios from 'axios';

interface ChatInterfaceProps {
    promptValue: string;
    setPromptValue: React.Dispatch<React.SetStateAction<string>>;
    handleDisplayResult: (query: string, settings: ChatBoxSettings) => void;
    chatBoxSettings: ChatBoxSettings;
    setChatBoxSettings: React.Dispatch<React.SetStateAction<ChatBoxSettings>>;
    onToggleSidebar: () => void;
    onLocalChat?: (message: string, provider?: string, model?: string) => void;
    isLocalChatMode?: boolean;
    setIsLocalChatMode?: (mode: boolean) => void;
    chatHistory?: Array<{ id: string, type: 'user' | 'assistant', content: string }>;
    isResearching?: boolean;
    isLocalChatLoading?: boolean;
    initialUploadedFiles?: UploadedFile[];
    selectedProvider?: string;
    selectedModel?: string;
    selectedLocalProvider?: string;
}

interface UploadedFile {
    name: string;
    size: number;
    type: string;
}

interface ModeSelectionProps {
    selectedMode: 'local' | 'research';
    onModeChange: (mode: 'local' | 'research') => void;
    hasDocuments: boolean;
}

interface LocalProviderToggleProps {
    selectedLocalProvider: 'openai' | 'ollama';
    onLocalProviderChange: (provider: 'openai' | 'ollama') => void;
}

interface ModelSelectionProps {
    selectedProvider: 'openai' | 'ollama';
    onProviderChange: (provider: 'openai' | 'ollama') => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
}

const ModeSelection: React.FC<ModeSelectionProps> = ({ selectedMode, onModeChange, hasDocuments }) => {
    return (
        <div className="flex bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 mb-8 border border-gray-700/50">
            <motion.button
                onClick={() => onModeChange('local')}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${selectedMode === 'local'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    } ${!hasDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!hasDocuments}
                whileHover={{ scale: hasDocuments ? 1.02 : 1 }}
                whileTap={{ scale: hasDocuments ? 0.98 : 1 }}
            >
                <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Local Chat
                </div>
                {!hasDocuments && (
                    <div className="text-xs text-gray-500 mt-1">Upload documents first</div>
                )}
            </motion.button>

            <motion.button
                onClick={() => onModeChange('research')}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${selectedMode === 'research'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Deep Research
                </div>
            </motion.button>
        </div>
    );
};

const ModelSelection: React.FC<ModelSelectionProps> = ({
    selectedProvider,
    onProviderChange,
    selectedModel,
    onModelChange
}) => {
    const openaiModels = useMemo(() => [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Efficient)' },
        { id: 'gpt-4o', name: 'GPT-4o (Advanced)' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ], []);

    const ollamaModels = useMemo(() => [
        { id: 'llama3.3:70b', name: 'Llama 3.3 70B (High Performance)' },
        { id: 'llama3.2:3b', name: 'Llama 3.2 3B (Fast)' },
        { id: 'mistral:7b', name: 'Mistral 7B (Balanced)' },
        { id: 'phi3:mini', name: 'Phi-3 Mini (Lightweight)' },
        { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B (Reasoning)' },
        { id: 'gemma2:9b', name: 'Gemma 2 9B (Google)' }
    ], []);

    const currentModels = selectedProvider === 'openai' ? openaiModels : ollamaModels;

    // Set default model when provider changes
    useEffect(() => {
        if (selectedProvider === 'openai' && !openaiModels.find(m => m.id === selectedModel)) {
            onModelChange('gpt-4o-mini');
        } else if (selectedProvider === 'ollama' && !ollamaModels.find(m => m.id === selectedModel)) {
            onModelChange('llama3.2:3b');
        }
    }, [selectedProvider, selectedModel, onModelChange, openaiModels, ollamaModels]);

    return (
        <div className="w-full max-w-4xl mb-6">
            {/* Provider Selection */}
            <div className="flex bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 mb-4 border border-gray-700/50">
                <motion.button
                    onClick={() => onProviderChange('openai')}
                    className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${selectedProvider === 'openai'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                        OpenAI (Internet)
                    </div>
                    <div className="text-xs text-gray-300 mt-1">Cloud-based models</div>
                </motion.button>

                <motion.button
                    onClick={() => onProviderChange('ollama')}
                    className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${selectedProvider === 'ollama'
                        ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Ollama (Local)
                    </div>
                    <div className="text-xs text-gray-300 mt-1">Privacy-first local models</div>
                </motion.button>
            </div>

            {/* Model Selection */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Model:
                </label>
                <select
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    {currentModels.map((model) => (
                        <option key={model.id} value={model.id}>
                            {model.name}
                        </option>
                    ))}
                </select>

                {/* Provider Info */}
                <div className="mt-3 text-xs text-gray-400 flex items-center">
                    {selectedProvider === 'openai' ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Using OpenAI cloud models - requires internet & API key
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Using local Ollama models - private & offline. Ensure Ollama is running with: <code className="bg-gray-600 px-1 rounded">ollama serve</code>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const LocalProviderToggle: React.FC<LocalProviderToggleProps> = ({
    selectedLocalProvider,
    onLocalProviderChange
}) => {
    return (
        <div className="w-full max-w-2xl mb-4">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    Choose AI Provider for Local Document Chat:
                </label>
                <div className="flex bg-gray-700/50 rounded-lg p-1">
                    <motion.button
                        onClick={() => onLocalProviderChange('ollama')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${selectedLocalProvider === 'ollama'
                            ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white'
                            }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Ollama (Local)
                        </div>
                        <div className="text-xs text-gray-300 mt-1">Private & Offline</div>
                    </motion.button>

                    <motion.button
                        onClick={() => onLocalProviderChange('openai')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${selectedLocalProvider === 'openai'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white'
                            }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                            OpenAI (Cloud)
                        </div>
                        <div className="text-xs text-gray-300 mt-1">Advanced Models</div>
                    </motion.button>
                </div>

                {/* Provider Info */}
                <div className="mt-3 text-xs text-gray-400 flex items-start">
                    {selectedLocalProvider === 'ollama' ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 mt-0.5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <div>
                                <strong>100% Private:</strong> Your documents stay on your machine. Requires Ollama running locally.
                                <br />
                                <code className="bg-gray-600 px-1 rounded text-xs">ollama serve</code> to start if needed.
                            </div>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 mt-0.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                            <div>
                                <strong>Advanced AI:</strong> Uses OpenAI&apos;s latest models for document analysis. Requires internet & API key.
                                <br />
                                Documents processed locally, only questions sent to OpenAI.
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    promptValue,
    setPromptValue,
    handleDisplayResult,
    chatBoxSettings,
    setChatBoxSettings,
    onToggleSidebar,
    onLocalChat,
    isLocalChatMode,
    setIsLocalChatMode,
    chatHistory,
    isResearching,
    isLocalChatLoading,
    initialUploadedFiles,
    selectedProvider,
    selectedModel,
    selectedLocalProvider,
}) => {
    const [selectedMode, setSelectedMode] = useState<'local' | 'research'>('local');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialUploadedFiles || []);
    const [isUploading, setIsUploading] = useState(false);
    const [customQuestions, setCustomQuestions] = useState<string[]>(['']);
    const [localProvider, setLocalProvider] = useState<'openai' | 'ollama'>('ollama');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const host = getHost();

    // File upload handling
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setIsUploading(true);

        try {
            // First, clear any existing files to start fresh
            await axios.delete(`${host}/files/clear`);
            console.log('🗑️ Cleared previous files');

            // Then upload new files
            const formData = new FormData();
            acceptedFiles.forEach(file => {
                formData.append('file', file);
            });

            await axios.post(`${host}/upload/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update uploaded files list with only the new files
            const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
                name: file.name,
                size: file.size,
                type: file.type
            }));

            setUploadedFiles(newFiles); // Replace the entire list, don't append

            // Update chat settings to use local documents
            setChatBoxSettings(prev => ({
                ...prev,
                report_source: selectedMode === 'local' ? 'local' : 'hybrid'
            }));

            console.log(`✅ Uploaded ${newFiles.length} new files, cleared previous ones`);

        } catch (error) {
            console.error('Error uploading files:', error);
        } finally {
            setIsUploading(false);
        }
    }, [host, setChatBoxSettings, selectedMode]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
            'text/markdown': ['.md'],
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        multiple: true
    });

    const removeFile = async (fileName: string) => {
        try {
            await axios.delete(`${host}/files/${fileName}`);
            setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    const clearAllFiles = async () => {
        try {
            await axios.delete(`${host}/files/clear`);
            setUploadedFiles([]);
            console.log('🗑️ All files cleared');
        } catch (error) {
            console.error('Error clearing files:', error);
        }
    };

    const handleSubmit = () => {
        if (!promptValue.trim()) return;

        if (selectedMode === 'local') {
            // Handle local chat
            if (onLocalChat) {
                // For local mode, use the local provider toggle selection
                // and default to appropriate models for each provider
                const localModel = localProvider === 'ollama' ? 'mistral:7b' : 'gpt-4o-mini';
                onLocalChat(promptValue, localProvider, localModel);
                setPromptValue('');
            }
        } else {
            // Handle deep research - update settings and trigger research
            // Include chat history context for better research planning
            const conversationContext = chatHistory && chatHistory.length > 0
                ? chatHistory.slice(-10).map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
                : '';

            const contextualQuery = conversationContext
                ? `${promptValue}\n\nConversation Context:\n${conversationContext}`
                : promptValue;

            const updatedSettings = {
                ...chatBoxSettings,
                report_source: 'hybrid' // Use hybrid to include both docs and web
            };
            setChatBoxSettings(updatedSettings);
            handleDisplayResult(contextualQuery, updatedSettings);
            setPromptValue('');
        }
    };

    const addCustomQuestion = () => {
        setCustomQuestions(prev => [...prev, '']);
    };

    const updateCustomQuestion = (index: number, value: string) => {
        setCustomQuestions(prev => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    const removeCustomQuestion = (index: number) => {
        setCustomQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleResearchWithQuestions = () => {
        const validQuestions = customQuestions.filter(q => q.trim());
        if (validQuestions.length === 0) return;

        setChatBoxSettings(prev => ({
            ...prev,
            report_source: 'hybrid',
            report_type: 'deep'
        }));

        const combinedQuery = `Research the following topics: ${validQuestions.join('; ')}`;
        handleDisplayResult(combinedQuery, chatBoxSettings);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Update chat settings when provider or model changes
    useEffect(() => {
        setChatBoxSettings(prev => {
            // For local mode, use the local provider toggle
            // For research mode, use the global provider selection
            const activeProvider = selectedMode === 'local' ? localProvider : selectedProvider;
            const activeModel = selectedMode === 'local' && localProvider === 'ollama'
                ? selectedModel
                : selectedModel;

            // Create the model configuration based on active provider
            let smartLlm = '';
            let fastLlm = '';

            if (activeProvider === 'ollama') {
                smartLlm = `ollama:${activeModel}`;
                fastLlm = `ollama:${activeModel}`;
            } else {
                smartLlm = `openai:${activeModel}`;
                fastLlm = `openai:${activeModel}`;
            }

            return {
                ...prev,
                smart_llm: smartLlm,
                fast_llm: fastLlm,
                report_source: selectedMode === 'local' ? 'local' : 'hybrid'
            };
        });
    }, [selectedProvider, selectedModel, selectedMode, localProvider, setChatBoxSettings]);

    // Update local uploadedFiles when initialUploadedFiles changes
    useEffect(() => {
        if (initialUploadedFiles) {
            setUploadedFiles(initialUploadedFiles);
        }
    }, [initialUploadedFiles]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="w-full max-w-4xl mb-8">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={onToggleSidebar}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>History</span>
                    </button>

                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent"
                    >
                        AI Researcher
                    </motion.h1>

                    <div className="w-[100px]" /> {/* Spacer for balance */}
                </div>

                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-center text-gray-600 dark:text-gray-300 mb-8"
                >
                    Choose your research mode and start exploring
                </motion.p>
            </div>

            {/* Mode Selection */}
            <ModeSelection
                selectedMode={selectedMode}
                onModeChange={setSelectedMode}
                hasDocuments={uploadedFiles.length > 0}
            />

            {/* Current Documents Display */}
            {uploadedFiles.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-2xl mb-4"
                >
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            📚 Current Session Documents ({uploadedFiles.length})
                        </h3>
                        <div className="grid gap-2">
                            {uploadedFiles.slice(0, 5).map((file, index) => (
                                <div key={index} className="flex items-center text-sm text-blue-700 dark:text-blue-300">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 flex-shrink-0"></span>
                                    <span className="truncate">{file.name}</span>
                                </div>
                            ))}
                            {uploadedFiles.length > 5 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 italic">
                                    ...and {uploadedFiles.length - 5} more files
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            ✨ Ready for local chat or deep research!
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Local Provider Toggle - Only show in local mode with uploaded files */}
            {selectedMode === 'local' && uploadedFiles.length > 0 && (
                <LocalProviderToggle
                    selectedLocalProvider={localProvider}
                    onLocalProviderChange={setLocalProvider}
                />
            )}

            {/* File Upload Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-2xl mb-6"
            >
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${isDragActive
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-teal-400 dark:hover:border-teal-500'
                        }`}
                >
                    <input {...getInputProps()} />
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {isUploading ? (
                        <p className="text-teal-600">Uploading files...</p>
                    ) : (
                        <>
                            <p className="text-lg mb-2 text-gray-700 dark:text-gray-300">
                                {isDragActive ? 'Drop files here...' : 'Upload Documents'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Drag and drop or click to select PDF, DOCX, TXT, CSV, XLS files
                            </p>
                        </>
                    )}
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-700 dark:text-gray-300">Uploaded Files:</h4>
                            <button
                                onClick={clearAllFiles}
                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                        {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(file.name)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Research Questions (for Deep Research mode) */}
            {selectedMode === 'research' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-2xl mb-6"
                >
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Custom Research Questions (Optional):</h4>
                    <div className="space-y-2">
                        {customQuestions.map((question, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => updateCustomQuestion(index, e.target.value)}
                                    placeholder={`Research question ${index + 1}...`}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                                {customQuestions.length > 1 && (
                                    <button
                                        onClick={() => removeCustomQuestion(index)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-3">
                        <button
                            onClick={addCustomQuestion}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                            + Add Question
                        </button>
                        {customQuestions.some(q => q.trim()) && (
                            <button
                                onClick={handleResearchWithQuestions}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                            >
                                Research These Questions
                            </button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Chat History Display for Local Mode */}
            {selectedMode === 'local' && chatHistory && chatHistory.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-4xl mb-6 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 max-h-96 overflow-y-auto"
                >
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat History
                    </h3>
                    <div className="space-y-4">
                        {chatHistory.map((message) => (
                            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-3xl px-4 py-3 rounded-lg ${message.type === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-700 text-gray-100'
                                    }`}>
                                    <div className="text-sm font-medium mb-1">
                                        {message.type === 'user' ? 'You' : 'Assistant'}
                                    </div>
                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Input Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-4xl"
            >
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                    <div className="flex flex-col space-y-4">
                        <div className="relative">
                            <textarea
                                value={promptValue}
                                onChange={(e) => setPromptValue(e.target.value)}
                                placeholder={selectedMode === 'local'
                                    ? "Ask questions about your uploaded documents..."
                                    : "What would you like to research? (Will include your documents as context)"}
                                className="w-full p-4 pr-24 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none min-h-[120px]"
                                rows={4}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                disabled={isResearching}
                            />

                            {/* Action Buttons */}
                            <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                                {selectedMode === 'local' && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedMode('research')}
                                        className="flex items-center px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-medium rounded-lg hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 shadow-lg"
                                        title="Enable Deep Research for this question"
                                        disabled={isResearching || !promptValue.trim()}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Deep Research
                                    </motion.button>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSubmit}
                                    disabled={!promptValue.trim() || isResearching}
                                    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isResearching ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {selectedMode === 'research' ? 'Researching...' : 'Processing...'}
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            {selectedMode === 'local' ? 'Chat' : 'Research'}
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>

                        {/* Mode Info */}
                        <div className="flex items-center text-xs text-gray-400">
                            {selectedMode === 'local' ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Chatting with your local documents only
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                                    </svg>
                                    Deep research with internet + your documents as context
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ChatInterface; 