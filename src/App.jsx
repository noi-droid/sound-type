import { useState, useEffect, useRef } from 'react';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [beat, setBeat] = useState(false);
  const [offsets, setOffsets] = useState([]);
  const [textIndex, setTextIndex] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const prevVolumeRef = useRef(0);
  
  const texts = ["SOUND", "BEAT", "MUSIC"];
  const text = texts[textIndex];
  const showImage = textIndex === 2;
  const beatThreshold = 0.05;
  const shakeIntensity = 40;

  useEffect(() => {
    setOffsets(text.split('').map(() => ({ x: 0, y: 0 })));
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
      setOffsets(text.split('').map(() => ({
        x: (Math.random() - 0.5) * shakeIntensity * (1 + volume * 3),
        y: (Math.random() - 0.5) * shakeIntensity * (1 + volume * 3),
      })));
    }
  }, [beat, text, volume]);

  const maxLength = Math.max(...texts.map(t => t.length));
  const fontSize = `min(${80 / maxLength}vh, 150px)`;

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
            writingMode: 'vertical-rl',
          }}
        >
          TAP TO START
        </button>
      )}

      {/* 背景画像（MUSICのときだけ表示） */}
      {isListening && showImage && (
        <div style={{
          position: 'absolute',
          width: '100vh',
          height: '100vw',
          transform: 'rotate(90deg)',
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
          alignItems: 'center',
          justifyContent: 'center',
          writingMode: 'vertical-rl',
        }}>
          {text.split('').map((char, i) => (
            <span
              key={`${textIndex}-${i}`}
              style={{
                fontSize: fontSize,
                fontFamily: '"OTR Grotesk", system-ui, sans-serif',
                fontWeight: 900,
                color: 'white',
                display: 'inline-block',
                transform: `translate(${offsets[i]?.x || 0}px, ${offsets[i]?.y || 0}px)`,
                transition: beat ? 'none' : 'transform 0.1s ease-out',
                textShadow: 'none',
              }}
            >
              {char}
            </span>
          ))}
        </div>
      )}

      {/* Debug */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'monospace',
        fontSize: 12,
        writingMode: 'vertical-rl',
        zIndex: 10,
      }}>
        <span>vol: {(volume * 100).toFixed(0)}%</span>
        <span style={{ marginTop: 8 }}>beat: {beat ? '●' : '○'}</span>
        <span style={{ marginTop: 8 }}>{text}{showImage ? ' + IMG' : ''}</span>
      </div>

      {/* Volume bar */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        height: 8,
        width: 100,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        writingMode: 'horizontal-tb',
        zIndex: 10,
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          height: '100%',
          width: `${volume * 100}%`,
          backgroundColor: beat ? 'white' : 'rgba(255,255,255,0.5)',
          borderRadius: 4,
          transition: 'width 0.05s',
        }} />
      </div>
    </div>
  );
}

export default App;