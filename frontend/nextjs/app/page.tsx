"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useWebSocket } from '@/hooks/useWebSocket';
import { useResearchHistory } from '@/hooks/useResearchHistory';
import { startLanggraphResearch } from '../components/Langgraph/Langgraph';
import findDifferences from '../helpers/findDifferences';
import { Data, ChatBoxSettings, QuestionData } from '../types/data';
import { preprocessOrderedData } from '../utils/dataProcessing';
import { ResearchResults } from '../components/ResearchResults';

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InputArea from "@/components/ResearchBlocks/elements/InputArea";
import HumanFeedback from "@/components/HumanFeedback";
import LoadingDots from "@/components/LoadingDots";
import ResearchSidebar from "@/components/ResearchSidebar";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  const [promptValue, setPromptValue] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatBoxSettings, setChatBoxSettings] = useState<ChatBoxSettings>({
    report_source: 'web',
    report_type: 'research_report',
    tone: 'Objective',
    domains: [],
    defaultReportType: 'research_report'
  });
  const [question, setQuestion] = useState("");
  const [orderedData, setOrderedData] = useState<Data[]>([]);
  const [showHumanFeedback, setShowHumanFeedback] = useState(false);
  const [questionForHuman, setQuestionForHuman] = useState<true | false>(false);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isStopped, setIsStopped] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // New state for local chat functionality
  const [isLocalChatMode, setIsLocalChatMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ id: string, type: 'user' | 'assistant', content: string }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isLocalChatLoading, setIsLocalChatLoading] = useState(false);

  const {
    history,
    saveResearch,
    getResearchById,
    deleteResearch,
    clearHistory
  } = useResearchHistory();

  const { socket, initializeWebSocket } = useWebSocket(
    setOrderedData,
    setAnswer,
    setLoading,
    setShowHumanFeedback,
    setQuestionForHuman
  );

  const handleFeedbackSubmit = (feedback: string | null) => {
    if (socket) {
      socket.send(JSON.stringify({ type: 'human_feedback', content: feedback }));
    }
    setShowHumanFeedback(false);
  };

  const handleChat = async (message: string) => {
    if (socket) {
      setShowResult(true);
      setQuestion(message);
      setLoading(true);
      setPromptValue("");
      setAnswer("");

      const questionData: QuestionData = { type: 'question', content: message };
      setOrderedData((prevOrder: Data[]) => [...prevOrder, questionData]);

      socket.send(`chat${JSON.stringify({ message })}`);
    }
  };

  const handleDisplayResult = async (newQuestion: string, settings?: ChatBoxSettings) => {
    console.log('🔍 Starting research with question:', newQuestion);

    // Use passed settings or fall back to current state
    const effectiveSettings = settings || chatBoxSettings;
    console.log('📋 Effective chatBoxSettings:', effectiveSettings);

    setShowResult(true);
    setLoading(true);
    setQuestion(newQuestion);
    setPromptValue("");
    setAnswer("");
    setOrderedData((prevOrder: Data[]) => [...prevOrder, { type: 'question', content: newQuestion }]);

    const storedConfig = localStorage.getItem('apiVariables');
    const apiVariables = storedConfig ? JSON.parse(storedConfig) : {};
    const langgraphHostUrl = apiVariables.LANGGRAPH_HOST_URL;

    console.log('🔧 Config check:', {
      report_type: effectiveSettings.report_type,
      report_source: effectiveSettings.report_source,
      langgraphHostUrl: langgraphHostUrl,
      hasLangGraph: !!langgraphHostUrl
    });

    if (effectiveSettings.report_type === 'multi_agents' && langgraphHostUrl) {
      console.log('🤖 Using LangGraph multi-agents path');
      try {
        let { streamResponse, host, thread_id } = await startLanggraphResearch(newQuestion, effectiveSettings.report_source, langgraphHostUrl);
        const langsmithGuiLink = `https://smith.langchain.com/studio/thread/${thread_id}?baseUrl=${host}`;
        setOrderedData((prevOrder: Data[]) => [...prevOrder, { type: 'langgraphButton', link: langsmithGuiLink }]);

        let previousChunk = null;
        for await (const chunk of streamResponse) {
          if (chunk.data.report != null && chunk.data.report != "Full report content here") {
            setOrderedData((prevOrder: Data[]) => [...prevOrder, { ...chunk.data, output: chunk.data.report, type: 'report' }]);
            setLoading(false);
          } else if (previousChunk) {
            const differences = findDifferences(previousChunk, chunk);
            setOrderedData((prevOrder: Data[]) => [...prevOrder, { type: 'differences', content: 'differences', output: JSON.stringify(differences) }]);
          }
          previousChunk = chunk;
        }
      } catch (error) {
        console.error('❌ LangGraph research failed:', error);
        setLoading(false);
        setOrderedData((prevOrder: Data[]) => [...prevOrder, {
          type: 'error',
          content: 'LangGraph Error',
          output: `Failed to start LangGraph research: ${(error as Error).message}`
        }]);
      }
    } else {
      console.log('🌐 Using WebSocket research path');
      console.log('📡 Initializing WebSocket with:', { newQuestion, effectiveSettings });

      try {
        initializeWebSocket(newQuestion, effectiveSettings);
      } catch (error) {
        console.error('❌ WebSocket initialization failed:', error);
        setLoading(false);
        setOrderedData((prevOrder: Data[]) => [...prevOrder, {
          type: 'error',
          content: 'WebSocket Error',
          output: `Failed to initialize WebSocket: ${(error as Error).message}`
        }]);
      }
    }
  };

  const reset = () => {
    // Reset UI states
    setShowResult(false);
    setPromptValue("");
    setIsStopped(false);

    // Clear previous research data
    setQuestion("");
    setAnswer("");
    setOrderedData([]);
    setAllLogs([]);

    // Reset feedback states
    setShowHumanFeedback(false);
    setQuestionForHuman(false);

    // Clean up connections
    if (socket) {
      socket.close();
    }
    setLoading(false);
  };

  const handleClickSuggestion = (value: string) => {
    setPromptValue(value);
    const element = document.getElementById('input-area');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * Handles stopping the current research
   * - Closes WebSocket connection
   * - Stops loading state
   * - Marks research as stopped
   * - Preserves current results
   */
  const handleStopResearch = () => {
    if (socket) {
      socket.close();
    }
    setLoading(false);
    setIsStopped(true);
  };

  /**
   * Handles starting a new research
   * - Clears all previous research data and states
   * - Resets UI to initial state
   * - Closes any existing WebSocket connections
   */
  const handleStartNewResearch = () => {
    reset();
    setSidebarOpen(false);
  };

  // Load research from history
  const handleSelectResearch = (id: string) => {
    const research = getResearchById(id);
    if (research) {
      setQuestion(research.question);
      setAnswer(research.answer);
      setOrderedData(research.orderedData || []);
      setShowResult(true);
      setLoading(false);
      setIsStopped(false);
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Add scroll-to-bottom functionality
  const scrollToBottom = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: mainContentRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Show scroll button logic
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = mainContentRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom && scrollHeight > clientHeight);
      }
    };

    const mainContent = mainContentRef.current;
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      handleScroll(); // Check initial state
    }

    return () => {
      if (mainContent) {
        mainContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, [showResult, orderedData]);

  // Save research to history when completed
  useEffect(() => {
    if (question && !loading && (answer || orderedData.length > 1)) {
      saveResearch(question, answer, orderedData);
    }
  }, [question, answer, orderedData, loading, saveResearch]);

  // Handle local chat with documents
  const handleLocalChat = async (message: string, provider?: string, model?: string) => {
    if (!message.trim()) return;

    // Set loading state
    setIsLocalChatLoading(true);

    // Add user message to chat history
    const userMessage = {
      id: Date.now().toString() + '-user',
      type: 'user' as const,
      content: message
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      // Make API call to local chat endpoint
      const response = await fetch('/api/local-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          chatHistory: chatHistory.slice(-10), // Send last 10 messages for context
          provider: provider || 'ollama',
          model: model || 'mistral:7b'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant response to chat history
      const assistantMessage = {
        id: Date.now().toString() + '-assistant',
        type: 'assistant' as const,
        content: data.response
      };
      setChatHistory(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error in local chat:', error);
      const errorMessage = {
        id: Date.now().toString() + '-error',
        type: 'assistant' as const,
        content: 'Sorry, I encountered an error while processing your message. Please try again.'
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLocalChatLoading(false);
    }
  };

  // Check for uploaded files
  const checkUploadedFiles = async () => {
    try {
      const response = await fetch('http://localhost:8000/files/');
      if (response.ok) {
        const data = await response.json();
        // Backend returns {files: [...]} so we need to extract the files array
        const files = data.files || [];
        setUploadedFiles(files);
        return files.length > 0;
      }
    } catch (error) {
      console.error('Error checking uploaded files:', error);
    }
    return false;
  };

  // Check for uploaded files on component mount and periodically
  useEffect(() => {
    checkUploadedFiles();
    const interval = setInterval(checkUploadedFiles, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="app-container flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Research History Sidebar */}
      <ResearchSidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        history={history}
        onSelectResearch={handleSelectResearch}
        onDeleteResearch={deleteResearch}
        onNewResearch={handleStartNewResearch}
        onClearHistory={clearHistory}
      />

      <div className="flex flex-1 pt-[80px]" ref={mainContentRef}>
        <div className="flex-1 flex flex-col">
          {!showResult ? (
            <ChatInterface
              promptValue={promptValue}
              setPromptValue={setPromptValue}
              handleDisplayResult={handleDisplayResult}
              chatBoxSettings={chatBoxSettings}
              setChatBoxSettings={setChatBoxSettings}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onLocalChat={handleLocalChat}
              isLocalChatMode={isLocalChatMode}
              setIsLocalChatMode={setIsLocalChatMode}
              chatHistory={chatHistory}
              isResearching={loading}
              isLocalChatLoading={isLocalChatLoading}
              initialUploadedFiles={Array.isArray(uploadedFiles) ? uploadedFiles.map(filename => ({
                name: filename,
                size: 0, // We don't have size info from backend
                type: filename.split('.').pop() || 'unknown'
              })) : []}
            />
          ) : (
            <div className="flex h-full w-full grow flex-col justify-between">
              <div className="container w-full space-y-2">
                <div className="container space-y-2 task-components">
                  <ResearchResults
                    orderedData={orderedData}
                    answer={answer}
                    allLogs={allLogs}
                    chatBoxSettings={chatBoxSettings}
                    handleClickSuggestion={handleClickSuggestion}
                  />
                </div>

                {showHumanFeedback && false && (
                  <HumanFeedback
                    questionForHuman={questionForHuman}
                    websocket={socket}
                    onFeedbackSubmit={handleFeedbackSubmit}
                  />
                )}

                <div className="pt-1 sm:pt-2" ref={chatContainerRef}></div>
              </div>
              <div id="input-area" className="container px-4 lg:px-0">
                {loading ? (
                  <LoadingDots />
                ) : (
                  <InputArea
                    promptValue={promptValue}
                    setPromptValue={setPromptValue}
                    handleSubmit={handleChat}
                    handleSecondary={handleDisplayResult}
                    disabled={loading}
                    reset={reset}
                    isStopped={isStopped}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && showResult && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-8 right-8 flex items-center justify-center w-12 h-12 text-white bg-teal-500 rounded-full hover:bg-teal-600 transform hover:scale-105 transition-all duration-200 shadow-lg z-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}

      <Footer setChatBoxSettings={setChatBoxSettings} chatBoxSettings={chatBoxSettings} />
    </main>
  );
}