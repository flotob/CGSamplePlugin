import React, { useEffect, useRef, useState } from 'react';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import opentype, { Font } from 'opentype.js';
import type { AnimatedTextSpecificConfig } from '@/types/onboarding-steps'; // Import the specific config type

interface AnimatedTextDisplayProps {
  step: UserStepProgress;
  onComplete: () => void;
  // TODO: Add props for strokeColor, strokeWidth, animationDuration later
}

// Default styling parameters (can be props later)
const DEFAULT_FONT_SIZE = 72; // Font size for path generation
const DEFAULT_STROKE_WIDTH = 2;
// Removed hard-coded stroke colour constant; the SVG now derives its colour from the current theme.
const DEFAULT_ANIMATION_DURATION = 3; // seconds

// Constants for the hardcoded "hello" animation
const HELLO_PATH_DATA = "M-293.58-104.62S-103.61-205.49-60-366.25c9.13-32.45,9-58.31,0-74-10.72-18.82-49.69-33.21-75.55,31.94-27.82,70.11-52.22,377.24-44.11,322.48s34-176.24,99.89-183.19c37.66-4,49.55,23.58,52.83,47.92a117.06,117.06,0,0,1-3,45.32c-7.17,27.28-20.47,97.67,33.51,96.86,66.93-1,131.91-53.89,159.55-84.49,31.1-36.17,31.1-70.64,19.27-90.25-16.74-29.92-69.47-33-92.79,16.73C62.78-179.86,98.7-93.8,159-81.63S302.7-99.55,393.3-269.92c29.86-58.16,52.85-114.71,46.14-150.08-7.44-39.21-59.74-54.5-92.87-8.7-47,65-61.78,266.62-34.74,308.53S416.62-58,481.52-130.31s133.2-188.56,146.54-256.23c14-71.15-56.94-94.64-88.4-47.32C500.53-375,467.58-229.49,503.3-127a73.73,73.73,0,0,0,23.43,33.67c25.49,20.23,55.1,16,77.46,6.32a111.25,111.25,0,0,0,30.44-19.87c37.73-34.23,29-36.71,64.58-127.53C724-284.3,785-298.63,821-259.13a71,71,0,0,1,13.69,22.56c17.68,46,6.81,80-6.81,107.89-12,24.62-34.56,42.72-61.45,47.91-23.06,4.45-48.37-.35-66.48-24.27a78.88,78.88,0,0,1-12.66-25.8c-14.75-51,4.14-88.76,11-101.41,6.18-11.39,37.26-69.61,103.42-42.24,55.71,23.05,100.66-23.31,100.66-23.31";
// Properly calculated viewBox based on path bounds - manually analyzed to center the content
const HELLO_VIEWBOX = "-293.58 -366.25 1114.58 732.5";
const HELLO_STROKE_WIDTH = 35;

