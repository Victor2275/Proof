import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, LayoutGrid, Image as ImageIcon, X } from 'lucide-react';
import { type Recipe } from '../lib/api';
import { renderWithTimers } from '../utils/timerParser';

interface InstagramExporterProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function InstagramExporter({ recipe, onClose }: InstagramExporterProps) {
  const [exportMode, setExportMode] = useState<'carousel' | 'single'>('carousel');
  const [exporting, setExporting] = useState(false);
  const carouselRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const singleRef = useRef<HTMLDivElement>(null);

  const heroImage = recipe.imageUrls?.[0] || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80';

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
      }
    } catch (err) {
      console.error(err);
      alert('Failed to export images');
    } finally {
      setExporting(false);
    }
  };

  const GoldAccent = () => <div className="w-12 h-1 bg-yellow-500 mb-6"></div>;
  const Logo = () => <div className="absolute bottom-6 right-6 font-bold text-yellow-500 tracking-widest text-sm uppercase">Victor's Lab</div>;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col">
      <div className="p-4 md:p-6 flex justify-between items-center bg-black border-b border-white/10">
        <h2 className="text-white font-bold text-xl uppercase tracking-widest">Instagram Exporter</h2>
        <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full transition-colors"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
        <div className="flex gap-4 mb-8">
          <button onClick={() => setExportMode('carousel')} className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all ${exportMode === 'carousel' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}><LayoutGrid className="w-5 h-5" /> Carousel (3 Posts)</button>
          <button onClick={() => setExportMode('single')} className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all ${exportMode === 'single' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}><ImageIcon className="w-5 h-5" /> Single Post</button>
        </div>

        <div className="flex flex-col gap-12 mb-12 transform scale-75 md:scale-100 origin-top">
          {exportMode === 'single' && (
            <div ref={singleRef} className="w-[1080px] h-[1080px] bg-black text-white relative flex font-sans overflow-hidden border border-white/20 shadow-2xl">
              <div className="w-1/2 h-full relative">
                <img src={heroImage} alt="Hero" className="w-full h-full object-cover opacity-80" crossOrigin="anonymous" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-black"></div>
              </div>
              <div className="w-1/2 p-16 flex flex-col justify-center">
                <GoldAccent />
                <h1 className="text-6xl font-black mb-4 leading-tight">{recipe.title}</h1>
                <p className="text-xl text-white/70 mb-8">{recipe.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 p-4 rounded-lg"><p className="text-white/50 text-xs uppercase tracking-widest mb-1">Prep</p><p className="font-bold text-xl">{recipe.prepTime || '-'}m</p></div>
                  <div className="bg-white/5 p-4 rounded-lg"><p className="text-white/50 text-xs uppercase tracking-widest mb-1">Cook</p><p className="font-bold text-xl">{recipe.cookTime || '-'}m</p></div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {recipe.tags?.slice(0, 4).map(tag => <span key={tag} className="text-yellow-500 text-sm font-bold tracking-wider">#{tag.replace(/\s+/g, '')}</span>)}
                </div>
              </div>
              <Logo />
            </div>
          )}

          {exportMode === 'carousel' && (
            <div className="flex gap-8 flex-wrap justify-center max-w-[3400px]">
              {/* Slide 1: Hero */}
              <div ref={carouselRefs[0]} className="w-[1080px] h-[1080px] bg-black text-white relative flex flex-col font-sans overflow-hidden border border-white/20 shadow-2xl">
                <div className="h-[60%] w-full relative">
                  <img src={heroImage} alt="Hero" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                </div>
                <div className="h-[40%] px-20 flex flex-col justify-center -mt-12 z-10 relative">
                  <GoldAccent />
                  <h1 className="text-7xl font-black mb-4 tracking-tight">{recipe.title}</h1>
                  <p className="text-2xl text-white/70 leading-relaxed max-w-2xl">{recipe.description}</p>
                </div>
                <Logo />
              </div>

              {/* Slide 2: Ingredients */}
              <div ref={carouselRefs[1]} className="w-[1080px] h-[1080px] bg-black text-white p-20 relative font-sans overflow-hidden border border-white/20 shadow-2xl flex flex-col">
                <GoldAccent />
                <h1 className="text-6xl font-black mb-16 tracking-tight">Ingredients</h1>
                <div className="grid grid-cols-2 gap-x-16 gap-y-8 flex-1 content-start">
                  {recipe.ingredients.slice(0, 16).map((ing, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-2xl text-white/90">{ing.name}</span>
                      <span className="text-2xl font-bold text-yellow-500">{ing.quantity} {ing.unit}</span>
                    </div>
                  ))}
                </div>
                <Logo />
              </div>

              {/* Slide 3: Instructions */}
              <div ref={carouselRefs[2]} className="w-[1080px] h-[1080px] bg-black text-white p-20 relative font-sans overflow-hidden border border-white/20 shadow-2xl flex flex-col">
                <GoldAccent />
                <h1 className="text-6xl font-black mb-16 tracking-tight">Instructions</h1>
                <div className="space-y-12 flex-1 overflow-hidden">
                  {recipe.instructions.slice(0, 5).map((step, idx) => (
                    <div key={idx} className="flex gap-8">
                      <span className="text-4xl font-black text-yellow-500">{idx + 1}.</span>
                      <div className="text-2xl leading-relaxed text-white/80">{renderWithTimers(step, `Step ${idx+1}`)}</div>
                    </div>
                  ))}
                  {recipe.instructions.length > 5 && (
                    <div className="text-xl text-white/40 italic">...plus {recipe.instructions.length - 5} more steps. See the full recipe!</div>
                  )}
                </div>
                <Logo />
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
