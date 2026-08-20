import { useState } from "react";

export default function Infobox({ renderHeader, renderInfoboxContent }) {
  // renderHeader() -> the element outside, which would show the infobox when hovered
  // renderInfoboxContent() -> the element inside the infobox, which would show when hovering the outside element
  // the infobox itself isn't customizable
  const [showInfobox, setShowInfobox] = useState(false);

  const infoboxContent = renderInfoboxContent() || null;
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setShowInfobox(true)} 
        onMouseLeave={() => setShowInfobox(false)}
      >
        {renderHeader()}
      </div>
      
      {showInfobox && infoboxContent && (
        <div 
            className="bg-gray-900 border border-gray-700 rounded p-4 w-fit z-40 inline-block" 
            // style={{ position: 'absolute', top: '100%', left: '0' }}
            style={{ position: 'absolute', top: '0', left: '100%' }}
            onMouseEnter={() => setShowInfobox(true)} 
            onMouseLeave={() => setShowInfobox(false)}
            onClick={e => {
              e.stopPropagation();  // to prevent clicking the elements outside when clicking inside the infobox
            }}
        >
            {infoboxContent}
        </div>
      )}
    </div>
  );
}