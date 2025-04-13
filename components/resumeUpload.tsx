"use client"

import React, { useState, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';

// We need to configure the worker differently in Next.js
// This avoids the dynamic import issues
const pdfjsWorker = () => {
  if (typeof window === 'undefined') {
    return null; // Return null on server side
  }
  
  // Import the worker as a separate chunk
  import('pdfjs-dist/build/pdf.worker.entry');
  
  // Set the worker globally
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.entry',
      import.meta.url,
    ).toString();
  }
};

export default function ResumeUploader() {
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize PDF.js worker on client-side
  React.useEffect(() => {
    pdfjsWorker();
  }, []);

  // This function extracts text from PDF data
  const extractTextFromPDFData = async (pdfData: string): Promise<string> => {
    try {
      // Remove the data URL prefix to get the base64 string
      const base64Data = pdfData.replace(/^data:application\/pdf;base64,/, '');
      
      // Convert base64 to binary
      const binaryData = atob(base64Data);
      
      // Create a typed array from the binary string
      const length = binaryData.length;
      const array = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      
      // Load the PDF document
      const loadingTask = pdfjs.getDocument({ data: array });
      const pdf = await loadingTask.promise;
      
      // Extract text from each page
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text from each item
        const pageText = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += `${pageText}\n\n`;
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Error details:', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  const processFile = async (file: File) => {
    if (file && file.type === 'application/pdf') {
      setFileName(file.name);
      setIsLoading(true);
      
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        const pdfData = event.target?.result as string;
        setPdfFile(pdfData);
        
        try {
          // Process in background - just extract text and log it
          const text = await extractTextFromPDFData(pdfData);
          console.log("Extracted text from PDF:", text);
          // No need to set extracted text to state since we don't display it
        } catch (error) {
          console.error("Error extracting text from PDF:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fileReader.readAsDataURL(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500');
    e.currentTarget.classList.add('bg-blue-50');
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500');
    e.currentTarget.classList.remove('bg-blue-50');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500');
    e.currentTarget.classList.remove('bg-blue-50');
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const resetUpload = () => {
    setPdfFile(null);
    setFileName('');
  };

  return (
    <div className="flex flex-col items-center min-h-screen w-full bg-gray-50 p-4">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-xl flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p>Processing resume...</p>
          </div>
        </div>
      )}

      {!pdfFile ? (
        <div 
          className="w-full max-w-2xl mx-auto mt-10 bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-blue-300 transition-all cursor-pointer hover:border-blue-500"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
        >
          <input
            type="file"
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Upload Your Resume</h3>
            <p className="text-sm text-gray-500 text-center">
              Drag and drop your PDF resume here, or click to select a file
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
              Select PDF
            </button>
            <p className="text-xs text-gray-400">PDF files only</p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl mt-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header with filename and actions */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-medium text-gray-700 truncate">{fileName}</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={handleUploadClick} 
                  className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                >
                  Upload New
                </button>
                <button 
                  onClick={resetUpload} 
                  className="text-sm px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* PDF preview */}
            <div className="w-full h-96">
              <iframe 
                src={pdfFile} 
                className="w-full h-full"
                title="Resume Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}