import React, {useEffect, useRef} from 'react';
import PromptRecommendation from '@/components/PromptRecommendation';
import ChatComponent from '@/components/ChatComponent';
import useChat from '@/hooks/useChat';
import Refresh from '@/assets/refresh.svg';


export interface ChatMessage {
  text: string;
  isUser: boolean;
  isMuted?: boolean;
}

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isUser: boolean) => void;
  onClearMessages: () => void;
  setScores: (scores: string) => void;
}

const Chat: React.FC<ChatProps> = ({messages, onSendMessage, onClearMessages, setScores}) => {
  const chatContentsRef = useRef<HTMLDivElement>(null);

  const {
    loading,
    error,
    handleRetry,
    handleRefreshClick,
    toggleMuteMessage,
  } = useChat(messages, onSendMessage, onClearMessages, setScores);

  useEffect(() => {
    toLastMessage();
  }, [messages]);

  const toLastMessage = () => {
    if (!chatContentsRef.current) return;

    chatContentsRef.current?.scrollTo({
      top: chatContentsRef.current.scrollHeight + 10,
      behavior: 'smooth'
    });
  };

  return !messages.length ? (
    <PromptRecommendation onClickRecommendation={onSendMessage}/>
  ) : (
    <>
      <div className="chat-header">
        <h2>Chat</h2>
        <button className="img_btn" aria-label="new chat" title="new chat" onClick={handleRefreshClick}>
          <img src={Refresh} alt=""/>
        </button>
      </div>

      <div className="chat-container" ref={chatContentsRef}>
        <div className="gradient-overlay top"></div>
        {!!messages.length && (
          <div className="chat-contents">
            {messages.map((message, index) => (
              <ChatComponent
                key={index}
                message={message}
                toggleMuteMessage={() => toggleMuteMessage(index)} />
            ))}
            {loading && (
              <ChatComponent message={{
                text: 'Generating response...',
                isUser: false
              }} toggleMuteMessage={()=>{}} />
            )}
            {error && (
              <ChatComponent message={{
                text: `Error: ${error}`,
                isUser: false,
                isError: true
              }} toggleMuteMessage={()=>{}} handleRetry={handleRetry} />
            )}
          </div>
        )}
        <div className="gradient-overlay bottom"></div>
      </div>
    </>
  );
};

export default Chat;