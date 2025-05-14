import React, { useEffect, useRef } from 'react';
// import { UserStepProgress } from '@/types/onboarding-user'; // Original problematic import

// Minimal local type for the interim hardcoded version
interface MinimalStepInfo {
  id: string;
  completed_at: string | null | undefined;
  // config?: any; // We don't use config.specific.text in this version
}

interface AnimatedTextDisplayProps {
  step: MinimalStepInfo; // Use the minimal local type
  onComplete: () => void;
}

const AnimatedTextDisplay: React.FC<AnimatedTextDisplayProps> = ({ step, onComplete }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  // Passive completion
  useEffect(() => {
    if (!step.completed_at) {
      onComplete();
    }
  }, [onComplete, step.completed_at]);

  // Animation setup for the hardcoded path
  useEffect(() => {
    const pathElement = pathRef.current;
    if (pathElement) {
      const length = pathElement.getTotalLength();
      pathElement.style.strokeDasharray = `${length}px`;
      pathElement.style.strokeDashoffset = `${length}px`;

      // Trigger animation by adding a class after a short delay or reflow
      // to ensure initial styles are applied.
      requestAnimationFrame(() => {
        pathElement.style.animation = `anim__hello__${step.id} 5s linear forwards`;
      });
    }
  }, [step.id]);

  const uniqueAnimationName = `anim__hello__${step.id}`;

  return (
    <div style={{
      height: '100%',
      minHeight: '300px', // Ensure there's some height
      background: 'linear-gradient(217deg, rgba(255, 159, 237,0.8), rgba(255,0,0,0) 70.71%), linear-gradient(127deg, rgba(118, 164, 255,0.8), rgba(0,255,0,0) 70.71%), linear-gradient(336deg, rgba(255, 191, 138,0.8), rgba(0,0,255,0) 70.71%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes ${uniqueAnimationName} {
            0% {
              stroke-dashoffset: ${pathRef.current?.getTotalLength()}px; /* Initial offset */
            }
            25% {
              stroke-dashoffset: ${pathRef.current?.getTotalLength()}px; /* Hold before drawing */
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
        `
      }} />
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        margin: '0 auto',
        textAlign: 'center',
        width: '100%',
        maxWidth: '600px'
      }}>
        <svg ref={svgRef} viewBox="0 0 1230.94 414.57" style={{
          fill: 'none',
          stroke: '#fff',
          strokeLinecap: 'round',
          strokeMiterlimit: 10,
          strokeWidth: '35px',
          width: '100%'
        }}>
          {/* Path data from apple-hello.md */}
          <path ref={pathRef} d="M-293.58-104.62S-103.61-205.49-60-366.25c9.13-32.45,9-58.31,0-74-10.72-18.82-49.69-33.21-75.55,31.94-27.82,70.11-52.22,377.24-44.11,322.48s34-176.24,99.89-183.19c37.66-4,49.55,23.58,52.83,47.92a117.06,117.06,0,0,1-3,45.32c-7.17,27.28-20.47,97.67,33.51,96.86,66.93-1,131.91-53.89,159.55-84.49,31.1-36.17,31.1-70.64,19.27-90.25-16.74-29.92-69.47-33-92.79,16.73C62.78-179.86,98.7-93.8,159-81.63S302.7-99.55,393.3-269.92c29.86-58.16,52.85-114.71,46.14-150.08-7.44-39.21-59.74-54.5-92.87-8.7-47,65-61.78,266.62-34.74,308.53S416.62-58,481.52-130.31s133.2-188.56,146.54-256.23c14-71.15-56.94-94.64-88.4-47.32C500.53-375,467.58-229.49,503.3-127a73.73,73.73,0,0,0,23.43,33.67c25.49,20.23,55.1,16,77.46,6.32a111.25,111.25,0,0,0,30.44-19.87c37.73-34.23,29-36.71,64.58-127.53C724-284.3,785-298.63,821-259.13a71,71,0,0,1,13.69,22.56c17.68,46,6.81,80-6.81,107.89-12,24.62-34.56,42.72-61.45,47.91-23.06,4.45-48.37-.35-66.48-24.27a78.88,78.88,0,0,1-12.66-25.8c-14.75-51,4.14-88.76,11-101.41,6.18-11.39,37.26-69.61,103.42-42.24,55.71,23.05,100.66-23.31,100.66-23.31" transform="translate(311.08 476.02)" />
        </svg>
      </div>
    </div>
  );
};

export default AnimatedTextDisplay; 