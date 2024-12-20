import React from 'react';
import {ChatMessage} from '@/components/Chat';
import UnmuteIcon from '@/assets/unmute.svg';
import MuteIcon from '@/assets/mute.svg';
import Refresh from '@/assets/refresh.svg';

interface ChatComponentProps {
  message: ChatMessage & {isError?: boolean};
  toggleMuteMessage: () => void;
  handleRetry?: () => void;
}

const ChatComponent: React.FC<ChatComponentProps> = ({message, toggleMuteMessage, handleRetry}) => {
  return (
    <div className={`chat-messages ${message.isUser ? 'user' : 'response'}`}>
      <div className={`chat-bubble ${message.isMuted ? 'mute' : ''} ${message.isError ? 'error' : ''}`}>
        {message.text}
      </div>
      {message.isUser && (
        <button onClick={toggleMuteMessage} className="img_btn"
                title={message.isMuted ? 'unmute' : 'mute'}
                aria-label={message.isMuted ? 'unmute' : 'mute'}>
          <img src={message.isMuted ? UnmuteIcon : MuteIcon} alt='' />
        </button>
      )}

      {message.isError && (
        <button onClick={handleRetry} className="img_btn"
                title="retry" aria-label="retry">
          <img src={Refresh} alt=''/>
        </button>
      )}
    </div>
  );
};

export default ChatComponent;