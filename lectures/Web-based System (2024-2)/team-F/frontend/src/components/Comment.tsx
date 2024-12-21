import React, { useState, useRef, useEffect } from 'react';


interface CommentProps {
  author_name: string;
  text: string;
  rating: number;
}

const Comment: React.FC<CommentProps> = ({ author_name, text, rating }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [text]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="comment">
      <strong>{author_name}</strong>
      <span>(Rating: {rating})</span>
      <p ref={textRef} className={isExpanded ? 'expanded' : 'collapsed'}>
        {text}
      </p>
      {isTruncated && (
        <button className="show-more-button" onClick={toggleExpand}>
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

export default Comment;