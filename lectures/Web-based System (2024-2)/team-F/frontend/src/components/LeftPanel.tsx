import React, { useRef, useState } from 'react';
import useResizer from '../hooks/useResizer';
import ChatInput from '@/components/ChatInput';
import Chat from './Chat';
import '@/styles/LeftPanel.css';

export interface ChatProps {
  text: string,
  isUser: boolean
}

interface LeftPanelProps {
  setScores: (scores: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ setScores }) => {
  const resizerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatProps[]>([]);

  useResizer(resizerRef, leftPanelRef);

  const handleSendMessage = (text: string, isUser: boolean) => {
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages];

      if (updatedMessages.length > 1 && !updatedMessages[updatedMessages.length - 1].isUser && !isUser) {
        updatedMessages[updatedMessages.length - 1] = { text, isUser };
      } else {
        updatedMessages.push({ text, isUser });
      }
      return updatedMessages;
    });
  };

  const handleClearMessages = () => {
    setMessages([]);
    setScores('0,0,0,0,0');
  };

  return (
    <aside className='panel left-panel' ref={leftPanelRef} style={{ width: 300 }}>
      <div className='resizer' id='resizer' ref={resizerRef} />
      <Chat messages={messages} onSendMessage={handleSendMessage} onClearMessages={handleClearMessages} setScores={setScores} />
      <ChatInput onSendMessage={handleSendMessage} />
    </aside>
  );
};

export default LeftPanel;