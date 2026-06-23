
export default function H2Page() {
  return (
    <div className="w-full h-[calc(100vh-60px)]">
      <iframe 
        src="/h2_pinch.html" 
        title="Hydrogen Pinch Analyzer"
        className="w-full h-full border-none"
        style={{ display: 'block' }}
      ></iframe>
    </div>
  );
}