// code-block.js
import React from 'react';

export const CodeBlock = ({ language, value }) => {
  const formattedValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;

  return (
    <div className="relative rounded-lg bg-gray-800/50 p-4 overflow-x-auto">
      <pre className="text-sm font-mono text-gray-200 whitespace-pre">
        {formattedValue}
      </pre>
      {language && (
        <div className="absolute top-2 right-2 text-xs text-gray-500">
          {language}
        </div>
      )}
    </div>
  );
};