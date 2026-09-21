import { useState } from "react";

export default function Infobox({ header, content, pos = "right" }) {
  // header: the React component outside, which would show the infobox when hovered
  // content: the React component inside the infobox, which would show when hovering the outside element
  // pos: the position of the infobox relative to the header, can be "right" or "bottom", default is "right"
  // the infobox itself isn't customizable
  const [showInfobox, setShowInfobox] = useState(false);

  const posStyle = (
    pos === "right" ? { position: 'absolute', top: '0', left: '100%' } : 
    pos === "bottom" ? { position: 'absolute', top: '100%', left: '0' } :
    pos === "bottom-right-10" ? { position: 'absolute', top: '100%', left: '10%' } :
    { position: 'absolute', top: '0', left: '100%' } // right
  );

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setShowInfobox(true)} 
        onMouseLeave={() => setShowInfobox(false)}
      >
        {header}
      </div>
      
      {showInfobox && content && (
        <div 
            className="bg-gray-900 border border-gray-700 rounded p-4 w-fit z-40 inline-block" 
            // style={{ position: 'absolute', top: '100%', left: '0' }}
            style={posStyle}
            onMouseEnter={() => setShowInfobox(true)} 
            onMouseLeave={() => setShowInfobox(false)}
            onClick={e => {
              e.stopPropagation();  // to prevent clicking the elements outside when clicking inside the infobox
            }}
        >
            {content}
        </div>
      )}
    </div>
  );
}