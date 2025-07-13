import React from 'react';
import PaperCard from './PaperCard';
import './PaperList.css';

const PaperList = ({ papers, downloadPath, downloadBehavior, directoryHandle }) => {
  return (
    <div className="paper-list">
      <div className="papers-grid">
        {papers.map((paper, index) => (
          <PaperCard 
            key={index} 
            paper={paper} 
            downloadPath={downloadPath}
            downloadBehavior={downloadBehavior}
            directoryHandle={directoryHandle}
          />
        ))}
      </div>
    </div>
  );
};

export default PaperList;