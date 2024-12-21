import React, {useEffect, useState} from 'react';
import SendFill from '@/assets/send_fill.svg';

interface ChatInputProps {
  onSendMessage: (text: string, isUser: boolean) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [text, setText] = useState('');
  const textareaRef = React.createRef<HTMLTextAreaElement>();

  const handleSendMessage = () => {
    if (text.trim()) {
      onSendMessage(text, true);
      setText('');
    }
  };

  // calculate text height when text is changed
  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  return (
    <div className='chat-input-container'>
      <div className="chat-input">
      <textarea
        value={text}
        ref={textareaRef}
        onChange={e => setText(e.target.value)}
        placeholder="Please tell us the restaurant you are looking for"
        rows={1}
      />
        <button
          aria-label="search"
          onClick={handleSendMessage}
          disabled={!text.trim()}
        >
          <img src={SendFill} alt=""/>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;