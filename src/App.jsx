import { useState, useEffect, useRef } from 'react';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [beat, setBeat] = useState(false);
  const [offsets, setOffsets] = useState([]);
  const [textIndex, setTextIndex] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const prevVolumeRef = useRef(0);
  
  const texts = [
    "THE PUNCTUM\nIS A STING",
    "THERE IS NOTHING\nOUTSIDE THE TEXT",
    "DESIRE IS\nA MACHINE"
  ];
  const text = texts[textIndex];
  const showImage = textIndex === 2;
  const beatThreshold = 0.05;
  const shakeIntensity = 40;

  // 画面の向きを自動判定
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // 文字配列を作成（スペースも含む）
  const chars = text.split('');
  
  useEffect(() => {
    setOffsets(chars.map(() => ({ x: 0, y: 0 })));
  }, [text]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      setIsListening(true);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedVolume = average / 255;
        
        setVolume(normalizedVolume);
        
        const volumeJump = normalizedVolume - prevVolumeRef.current;
        if (volumeJump > beatThreshold) {
          setBeat(true);
          
          setTextIndex(prev => (prev + 1) % texts.length);
          
          setTimeout(() => setBeat(false), 50);
        } else {
          setOffsets(prev => prev.map(offset => ({
            x: offset.x * 0.85,
            y: offset.y * 0.85,
          })));
        }
        
        prevVolumeRef.current = normalizedVolume;
        requestAnimationFrame(checkVolume);
      };
      
      checkVolume();
      
    } catch (e) {
      console.error('Microphone access denied:', e);
    }
  };

  useEffect(() => {
    if (beat) {
      setOffsets(chars.map(() => ({
        x: (Math.random() - 0.5) * shakeIntensity * (1 + volume * 3),
        y: (Math.random() - 0.5) * shakeIntensity * (1 + volume * 3),
      })));
    }
  }, [beat, text, volume]);

  // 一番長い行でフォントサイズを計算
  const longestLine = texts
    .flatMap(t => t.split('\n'))
    .reduce((a, b) => a.length > b.length ? a : b, '');
  const fontSize = isLandscape 
    ? `min(${90 / longestLine.length}vh, 120px)` 
    : `min(${100 / longestLine.length}vw, 120px)`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {!isListening && (
        <button
          onClick={startListening}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            padding: '12px 24px',
            backgroundColor: 'white',
            color: 'black',
            fontFamily: '"OTR Grotesk", system-ui, sans-serif',
            fontSize: 14,
            letterSpacing: '0.05em',
            border: 'none',
            cursor: 'pointer',
            writingMode: isLandscape ? 'vertical-rl' : 'horizontal-tb',
          }}
        >
          TAP TO START
        </button>
      )}

      {/* 背景画像（MUSICのときだけ表示） */}
      {isListening && showImage && (
        <div style={{
          position: 'absolute',
          width: isLandscape ? '100vh' : '100vw',
          height: isLandscape ? '100vw' : '100vh',
          transform: isLandscape ? 'rotate(90deg)' : 'none',
          zIndex: 1,
        }}>
          <img
            src="/images/1.png"
            alt="Image"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      {/* テキスト */}
      {isListening && (
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          writingMode: isLandscape ? 'vertical-rl' : 'horizontal-tb',
        }}>
       {text.split('\n').map((line, lineIndex) => (
  <div 
    key={lineIndex}
    style={{
      display: 'flex',
      justifyContent: 'center',
      paddingBottom: isLandscape ? 0 : '0.1em',
      paddingLeft: isLandscape ? '0.1em' : 0,
    }}
  >
              {line.split('').map((char, charIndex) => {
                // 全体のインデックスを計算
                const prevCharsCount = text.split('\n')
                  .slice(0, lineIndex)
                  .reduce((sum, l) => sum + l.length + 1, 0);
                const i = prevCharsCount + charIndex;
                
                return (
                  <span
                    key={`${textIndex}-${lineIndex}-${charIndex}`}
                    style={{
                      fontSize: fontSize,
                      fontFamily: '"OTR Grotesk", system-ui, sans-serif',
                      fontWeight: 900,
                      color: 'white',
                      display: 'inline-block',
                      transform: `translate(${offsets[i]?.x || 0}px, ${offsets[i]?.y || 0}px)`,
                      transition: beat ? 'none' : 'transform 0.1s ease-out',
                      textShadow: 'none',
                      whiteSpace: 'pre',
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* 向き切り替えボタン */}
      <button
        onClick={() => setIsLandscape(!isLandscape)}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 16px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 12,
          border: '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          zIndex: 10,
          writingMode: isLandscape ? 'vertical-rl' : 'horizontal-tb',
        }}
      >
        {isLandscape ? 'PORTRAIT' : 'LANDSCAPE'}
      </button>

      {/* Debug */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'monospace',
        fontSize: 12,
        writingMode: isLandscape ? 'vertical-rl' : 'horizontal-tb',
        display: 'flex',
        flexDirection: isLandscape ? 'row' : 'column',
        gap: 8,
        zIndex: 10,
      }}>
        <span>vol: {(volume * 100).toFixed(0)}%</span>
        <span>beat: {beat ? '●' : '○'}</span>
      </div>

      {/* Volume bar */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        height: isLandscape ? 8 : 100,
        width: isLandscape ? 100 : 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        zIndex: 10,
      }}>
        <div style={{
          position: 'absolute',
          left: isLandscape ? 0 : undefined,
          bottom: isLandscape ? undefined : 0,
          height: isLandscape ? '100%' : `${volume * 100}%`,
          width: isLandscape ? `${volume * 100}%` : '100%',
          backgroundColor: beat ? 'white' : 'rgba(255,255,255,0.5)',
          borderRadius: 4,
          transition: isLandscape ? 'width 0.05s' : 'height 0.05s',
        }} />
      </div>
    </div>
  );
}

export default App;