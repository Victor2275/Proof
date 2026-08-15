import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, LayoutGrid, Image as ImageIcon, X, Sun, Moon } from 'lucide-react';
import { type Recipe, type BakeLog } from '../lib/api';
import { renderWithTimers } from '../utils/timerParser';

interface InstagramExporterProps {
  recipe: Recipe;
  bakeLog?: BakeLog;
  onClose: () => void;
}

export default function InstagramExporter({ recipe, bakeLog, onClose }: InstagramExporterProps) {
  const [exportMode, setExportMode] = useState<'carousel' | 'single'>('carousel');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [exporting, setExporting] = useState(false);
  const carouselRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const singleRef = useRef<HTMLDivElement>(null);
  const [rotation] = useState(() => (Math.random() * 10 - 5).toFixed(2));

  const heroImage = bakeLog?.imageUrls?.[0] || recipe.imageUrls?.[0] || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80';

  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const updateScale = () => {
      const padding = window.innerWidth >= 768 ? 64 : 32;
      const availableWidth = window.innerWidth - padding;
      const maxScale = 0.8;
      setScale(Math.min(availableWidth / 1080, maxScale));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const wrapperStyle = { width: `${1080 * scale}px`, height: `${1080 * scale}px` };
  const innerStyle = { transform: `scale(${scale})`, transformOrigin: 'top left' };


  const downloadCanvas = async (element: HTMLElement | null, filename: string) => {
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#000000' });
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (exportMode === 'single') {
        await downloadCanvas(singleRef.current, `${recipe.title}-ig-single.jpg`);
      } else {
        await downloadCanvas(carouselRefs[0].current, `${recipe.title}-ig-1-hero.jpg`);
        await downloadCanvas(carouselRefs[1].current, `${recipe.title}-ig-2-ingredients.jpg`);
        await downloadCanvas(carouselRefs[2].current, `${recipe.title}-ig-3-instructions.jpg`);
        await downloadCanvas(carouselRefs[3].current, `${recipe.title}-ig-4-link.jpg`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to export images');
    } finally {
      setExporting(false);
    }
  };

  const GoldAccent = () => <div className="w-12 h-1 bg-[#eab308] mb-6"></div>;
  const Logo = () => <div className="absolute bottom-12 right-12"><img src="/logo.png" alt="Logo" className="h-16 w-auto" crossOrigin="anonymous" /></div>;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col">
      <div className="p-4 md:p-6 flex justify-between items-center bg-black border-b border-white/10">
        <h2 className="text-white font-bold text-xl uppercase tracking-widest">Instagram Exporter</h2>
        <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full transition-colors"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          <button onClick={() => setExportMode('carousel')} className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all ${exportMode === 'carousel' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}><LayoutGrid className="w-5 h-5" /> Carousel (3 Posts)</button>
          <button onClick={() => setExportMode('single')} className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all ${exportMode === 'single' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}><ImageIcon className="w-5 h-5" /> Single Polaroid Only</button>
          
          <div className="w-px h-8 bg-white/20 self-center mx-2 hidden sm:block"></div>
          
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all bg-white/10 text-white hover:bg-white/20"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          </button>
        </div>

        <div className="flex flex-col gap-12 mb-12">
          {exportMode === 'single' && (
            <div className="shadow-2xl overflow-hidden relative" style={wrapperStyle}>
              <div style={innerStyle} className="absolute top-0 left-0">
                <div 
                  ref={singleRef} 
                  className={`w-[1080px] h-[1080px] relative flex items-center justify-center font-sans overflow-hidden ${theme === 'dark' ? 'bg-[#ffffff]' : 'bg-[#1a1a1a]'}`}
                >
                  <div 
                    className={`relative flex flex-col shadow-2xl ${theme === 'dark' ? 'bg-[#1a1a1a] text-[#ffffff]' : 'bg-[#ffffff] text-[#000000]'}`}
                    style={{ width: '700px', height: '800px', padding: '40px 40px 160px 40px', transform: `rotate(${rotation}deg)` }}
                  >
                  {/* Photo Area */}
                  <div className="w-full h-full relative overflow-hidden bg-[#000000] border border-[#0000001a]" style={{ boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.5)' }}>
                    <div 
                      className="w-full h-full" 
                      style={{ 
                        backgroundImage: `url(${heroImage})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center', 
                        opacity: 0.9 
                      }} 
                    />
                  </div>

                  {/* Title & Logo Area (in the thick bottom border) */}
                  <div className="absolute bottom-0 left-0 right-0 h-[160px] flex flex-col items-center justify-center px-10">
                    <h1 className="text-6xl font-black tracking-tight text-center uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
                      {recipe.title}
                    </h1>
                    {recipe.tags && recipe.tags.length > 0 && (
                      <p className={`mt-2 text-xl tracking-widest font-bold ${theme === 'dark' ? 'text-[#ffffff80]' : 'text-[#00000080]'}`}>
                        #{recipe.tags[0].replace(/\s+/g, '')}
                      </p>
                    )}
                    <div className="absolute bottom-6 right-8">
                      <img src="/logo.png" alt="Logo" className="h-10 w-auto" crossOrigin="anonymous" />
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {exportMode === 'carousel' && (
            <div className="flex gap-8 flex-wrap justify-center w-full max-w-[3400px]">
              {/* Slide 1: Hero Polaroid */}
              <div className="shadow-2xl relative" style={wrapperStyle}>
                <div style={innerStyle} className="absolute top-0 left-0">
                  <div 
                    ref={carouselRefs[0]} 
                    className={`w-[1080px] h-[1080px] relative flex flex-col font-sans overflow-hidden ${theme === 'dark' ? 'bg-[#1a1a1a] text-[#ffffff]' : 'bg-[#ffffff] text-[#000000]'}`}
                    style={{ padding: '60px 140px 220px 140px' }}
                  >
                  {/* Photo Area */}
                  <div className="w-full h-full relative overflow-hidden bg-[#000000] border border-[#0000001a]" style={{ boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.5)' }}>
                    <div 
                      className="w-full h-full" 
                      style={{ 
                        backgroundImage: `url(${heroImage})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center', 
                        opacity: 0.9 
                      }} 
                    />
                  </div>

                  {/* Title & Logo Area (in the thick bottom border) */}
                  <div className="absolute bottom-0 left-0 right-0 h-[220px] flex flex-col items-center justify-center px-16">
                    <h1 className="text-7xl font-black tracking-tight text-center uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
                      {recipe.title}
                    </h1>
                    <p className={`mt-4 text-2xl tracking-widest font-bold ${theme === 'dark' ? 'text-[#ffffff80]' : 'text-[#00000080]'}`}>
                      SWIPE FOR RECIPE &rarr;
                    </p>
                    
                    <div className="absolute bottom-8 right-12">
                      <img src="/logo.png" alt="Logo" className="h-16 w-auto" crossOrigin="anonymous" />
                    </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 2: Ingredients */}
              <div className="shadow-2xl relative" style={wrapperStyle}>
                <div style={innerStyle} className="absolute top-0 left-0">
                  <div ref={carouselRefs[1]} className="w-[1080px] h-[1080px] bg-[#000000] text-[#ffffff] p-20 relative font-sans overflow-hidden border border-[#ffffff33] flex flex-col">
                    <GoldAccent />
                  <h1 className="text-6xl font-black mb-16 tracking-tight">Ingredients</h1>
                  <div className="grid grid-cols-2 gap-x-16 gap-y-8 flex-1 content-start">
                    {recipe.ingredients.slice(0, 16).map((ing, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-[#ffffff1a] pb-4">
                        <span className="text-2xl text-[#ffffffe6]">{ing.name}</span>
                        <span className="text-2xl font-bold text-[#eab308]">{ing.quantity} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                    <Logo />
                  </div>
                </div>
              </div>

              {/* Slide 3: Instructions */}
              <div className="shadow-2xl relative" style={wrapperStyle}>
                <div style={innerStyle} className="absolute top-0 left-0">
                  <div ref={carouselRefs[2]} className="w-[1080px] h-[1080px] bg-[#000000] text-[#ffffff] p-20 relative font-sans overflow-hidden border border-[#ffffff33] flex flex-col">
                    <GoldAccent />
                  <h1 className="text-6xl font-black mb-16 tracking-tight">Instructions</h1>
                  <div className="space-y-12 flex-1 overflow-hidden">
                    {recipe.instructions.slice(0, 5).map((step, idx) => (
                      <div key={idx} className="flex gap-8">
                        <span className="text-4xl font-black text-[#eab308]">{idx + 1}.</span>
                        <div className="text-2xl leading-relaxed text-[#ffffffcc]">{renderWithTimers(step, `Step ${idx+1}`)}</div>
                      </div>
                    ))}
                    {recipe.instructions.length > 5 && (
                      <div className="text-xl text-[#ffffff66] italic">...plus {recipe.instructions.length - 5} more steps. See the full recipe!</div>
                      )}
                    </div>
                    <Logo />
                  </div>
                </div>
              </div>

              {/* Slide 4: Link to Website */}
              <div className="shadow-2xl relative" style={wrapperStyle}>
                <div style={innerStyle} className="absolute top-0 left-0">
                  <div ref={carouselRefs[3]} className="w-[1080px] h-[1080px] bg-[#000000] text-[#ffffff] p-20 relative font-sans overflow-hidden border border-[#ffffff33] flex flex-col items-center justify-center text-center">
                    <GoldAccent />
                  <h1 className="text-7xl font-black mb-8 tracking-tight">Get the Full Details</h1>
                  <p className="text-3xl text-[#ffffffcc] mb-16 max-w-2xl leading-relaxed">
                    View the full recipe, ingredients, and instructions on our website.
                  </p>
                  <div className="bg-white/10 p-8 rounded-2xl border border-white/20">
                    <span className="text-4xl font-bold text-[#eab308] break-all">
                      {window.location.origin}/recipe/{recipe._id}
                    </span>
                  </div>
                    <Logo />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-black border-t border-white/10 p-6 flex justify-center">
        <button 
          onClick={handleExport}
          disabled={exporting}
          className="bg-yellow-500 text-black px-12 py-4 rounded-xl font-black text-xl hover:bg-yellow-400 transition-colors flex items-center gap-3 disabled:opacity-50"
        >
          <Download className="w-6 h-6" /> {exporting ? 'Generating Images...' : 'Download for Instagram'}
        </button>
      </div>
    </div>
  );
}
