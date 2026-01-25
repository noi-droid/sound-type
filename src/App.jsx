import { useState, useEffect, useRef } from 'react';

function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [beat, setBeat] = useState(false);
  const [offsets, setOffsets] = useState([]);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const prevVolumeRef = useRef(0);
  
  const text = "SOUND";
  const beatThreshold = 0.05; // ビート検出の閾値（小さいほど敏感）
  const shakeIntensity = 40; // 揺れの強さ

  // オフセット初期化
  useEffect(() => {
    setOffsets(text.split('').map(() => ({ x: 0, y: 0 })));
  }, []);

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
      
      setHasPermission(true);
      setIsListening(true);
      
      // 音量監視ループ
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // 平均音量を計算
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedVolume = average / 255;
        
        setVolume(normalizedVolume);
        
        // ビート検出（音量の急激な上昇）
        const volumeJump = normalizedVolume - prevVolumeRef.current;
        if (volumeJump > beatThreshold) {
          setBeat(true);
          
          // 各文字にランダムなオフセットを与える
          setOffsets(text.split('').map(() => ({
            x: (Math.random() - 0.5) * shakeIntensity * (1 + normalizedVolume * 3),
            y: (Math.random() - 0.5) * shakeIntensity * (1 + normalizedVolume * 3),
          })));
          
          setTimeout(() => setBeat(false), 50);
        } else {
          // 徐々に元の位置に戻る
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

  const maxLength = text.length;
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

      {isListening && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          writingMode: 'vertical-rl',
        }}>
          {text.split('').map((char, i) => (
            <span
              key={i}
              style={{
                fontSize: fontSize,
                fontFamily: '"OTR Grotesk", system-ui, sans-serif',
                fontWeight: 900,
                color: 'white',
                display: 'inline-block',
                transform: `translate(${offsets[i]?.x || 0}px, ${offsets[i]?.y || 0}px)`,
                transition: beat ? 'none' : 'transform 0.1s ease-out',
                textShadow: beat ? '0 0 20px rgba(255,255,255,0.8)' : 'none',
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
      }}>
        <span>vol: {(volume * 100).toFixed(0)}%</span>
        <span style={{ marginTop: 8 }}>beat: {beat ? '●' : '○'}</span>
      </div>

      {/* Volume bar - 横向き */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        height: 8,
        width: 100,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        writingMode: 'horizontal-tb',
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