import { useState } from 'react';

function Infobox({ renderHeader, renderInfoboxContent }) {
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

export default function Test({setting}) {

  return (<>
    <div className="mx-4 my-4">
      <div className="text-2xl font-bold text-white my-2">
        <p>Test</p>
      </div>
      <div className="space-y-4">
        <Infobox 
          renderHeader={() => <a 
              className={`text-yellow-400 font-bold underline decoration-dashed underline-offset-3 text-lg font-bold`} 
              href={null}
              target="_blank"
              rel="noopener noreferrer"
            >
              ABC
            </a>
          }
          renderInfoboxContent={() => <p className="whitespace-nowrap">Infobox content for ABC</p>}
        />

        <Infobox 
          renderHeader={() => <a 
              className={`text-yellow-400 font-bold underline decoration-dashed underline-offset-3 text-lg font-bold`} 
              href={null} target="_blank" rel="noopener noreferrer"
            >
              ABC
            </a>
          }
          renderInfoboxContent={() => {
            return <>
              <p className="whitespace-nowrap">Infobox content for ABC</p>;
              <Infobox renderHeader={() => <span>Inner Infobox</span>} renderInfoboxContent={() => <p>Content for inner infobox</p>} />
              <Infobox renderHeader={() => <span>Inner Infobox</span>} renderInfoboxContent={() => <p>Content for inner infobox</p>} />
              <Infobox renderHeader={() => <span>Inner Infobox</span>} renderInfoboxContent={() => <p>Content for inner infobox</p>} />
            </>
          }}
        />
      </div>
    </div>
  </>);
}

