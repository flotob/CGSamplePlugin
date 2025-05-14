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
const DEFAULT_STROKE_COLOR = '#FFFFFF';

const AnimatedTextDisplay: React.FC<AnimatedTextDisplayProps> = ({ step, onComplete }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const [pathData, setPathData] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState<string>('0 0 0 0'); // Initial empty viewBox
  const [isLoadingFont, setIsLoadingFont] = useState<boolean>(true);
  const [fontError, setFontError] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const fontRef = useRef<Font | null>(null);

  const specificConfig = step.config?.specific as AnimatedTextSpecificConfig | undefined;
  const textToAnimate = specificConfig?.text?.trim() || "Hello World"; // Get text from config, fallback

  // Passive completion
  useEffect(() => {
    if (!step.completed_at) {
      onComplete();
    }
  }, [onComplete, step.completed_at]);

  // 1. Load Font
  useEffect(() => {
    let isMounted = true;
    const FONT_PATH = '/fonts/PlaywriteDKLoopet-variable.woff';

    const loadFont = async () => {
      if (fontRef.current) {
        if (isMounted) setIsLoadingFont(false);
        return;
      }
      try {
        const loadedFont = await opentype.load(FONT_PATH);
        if (isMounted) {
          fontRef.current = loadedFont;
          setIsLoadingFont(false);
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
  }, []);

  // 2. Generate Path when font is loaded and text is available
  useEffect(() => {
    if (!fontRef.current || isLoadingFont || fontError || !textToAnimate) {
      // Don't proceed if font isn't ready, or no text
      if (!textToAnimate && !isLoadingFont && !fontError) {
        // If font is loaded but text is empty, clear any previous path
        setPathData(null);
        setViewBox('0 0 0 0');
      }
      return;
    }
    let isMounted = true;
    try {
      console.log(`Generating path for text: "${textToAnimate}"`);
      const font = fontRef.current;
      const path = font.getPath(textToAnimate, 0, 0, DEFAULT_FONT_SIZE);
      const generatedPathData = path.toPathData(2); // 2 decimal places precision
      
      const GboundingBox = path.getBoundingBox();
      let vbX = 0, vbY = 0, vbWidth = 0, vbHeight = 0;
      if (GboundingBox && GboundingBox.x2 > GboundingBox.x1 && GboundingBox.y2 > GboundingBox.y1) {
        const padding = DEFAULT_STROKE_WIDTH; // Padding based on stroke width
        vbX = GboundingBox.x1 - padding;
        vbY = GboundingBox.y1 - padding;
        vbWidth = (GboundingBox.x2 - GboundingBox.x1) + (padding * 2);
        vbHeight = (GboundingBox.y2 - GboundingBox.y1) + (padding * 2);
      } else if (!textToAnimate.trim()) {
        // Handle case where text might be only whitespace leading to empty/degenerate bounding box
        console.log("Text is empty or whitespace, generating empty path.");
      } else {
        console.warn("Generated path has an invalid bounding box. Text:", textToAnimate, "BBox:", GboundingBox);
         // Fallback to a small default viewBox to avoid full collapse if bbox is weird, but path might be invisible
        vbWidth = 100; vbHeight = 50;
      }

      if (isMounted) {
        setPathData(generatedPathData);
        setViewBox(`${vbX} ${vbY} ${vbWidth} ${vbHeight}`);
        setPathError(null); // Clear previous path errors
        console.log("Path generated successfully. Path data length:", generatedPathData.length, "ViewBox:", `${vbX} ${vbY} ${vbWidth} ${vbHeight}`);
      }
    } catch (err) {
      console.error("Error generating text path:", err);
      if (isMounted) {
        setPathError(err instanceof Error ? err.message : String(err));
        setPathData(null); // Clear path data on error
      }
    }
    return () => { isMounted = false; };
  }, [fontRef.current, textToAnimate, isLoadingFont, fontError]); // Rerun if font, text, or loading states change


  // Render logic
  if (isLoadingFont) {
    return <div style={{ padding: '20px', textAlign: 'center' }}><p>Loading font...</p></div>;
  }

  if (fontError) {
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

  // If pathData is null or empty (e.g. empty textToAnimate), render fallback or nothing
  if (!pathData || pathData === 'M0 0Z' /* opentype.js might return this for empty */) {
    return (
        <div style={{
            height: '100%', minHeight: '300px',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px', color: 'white'
        }}>
            {textToAnimate ? 
                <p>Displaying static text (path could not be generated or text is empty): {textToAnimate}</p> : 
                <p>(No text configured for animation)</p>
            }
        </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      minHeight: '300px',
      background: 'linear-gradient(217deg, rgba(255, 159, 237,0.8), rgba(255,0,0,0) 70.71%), linear-gradient(127deg, rgba(118, 164, 255,0.8), rgba(0,255,0,0) 70.71%), linear-gradient(336deg, rgba(255, 191, 138,0.8), rgba(0,0,255,0) 70.71%)', // Temporary BG
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      flexDirection: 'column'
    }}>
      <svg 
        ref={svgRef} 
        viewBox={viewBox} 
        style={{
            width: '80%', // Example width, adjust as needed or make responsive
            maxWidth: '600px', 
            margin: 'auto',
            overflow: 'visible' // Important for strokes not to be clipped by viewBox initially
        }}
        aria-label={textToAnimate} 
        role="img"
      >
        <path 
          ref={pathRef}
          d={pathData}
          fill="none"
          stroke={DEFAULT_STROKE_COLOR}
          strokeWidth={DEFAULT_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Animation will be added in the next step */}
    </div>
  );
};

export default AnimatedTextDisplay; 