const AnimatedTextDisplay: React.FC<AnimatedTextDisplayProps> = ({ step, onComplete }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const [pathData, setPathData] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState<string>('0 0 0 0'); // Initial empty viewBox
  const [isLoadingFont, setIsLoadingFont] = useState<boolean>(true);
  const [fontError, setFontError] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [effectiveStrokeWidth, setEffectiveStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);
  const fontRef = useRef<Font | null>(null);

  const specificConfig = step.config?.specific as AnimatedTextSpecificConfig | undefined;
  const textToAnimate = specificConfig?.text?.trim() || "Hello World"; // Get text from config, fallback

  // Passive completion
  useEffect(() => {
    if (!step.completed_at) {
      onComplete();
    }
  }, [onComplete, step.completed_at]);

  // Font loading effect (only if not "hello")
  useEffect(() => {
    let isMounted = true;
    if (textToAnimate.toLowerCase() === 'hello') {
      setIsLoadingFont(false); // No font needed for hardcoded "hello"
      setFontError(null);
      return; // Skip font loading
    }

    const FONT_PATH = '/fonts/PlaywriteDKLoopet-variable.woff';
    const loadFont = async () => {
      if (fontRef.current) {
        if (isMounted) setIsLoadingFont(false);
        return;
      }
      setIsLoadingFont(true); // Explicitly set loading true before attempt
      try {
        const loadedFont = await opentype.load(FONT_PATH);
        if (isMounted) {
          fontRef.current = loadedFont;
          setIsLoadingFont(false);
          setFontError(null); // Clear any previous font error
        }
      } catch (err) {
        console.error("Font could not be loaded:", err);
        if (isMounted) {
          setFontError(err instanceof Error ? err.message : String(err));
          setIsLoadingFont(false);
        }
      }
    };
    loadFont();
    return () => { isMounted = false; };
  }, [textToAnimate]); // Rerun if textToAnimate changes, to decide if font is needed

  // Path Generation Effect
  useEffect(() => {
    let isMounted = true;

    if (textToAnimate.toLowerCase() === 'hello') {
      if (isMounted) {
        setPathData(HELLO_PATH_DATA);
        setViewBox(HELLO_VIEWBOX);
        setEffectiveStrokeWidth(HELLO_STROKE_WIDTH);
        setPathError(null);
        // Font is implicitly not loading and has no error for "hello" due to the other effect
      }
      return; // Skip opentype.js logic for "hello"
    }

    // Proceed with opentype.js for other texts
    if (!fontRef.current || isLoadingFont || fontError) {
      if (!textToAnimate.trim() && !isLoadingFont && !fontError) {
        setPathData(null);
        setViewBox('0 0 0 0');
        setEffectiveStrokeWidth(DEFAULT_STROKE_WIDTH);
      }
      return;
    }

    try {
      const font = fontRef.current;
      const path = font.getPath(textToAnimate, 0, 0, DEFAULT_FONT_SIZE);
      const generatedPathData = path.toPathData(2);
      const GboundingBox = path.getBoundingBox();
      let vbX = 0, vbY = 0, vbWidth = 0, vbHeight = 0;

      if (GboundingBox && GboundingBox.x2 > GboundingBox.x1 && GboundingBox.y2 > GboundingBox.y1) {
        const padding = DEFAULT_STROKE_WIDTH; // For dynamic text, padding with default stroke
        vbX = GboundingBox.x1 - padding;
        vbY = GboundingBox.y1 - padding;
        vbWidth = (GboundingBox.x2 - GboundingBox.x1) + (padding * 2);
        vbHeight = (GboundingBox.y2 - GboundingBox.y1) + (padding * 2);
      } else if (!textToAnimate.trim()) {
        // Path for empty/whitespace text will be empty, handled by !pathData check later
      } else {
        console.warn("Generated path has an invalid bounding box for text:", textToAnimate);
        vbWidth = 100; vbHeight = 50;
      }

      if (isMounted) {
        setPathData(generatedPathData);
        setViewBox(`${vbX} ${vbY} ${vbWidth} ${vbHeight}`);
        setEffectiveStrokeWidth(DEFAULT_STROKE_WIDTH);
        setPathError(null);
      }
    } catch (err) {
      console.error("Error generating text path:", err);
      if (isMounted) {
        setPathError(err instanceof Error ? err.message : String(err));
        setPathData(null);
      }
    }
    return () => { isMounted = false; };
  }, [textToAnimate, fontRef.current, isLoadingFont, fontError]); // Dependencies updated

  // Animation Effect (remains the same)
  useEffect(() => {
    if (!pathData || !pathRef.current || pathError || fontError ) { // Added fontError check here too
      return;
    }
    const pathElement = pathRef.current;
    const length = pathElement.getTotalLength();
    if (length === 0) {
        console.warn("Path length is 0, skipping animation for text:", textToAnimate);
        pathElement.style.strokeDasharray = 'none';
        pathElement.style.strokeDashoffset = '0';
        pathElement.style.transition = 'none';
        return;
    }
    pathElement.style.strokeDasharray = `${length}`;
    pathElement.style.strokeDashoffset = `${length}`;
    pathElement.style.transition = 'none';
    pathElement.getBoundingClientRect();
    pathElement.style.transition = `stroke-dashoffset ${DEFAULT_ANIMATION_DURATION}s ease-in-out`;
    pathElement.style.strokeDashoffset = '0';
  }, [pathData, pathError, fontError, textToAnimate]);

  // Function to detect if we're on a mobile device (rough estimate)
  const isMobile = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768; // Common breakpoint for tablets/mobile
    }
    return false; // Default to desktop during SSR
  };

  // Use useState and useEffect to track screen size
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  useEffect(() => {
    // Set initial value
    setIsSmallScreen(isMobile());
    
    // Add resize listener
    const handleResize = () => {
      setIsSmallScreen(isMobile());
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Render logic
  if (isLoadingFont && textToAnimate.toLowerCase() !== 'hello') { 
    return <div style={{ padding: '20px', textAlign: 'center' }}><p>Loading font...</p></div>;
  }
  if (fontError && textToAnimate.toLowerCase() !== 'hello') { 
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <p>Error loading font: {fontError}</p>
        <p>Displaying static text as fallback: {textToAnimate}</p>
      </div>
    );
  }
  if (pathError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <p>Error generating path: {pathError}</p>
        <p>Displaying static text as fallback: {textToAnimate}</p> 
      </div>
    );
  }
  if (!pathData || (pathData === 'M0 0Z' && textToAnimate.toLowerCase() !== 'hello')) {
    return (
        <div style={{
            width: '100%', // Ensure this fallback container also takes width
            height: '100%', minHeight: '300px',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px', color: 'white', textAlign: 'center' // Assuming white text is desired on step background
        }}>
            {textToAnimate ? 
                <p>Displaying static text (path could not be generated or text is empty/whitespace): {textToAnimate}</p> : 
                <p>(No text configured for animation)</p>
            }
        </div>
    );
  }

  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: isSmallScreen ? 'center' : 'flex-end', // Center on mobile, bottom on desktop
        justifyContent: 'flex-start',
        padding: isSmallScreen 
          ? '2rem 1rem 2rem 1rem'  // Mobile padding
          : '2rem 1rem 6rem 2rem', // Desktop padding (more bottom padding)
      }}
    >
      <svg 
        ref={svgRef} 
        viewBox={viewBox}
        className="text-foreground" 
        style={{
          width: 'auto',
          maxWidth: '1200px',
          maxHeight: isSmallScreen ? '70vh' : '50vh', // Smaller max height on desktop
          height: 'auto',
          overflow: 'visible',
          marginLeft: '0.5rem'
        }}
        aria-label={textToAnimate} 
        role="img"
        preserveAspectRatio="xMidYMid meet"
      >
        <path 
          ref={pathRef}
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth={effectiveStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default AnimatedTextDisplay; 