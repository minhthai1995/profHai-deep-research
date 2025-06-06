import React, { useState, useRef, useCallback, useEffect } from "react";
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
    onLocalChat?: (message: string) => void;
    isLocalChatMode?: boolean;
    setIsLocalChatMode?: (mode: boolean) => void;
    chatHistory?: Array<{ id: string, type: 'user' | 'assistant', content: string }>;
    isResearching?: boolean;
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
}) => {
    const [selectedMode, setSelectedMode] = useState<'local' | 'research'>('local');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [customQuestions, setCustomQuestions] = useState<string[]>(['']);
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
                onLocalChat(promptValue);
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
                        GPT Researcher
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