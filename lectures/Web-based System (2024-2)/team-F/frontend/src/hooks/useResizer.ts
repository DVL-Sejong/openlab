import { useEffect, RefObject } from 'react';

const useResizer = (
  resizerRef: RefObject<HTMLDivElement>,
  leftPanelRef: RefObject<HTMLDivElement>,
  minPanelWidth = 240,
) => {
  useEffect(() => {
    const resizer = resizerRef.current;
    const leftPanel = leftPanelRef.current;

    if (!resizer || !leftPanel) return;

    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(minPanelWidth, startWidth + e.clientX - startX - 20);
      leftPanel.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();

      startX = e.clientX;
      startWidth = leftPanel.offsetWidth;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);

    return () => {
      resizer.removeEventListener('mousedown', onMouseDown);
    };
  }, [resizerRef, leftPanelRef]);
};

export default useResizer;